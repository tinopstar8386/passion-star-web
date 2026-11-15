# Đặc tả kỹ thuật — Backend Google Apps Script (`scripts/2FA_Service.gs` & `scripts/SyncDashboard.gs`)

- **File nguồn:**
  - `scripts/2FA_Service.gs` (~1,243 dòng)
  - `scripts/SyncDashboard.gs` (~1,419 dòng)
- **Mục đích:** Toàn bộ mã nguồn Google Apps Script chạy phía Google Sheets backend cho 2 phân hệ trọng yếu: (1) Dịch vụ Quản lý Tài khoản, OTP Gmail, Thiết bị & Bot Zalo cho `2fa.html`; (2) Hệ thống tự động hóa `KPI_DASHBOARD`, đóng băng báo cáo tháng và clone sheet `DATA` theo tháng cho Google Sheets vận hành Passion Star.

---

## 1. Đặc tả `scripts/2FA_Service.gs` (Backend cho `2fa.html`)

### 1.1. Cấu hình & Xác thực
- **`SPREADSHEET_ID`:** `"1YzG8IsQnJ8sKMovRxj2XmL3Xb7SU9SByjTHET6eYk1w"`.
- **`VALID_AUTH_HASH`:** `"11fbfb0a6a696da38da248f9568be2c32c43bd89812696fccc1d068ba41b8bf5"` (SHA-256 digest chuẩn để kiểm tra `authHash` cho các action đọc/ghi nhạy cảm).

### 1.2. Entry Points & Tập Hàm Chính (`da90871`)
- **`getMasterSpreadsheet()`**: Mở Google Spreadsheet chuẩn theo `SPREADSHEET_ID`.
- **`doPost(e)` & `doGet(e)` -> `handleAppScriptRequest(e)`**: Entry point xử lý đồng bộ cả HTTP GET (`?req=...`) lẫn HTTP POST từ Vercel `/api/proxy` và `2fa.html`.
- **`getSheetData(sheetName)`**: Đọc dữ liệu bảng động trên sheet `"Tkhoan"` (hỗ trợ đủ 6 khu vực menu tabs, cột ghép/header động).
- **`updateDeviceToMasterSheet(targetEmail, targetTiktok, targetName, newDeviceString)`**: Cập nhật trực tiếp cột thiết bị về sheet `"Tkhoan"`.
- **`getConfigDevices()`**: Nạp danh sách thiết bị chuẩn từ sheet `"Config"`.
- **`getEmailVerificationCode(targetEmail)`**: Quét Gmail tìm mã OTP xác minh mới nhất cho email mục tiêu.
- **`checkEmailForwardStatus(targetEmail)`**: Kiểm tra tình trạng chuyển tiếp (Forward) Gmail từ tài khoản đích.
- **`logDeviceAction(account, actionType, device)`**: Ghi nhật ký thao tác nhận/trả thiết bị vào sheet `"Device_Logs"`.
- **`saveColumnWidths(widths)` & `getColumnWidths()`**: Lưu/đọc cấu hình độ rộng cột bảng.

> *(Ghi chú đồng bộ commit `da90871`: Nhánh code Zalo Bot thử nghiệm trước đây đã được gỡ bỏ khỏi `scripts/2FA_Service.gs` để tối ưu độ ổn định cho luồng proxy `doGet`/`doPost` và lấy OTP Gmail).*

---

## 2. Đặc tả `scripts/SyncDashboard.gs` (Tự động hóa Google Sheets KPI)

### 2.1. Menu & Trigger Tự Động (`onOpen`, `onEdit`)
- `onOpen()`: Tạo menu **"⭐ KPI PASSION STAR"** với các mục gồm: Lưu trữ & Đóng băng Sheet tháng hiện tại (`luuTruDashboardDongBang`), Lưu dữ liệu KPI cột F & G (`luuKpiDashboardThuCong`), Hiện/Ẩn sheet `_KPI_TARGET_DB` (`toggleDbSheetVisibility`), chuyển tháng (`chuyenSangThangMoiTuDong`), đồng bộ (`dongBoDashboardChuanDep`).
- `onEdit(e)` trên sheet `"KPI_DASHBOARD"`:
  1. **Khi sửa ô `B1` (chọn tháng mới):** Lưu KPI tháng cũ (`saveAllCurrentDashboardKpi`) -> đóng băng `KPI_DASHBOARD` tháng cũ (`archiveDashboardSheet`) -> tự clone sheet `DATA <tháng mới>` từ tháng trước nếu chưa tồn tại (`cloneDataSheetForNewMonth`).
  2. **Khi sửa Cột F (cột 6 — Target KPI) hoặc Cột G (cột 7 — Basic KPI):** Gọi `handleKpiCellEdit` ghi ngay vào cơ sở dữ liệu ngầm `_KPI_TARGET_DB`.

