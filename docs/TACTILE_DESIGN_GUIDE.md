# Calculus Kinetic: Interactive Control Taxonomy & Tactile Design System

Tài liệu quy chuẩn hóa kiến trúc điều khiển tương tác và ngôn ngữ thiết kế **Calculus Kinetic (Academic Tactile)** cho toàn bộ ứng dụng và Math Sandbox của Calculus.app.

---

## 1. Hệ Thống Phân Cấp Điều Khiển Tương Tác (5-Tier Interactive Control Taxonomy)

Để chấm dứt hoàn toàn tình trạng chắp vá tùy hứng giữa Flat button, Segmented control và 2.5D button, mọi phần tử tương tác trên toàn bộ giao diện **bắt buộc phải tuân theo 1 trong 5 cấp độ rõ ràng sau**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HỆ THỐNG PHÂN CẤP TƯƠNG TÁC (5 TIERS)                │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: 2.5D Physical Push CTA   ─── Hành động & Cam kết (Commit)      │
│ Tier 2: Flat Segmented Controls  ─── Chuyển đổi trạng thái (Tabs/Views)│
│ Tier 3: Navigation Pills         ─── Điều hướng không gian (Header/Bar)│
│ Tier 4: Action List Rows         ─── Menu cài đặt & Khoan sâu (Drill)  │
│ Tier 5: Subject Manipulatives    ─── Tương tác trực tiếp (Quiz/Math)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 🔹 Tier 1: Nút Bấm Vật Lý 2.5D (`TactileButton`) — Hành Động & Cam Kết (Action & Commitment)

- **Mục đích**: Dành riêng cho các hành động mang tính quyết định, cam kết hoặc thực thi nghiệp vụ (Tiếp tục học, Bắt đầu bài, Mua vật phẩm, Nhận thưởng, Lưu thay đổi, Đăng ký, Nộp bài quiz, Đổi mật khẩu).
- **Vật lý & Cấu trúc**:
  - Viền đáy 2.5D thật (`border-b-4`), gập lò xo tức thì khi nhấn (`active:border-b-0 active:translate-y-1`).
  - **Tuyệt đối không dùng blur shadow** (`shadow-md`, `shadow-lg`).
- **Các biến thể (Variants)**:
  - `primary` (Euler Indigo): Thao tác tiến trình chính (`bg-indigo-600 border-indigo-800 text-white`).
  - `success` (Vector Emerald): Hoàn thành, Đúng (`bg-emerald-600 border-emerald-800 text-white`).
  - `amber` (Kinetic Amber): Nhận thưởng, Coin, Gợi ý (`bg-amber-500 border-amber-700 text-white`).
  - `danger` (Crimson Rose): Xóa, Hủy, Tháo đồ, Đăng xuất (`bg-rose-600 border-rose-800 text-white`).
  - `secondary` (Canvas White): Hành động phụ cùng cấp, Chỉnh sửa, Đóng (`bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 text-slate-700`).
- **Quy tắc nút liền kề (Sibling Buttons)**:
  - Khi 1 nút icon đứng cạnh 1 nút chữ (ví dụ nút Cài đặt ⚙️ cạnh nút Chỉnh sửa ✏️ ở Hồ sơ), nút icon **bắt buộc phải là `TactileButton size="icon-sm"`** để đồng bộ 100% về chiều cao (`h-9`), độ dày viền đáy (`border-b-4`) và cơ chế lò xo.

---

### 🔹 Tier 2: Điều Khiển Phân Đoạn Phẳng (`SegmentedControl`) — Chuyển Đổi Trạng Thái (State / View Switcher)

- **Mục đích**: Dành cho việc chuyển đổi giữa các tab góc nhìn, bộ lọc danh mục trên cùng 1 trang (ví dụ: Tab Hồ sơ `[Tổng quan | Thành tựu]`, Tab Cửa hàng `[Nhiệm vụ | Cửa hàng | Túi đồ]`, Bộ lọc Thành tựu `[Tất cả | Đã đạt | Chưa mở]`).
- **Nguyên lý cốt lõi**:
  - Tab là **bộ chuyển đổi trạng thái hiển thị**, không phải hành động nén lực, vì vậy **KHÔNG dùng hiệu ứng 2.5D bevel** cho tab.
