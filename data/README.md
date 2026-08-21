# Data

`data/courses` chứa JSON artifact dùng cho lần import lesson ban đầu và kiểm
tra contract. Đây không phải database runtime và không được chỉnh để cập nhật
bài học đang chạy.

## Cấu trúc

```text
data/
  categories.json
  achievements.json
  quests.json
  interaction_data/
  courses/
    <course>/chapters/<chapter>/steps/*.json
```

Step artifact phải có `schema_version: "lesson-1"`, `content_key`, stable slide
IDs và blocks theo [Lesson JSON Contract](../docs/LESSON_SCHEME_CONTRACT.md).
Validator dùng chung:

```bash
npm --prefix frontend run validate:lessons
```

## Import một lần

Artifact hiện có thể import vào database sau khi chạy Alembic:

```bash
python tools/import_course_artifacts.py       # dry-run
python tools/import_course_artifacts.py --apply
```

Sau import, nội dung mới được tạo/chỉnh trong Admin Course Editor bằng draft
API. Không cần build artifact hoặc chạy một lệnh đồng bộ sau mỗi lần sửa.

## Platform seed data

`categories.json`, `achievements.json` và `quests.json` là dữ liệu nền tảng,
không phải lesson payload executable. Interaction manifest trong lesson cũng là
JSON declarative và chạy qua registry/allowlist của frontend.
