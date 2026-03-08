from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, UserInventory, StreakWeek, ShopItem
from app.auth import get_current_user
from app.hearts import MAX_HEARTS, RESTORE_HOURS, sync_hearts, seconds_until_next_heart

router = APIRouter(prefix="/admin", tags=["admin"])

HELP_TEXT = """Available commands:
  /give xp <amount>      — add XP
  /give coins <amount>   — add coins
  /give hearts <amount>  — add hearts (max 5)
  /give streak <days>    — add streak days
  /set xp <value>        — set XP to exact value
  /set coins <value>     — set coins to exact value
  /set hearts <value>    — set hearts to exact value
  /set streak <value>    — set streak to exact value
  /advance <days>        — fast-forward N days (simulate N days have passed)
  /simulate <days>       — preview what happens if you AFK for N days
  /simulate <days> <d1> <d2> ...  — same, but mark specific days as online (1=tomorrow)
  /time                  — show current server time + user timestamps
  /status                — show current stats
  /help                  — show this help"""


class CommandRequest(BaseModel):
    command: str


class CommandResponse(BaseModel):
    output: str
    ok: bool = True


@router.post("/command", response_model=CommandResponse)
async def run_command(
    body: CommandRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = body.command.strip()
    parts = raw.split()
    if not parts:
        return CommandResponse(output="Empty command.", ok=False)

    cmd = parts[0].lower()

    # /help
    if cmd == "/help":
        return CommandResponse(output=HELP_TEXT)

    # /status
    if cmd == "/status":
        sync_hearts(current_user)
        await db.commit()
        lines = [
            f"User    : {current_user.username}",
            f"XP      : {current_user.xp or 0}",
            f"Coins   : {current_user.coins or 0}",
            f"Hearts  : {current_user.hearts or 0}/{MAX_HEARTS}",
            f"Streak  : {current_user.current_streak or 0} days",
        ]
        return CommandResponse(output="\n".join(lines))

    # /give or /set
    if cmd in ("/give", "/set"):
        if len(parts) < 3:
            return CommandResponse(output=f"Usage: {cmd} <resource> <amount>", ok=False)
        resource = parts[1].lower()
        try:
            amount = int(parts[2])
        except ValueError:
            return CommandResponse(output=f"Invalid amount: {parts[2]}", ok=False)

        if resource == "xp":
            if cmd == "/give":
                current_user.xp = (current_user.xp or 0) + amount
            else:
                current_user.xp = amount
            await db.commit()
            return CommandResponse(output=f"XP → {current_user.xp}")

        elif resource == "coins":
            if cmd == "/give":
                current_user.coins = (current_user.coins or 0) + amount
            else:
                current_user.coins = amount
            await db.commit()
            return CommandResponse(output=f"Coins → {current_user.coins}")

        elif resource == "hearts":
            sync_hearts(current_user)
            if cmd == "/give":
                current_user.hearts = min(MAX_HEARTS, (current_user.hearts or 0) + amount)
            else:
                current_user.hearts = min(MAX_HEARTS, max(0, amount))
            if (current_user.hearts or 0) >= MAX_HEARTS:
                current_user.last_heart_restore_at = None
            await db.commit()
            return CommandResponse(output=f"Hearts → {current_user.hearts}/{MAX_HEARTS}")

        elif resource == "streak":
            if cmd == "/give":
                current_user.current_streak = (current_user.current_streak or 0) + amount
            else:
                current_user.current_streak = max(0, amount)
            if (current_user.current_streak or 0) > (current_user.longest_streak or 0):
                current_user.longest_streak = current_user.current_streak
            await db.commit()
            return CommandResponse(output=f"Streak → {current_user.current_streak} days")

        else:
            return CommandResponse(
                output=f"Unknown resource '{resource}'. Try: xp, coins, hearts, streak",
                ok=False,
            )

    # /simulate <days> [online_day1 online_day2 ...] — dry-run AFK/online forecast
    if cmd == "/simulate":
        if len(parts) < 2:
            return CommandResponse(output="Usage: /simulate <days> [day1 day2 ...]\nExample: /simulate 7 2 5  (online on day 2 and 5)", ok=False)
        try:
            sim_days = int(parts[1])
        except ValueError:
            return CommandResponse(output=f"Invalid days: {parts[1]}", ok=False)
        if sim_days <= 0 or sim_days > 30:
            return CommandResponse(output="Days must be between 1 and 30", ok=False)

        # Parse optional online day indices (1-based from tomorrow)
        online_days: set[int] = set()
        for p in parts[2:]:
            try:
                d = int(p)
                if 1 <= d <= sim_days:
                    online_days.add(d)
            except ValueError:
                return CommandResponse(output=f"Invalid day number: {p}", ok=False)

        now_utc = datetime.utcnow()
        today = now_utc.date()

        # Freeze inventory snapshot
        freeze_res = await db.execute(
            select(UserInventory)
            .join(ShopItem, UserInventory.item_id == ShopItem.id)
            .where(
                UserInventory.user_id == current_user.id,
                ShopItem.item_type == "streak_freeze",
                UserInventory.quantity > 0,
            )
        )
        freeze_inv = freeze_res.scalar_one_or_none()
        freeze_count = freeze_inv.quantity if freeze_inv else 0
        freeze_acquired = freeze_inv.acquired_at.date() if (freeze_inv and freeze_inv.acquired_at) else None

        # Sync hearts without committing (read-only snapshot)
        sync_hearts(current_user)
        h = current_user.hearts or 0
        h_secs_left = seconds_until_next_heart(current_user)
        RESTORE_SECS = RESTORE_HOURS * 3600

        streak = current_user.current_streak or 0
        last_activity = current_user.last_activity_date
        today_active = bool(last_activity and last_activity.date() == today)
        # Track whether the previous simulated day was active (for streak chaining)
        prev_day_active = today_active

        online_label = f"  online={sorted(online_days)}" if online_days else "  (all AFK)"
        lines = [
            f"Simulating {sim_days}d from {today.strftime('%b %d')}{online_label}",
            f"Start: streak={streak}  hearts={h}/{MAX_HEARTS}  freeze\u00d7{freeze_count}",
            "\u2500" * 60,
        ]

        for i in range(1, sim_days + 1):
            sim_day = today + timedelta(days=i)
            is_online = i in online_days

            # Hearts: simulate 24 h passing, but if online today restore to full cap via learning
            h_before = h
            if is_online:
                # Being online doesn't restore hearts — they still tick normally
                pass
            secs = 86400
            if h < MAX_HEARTS:
                if h_secs_left is None:
                    h_secs_left = RESTORE_SECS
                while secs > 0 and h < MAX_HEARTS:
                    if secs >= h_secs_left:
                        secs -= h_secs_left
                        h += 1
                        h_secs_left = RESTORE_SECS
                    else:
                        h_secs_left -= secs
                        secs = 0
            if h >= MAX_HEARTS:
                h_secs_left = None

            hearts_note = (
                f"{h}/{MAX_HEARTS} (+{h - h_before})"
                if h != h_before
                else (
                    f"{h}/{MAX_HEARTS} \u2665 full"
                    if h >= MAX_HEARTS
                    else f"{h}/{MAX_HEARTS} (~{(h_secs_left or 0)//60}m)"
                )
            )

            # Streak logic
            if is_online:
                # User is active today — streak continues/grows
                streak += 1
                streak_note = f"\U0001f4aa online \u2192 streak +1"
            elif prev_day_active:
                # Yesterday was active (either real or simulated), today is missed
                # → freeze might protect today
                if freeze_count > 0 and (freeze_acquired is None or freeze_acquired < sim_day):
                    freeze_count -= 1
                    streak_note = f"\u2744\ufe0f freeze auto-applied (\u00d7{freeze_count} left)"
                elif freeze_count > 0:
                    old = streak
                    streak = 0
                    streak_note = f"\U0001f480 lost ({old}\u21920) \u2014 freeze bought today, not eligible"
                elif streak == 0:
                    streak_note = "\u2014 already dead"
                else:
                    old = streak
                    streak = 0
                    streak_note = f"\U0001f480 lost ({old}\u21920) \u2014 no freeze"
            else:
                # Yesterday was already missed/frozen — no more streak to protect
                if streak == 0:
                    streak_note = "\u2014 already dead"
                else:
                    old = streak
                    streak = 0
                    streak_note = f"\U0001f480 lost ({old}\u21920)"

            status_icon = "\U0001f7e2" if is_online else "\u26ab"
            lines.append(
                f"{status_icon} Day {i:2d} | {sim_day.strftime('%a %b %d')} "
                f"| streak={streak:3d} | \u2665 {hearts_note:<18} | {streak_note}"
            )
            # A frozen day keeps the streak alive → counts as "active" for the next day's check
            prev_day_active = is_online or (streak > 0 and "freeze" in streak_note)

        lines.append("\u2500" * 60)
        lines.append(f"Final: streak={streak}  hearts={h}/{MAX_HEARTS}  freeze\u00d7{freeze_count}")
        return CommandResponse(output="\n".join(lines))

    # /time — show current timestamps
    if cmd == "/time":
        now = datetime.utcnow()
        lines = [
            f"Server UTC      : {now.strftime('%Y-%m-%d %H:%M:%S')}",
            f"last_activity   : {current_user.last_activity_date or 'None'}",
            f"last_heart_rst  : {current_user.last_heart_restore_at or 'None'}",
        ]
        # Show inventory acquired_at
        inv_res = await db.execute(
            select(UserInventory)
            .options(selectinload(UserInventory.item))
            .where(UserInventory.user_id == current_user.id)
        )
        for inv in inv_res.scalars().all():
            lines.append(f"  inv [{inv.item.name if inv.item else inv.item_id}] x{inv.quantity} acquired={inv.acquired_at}")
        return CommandResponse(output="\n".join(lines))

    # /advance <days>
    if cmd == "/advance":
        if len(parts) < 2:
            return CommandResponse(output="Usage: /advance <days>", ok=False)
        try:
            days = int(parts[1])
        except ValueError:
            return CommandResponse(output=f"Invalid days: {parts[1]}", ok=False)
        if days <= 0:
            return CommandResponse(output="Days must be > 0", ok=False)

        delta = timedelta(days=days)
        changed = []

        # Shift last_activity_date
        if current_user.last_activity_date:
            current_user.last_activity_date = current_user.last_activity_date - delta
            changed.append(f"last_activity_date  → {current_user.last_activity_date.date()}")

        # Shift last_heart_restore_at
        if current_user.last_heart_restore_at:
            current_user.last_heart_restore_at = current_user.last_heart_restore_at - delta
            changed.append(f"last_heart_restore  → {current_user.last_heart_restore_at}")

        # Shift acquired_at on all inventory items
        inv_res = await db.execute(
            select(UserInventory)
            .options(selectinload(UserInventory.item))
            .where(UserInventory.user_id == current_user.id)
        )
        for inv in inv_res.scalars().all():
            if inv.acquired_at:
                inv.acquired_at = inv.acquired_at - delta
                name = inv.item.name if inv.item else str(inv.item_id)
                changed.append(f"  inv [{name}] acquired → {inv.acquired_at.date()}")

        # Shift StreakWeek entries (updated_at only, week_start is a label)
        sw_res = await db.execute(
            select(StreakWeek).where(StreakWeek.user_id == current_user.id)
        )
        for sw in sw_res.scalars().all():
            if sw.updated_at:
                sw.updated_at = sw.updated_at - delta

        await db.commit()

        if not changed:
            return CommandResponse(output=f"⏩ Fast-forwarded {days} day(s). No timestamps to shift.")
        return CommandResponse(output=f"⏩ Fast-forwarded {days} day(s). Server is still at today, but your data now looks like {days} day(s) have passed:\n" + "\n".join(changed))

    return CommandResponse(output=f"Unknown command '{cmd}'. Type /help for usage.", ok=False)
