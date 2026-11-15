# Đặc tả Kỹ thuật Module: Trình Tự Động Kích Hoạt Mail (`mail_activator.html`)

- **File chính:** `mail_activator.html` (1,338 dòng)
- **Backend đi kèm:**
  - `api/auto-subscribe.js` (277 dòng, Vercel Serverless Function tại `/api/auto-subscribe`)
  - `server/auto_subscribe.mjs` (291 dòng, Node module & CLI script đăng ký từ terminal)
  - `server/server.mjs` (110 dòng, Local HTTP static + API server cổng `3000`)
- **Mục đích:** Tự động đăng ký một địa chỉ Email vào toàn bộ **11 nguồn bản tin Single Opt-In** (nhận thư thẳng mà không cần bấm link Confirm trong Gmail) nhằm làm ấm/kích hoạt hộp thư mới.

---

## 1. Mục tiêu & Tổng quan Kiến trúc

Module cho phép nhân sự nhập một email (thường là email tạo mới cho Idol/tài khoản TikTok) và kích hoạt nhận bản tin định kỳ chỉ với 1 click. Hệ thống sử dụng kiến trúc **Hybrid Backend + Client Fallback**:
1. **Ưu tiên Serverless / Local Server (`POST /api/auto-subscribe`):** Client thử gọi tuần tự `/api/auto-subscribe` (Vercel) -> `http://localhost:3000/api/auto-subscribe` (`server/server.mjs`). Server thực hiện đầy đủ quy trình fetch trang chủ lấy CSRF/nonce token trước khi POST, nên biết chính xác từng nguồn thành công/thất bại (`HTTP 200` + body match).
2. **Fallback Client-side Form Dispatcher (`dispatchSingleOptInForm`):** Nếu cả hai API endpoint đều không phản hồi (chạy mở file `mail_activator.html` trực tiếp từ ổ cứng), trình duyệt tự tạo `<form>` + `<iframe>` ẩn trong `#hiddenDispatchContainer` kết hợp `fetch(..., { mode: 'no-cors' })` gửi lần lượt từng nguồn cách nhau `400ms`.

---

## 2. Danh sách 11 Nguồn Single Opt-In & 4 Cơ Chế Gửi

Danh sách `SINGLE_OPT_IN_PUBLICATIONS` gồm đúng **11 nguồn** thuộc 4 `type` xử lý:

1. **`type: 'pardon'` (7 nguồn WordPress Pardon plugin):**
   - `Word Daily` (`https://worddaily.com`)
   - `Word Smarts` (`https://wordsmarts.com`)
   - `Interesting Facts` (`https://interestingfacts.com`)
   - `Inspiring Quotes` (`https://inspiringquotes.com`)
   - `Better Report` (`https://betterreport.com`)
   - `History Facts` (`https://historyfacts.com`)
   - `Crossword Club` (`https://crosswordclub.com`)
   - *Backend flow:* `GET` domain HTML tách regex `"pardon_nonce":"([^"]+)"`, rồi `POST` tới `/wp-admin/admin-ajax.php` (`action=pardon_subscribe_handler`, `form_identifier=home-subscribe`, `sub_source=organic`, kiểm tra HTTP 200 & text chứa `"200"`).
2. **`type: 'pardon_refresh'` (1 nguồn):**
   - `House Outlook` (`https://houseoutlook.com`)
   - *Backend flow:* `POST` `/wp-admin/admin-ajax.php` với `action=pardon_refresh_nonces` lấy `data.pardon_nonce`, sau đó gửi `pardon_subscribe_handler`.
3. **`type: 'nicenews'` (1 nguồn):**
   - `Nice News` (`https://nicenews.com`)
   - *Backend flow:* `GET` trang chủ lấy regex `"nonce":"([^"]+)"`, sau đó `POST` `/wp-admin/admin-ajax.php` (`action=nicenews_subscribe`, `sub_source=web+organic`, kiểm tra HTTP 200 & text chứa `"true"`).
4. **`type: 'webflow'` (2 nguồn):**
   - `Good Headlines` (`https://goodheadlines.com`, `siteId: "667b03af4c96fb4374afa400"`, `formName: "Email Form"`, `emailField: "Email"`)
   - `Movie Brief` (`https://moviebrief.com`, `siteId: "665df7b51f919f2ee06528d8"`, `formName: "Email Form 1"`, `emailField: "Email 1"`)
   - *Backend flow:* `POST` thẳng `https://webflow.com/api/v1/form/${siteId}` (`name`, `fields[${emailField}]`, `fields[source]=organic`, kiểm tra HTTP 200 & text chứa `"ok"`).

---

## 3. Giao diện & Chức năng Frontend (`mail_activator.html`)

- **Nhập & Kiểm tra Email (`getValidatedEmail`, `appendDomain`):** Ô `#targetEmail` (hỗ trợ nhấn `Enter` để chạy), validate regex `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, có nút điền nhanh đuôi email qua `appendDomain(domain)`.
- **Terminal Theo Dõi Realtime (`#terminalPanel`):**
  - Log từng bước vào `#terminalLogs` (`addLog` với tag `RUN`, `OK`, `INFO`).
  - Thanh tiến trình `#progressBarFill` & `#terminalProgressText`.
- **Hiển thị Thẻ Nguồn (`renderSources`):** Render 11 card trong `#sourcesGridContainer` kèm icon, tần suất nhận thư, danh mục.
- **Hoàn tất:** Bắn pháo giấy `confetti()`, hiện `#toastContainer` (`showToast`, không dùng `alert`), đổi nút `#btnAutoRun` sang trạng thái cho phép kích hoạt email khác.

---

## 4. Server Cục Bộ & CLI (`server/server.mjs`, `server/auto_subscribe.mjs`)

- **`server/server.mjs`:** Pure Node.js `http` server (không phụ thuộc npm packages ngoài), mặc định cổng `3000` (hoặc `process.env.PORT`), bật CORS `*`, route `/` mặc định phục vụ `mail_activator.html`, ngăn path traversal, phục vụ API `POST /api/auto-subscribe`.
- **`server/auto_subscribe.mjs`:** Export `SINGLE_OPT_IN_PUBLICATIONS` & `subscribeAll(email)`, đồng thời hỗ trợ chạy trực tiếp từ CLI: `node server/auto_subscribe.mjs <email>`.

---

## 5. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ đủ cả 11 nguồn Single Opt-In** và đồng bộ 100% giữa `mail_activator.html`, `api/auto-subscribe.js`, và `server/auto_subscribe.mjs` (đặc biệt đúng `siteId`, `formName`, `emailField` của Webflow và `pardon` / `pardon_refresh` / `nicenews` action).
2. **Giữ nguyên cơ chế 2 tầng (Dual Dispatch):** Thử `/api/auto-subscribe` (gọi qua `AbortController` timeout **6s**) -> `http://localhost:3000/api/auto-subscribe` -> fallback HTML form/iframe ẩn + `no-cors` fetch trên client, đồng thời giữ `escapeHtml` và `sanitizeHttpUrl` cho domain hiển thị.
3. **Giữ regex validate email chặt chẽ** ở cả frontend, Vercel API, và `server/server.mjs` (trả HTTP 400 nếu sai định dạng).
4. **Giữ `server/server.mjs` zero-dependency** (chỉ dùng built-in `http`, `fs`, `path`, `url`) để các file `.bat` khởi chạy tức thì trên mọi máy công ty.
