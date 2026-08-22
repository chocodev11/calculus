from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models import Step, Slide, StepProgress, Chapter, Story, User, Enrollment, SlideProgress, StreakWeek, Achievement, UserAchievement, UserInventory, ShopItem
from app.schemas import StepDetailResponse, SlideResponse, StepCompleteRequest, SlideCompleteRequest
from app.auth import get_current_user
from app.routers.quests import tick_quest_progress
from app.hearts import sync_hearts, deduct_heart, seconds_until_next_heart
from app.content_service import get_published_version
from app.lesson_contract import _strip_answer_fields

router = APIRouter(prefix="/steps", tags=["steps"])


def _learner_safe_blocks(blocks: list | None) -> list:
    """Keep legacy slides answer-free until their next server-side publish."""

    safe: list = []
    for block in blocks or []:
        block_type = block.get("block_type") or block.get("type") if isinstance(block, dict) else None
        if block_type in {"assessment_pool", "assessment_ref"}:
            continue
        if block_type == "quiz" and isinstance(block, dict):
            block = dict(block)
            block["content"] = _strip_answer_fields(block.get("content") or block.get("block_data") or {})
        safe.append(block)
    return safe


async def check_and_award_user_achievements(db: AsyncSession, user: User) -> list[dict]:
    """Check all unearned achievements and award XP and coins if requirements are met."""
    newly_earned = []
    try:
        subq = select(UserAchievement.achievement_id).where(
            UserAchievement.user_id == user.id
        )
        unearned_res = await db.execute(
            select(Achievement).where(Achievement.id.notin_(subq))
        )
        unearned = unearned_res.scalars().all()
        if not unearned:
            return []

        steps_res = await db.execute(
            select(func.count(StepProgress.id)).where(
                StepProgress.user_id == user.id,
                StepProgress.is_completed == True
            )
        )
        completed_steps = steps_res.scalar() or 0

        enroll_res = await db.execute(
            select(Enrollment).where(Enrollment.user_id == user.id)
        )
        completed_stories = 0
        from app.routers.stories import calculate_story_progress
        for enr in enroll_res.scalars().all():
            prog = await calculate_story_progress(db, user.id, enr.story_id)
            if prog >= 100:
                completed_stories += 1

        for ach in unearned:
            earned = False
            if ach.requirement_type == "xp" and (user.xp or 0) >= ach.requirement_value:
                earned = True
            elif ach.requirement_type == "steps" and completed_steps >= ach.requirement_value:
                earned = True
            elif ach.requirement_type == "streak" and (user.current_streak or 0) >= ach.requirement_value:
                earned = True
            elif ach.requirement_type == "stories" and completed_stories >= ach.requirement_value:
                earned = True

            if earned:
                db.add(UserAchievement(
                    user_id=user.id,
                    achievement_id=ach.id
                ))
                user.xp = (user.xp or 0) + (ach.xp_reward or 0)
                coin_reward = getattr(ach, 'coin_reward', 0) or 0
                user.coins = (user.coins or 0) + coin_reward
                newly_earned.append({
                    "id": ach.id,
                    "title": ach.title,
                    "icon": ach.icon,
                    "rarity": getattr(ach, 'rarity', 'common'),
                    "xp_reward": ach.xp_reward or 0,
                    "coin_reward": coin_reward,
                })
    except Exception:
        pass
    return newly_earned


def update_streak(user: User, tz_offset_minutes: int | None = None) -> dict:
    """Update user's streak based on activity dates.
    Returns dict with streak info."""
    # compute user-local today using tz offset (minutes) if provided, otherwise server local date
    if tz_offset_minutes is not None:
        now = datetime.utcnow() + timedelta(minutes=tz_offset_minutes)
        today = now.date()
    else:
        today = date.today()

    last_activity = None
    if user.last_activity_date:
        try:
            # store last_activity_date in UTC; convert to user-local date for comparison
            lad = user.last_activity_date
            if tz_offset_minutes is not None:
                lad_local = lad + timedelta(minutes=tz_offset_minutes)
                last_activity = lad_local.date()
            else:
                last_activity = lad.date()
        except Exception:
            last_activity = user.last_activity_date.date()
    
    streak_increased = False
    streak_reset = False
    
    if last_activity is None:
        # First activity ever
        user.current_streak = 1
        streak_increased = True
    elif last_activity == today:
        # Already active today, no change
        pass
    elif last_activity == today - timedelta(days=1):
        # Active yesterday, continue streak
        user.current_streak += 1
        streak_increased = True
    else:
        # Missed at least one day, reset streak
        user.current_streak = 1
        streak_reset = True
    
    # Update longest streak if needed
    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak
    
    # Update last activity date (store in UTC)
    user.last_activity_date = datetime.utcnow()
    
    return {
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
        "streak_increased": streak_increased,
        "streak_reset": streak_reset
    }

