# CALCULUS COURSE SPEC V2
# Mệnh đề và Logic Toán 10
## Source-Driven Interactive Learning Architecture

> **Status:** Implementation specification  
> **Audience:** coding agent, content agent, curriculum agent, reviewer  
> **Primary rule:** **PDF nguồn là source of truth cho nội dung toán học và hệ bài tập. Interaction design chỉ quyết định cách học, không tự thay syllabus.**

---

# 0. MỤC ĐÍCH

Tái thiết kế toàn bộ course **`Mệnh đề và Logic Toán 10`** theo hướng interactive-first, nhưng phải bám sát tài liệu nguồn:

```text
chuyen-de-menh-de-va-tap-hop-toan-10.pdf
```

Phạm vi core của spec này là **Bài 1. MỆNH ĐỀ** trong PDF.

Course mới phải đạt đồng thời hai mục tiêu:

```text
CONTENT FIDELITY
+
INTERACTIVE DEPTH
```

Không được hy sinh một vế để lấy vế còn lại.

---

# 1. HỆ THỐNG ƯU TIÊN / AUTHORITY ORDER

Khi có xung đột, agent phải dùng thứ tự ưu tiên sau:

```text
1. Yêu cầu trực tiếp của user trong spec này
2. PDF source of truth
3. Existing repo architecture / technical constraints
4. Pedagogy / interaction patterns
5. Agent preference
```

Agent **không được** dùng kiến thức ngoài để âm thầm sửa, mở rộng hoặc thay thế nội dung PDF.

Nếu PDF có điểm:

- mơ hồ;
- có vẻ sai;
- lỗi ký hiệu;
- OCR không rõ;
- wording không nhất quán;

agent phải:

```text
FLAG
→ giữ nguyên source mapping
→ ghi issue
→ không tự sửa âm thầm
```

---

# 2. SOURCE OF TRUTH CONTRACT

## 2.1. WHAT vs HOW

Quy tắc nền tảng:

```text
PDF quyết định WHAT.
Calculus quyết định HOW.
```

PDF quyết định:

- phạm vi kiến thức;
- thuật ngữ;
- thứ tự khái niệm;
- dạng bài;
- mức độ khó;
- kiểu reasoning cần có;
- loại assessment;
- canonical examples;
- exercise archetypes.

Calculus được quyền quyết định:

- visualization;
- manipulation;
- feedback;
- hints;
- sequencing vi mô;
- adaptive routing;
- interaction type;
- mastery logic;
- review scheduling;
- mobile UX.

---

## 2.2. Core source scope

Theo PDF, **Bài 1. MỆNH ĐỀ** gồm:

### Lý thuyết

```text
1. Mệnh đề
2. Mệnh đề chứa biến
3. Phủ định của một mệnh đề
4. Mệnh đề kéo theo
5. Mệnh đề đảo – Hai mệnh đề tương đương
6. Kí hiệu “với mọi” và “tồn tại”
```

### Các dạng bài tập

```text
Dạng 1. Mệnh đề và tính đúng sai của mệnh đề
Dạng 2. Mệnh đề chứa biến
Dạng 3. Phủ định mệnh đề
```

### Luyện tập

```text
Câu 1–50: Trắc nghiệm
Câu 51–64: Đúng / Sai
Câu 65–70: Trả lời ngắn
```

**Toàn bộ Câu 1–70 là coverage target của course.**

---

# 3. NON-NEGOTIABLE SOURCE COVERAGE

Course được coi là đạt source fidelity khi:

- [ ] 100% 6 mục lý thuyết của PDF được dạy.
- [ ] 100% 3 dạng bài chính được cover.
- [ ] 100% exercise archetypes xuất hiện trong Câu 1–70 được map sang skill.
- [ ] Mỗi Câu 1–70 có `sourceMapping` tới ít nhất một skill hoặc activity pool.
- [ ] Không có core skill nào không truy được về PDF.
- [ ] Không có core assessment nào đòi kiến thức ngoài PDF.
- [ ] Các nội dung ngoài PDF phải gắn nhãn `enrichment`.
- [ ] Truth table formalism không được coi là core nếu source không yêu cầu.
- [ ] Course sau khi hoàn thành phải giúp learner giải được gần như toàn bộ Câu 1–70 bằng reasoning độc lập.

Target:

```text
>= 95% source exercise-archetype coverage
```

Không dùng số lượng screen để thay thế coverage.

---

# 4. SOURCE TRACEABILITY BẮT BUỘC

Mọi activity core phải có metadata:

```json
{
  "sourceMapping": {
    "document": "chuyen-de-menh-de-va-tap-hop-toan-10.pdf",
    "sha256": "6f41eaf9891d0d35cf567a9b1503e5f5c26376d24406c8b687d83ac7bb4d58f3",
    "section": "Bài 1. Mệnh đề",
    "sourcePages": [7, 8],
    "sourceQuestionIds": ["C53", "C58"],
    "sourceArchetypeIds": ["VAR_SUBSTITUTION", "QUANTIFIED_TRUTH"]
  }
}
```

Nếu activity là bài mới nhưng chỉ là biến thể của source:

```json
{
  "sourceMapping": {
    "derivation": "variant",
    "derivedFromQuestionIds": ["C29", "C31"]
  }
}
```

Nếu ngoài source:

```json
{
  "contentTier": "enrichment"
}
```

Agent không được để một activity core không có source mapping.

---

# 5. COURSE ARCHITECTURE V2

Không dùng kiến trúc 7 lab cũ theo kiểu tự mở rộng syllabus.

Dùng 7 lesson sau, **bám đúng logic của source**:

