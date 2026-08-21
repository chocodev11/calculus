# Calculus Studio

Studio là nơi review nội dung JSON/DSL trước khi publish. Nó không compile
lesson trong browser và chỉ đọc draft/published từ API.

## Quy trình hằng ngày

1. Dùng LLM sinh một `LessonDocument` JSON theo
   [`LESSON_SCHEME_CONTRACT.md`](LESSON_SCHEME_CONTRACT.md).
2. Vào `/admin/courses/menh-de`, chọn step và dán JSON vào editor.
3. Bấm `Validate`, sau đó `Lưu draft`. Draft có checksum và optimistic
   concurrency; nếu người khác đã lưu trước, UI báo conflict thay vì ghi đè.
4. Bấm `Mở Studio` hoặc vào `/studio/menh-de/{stepId}` để preview draft.
5. Review từng slide, interaction và các viewport. Khi đạt yêu cầu, bấm
   `Publish`.

Không cần chạy build hoặc sync sau từng lần sửa. Learner tiếp tục thấy version
đang published cho đến khi publish thành công.

## Viewport

Studio có Desktop Fluid, iPhone 15, iPhone SE và iPad Mini; mỗi thiết bị có
portrait/landscape. Đây là preview cùng renderer với learner, nên lỗi block
được bọc bằng ErrorBoundary và hiển thị trong block thay vì biến toàn bộ trang
thành white page.

## JSON block mẫu

```json
{
  "id": "s01-text-1",
  "block_type": "text",
  "content": {
    "heading": "Mệnh đề là gì?",
    "paragraphs": ["Một mệnh đề có chân trị đúng hoặc sai."]
  }
}
```

Interaction phải là manifest khai báo trong `content`; không đưa function,
import, event handler hoặc JavaScript executable vào JSON. Các block
`drag_drop`, `interactive_graph`, `fill_blank`, `ordering` có fallback
preview-only nếu chưa có grading contract.

## Version history

Mỗi lần publish tạo version immutable. Version cũ được archive và vẫn giữ trong
history. `Rollback` chọn một version archive để phục hồi published pointer;
progress tiếp tục gắn với slide `content_key` ổn định.

## Kiểm thử trước review

```bash
cd frontend
npm run validate:lessons
npm run test:run
npx tsc --noEmit
npm run build
```

Backend cần chạy Alembic trước khi mở Studio:

```bash
cd backend
python -m alembic -c alembic.ini upgrade head
```
