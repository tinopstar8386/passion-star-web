# Đặc tả Kỹ thuật Module: Admin KPI Dashboard (`dashboard.html`)

- **File chính:** `dashboard.html` (1,200 dòng)
- **Backend đi kèm:** Google Apps Script `https://script.google.com/macros/s/AKfycbxWZMMP-Vjp88qYVm3cO5hdITBcS6HolulxY2wqYqhW89Sie23JDrwIWE0aAu0GkJQ2/exec` (kết hợp đồng bộ sheet qua `scripts/SyncDashboard.gs`)
- **Mục đích:** Bảng điều khiển Admin theo dõi KPI doanh thu (Coins) theo ngày và tháng của toàn bộ công ty, bảng xếp hạng Top Idol ngày/tháng, trang vinh danh Podium + pháo hoa, và chi tiết từng nhóm livestream.

---

## 1. Mục tiêu & Tổng quan Kiến trúc

`dashboard.html` kết nối trực tiếp tới Google Apps Script Web App (`runScript(action, payload)`) qua `POST` với `Content-Type: text/plain;charset=utf-8`. Dữ liệu sau khi tải được cache theo khóa tháng/ngày trong `DATA_CACHE` để chuyển tab mượt mà tức thì, hỗ trợ ép tải lại qua nút Làm mới (`forceSync`).

### Công nghệ & Giao diện:
- **Vanilla HTML/CSS/JS**, Dark/Light theme (`theme` trong `localStorage`, `initTheme`, `toggleTheme`, `updateThemeIcon`), Tailwind CSS, FontAwesome icons.
- Hiệu ứng chạy số tăng dần `animateAllNumbers()` và hiệu ứng pháo hoa (`triggerFireworks()` dùng `canvas-confetti`) tại chế độ Vinh danh.

---

## 2. Cấu trúc Điều hướng & 3 Chế độ Hiển thị Chính

### 2.1. Sidebar & Bộ lọc Kỳ / Ngày
- **`#month-selector` (`changeMonth`):** Nạp danh sách tháng khả dụng từ `getAvailableMonths` lúc khởi tạo (`initApp`). Khi đổi tháng, tự động đồng bộ lại `#date-selector` (mặc định ngày hiện tại nếu trùng tháng hiện hành, ngược lại ngày `01` của tháng đó), xóa `DATA_CACHE`, và gọi `forceSync()`.
- **`#date-selector` (`changeDate`):** Chọn ngày chi tiết `YYYY-MM-DD`; nếu ngày thuộc một tháng khác tồn tại trong `#month-selector`, tự động đồng bộ `currentMonthValue` theo tháng tương ứng.
- **Menu chuyển View (`updateMenuUI`):**
  1. `DASHBOARD` (`loadMainDashboard`)
  2. `CHÚC MỪNG 🎉` (`loadCongratsView`)
  3. 6 Nhóm cố định (`loadGroup(groupKey, btnElement)`): `group1` (**FASHION**), `group2` (**BETERNAL**), `group3` (**ANGELIK**), `group4` (**BNART**), `group5` (**ASTRAX**), `group6` (**BEE**).
- **`#sidebar-ranking`:** Hiện Top 5 Idol trong ngày & Top 5 Idol của tháng khi ở màn Dashboard chính; tự xóa rỗng khi xem chi tiết từng Group.

### 2.2. View 1: Tổng quan Dashboard (`loadMainDashboard` / `renderMainDashboard`)
- Gọi action `getDashboardOverview` (`{ monthValue, selectedDate }`).
- Hiển thị Top Team Tháng, Top Idol Tháng, Top Team Ngày, Top Idol Ngày, Tổng Coin Ngày, và bảng tổng hợp toàn công ty (`augData`) với `rowspan` tự động gộp cho 5 cột đầu thuộc mỗi Team (`c <= 4`), tô màu trạng thái:
  - `OFF` / `NOT DEBUT`: nền xám nổi bật.
  - `PASS`: nền xanh lá.
  - `FAIL`: nền xám chữ đậm.
  - Chỉ số phần trăm tăng `▲` (xanh lá) / giảm `▼` hoặc âm `-` (đỏ).
- Hàng footer `TOTAL` tính tổng cho các cột chỉ số `[1, 2, 3, 4, 6, 7, 8, 9, 11]`.

### 2.3. View 2: Bảng Vinh Danh Chúc Mừng (`loadCongratsView` / `renderCongratsView`)
- Phân hạng toàn bộ Idol đạt mốc trong ngày theo thứ tự `coins` giảm dần:
  - **Đại sảnh Danh vọng (Podium Top 1 – Top 2 – Top 3)** cho các Idol có điểm dương.
  - **4 Phân tầng thẻ vinh danh (`>= 30,000` Coins):** `list200k` (`>= 200k`), `list100k` (`100k–199k`), `list50k` (`50k–99k`), `list30k` (`30k–49k`). Nếu chưa có ai đạt `30,000` Coins -> hiển thị thẻ thông báo rỗng.
- Kích hoạt hiệu ứng bắn pháo hoa 2.5 giây (`triggerFireworks`).

### 2.4. View 3: Chi tiết Nhóm (`loadGroup` / `renderGroupDashboard`)
- Gọi action `getGroupData` (`{ groupKey, monthValue }`).
- Tự động sắp xếp lại các cột Idol theo tổng điểm dòng `TOTAL` giảm dần từ trái qua phải, tính thứ hạng `TOP 1` (vàng rực), `TOP 2` (bạc), `TOP 3` (đồng) và thẻ tổng nhóm (`TỔNG NHÓM`) kèm tooltip hiển thị tỷ lệ `Tổng đạt được / KPI`.
- Format rút gọn số (`>= 1000` thành `k`) cho thẻ và tooltip hiện số chính xác.
- Bảng dữ liệu ngày trong tháng tự tô màu theo ngưỡng coin/ngày:
  - `>= 100,000`: nền hồng/đỏ đậm (`bg-rose-500`)
  - `>= 50,000`: nền xanh cyan
  - `>= 30,000`: nền xanh lá
  - `OFF` / `NOT DEBUT`: nền xám
- Giữ cố định các hàng chân bảng `TOTAL`, `KPI`, `NEED` cuối bảng.

---

## 3. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ đúng 3 action GAS** (`getAvailableMonths`, `getDashboardOverview`, `getGroupData`) và định dạng payload `{ action, payload }` qua `text/plain;charset=utf-8`.
2. **Giữ đúng 6 khóa nhóm** (`group1` FASHION, `group2` BETERNAL, `group3` ANGELIK, `group4` BNART, `group5` ASTRAX, `group6` BEE) và cơ chế tự động sắp xếp cột Idol giảm dần theo `TOTAL` trong `renderGroupDashboard`.
3. **Giữ các ngưỡng màu vinh danh & bảng ngày** (`30k`, `50k`, `100k`, `200k`), `rowspan` cho 5 cột đầu bảng tổng (`c <= 4`), và hàng footer `TOTAL`, `KPI`, `NEED`.
4. **Giữ `DATA_CACHE` kèm đồng bộ 2 chiều** giữa `#month-selector` và `#date-selector`.