```text
01. Mệnh đề và tính đúng – sai
02. Mệnh đề chứa biến
03. Phủ định mệnh đề
04. Mệnh đề kéo theo
05. Mệnh đề đảo, tương đương, điều kiện cần – đủ
06. “Với mọi”, “tồn tại” và mệnh đề nhiều biến
07. Tổng hợp – tham số – phản ví dụ – vận dụng cao
```

Mỗi lesson có thể có số screen khác nhau.

**Không có minimum screen count.**

Stop lesson khi learner đã:

```text
understand
→ practice
→ demonstrate independently
→ transfer
```

---

# 6. LEARNING FLOW V2

Không ép mọi lesson theo đúng một template cố định.

Dùng các building block sau:

```text
ACTIVATE
EXPLORE
FORMALIZE
GUIDED PRACTICE
INDEPENDENT CHECK
TRANSFER
MIXED REVIEW
```

Không bắt buộc lesson nào cũng dùng đủ 7 block.

Nhưng mỗi concept core phải có tối thiểu:

```text
1 intellectual need
1 meaningful learner action
1 feedback loop
1 independent check
```

---

# 7. CONCEPT BUILDER VS MASTERY CHECK

Mỗi lesson chia thành hai mode rõ ràng.

## A. Concept Builder

Mục tiêu:

- xây intuition;
- cho phép thử;
- cho feedback;
- dùng hint;
- có manipulation;
- sửa misconception.

Concept Builder **không dùng để kết luận mastery**.

---

## B. Mastery Check

Mục tiêu:

- learner giải độc lập;
- không reveal strategy;
- không có feedback từng bước trước khi submit;
- hạn chế hint;
- dùng surface context mới;
- kiểm tra đúng skill.

Mastery Check phải tách biệt về UX và analytics.

---

# 8. MASTERY MODEL V2

Skill graph tối thiểu:

```text
S1  proposition_identification
S2  proposition_truth_value
S3  variable_proposition_substitution
S4  quantified_statement_reading
S5  quantified_statement_truth
S6  plain_negation
S7  relation_negation
S8  quantifier_negation
S9  implication_truth
S10 implication_counterexample
S11 converse_reasoning
S12 equivalence_reasoning
S13 necessary_sufficient_translation
S14 multi_variable_quantifier_reasoning
S15 parameterized_universal_reasoning
S16 count_values_satisfying_statement
S17 mixed_predicate_reasoning
S18 proof_or_counterexample_selection
```

Mỗi skill có trạng thái:

```text
unseen
introduced
developing
independent
mastered
needs_review
```

---

# 9. MASTERY EVIDENCE

Không dùng:

```text
score >= 80%
```

làm mastery duy nhất.

Ví dụ:

```json
{
  "skillId": "S10",
  "evidence": {
    "independentCorrect": 2,
    "transferCorrect": 1,
    "hintLevelUsed": 0,
    "misconceptionTriggered": false
  }
}
```

Mastery mạnh khi learner:

```text
correct
+ independent
+ transfer
```

---

# 10. HINT IMPACT

Hint phải ảnh hưởng evidence.

Ví dụ:

```text
No hint      = full evidence
Hint 1       = 0.8 evidence
Hint 2       = 0.5 evidence
Hint 3       = guided completion, NOT mastery
```

Agent có thể dùng weight khác nếu architecture yêu cầu, nhưng semantics phải giữ.

---

# 11. ADAPTIVE ROUTING

Sau Independent Check:

```text
MASTERED
→ lesson tiếp theo / mixed review

PARTIAL
→ targeted remediation

MISCONCEPTION
→ misconception-specific activity

FAILED AFTER HINTS
→ worked example
→ faded retry
```

Không bắt learner học lại cả lesson nếu chỉ sai một skill.

---

# 12. SPACED + MIXED REVIEW

Course không được là chuỗi lesson độc lập.

Phải có:

```text
Review A: sau Lesson 03
Review B: sau Lesson 05
Review C: sau Lesson 06
Final Mixed Mastery: sau Lesson 07
Delayed Review: nếu platform support revisit
```

Review phải trộn skill.

Ví dụ:

```text
Một câu nhìn giống bài lượng từ
nhưng thực chất cần nhận ra phản ví dụ cho implication.
```

Không hiển thị label:

```text
“Đây là bài phủ định”
```

trong mastery review.

---

# 13. EXERCISE ARCHETYPE REGISTRY

Agent phải tạo registry trước khi viết course JSON.

Tối thiểu gồm các archetype sau.

---

## A01 — PROPOSITION CLASSIFICATION

Source behavior:

- câu khẳng định;
- câu hỏi;
- mệnh lệnh;
- cảm thán;
- open sentence.

Learner phải phân loại:

```text
mệnh đề đúng
mệnh đề sai
không phải mệnh đề
```

Source examples xuất hiện dày ở:

```text
C1–C11
Dạng 1
Ví dụ 1.1
Ví dụ 1.3
```

---

## A02 — TRUTH VALUE

Cho một phát biểu cụ thể.

Learner xác định:

```text
Đúng / Sai
```

Có thể thuộc:

- số học;
- hình học;
- kiến thức đời sống;
- phương trình;
- số nguyên tố;
- chia hết.

Source:

```text
C12–C21
C47–C54
C60–C61
```

---

## A03 — VARIABLE SUBSTITUTION

Cho:

```text
P(x)
```

rồi thay:

```text
x = a
```

Learner phải đánh giá `P(a)`.

Source:

```text
Ví dụ mệnh đề chứa biến
Ví dụ 2.1
Ví dụ 2.2
C53
C58
```

---

## A04 — FIND TRUE/FALSE WITNESS FOR OPEN SENTENCE

Yêu cầu:

```text
tìm một giá trị làm P(x) đúng
tìm một giá trị làm P(x) sai
```

