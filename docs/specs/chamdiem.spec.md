# Đặc tả Kỹ thuật Module: Form Chấm Điểm Tiếng Anh Idol (`chamdiem.html`)

- **File chính:** `chamdiem.html` (850 dòng)
- **Backend đi kèm:** Google Apps Script `https://script.google.com/macros/s/AKfycbxy35dWIMnsYvfNFNcw74APgTOTTgfCXDOjz2MsQvUwRJ1EEu4xLIKQ7Uvo7vZB2Ute/exec`
- **Mục đích:** Bảng chấm điểm thi kiểm tra Tiếng Anh hàng tháng cho Idol từ 2 Giám khảo (J1 & J2) + kết quả Livestream (`LS`), hỗ trợ chế độ riêng tư cho MC (`?role=mc`), sinh điểm ngẫu nhiên/chính xác, và xuất ảnh PNG / PDF Song ngữ Việt–Trung (có chế độ tiết kiệm mực Ink Saver & bản tóm tắt Compact).

---

## 1. Mục tiêu & Tổng quan Kiến trúc

`chamdiem.html` giao tiếp với Google Apps Script thông qua `runScript(action, payload)` (POST `text/plain;charset=utf-8`), quản lý danh sách Idol gom theo Team (`group-cell` với `rowSpan`), cho phép chấm 12 đầu điểm thành phần (6 tiêu chí x 2 Giám khảo), tự động tính trung bình và phân định `PASS` / `FAILED`.

### Công nghệ & Giao diện:
- **Thư viện:** `html2canvas@1.4.1`, `jsPDF@2.5.1`, Google Fonts `Inter`.
- **Giao diện bảng Sticky:** Cố định đồng thời 2 hàng header (`.header-row-1` ở `top: 0`, `.header-row-2` ở `top: 59px`) và 2 cột trái (`.group-cell` ở `left: 0`, `.name-cell` ở `left: 110px`).
- **Thông báo & Modals:** Dùng `showToast(msg, keep, isError)` và 6 glass/overlay modal (`#addIdolModal`, `#deleteIdolModal`, `#clearAllModal`, `#exportConfigModal`, `#randomizerModal`, `#linkGeneratorModal`) — không dùng native `alert()`/`confirm()`.

---

## 2. Chế độ Phân Quyền qua URL (`role=mc` & `idols`)

- Đọc query string:
  - `ROLE_PARAM = urlParams.get('role')`: Khi `role=mc`, gắn `body.classList.add('mc-mode')`: **ẩn hoàn toàn các cột Giám khảo 2 (`.judge-2`)**, các phần tử `.hide-mc`, toàn bộ modal/nút `.admin-only`, và nút xóa Idol `.delete-btn` — giúp MC chỉ chấm/xem phần được phép.
  - `SELECTED_IDOLS_PARAM = urlParams.get('idols')`: Lọc chỉ render đúng danh sách Idol được chỉ định (phân cách dấu phẩy, decode URI).
- Công cụ **Tạo Link Gửi MC (`openLinkModal`, `generateLink`, `copyGeneratedLink`):** Admin tích chọn các Idol muốn giao, hệ thống tự sinh URL `?role=mc&idols=...` dựa trên `window.location.origin + window.location.pathname`.

---

## 3. Thuật Toán Chấm Điểm & Randomizer (`calculateRow`, `#randomizerModal`)

### 3.1. Cơ cấu 12 Ô Điểm & Công thức Tổng
Mỗi thí sinh có 12 ô `.score-input` chia đều cho 2 Giám khảo (J1: index `0..5`, J2: index `6..11`), mỗi bên chấm 6 tiêu chí với trọng số tối đa `[20, 20, 20, 20, 10, 10]` (tổng tối đa 100 điểm/giám khảo):
1. Phát âm (`phatam`, max 20)
2. Diễn đạt (`diendat`, max 20)
3. Câu từ (`cautu`, max 20)
4. Ứng biến (`ungbien`, max 20)
5. Ngữ pháp (`nguphap`, max 10)
6. Từ vựng (`tuvung`, max 10)