@router.get("/{step_id}", response_model=StepDetailResponse)
async def get_step(step_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Step)
        .options(selectinload(Step.chapter).selectinload(Chapter.story))
        .where(Step.id == step_id)
    )
    step = result.scalar_one_or_none()
    
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    return StepDetailResponse(
        id=step.id,
        content_key=step.content_key,
        published_version_id=step.published_version_id,
        title=step.title,
        description=step.description,
        chapter_title=step.chapter.title,
        story_slug=step.chapter.story.slug,
        xp_reward=step.xp_reward
    )

@router.get("/{step_id}/slides", response_model=list[SlideResponse])
async def get_slides(step_id: int, db: AsyncSession = Depends(get_db)):
    step_result = await db.execute(select(Step).where(Step.id == step_id))
    step = step_result.scalar_one_or_none()
    if step is None:
        raise HTTPException(status_code=404, detail="Step not found")
    if await get_published_version(db, step_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "lesson_not_published", "message": "Lesson content is not published"},
        )

    result = await db.execute(
        select(Slide)
        .where(Slide.step_id == step_id, Slide.is_active.is_(True))
        .order_by(Slide.order_index)
    )
    slides = result.scalars().all()
    
    return [
        SlideResponse(
            id=slide.id,
            content_key=slide.content_key,
            order_index=slide.order_index,
            blocks=_learner_safe_blocks(slide.blocks),
        )
        for slide in slides
    ]

