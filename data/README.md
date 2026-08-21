# Calculus Data Store

`data/courses` chứa generated artifacts, không phải nguồn authoring. Nguồn chính
là MDX tại `frontend/src/content/courses`.

Build và validate:

```bash
npm --prefix frontend run build:course
npm --prefix frontend run validate:course
```

Sau đó chạy Alembic và `backend/sync_data.py` để đưa artifact vào database.
Backend chỉ đọc `data/courses`; nó không build nội dung lúc startup.

## 📁 Cấu trúc

```
data/
├── categories.json      # Danh mục khóa học
├── achievements.json    # Hệ thống thành tựu
├── courses/             # Generated từ MDX
│   └── <course>/chapters/<chapter>/steps/*.json
└── README.md
```

## 📋 Schema

### Course (courses/*.json)
```json
{
  "slug": "course-slug",
  "title": "Tên khóa học",
  "description": "Mô tả",
  "icon": "∫",
  "color": "from-blue-500 to-blue-700",
  "category": "giai-tich",
  "difficulty": "beginner|intermediate|advanced",
  "is_published": true,
  "is_featured": true,
  "order_index": 1,
  "chapters": [...]
}
```

### Chapter
```json
{
  "id": "chapter-id",
  "title": "Tên chương",
  "description": "Mô tả",
  "order_index": 0,
  "steps": [...]
}
```

### Step
```json
{
  "id": "step-id",
  "title": "Tên bài học",
  "description": "Mô tả",
  "xp_reward": 10,
  "order_index": 0,
  "slides": [...]
}
```

### Slide Blocks
```json
{
  "order_index": 0,
  "blocks": [
    {
      "id": "unique-id",
      "type": "text|math|quiz|image|video",
      "content": {...}
    }
  ]
}
```

## 🧱 Block Types

## 🔁 Interactive Blocks

Hệ thống hỗ trợ các block tương tác toán học dạng `interactive` dùng các module React/JSX trong `data/interaction_data`. Tham khảo chi tiết về engine và các hợp đồng `recompute`/`render` ở [data/interaction_data/instructions.md](data/interaction_data/instructions.md).

Cấu trúc block ví dụ (slides.blocks -> một block kiểu interactive):

```json
{
  "type": "interactive",
  "content": {
    "interaction_type": "A|B|C|E",
    "module": "interactive_type_a.jsx",
    "props": { /* props dành cho component, ví dụ range, labels */ },
    "initial_state": { /* primitive state, ví dụ { resolution: 100 } */ },
    "instructions": "Ngắn gọn hướng dẫn cho học viên"
  }
}
```

Hướng dẫn theo loại:
- **Type A — Resolution Interaction**: điều khiển mật độ mẫu. Gán `interaction_type: "A"` và `initial_state: { "resolution": <number> }`. Module mẫu: [data/interaction_data/interactive_type_a.jsx](data/interaction_data/interactive_type_a.jsx).
- **Type B — Parameter Control**: thay đổi tham số hàm (semantic parameter). Gán `interaction_type: "B"` và `initial_state: { "parameterValue": <number> }`. Module mẫu: [data/interaction_data/interactive_type_b.jsx](data/interaction_data/interactive_type_b.jsx).
- **Type C — Temporal Playback**: điều khiển thời gian/replay. Gán `interaction_type: "C"` và `initial_state: { "t": <number> }`. Module mẫu: [data/interaction_data/interactive_type_c.jsx](data/interaction_data/interactive_type_c.jsx).
- **Type E — Structural Decomposition**: điều khiển tham số phân tích/partition. Gán `interaction_type: "E"` và `initial_state: { "structure": <0..1> }`. Module mẫu: [data/interaction_data/interactive_type_e.jsx](data/interaction_data/interactive_type_e.jsx).

Ghi chú thực thi và thiết kế:
- `recompute(interaction, state)` phải trả `{ newState, systemState }` và luôn là hàm thuần (xem `recompute` contract trong [data/interaction_data/instructions.md](data/interaction_data/instructions.md)).
- `render()` chỉ dùng `systemState` và không đổi `state` hay `interaction` JSON.
- Các `props` trong `content.props` chỉ dành cho giao diện và không được thay thế cho `primitive state` — mọi thay đổi semantic phải diễn ra qua `initial_state`/`recompute`.

Ví dụ ngắn (Type B):

```json
{
  "type": "interactive",
  "content": {
    "interaction_type": "B",
    "module": "interactive_type_b.jsx",
    "props": { "label": "Điều chỉnh a", "min": -5, "max": 5, "step": 0.1 },
    "initial_state": { "parameterValue": 1.0 },
    "instructions": "Kéo thanh để thay đổi tham số hàm"
  }
}
```

Thêm module tương tác mới:
- Đặt file component trong `data/interaction_data/`.
- Đảm bảo `recompute` và `render` tuân thủ hợp đồng trong [data/interaction_data/instructions.md](data/interaction_data/instructions.md).


### Text Block
```json
{
  "type": "text",
  "content": {
    "heading": "Tiêu đề",
    "paragraphs": ["Đoạn 1", "Đoạn 2"]
  }
}
```

### Math Block
```json
{
  "type": "math",
  "content": {
    "latex": "\\lim_{x \\to 0} f(x) = L"
  }
}
```

### Quiz Block
```json
{
  "type": "quiz",
  "content": {
    "question": "Câu hỏi?",
    "options": [
      {"value": "a", "label": "Đáp án A"},
      {"value": "b", "label": "Đáp án B"}
    ],
    "correct": "a",
    "explanation": "Giải thích"
  }
}
```

## 🔧 Sử dụng

### Thêm khóa học mới
1. Tạo thư mục `frontend/src/content/courses/ten-khoa-hoc/` với `meta.json` và các file `.mdx`.
2. Dùng `<Slide id="...">` ổn định và chỉ dùng các block declarative trong contract.
3. Chạy `npm --prefix frontend run build:course` và `npm --prefix frontend run validate:course`.
4. Chạy Alembic rồi `python backend/sync_data.py`.

### Import vào database
```bash
cd backend
python -m alembic -c alembic.ini upgrade head
python sync_data.py
```

## 📝 Lưu ý

- File JSON phải valid (dùng JSON validator)
- ID phải unique trong phạm vi course
- `order_index` bắt đầu từ 0
- LaTeX dùng double backslash: `\\lim` thay vì `\lim`
