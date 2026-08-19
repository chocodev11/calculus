# BẢN ĐỒ SƯ PHẠM KHÓA HỌC (COURSE MAP V2)
## Khóa học: Mệnh đề và Logic Toán 10 (Chương trình GDPT 2018)
### Tài liệu nguồn: `chuyen-de-menh-de-va-tap-hop-toan-10.pdf` (Bài 1. Mệnh đề)

---

## 1. Tổng quan Cấu trúc 7 Bài học

```text
Lesson 01: Mệnh đề và tính đúng – sai (S1, S2 | A01, A02)
Lesson 02: Mệnh đề chứa biến (S3, S4 | A03, A04, A05, A19)
Lesson 03: Phủ định mệnh đề (S6, S7, S8 | A08, A09, A10, A11)
Lesson 04: Mệnh đề kéo theo (S9, S10 | A12, A13)
Lesson 05: Mệnh đề đảo, tương đương, điều kiện cần – đủ (S11, S12, S13 | A14, A15, A16)
Lesson 06: “Với mọi”, “tồn tại” và mệnh đề nhiều biến (S4, S5, S14 | A06, A07, A17)
Lesson 07: Tổng hợp – tham số – phản ví dụ – vận dụng cao (S15, S16, S17, S18 | A18, A19, A20)
```

---

## 2. Chi tiết Sư phạm Từng Bài học

### Bài 01: Mệnh đề và tính đúng – sai
- **Mã bài học:** `01-menh-de-va-tinh-dung-sai`
- **Khái niệm cốt lõi:**
  - Định nghĩa mệnh đề: Câu khẳng định có đúng một giá trị chân lý (Đúng hoặc Sai).
  - Phân biệt câu không phải mệnh đề: Câu hỏi, câu cảm thán, câu mệnh lệnh, câu chứa biến tự do.
  - Phân biệt "chưa biết tính đúng sai" với "không có tính đúng sai".
- **Source PDF Anchors:** Lý thuyết mục 1, Dạng 1, Ví dụ 1.1, Ví dụ 1.3, C1–C11, C51, C52, C54, C55, C60, C61.
- **Tương tác Math Sandbox:**
  - `kind: math.sandbox`, `recipe: logic.proposition`, `mode: proposition_classifier`
  - Bảng phân loại 3 vùng (Classification Board): Mệnh đề đúng, Mệnh đề sai, Không phải mệnh đề.
- **Quan niệm sai nhắm tới:**
  - `M01` (`statement_vs_open_sentence`): Nhầm câu chứa biến là mệnh đề.
  - `M02` (`unknown_truth_vs_no_truth_value`): Nhầm câu chưa biết thông tin với câu không có chân trị.
- **Independent Check:**
  - Đánh giá 4 khẳng định đa dạng (Số học, Hình học, Địa lý, Phương trình).
- **Transfer Task:**
  - Tự xây dựng hoặc phân biệt một mệnh đề đúng, một mệnh đề sai và một câu không phải mệnh đề trong ngữ cảnh thực tế.

---

### Bài 02: Mệnh đề chứa biến
- **Mã bài học:** `02-menh-de-chua-bien`
- **Khái niệm cốt lõi:**
  - Vị từ $P(x)$ trên miền xác định $X$.
  - Quá trình gán giá trị biến $x = a \in X$ để thu được mệnh đề cụ thể $P(a)$.
  - Tìm nhân chứng làm cho mệnh đề chứa biến nhận giá trị đúng hoặc sai.
- **Source PDF Anchors:** Lý thuyết mục 2, Dạng 2, Ví dụ 2.1–2.4, C14, C43, C53, C58, C65.
- **Tương tác Math Sandbox:**
  - `mode: variable_playground` & `mode: witness_evaluator`
  - Thế các giá trị $x \in \{-1, 0, 1/3, 1, 2\}$ vào $x > x^3$ hoặc $x^2-x-2=0$ và quan sát chân trị tức thời.
- **Quan niệm sai nhắm tới:**
  - `M01`: Coi $P(x)$ có chân trị cố định trước khi gán $x$.
  - `M12` (`witness_outside_domain`): Chọn giá trị nhân chứng nằm ngoài tập xác định $\mathbb{N}, \mathbb{Z}, \mathbb{Q}, \mathbb{R}$.
- **Independent Check:**
  - Kiểm tra tính đúng/sai của $P(a)$ theo C53, C58 với các giá trị nguyên và phân số.
- **Transfer Task:**
  - Đếm số giá trị tự nhiên $x \in \mathbb{N}$ thỏa mãn phương trình vị từ $x^2-1=0$ (theo C65).

---

