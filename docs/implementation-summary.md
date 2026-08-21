# Implementation summary

## Current architecture

Calculus dùng lesson JSON/DSL khai báo làm nguồn nội dung runtime. LLM hoặc
editor tạo một document, backend validate và lưu vào `lesson_versions` dưới
dạng draft. Studio đọc draft để preview; learner chỉ đọc published version qua
`steps.published_version_id`.

```text
LLM JSON -> draft API -> LessonVersion(draft) -> Studio -> publish
         -> LessonVersion(published) -> stable Step/Slide rows -> learner API
```

Không còn bước build/sync sau mỗi lần sửa bài. `data/courses` chỉ giữ generated
artifact của lần import ban đầu và có thể dùng để kiểm tra/migrate; nó không
được đọc trong FastAPI startup và không cạnh tranh với database như một nguồn
live thứ hai.

## Đã triển khai

- `backend/app/lesson_contract.py` chuẩn hóa block legacy, allowlist block type,
  kiểm tra slide/block ID, assessment pool/reference và checksum ổn định.
- `backend/app/content_service.py` xử lý draft, publish, rollback và
  materialize slide theo `content_key` mà không thay row progress.
- `backend/app/routers/lessons.py` cung cấp validate, draft, preview, publish và
  rollback; production authoring yêu cầu `users.is_admin`.
- Alembic baseline và migration `20260821_0002` thêm lesson version, admin flag,
  published pointer và unique constraint cần thiết.
- `tools/import_course_artifacts.py` là migration một lần, mặc định dry-run;
  bảy step `menh-de` đã được import thành bảy published version vào SQLite.
- Studio và Admin Course Editor dùng JSON/API. Learner slide endpoint chỉ phục
  vụ step đã publish.
- Validator hiện kiểm tra 7 step và 80 slide; các slide có stable IDs và
  stable `content_key`.

## Database contract

Local dùng cố định `backend/calculus.db`. Production yêu cầu
`APP_ENV=production`, `DEBUG=false` và PostgreSQL `DATABASE_URL`. `/ready` thực
hiện query database trước khi báo ready. Tool SQLite → PostgreSQL bảo toàn
users, enrollment và progress hợp lệ, reset sequences, đồng thời quarantine
progress trỏ tới slide/user không tồn tại thay vì đoán mapping.

## Kiểm chứng đã chạy

- Backend unit tests: 13 tests pass.
- Lesson JSON validator: `steps=7`, `slides=80`, `errors=0`.
- Alembic local: revision `20260821_0002` là head.
- One-time artifact import: 7 lessons imported; user/enrollment/progress rows
  vẫn còn nguyên.

Các bước build frontend, TypeScript, browser smoke và PostgreSQL target vẫn cần
được chạy ở cuối rollout.