- **Cấu trúc & Giao diện**:
  - Rãnh trượt (Track): Hộp lõm nền xám `bg-slate-100/90 border border-slate-200/80 rounded-2xl p-1.5 flex gap-1.5`.
  - Thẻ đang kích hoạt (Active Segment): Thẻ phẳng nổi nhẹ màu trắng `bg-white text-indigo-700 font-extrabold border border-slate-200/80 rounded-xl`.
  - Thẻ chưa kích hoạt (Inactive): `text-slate-500 font-bold hover:text-slate-800 hover:bg-slate-200/50 rounded-xl`.

---

### 🔹 Tier 3: Thẻ Điều Hướng (`Navigation Pills`) — Điều Hướng Không Gian (Spatial Transitions)

- **Mục đích**: Thanh menu chính trên App Header (`Trang chủ`, `Khám phá`, `Nhiệm vụ`, `Hồ sơ`), các badge chỉ số (`Tim`, `Streak`, `XP`).
- **Giao diện**:
  - Mục thường: `px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors`.
  - Mục đang chọn: `bg-white text-indigo-600 font-bold border border-slate-200/80`.

---

### 🔹 Tier 4: Hàng Danh Sách Cài Đặt (`ActionList` & `ActionRow`) — Menu Khoan Sâu (Drill-Down)

- **Mục đích**: Các mục tùy chọn trong trang Hồ sơ, Cài đặt, Danh sách chương (`Đổi mật khẩu`, `Cài đặt thông báo`, `Đăng xuất`, `Chương 1...`).
- **Cấu trúc**:
  - Khung bao: `bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 overflow-hidden`.
  - Hàng: `w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors`.
  - Cụm icon trái: Hộp vuông tròn `w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-600`.
  - Mũi tên phải: `ChevronRight` dẫn đường.

---

### 🔹 Tier 5: Thẻ Trắc Nghiệm & Công Cụ Toán Học (`Subject Manipulatives`)

- **Mục đích**: Tùy chọn trắc nghiệm A/B/C/D trong Lesson, Slider điều khiển tham số, Nút chân trị Đúng/Sai.
- **Cấu trúc**:
  - Thẻ lựa chọn Quiz (MCQ): Khung hình học viền `border-2 border-slate-200 hover:border-indigo-300`, khi chọn đổi sang `border-2 border-indigo-600 bg-indigo-50/80`.
  - Nút Đúng / Sai: Sử dụng cặp `TactileButton` tương phản (Success vs Danger).

---

## 2. Bảng Màu Toán Học Chuẩn (Mathematical Palette Tokens)

| Token | Tên miền | Màu chính (Fill) | Màu cạnh đáy (Bevel 2.5D) | Màu nền nhẹ (Surface) | Ý nghĩa toán học |
|---|---|---|---|---|---|
| `--primary` | **Euler Indigo** | `#4F46E5` | `#3730A3` | `#EEF2FF` | Logic, cấu trúc lý thuyết, thao tác chính |
| `--cyan` | **Tangent Cyan** | `#0284C7` | `#0369A1` | `#F0F9FF` | Hàm số, tiếp tuyến, tham số động, chuyển động |
| `--emerald` | **Vector Emerald** | `#10B981` | `#047857` | `#ECFDF5` | Chân trị ĐÚNG, mục tiêu đạt, nghiệm tối ưu |
| `--amber` | **Kinetic Amber** | `#F59E0B` | `#B45309` | `#FFFBEB` | Phản ví dụ, cảnh báo mâu thuẫn, gợi ý (Hint) |
| `--destructive` | **Crimson Rose** | `#EF4444` | `#991B1B` | `#FEF2F2` | Chân trị SAI, miền loại trừ, điều kiện vi phạm |

---

## 3. Checklist Đánh Giá Đạt Chuẩn Impeccable

- [x] **Không Card-in-Card**: Gộp toàn bộ Scene và Control vào một không gian trực quan thống nhất.
- [x] **Đúng Cấp Độ Điều Khiển**: Nút cam kết dùng `TactileButton`, Tab chuyển đổi dùng `SegmentedControl`, Menu cài đặt dùng `ActionList`.
- [x] **Tuyệt Đối 0 Blur Shadows**: Không dùng `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` trên các card phẳng.
- [x] **Đồng Bộ Nút Liền Kề**: Nút icon đứng cạnh nút chữ phải đồng bộ chiều cao và viền đáy (`size="icon-sm"`).
- [x] **Phản Hồi Thời Gian Thực**: Trượt slider hay chạm card lập tức cập nhật đồ thị/chân trị SVG trong $\le 16\text{ms}$.
