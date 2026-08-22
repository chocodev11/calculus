# Lesson JSON Contract

## Boundary

`LessonDocument` là nguồn nội dung canonical trong runtime. LLM chỉ được sinh
JSON data theo schema; backend validate bằng Pydantic và không execute code,
import module hoặc JSX từ nội dung.

```text
LLM/editor JSON
  -> POST/PATCH /api/v1/admin/lessons/{step_id}/draft
  -> LessonVersion(status=draft)
  -> Studio preview
  -> POST .../publish
  -> immutable LessonVersion(status=published)
  -> steps.published_version_id
  -> learner /steps/{id}/slides
```

Một draft được cập nhật nhiều lần bằng `PATCH`; không có build hoặc sync trong
vòng lặp gõ/review. Publish tạo version số mới và archive version cũ. Rollback
chỉ đổi published pointer về một version đã tồn tại.

## Document

Bắt buộc có:

```json
{
  "schema_version": "lesson-1",
  "id": "step-id",
  "content_key": "course/chapter/step-id",
  "title": "Tên bài",
  "description": "Mô tả",
  "xp_reward": 10,
  "coin_reward": 5,
  "order_index": 0,
  "course_slug": "course",
  "chapter_slug": "chapter",
  "slides": []
}
```

Mỗi slide có `id` ổn định, `order_index`, `title` và danh sách blocks. Slide
được đồng nhất với row hiện có bằng `content_key` dạng
`{step.content_key}/{slide.id}`; row cũ không bị xoá/reinsert khi publish.
Block ID chỉ cần duy nhất trong cùng slide.

## Block types

Contract hiện cho phép `text`, `math`, `callout`, `image`, `quiz`,
`assessment_pool`, `assessment_ref`, `adaptive_assessment`, `interaction`,
`video`, `code`, `reveal`, `fill_blank`, `ordering`, `drag_drop` và
`interactive_graph`.

`assessment_pool` chỉ dành cho authoring. Với lesson adaptive, phải có đúng ba
pool có nguồn PDF và metadata `difficulty`, `outcomeIds`, `misconceptionIds`,
`sourceMapping` (21 câu trắc nghiệm 7/7/7, 6 nhóm Đúng/Sai 3/3 và 6 câu ngắn
3/3). `adaptive_assessment` là block learner-facing duy nhất; backend tạo
`AssessmentItem` khi publish và không đưa `correct`, `correct_answers` hay
answer key vào projection. `assessment_ref` vẫn được kiểm tra để giữ tính hợp
lệ của authoring data nhưng không được materialize ở learner.

Nguồn hiện tại là `chuyen-de-menh-de-va-tap-hop-toan-10.pdf`, SHA-256
`6f41eaf9891d0d35cf567a9b1503e5f5c26376d24406c8b687d83ac7bb4d58f3`.

Block legacy chưa có grading contract vẫn phải render fallback đọc được và ghi
rõ preview-only, không được làm crash trang.

## API

```text
GET   /api/v1/admin/lessons/{step_id}
GET   /api/v1/admin/lessons/{step_id}/preview?version_id=...
PATCH /api/v1/admin/lessons/{step_id}/draft
POST  /api/v1/admin/lessons/{step_id}/validate
POST  /api/v1/admin/lessons/{step_id}/publish
POST  /api/v1/admin/lessons/{step_id}/rollback
```

`expected_checksum` bảo vệ optimistic concurrency. Sai contract trả HTTP 422
với `detail.code=lesson_validation_error`; draft conflict trả HTTP 409.

Learner `/steps/{id}/slides` chỉ trả slide của step có published version.
Response là bare array; frontend vẫn nhận envelope cũ trong thời gian chuyển
tiếp nhưng báo lỗi rõ nếu payload không phải array hợp lệ.

### Adaptive assessment API

```text
POST /adaptive/sessions
GET  /adaptive/sessions/{session_id}
POST /adaptive/sessions/{session_id}/attempts
POST /adaptive/sessions/{session_id}/complete
```

Client chỉ gửi `step_id`, item hiện tại, sequence, answer và một
`client_attempt_id`. Server chọn câu, chấm điểm, cập nhật mastery, band,
StepProgress và XP. Mỗi session có đúng 9 câu theo quota 5/2/2; completion và
attempt đều idempotent.

## Artifact migration

`data/courses` là artifact kiểm tra/import một lần, không phải nguồn live thứ
hai. `tools/import_course_artifacts.py` mặc định dry-run và khi `--apply` sẽ
khớp step theo `content_key`, tạo published version đầu tiên và giữ slide IDs.
Sau khi import xong, soạn bài mới trực tiếp trong draft API/Studio.

## Validation

```bash
cd frontend
npm run validate:lessons
npm run test:run
npx tsc --noEmit
npm run build
```
