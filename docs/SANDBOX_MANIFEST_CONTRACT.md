# Sandbox manifest contract

Sandbox trong lesson là JSON declarative. Payload được lưu trong
`LessonDocument.slides[].blocks[]` với `block_type: "interaction"`; backend
không execute nội dung và frontend chỉ dispatch tới registry interaction đã
allowlist.

```text
LLM/editor JSON
  -> lesson contract validation
  -> LessonVersion draft/published
  -> Interaction block registry
  -> renderer
```

Ví dụ:

```json
{
  "id": "logic-classifier",
  "block_type": "interaction",
  "content": {
    "interactionType": "sandbox",
    "lesson": {
      "schemaVersion": "1.0",
      "kind": "math.sandbox",
      "archetypeId": "logic.proposition",
      "recipe": "logic.proposition",
      "config": {"mode": "proposition_classifier", "activity": {"items": []}}
    }
  }
}
```

`lesson_contract.py` kiểm tra block type và các assessment reference. Registry
frontend kiểm tra manifest cụ thể trước khi render. Manifest không được chứa
function, import, JSX expression hoặc code thực thi từ LLM.

Các block legacy `drag_drop`, `interactive_graph`, `fill_blank`, `ordering` có
fallback preview-only để dữ liệu vẫn đọc được; chúng chưa phải grading contract.

Kiểm thử:

```bash
npm --prefix frontend run validate:lessons
npm --prefix frontend run test:run
```
