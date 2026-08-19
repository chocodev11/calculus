from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional
from app.database import get_db
from app.models import Story, Chapter, Step, Enrollment, StepProgress, User, Category
from app.schemas import StoryListResponse, StoryDetailResponse, ChapterResponse, StepResponse
from app.auth import get_current_user_optional, get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stories", tags=["stories"])


def _count_quiz_blocks_in_story(story) -> int:
    """Count quiz blocks across all slides in a Story object (in-memory)."""
    total = 0
    for ch in getattr(story, 'chapters', []) or []:
        for st in getattr(ch, 'steps', []) or []:
            for slide in getattr(st, 'slides', []) or []:
                blocks = slide.blocks or []
                if not isinstance(blocks, list):
                    continue
                for b in blocks:
                    if not isinstance(b, dict):
                        continue
                    if b.get('type') == 'quiz' or b.get('block_type') in ('quiz', 'assessment_ref'):
                        total += 1
    return total

@router.get("", response_model=list[StoryListResponse])
async def get_stories(
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    enrolled: Optional[bool] = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = select(Story).options(
        joinedload(Story.category),
        selectinload(Story.chapters).selectinload(Chapter.steps).selectinload(Step.slides)
    ).where(Story.is_published == True)
    
    if search:
        query = query.where(Story.title.ilike(f"%{search}%"))
    
    if featured:
        query = query.where(Story.is_featured == True)

    if enrolled is not None and current_user:
        enrolled_subq = select(Enrollment.story_id).where(Enrollment.user_id == current_user.id)
        if enrolled:
            query = query.where(Story.id.in_(enrolled_subq))
        else:
            query = query.where(Story.id.notin_(enrolled_subq))
    elif enrolled is True and not current_user:
        return []
    
    query = query.order_by(Story.order_index).offset(offset).limit(limit)
    result = await db.execute(query)
    stories = result.unique().scalars().all()

    enrolled_story_ids = set()
    completed_step_ids = set()
    if current_user:
        enroll_res = await db.execute(
            select(Enrollment.story_id).where(Enrollment.user_id == current_user.id)
        )
        enrolled_story_ids = set(enroll_res.scalars().all())

        prog_res = await db.execute(
            select(StepProgress.step_id).where(
                StepProgress.user_id == current_user.id,
                StepProgress.is_completed == True
            )
        )
        completed_step_ids = set(prog_res.scalars().all())
    
    response = []
    for story in stories:
        chapter_count = len(story.chapters or [])
        is_enrolled = story.id in enrolled_story_ids
        
        progress = 0
        if is_enrolled:
            story_step_ids = {st.id for ch in (story.chapters or []) for st in (ch.steps or [])}
            total_steps = len(story_step_ids)
            if total_steps > 0:
                completed_count = len(completed_step_ids & story_step_ids)
                progress = int((completed_count / total_steps) * 100)
        
        category_name = story.category.name if story.category else None
        exercises_count = _count_quiz_blocks_in_story(story)
        is_completed = (progress == 100)
        
        response.append(StoryListResponse(
            id=story.id,
            slug=story.slug,
            title=story.title,
            thumbnail_url=story.thumbnail_url,
            illustration=story.illustration,
            description=story.description,
            icon=story.icon,
            color=story.color,
            category_name=category_name,
            chapter_count=chapter_count,
            exercises=exercises_count,
            progress=progress,
            is_enrolled=is_enrolled,
            is_completed=is_completed
        ))
    
    return response

@router.get("/{slug}", response_model=StoryDetailResponse)
async def get_story(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    result = await db.execute(
        select(Story)
        .options(
            joinedload(Story.category),
            selectinload(Story.chapters).selectinload(Chapter.steps).selectinload(Step.slides)
        )
        .where(Story.slug == slug)
    )
    story = result.unique().scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check enrollment
    is_enrolled = False
    progress = 0
    completed_steps = set()
    
    if current_user:
        enrollment_result = await db.execute(
            select(Enrollment).where(
                Enrollment.user_id == current_user.id,
                Enrollment.story_id == story.id
            )
        )
        is_enrolled = enrollment_result.scalar_one_or_none() is not None
        
        if is_enrolled:
            progress = await calculate_story_progress(db, current_user.id, story.id)
            
            # Get completed steps
            progress_result = await db.execute(
                select(StepProgress.step_id).where(
                    StepProgress.user_id == current_user.id,
                    StepProgress.is_completed == True
                )
            )
            completed_steps = set(progress_result.scalars().all())
    
    # Build chapters with steps
    chapters = []
    found_current = False
    
    # Sort chapters and steps by order_index
    sorted_chapters = sorted(story.chapters, key=lambda c: c.order_index or 0)
    
    for chapter in sorted_chapters:
        steps = []
        sorted_steps = sorted(chapter.steps, key=lambda s: s.order_index or 0)
        
        for step in sorted_steps:
            is_completed = step.id in completed_steps
            is_current = not is_completed and not found_current and is_enrolled
            
            if is_current:
                found_current = True
            
            steps.append(StepResponse(
                id=step.id,
                title=step.title,
                description=step.description,
                xp_reward=step.xp_reward,
                is_completed=is_completed,
                is_current=is_current
            ))
        
        chapters.append(ChapterResponse(
            id=chapter.id,
            title=chapter.title,
            description=chapter.description,
            steps=steps
        ))
    
    # Access category safely
    category_name = story.category.name if story.category else None

    # Count exercises (quiz blocks)
    exercises_count = _count_quiz_blocks_in_story(story)
    
    # Story is completed when progress is 100%
    is_completed = progress == 100

    logger.debug(f"[stories.get_story] slug={story.slug} illustration={story.illustration!r} thumbnail_url={story.thumbnail_url!r} exercises={exercises_count}")
    
    return StoryDetailResponse(
        id=story.id,
        slug=story.slug,
        title=story.title,
        thumbnail_url=story.thumbnail_url,
        illustration=story.illustration,
        description=story.description,
        icon=story.icon,
        color=story.color,
        category_name=category_name,
        chapter_count=len(chapters),
        exercises=exercises_count,
        progress=progress,
        is_enrolled=is_enrolled,
        is_completed=is_completed,
        chapters=chapters
    )

@router.post("/{slug}/enroll")
async def enroll_story(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Story).where(Story.slug == slug))
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check existing enrollment
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.story_id == story.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already enrolled")
    
    enrollment = Enrollment(user_id=current_user.id, story_id=story.id)
    db.add(enrollment)
    await db.commit()
    
    return {"success": True}

async def calculate_story_progress(db: AsyncSession, user_id: int, story_id: int) -> int:
    # Get total steps
    total_result = await db.execute(
        select(func.count(Step.id))
        .join(Chapter)
        .where(Chapter.story_id == story_id)
    )
    total_steps = total_result.scalar() or 0
    
    if total_steps == 0:
        return 0
    
    # Get completed steps
    completed_result = await db.execute(
        select(func.count(StepProgress.id))
        .join(Step)
        .join(Chapter)
        .where(
            Chapter.story_id == story_id,
            StepProgress.user_id == user_id,
            StepProgress.is_completed == True
        )
    )
    completed_steps = completed_result.scalar() or 0
    
    return int((completed_steps / total_steps) * 100)