Source:

```text
Ví dụ 2.3
```

Interaction phải cho learner nhập witness thực.

---

## A05 — TRANSLATE NATURAL LANGUAGE TO ∀ / ∃

Ví dụ source:

```text
Tích của ba số tự nhiên liên tiếp chia hết cho sáu.
Với mọi số thực, bình phương của nó là số không âm.
Có một số nguyên mà bình phương của nó bằng chính nó.
```

Learner xây biểu thức bằng structured token builder.

Source:

```text
Ví dụ 2.4
```

---

## A06 — READ ∀ / ∃

Cho symbolic statement.

Learner chuyển thành nghĩa bằng lời.

Source:

```text
C42
C43
```

Không chỉ multiple choice trong Concept Builder.

---

## A07 — QUANTIFIED TRUTH

Cho:

```text
∀x ...
∃x ...
```

Learner phải đánh giá đúng/sai.

Source:

```text
C15
C20
C47–C50
C56–C59
C62–C63
```

---

## A08 — PLAIN NEGATION

Phủ định câu thường:

```text
P → không P
```

Learner phải phân biệt:

```text
negation
vs
statement unrelated to P
```

Source:

```text
Ví dụ 3.1
C25
C30
C51
```

---

## A09 — RELATION NEGATION

Phải support:

```text
= ↔ ≠
> ↔ ≤
< ↔ ≥
≥ ↔ <
≤ ↔ >
```

Source method explicitly yêu cầu pattern này.

---

## A10 — AND / OR NEGATION

Source dạy:

```text
“và” ↔ “hoặc”
```

trong phủ định.

Core chỉ dạy đúng mức source.

Không bắt buộc formal truth table.

---

## A11 — QUANTIFIER NEGATION

Phải support:

```text
¬(∀x P(x)) = ∃x ¬P(x)
¬(∃x P(x)) = ∀x ¬P(x)
```

Source:

```text
Dạng 3
C22–C37
C44–C46
```

---

## A12 — IMPLICATION TRUTH

Cho:

```text
P ⇒ Q
```

Learner phải xác định đúng/sai.

Source:

```text
Lý thuyết mục 4
C16
C18
C21
C41
C64
```

---

## A13 — COUNTEREXAMPLE FOR IMPLICATION

Nếu `P⇒Q` sai:

learner phải tìm object sao cho:

```text
P = true
Q = false
```

Đây là interactive transformation của source, không thêm kiến thức mới.

---

## A14 — CONVERSE

Cho:

```text
P ⇒ Q
```

Learner tạo / xét:

```text
Q ⇒ P
```

Source:

```text
Lý thuyết mục 5
C39
```

---

## A15 — EQUIVALENCE

Learner hiểu:

```text
P ⇔ Q
```

khi hai chiều implication đều đúng.

Source:

```text
Lý thuyết mục 5
C12
C19
```

Không cần full formal truth table trong core.

---

## A16 — NECESSARY / SUFFICIENT

Map bắt buộc:

```text
P ⇒ Q

P là điều kiện đủ để có Q
Q là điều kiện cần để có P
```

Source:

```text
Lý thuyết mục 4
C38
```

---

## A17 — MULTIPLE QUANTIFIERS / MULTIPLE VARIABLES

Phải cover phát biểu có:

```text
∀x∀y
∃x∃y
∃x∀y
∀a∃b
```

Source:

```text
C59
C62
C63
```

Đây là phần V1 thiếu rõ rệt.

---

## A18 — PARAMETERIZED UNIVERSAL STATEMENT

Ví dụ source:

```text
∀x∈R, x² - 2 + a > 0
```

yêu cầu tìm / đếm tham số.

Source:

```text
C13
C68
```

Phải được dùng trong Lesson 07.

---

## A19 — COUNT VALUES MAKING STATEMENT TRUE

Source:

```text
C65
C66
C67
C69
```

Learner phải:

- xác định điều kiện;
- giải;
- đếm nghiệm phù hợp domain.

Không chỉ nhập đáp số.

---

## A20 — COMBINED PREDICATES

Source final:

```text
P(x,y)
Q(x,y)
R(x)
```

yêu cầu tất cả cùng đúng.

Source:

```text
C70
```

Đây là capstone source-authentic.

---

# 14. SOURCE QUESTION COVERAGE MATRIX

Agent phải tạo file:

```text
course-source-coverage.json
```

hoặc equivalent.

Mỗi Câu 1–70 phải có mapping.

Example:

```json
{
  "C22": {
    "skills": ["S8"],
    "archetypes": ["A11"],
    "lesson": "03",
    "masteryPool": true
  },
  "C38": {
    "skills": ["S13"],
    "archetypes": ["A16"],
    "lesson": "05",
    "masteryPool": true
  },
  "C68": {
    "skills": ["S15"],
    "archetypes": ["A18"],
    "lesson": "07",
    "masteryPool": true
  }
}
```

CI/content validation phải fail nếu có Câu 1–70 không được mapping.

---

# 15. LESSON 01 — MỆNH ĐỀ VÀ TÍNH ĐÚNG – SAI

## Source anchors

```text
Lý thuyết mục 1
Dạng 1
Ví dụ 1.1
Ví dụ 1.3
C1–C11
C51–C52
C54
C60–C61
```

## Core learning goals

Learner phải:

- nhận biết mệnh đề;
- phân biệt đúng/sai/không phải mệnh đề;
- không nhầm “không biết đúng sai” với “không có giá trị đúng sai”;
- xử lý câu hỏi, mệnh lệnh, cảm thán;
- xử lý statement toán học và đời sống.

---

## Concept Builder 1 — Classification Board

Dùng source-like cards:

```text
Hà Nội là thủ đô của Việt Nam.
Bạn có đi học không?
Hãy đi nhanh lên!
17 là số nguyên tố.
x + 2 = 11.
```

Three zones:

```text
Mệnh đề đúng
Mệnh đề sai
Không phải mệnh đề
```

Feedback phải giải thích thuộc tính.

---

## Concept Builder 2 — Unknown vs Undefined

Bắt learner phân biệt:

```text
“Tôi chưa biết câu này đúng hay sai”
```

với:

```text
“Câu này không có truth value”
```

Đây là misconception source đang nhắm tới.

---

## Guided Practice

Dùng mix source C1–C11.

Không dùng quá 2 multiple-choice item liên tiếp.

---

## Independent Check

4–6 item:

- 1 đời sống;
- 1 số học;
- 1 hình học;
- 1 câu hỏi / mệnh lệnh;
- 1 open sentence.

Không feedback từng item trước submit.

---

## Transfer

Learner tự tạo:

```text
1 mệnh đề đúng
1 mệnh đề sai
1 câu không phải mệnh đề
```

Fallback:

```text
structured sentence builder
```

nếu free-form grader chưa đủ.

---

# 16. LESSON 02 — MỆNH ĐỀ CHỨA BIẾN

## Source anchors

```text
Lý thuyết mục 2
Dạng 2
Ví dụ 2.1–2.4
C14
C53
C58
C65
```

## Core goals

Learner hiểu:

```text
P(x)
P(a)
```

và việc thay biến bằng giá trị cụ thể tạo ra mệnh đề.

---

## Interaction — Variable Playground

Không tự chọn ví dụ ngoài source khi source đã có ví dụ tốt.

Ưu tiên:

```text
P(x): x > x³
```

Learner thử:

```text
x = 1
x = 1/3
```

rồi giá trị tự chọn.

System hiển thị:

```text
P(value)
expression evaluation
TRUE / FALSE
```

---

## Witness Task

Dùng source-style:

```text
P(x): x² - 2x ≥ 0
Q(n): n chia hết cho 3
```

Learner phải nhập:

```text
1 value true
1 value false
```

---

## Natural Language Builder

Dùng các câu source Ví dụ 2.4.

Không đưa đáp án symbolic hoàn chỉnh trước.

---

## Independent Check

Phải có:

- substitution;
- true witness;
- false witness;
- domain awareness.

---

# 17. LESSON 03 — PHỦ ĐỊNH MỆNH ĐỀ

## Source anchors

```text
Lý thuyết mục 3
Dạng 3
Ví dụ 3.1–3.3
C22–C37
C44–C46
C51
```

Đây là lesson source-heavy.

---

## Interaction — Negation Builder

Token operations:

```text
=
≠
>
≤
<
≥
∀
∃
và
hoặc
```

Learner không chọn đáp án hoàn chỉnh.

Learner transform statement.

---

## Example

Source-style:

```text
∀x∈R, x² + x + 5 > 0
```

Learner phải biến:

```text
∀ → ∃
> → ≤
```

Result:

```text
∃x∈R, x² + x + 5 ≤ 0
```

---

## Natural-language negation

Dùng source:

```text
“Mọi động vật đều di chuyển.”
```

Learner xây:

```text
“Có ít nhất một động vật không di chuyển.”
```

Phải đánh misconception:

```text
“Mọi động vật đều không di chuyển.”
```

---

## Equation-state negation

Source:

```text
“Phương trình ... vô nghiệm”
```

Negation:

```text
“Phương trình ... có nghiệm”
```

Không bắt learner chọn “2 nghiệm phân biệt” nếu chỉ cần phủ định.

---

## Multi-step Feedback

Nếu learner đổi:

```text
∀ → ∃
```

nhưng quên predicate:

feedback:

```text
Bạn đã đổi lượng từ đúng.
Phần điều kiện phía sau vẫn chưa được phủ định.
```

---

## Mastery Check

Mix:

- symbolic;
- natural language;
- equation property;
- quantified inequality.

---

# 18. LESSON 04 — MỆNH ĐỀ KÉO THEO

## Source anchors

```text
Lý thuyết mục 4
Ví dụ 1.4
C16
C18
C21
C41
C64
```

## Core goals

Learner hiểu:

```text
P ⇒ Q
```

và biết khi nào nó sai.

---

## Interaction — Implication Inspector

Dùng source-authentic statements.

Ví dụ:

```text
Nếu a chia hết cho 9 thì a chia hết cho 3.
```

Learner chọn `a`.

System hiển thị:

```text
P(a)
Q(a)
P⇒Q status
```

---

## Counterexample Mode

Cho một implication sai.

Learner phải tìm:

```text
P true
Q false
```

System không reveal counterexample trước.

---

## Geometry Transfer

Dùng source-style:

```text
tam giác / góc / hình học
```

không chỉ chia hết.

---

## Mastery Check

Không hỏi:

```text
“Mệnh đề này thuộc loại gì?”
```

mà hỏi:

```text
“Hãy tìm cách bác bỏ hoặc xác nhận mệnh đề.”
```

---

# 19. LESSON 05 — ĐẢO, TƯƠNG ĐƯƠNG, CẦN – ĐỦ

## Source anchors

```text
Lý thuyết mục 5
C12
C19
C38
C39
```

## Core goals

Learner map:

```text
P⇒Q
Q⇒P
P⇔Q
necessary
sufficient
```

---

## Interaction — Direction Graph

Nodes:

```text
P
Q
```

Learner test:

```text
P → Q
Q → P
```

Mỗi chiều phải có:

```text
evidence
```

bằng proof reasoning hoặc counterexample.

---

## Source-authentic example

Dùng:

```text
Nếu hai tam giác bằng nhau thì diện tích chúng bằng nhau.
```