@router.post("/{step_id}/complete")
async def complete_step(
    step_id: int,
    data: StepCompleteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get step (include chapter/story so we can validate enrollment)
    result = await db.execute(
        select(Step)
        .options(selectinload(Step.chapter).selectinload(Chapter.story))
        .where(Step.id == step_id)
    )
    step = result.scalar_one_or_none()
    
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    # Require enrollment in the parent story before allowing completion
    enroll_res = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.story_id == step.chapter.story_id
        )
    )
    if enroll_res.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="You must enroll in the course to study this lesson")

    # Check/create progress
    progress_result = await db.execute(
        select(StepProgress).where(
            StepProgress.user_id == current_user.id,
            StepProgress.step_id == step_id
        )
    )
    progress = progress_result.scalar_one_or_none()
    
    xp_earned = 0
    coins_earned = 0
    
    xp_boost_active = False

    async def _apply_boost_and_reward(base_xp: int, base_coins: int):
        """Apply xp boost if available, then credit user. Returns (xp_earned, coins_earned, boost_used)."""
        nonlocal xp_boost_active
        boost_res = await db.execute(
            select(UserInventory)
            .join(ShopItem, UserInventory.item_id == ShopItem.id)
            .where(
                UserInventory.user_id == current_user.id,
                ShopItem.item_type == "xp_boost",
                UserInventory.quantity > 0,
            )
        )
        boost_inv = boost_res.scalar_one_or_none()
        xp = base_xp
        if boost_inv:
            xp *= 2
            boost_inv.quantity -= 1
            xp_boost_active = True
        current_user.xp += xp
        current_user.coins = (current_user.coins or 0) + base_coins
        return xp, base_coins

    if not progress:
        progress = StepProgress(
            user_id=current_user.id,
            step_id=step_id,
            is_completed=True,
            score=data.score,
            time_spent_seconds=data.time_spent_seconds,
            completed_at=datetime.utcnow()
        )
        db.add(progress)
        base_xp = step.xp_reward + data.quizzes_correct * 15
        xp_earned, coins_earned = await _apply_boost_and_reward(base_xp, step.coin_reward)
    elif not progress.is_completed:
        progress.is_completed = True
        progress.score = data.score
        progress.time_spent_seconds = data.time_spent_seconds
        progress.completed_at = datetime.utcnow()
        base_xp = step.xp_reward + data.quizzes_correct * 15
        xp_earned, coins_earned = await _apply_boost_and_reward(base_xp, step.coin_reward)

    # Deduct 1 heart if more than half of quizzes were wrong (first completion only)
    if xp_earned > 0 and data.quizzes_total > 0:
        wrong = data.quizzes_total - data.quizzes_correct
        if wrong / data.quizzes_total > 0.5:
            deduct_heart(current_user)

    # Update streak (in-memory fields)
    # read tz offset header if present (minutes offset from UTC)
    tz_offset = None
    try:
        hdr = request.headers.get('x-user-tz-offset') or request.headers.get('x-tz-offset')
        if hdr is not None:
            tz_offset = int(hdr)
    except Exception:
        tz_offset = None

    streak_info = update_streak(current_user, tz_offset)

    # Streak milestone bonus: every 7-day streak = +20 coins
    streak_bonus = 0
    cur_streak = current_user.current_streak or 0
    if coins_earned > 0 and cur_streak > 0 and cur_streak % 7 == 0:
        streak_bonus = 20
        current_user.coins = (current_user.coins or 0) + streak_bonus
        coins_earned += streak_bonus

    # Persist today's completion into StreakWeek for the current week using user-local date
    try:
        if tz_offset is not None:
            now = datetime.utcnow() + timedelta(minutes=tz_offset)
            today_local = now.date()
        else:
            today_local = date.today()

        monday = today_local - timedelta(days=today_local.weekday())
        week_start = monday.isoformat()
        today_idx = today_local.weekday()

        sw_res = await db.execute(select(StreakWeek).where(StreakWeek.user_id == current_user.id, StreakWeek.week_start == week_start))
        sw_entry = sw_res.scalar_one_or_none()
        if sw_entry:
            days = sw_entry.days or [False]*7
            if 0 <= today_idx < 7:
                days[today_idx] = True
            sw_entry.days = days
        else:
            days = [False]*7
            if 0 <= today_idx < 7:
                days[today_idx] = True
            sw_entry = StreakWeek(user_id=current_user.id, week_start=week_start, days=days)
            db.add(sw_entry)
    except Exception:
        # don't break step completion on streak persistence errors
        pass

    # Tick quest progress for lesson completion
    if xp_earned > 0:
        try:
            await tick_quest_progress(current_user.id, "lessons", 1, db)
            await tick_quest_progress(current_user.id, "slides", 1, db)
            if data.time_spent_seconds > 0:
                await tick_quest_progress(current_user.id, "study_time", data.time_spent_seconds, db)
            if data.quizzes_correct > 0:
                await tick_quest_progress(current_user.id, "quizzes", data.quizzes_correct, db)
            if data.quizzes_total >= 1 and data.quizzes_correct == data.quizzes_total:
                await tick_quest_progress(current_user.id, "perfect_quiz", 1, db)
            # Check streak-based quests
            await tick_quest_progress(current_user.id, "streak", current_user.current_streak or 0, db)
        except Exception:
            pass

    # Auto-check and award achievements (awards XP + coins for milestones)
    newly_earned = await check_and_award_user_achievements(db, current_user)
    try:
        await db.commit()
    except IntegrityError:
        # Two retries can arrive before the first transaction is visible. The
        # unique progress key makes the second request safe; return the
        # already-persisted result instead of turning it into a white page.
        await db.rollback()
        existing_result = await db.execute(
            select(StepProgress).where(
                StepProgress.user_id == current_user.id,
                StepProgress.step_id == step_id,
            )
        )
        if existing_result.scalar_one_or_none() is None:
            raise
        await db.refresh(current_user)
        return {
            "success": True,
            "xp_earned": 0,
            "coins_earned": 0,
            "total_xp": current_user.xp,
            "total_coins": current_user.coins or 0,
            "hearts": current_user.hearts if current_user.hearts is not None else 5,
            "xp_boost_active": False,
            "streak": {
                "current_streak": current_user.current_streak,
                "longest_streak": current_user.longest_streak,
            },
            "newly_earned_achievements": [],
        }

    return {
        "success": True,
        "xp_earned": xp_earned,
        "coins_earned": coins_earned,
        "total_xp": current_user.xp,
        "total_coins": current_user.coins or 0,
        "hearts": current_user.hearts if current_user.hearts is not None else 5,
        "xp_boost_active": xp_boost_active,
        "streak": streak_info,
        "newly_earned_achievements": newly_earned
    }


