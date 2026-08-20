# 🎨 Calculus Content Studio & Preview Guide

Tài liệu hướng dẫn sử dụng và phát triển nội dung toán học với **Calculus Studio** (Môi trường Content-as-Code & Xem trước Trực tiếp).

---

## 1. Giới thiệu Calculus Studio (`/studio`)

**Calculus Studio** là môi trường phát triển và kiểm thử nội dung thống nhất (hợp nhất từ hệ thống *Preview Lab* và *Content Studio* trước đây). Studio cho phép tác giả khóa học:
1. **Xem trước thời gian thực (Live Vite HMR)**: Soạn thảo bài học MDX hoặc cấu hình Sandbox JSON và xem kết quả cập nhật ngay lập tức mà không cần tải lại trang hay đồng bộ database.
2. **Kiểm thử đa thiết bị (Device Viewport Emulation)**:
   - 🖥️ **Desktop Fluid (100%)**: Giao diện toàn màn hình tiêu chuẩn.
   - 📱 **iPhone 15 (393 × 852)**: Kiểm thử trải nghiệm mobile hiện đại.
   - 📱 **iPhone SE (375 × 667)**: Kiểm thử màn hình nhỏ và giới hạn chiều cao.
   - 📟 **iPad Mini (768 × 1024)**: Kiểm thử tablet.
   - 🔄 **Xoay màn hình (Portrait / Landscape)**: Đảm bảo các mô hình toán học và đồ thị co giãn chuẩn xác.
3. **Kiểm thử Tương tác Sandbox**: Trực tiếp thao tác kéo thả (Drag & Drop), thanh trượt tham số (Sliders), và kiểm tra phản hồi sư phạm tự động.

---

## 2. Cách truy cập Studio

### Truy cập nhanh qua URL:
- Trang chủ Studio: [http://localhost:3000/studio](http://localhost:3000/studio)
- Bài học cụ thể: `http://localhost:3000/studio/:courseSlug/:stepId`
  - Ví dụ Bài 1 Mệnh đề: `http://localhost:3000/studio/menh-de/01-menh-de-va-tinh-dung-sai`
  - Ví dụ Bài 1 Đạo hàm: `http://localhost:3000/studio/dao-ham/01-y-nghia-hinh-hoc`

> [!NOTE]
> Đường dẫn cũ `/preview` và `/preview/:courseSlug/:stepId` đã được tự động chuyển hướng (redirect) về `/studio`.

---

## 3. Cấu trúc bài học Content-as-Code (MDX)

Mỗi bài học được lưu dưới dạng file `.mdx` trong thư mục:
`frontend/src/content/courses/<course-slug>/<step-id>.mdx`

### 3.1. Frontmatter bắt buộc
```yaml
---
id: '01-menh-de-va-tinh-dung-sai'
title: 'Mệnh đề và tính đúng sai'
description: 'Nhận diện câu là mệnh đề logic, phân biệt câu hỏi/cảm thán và đánh giá tính đúng sai theo chuẩn GDPT 2018.'
courseSlug: 'menh-de'
chapterSlug: 'menh-de'
order: 0
xp: 120
---
```

### 3.2. Các khối thành phần chính
1. **Khối Slide**:
   ```mdx
   <Slide title="Tiêu đề Slide">
     Nội dung giải thích, định lý và công thức LaTeX ($x^2 + y^2 = 1$).
   </Slide>
   ```

2. **Khối Hộp ghi nhớ (Callout)**:
   ```mdx
   <Callout variant="theorem" title="Định lý / Khái niệm">
     Nội dung quan trọng...
   </Callout>
   ```
   *(Các biến thể hỗ trợ: `theorem`, `tip`, `warning`, `info`)*

3. **Khối Phòng thí nghiệm Toán học (Sandbox)**:
   ```mdx
   <Slide title="Thực hành Phân loại">
     <Sandbox manifest={{
       "archetypeId": "logic.proposition",
       "config": {
         "mode": "proposition_classifier",
         "activity": {
           "items": [ ... ]
         }
       }
     }} />
   </Slide>
   ```

4. **Khối Câu hỏi Trắc nghiệm (Quiz Pool)**:
   ```json
   ```json
   {
     "id": "b4_quiz_pool",
     "block_type": "assessment_pool",
     "content": { ... }
   }
   ```
   ```

---

## 4. Quy chuẩn Thiết kế UI (/less-is-more-ui & /calculus-ui-system)

Khi tạo mới hoặc cập nhật các tương tác trong Studio, tác giả cần tuân thủ các nguyên tắc:
- **Tối giản & Trọng tâm (Less is More)**: Tránh lồng quá nhiều khung viền (Anti-Nesting), tránh các nút bấm trùng lặp.
- **Kích thước gọn gàng**: Chiều cao của Sandbox trên desktop nên duy trì trong khoảng **420px – 480px** để vừa vặn trong màn hình mà không cần cuộn trang liên tục.
- **Bóng cứng 2.5D**: Dùng bóng cứng không mờ (`0 2px 0 ...` hoặc `0 4px 0 ...`) cho các thẻ tương tác và nút bấm xúc giác.
- **Phản hồi sư phạm tức thì**: Mỗi tương tác cần cung cấp giải thích toán học cụ thể thay vì các mã lỗi máy móc chung chung.

---

## 5. Quy trình Kiểm thử & Phát hành
1. Chạy frontend: `npm run dev` (hoặc `just host`).
2. Mở `/studio` và chọn khóa học đang biên soạn.
3. Chuyển đổi qua lại giữa **Desktop Fluid** và **iPhone 15** để kiểm tra layout.
4. Chạy kiểm thử tự động: `npm test` trong thư mục `frontend`.
5. Kiểm tra build hoàn thiện: `npm run build`.