### Bài 03: Phủ định mệnh đề
- **Mã bài học:** `03-phu-dinh-menh-de`
- **Khái niệm cốt lõi:**
  - Ký hiệu và ý nghĩa của mệnh đề phủ định $\overline{P}$: $\overline{P}$ đúng khi $P$ sai, $\overline{P}$ sai khi $P$ đúng.
  - Quy tắc phủ định quan hệ: $= \leftrightarrow \neq, > \leftrightarrow \le, < \leftrightarrow \ge, \ge \leftrightarrow <, \le \leftrightarrow >$.
  - Quy tắc De Morgan cho lượng từ: $\overline{\forall x \in X, P(x)} \equiv \exists x \in X, \overline{P(x)}$ và $\overline{\exists x \in X, P(x)} \equiv \forall x \in X, \overline{P(x)}$.
  - Phủ định trạng thái phương trình: "vô nghiệm" $\leftrightarrow$ "có nghiệm".
- **Source PDF Anchors:** Lý thuyết mục 3, Dạng 3, Ví dụ 3.1–3.3, C22–C37, C44–C46, C51.
- **Tương tác Math Sandbox:**
  - `mode: quantifier_negation` (Negation Builder)
  - Biến đổi từng token logic: đảo lượng từ $(\forall \leftrightarrow \exists)$ và đảo quan hệ $(\le, >, =, \neq)$ với phản hồi từng bước.
- **Quan niệm sai nhắm tới:**
  - `M06` (`negate_quantifier_only`): Chỉ đổi lượng từ mà quên phủ định mệnh đề phía sau.
  - `M07` (`negate_relation_strictness`): Phủ định $>$ thành $<$ (quên dấu bằng $\le$).
  - `M08` (`negate_all_as_all_not`): Phủ định "Mọi..." thành "Mọi... không" thay vì "Có ít nhất một... không".
- **Independent Check:**
  - Phủ định 4 câu hỏi đại diện biểu thức đại số, số học và ngôn ngữ tự nhiên.
- **Transfer Task:**
  - Phủ định mệnh đề định lý hình học và mệnh đề số học có điều kiện chẵn/lẻ.

---

### Bài 04: Mệnh đề kéo theo
- **Mã bài học:** `04-menh-de-keo-theo`
- **Khái niệm cốt lõi:**
  - Cấu trúc mệnh đề kéo theo $P \Rightarrow Q$ ("Nếu $P$ thì $Q$").
  - Tính chân lý: $P \Rightarrow Q$ chỉ sai trong trường hợp duy nhất là $P$ đúng nhưng $Q$ sai.
  - Khái niệm định lý toán học: Khi mệnh đề kéo theo $P \Rightarrow Q$ là mệnh đề đúng.
  - Kỹ thuật xây dựng phản ví dụ: Tìm một đối tượng thỏa mãn $P$ nhưng vi phạm $Q$.
- **Source PDF Anchors:** Lý thuyết mục 4, Ví dụ 1.4, C16, C18, C21, C40, C41, C64.
- **Tương tác Math Sandbox:**
  - `mode: implication` (Implication Inspector & Venn Model)
  - Biểu diễn quan hệ tập nghiệm $P \subset Q$, quan sát vùng phản ví dụ $Q \setminus P$ trên miền số tự nhiên $\mathbb{N}^*$.
- **Quan niệm sai nhắm tới:**
  - `M03` (`testing_examples_is_proof`): Nghĩ rằng vài ví dụ thỏa mãn là đủ để kết luận $P \Rightarrow Q$ đúng.
  - `M09` (`implication_equals_converse`): Nhầm $P \Rightarrow Q$ với $Q \Rightarrow P$.
- **Independent Check:**
  - Đánh giá tính đúng/sai của các mệnh đề kéo theo số học và hình học theo C16, C18, C21, C64.
- **Transfer Task:**
  - Tìm phản ví dụ cụ thể cho khẳng định $x > -3 \Rightarrow x^2 > 9$ (chọn $x = -2$ hoặc $x = 0$).

---

### Bài 05: Mệnh đề đảo, tương đương, điều kiện cần – đủ
- **Mã bài học:** `05-dao-tuong-duong-dieu-kien-can-du`
- **Khái niệm cốt lõi:**
  - Mệnh đề đảo $Q \Rightarrow P$ của $P \Rightarrow Q$.
  - Mệnh đề tương đương $P \Leftrightarrow Q$: Đúng khi và chỉ khi cả 2 chiều $P \Rightarrow Q$ và $Q \Rightarrow P$ đều đúng.
  - Thuật ngữ "Điều kiện cần", "Điều kiện đủ": Trong $P \Rightarrow Q$, $P$ là điều kiện đủ để có $Q$, $Q$ là điều kiện cần để có $P$.
- **Source PDF Anchors:** Lý thuyết mục 5, C12, C19, C38, C39.
- **Tương tác Math Sandbox:**
  - `mode: direction_graph`
  - Khảo sát độc lập chiều đi $P \to Q$ và chiều về $Q \to P$, gắn nhãn điều kiện cần / điều kiện đủ.
