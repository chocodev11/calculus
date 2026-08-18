# Raw course and lesson schema

Use the repository's current raw-course format. The generator must produce JSON that `validate_all.py` accepts.

## Course tree

```text
data/raw_courses/<course-slug>/
├── course.json
└── chapters/<chapter-slug>/
    ├── chapter.json
    └── steps/<step-id>.json
```

`course.json` contains the course metadata and `chapters` is assembled by `tools/build_course_from_chapters.py`. A chapter contains metadata and an ordered `steps` array in the generated artifact.

## Step envelope

```json
{
  "id": "limit-khai-niem",
  "title": "Tên bài bằng tiếng Việt",
  "description": "Mô tả một dòng",
  "xp_reward": 15,
  "order_index": 0,
  "slides": []
}
```

Each slide has an integer `order_index` and a `blocks` array. Common blocks are:

```json
{
  "id": "concept",
  "type": "text",
  "content": {
    "heading": "Tiêu đề",
    "paragraphs": ["Nội dung tiếng Việt có thể dùng Markdown."]
  }
}
```

Other supported block shapes in current lessons:

- `math`: `{ "latex": "..." }`
- `callout`: `{ "variant": "theorem|tip|warning", "title": "...", "body": "..." }`
- `quiz`: `{ "question": "...", "options": [{"value":"a","label":"..."}], "correct": "a", "explanation": "..." }`
- `interaction`: `{ "interactionType": "sandbox|A|B|C|E", "lesson": { ... } }`

For legacy interactions, follow the shape already used by neighboring files and `validate_all.py`; do not invent a new legacy type. New Toán 10 work uses the Sandbox contract instead.

## Content quality gate

Before writing a step, verify:

1. The statement has a defined domain and all symbols are introduced.
2. The worked example is solvable with concepts already taught.
3. The answer and explanation agree, including open/closed endpoints, units, signs, and quantifiers.
4. The quiz tests the stated outcome and includes plausible misconception distractors.
5. The interaction changes the mathematical object being taught, not a decorative parameter.