Learner xác định:

```text
“hai tam giác bằng nhau”
là điều kiện đủ để
“diện tích bằng nhau”
```

Không biến lesson thành set theory formal nếu không cần.

---

## Converse Challenge

Dùng source C39-like prompts.

Learner phải:

1. viết mệnh đề đảo;
2. xét đúng/sai;
3. nếu sai, tạo counterexample hoặc lý do.

---

## Equivalence

Chỉ unlock `⇔` khi hai chiều đúng.

Không dùng truth-table formalism trong core.

---

# 20. LESSON 06 — ∀, ∃ VÀ MỆNH ĐỀ NHIỀU BIẾN

## Source anchors

```text
Lý thuyết mục 6
Ví dụ 2.4
C15
C20
C42–C50
C56–C59
C62–C63
```

## Core goals

Learner hiểu:

```text
∀
∃
```

về semantics và evidence.

Sau đó mở rộng đúng mức source tới:

```text
∀x∀y
∃x∃y
∃x∀y
∀a∃b
```

---

## Interaction — Universal / Existential Arena

### Universal

System claim:

```text
∀n ...
```

Learner có thể thử counterexample.

Nếu không tìm được sau vài lần:

system hỏi:

```text
“Không tìm thấy phản ví dụ có đủ để chứng minh không?”
```

Expected:

```text
Không.
```

---

### Existential

Learner chỉ cần một witness.

Sau success:

```text
“Một witness đủ vì sao?”
```

---

## Multiple Quantifier Explorer

Ví dụ source-like:

```text
∀x∈R, ∀y∈R: x+y=1
∃x∈R, ∃y∈R: x+y=2
∃x∈R, ∀y∈R: y=xy
```

UI phải cho learner chọn `x`, `y` hoặc construction tương ứng.

Mục tiêu:

- thấy scope;
- thấy witness;
- thấy universal burden.

---

## Do not overteach

Không đưa:

- predicate logic formal proof system;
- quantifier order theory ngoài mức source;
- symbolic logic nâng cao ngoài exercise set.

---

# 21. LESSON 07 — TỔNG HỢP / THAM SỐ / VẬN DỤNG CAO

## Source anchors

```text
C13
C65
C66
C67
C68
C69
C70
```

**Không dùng bài tham số tự sáng tác làm problem core nếu source đã có bài tương đương hoặc tốt hơn.**

---

## Challenge A — Parameterized Universal

Dùng source:

```text
∀x∈R, x² - 2 + a > 0
```

với điều kiện về `a`.

Learner phải:

```text
understand universal requirement
→ analyze expression
→ derive condition on a
→ count valid integer a if required
```

Không reveal strategy.

---

## Challenge B — Count Values

Dùng source C65–C67 type.

Learner phải:

```text
derive condition
solve
respect domain
count
```

Không chỉ nhập final number.

---

## Challenge C — Composite Predicate

Dùng source C70 type:

```text
P(x,y)
Q(x,y)
R(x)
```

Yêu cầu tất cả đúng.

Đây là **capstone ưu tiên** vì bám source.

---

## Challenge D — Proof vs Counterexample Decision

Cho learner tự chọn:

```text
Tôi muốn thử một giá trị
Tôi muốn biến đổi biểu thức
Tôi muốn tìm phản ví dụ
Tôi muốn chứng minh tổng quát
```

Nhưng trong final mastery:

**không hiển thị shortlist strategy nếu có thể tránh.**

---

# 22. ENRICHMENT POLICY

Các nội dung sau **không được là core mặc định** nếu PDF không yêu cầu:

```text
full truth-table construction
formal precedence parser
P⇒Q ≡ ¬P∨Q proof by truth table
De Morgan named law discovery
formal propositional calculus
logic gates
SAT-style logic
```

Có thể tạo:

```text
Enrichment: Khám phá thêm
```

và không ảnh hưởng core mastery.

---

# 23. INTERACTION ENGINES V2

Không build tất cả upfront.

Chỉ generalize sau vertical slice.

Core engines:

```text
StatementClassifier
VariableEvaluator
NegationBuilder
QuantifierArena
ImplicationInspector
DirectionGraph
CounterexampleLab
ReasoningDebugger
StructuredExpressionBuilder
```

---

# 24. ENGINE CONTRACT

Mọi engine phải có state-machine contract.

Example:

```json
{
  "initialState": {},
  "learnerActions": [],
  "derivedState": {},
  "misconceptionRules": [],
  "feedbackRules": [],
  "hintPolicy": {},
  "passCondition": {},
  "masteryEvidence": {},
  "sourceMapping": {}
}
```

Không chấp nhận:

```text
renderer + expectedAnswer
```

là toàn bộ logic.

---

# 25. INTERPRETIVE FEEDBACK

Ưu tiên feedback giải thích state learner vừa tạo.

## Không tốt

```text
Sai. Đáp án đúng là C.
```

## Tốt

```text
Bạn chọn x=0.

P(0): đúng
Q(0): sai

Bạn vừa tìm đúng dạng phản ví dụ cần thiết cho P⇒Q.
```

System nên **show mathematics first**, phán xét second.

---

# 26. MISCONCEPTION REGISTRY

Tạo registry có ID.

Tối thiểu:

```text
M01 statement_vs_open_sentence
M02 unknown_truth_vs_no_truth_value
M03 testing_examples_is_proof
M04 universal_needs_all
M05 existential_needs_one
M06 negate_quantifier_only
M07 negate_relation_strictness
M08 negate_all_as_all_not
M09 implication_equals_converse
M10 necessary_sufficient_reversed
M11 equivalence_from_one_direction
M12 witness_outside_domain
M13 ignores_domain_when_counting
M14 parameter_checked_only_samples
M15 multiple_quantifier_scope_confusion
```

