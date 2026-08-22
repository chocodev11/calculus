---
target: màn hình hoàn tất bài học trong Step.jsx
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-22T03-03-43Z
slug: frontend-src-pages-step-jsx
---
# Critique: CompleteScreen

## Design Health Score

| # | Heuristic | Score | Vấn đề chính |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Màn hình báo hoàn tất trước khi kết quả được lưu bền vững |
| 2 | Match System / Real World | 3/4 | Copy quen thuộc nhưng “Sẵn sàng ghi nhận” còn mơ hồ |
| 3 | User Control and Freedom | 2/4 | Chỉ có một đường thoát; không nói rõ quay lại đâu |
| 4 | Consistency and Standards | 3/4 | Màu và CTA đúng hệ tactile, nhưng nền tối là một departure lớn |
| 5 | Error Prevention | 2/4 | Có disable khi submit nhưng kết quả có thể chưa được ghi nhận |
| 6 | Recognition Rather Than Recall | 3/4 | XP và CTA dễ nhận biết; đích đến tiếp theo chưa rõ |
| 7 | Flexibility and Efficiency | 2/4 | Một flow cố định, chưa có lựa chọn nhanh khác |
| 8 | Aesthetic and Minimalist Design | 3/4 | Gọn, nhưng lặp thông điệp và khoảng nền tối làm giảm độ chính xác thị giác |
| 9 | Error Recovery | 3/4 | Có retry inline, nhưng trạng thái lỗi vẫn mang màu thành công |
| 10 | Help and Documentation | 1/4 | Không giải thích XP, trạng thái lưu, hoặc hành động tiếp theo |
| **Tổng** |  | **24/40** | **Happy path dùng được; cần chỉnh trust, specificity và consistency** |

## Design Specificity Verdict

Kết luận: cảm giác “lạc quẻ” là có cơ sở. Màn hình không sai về chức năng và đã dùng đúng một phần Calculus Kinetic: Euler Indigo, Kinetic Amber cho XP, Vector Emerald cho success, typography đậm và CTA có tactile press. Nhưng cấu trúc indigo/white + XP + nút tiếp tục có thể thuộc về gần như mọi app quiz hoặc app học ngoại ngữ.

Nó chưa nói lên người học vừa nắm được ý niệm toán nào, đang ở đâu trong khóa học, bài tiếp theo là gì, hay thành tựu nào vừa mở khóa. Vì vậy nó giống một completion template đặt vào Calculus hơn là một cột mốc học toán được thiết kế riêng.

Detector chạy trên `frontend/src/pages/Step.jsx` trả về `[]`, exit 0, không có rule hoặc vị trí lỗi. Đây là tín hiệu tốt cho các lỗi pattern tĩnh, nhưng không phủ định vấn đề định hướng thương hiệu, hierarchy, rendered contrast hay responsive behavior. Detector cũng không quét overlay cấp app.

Screenshot còn có nút `>_` ở góc phải dưới. Source xác nhận đó là `DevTerminal` (`frontend/src/App.jsx:17,53`, `frontend/src/components/DevTerminal.jsx:107-117`), được bật khi `VITE_DEV_TERMINAL=true`. Nếu nút này xuất hiện trong learner/production capture thì đây là nguồn “lạc quẻ” rõ nhất; nó dùng visual language của terminal/Catppuccin, hoàn toàn khác Calculus Kinetic. Nếu chỉ bật trong local development thì loại nó khỏi đánh giá sản phẩm và khỏi screenshot QA.

Browser visualization không thực hiện được vì session không có browser automation, Chromium, Playwright hoặc Puppeteer. Nhận định về animation, focus runtime, screen reader announcement, contrast thực tế và mobile layout dựa trên source cùng screenshot người dùng cung cấp.

## Overall Impression

Màn hình rõ, sạch và có một điểm nhìn mạnh ở desktop: check → tiêu đề → XP → CTA. Nhưng nó đang kết thúc bài học như một giao dịch gamification chung chung, trong khi Calculus cần kết thúc bằng cảm giác “mình vừa hiểu thêm một ý niệm”. Nền `slate-950` trống lớn, block indigo phẳng và nút terminal làm route này giống một overlay/debug state hơn là phần tiếp nối tự nhiên của web nền sáng, card viền mảnh và math-grid.

## What's Working

- Hierarchy rất dễ quét; người học chỉ phải đưa ra một quyết định và cognitive-load checklist có 0/8 lỗi.
- `+195 XP` là điểm nhấn cảm xúc rõ; màu amber đúng vai trò reward và không cạnh tranh với CTA indigo.
- CTA dùng lại `TactileButton`, có min-height 48px và press depth đúng hệ 2.5D; error path giữ lại màn hình và có retry.