@router.post("/{step_id}/slides/{slide_id}/complete")
async def complete_slide(
    step_id: int,
    slide_id: int,
    data: SlideCompleteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify step and slide
    result = await db.execute(
        select(Step)
        .options(selectinload(Step.chapter).selectinload(Chapter.story))
        .where(Step.id == step_id)
    )
    step = result.scalar_one_or_none()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    slide_res = await db.execute(
        select(Slide).where(
            Slide.id == slide_id,
            Slide.step_id == step_id,
            Slide.is_active.is_(True),
        )
    )
    slide = slide_res.scalar_one_or_none()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    # Require enrollment
    enroll_res = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.story_id == step.chapter.story_id
        )
    )
    if enroll_res.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="You must enroll in the course to study this lesson")

    # Check if already completed
    sp_res = await db.execute(
        select(SlideProgress).where(
            SlideProgress.user_id == current_user.id,
            SlideProgress.slide_id == slide_id
        )
    )
    sp = sp_res.scalar_one_or_none()

    xp_earned = 0
    if sp is None:
        sp = SlideProgress(
            user_id=current_user.id,
            slide_id=slide_id,
            xp_earned=data.xp,
            completed_at=datetime.utcnow()
        )
        db.add(sp)
        # Quiz XP is consolidated at step completion — not awarded per slide

        # Only update streak once per day: skip if user was already active today
        tz_offset = None
        try:
            hdr = request.headers.get('x-user-tz-offset') or request.headers.get('x-tz-offset')
            if hdr is not None:
                tz_offset = int(hdr)
        except Exception:
            tz_offset = None

        if tz_offset is not None:
            now_local = datetime.utcnow() + timedelta(minutes=tz_offset)
            today_local = now_local.date()
        else:
            today_local = date.today()

        already_active_today = False
        if current_user.last_activity_date:
            try:
                lad = current_user.last_activity_date
                lad_local = (lad + timedelta(minutes=tz_offset)).date() if tz_offset is not None else lad.date()
                already_active_today = (lad_local == today_local)
            except Exception:
                pass

        streak_info = update_streak(current_user, tz_offset)
        try:
            if tz_offset is not None:
                now = datetime.utcnow() + timedelta(minutes=tz_offset)
                today_local = now.date()
            else:
                today_local = date.today()
            monday = today_local - timedelta(days=today_local.weekday())
            week_start = monday.isoformat()
            today_idx = today_local.weekday()
            sw_res = await db.execute(select(StreakWeek).where(StreakWeek.user_id == current_user.id, StreakWeek.week_start == week_start))
            sw_entry = sw_res.scalar_one_or_none()
            if sw_entry:
                days = sw_entry.days or [False]*7
                if 0 <= today_idx < 7:
                    days[today_idx] = True
                sw_entry.days = days
            else:
                days = [False]*7
                if 0 <= today_idx < 7:
                    days[today_idx] = True
                sw_entry = StreakWeek(user_id=current_user.id, week_start=week_start, days=days)
                db.add(sw_entry)
        except Exception:
            pass

        # slides quest is now tracked at lesson (step) completion level

        try:
            await db.commit()
        except IntegrityError:
            # A duplicate retry may race the first insert. Re-read the row
            # after rollback and report success without awarding anything a
            # second time.
            await db.rollback()
            existing_result = await db.execute(
                select(SlideProgress).where(
                    SlideProgress.user_id == current_user.id,
                    SlideProgress.slide_id == slide_id,
                )
            )
            if existing_result.scalar_one_or_none() is None:
                raise
            await db.refresh(current_user)
            return {
                "success": True,
                "xp_earned": 0,
                "total_xp": current_user.xp,
                "newly_earned_achievements": [],
            }
    else:
        # already completed — idempotent
        xp_earned = 0
        streak_info = {"current_streak": current_user.current_streak, "longest_streak": current_user.longest_streak}

    # Auto-check and award achievements
    newly_earned = await check_and_award_user_achievements(db, current_user)
    if newly_earned:
        await db.commit()

    return {
        "success": True,
        "xp_earned": xp_earned,
        "total_xp": current_user.xp,
        "newly_earned_achievements": newly_earned
    }


@router.post("/{step_id}/quit")
async def quit_step(
    step_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Called when user quits a lesson mid-way. Deducts 1 heart."""
    # Verify the step exists
    result = await db.execute(select(Step).where(Step.id == step_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Step not found")

    sync_hearts(current_user)
    heart_deducted = deduct_heart(current_user)
    await db.commit()

    return {
        "success": True,
        "hearts": current_user.hearts if current_user.hearts is not None else 5,
        "heart_deducted": heart_deducted,
        "seconds_until_restore": seconds_until_next_heart(current_user),
    }
