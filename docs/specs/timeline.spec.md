# Đặc tả kỹ thuật — `timeline.html` (Bảng Chia Giờ & Timeline Sự Kiện / Hàng Ngày)

- **File nguồn:** `timeline.html` (~3,840 dòng, Vanilla HTML/CSS/JS + Firebase 10.8.1 Firestore + `html2canvas` + `jsPDF`)
- **Mục đích:** Công cụ chia giờ ca quay/live cho các nhóm Idol hàng ngày và chia phòng cho Timeline Thi Đấu/Sự Kiện, tự động đồng bộ 2 chiều qua Firebase Cloud và liên kết trực tiếp dữ liệu nhân sự/nghỉ phép từ `off.html` để gạch/tắt nhóm nghỉ (trừ Nhóm Lưu Lượng).

---

## 1. Kiến trúc dữ liệu & Đồng bộ Firebase 2 chiều

- **Firebase Project:** `passionstar-2014d` (Firebase SDK v10.8.1).
- **Firestore Documents & Collections:**
  - `system_config/timeline_event`: Trạng thái tab Lịch Thi Đấu (`eventTitle`, `mode` số phòng, `colWidth`, `date`, `footer`, `pdfOrientation`, `showMakeupRoom`, `roomsData`, `lastUpdated`).
  - `system_config/timeline_daily`: Trạng thái tab Lịch Hàng Ngày (`teams[]` với `name`, `shift`, `makeupStart`, `duration` mặc định fallback `40`, `liveDelay` mặc định fallback `5` từ `DEFAULT_DAILY_TEAMS`, `room`, `calcMode`, `isActiveOriginal`, `isTraffic`; cùng `activeStatus`, `timingMode`, `allParallelTime`, `dateSelect`, `datePickerVal`, `customDateText`, `footer`, `pdfOrientation`, `showDailyMakeupRoom`, `lastUpdated`).
  - `timeline_teams/{team.name}`: Lưu thứ tự kéo thả (`order`), phòng gán (`room`), hỗ trợ đổi tên nhóm đồng bộ Cloud (`updateTeamNameFirebase`: tạo doc mới với payload mới rồi xóa doc cũ).
  - Đọc liên kết từ module OFF: `off_employees`, `off_leaves`, `off_groups`, `system_config/general` (`trafficGroups`).
- **Google Apps Script API (`API_URL`):** `https://script.google.com/macros/s/AKfycbzcmLF9VvArtI_mp2hcCZnXXtgOOGUpDOZDe57pWfFCMJzU_jR7D7Qj99GJ7qTGDFy9qA/exec`.
- **`localStorage` Keys:**
  - `ps_timeline_event_data` (`LOCAL_STORAGE_KEY_EVENT`)
  - `ps_timeline_daily_data` (`LOCAL_STORAGE_KEY_DAILY`)
  - `ps_timeline_active_tab` (`LOCAL_STORAGE_KEY_ACTIVE_TAB`)
  - `ps_timeline_global_headers` (`LOCAL_STORAGE_KEY_HEADERS`)
  - `ROOM_DEFAULT_MIGRATION_KEY`: Đánh dấu đã migrate phòng mặc định 1 lần.
- **Chiến lược Merge Timestamp (`initFirebaseTimeline`):**
  - So sánh `lastUpdated` giữa Firestore và `localStorage`: nếu `remoteTime > localTime` thì ghi đè từ Cloud xuống UI; nếu `localTime > remoteTime` (hoặc Cloud chưa có) thì đẩy ngược từ Local lên Cloud.
  - Khi người dùng chỉnh sửa trên UI, `autoSaveEventTimeline()` / `autoSaveDailyTimeline()` lưu tức thì vào `localStorage` và debounce `1500ms` trước khi gọi `setDoc(..., { merge: true })` (trừ nút **💾 Lưu Ngay** gọi `immediateFirestore = true`).

---

## 2. Liên kết tự động Lịch Nghỉ OFF & Nhóm Lưu Lượng

1. **Nhận diện Nhóm Lưu Lượng (`isTrafficGroup`):**
   - Nạp từ `system_config/general.trafficGroups` và `off_groups` (`isTraffic === true`), mặc định gồm `ORION` và `ROYEN:ONE`.
   - Trong `checkTeamOffStatusForDate()`, nếu `team.isTraffic === true`, **luôn bật `activeStatus[index] = true`** (nhóm nhiều người xoay ca nên không bị OFF cả nhóm trên Timeline).