Mỗi misconception phải map tới:

- detection;
- feedback;
- remediation;
- source archetype.

---

# 27. WORKED EXAMPLE + FADING

Không dùng discovery-only.

Khi learner mắc kẹt:

```text
Attempt
→ local feedback
→ targeted hint
→ worked micro-example
→ faded retry
→ independent retry
```

Worked example phải dùng **bài khác nhưng cùng archetype** nếu có thể.

Không reveal chính bài mastery.

---

# 28. HINT LADDER

Mỗi challenge khó có 3 mức.

Example C68-type:

### Hint 1

```text
Mệnh đề đúng với mọi x.
Điều gì phải xảy ra với giá trị nhỏ nhất của biểu thức?
```

### Hint 2

```text
Hãy viết biểu thức dưới dạng cho thấy giá trị nhỏ nhất.
```

### Hint 3

```text
Tách phần phụ thuộc x khỏi tham số a.
```

Không đưa đáp án số ngay.

---

# 29. CONTENT GENERATION RULES

Agent được tạo bài mới khi cần:

- practice;
- transfer;
- remediation;
- spaced review.

Nhưng bài mới phải:

```text
same concept
same source difficulty band
same required mathematical knowledge
```

Không tự thêm kỹ thuật mới.

Metadata:

```json
{
  "contentTier": "source_variant",
  "derivedFromArchetype": "A18"
}
```

---

# 30. DIFFICULTY BANDS

Dựa trên progression source:

```text
D1 Recognition
D2 Direct application
D3 Mixed reasoning
D4 Multi-step / quantified
D5 Parameter / composite
```

Không định nghĩa VDC bằng:

```text
biểu thức dài
hoặc
có tham số
```

VDC cần ít nhất một yếu tố:

```text
strategy selection
multiple constraints
proof/counterexample decision
parameter reasoning
cross-skill integration
```

---

# 31. ASSESSMENT FORMAT POLICY

Source dùng:

```text
trắc nghiệm
đúng/sai
trả lời ngắn
```

Course phải giữ khả năng làm cả ba format vì đó là assessment target.

Nhưng learning activities không được giới hạn vào ba format đó.

Ví dụ:

```text
source MC
→ Concept Builder = manipulation
→ Mastery Check = MC hoặc constructed response
```

## 31.1. LESSON SCHEME: AUTHORING POOL VS LEARNER DELIVERY

Mỗi lesson dùng một contract mềm, không dùng số screen cố định. Baseline để
authoring và review chất lượng là:

```text
1–2 khối lý thuyết
1–2 sandbox
6 câu trắc nghiệm nhiều lựa chọn
2 nhóm Đúng / Sai, mỗi nhóm 4 ý
3 câu trả lời ngắn
0–2 media động viên xen giữa slide học thuật
```

Đây là **pool authoring**, không phải số câu bắt buộc phải hiển thị trong một
lần học. Learner delivery được chọn theo mục tiêu của lesson và có thể thay
đổi số lượng hoặc cấu trúc:

```text
guided practice → ít câu, có scaffold
independent check → trộn MC và Đúng / Sai
transfer → trả lời ngắn, witness, negation hoặc counterexample
```

Trong JSON canonical, `assessment_pool` chỉ là kho câu hỏi có metadata nguồn và
không được render trực tiếp. `assessment_ref` là đường giao hàng deterministic;
chỉ các ref được chọn mới trở thành quiz trong runtime. Pool còn lại dành cho
review/adaptive routing sau này, không được coi là mastery đã đạt.

Mỗi slide learner-facing chỉ được chứa **một `assessment_ref`**. Một nhóm Đúng /
Sai vẫn là một exercise duy nhất vì bốn phát biểu tạo thành cùng một đơn vị suy
luận; các câu MC và trả lời ngắn phải tách thành các slide riêng.

Một lesson không đạt chỉ vì có ít hơn một con số screen cố định; lesson chỉ đạt
khi đủ learning need, meaningful interaction, source coverage và assessment
delivery đã khai báo. T/F và short answer phải đi qua cùng runtime contract như
MC, không được để content generator tạo ra nhưng frontend bỏ qua.

Sandbox chỉ được giữ khi action làm thay đổi mathematical/reasoning/evidence
state. Dropdown, drag hoặc animation trang trí không tự được tính là
interaction; mọi hint phải có trạng thái `available → revealed → satisfied` và
để lại dấu vết khi learner đạt điều kiện, thay vì biến mất không giải thích.

---

# 32. SOURCE-AUTHENTIC MASTERIES

Mastery pool phải chứa:

```text
MC-style
True/False matrix
Short answer
Constructed witness
Constructed negation
Counterexample
Reasoning sequence
```

Learner phải chuẩn bị được cho format source thật.

---

# 33. MOBILE UX

Bắt buộc:

- 360–430 px usable;
- no drag-only;
- touch target hợp lý;
- table responsive;
- equations không bị clip;
- multiple-quantifier expressions wrap đúng;
- keyboard input không che submit.

Truth/False matrix trên mobile:

```text
one statement per card
```

thay vì ép bảng 5 cột.

---

# 34. ACCESSIBILITY

Bắt buộc:

- keyboard;
- visible focus;
- semantic labels;
- no color-only status;
- screen-reader text cho logical symbols;
- alternative to drag;
- equation accessible description nếu renderer support.

---

# 35. PERSISTENCE

Giữ:

```text
current activity state
attempt history
hint level
mastery evidence
review queue
```

Không reset khi learner back/forward nếu không explicit reset.

---

# 36. ANALYTICS VS LEARNING EVIDENCE

Tách rõ:

## Telemetry

