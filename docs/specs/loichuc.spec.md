# Đặc tả Kỹ thuật Module: Workspace Chúc Mừng Idol (`loichuc.html`)

- **File chính:** `loichuc.html` (1,447 dòng)
- **Backend Proxy đi kèm:** `api/proxy-loichuc.js` (33 dòng, Vercel Serverless Function)
- **Mục đích:** Tạo, tùy biến và quản lý trạng thái gửi lời chúc mừng Idol đạt mốc điểm (Coin Tier) theo ngày, tối ưu copy định dạng chuẩn cho Zalo.

---

## 1. Mục tiêu & Tổng quan Kiến trúc

`loichuc.html` tải danh sách Idol vừa cán mốc điểm từ Google Sheets theo từng ngày, tự động ghép một mẫu lời chúc ngẫu nhiên không trùng lặp phù hợp với cấp mốc điểm, hỗ trợ chỉnh sửa trực tiếp, bật/tắt nhắc Trợ Lý, copy định dạng Rich HTML + plain text tương thích Zalo/Safari, bắn pháo giấy ăn mừng theo cấp độ, và đồng bộ trạng thái `pending` / `done` ngược lại Google Sheets.

### Công nghệ & Tích hợp:
- **Frontend:** Vanilla HTML/CSS/JS, FontAwesome/SVG/Emoji, `canvas-confetti@1.6.0`, `air-datepicker@3.3.5` (cấu hình locale tiếng Việt `localeVi`, `firstDay: 1`, `dateFormat: 'yyyy-MM-dd'`).
- **Endpoint Proxy:** `API_URL = "/api/proxy-loichuc"` (`api/proxy-loichuc.js` chuyển tiếp POST `text/plain;charset=utf-8` kèm chống double-stringify sang Google Apps Script `https://script.google.com/macros/s/AKfycbyUnPauRyR_pxZqK4DKPlPc_LmM3uRzhA0W7S0KIgmj1je9hIl4ye5KKZ2_oQmCsgFY/exec`).
- **Thông báo & Lỗi:** Không dùng native `alert()`/`confirm()`, dùng `#toast-container` (`showToast`, `clearAllToasts`) và `renderErrorBox()`. Hỗ trợ Dark/Light mode qua `toggleTheme()` (`light-mode`).

---

## 2. Dữ liệu, Phân cấp Mốc (Tiers) & Giao diện

### 2.1. Phân cấp Ngân hàng Mẫu Câu (Templates)
Hệ thống chia 4 kho mẫu câu theo mốc số trong `getTemplatesForTier(tier)`:
- **`msgsLegend`** (`val >= 300`, tức mốc >= 300K)
- **`msgsVip`** (`val >= 100`, tức mốc 100K–299K)
- **`msgsMid`** (`val >= 50`, tức mốc 50K–99K)
- **`msgsStart`** (mặc định / `< 50K` hoặc không phải số)

### 2.2. Bảng màu & Hiệu ứng theo Mốc (`getTierStyle(t)`)
- `>= 500K`: `#ec4899`, class `epic-500k`, icon `👑`
- `>= 300K`: `#ef4444`, class `epic-300k`, icon `🔥`
- `>= 200K`: `#a855f7`, class `epic-200k`, icon `💎`
- `>= 100K`: `#fbbf24`, class `epic-100k`, icon `⭐`
- `>= 60K`: `#0ea5e9`, class `epic-60k`, icon `✨`
- `>= 50K`: `#3b82f6`, class `epic-50k`, icon `🚀`
- `>= 40K`: `#3b82f6`, icon `🚀`
- `>= 30K`: `#10b981`, icon `🌱`
- Khác: `#64748b`, icon `🎯`

Biến CSS `--ambient-color` trên `document.body` tự động đổi theo thẻ có mốc cao nhất đang hiển thị ở tab `pending`.

### 2.3. Các thành phần UI chính
- **Tab chuyển đổi (`changeTab`):** `pending` (Chưa chúc, `#tab-pending` / `#count-pending`, có chấm `#dot-new`) và `done` (Đã chúc, `#tab-done` / `#count-done`).
- **Thanh lọc & Sắp xếp (`populateFilters`):** Chọn ngày qua `#datePicker` (AirDatepicker), lọc theo mốc (`#tierFilter`), sắp xếp tăng/giảm theo `coinRaw` (`#sortSelect`), và nút làm mới `forceRefreshData()`.
- **Thẻ Tạo Nhanh (`#quick-create-card` / `#manual-card-container`):** Chỉ hiển thị ở tab `pending`. Nhập `#manual-name`, `#manual-tier` (`handleTierInput` lọc số, `handleTierChange` tự quy đổi `>= 1000` -> `tierK + "K"`), bật/tắt `#manual-assistant`, đổi mẫu `forceChangeManual()`, và copy `copyManual()`.
- **Danh sách Thẻ Idol (`#app`, `renderCards`):**
  - Ở `pending`: Hiển thị tên Idol, badge mốc, toggle Trợ Lý (`toggleAssistant`), điểm coin, `<textarea id="msg-${item.id}">` cho phép sửa trực tiếp, nút **Copy** (`handleCopy`) và **Đổi chúc** (`changeMessage`).
  - Ở `done`: `<textarea readonly>`, nút **Copy Lại** (`copyOnly`) và **Hoàn tác** (`handleUndo`).

