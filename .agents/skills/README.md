# 🧠 Antigravity & Gemini Code Assist Skills Suite

Kho lưu trữ toàn bộ các **Skills** (Kỹ năng & Quy chuẩn AI) phục vụ cho Google Antigravity, Gemini Code Assist, và Claude Code. Bộ công cụ giúp trợ lý ảo nắm bắt toàn diện quy trình kiểm thử, kiến trúc hệ thống, code intelligence và chuẩn phát triển phần mềm.

---

## 🚀 Cài Đặt Trên Máy Tính Mới / Máy Tính Công Ty (Quick Setup)

Chỉ cần mở **PowerShell** trên máy tính công ty và chạy lệnh sau để tải toàn bộ 100 skills vào thư mục cấu hình toàn cục:

```powershell
# 1. Tạo thư mục cấu hình nếu chưa có
New-Item -ItemType Directory -Force -Path "$HOME\.gemini\config"

# 2. Clone repository skills về thư mục chuẩn của Antigravity
git clone https://github.com/tinopstar8386/antigravity-skills.git "$HOME\.gemini\config\skills"
```

### Cách cập nhật skills mới nhất khi có thay đổi:
```powershell
cd "$HOME\.gemini\config\skills"
git pull origin main
```

---

## 📂 Danh Mục Các Nhóm Kỹ Năng (Skills Categories)

1. **Code Intelligence & Graph Navigation:**
   - `codegraph`: Local AST & SQLite Knowledge Graph (explore, node, callers, affected).
   - `codebase-onboarding`: Phân tích codebase mới, tạo cẩm nang kiến trúc tự động.
   - `code-tour`: Tạo các tour walkthrough file và line anchors.

2. **Frontend & UI/UX Development:**
   - `frontend-patterns`: Chuẩn React, Next.js, state management, render optimization.
   - `frontend-a11y`: Chuẩn tiếp cận Accessibility WCAG, semantic HTML, ARIA, focus trap.
   - `design-system`: Trích xuất và kiểm tra design tokens, visual audit.
   - `vue-patterns`, `angular-developer`, `nuxt4-patterns`, `react-native-patterns`.

3. **Backend & Architecture Patterns:**
   - `backend-patterns`: Kiến trúc Node.js, Express, Next.js API routes.
   - `hexagonal-architecture`: Ports & Adapters, phân tách domain logic và I/O.
   - `api-design`: Chuẩn RESTful API, pagination, rate limiting, error codes.
   - `error-handling`: Mô hình xử lý lỗi an toàn đa ngôn ngữ.
   - `fastapi-patterns`, `django-patterns`, `springboot-patterns`, `nestjs-patterns`, `laravel-patterns`, `golang-patterns`, `rust-patterns`, `kotlin-patterns`.

4. **Testing, Pentest & Verification:**
   - `browser-qa`: Smoke check, visual regression, tương tác tự động với Chrome DevTools/CDP.
   - `e2e-testing`: Playwright / Puppeteer E2E testing patterns.
   - `verification-loop`: Chu trình 6 bước kiểm thử chất lượng trước commit/PR.
   - `security-review` & `security-scan`: Rà soát lỗ hổng bảo mật, auth guard, input validation.
   - `tdd-workflow`: Test-driven development chuẩn mực.

5. **DevOps & Workflow:**
   - `git-workflow`: Quy trình phân nhánh, rebase, clean history.
   - `conventional-commit-review`: Chuẩn hóa commit messages.
   - `docker-patterns`, `kubernetes-patterns`, `deployment-patterns`.

---

## 📌 Ghi Chú Bản Quyền & Đồng Bộ
- Được duy trì và đồng bộ bởi: **tinopstar8386**
- Liên kết dự án chính: [Passion Star Web](https://github.com/tinopstar8386/passion-star-web)
