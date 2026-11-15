# Đặc tả kỹ thuật — `off.html` & `mcform.html` (Hệ thống Quản Lý Lịch Nghỉ OFF & Cổng Đăng Ký Nhân Sự)

- **File nguồn:**
  - `off.html` (~10,557 dòng, Trang Quản Trị Lịch Nghỉ / Phép)
  - `mcform.html` (~2,286 dòng, Cổng Đăng Ký Lịch OFF theo Nhóm / Cá nhân cho MC, Idol, Media)
- **Công nghệ:** Vanilla HTML/CSS/JS + Firebase 10/11 Firestore (`passionstar-2014d`) + Flatpickr + `html2canvas` + GAS Fallback.

---

## 1. Kiến trúc dữ liệu chung (Firebase Firestore & GAS Backend)

- **Firebase Project:** `passionstar-2014d`
- **Các Collections & Documents trong Firestore:**
  - `off_employees`: Hồ sơ nhân sự gốc (`name`, `group`, `role`, `customBadge`). Document ID dùng `safeID(empName)`.
  - `off_month_employees/{YYYY-MM}`: Danh sách nhân sự áp dụng riêng cho từng tháng (hỗ trợ sao chép/chốt danh sách tháng mới).
  - `off_leaves/{safeName}_{YYYY-MM-DD}`: Từng ngày nghỉ (`name`, `role`, `date`, `status`: `"Approved" | "Pending"`, `offType`: `'FULL' | 'HALF' | 'SPECIAL'`, `swapFrom`, `reason`). Hỗ trợ kiểm tra cả `safeRef` và `rawRef`.
  - `off_groups`: Danh sách & thuộc tính nhóm.
  - `system_config/general`: Cấu hình chung gồm `quotas` (`{ "YYYY-MM": number }`), `badges` (tên & màu huy hiệu), `trafficGroups` (danh sách nhóm lưu lượng), `customGroups`.
- **Google Apps Script API Fallback (`API_URL`):**
  - `https://script.google.com/macros/s/AKfycbxXGOJkbgCgmBl1QxQ4qbJVIIp1fz_yJglRPLLNiG3DLdZJjJCs0Bpmpwn4LfEz7AR5/exec` — dùng bởi `callAPI(action, payload)` bên cạnh thao tác trực tiếp Firestore.

---

## 2. Đặc tả chi tiết `off.html` (Trang Quản Trị)

### 2.1. Xác thực PIN Admin & Realtime Thông báo
- **Xác thực PIN 4 số (`ADMIN_PIN_CODE = "0908"`):**
  - Kiểm tra qua `isAdminAuthorized()` & `checkAdminAuthOnLoad()` đọc `sessionStorage['ps_admin_auth'] === "true"`.
  - Chủ động xóa `localStorage.removeItem("ps_admin_auth")` để phiên không dính vĩnh viễn qua nhiều lần đóng trình duyệt.
  - Mở overlay `#adminPinLockOverlay` (keypad `#pindot-0..3`, `enterPinDigit`, `deletePinDigit`, `clearAllPin`). Cho phép gán callback `pendingAdminAction` (ví dụ `saveBulkChanges()`) để thực thi ngay sau khi nhập đúng PIN (`grantAdminAuth()`).
- **Thông báo Realtime (`initRealtimeLeaveNotifications()`):**
  - Gắn `fs.onSnapshot(fs.collection(db, "off_leaves"))`, bỏ qua snapshot khởi tạo đầu tiên (`isInitialSnapshotSkipped`), bỏ qua khi `isSyncing === true`.
  - Chỉ bật Toast + âm thanh (`playNotificationSound()`) trên PC (`!isMobileView()`), phân loại thông báo: xin nghỉ mới, yêu cầu đổi lịch (`swapFrom -> date`), đăng ký nhiều ngày, hoặc hủy đơn `Pending`.

### 2.2. Quản lý Nhóm Lưu Lượng (Traffic Groups) & Nhóm Hiển thị
- Mặc định `trafficGroupsData = ["ORION", "ROYEN:ONE"]`, lưu trong `system_config/general`.
- `isTrafficGroup(groupNameOrKey)` kiểm tra so khớp chuẩn hóa chuỗi in hoa; `toggleGroupTraffic(groupKey)` trong `#trafficManagerModal` chuyển đổi qua lại giữa Nhóm Lưu Lượng ("Không off trên Timeline") và Nhóm Thường, gọi `callAPI('saveTrafficGroups', ...)`.
- `getGroupDisplayInfo(grpKey)` ánh xạ tên nhóm sang Team phụ trách:
  - `ORION`, `ANGELIK` -> Team Thầy Ken
  - `ROYEN:ONE`, `FASHION` -> Team Cô U
  - `MIRACLE`, `BEE` (tự nhận diện `ELRIS` nếu có nhân sự tên/nhóm Elris), `BNART`/`VNART` -> Team Thầy Dino
  - `MEDIA` / `GIMBAL` -> Bộ Phận Media.

### 2.3. Chỉnh sửa hàng loạt, Đổi lịch & Duyệt đơn
- **Hàng đợi nháp (`draftQueue`) & `saveBulkChanges()`:**
  - Thao tác thêm/xóa ngày nghỉ (`FULL` / `HALF` / `SPECIAL`) hoặc gán badge (`type === 'BADGE'`) tích lũy vào `draftQueue`, hiển thị preview trực tiếp trước khi Admin bấm Lưu (`saveBulkChanges`).
  - `saveBulkChanges()` kiểm tra PIN Admin -> gọi `callAPI('processBatchChanges', { payloadStr, monthStr, currentListSnapshot })` -> batch write lên `off_employees`, `off_leaves`, `off_month_employees`.
