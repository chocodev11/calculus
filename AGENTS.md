# Hướng Dẫn Kiến Trúc & Vận Hành Cho AI Agent (TiaMath)

File này định nghĩa kiến trúc hệ thống, quy chuẩn thiết kế, các lệnh điều khiển và nguyên tắc ứng xử cho AI agent khi đọc, sửa, tối ưu hoặc kiểm thử mã nguồn trong repository **TiaMath** (Calculus Platform).

---

## 1. Tổng quan Kiến Trúc & Công Nghệ

TiaMath là nền tảng học Toán tương tác trực quan cho học sinh THPT (Lớp 10–12) theo chương trình GDPT 2018.

- **Frontend**:
  - **Framework**: React 18, Vite (dev server chạy tại `http://localhost:3000`).
  - **Styling**: Tailwind CSS v3, CSS Modules / Vanilla CSS bổ trợ.
  - **Toán học & Hoạt họa**: KaTeX (`react-katex`), Framer Motion, HTML5 Canvas cho các mô phỏng hình học động.
  - **State Management**: Zustand (`authStore`, `uiStore`, `questStore`).
  - **Component Base**: Radix UI primitives, Lucide React icons, 2.5D Tactile UI system (`TactileButton`).
- **Backend**:
  - **Framework**: FastAPI (Python 3.10+, chạy tại `http://localhost:8000`).
  - **Database & ORM**: SQLite (`backend/calculus.db`) cho môi trường phát triển cục bộ; PostgreSQL cho môi trường production. SQLAlchemy + Alembic migration.
- **Content & Lesson Engine**:
  - Bài học được định nghĩa bằng JSON khai báo theo hợp đồng schema `lesson-1`.
  - Nguồn dữ liệu runtime chính thức là các bản ghi bất biến `LessonVersion` trong CSDL, được phục vụ qua Learner API.
  - **Bảo mật**: Frontend không bao giờ thực thi mã JavaScript tùy ý do LLM sinh ra. Mọi tương tác động phải đi qua các sandbox plugin và block đã đăng ký trước.

---

## 2. Nguyên Tắc Cốt Lõi Cho AI Agent (Golden Rules)