```text
clicked
opened_hint
time_spent
changed_value
```

## Learning evidence

```text
found_valid_witness
constructed_correct_negation
generated_counterexample
translated_necessary_sufficient
solved_parameter_condition
```

Không trộn hai loại.

---

# 37. PRETEST / DIAGNOSTIC

Optional về UX nhưng recommended.

Dùng 6–10 item source-derived:

```text
statement
variable
negation
implication
quantifier
necessary/sufficient
```

Nếu learner đã độc lập mastery một skill:

```text
shorten Concept Builder
```

Không skip Final Mastery chỉ dựa pretest nếu confidence thấp.

---

# 38. REVIEW QUEUE

Mỗi skill mastered phải có thể vào review queue.

Suggested:

```text
same session mixed review
next session review
delayed review
```

Nếu product chưa support delayed scheduling:

ít nhất implement:

```text
interleaved review trong course
```

---

# 39. VERTICAL SLICE STRATEGY V2

Không build 9 engines trước.

Thứ tự:

```text
1. Audit repo
2. Build source coverage registry
3. Chọn Lesson 03 hoặc Lesson 04 làm vertical slice
4. Build minimum engines cần cho slice
5. Validate pedagogy
6. Generalize engines
7. Mở rộng course
```

Recommended first slice:

```text
Lesson 03 — Phủ định mệnh đề
```

Lý do:

- source coverage lớn;
- có token transform;
- có quantifier;
- có natural language;
- có deterministic grader;
- có misconception rõ;
- test được feedback engine.

Alternative:

```text
Lesson 04 — Mệnh đề kéo theo
```

---

# 40. SOURCE COVERAGE FIRST, ENGINE SECOND

Agent **không được** làm:

```text
“Ta đã có engine X nên nhét course vào X.”
```

Đúng phải là:

```text
source archetype
→ learning need
→ interaction choice
→ engine
```

---

# 41. COURSE JSON REQUIREMENTS

Mỗi activity:

```json
{
  "id": "...",
  "lessonId": "...",
  "skillIds": [],
  "archetypeIds": [],
  "difficultyBand": "D1|D2|D3|D4|D5",
  "mode": "concept_builder|guided_practice|mastery_check|mixed_review",
  "sourceMapping": {},
  "misconceptionIds": [],
  "interaction": {},
  "feedbackPolicy": {},
  "hintPolicy": {},
  "passCondition": {},
  "masteryEvidence": {}
}
```

---

# 42. SOURCE CONTENT VALIDATOR

Build validation script.

Fail if:

```text
core activity missing sourceMapping
unknown source question ID
unknown skill ID
unknown archetype ID
source C1–C70 unmapped
enrichment counted as core mastery
mastery item contains unsupported concept
```

---

# 43. TESTING — MATH LOGIC

Unit tests:

```text
predicate evaluation
negation relation
quantifier negation
implication truth
counterexample validation
domain validation
count solution
multiple variable predicate
```

---

# 44. TESTING — SOURCE REGRESSION

Dùng representative source questions làm golden tests.

Ví dụ:

```text
C22-style negation
C38-style necessary/sufficient
C42-style existential reading
C53-style substitution
C58-style P(x)/∀/∃
C62-style multiple quantifiers
C68-style parameter
C70-style composite
```

Nếu engine update làm sai golden behavior:

```text
CI fail
```

---

# 45. TESTING — INTERACTION

Test:

```text
correct
common misconception
retry
hint 1/2/3
mastery mode no premature feedback
mobile
keyboard
persistence
multiple valid answer
invalid domain witness
```

---

# 46. CONTENT QA

Reviewer phải kiểm:

```text
source fidelity
mathematical correctness
difficulty match
Vietnamese terminology
notation
feedback
misconception mapping
mastery alignment
```

Không approve chỉ vì UI đẹp.

---

# 47. VIETNAMESE TERMINOLOGY

Core copy phải ưu tiên thuật ngữ source:

```text
mệnh đề
mệnh đề chứa biến
mệnh đề phủ định
mệnh đề kéo theo
mệnh đề đảo
hai mệnh đề tương đương
điều kiện cần
điều kiện đủ
với mọi
tồn tại
```

Có thể dùng English internal IDs:

```text
implication
counterexample
```

nhưng learner-facing copy phải nhất quán tiếng Việt.

---

# 48. VISUAL LANGUAGE

Không clone Brilliant.

Dùng identity Calculus.

Semantic components:

```text
statement card
truth state
variable chip
domain selector
quantifier token
negation transform
implication arrow
counterexample marker
evidence panel
reasoning steps
```

Animation chỉ dùng để diễn giải toán.

---

# 49. NO FAKE INTERACTIVITY

Không tính là meaningful interaction nếu learner chỉ:

```text
click Next
toggle để xem đáp án
select dropdown có một đáp án rõ
drag object chỉ để trang trí
```

Meaningful action phải thay đổi:

```text
mathematical state
reasoning state
evidence state
```

---

# 50. NO FAKE ADVANCED APPLICATION

Không gắn `advanced_application` chỉ vì:

```text
có tham số
có căn
biểu thức dài
```

Advanced phải yêu cầu:

```text
choose strategy
or
combine skills
or
construct proof/counterexample
or
reason across parameter/domain
```

---

# 51. EXACT LESSON COMPLETION RULE

Một lesson complete khi:

```text
all required source skills introduced
AND
independent check passed
AND
at least one transfer item passed
```

Không dựa screen count.

---

# 52. EXACT COURSE COMPLETION RULE

Course complete khi:

```text
all core skills >= independent
AND
final mixed mastery passed
AND
source coverage validator passes
```

---

# 53. FINAL MIXED MASTERY

Phải có source-authentic mix:

