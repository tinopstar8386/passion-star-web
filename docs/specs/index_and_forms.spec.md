# Đặc tả Kỹ thuật Nhóm Module: Cổng Điều Hướng, Biểu Mẫu Nội Bộ & AnimateKit

Nhóm module này bao gồm trang chủ cổng ứng dụng (`index.html`), hai biểu mẫu hành chính/chấm công (`bbbangiao.html`, `log.html`), và thư viện hiệu ứng giao diện nội bộ (`animate-showcase.html`, `animate-kit/animate-kit.js`, `animate-kit/animate-kit.css`).

---

## 1. Cổng Ứng Dụng Trung Tâm (`index.html` — 548 dòng)

- **Tiêu đề:** `Passion Star | Workspace Hub` (Dark mode `#050505`, font `Plus Jakarta Sans`, FontAwesome 6.4.0, Favicon `./icon/index.svg`).
- **Backend Task Manager:** `GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxHmvzqzOR8vFcLRGNZDQJ5HAI2kUku5Khk_mhCfEe8qMSA9K2-kZkegT4pxTQJncjFWQ/exec"`.

### 1.1. Các Thành phần & Chức năng
1. **Đồng hồ Thời gian thực (`updateClock`):** Cập nhật mỗi giây (`1000ms`) định dạng `HH:MM:SS` (`#clock-time`) và thứ/ngày tiếng Việt (`#clock-date`).
2. **Tìm kiếm Ứng dụng Realtime (`filterApps`):** Lọc danh sách `.app-card` theo thuộc tính `data-name` (gõ không phân biệt hoa thường trên `#searchInput`).
3. **Danh mục 17 Liên kết Module chính thức (`target="_blank"`):**
   - Nhóm Quản trị & Tài khoản: `2fa.html`, `dashboard.html`, `control.html`, `log.html`.
   - Nhóm Vận hành & Quy trình: `timeline.html`, `off.html`, `loichuc.html`, `sop.html`, `chamdiem.html`, `bbbangiao.html`.
   - Nhóm Media & Tracker: `idol_tracker.html`, `task_media.html`.
   - Nhóm Mua sắm & Tồn kho Makeup: `tonmakeup.html`, `tonkhomakeup.html`.
   - Nhóm Tiện ích & Tài chính: `money.html`, `mail_activator.html`, `smartpaste.html`.
4. **Task Manager gắn Google Sheets (`fetchTasks`, `renderTasks`, `addTask`, `completeTask`):**
   - `GET ?action=getTasks` tải công việc tồn đọng, tự động đánh dấu cảnh báo `.late` (`⚠️ Trễ hạn`) nếu quá `deadline` so với hiện tại.
   - `POST` (`mode: 'no-cors'`, action `addTask` và `completeTask`), đợi `1500ms`/`1000ms` rồi gọi lại `fetchTasks()`. *(Lưu ý: `addTask`/`completeTask` trong bản cũ đang dùng `alert()`, cần thay bằng `showToast` nếu nâng cấp).*

---

## 2. Biên Bản Bàn Giao Tài Sản (`bbbangiao.html` — 413 dòng)

- **Tiêu đề:** `Biên Bản Bàn Giao Tài Sản` (Favicon `./icon/bbbangiao.svg`).
- **Backend:** `API_URL = "https://script.google.com/macros/s/AKfycbzJARso-HssEoSGf70vLpPNH42A64LZLneS9uTmc8KEZqyhZ3Wx8AJaXoSXJXlonUYE/exec"` (`POST text/plain;charset=utf-8`, action `processHandoverData`).

### 2.1. Bố cục Chuẩn In A4 & Nghiệp vụ
- Thiết kế mô phỏng khổ giấy `.page-a4` (`210mm x 297mm`, font `Times New Roman`, `13pt`) kèm CSS `@media print` tự động ẩn `.no-print`, nút thao tác, đường gạch input và chống ngắt trang vùng `.signatures` (`break-inside: avoid`).
- **Đồng bộ Ngày tự động (`updateDateText`):** Mặc định lấy ngày hôm nay cho `#handoverDate`, đồng thời cập nhật đồng loạt tiêu đề đầu trang (`#hdrDay`/`#hdrMonth`/`#hdrYear`), dòng mở đầu (`#textDay`/`#textMonth`/`#textYear`), và câu hiệu lực cuối trang (`#footerDate`).
- **Danh sách Bên giao / Bên nhận động (`addPerson`, `removePerson`, `syncNames`):** Hỗ trợ thêm/xóa nhiều đại diện (bắt buộc giữ tối thiểu 1 người mỗi bên). Khi nhập tên `.giver-name` / `.receiver-name`, hàm `syncNames()` tự động phản chiếu danh sách tên ngăn cách dấu phẩy vào `#introGiver`, `#inlineGiver`, `#introReceiver`, và vùng chữ ký cuối trang (`#signGiverContainer`, `#signReceiverContainer`).
- **Bảng Tài sản bàn giao động (`#assetBody`, `addRow`, `removeRow`, `updateSTT`):** Tự động đánh lại STT, hỗ trợ thêm/xóa hàng (tối thiểu 1 hàng).
- **Định dạng Tiền tệ & Đọc Tiền Tiếng Việt (`formatCurrency`, `docTien`, `docHangTrieu`, `docBlock`, `docHangChuc`):** Tự động format dấu chấm phân cách nghìn (`vi-VN`) cho `#totalNum` bằng `BigInt`, và đọc chính xác thành chữ tiếng Việt tới hàng nghìn tỷ (lên tới 15 chữ số) vào ô readonly `#totalText` (hậu tố `" đồng chẵn."` nếu chia hết 1000, ngược lại `" đồng."`).
- **Nút In & Lưu (`window.print()`, `submitData()`):** Gom toàn bộ danh sách tài sản dạng text đánh số, bên giao/nhận, ngày, số chứng từ (`#docNumber`), tổng tiền số & chữ gửi lên GAS.

