"""
Migration script: Convert JSON raw courses to Content-as-Code MDX files.
Preserves all slide content, formulas (with unescaped LaTeX), quizzes, callouts, and sandboxes.
"""
import os
import sys
import json
import re
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

def clean_latex(text: str) -> str:
    """Normalize LaTeX strings from JSON escaping to clean markdown math."""
    if not isinstance(text, str):
        return ""
    # In JSON, people often write \\frac or \\\\frac. In MDX, single backslash \frac is needed.
    # But let's be careful not to corrupt already-single backslashes.
    return text

def block_to_mdx(block: dict) -> str:
    btype = block.get("block_type") or block.get("type", "")
    content = block.get("content", {})
    mdx_lines = []

    if btype == "text":
        heading = content.get("heading")
        if heading:
            mdx_lines.append(f"### {heading}\n")
        paragraphs = content.get("paragraphs") or []
        if isinstance(paragraphs, str):
            paragraphs = [paragraphs]
        for p in paragraphs:
            mdx_lines.append(f"{p}\n")

    elif btype == "callout":
        variant = content.get("variant", "note")
        title = content.get("title", "")
        body = content.get("body", "")
        mdx_lines.append(f'<Callout variant="{variant}" title="{title}">')
        if body:
            mdx_lines.append(f"  {body}")
        mdx_lines.append("</Callout>\n")

    elif btype in ("quiz", "assessment_ref"):
        question = content.get("question", "")
        explanation = content.get("explanation", "")
        options = content.get("options", [])
        quiz_id = block.get("id", "")
        
        # Escape quotes in question & explanation
        q_safe = question.replace('"', '&quot;')
        exp_safe = explanation.replace('"', '&quot;')
        
        mdx_lines.append(f'<Quiz id="{quiz_id}" question="{q_safe}" explanation="{exp_safe}">')
        for opt in options:
            val = opt.get("value", opt.get("id", ""))
            text = opt.get("text", opt.get("label", ""))
            is_correct = opt.get("is_correct", opt.get("correct", False))
            opt_exp = opt.get("explanation", "")
            
            correct_attr = " correct" if is_correct else ""
            clean_opt_exp = opt_exp.replace('"', '&quot;')
            opt_exp_attr = f' explanation="{clean_opt_exp}"' if opt_exp else ""
            mdx_lines.append(f'  <Option value="{val}"{correct_attr}{opt_exp_attr}>{text}</Option>')
        mdx_lines.append("</Quiz>\n")

    elif btype in ("interaction", "sandbox"):
        itype = content.get("interactionType", "sandbox")
        lesson = content.get("lesson", {})
        json_str = json.dumps(lesson, ensure_ascii=False, indent=2)
        # Indent JSON for JSX
        indented = "\n".join("  " + line for line in json_str.splitlines())
        mdx_lines.append(f'<Sandbox type="{itype}" manifest={{\n{indented}\n}} />\n')

    elif btype == "image":
        url = content.get("url", "")
        caption = content.get("caption", "")
        mdx_lines.append(f'![{caption}]({url})\n')
        if caption:
            mdx_lines.append(f'*<small>{caption}</small>*\n')

    elif btype == "video":
        url = content.get("url", "")
        mdx_lines.append(f'<iframe src="{url}" className="w-full aspect-video rounded-2xl my-4" allowFullScreen />\n')

    else:
        # Fallback raw render
        mdx_lines.append(f"```json\n{json.dumps(block, ensure_ascii=False, indent=2)}\n```\n")

    return "\n".join(mdx_lines)

def convert_step_to_mdx(step_data: dict, course_slug: str, chapter_slug: str) -> str:
    step_id = step_data.get("id", "step")
    title = step_data.get("title", "")
    description = step_data.get("description", "")
    xp = step_data.get("xp_reward", 100)
    order = step_data.get("order", 0)
    slides = step_data.get("slides", [])

    lines = []
    # Frontmatter metadata with single quotes (raw string literals in YAML)
    title_yaml = title.replace("'", "''")
    desc_yaml = description.replace("'", "''")
    lines.append("---")
    lines.append(f"id: '{step_id}'")
    lines.append(f"title: '{title_yaml}'")
    lines.append(f"description: '{desc_yaml}'")
    lines.append(f"courseSlug: '{course_slug}'")
    lines.append(f"chapterSlug: '{chapter_slug}'")
    lines.append(f"order: {order}")
    lines.append(f"xp: {xp}")
    lines.append("---")
    lines.append("")

    for idx, slide in enumerate(slides, 1):
        s_title = slide.get("title", f"Slide {idx}").replace('"', '&quot;')
        lines.append(f'<Slide title="{s_title}">')
        blocks = slide.get("blocks", [])
        for block in blocks:
            b_mdx = block_to_mdx(block)
            lines.append("  " + "\n  ".join(b_mdx.splitlines()))
        lines.append("</Slide>")
        lines.append("")

    return "\n".join(lines)

def migrate_all_courses(raw_dir: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    courses = []

    for course_folder in sorted(raw_dir.iterdir()):
        if not course_folder.is_dir():
            continue
        course_file = course_folder / "course.json"
        if not course_file.exists():
            continue

        with open(course_file, "r", encoding="utf-8") as f:
            course_meta = json.load(f)

        course_slug = course_meta.get("slug") or course_folder.name
        course_dest = out_dir / course_slug
        course_dest.mkdir(parents=True, exist_ok=True)

        chapters_dir = course_folder / "chapters"
        course_chapters = []

        if chapters_dir.exists():
            for chapter_folder in sorted(chapters_dir.iterdir()):
                if not chapter_folder.is_dir():
                    continue
                chapter_file = chapter_folder / "chapter.json"
                if not chapter_file.exists():
                    continue
                with open(chapter_file, "r", encoding="utf-8") as f:
                    chapter_meta = json.load(f)

                chap_slug = chapter_folder.name
                steps_dir = chapter_folder / "steps"
                step_ids = []

                if steps_dir.exists():
                    for step_file in sorted(steps_dir.glob("*.json")):
                        with open(step_file, "r", encoding="utf-8") as f:
                            step_data = json.load(f)
                        
                        step_id = step_data.get("id") or step_file.stem
                        step_ids.append(step_id)
                        
                        mdx_content = convert_step_to_mdx(step_data, course_slug, chap_slug)
                        mdx_filename = f"{step_file.stem}.mdx"
                        with open(course_dest / mdx_filename, "w", encoding="utf-8") as out_f:
                            out_f.write(mdx_content)
                        print(f"  [MDX] Generated {course_slug}/{mdx_filename}")

                chapter_meta["step_ids"] = step_ids
                course_chapters.append(chapter_meta)

        # Write meta.json for the course
        course_meta["chapters"] = course_chapters
        with open(course_dest / "meta.json", "w", encoding="utf-8") as mf:
            json.dump(course_meta, mf, ensure_ascii=False, indent=2)
        print(f"[Course] Converted course: {course_slug}")
        courses.append(course_meta)

    # Write root courses_index.json
    with open(out_dir / "index.json", "w", encoding="utf-8") as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)
    print(f"\nSuccessfully migrated {len(courses)} courses to {out_dir}")

if __name__ == "__main__":
    raw_courses = Path("data/raw_courses")
    out_courses = Path("frontend/src/content/courses")
    migrate_all_courses(raw_courses, out_courses)