- **Quan niệm sai nhắm tới:**
  - `M10` (`necessary_sufficient_reversed`): Đảo lộn vai trò giữa điều kiện cần và điều kiện đủ.
  - `M11` (`equivalence_from_one_direction`): Kết luận tương đương $P \Leftrightarrow Q$ khi mới chỉ kiểm tra 1 chiều.
- **Independent Check:**
  - Nhận diện đúng/sai về định lý tam giác bằng nhau và diện tích bằng nhau theo C38, C39.
- **Transfer Task:**
  - Dịch các định lý hình học sang cách phát biểu bằng thuật ngữ "khi và chỉ khi" hoặc "điều kiện cần và đủ".

---

### Bài 06: “Với mọi”, “tồn tại” và mệnh đề nhiều biến
- **Mã bài học:** `06-voi-moi-ton-tai-va-nhieu-bien`
- **Khái niệm cốt lõi:**
  - Ký hiệu $\forall$ (với mọi) và $\exists$ (tồn tại).
  - Chứng minh mệnh đề $\forall$ (phải đúng với mọi phần tử trong miền) vs Bác bỏ mệnh đề $\forall$ (chỉ cần 1 phản ví dụ).
  - Chứng minh mệnh đề $\exists$ (chỉ cần 1 nhân chứng) vs Bác bỏ mệnh đề $\exists$ (phải chứng minh không có phần tử nào thỏa mãn).
  - Mở rộng mệnh đề lượng từ 2 biến: $\forall x \forall y, \exists x \exists y, \exists x \forall y, \forall a \exists b$.
- **Source PDF Anchors:** Lý thuyết mục 6, Ví dụ 2.4, C15, C20, C42, C47–C50, C56, C57, C59, C62, C63.
- **Tương tác Math Sandbox:**
  - `mode: quantifier_arena` & `mode: multi_variable_explorer`
  - Khảo sát các mệnh đề 2 biến $\forall x \forall y: x+y=1$ (bác bỏ bằng phản ví dụ) và $\exists x \forall y: y=xy$ (chứng minh bằng nhân chứng $x=1$).
- **Quan niệm sai nhắm tới:**
  - `M04` (`universal_needs_all`): Quên rằng 1 phản ví dụ là đủ bác bỏ $\forall$.
  - `M05` (`existential_needs_one`): Nghĩ rằng $\exists$ đòi hỏi phải đúng cho toàn bộ tập hợp.
  - `M15` (`multiple_quantifier_scope_confusion`): Nhầm lẫn thứ tự và phạm vi tác dụng của 2 lượng từ.
- **Independent Check:**
  - Đánh giá tính đúng/sai của hệ mệnh đề lượng từ đa biến theo C59, C62, C63.
- **Transfer Task:**
  - Phân tích sự phụ thuộc của tính đúng sai vào tập hợp miền biến ($\mathbb{N}$ vs $\mathbb{Z}$ vs $\mathbb{R}$).

---

### Bài 07: Tổng hợp – tham số – phản ví dụ – vận dụng cao
- **Mã bài học:** `07-tong-hop-tham-so-phan-vi-du-vdc`
- **Khái niệm cốt lõi:**
  - Bài toán mệnh đề chứa tham số: Tìm điều kiện của tham số để mệnh đề phổ dụng $\forall x \in \mathbb{R}, f(x, a) > 0$ đúng.
  - Đếm số lượng giá trị biến nguyên thỏa mãn mệnh đề điều kiện trong khoảng cho trước.
  - Hệ vị từ phối hợp đồng thời: Giải quyết bài toán hợp nhất $P(x,y) \wedge Q(x,y) \wedge R(x)$.
- **Source PDF Anchors:** C13, C65, C66, C67, C68, C69, C70.
- **Tương tác Math Sandbox:**
  - `mode: parameter_implication` & `mode: composite_predicate_solver`
  - Trục số tham số nghiệm $S = \{1, m\}$ và phân tích tam thức bậc hai $x^2-2+a > 0$ với đỉnh $I(0, a-2)$.
- **Quan niệm sai nhắm tới:**
  - `M13` (`ignores_domain_when_counting`): Đếm sót điều kiện miền $\mathbb{Z}, \mathbb{N}$ hoặc khoảng giới hạn.
  - `M14` (`parameter_checked_only_samples`): Chỉ thử 1 vài giá trị rời rạc mà không tìm điều kiện tổng quát.
- **Independent Check:**
  - Đếm số giá trị nguyên $a < 10$ để $\forall x \in \mathbb{R}, x^2-2+a > 0$ là mệnh đề đúng (theo C68).
- **Capstone Challenge:**
  - Tìm số cặp số thực/nguyên $(x, y)$ để đồng thời thỏa mãn 3 vị từ $P(x,y), Q(x,y), R(x)$ theo C70.