### 2.2. Cấu hình 6 Nhóm & Golden Anchors
- `DEFAULT_TEAMS_CONFIG` (thứ tự: `ANGELIK`, `FASHION`, `ORION`, `ROYEN:ONE`, `MIRACLE`, `ELRIS`) với Target KPI, Basic KPI và danh sách `defaultIdols` mặc định.
- `TEAM_ANCHORS` định vị vị trí gốc của 6 nhóm trong sheet `DATA`:
  - Top row (`A2:A37`): `FASHION` (`B2:H37`), `ROYEN:ONE` (`W2:AE37`), `ELRIS` (`AR2:AW37`).
  - Bottom row (`A44:A79`): `ANGELIK` (`B44:H79`), `MIRACLE` (`W44:AC79`), `ORION` (`AR44:AY79`).

### 2.3. Quét Động, Đồng Bộ & Chuyển Tháng
1. **`scanAllTeamsDynamic(dataSheet)`:** Quét lưới `DATA`, lọc bỏ hàng số/ngày tháng (`isNumericOrDate`, `isHeaderNoise`, `isTotalCol`) để nhận diện chính xác danh sách Idol (bao trọn cả cột `CARROT` / cột `TOTAL`), xác định dòng `TOTAL` và dòng `KPI SALARY` (`LÃNH LƯƠNG NGÀY 10` / `DAY 10`).
2. **`dongBoDashboardChuanDep(isAuto)`:**
   - Tạo và ẩn bảng phụ trợ ở cột `V3:Y9` (`SHEET NAME`, `Range Bảng`, `Cột tổng`, `Cột KPI`) dùng công thức `MATCH` + `INDIRECT`.
   - Format header `C1:O2` động theo tên tháng tiếng Anh hiện tại & tháng trước (`JANUARY`..`DECEMBER`), cài công thức KPI + Tăng/Giảm + Lãnh lương Ngày 10 + Đạt KPI + Conditional Formatting (`rulePass`/`ruleFail`), sau đó lưu config vào `_KPI_TARGET_DB`.
3. **`archiveDashboardSheet(ss, monthStr)` & `cloneDataSheetForNewMonth(ss, oldMonthStr, newMonthStr)`:**
   - Nhân bản `KPI_DASHBOARD` thành `NOV.2026` (hoặc `KPI_T11.2026`) và Paste Values để đóng băng lịch sử vĩnh viễn.
   - Nhân bản sheet `DATA` cũ thành `DATA T12.2026`, giữ 100% tên Idol, màu viền, và công thức `TOTAL`/`KPI`/`KPI SALARY`, đồng thời dọn sạch số liệu coins ngày cũ (31 ngày) sẵn sàng nhập mới.
   - `chuyenSangThangMoiTuDong()` điều phối toàn bộ quy trình chuyển tháng bằng hộp thoại xác nhận UI của Google Sheets.

---

## 3. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ nguyên `SPREADSHEET_ID`, `VALID_AUTH_HASH`, và cấu trúc tên sheet `"Tkhoan"`, `"Config"`, `"Device_Logs"` trong `2FA_Service.gs`, bảo toàn đầy đủ tập hàm `doGet`/`doPost`/`handleAppScriptRequest` hiện hành.
- [ ] Không đưa token hay giá trị bí mật thực tế vào mã nguồn Apps Script hoặc tài liệu.
- [ ] Trong `SyncDashboard.gs`, bảo toàn `TEAM_ANCHORS`, logic quét động tránh nhiễu số/date ở `scanAllTeamsDynamic`, và thứ tự 3 bước trong `chuyenSangThangMoiTuDong` (Lưu DB -> Archive Paste Values -> Clone DATA sạch coins).