---

## 3. Đặc Tả Chi Tiết Nghiệp Vụ

### 3.1. Đồng bộ Google Sheets & Auto-Polling
- **Tải lần đầu (`loadInitialData`):** Gọi `runScript('getInitialData')` -> `initApp(response)`. Nếu thiếu sheet ngày hôm đó -> gọi `renderErrorBox()` hướng dẫn kiểm tra sheet `"Form chúc T..."` hoặc chọn ngày khác.
- **Đổi ngày (`requestChangeDate` / `fetchDateFromSheet`):** Hiện skeleton card rồi gọi `runScript('changeDateAndFetchData', { dateString })`.
- **Polling ngầm (`silentRefresh`):** `setInterval` mỗi **300,000ms (5 phút)** gọi `runScript('pollCurrentData')`. Nếu phát hiện số bản ghi tăng lên so với `currentData.length`, bật chấm đỏ `#dot-new` và hiện toast thông báo có Idol mới cán mốc.

### 3.2. Thuật toán Gán Lời Chúc Không Trùng & Format Zalo
- **`assignUniqueMessage(item)`:** Lọc các `templateIndex` đã được dùng bởi các Idol khác cùng nhóm template trong `currentData`; ưu tiên chọn ngẫu nhiên trong danh sách chưa dùng để tránh trùng lời chúc trong cùng ngày.
- **`formatWishForZalo(template, name, tier, withAssistant)`:**
  - Chèn tên Idol in đậm `*name*`, mốc `*tier*`, và cụm trợ lý tùy theo `withAssistant`.
  - Tách câu bằng regex để tạo cấu trúc 3 phần chuẩn Zalo:
    1. Khối Quote Header (`> *Hook*` + câu chứa tên/mốc nếu có).
    2. Thân vinh danh (`mid`).
    3. Câu kết in đậm giữ nguyên emoji đuôi (`*text* emoji`).

### 3.3. Copy Rich HTML cho Zalo, Pháo Giấy & Ghi Nhận Sheets
- **`copyToClipboard(text, tierColor)` & `fallbackCopySafari(text)`:** Tạo đồng thời `text/html` (tô màu nhấn cho đoạn `*bold*`, định dạng quote/paragraph) và `text/plain` vào Clipboard; dùng `fallbackCopySafari` nếu trình duyệt Safari hạn chế `ClipboardItem`.
- **`handleCopy(...)`:**
  - Copy nội dung đang có trong textarea (giữ cả phần người dùng sửa tay).
  - Bắn pháo giấy `confetti()` tùy biến theo tier (`epic-100k` dùng star vàng, `epic-500k` nổ dày đặc 100 hạt...).
  - Cập nhật UI lạc quan (Optimistic UI) chuyển thẻ sang tab `done`, đồng thời gọi `runScript('markAsCopied', { row, col, dateString })`.
- **`handleUndo(...)`:** Chuyển thẻ về `pending` và gọi `runScript('unmarkAsCopied', { row, col, dateString })`.

### 3.4. Điều Hướng Bàn Phím
- Ở tab `pending` (khi không focus vào `INPUT`/`TEXTAREA`), hỗ trợ phím mũi tên (`ArrowRight`/`ArrowDown`, `ArrowLeft`/`ArrowUp`) để di chuyển `.key-focus` qua các `.card-nav` và nhấn `Enter` để kích hoạt `.btn-do-copy`.

---

## 4. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ đúng Proxy `/api/proxy-loichuc` và `api/proxy-loichuc.js`** với header `text/plain;charset=utf-8`, bảo vệ timeout **20s** bằng `AbortController`, hàm `escapeHtml`, và xử lý chống double-stringify khi gọi GAS.
2. **Giữ nguyên 4 kho template (`msgsStart`, `msgsMid`, `msgsVip`, `msgsLegend`)**, ngưỡng mốc `getTemplatesForTier` (`300`, `100`, `50`), và thuật toán chống trùng `assignUniqueMessage`.
3. **Giữ nguyên bộ định dạng Zalo (`formatWishForZalo` + `copyToClipboard` Rich HTML + `fallbackCopySafari`)**, đặc biệt là cấu trúc quote `>`, `*bold*`, và bảo toàn emoji đuôi.
4. **Giữ AirDatepicker tiếng Việt (`localeVi`, `yyyy-MM-dd`)**, auto-polling 5 phút (`300000ms`), Optimistic UI cho `markAsCopied` / `unmarkAsCopied`, và thẻ Tạo nhanh (`manualState`).
5. **Giữ điều hướng bàn phím mũi tên + `Enter`** ở tab `pending` và hiệu ứng Confetti / `--ambient-color` theo mốc cao nhất.