---

## 3. Báo Cáo In/Out Trợ Lý (`log.html` — 255 dòng)

- **Tiêu đề:** `Báo Cáo In/Out Trợ Lý` (Bootstrap 5.3, Bootstrap Icons, Google Fonts `Poppins`).
- **Backend:** Dùng chung endpoint `control.html` (`https://script.google.com/macros/s/AKfycbzILZR3B37f9LK0yT3H2JhJ6trzfYsOZiIB23NwonqxntWOXM7IT6UFEYLKcyf3uSeU/exec`) thông qua shim `google.script.run`.

### 3.1. Chức năng & Luồng xử lý
- **Theme & Toast:** Lưu Light/Dark theme (`data-theme`) trong `localStorage` key `formTheme` (`toggleTheme`); hiển thị thông báo `.cyber-toast` kèm thanh progress (`showToast`, không dùng native alert).
- **Tải Team & Idol (`window.onload`, `handleTeamChange`, `handleIdolChange`):**
  - Gọi `getGroupsData()` nạp danh sách Team vào `#teamSelect`, tự động chèn thêm tùy chọn đặc biệt `"__NO_TEAM__"` (`[Idol Mới] Chưa có Team / Chưa phân Team`).
  - Khi chọn Team, nạp danh sách Idol thuộc Team vào `#idolSelect` kèm tùy chọn cuối `"__CUSTOM_IDOL__"` (`➕ Tự nhập tên Idol khác...`) mở ô `#customIdolGroup`.
- **Gửi Báo cáo (`submitLog`):** Chọn Tên Trợ Lý (`#assistantName`), Team, Idol, và Trạng thái `"Đăng Nhập Acc (In)"` hoặc `"Đăng Xuất Acc (Out)"`; gọi `webSubmitLog(payload)`. Thành công/thất bại ẩn `#logCard`, hiện `#resultCard` kèm nút `resetForm()`.

---

## 4. Thư viện Hiệu ứng UI (`animate-kit/` & `animate-showcase.html`)

### 4.1. Thư viện Lõi (`animate-kit/animate-kit.js` — 499 dòng & `animate-kit/animate-kit.css` — 117 dòng)
Thư viện UMD zero-dependency gắn vào `window.AnimateKit`, tự động khởi chạy `AnimateKit.init()` khi DOM ready trên các phần tử có thuộc tính `data-animate`:
1. **`AnimateKit.gravityStars(target, config)`** (`data-animate="gravity-stars"`, `data-gravity="attract"|"repel"`, `data-stars-count`): Canvas nền sao chuyển động, hút hoặc đẩy hạt theo con trỏ chuột (có hàm `.setGravity()` đổi chế độ runtime).
2. **`AnimateKit.magnetic(target, config)`** (`data-animate="magnetic"`, `data-magnetic-strength`): Hiệu ứng nút nam châm hút nhẹ theo vị trí chuột.
3. **`AnimateKit.tilt(target, config)`** (`data-animate="tilt"`, `data-tilt-max`): Hiệu ứng nghiêng thẻ 3D mượt (`perspective` + `rotateX`/`rotateY`).
4. **`AnimateKit.counter(target, targetNumber, config)`** (`data-animate="counter"`, `data-counter-target`): Chạy số đếm tăng mượt / rolling digits (`.animateKit-counter-roll`).
5. **`AnimateKit.typewriter(target, words, config)`** (`data-animate="typewriter"`, `data-words`): Gõ/xóa luân phiên mảng từ vựng.
6. **`AnimateKit.ripple(target)`** (`data-animate="ripple"`): Sóng lan tỏa CSS `.animateKit-ripple` khi click.
7. **Hiệu ứng thuần CSS trong `animate-kit.css`:** `[data-animate="shimmer"]` / `.animate-shimmer`, `[data-animate="glow-border"]` / `.animate-glow-border` (viền gradient xoay `conic-gradient`).

### 4.2. Trang Demo (`animate-showcase.html` — 656 dòng)
- Minh họa tương tác tất cả 7 hiệu ứng của `AnimateKit` (`toggleGravity()`, `reRunCounter()`) kèm snippet hướng dẫn tích hợp vào React và HTML/JS thuần.

---

## 5. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **`index.html`:** Giữ đầy đủ **17 thẻ `.app-card` với đúng `href` và `data-name` tìm kiếm** (bao gồm `money.html`), đồng hồ realtime 1s, và kết nối `GOOGLE_SCRIPT_URL` cho Task Manager (`getTasks`, `addTask`, `completeTask`).
2. **`bbbangiao.html`:** Giữ định dạng in A4 (`.page-a4`, `@media print`), đồng bộ ngày 3 vị trí (`updateDateText`), thêm/xóa người đại diện & tự điền vùng chữ ký (`syncNames`), hàm đọc tiền tiếng Việt `BigInt` (`formatCurrency` + `docTien`), và payload `processHandoverData`.
3. **`log.html`:** Giữ đúng 2 lựa chọn đặc biệt `"__NO_TEAM__"` và `"__CUSTOM_IDOL__"` giúp trợ lý khai báo nhanh Idol mới, theme key `formTheme`, và `webSubmitLog`.
4. **`animate-kit`:** Giữ chuẩn UMD + `AnimateKit.init()` tự quét `data-animate` cho toàn bộ 6 module JS và 2 hiệu ứng CSS thuần (`shimmer`, `glow-border`).