- **Chế độ chọn nhanh (`ps_quick_leave_mode` trong `localStorage`):** mặc định `'FULL'`.
- **Kéo-thả đổi ngày (`drag`, `allowDrop`, `dragLeave`, `drop`):** Gọi `executeConfirmedMove(dragName, oldDate, newDate)` để dời ngày nghỉ cùng một nhân sự sang ngày mới.
- **Duyệt / Từ chối đơn (`requestAction`, `approveAll`):**
  - Mở `#customModal` duyệt hoặc từ chối từng đơn `Pending` / từ chối yêu cầu đổi ngày `swapFrom`.
  - `approveAll()` duyệt toàn bộ đơn `Pending` và tự động xóa ngày nghỉ cũ (`l.swapFrom`) khỏi danh sách khi đơn đổi lịch được chấp nhận.
- **Ghi chú lý do & Nhập liệu Custom:**
  - `#leaveNoteModal`: Ghi chú lý do nghỉ (đặc biệt T7/CN) với 5 preset nhanh ("Gia đình", "Đám cưới", "Ốm đau", "Sếp duyệt", "Việc riêng").
  - `#customInputModal`: Modal nhập liệu thay thế 100% `window.prompt()`.

### 2.4. Quản lý Nhân sự, Quota, Huy hiệu & Mobile Smart View
- Đầy đủ modal quản trị: `#groupManagerModal`, `#addEmployeeModal`, `#editEmployeeModal`, `#deleteEmployeeModal`, `#copyMonthModal`, `#badgeLibraryModal`, `#allPersonLinksModal` (tổng hợp link cá nhân `?group=PERSON:<Tên>` gửi MC).
- `saveQuota()`: Lưu định mức ngày nghỉ tháng (`currentMonthQuota`) qua `callAPI('updateQuota', { monthStr, quota })` -> `system_config/general.quotas`.
- **Giao diện Mobile:** `renderMobileSmartView()` hiển thị dạng thẻ chip theo ngày (`off`, `half-day`, `special`, `pend`, `swap`, `draft-del`) cùng `#mobileEmpCalendarModal` & bottom sheet `#mobileAdminSheet`.

### 2.5. Xuất ảnh lịch nghỉ chất lượng cao (`executeCustomExport`)
- Dùng `#exportModal` kết hợp **Flatpickr** chọn khoảng ngày (`mode: "range"`, locale `"vn"`).
- Chế độ xuất theo Nhóm (`ALL`, `ROLE:*`, `GROUP:*`) dùng `buildTableExportHTML`, hoặc xuất dạng lịch vuông 1 người (`CUSTOM` đúng 1 tên) dùng `buildCalendarExportHTML`.
- Render off-screen qua `html2canvas` (scale `2x` trên mobile, `3x` hoặc `devicePixelRatio * 2` trên PC). Trên iOS/Mobile mở `#iosImagePreviewModal` để người dùng nhấn giữ lưu ảnh; trên PC tự động tải file `LichNghi_<Group>_<start>_den_<end>.png`.

---

## 3. Đặc tả chi tiết `mcform.html` (Cổng Đăng Ký MC / Nhân Sự)

1. **Điều hướng theo URL Parameter (`TARGET_GROUP`):**
   - Link mẫu: `?group=GROUP:<TênNhóm>` hoặc `?group=PERSON:<TênNhânSự>`.
   - Nếu thiếu `?group=`, `renderTable()` hiển thị màn hình khóa hướng dẫn liên hệ Admin lấy link nhóm.
   - Tự động chuyển sang giao diện lịch cá nhân hình vuông nguyên tháng (`renderInteractiveCalendar`) nếu `TARGET_GROUP` bắt đầu bằng `PERSON:`, hoặc nếu nhóm chỉ có đúng `1` nhân sự khớp.
2. **Tiêu đề nhóm động:** Chuẩn hóa hiển thị (VD: `ORION` -> `"Team Thầy Ken - Nhóm Orion (Lưu lượng)"`, `ROYEN` -> `"Team Cô U - Nhóm Royen:One (Lưu lượng)"`).
3. **Chọn nhiều ngày & Gửi / Hủy đơn hàng loạt:**
   - Hỗ trợ chọn nhiều ô ngày chưa nghỉ vào `selectedCells` -> `#customModal` (`showConfirmModal`) -> `executeMultipleLeaves()` gọi `callAPI('registerMultipleMCLeaves', { leaveRequests })`, tạo đơn trạng thái `Pending` trên `off_leaves`.
   - Hỗ trợ chọn nhiều đơn đang `Pending` vào `selectedCancelCells` -> `showConfirmCancelModal()` -> `executeMultipleCancels()` gọi tuần tự `callAPI('cancelPendingMC', { name, dateStr })` để rút đơn.
   - Dùng blocker toàn màn hình `toggleBlocker()` và toast `showToast(..., isBoom)` (thay hoàn toàn native popup).

---

## 4. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ khóa PIN Admin `'0908'` trong `off.html`, lưu `sessionStorage['ps_admin_auth']` và xóa khỏi `localStorage`.
- [ ] Giữ listener realtime `off_leaves` trên desktop (không bắn toast liên tục trên mobile) và bỏ qua khi `isSyncing`.
- [ ] Bảo toàn phân loại Nhóm Lưu Lượng (`ORION`, `ROYEN:ONE`, cấu hình động qua `system_config/general.trafficGroups`) và `safeID(name) + '_' + date` khi đọc/ghi `off_leaves`.
- [ ] Trong `mcform.html`, bảo toàn chế độ auto-calendar cho `PERSON:` hoặc nhóm 1 người, và xác nhận multi-select đăng ký/hủy đơn `Pending` qua `#customModal`.
- [ ] Không dùng `alert`/`confirm`/`prompt` native.