- **Tính điểm (`calculateRow`):** Tự động kẹp giá trị nhập trong `[0, max]`. Tổng điểm cuối `finalScore = (sumJ1 + sumJ2) / 2` (làm tròn 1 chữ số thập phân, bỏ `.0`).
- **Ngưỡng đạt:** `finalScore >= 70` -> `PASS` (kèm phụ đề Trung `合格` khi xuất file); `< 70` -> `FAILED` (`不合格`).
- **Cột Livestream (`toggleLS`):** Click trực tiếp vào ô `.ls-col` để xoay vòng `""` -> `"PASS"` -> `"FAILED"` -> `""`.

### 3.2. Bộ Sinh Điểm Thông Minh (`#randomizerModal`)
- `generateRandomScores(isPass)`: Tự động điền ngẫu nhiên 12 ô điểm theo dải `75%–100%` (nếu Pass) hoặc `20%–65%` (nếu Fail) và đồng bộ trạng thái `LS`.
- `generateExactScore()`: Nhập một mức điểm trung bình mục tiêu (`0–100`), hệ thống phân bổ ngẫu nhiên trọng số vào 12 tiêu chí sao cho tổng đúng bằng `Math.round(targetAverage * 2)` trong giới hạn `[0, maxes[i]]`, rồi tự đặt `LS` theo ngưỡng `>= 70`.

---

## 4. Các Chức năng Quản Lý & Xuất Báo Cáo PNG / PDF

- **Tải & Lưu (`refreshData`, `submitScores`):** Tải via `getInitialData`; gửi danh sách dòng có dữ liệu lên GAS qua action `saveScores` (`payloadStr`).
- **Quản lý Idol (`submitNewIdol`, `executeDeleteIdol`, `executeClearAll`):** Thêm Idol vào Team có sẵn hoặc Team tùy chỉnh (`CUSTOM`), xóa Idol kèm modal xác nhận `#deleteIdolModal`, hoặc xóa trắng bảng điểm qua `#clearAllModal`.
- **VIP Team Badges:** Tự động gắn pill gradient cho `ANGELIK`, `FASHION`, `ROYEN:ONE`, `BNART`, `ORION`, `BEE`.
- **Xuất Báo Cáo Song Ngữ (`executeExport`, `#exportConfigModal`):**
  - Chọn danh sách Idol cần xuất, loại bảng (`full` hoặc `compact` qua class `export-compact` ẩn cột điểm chi tiết), định dạng (`png`, `pdf`, `pdf_eco` bật class `ink-saver-mode` tiết kiệm mực), hướng giấy (`landscape` / `portrait`).
  - **Kỹ thuật bảo toàn `rowSpan` khi lọc dòng xuất:** Trước khi chụp `html2canvas`, code tháo `.group-cell` của các dòng thuộc từng Team, gán lại `rowSpan = teamsMap[t].visible.length` vào dòng hiển thị đầu tiên của Team đó; sau khi chụp xong khôi phục nguyên trạng `rowSpan` và DOM ban đầu.
  - Hiện tiêu đề xuất tháng trước (`Tháng / 月份: pMonth/pYear`) và nhãn tiếng Trung (`.cn-text`, `.badge-cn`).

---

## 5. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ chế độ `?role=mc&idols=...`:** Khi `role=mc` phải ẩn `.judge-2`, `.hide-mc`, `.admin-only`, `.delete-btn` và lọc đúng Idol trong `idols`.
2. **Giữ đúng cấu trúc 12 cột điểm (6 tiêu chí x 2 GK, max `[20,20,20,20,10,10]`), công thức `(sumJ1 + sumJ2) / 2`, và ngưỡng `PASS >= 70`.**
3. **Giữ đúng tên field payload gửi GAS (`saveScores`):** `j1_phatam`, `j1_diendat`, `j1_cautu`, `j1_ungbien`, `j1_nguphap`, `j1_tuvung`, `j2_*`, `total`, `livestream_result`, `result`.
4. **Giữ logic khôi phục `rowSpan` của `.group-cell` trong `executeExport()`** khi lọc một phần Idol xuất PNG/PDF, cùng chế độ `export-compact` và `ink-saver-mode`.
5. **Giữ `generateExactScore()`** phân bổ chính xác 12 tiêu chí khớp điểm mục tiêu, và nút xoay vòng `PASS`/`FAILED` cột `LS`.