2. **Kiểm tra ngày nghỉ cho Idol/Nhóm đơn lẻ (`isTeamOffOnDate(teamName, targetDateStr, leaves)`):**
   - Ánh xạ từ khóa chuẩn hóa theo từng nhóm: `elris`/`bee`, `bnart`/`vnart`, `royen`/`royenone`, `orion`, `angelik`, `fashion`, `miracle`.
   - Khớp nhân sự thuộc bộ phận Livestream (`eRole.includes('LIVE')`) trong `globalOffEmployees`.
   - Chỉ tính các đơn `Approved` hoặc `Pending` trùng `date === targetDateStr`, bỏ qua đơn đang chờ đổi đi (`l.swapFrom === targetDateStr`).
   - **Quy tắc bảo vệ bắt buộc:** Tuyệt đối bỏ qua đơn nghỉ của `TEACHER`, `MANAGER`, `MEDIA`, `ACCOUNTANT`, `HR` để việc giáo viên (Ken, U, Dino) nghỉ phép không làm tắt nhầm nhóm Idol trên Timeline.

---

## 3. Tính năng Lịch Hàng Ngày & Lịch Thi Đấu

1. **Tab Lịch Hàng Ngày (`renderDailyTable`, `renderToggles`):**
   - Hỗ trợ quy tắc tính giờ nối tiếp cho từng team qua `cycleTeamCalcMode(index)`: xoay 3 chế độ `'auto'` (Tự động theo phòng) -> `'same'` (⚡ Cùng giờ) -> `'next'` (➕ Cộng tiếp).
   - Kéo-thả đổi thứ tự hàng trên bảng Daily (`startDragDailyTable` -> `dropDailyTable`) tự động gọi `saveNewOrderToFirebase(teams)` lưu trường `order`.
   - Đổi tên nhóm bằng custom modal `#ps-edit-team-name-modal` (`#psCloseTeamModalBtn`, `#editTeamNameInput`, `#psSaveTeamNameBtn`), lưu đồng bộ lên collection `timeline_teams`.
   - Custom Date Picker (`openCustomDatePicker`, `renderCustomCalendarGrid`, `quickSelectPickerDate`) cho phép chọn nhanh Hôm nay / Ngày mai / ngày tùy chọn để tự check trạng thái OFF.
2. **Tab Lịch Thi Đấu (`renderRoomsConfig`, `generateEventTable`):**
   - Chọn số phòng (`modeSelect`), nhập tên phòng, tài khoản, mốc giờ `Vô ca` / `Makeup` / `Live`, và dán danh sách Idol theo từng dòng trong textarea (`updateRoomListTextarea`).
   - Cho phép kéo-thả Idol chéo giữa các phòng (`startDragCrossEvent`, `dropCrossEvent`) và tự đồng bộ lại textarea tương ứng (`syncTextareasFromData`).
   - Tự chuyển layout giữa `buildDesktopEventTableHTML()` (PC) và `buildMobileStackedEventTableHTML()` (Mobile).

---

## 4. Xuất Ảnh HD, Copy Clipboard & PDF A4 Fit 1 Trang

1. **`renderPCQualityCanvas(id, isEcoMode)` + `captureAndDownloadImage`:** Tạo canvas độ phân giải chuẩn PC (ngay cả khi thao tác trên iPhone/mobile) rồi tải về file PNG `Timeline_<timestamp>.png`.
2. **`copyToClipboard(id, btnId)`:** Render canvas -> `Blob('image/png')` -> ghi trực tiếp ảnh vào clipboard bằng `navigator.clipboard.write([new ClipboardItem(...)])`, báo lỗi hướng dẫn bấm **Ảnh HD** nếu trình duyệt không hỗ trợ.
3. **`captureAndDownloadPDF(id, btnId, defaultText, orientationSetting, isEcoMode)`:**
   - Hỗ trợ `'portrait'`, `'landscape'`, hoặc `'auto'` (tự chọn Ngang nếu `canvas.width / canvas.height >= 1.15`).
   - Dùng `jsPDF` khổ `a4`, lề `margin = 6mm`, ép `scale = Math.min(printableW / canvas.width, printableH / canvas.height)` đảm bảo **bất kể bảng dài bao nhiêu luôn vừa trọn 1 trang A4 duy nhất, không bao giờ tràn sang trang 2**.
4. **Hộp thoại & Chủ đề:** Dùng `toggleTheme()`, `showToast()`, và `showGlassConfirm()` (Glassmorphism Confirm Modal — không dùng `alert`/`confirm`/`prompt` native).

---

## 5. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ nguyên logic sync 2 chiều bằng `lastUpdated` giữa `localStorage` (`ps_timeline_event_data`, `ps_timeline_daily_data`) và `system_config/{timeline_event,timeline_daily}` + `timeline_teams`.
- [ ] Giữ quy tắc lọc `isTeamOffOnDate` (không tính `TEACHER`, `MANAGER`, `MEDIA`, `ACCOUNTANT`, `HR`; bỏ qua `swapFrom`; nhóm Lưu Lượng luôn active).
- [ ] Bảo toàn công thức ép fit **1 trang A4** của `captureAndDownloadPDF` và render chuẩn PC trên mobile.
- [ ] Không dùng `alert`/`confirm`/`prompt` native.
