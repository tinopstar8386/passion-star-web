# AGENTS & COPILOT GUIDELINES - PASSION STAR WEB

This document instructs all AI assistants (Antigravity, Gemini Code Assist, Cursor, Claude Code, etc.) working on the **Passion Star Web** project.

---

## 🚨 MANDATORY DIRECTIVE: UPDATE PROGRESS ON EVERY CODE CHANGE

Whenever you modify, add, fix, refactor, or delete code in this repository:
1. **You MUST automatically update `PROGRESS.md`** under the section `## 📝 6. Nhật Ký Cập Nhật Code (Changelog)`.
2. Add a new row to the table containing:
   - **Ngày & Giờ (Date & Time)**: Timestamp in Vietnam time (`DD/MM/YYYY HH:mm`).
   - **Người / AI thực hiện (Author/Agent)**: e.g., `Antigravity AI`.
   - **Các File Thay Đổi (Files Modified)**: Specific filenames.
   - **Tóm Tắt Nội Dung Thay Đổi (Summary of Changes)**: Clear, concise explanation of the changes made and reason.
3. If the changes introduce a new feature, update section `3. Cấu Trúc Các Module Chính` or `4. Trạng Thái Hiện Tại` in `PROGRESS.md` accordingly.

---

## 🏛️ ARCHITECTURE & CODING STANDARDS

1. **Single-Page Vanilla Web Architecture:**
   - Most applications are standalone HTML files with embedded `<style>` and `<script>` tags or minimal CDN dependencies.
   - Avoid introducing heavy bundlers (webpack, vite, npm dependencies) unless explicitly requested by the user.

2. **UI & UX Conventions:**
   - Dark mode and neon glassmorphism accents (`#050505` base background, vibrant gradient badges, smooth cubic-bezier transitions).
   - Responsive design: Always consider both Desktop and Mobile (iOS Safari & Android Chrome) touch interactions and floating bottom bars.

3. **Firebase & Data Safety:**
   - Realtime sync via Firebase SDKs (`window.fs`, `window.db`, Firestore).
   - Always implement null-safety and fallback defaults when reading properties from Firestore documents (e.g., `e?.role`, `String(role).toUpperCase()`).
   - Preserve all existing Admin PIN checks (e.g., PIN `0908` / lockout mechanics) when modifying views.

4. **Encoding:**
   - Always use UTF-8 encoding.
   - Preserve Vietnamese accents and bilingual labels (Vietnamese - Chinese in tracker).

5. **🚨 QUY TẮC SỐNG CÒN: TUYỆT ĐỐI KHÔNG DÙNG `alert()`, `prompt()`, `confirm()` CỦA TRÌNH DUYỆT:**
   - Tuyệt đối không bao giờ gọi các hàm popup mặc định của trình duyệt (`window.alert`, `window.prompt`, `window.confirm`). Nhìn rất thô sơ, làm gián đoạn trải nghiệm người dùng và không phù hợp với tiêu chuẩn thẩm mỹ cao cấp của Passion Star.
   - Thông báo ngắn: Luôn dùng hệ thống Toast (`showToast`).
   - Yêu cầu nhập liệu (input) hoặc xác nhận (confirm): Luôn dùng Custom Modal Glassmorphism được thiết kế riêng với các nút bấm bo góc, hiệu ứng mượt mà và hỗ trợ cả mobile/desktop touch.
