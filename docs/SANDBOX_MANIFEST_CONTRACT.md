# Sandbox Manifest Contract

## Mục tiêu

Raw course, generated course và frontend runtime phải sử dụng cùng một
declarative sandbox manifest. Build không được tự đoán hoặc âm thầm sửa một
manifest không hợp lệ.

## Canonical envelope

Manifest canonical sử dụng schema 1.0 trong
frontend/src/sandbox/manifest.schema.json.

Các field bắt buộc gồm:

- schemaVersion: "1.0"
- kind: "math.sandbox"
- id, version, domainId, archetypeId, level, recipe
- outcomeIds, prerequisites, misconceptions
- scene.space
- controls, goals, assessment
- accessibility.keyboardControls, accessibility.textAlternative,
  accessibility.highContrast
- config

mode và activity phải nằm trong config. recipe là ID của plugin runtime, không
phải alias chung như core.

Goal evidence chuẩn của domain có thể dùng tên namespaced, ví dụ
logic.classifier_complete. Structural schema chỉ kiểm tra namespace; plugin
phải kiểm tra evidence có được hỗ trợ hay không.

## Validation layers

1. Structural validation dùng validateManifest().
2. Plugin validation dùng assertPluginManifest() và registry runtime.
3. Runtime smoke validation phải tạo được session và snapshot ban đầu.
4. Course validation kiểm tra solution graph, control references và
   raw/generated parity.

CLI:

```bash
npm run validate:course
```

--strict biến các warning về content semantics thành lỗi. Warning hiện tại được
giữ lại để Phase 1 bổ sung witness/counterexample controls, không được coi là
coverage hoặc mastery đã hoàn tất.

## Source and generated flow

```
frontend/src/content/courses/*.mdx
    -> tools/mdx_course_compiler.ts
    -> data/courses
    -> validate
    -> backend/sync_data.py
    -> frontend/backend runtime
```

Generated artifact không được chỉnh trực tiếp. Build phải dừng khi step JSON
không parse được; validator phải dừng khi manifest không pass schema hoặc plugin.

Lesson assessment pool/delivery dùng contract riêng tại
`docs/LESSON_SCHEME_CONTRACT.md`; validator course chạy contract đó trên cả raw
và generated artifact.

Migration legacy phải là command/script có chủ đích. Runtime chỉ nhận manifest
canonical, không tự động chuyển đổi field cũ trong production.