```text
classification
variable substitution
negation
implication
necessary/sufficient
quantifier
multiple variable
parameter
short answer
```

Không label skill.

---

# 54. CAPSTONE

Capstone ưu tiên source C70 archetype.

Learner phải xử lý:

```text
P(x,y)
Q(x,y)
R(x)
```

và tìm các cặp thỏa đồng thời.

UI có thể có:

- coordinate/value explorer;
- constraint toggles;
- solution table.

Nhưng final answer phải được learner derive.

---

# 55. OPTIONAL ENRICHMENT

Sau core course có thể có:

```text
Truth Table Lab
De Morgan Discovery
Logic Puzzle Lab
Set interpretation of implication
```

Nhưng:

- không block course completion;
- không ảnh hưởng core mastery;
- gắn `contentTier: enrichment`.

---

# 56. AGENT EXECUTION PLAN

Agent phải làm đúng thứ tự:

```text
01. Inspect current course JSON.
02. Inspect PDF-derived source mapping available in repo/spec.
03. Build source archetype registry A01–A20.
04. Build skill registry S1–S18.
05. Map C1–C70.
06. Audit current renderer.
07. Audit grading logic.
08. Audit analytics/mastery.
09. Pick vertical slice.
10. Implement minimum interaction contracts.
11. Implement source-authentic content for slice.
12. Add misconception rules.
13. Add mastery check.
14. Add tests.
15. Validate mobile/accessibility.
16. Review source fidelity.
17. Generalize reusable engines.
18. Implement remaining lessons.
19. Build mixed reviews.
20. Build final mastery.
21. Run source coverage validator.
22. Produce implementation report.
```

Không skip bước 3–5.

---

# 57. AGENT MUST NOT

Agent không được:

```text
invent a new core chapter
replace source examples without reason
turn core into generic logic course
make truth table a required core skill
use LLM grader where deterministic grading works
use source MC format as the only interaction
mark completion based only on quiz score
reveal VDC strategy before learner attempts
hardcode every activity into unique React component
build abstraction before source need is proven
```

---

# 58. REQUIRED DELIVERY ARTIFACTS

Agent phải trả:

## A. `source-coverage.md`

Table:

```text
Source Question
Source Page
Archetype
Skill
Lesson
Activity ID
Mastery Pool
```

C1–C70 đầy đủ.

---

## B. `course-map.md`

```text
Lesson
Concept
Source
Interaction
Misconception
Independent Check
Transfer
```

---

## C. `implementation-summary.md`

```text
Files changed
Schema changes
Engines
Tests
Migration
```

---

## D. `deferred.md`

```text
Requirement
Blocker
Fallback
Next action
```

---

# 59. ACCEPTANCE CHECKLIST — SOURCE

- [ ] Bám đủ 6 mục lý thuyết.
- [ ] Bám đủ 3 dạng bài chính.
- [ ] C1–C70 đều được map.
- [ ] C65–C70 được dùng cho application/advanced.
- [ ] C62–C63 multi-quantifier không bị bỏ.
- [ ] C38–C39 condition/converse không bị bỏ.
- [ ] C22–C37 phủ định có coverage mạnh.
- [ ] Core không yêu cầu truth table ngoài source.
- [ ] New content không thêm kiến thức core mới.

---

# 60. ACCEPTANCE CHECKLIST — PEDAGOGY

- [ ] Concept Builder ≠ Mastery Check.
- [ ] Feedback interpretive.
- [ ] Hint progressive.
- [ ] Worked example có fading.
- [ ] Có transfer.
- [ ] Có mixed review.
- [ ] Có source-authentic final mastery.
- [ ] Learner phải tự tạo witness/counterexample ở nơi phù hợp.
- [ ] Learner phải reasoning, không chỉ click.

---

# 61. ACCEPTANCE CHECKLIST — PRODUCT

- [ ] Mobile usable.
- [ ] Keyboard usable.
- [ ] Persistence.
- [ ] Deterministic grading.
- [ ] Source mapping metadata.
- [ ] Skill mastery evidence.
- [ ] Review queue.
- [ ] Content validator.
- [ ] Source regression tests.

---

# 62. NORTH STAR

Không hỏi:

```text
“Course có giống Brilliant không?”
```

Hỏi:

```text
“Learner có thực sự học được toàn bộ phần Mệnh đề trong source,
nhưng bằng một trải nghiệm tương tác sâu hơn PDF/trắc nghiệm không?”
```

---

# 63. FINAL DESIGN PRINCIPLE

```text
SOURCE AUTHENTICITY
×
LEARNER AGENCY
×
REASONING DEPTH
×
TRANSFER
```

Nếu một thay đổi làm tăng “interactivity” nhưng giảm source fidelity:

```text
REJECT
```

Nếu một thay đổi bám source nhưng chỉ biến PDF thành web quiz:

```text
REJECT
```

Nếu learner có thể hoàn thành bằng đoán đáp án UI mà không hiểu logic:

```text
REJECT
```

Nếu learner học xong vẫn không xử lý được C1–C70:

```text
COURSE FAILS THE SPEC
```

---

# 64. DEFINITION OF SUCCESS

Course V2 thành công khi:

```text
1. Nội dung và dạng bài truy được rõ về PDF.
2. Learner không bị giới hạn vào trắc nghiệm.
3. Mọi core concept đều có independent evidence.
4. Những lỗi tư duy phổ biến được phát hiện và remediation.
5. Final mastery phản ánh đúng độ sâu của source.
6. Không có phần “interactive đẹp” nhưng không phục vụ skill source.
7. Learner có thể quay lại PDF và giải phần Bài 1. Mệnh đề với năng lực rõ ràng tốt hơn.
```

**Đây là chuẩn thực thi cuối cùng.**
