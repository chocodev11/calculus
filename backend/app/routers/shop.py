from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, ShopItem, UserInventory
from app.schemas import ShopItemResponse, BuyItemResponse, InventoryItemResponse, UserResponse, HeartsResponse
from app.auth import get_current_user
from app.hearts import sync_hearts, seconds_until_next_heart, MAX_HEARTS

router = APIRouter(prefix="/shop", tags=["shop"])


@router.get("/items", response_model=list[ShopItemResponse])
async def list_shop_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all active shop items."""
    result = await db.execute(
        select(ShopItem)
        .where(ShopItem.is_active == True)
        .order_by(ShopItem.order_index, ShopItem.price)
    )
    return result.scalars().all()


@router.post("/buy/{item_id}", response_model=BuyItemResponse)
async def buy_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Purchase a shop item with coins."""
    result = await db.execute(
        select(ShopItem).where(ShopItem.id == item_id, ShopItem.is_active == True)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    user_coins = current_user.coins or 0
    if user_coins < item.price:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough coins. You have {user_coins}, need {item.price}."
        )

    # Deduct coins
    current_user.coins = user_coins - item.price

    # Hearts always pool into one inventory row (any heart item), using effect_value as count
    if item.item_type == "heart":
        qty_to_add = item.effect_value or 1
        # Find any existing heart inventory row for this user
        heart_inv_result = await db.execute(
            select(UserInventory)
            .join(ShopItem, UserInventory.item_id == ShopItem.id)
            .where(
                UserInventory.user_id == current_user.id,
                ShopItem.item_type == "heart",
            )
        )
        existing_heart = heart_inv_result.scalar_one_or_none()
        if existing_heart:
            existing_heart.quantity += qty_to_add
        else:
            db.add(UserInventory(
                user_id=current_user.id,
                item_id=3,
                quantity=qty_to_add,
                is_active=True,
            ))
    else:
        # All other stackable items: stack by item_id
        inv_result = await db.execute(
            select(UserInventory).where(
                UserInventory.user_id == current_user.id,
                UserInventory.item_id == item_id,
            )
        )
        existing = inv_result.scalar_one_or_none()
        if existing:
            existing.quantity += 1
        else:
            db.add(UserInventory(
                user_id=current_user.id,
                item_id=item_id,
                quantity=1,
                is_active=True,
            ))

    await db.commit()
    await db.refresh(current_user)

    return BuyItemResponse(
        success=True,
        item=ShopItemResponse.model_validate(item),
        coins_spent=item.price,
        remaining_coins=current_user.coins,
        message=f"Purchased {item.name}!",
    )


@router.get("/inventory", response_model=list[InventoryItemResponse])
async def get_inventory(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return current user's inventory."""
    result = await db.execute(
        select(UserInventory)
        .options(selectinload(UserInventory.item))
        .where(UserInventory.user_id == current_user.id)
        .order_by(UserInventory.acquired_at.desc())
    )
    return result.scalars().all()


@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user),
):
    """Return current coin balance."""
    return {"coins": current_user.coins or 0}

@router.post("/equip/{item_id}", response_model=UserResponse)
async def equip_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Equip an item from the user's inventory."""
    # Check if user owns the item
    result = await db.execute(
        select(UserInventory)
        .options(selectinload(UserInventory.item))
        .where(UserInventory.user_id == current_user.id, UserInventory.item_id == item_id)
    )
    inv = result.scalar_one_or_none()
    if not inv or not inv.item:
        raise HTTPException(status_code=400, detail="You do not own this item.")
    
    # Store in equipped_items dict by item_type
    eq = dict(current_user.equipped_items) if current_user.equipped_items else {}
    eq[inv.item.item_type] = inv.item.id
    current_user.equipped_items = eq

    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.post("/unequip/{item_type}", response_model=UserResponse)
async def unequip_item(
    item_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unequip an item type."""
    eq = dict(current_user.equipped_items) if current_user.equipped_items else {}
    if item_type in eq:
        del eq[item_type]
        current_user.equipped_items = eq
        await db.commit()
        await db.refresh(current_user)
        
    return current_user


@router.get("/hearts", response_model=HeartsResponse)
async def get_hearts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return current heart count and time until next restore."""
    sync_hearts(current_user)
    await db.commit()
    return HeartsResponse(
        hearts=current_user.hearts if current_user.hearts is not None else MAX_HEARTS,
        max_hearts=MAX_HEARTS,
        seconds_until_restore=seconds_until_next_heart(current_user),
    )


@router.post("/use-heart", response_model=HeartsResponse)
async def use_heart(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Use one heart from inventory to restore +1 heart."""
    sync_hearts(current_user)
    if (current_user.hearts or 0) >= MAX_HEARTS:
        raise HTTPException(status_code=400, detail="Tim đã đầy!")

    # Find a heart item in inventory
    result = await db.execute(
        select(UserInventory)
        .options(selectinload(UserInventory.item))
        .where(
            UserInventory.user_id == current_user.id,
            UserInventory.quantity > 0,
        )
    )
    inv_rows = result.scalars().all()
    heart_inv = next((r for r in inv_rows if r.item and r.item.item_type == "heart"), None)
    if not heart_inv:
        raise HTTPException(status_code=400, detail="Không có tim trong kho!")

    # Consume one from inventory
    if heart_inv.quantity > 1:
        heart_inv.quantity -= 1
    else:
        await db.delete(heart_inv)

    # Restore one heart
    current_user.hearts = (current_user.hearts or 0) + 1
    if (current_user.hearts or 0) >= MAX_HEARTS:
        current_user.last_heart_restore_at = None

    await db.commit()
    await db.refresh(current_user)
    return HeartsResponse(
        hearts=current_user.hearts,
        max_hearts=MAX_HEARTS,
        seconds_until_restore=seconds_until_next_heart(current_user),
    )

