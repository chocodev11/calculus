from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, date, timedelta
import random
import logging

from app.database import get_db
from app.models import User, Quest, UserQuest, StreakWeek
from app.schemas import UserQuestResponse, ClaimQuestResponse
from app.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quests", tags=["quests"])


async def refresh_daily_quests(user_id: int, db: AsyncSession):
    """Assign 3 random daily quests if none exist for today."""
    today_start = datetime.combine(date.today(), datetime.min.time())

    # Check if user has any daily quests assigned today
    existing = await db.execute(
        select(UserQuest)
        .join(Quest)
        .where(
            UserQuest.user_id == user_id,
            Quest.quest_type == "daily",
            UserQuest.assigned_at >= today_start,
        )
    )
    if existing.scalars().first():
        return  # already assigned today

    # Get all active daily quests from pool
    pool_result = await db.execute(
        select(Quest).where(Quest.quest_type == "daily", Quest.is_active == True)
    )
    pool = pool_result.scalars().all()

    if not pool:
        return

    # Pick 3 random quests ensuring at least 2 distinct requirement_types
    target = min(3, len(pool))
    for _ in range(20):  # retry up to 20 times
        chosen = random.sample(pool, target)
        types = {q.requirement_type for q in chosen}
        if len(types) >= min(2, target):
            break

    for quest in chosen:
        uq = UserQuest(
            user_id=user_id,
            quest_id=quest.id,
            progress=0,
            is_complete=False,
            assigned_at=datetime.utcnow(),
            coins_claimed=False,
        )
        db.add(uq)


async def refresh_weekly_quests(user_id: int, db: AsyncSession):
    """Assign 2 random weekly quests if none exist for this week."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    week_start = datetime.combine(monday, datetime.min.time())

    existing = await db.execute(
        select(UserQuest)
        .join(Quest)
        .where(
            UserQuest.user_id == user_id,
            Quest.quest_type == "weekly",
            UserQuest.assigned_at >= week_start,
        )
    )
    if existing.scalars().first():
        return

    pool_result = await db.execute(
        select(Quest).where(Quest.quest_type == "weekly", Quest.is_active == True)
    )
    pool = pool_result.scalars().all()

    if not pool:
        return

    chosen = random.sample(pool, min(2, len(pool)))

    for quest in chosen:
        uq = UserQuest(
            user_id=user_id,
            quest_id=quest.id,
            progress=0,
            is_complete=False,
            assigned_at=datetime.utcnow(),
            coins_claimed=False,
        )
        db.add(uq)

async def tick_quest_progress(user_id: int, event_type: str, amount: int, db: AsyncSession):
    """Increment progress on matching quests for the user.
    
    event_type: "lessons", "slides", "quizzes", "perfect_quiz", "streak",
                "study_time", "shop_buy", "chapter", "course"
    """
    import math
    today_start = datetime.combine(date.today(), datetime.min.time())
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    week_start = datetime.combine(monday, datetime.min.time())

    # Find all active (unclaimed) user_quests where quest.requirement_type matches
    result = await db.execute(
        select(UserQuest)
        .options(selectinload(UserQuest.quest))
        .where(
            UserQuest.user_id == user_id,
            UserQuest.coins_claimed == False,
        )
    )
    user_quests = result.scalars().all()

    for uq in user_quests:
        quest = uq.quest
        if quest.requirement_type != event_type:
            continue

        # Check time window — daily quests must be assigned today, weekly this week
        if quest.quest_type == "daily" and uq.assigned_at < today_start:
            continue
        if quest.quest_type == "weekly" and uq.assigned_at < week_start:
            continue

        if event_type == "streak":
            if quest.quest_type == "weekly":
                # Count unique days studied this week from StreakWeek record
                week_start_str = monday.isoformat()
                sw_res = await db.execute(
                    select(StreakWeek).where(
                        StreakWeek.user_id == user_id,
                        StreakWeek.week_start == week_start_str,
                    )
                )
                sw = sw_res.scalar_one_or_none()
                uq.progress = sum(1 for d in (sw.days or []) if d) if sw else 0
            else:
                # Daily or other: use current streak value directly
                uq.progress = amount
        elif event_type == "study_time":
            # Track in minutes (round up, minimum 1 minute per session)
            minutes = max(1, math.ceil(amount / 60)) if amount > 0 else 0
            uq.progress += minutes
        else:
            uq.progress += amount

        # Mark complete if target reached
        if uq.progress >= quest.requirement_value and not uq.is_complete:
            uq.is_complete = True
            uq.completed_at = datetime.utcnow()


@router.get("", response_model=list[UserQuestResponse])
async def get_quests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return user's current quests (refreshes daily/weekly if needed)."""
    # Ensure quests are assigned
    await refresh_daily_quests(current_user.id, db)
    await refresh_weekly_quests(current_user.id, db)
    await db.commit()

    # Fetch current period quests
    today_start = datetime.combine(date.today(), datetime.min.time())
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    week_start = datetime.combine(monday, datetime.min.time())

    result = await db.execute(
        select(UserQuest)
        .options(selectinload(UserQuest.quest))
        .where(UserQuest.user_id == current_user.id)
        .order_by(UserQuest.assigned_at.desc())
    )
    all_uqs = result.scalars().all()

    # Filter to current-period quests only
    active = []
    for uq in all_uqs:
        qt = uq.quest.quest_type
        if qt == "daily":
            if uq.assigned_at >= today_start:
                active.append(uq)
        elif qt == "weekly":
            if uq.assigned_at >= week_start:
                active.append(uq)
    return active


@router.post("/claim/{user_quest_id}", response_model=ClaimQuestResponse)
async def claim_quest(
    user_quest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Claim coins for a completed quest."""
    result = await db.execute(
        select(UserQuest)
        .options(selectinload(UserQuest.quest))
        .where(
            UserQuest.id == user_quest_id,
            UserQuest.user_id == current_user.id,
        )
    )
    uq = result.scalar_one_or_none()

    if not uq:
        raise HTTPException(status_code=404, detail="Quest not found")

    if not uq.is_complete:
        raise HTTPException(status_code=400, detail="Quest not yet completed")

    if uq.coins_claimed:
        raise HTTPException(status_code=400, detail="Coins already claimed")

    # Award coins
    coins = uq.quest.coin_reward
    current_user.coins = (current_user.coins or 0) + coins
    uq.coins_claimed = True

    await db.commit()
    await db.refresh(current_user)

    return ClaimQuestResponse(
        success=True,
        coins_awarded=coins,
        total_coins=current_user.coins,
        message=f"Claimed {coins} coins from '{uq.quest.title}'!",
    )