1. **Tiết kiệm token khi kiểm tra giao diện (BẮT BUỘC)**:
   - **Tuyệt đối KHÔNG** mở `browser_subagent` chỉ để xem giao diện web sau khi sửa code (việc này tiêu tốn từ 30.000 – 80.000 token mỗi lần và tạo video log nặng nề).
   - **LUÔN LUÔN** dùng công cụ preview nhanh:
     ```bash
     just preview <route>          # Chụp Desktop (1440x900) trong ~2s
     just preview-mobile <route>   # Chụp Mobile (390x844) trong ~2s
     just preview-full <route>     # Chụp toàn bộ chiều cao trang
     ```
     Sau đó gọi công cụ `view_file` trực tiếp lên file ảnh kết quả [`.preview/preview.png`](file:///d:/calculus/.preview/preview.png). Thao tác này chỉ tiêu tốn ~500–1.000 token và phản hồi tức thì.
2. **Định dạng ký tự**:
   - Luôn sử dụng mã hóa **UTF-8 không BOM** (UTF-8 without BOM) cho tất cả các file mã nguồn, markdown và JSON.
3. **Tính toàn vẹn dữ liệu (Single Source of Truth)**:
   - Thư mục `data/courses/` chỉ là artifact dùng cho import ban đầu hoặc kiểm tra parity; **không phải** là nguồn runtime.
   - Thư mục `frontend/src/content/courses/` chỉ chứa metadata registry của khóa học.
   - Không tự ý tạo thêm cơ chế đồng bộ dữ liệu song song gây sai lệch tiến độ học tập của người dùng.
4. **Quy chuẩn thiết kế "TiaMath Kinetic" (Academic Tactile)**:
   - **Tương tác 2.5D**: Nút bấm dùng `TactileButton` với độ sâu bóng đổ cố định, triệt tiêu hoàn toàn giật layout (zero CLS).
   - **Bảng màu ngữ nghĩa**:
     - Euler Indigo: `#4F46E5` (Màu chủ đạo, nút chính, điểm nhấn)
     - Tangent Cyan: `#0284C7` (Dẫn dắt, tiếp tuyến, khám phá)
     - Kinetic Amber: `#F59E0B` (Streak, năng lượng, phần thưởng)
     - Vector Emerald: `#10B981` (Hoàn thành, kết quả đúng, tích cực)
     - Heart Crimson: `#EF4444` (Cảnh báo, số tim, lỗi)
   - **Chuẩn Mobile**:
     - Thanh điều hướng đáy có chiều cao chuẩn 60–64px (`h-16`), kích thước icon 24px (`w-6 h-6`).
     - Bắt buộc đệm an toàn `env(safe-area-inset-bottom, 0px)` để không bị thanh Home Indicator trên iOS/Android che lấp.
     - Vùng chạm (touch target) mỗi tab phải chiếm 100% diện tích cột (`flex-1 h-full`).
5. **Kỷ luật viết mã**:
   - Viết code tường minh, áp dụng guard clauses và early returns thay vì lồng ghép khối điều kiện sâu.
   - Tránh tạo các hàm wrapper dư thừa hoặc các lớp trừu tượng hóa quá mức cần thiết.
   - Luôn xử lý lỗi rõ ràng (không nuốt lỗi `try ... catch` rỗng).

---

## 3. Lệnh Điều Khiển & Quy Trình Làm Việc (CLI Cheat Sheet)

Các lệnh được định nghĩa sẵn trong [justfile](file:///d:/calculus/justfile):

| Lệnh | Chức năng | Ghi chú |
| :--- | :--- | :--- |
| `just host` | Khởi chạy đồng thời cả Backend (8000) và Frontend (3000) | Dùng trong quá trình dev |
| `just backend` | Khởi chạy riêng FastAPI Backend | Port 8000 (reload enabled) |
| `just frontend` | Khởi chạy riêng Vite React Frontend | Port 3000 |
| `just preview [route]` | Chụp ảnh preview màn hình web (Desktop 1440x900) | Xuất ra `.preview/preview.png` |
| `just preview-mobile [route]` | Chụp ảnh preview giao diện Mobile (390x844) | Kiểm tra responsive di động |
| `just preview-full [route]` | Chụp ảnh toàn bộ chiều dài trang web (Full Page) | Xem tổng thể trang dài |
| `just preview-watch [route]` | Tự động chụp lại preview khi code frontend thay đổi | Chế độ theo dõi liên tục |
| `just lesson-validate` | Kiểm tra tính hợp lệ của toàn bộ file JSON bài học | Đối chiếu với JSON schema |
| `just db-upgrade` | Cập nhật cấu trúc database qua Alembic | Chạy trên `backend/calculus.db` |
| `npm run test:run` | Chạy bộ kiểm thử unit Vitest (chạy trong `frontend/`) | Đảm bảo logic không bị phá vỡ |
| `npx tsc --noEmit` | Kiểm tra kiểu dữ liệu TypeScript (chạy trong `frontend/`) | Kiểm tra tính tương thích type |

---

## 4. Bản Đồ Thư Mục Cốt Lõi (Repository Directory Map)

```text
d:/calculus/
├── backend/                        # FastAPI Backend service
│   ├── alembic/                    # Database migrations
│   ├── app/                        # Mã nguồn ứng dụng Python
│   │   ├── lesson_contract.py      # Schema hợp đồng bài học & learner projection
│   │   ├── content_service.py      # Xử lý draft, publish, rollback bài học
│   │   ├── models.py               # SQLAlchemy models (User, Step, LessonVersion...)
│   │   └── routers/                # API router (lessons, auth, courses, quests...)
│   └── calculus.db                 # CSDL SQLite phát triển cục bộ
├── data/                           # Dữ liệu tĩnh & artifact ban đầu
│   ├── courses/                    # Bản mẫu khóa học dùng cho import
│   ├── achievements.json           # Danh sách 17 thành tích game hóa
│   └── quests.json                 # Hệ thống nhiệm vụ hàng ngày/tuần
├── docs/                           # Tài liệu thiết kế chi tiết
│   ├── LESSON_SCHEME_CONTRACT.md   # Quy cách cấu trúc JSON của từng slide bài học
│   └── deferred.md                 # Các đầu việc/tối ưu đã hoãn lại có chủ đích
├── frontend/                       # React 18 + Vite Frontend
│   ├── index.html                  # HTML entry (chứa thẻ meta viewport-fit=cover)
│   ├── src/
│   │   ├── admin/                  # Giao diện soạn thảo & phát hành bài học
│   │   ├── components/             # Components dùng chung (Layout, Toast, Modal...)
│   │   │   ├── interactions/       # Các widget giải toán, MathText KaTeX
│   │   │   ├── landing/            # Các khối mô phỏng tương tác trên Landing Page
│   │   │   └── ui/                 # UI primitives (TactileButton, Badges, Avatar...)
│   │   ├── content/courses/        # Metadata registry của khóa học phía client
│   │   ├── lib/                    # Stores (Zustand), API client, Audio SFX, Brand
│   │   ├── pages/                  # Các trang (Landing, Explore, Story, Step, Studio...)
│   │   └── sandbox/                # Plugin mô phỏng toán học (logic, trig...)
├── tools/                          # Bộ công cụ hỗ trợ phát triển
│   ├── preview.mjs                 # Headless browser preview tool siêu tốc (~2s)
│   ├── validate_lesson_json.ts     # Trình kiểm tra cú pháp bài học JSON
│   ├── import_course_artifacts.py  # Script import bài học ban đầu vào CSDL
│   └── migrate_sqlite_to_postgres.py # Công cụ chuyển đổi CSDL sang production
├── justfile                        # Command runner chuẩn hóa toàn bộ lệnh dự án
├── PRODUCT.md                      # Tầm nhìn sản phẩm, nguyên tắc sư phạm & thương hiệu
└── README.md                       # Hướng dẫn cài đặt & tổng quan kỹ thuật
```

---

## 5. Quy Trình Kiểm Tra Trước Khi Bàn Giao (Pre-Handoff Checklist)

Trước khi xác nhận hoàn thành một nhiệm vụ cho người dùng, AI Agent cần:
1. **Kiểm tra cú pháp & Type**: Chạy `npx tsc --noEmit` trong thư mục `frontend/` (nếu có chỉnh sửa code TypeScript/JSX).
2. **Kiểm tra tính toàn vẹn bài học**: Chạy `just lesson-validate` (nếu có chỉnh sửa cấu trúc JSON bài học).
3. **Kiểm tra giao diện nhanh**: Chạy `just preview <route>` hoặc `just preview-mobile <route>`, sau đó dùng `view_file` lên `.preview/preview.png` để xác nhận không vỡ layout, không tràn chữ và không vỡ icon.
4. **Kiểm tra trạng thái Git**: Đảm bảo không tạo file rác ngoài các thư mục đã được cấu hình trong `.gitignore`.
