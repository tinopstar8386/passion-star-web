# Đặc tả Kỹ thuật Module: Trung tâm Điều khiển Phân quyền & OTP (`control.html`)

- **File chính:** `control.html` (1,623 dòng)
- **Backend đi kèm:** Google Apps Script `https://script.google.com/macros/s/AKfycbzILZR3B37f9LK0yT3H2JhJ6trzfYsOZiIB23NwonqxntWOXM7IT6UFEYLKcyf3uSeU/exec` (dùng chung endpoint với `log.html`)
- **Mục đích:** Cổng quản trị bảo mật bằng mã PIN cho Admin thực hiện cấp mã OTP/link Form đăng ký quyền truy cập Google Sheets theo team, lấy link bảng làm việc, thu hồi quyền email hàng loạt, và quản lý danh sách Team / Idol.

---

## 1. Mục tiêu & Kiến trúc Giao tiếp (GAS Web App Shim)

`control.html` được thiết kế với lớp giả lập `google.script.run` ở client (`withSuccessHandler` / `withFailureHandler`) chuyển toàn bộ lời gọi hàm sang `fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, args }) })`.

### Các API Action hỗ trợ:
- `verifyAdminPin(pin)` — kiểm tra mã PIN đăng nhập Admin.
- `getGroupsData()` — tải toàn bộ danh sách nhóm/team (`groupsData`) và các Idol trực thuộc.
- `webGenerateCode(gId)` — tạo mã OTP (hiệu lực 1 tiếng / 60 phút) và link Form cho Team.
- `invalidateOTP(gId)` — thu hồi/hủy ngay mã OTP vừa cấp.
- `webGetLinks(gId)` — lấy tối đa 2 link bảng làm việc (`link1`, `link2`) của Team.
- `webRemoveEmail(gId, emailsText)` — thu hồi quyền truy cập của danh sách email khỏi Sheet của Team.
- `addTeam(teamName, idols)` — tạo mới Team kèm danh sách Idol ban đầu.
- `addIdol(groupId, idolName)` — thêm Idol mới vào Team.
- `removeIdol(groupId, idolName)` — xóa Idol khỏi Team.

---

## 2. Bảo Mật, Giao diện & Theme

- **Màn hình Đăng nhập (`#loginScreen`):** Nhập PIN (`#pinInput`, hỗ trợ ẩn/hiện qua `togglePinVisibility`), hiển thị spinner `#loginLoader`, hiệu ứng rung `.shake-animation` (`#loginError`) khi sai PIN. Khi thành công ẩn `#loginScreen`, hiện `#adminDashboard` và nút `#btnLogout` (`logout()` khóa lại phiên).
- **Theme:** Lưu trong `localStorage` key `adminTheme` (`init`/`setTheme`/`toggleTheme`).
- **Thông báo & Hiệu ứng:** Dùng `showToast(message, type)` và `fireConfetti()` (pháo giấy đa hướng qua `fire(particleRatio, opts)`) khi cấp mã thành công.

---

## 3. Đặc Tả 3 Tab Nghiệp Vụ Chính (`switchTab`)

### 3.1. Tab 1: Cấp Mã OTP & Lấy Link (`#tabCode`)
- **Chọn Team (`#groupSelect`):** Nạp từ `groupsData` (`populateSelects`), tự động xem trước danh sách Idol thuộc Team (`renderTeamIdolPreview`).
- **Cấp Mã (`generateCode`):** Gọi `webGenerateCode(gId)`. Kết quả render vé OTP (`#outputAreaCode`) gồm mã OTP (click để copy via `copySingleString`), nút mở Form, nút **Copy Mẫu Gửi Zalo** (`copyText('otp')` với template chứa tên team, link, mã OTP, thời hạn 60 phút), và nút **Hủy Mã** (`invalidateOTP(gId)`).
- **Lấy Link Bảng (`getLinks`):** Gọi `webGetLinks(gId)`, hiển thị `link1` / `link2` dạng tile có link mở tab mới và nút **Copy Toàn Bộ Link Gửi Zalo** (`copyText('link')`).

### 3.2. Tab 2: Thu Hồi Quyền Email (`#tabRemove`)
- **`#removeGroupSelect` & `#emailInput`:** Cho phép nhập nhiều email phân cách bởi dấu phẩy hoặc xuống dòng (`/[,\n]+/`).
- **Validate Realtime (`validateEmails`):** Chỉ hợp lệ khi tất cả email đều khớp định dạng `@gmail.com` (`@gmail\.com$`), hiển thị badge đếm xanh (`emailValidationBadge`) và mở khóa nút `#btnRemove`; sai định dạng khóa nút và báo lỗi viền đỏ.
- **Thu hồi (`removeEmail`):** Gọi `webRemoveEmail(gId, emailsText)` và hiển thị kết quả thành công/thất bại tại `#outputAreaRemove`.

### 3.3. Tab 3: Cấu hình Team & Idol (`#tabConfig`)
- **Tạo Team mới (`createNewTeam`):** Gọi `addTeam(teamName, idols)` rồi refresh `getGroupsData()`.
- **Thêm Idol (`addNewIdol`):** Chọn `#configGroupSelect`, nhập `#newIdolName`, gọi `addIdol(groupId, idolName)` và refresh.
- **Xóa Idol (`updateDeleteIdolDropdown`, `deleteExistingIdol`):** Chọn `#deleteGroupSelect` để lọc danh sách `#deleteIdolSelect`, gọi `removeIdol(groupId, idolName)` và refresh.

---

## 4. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ nguyên lớp shim `google.script.run`** gọi về đúng `API_URL` (`{ action, args }` qua `POST text/plain;charset=utf-8`) kèm `AbortController` timeout **20s** để tương thích ngược hoàn toàn với backend Apps Script.
2. **Giữ đủ 9 API method** (`verifyAdminPin`, `getGroupsData`, `webGenerateCode`, `invalidateOTP`, `webGetLinks`, `webRemoveEmail`, `addTeam`, `addIdol`, `removeIdol`).
3. **Giữ bảo vệ XSS (`escapeHtml`, `sanitizeHttpUrl`)** cho link/label render động, giữ regex validate `@gmail.com` khi nhập nhiều email phân cách dấu phẩy/xuống dòng ở Tab Thu hồi quyền, và giữ nguyên mẫu text Zalo khi copy OTP/Link.
4. **Cải tiến cần lưu ý khi refactor:** Code hiện tại vẫn còn `confirm()` ở `invalidateOTP`, `removeEmail`, `deleteExistingIdol` (trái với quy tắc UI Glassmorphism chung của repo) — khi code lại hoặc nâng cấp cần thay bằng custom confirmation modal nhưng vẫn giữ nguyên luồng logic xác nhận trước khi gọi API.
