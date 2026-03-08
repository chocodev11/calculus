"""Heart system utilities."""
from datetime import datetime, timedelta
from app.models import User

MAX_HEARTS = 5
RESTORE_HOURS = 6  # 1 heart every 6 hours


def sync_hearts(user: User) -> None:
    """Auto-restore hearts based on time elapsed (1 per 6 hours, max 5).
    Mutates user in place; caller must commit."""
    current = user.hearts if user.hearts is not None else MAX_HEARTS

    if current >= MAX_HEARTS:
        user.hearts = MAX_HEARTS
        user.last_heart_restore_at = None
        return

    if user.last_heart_restore_at is None:
        # Hearts depleted but timer not set yet — start the timer, no restore yet
        user.hearts = current
        user.last_heart_restore_at = datetime.utcnow()
        return

    elapsed = datetime.utcnow() - user.last_heart_restore_at
    restores = int(elapsed.total_seconds() // (RESTORE_HOURS * 3600))

    if restores > 0:
        new_hearts = min(MAX_HEARTS, current + restores)
        user.hearts = new_hearts
        if new_hearts >= MAX_HEARTS:
            user.last_heart_restore_at = None
        else:
            # Advance timer by number of completed intervals
            user.last_heart_restore_at = user.last_heart_restore_at + timedelta(hours=restores * RESTORE_HOURS)
    else:
        user.hearts = current


def deduct_heart(user: User) -> bool:
    """Deduct 1 heart after syncing. Returns True if a heart was deducted."""
    sync_hearts(user)
    if (user.hearts or 0) > 0:
        user.hearts = (user.hearts or 0) - 1
        if user.last_heart_restore_at is None:
            user.last_heart_restore_at = datetime.utcnow()
        return True
    return False


def seconds_until_next_heart(user: User) -> int | None:
    """Return seconds until next heart restore, or None if already full."""
    if (user.hearts or 0) >= MAX_HEARTS:
        return None
    if user.last_heart_restore_at is None:
        return RESTORE_HOURS * 3600
    elapsed = (datetime.utcnow() - user.last_heart_restore_at).total_seconds()
    remaining = (RESTORE_HOURS * 3600) - (elapsed % (RESTORE_HOURS * 3600))
    return max(0, int(remaining))