## Priority Issues

### [P1] Visual world chưa thuộc về Calculus

**Vì sao quan trọng:** Nền tối bao quanh một completion card generic, không có dấu hiệu toán học hoặc continuity với web. Nút `>_` càng làm impression bị kéo về developer tool nếu nó có mặt trong learner surface.

**Nên sửa:** Giữ celebration tập trung nhưng thay “template completion” bằng một proof point rất Calculus: concept vừa hoàn tất, tiến độ chapter, hoặc một nét math-grid/tangent motif nhẹ. Giữ indigo/amber/emerald và tactile CTA; bỏ dev terminal khỏi learner/production capture.

**Suggested command:** `$impeccable shape` rồi `$impeccable polish`.

### [P1] “Hoàn thành” trước khi kết quả được lưu

**Vì sao quan trọng:** `handleComplete` hiển thị celebration, tính XP, phát âm thanh và confetti ở `Step.jsx:289-297`; API ghi nhận chỉ chạy sau CTA ở `Step.jsx:299-327`. Người học có thể tưởng đã hoàn tất nhưng đóng tab trước khi lưu.

**Nên sửa:** Hoặc post kết quả trước rồi mới mở celebration, hoặc đổi semantics thành “Sẵn sàng lưu kết quả” và chỉ dùng “Bài học đã hoàn tất” sau khi server xác nhận.

**Suggested command:** `$impeccable clarify`.

### [P1] CTA không nói đúng nơi sẽ đến

**Vì sao quan trọng:** “Tiếp tục học” ở `Step.jsx:1543-1546` nghe như mở bài kế tiếp, nhưng `doNavigateNext()` ở `Step.jsx:340-343` đưa người học về course overview; nếu có achievement thì còn đi qua màn hình thành tựu trước.

**Nên sửa:** Hiển thị bài kế tiếp và dùng “Học bài tiếp theo”, hoặc đổi thành “Lưu và về khóa học”. Đừng để label hứa một destination khác với route thực tế.

**Suggested command:** `$impeccable clarify`.

### [P1] Error state tự mâu thuẫn và thiếu runtime accessibility contract

**Vì sao quan trọng:** Khi có lỗi, copy đổi thành “Chưa ghi nhận kết quả” nhưng icon/check và màu emerald vẫn giữ nguyên ở `Step.jsx:1530-1533`. `section` có `aria-labelledby` nhưng chưa có focus management hoặc live announcement cho submitting/error. Nếu xem đây là route-level screen, nên focus heading và announce status; nếu xem là modal, cần dialog semantics đầy đủ.

**Nên sửa:** Error state dùng icon/màu error riêng, copy plain-language và retry; thêm `role="status"`/`role="alert"` phù hợp, focus heading sau transition và hỗ trợ reduced motion.

**Suggested command:** `$impeccable harden`.

### [P2] Reward chưa chứng minh việc học

**Vì sao quan trọng:** `+195 XP` cho biết phần thưởng nhưng không cho biết thành quả toán học; nó khiến peak cảm xúc generic.

**Nên sửa:** Thêm đúng một dòng nhỏ như “Đã hoàn tất: Mệnh đề và tính đúng sai” kèm `2/6 bài trong chương` hoặc “Mở khóa bài tiếp theo”. Giữ một CTA duy nhất, không tạo thêm decision tree.

**Suggested command:** `$impeccable delight`.

## Persona Red Flags

- **Jordan, first-timer:** “Sẵn sàng ghi nhận” khiến họ không chắc bài đã lưu chưa; “Tiếp tục học” không nói course overview hay bài kế tiếp; XP không có ngữ cảnh.
- **Sam, accessibility-dependent:** Focus ring global có tồn tại, nhưng trạng thái hoàn tất/submitting/error không được announce rõ; success/error vẫn phụ thuộc nhiều vào màu và icon.
- **Casey, mobile user:** CTA đủ lớn và layout có stack, nhưng action vẫn nằm giữa màn hình thay vì ưu tiên vùng ngón cái; safe-area và resume sau gián đoạn chưa được xác minh.

## Minor Observations

- `stepTitle` không có fallback, nên subtitle có thể trống.
- `+195 XP` chưa có breakdown dù XP đến từ base reward, quiz và có thể boost.
- “Bài học đã hoàn tất” và “Hoàn thành!” lặp cùng một thông điệp; có thể dùng một dòng cho trạng thái và dành headline cho thành quả học.
- Detector không phát hiện lỗi trên target, nhưng không kiểm tra được animation, audio, confetti, actual contrast hoặc app-level `DevTerminal`.
