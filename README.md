# Calculus

Nền tảng học toán tương tác gồm React/Vite ở frontend và FastAPI/SQLAlchemy ở
backend. Nội dung bài học là JSON/DSL khai báo, được lưu theo version trong
database; frontend không thực thi JavaScript do LLM sinh ra.

## Chạy local

Yêu cầu Node.js 18+, Python 3.10+ và SQLite. Cài dependency rồi chạy schema:

```bash
just install
just db-upgrade
```

Chạy hai service ở hai terminal:

```bash
just backend     # http://localhost:8000
just frontend    # http://localhost:3000
```

Hoặc dùng `just host`. Local luôn dùng `backend/calculus.db`, bất kể lệnh
được chạy từ thư mục nào. Các biến môi trường tối thiểu:

```dotenv
APP_ENV=local
DEBUG=true
```

Production phải dùng PostgreSQL:

```dotenv
APP_ENV=production
DEBUG=false
DATABASE_URL=postgresql://user:password@host:5432/calculus
```

`DEBUG=release` vẫn được đọc như production để tương thích cấu hình cũ. URL
database không được ghi nguyên văn vào log.

## Workflow soạn bài

LLM sinh `LessonDocument` JSON theo contract, người biên tập review trong
`/admin/courses/:slug`, rồi:

1. Validate JSON.
2. Lưu draft qua API; draft không ảnh hưởng learner.
3. Mở `/studio` để preview draft trên desktop/mobile và kiểm tra interaction.
4. Publish để tạo immutable `LessonVersion` mới.

Learner API chỉ đọc version được trỏ bởi `steps.published_version_id`. Vì vậy
việc chỉnh JSON không cần build frontend, không cần sync thủ công và không làm
mất `slide_progress`; publish chỉ cập nhật các row slide theo `content_key` ổn
định.

Ví dụ tối thiểu:

```json
{
  "schema_version": "lesson-1",
  "id": "01-menh-de-va-tinh-dung-sai",
  "content_key": "menh-de/menh-de/01-menh-de-va-tinh-dung-sai",
  "title": "Mệnh đề và tính đúng sai",
  "description": "Một bài học khai báo.",
  "xp_reward": 120,
  "course_slug": "menh-de",
  "chapter_slug": "menh-de",
  "slides": [
    {
      "id": "s01",
      "order_index": 0,
      "title": "Khái niệm",
      "blocks": [
        {
          "id": "s01-text-1",
          "block_type": "text",
          "content": {"heading": "Mệnh đề là gì?", "paragraphs": ["..."]}
        }
      ]
    }
  ]
}
```

Block type và assessment pool/reference được kiểm tra ở backend trước khi lưu
và publish. Block legacy vẫn có fallback đọc được trong learner/Studio nhưng
chưa được coi là interaction có chấm điểm.

## Các lệnh hữu ích

```bash
just lesson-validate
just db-upgrade
python tools/import_course_artifacts.py                 # dry-run
python tools/import_course_artifacts.py --apply         # one-time import
python tools/migrate_sqlite_to_postgres.py \
  --target-url postgresql://user:password@host:5432/calculus
```

`data/courses` chỉ là artifact dùng cho import ban đầu hoặc kiểm tra parity; nó
không phải nguồn runtime thứ hai. `frontend/src/content/courses` chỉ còn
metadata registry. Nội dung chỉnh sửa mới nằm trong
`LessonVersion` của database.

## Cấu trúc chính

```text
backend/
  app/lesson_contract.py       # contract JSON và learner-safe projection
  app/content_service.py       # draft, publish, rollback, stable slide keys
  app/routers/lessons.py       # authoring API
  alembic/                     # schema migrations
data/courses/                  # artifact import một lần
frontend/src/admin/            # JSON editor và publish controls
frontend/src/pages/StudioPreview.jsx
tools/import_course_artifacts.py
tools/migrate_sqlite_to_postgres.py
tools/validate_lesson_json.ts
docs/LESSON_SCHEME_CONTRACT.md
```

## API authoring

Các endpoint yêu cầu admin (local debug cho phép user local hiện tại):

```text
GET   /api/v1/admin/lessons/{step_id}
GET   /api/v1/admin/lessons/{step_id}/preview
PATCH /api/v1/admin/lessons/{step_id}/draft
POST  /api/v1/admin/lessons/{step_id}/validate
POST  /api/v1/admin/lessons/{step_id}/publish
POST  /api/v1/admin/lessons/{step_id}/rollback
```

Readiness probe là `GET /ready`; endpoint này chỉ trả thành công sau khi query
được database.

## Migration SQLite → PostgreSQL

Nguồn chính là `backend/calculus.db`. Hãy backup file trước, chạy Alembic trên
database đích, chạy tool ở chế độ dry-run rồi mới thêm `--apply`. Tool giữ
users, enrollment và progress hợp lệ, reset sequence PostgreSQL, đồng thời
đưa progress trỏ tới user/slide không tồn tại vào
`slide_progress_quarantine` thay vì đoán slide thay thế.

## Kiểm thử frontend

```bash
cd frontend
npm run validate:lessons
npm run test:run
npx tsc --noEmit
npm run build
```
