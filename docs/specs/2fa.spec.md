# Đặc tả Kỹ thuật Module: Hệ thống Tra cứu Tài khoản & 2FA Security (`2fa.html`)

- **File chính:** `2fa.html` (4,790 dòng)
- **Backend đi kèm:** `scripts/2FA_Service.gs` (Google Apps Script, 1,243 dòng) và `api/proxy.js` (Vercel Serverless Proxy)
- **Phạm vi dữ liệu:** Spreadsheet ID `1YzG8IsQnJ8sKMovRxj2XmL3Xb7SU9SByjTHET6eYk1w` (sheet `Tkhoan`, `Config`, `Device_Logs`) + Firebase Firestore `passionstar-2014d` (collection `2fa_cache`)

---

## 1. Mục tiêu & Tổng quan Kiến trúc

Module `2fa.html` là hệ thống quản lý tập trung toàn bộ tài khoản TikTok của công ty (phân chia theo các Team/Trạng thái), hỗ trợ sinh mã TOTP 2FA trực tiếp trên trình duyệt theo chuẩn RFC 6238, lấy mã OTP xác minh từ Gmail theo thời gian thực, kiểm tra trạng thái Forward Mail về hộp thư trung tâm, quản lý gán thiết bị/nhân sự mượn máy (bao gồm chế độ `[TẠM]` và cảnh báo 1 ngày cho Prime Radiant), quét trùng lặp tài khoản, và kiểm soát bảo mật nhiều lớp.

### Các nguyên tắc thiết kế cốt lõi:
- **Vanilla HTML/CSS/JS** trong 1 file duy nhất (`2fa.html`), dùng Tailwind CSS CDN, FontAwesome 6.5.1, CryptoJS 4.1.1, Google Fonts `Inter`.
- **Dark Mode Glassmorphism** mặc định (`theme` / `ps_theme`), hỗ trợ toggle theme nhưng ép viền lưới dark mode (`#334155` / `#283548` với `border-collapse: separate`).
- **Dual Rescue & Offline Fallback:** Mọi lời gọi API đều ưu tiên `API_URL = "/api/proxy"` -> fallback sang JSONP trực tiếp `GAS_DIRECT_URL` (`runScriptJSONP`) -> fallback đọc/ghi cache offline trên Firebase Firestore collection `2fa_cache`.
- **Zero Native Popup:** Tuyệt đối không dùng `alert()`, `confirm()`, `prompt()`. Dùng `showToast()` và hệ thống modal kính mờ (`#deviceModal`, `#scanModal`, `#forwardModal`, `#deviceAuditLogModal`).

---

## 2. Kiến trúc Dữ liệu & Endpoints

### 2.1. Endpoints & Services
- **Primary Proxy:** `API_URL = "/api/proxy"` (POST JSON -> `api/proxy.js` chuyển thành GET sang GAS).
- **Direct GAS Fallback:** `GAS_DIRECT_URL = "https://script.google.com/macros/s/AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec"` (gọi qua `runScriptJSONP` với callback động + `cleanup`).
- **Firebase Project:** `passionstar-2014d` — sử dụng Firestore `doc`, `setDoc`, `getDoc` trên collection `"2fa_cache"` (`syncCurrentSheetToFirebase`).

### 2.2. Cấu trúc 6 Tab & Ánh xạ Vùng Dữ liệu (trên sheet `Tkhoan`)
Thứ tự cố định 6 tab trong UI (`switchTab`):
1. **`Passion Star`** -> vùng dữ liệu Passion Star (`A123:J145`, kết thúc tại `"End Data"`).
2. **`Prime Radiant`** -> vùng Prime Radiant (`A108:J120`).
3. **`Idol Team`** -> vùng Idol Team (`A51:J93`, tự động fill-down tên Team xuống các dòng gộp ô).
4. **`Acc Idol mới`** -> vùng Acc Idol mới (`M51:U69`, kết thúc tại `"Account on Agency"`).
5. **`Velion`** -> ánh xạ nội bộ sang `'Velion Technologies'` (`A96:J105`).
6. **`Acc Idol Retire`** -> vùng Acc Idol Retire (`W3:AN106`, gồm 2 bảng song song `W:AE` và `AF:AN`).

> Backend `2FA_Service.gs` sử dụng anchor scanning động kết hợp row fallback an toàn nên tự thích nghi khi chèn/xóa dòng trên sheet `Tkhoan`.

### 2.3. LocalStorage Keys
- `theme`, `ps_theme`: lưu chế độ sáng/tối.
- `forward_mail_status_cache`: cache trạng thái đã check Forward của từng email.
- `prime_radiant_alarms`: lưu cảnh báo thiết bị quá hạn 1 ngày của nhóm Prime Radiant.
- `device_audit_logs_local`: lưu nhật ký thao tác thiết bị cục bộ hiển thị trong `#deviceAuditLogModal`.
- Cấu hình độ rộng cột bảng: lưu/khôi phục qua `saveColumnWidths()` / `getColumnWidths()`.

---

## 3. Lớp Bảo Mật & Màn Hình Khóa (`#loginScreen`)

### 3.1. Cơ chế Cô lập DOM & Trạng thái Khóa
- `#loginScreen` có `position: fixed !important; inset: 0; z-[99999]`.
- Quy tắc CSS isolation bắt buộc: `#loginScreen:not(.hidden) ~ #authenticatedAppContent { display: none !important; }` — đảm bảo nội dung tài khoản không bao giờ lộ ra kể cả khi có glitch render trước khi JS chạy xong.
- Hiệu ứng nền Matrix `#loginMatrixCanvas`: dùng tập ký tự `MATRIX_CHARS`, màu đồng nhất `rgba(99, 102, 241, 0.25)`, gọi `initMatrixBackground()` / `renderMatrix()` / `resizeCanvas()`, và phải tắt bằng `stopMatrixBackground()` ngay khi đăng nhập thành công (`proceedToMainScreen()`).

### 3.2. Xác thực PIN & Stealth Pass Trigger
- **Xác thực PIN chuẩn (`checkLogin`):** Mã hóa SHA-256 (`sha256` / CryptoJS) chuỗi nhập vào và so khớp với hash `sessionPass`.
- **Stealth Pass Trigger (`#stealthPassTrigger`):**
  - Lấy ngẫu nhiên từ `STEALTH_POOL` (56 ký tự `"23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"`), đặt ngẫu nhiên vào 4 góc `STEALTH_CORNERS` (không đặt mồi nhử / decoys).
  - Bấm đúng chuỗi mở khóa qua `executeStealthUnlock()`.
  - **Chống spam (`handleStealthFailure`, `triggerAntiSpamLockout`):** Nếu click liên tiếp sai nhịp `< 450ms` với `streak >= 2`, khóa nút/trigger trong 3 giây.

### 3.3. Tự Động Khóa & Boss Key
- **Auto-lockout:** Bộ đếm không hoạt động (`resetTimer()` đếm 300 giây, kèm `IDLE_LIMIT_MS` 15 phút kiểm tra qua `pingUserActivity()`); hết hạn sẽ gọi `lockApp()`.
- **Boss Key (`toggleBossKey`, `populateBossGrid`):** Nhấn `Ctrl + F1` hoặc `Ctrl + \`` (backtick) để bật/tắt lớp ngụy trang `#bossCamouflageOverlay` che toàn màn hình bằng bảng số liệu giả lập.

---

## 4. Giao diện, Bố cục & Trải nghiệm Mobile

### 4.1. Layout Desktop & Sticky Header
- CSS root dùng `overflow-x: clip !important` (tuyệt đối không phá `position: sticky`).
- Hàng lọc `#dirFilterRow` và `#mainTable thead` neo dính cố định theo biến CSS `--top-nav-height` và `--combined-sticky-top`, được tính động qua `syncStickyHeaderTop()`.
- **Bảng chính 8 cột (tổng 100%)** với khả năng kéo dãn độ rộng (`initResizableColumns`, `applySavedWidths`):
  1. Checkbox chọn hàng loạt (`3%`)
  2. Team (`9%`, `getTeamBadgeHtml`)
  3. Email & Lấy mã (`21%`)
  4. Pass TikTok (`18%`)
  5. Idol / Kênh (`13%`, hỗ trợ copy TikTok ID qua `copyTiktokId` và badge dịch vụ `getServiceLogoHtml`)
  6. Thiết bị (`18%`, icon `getDeviceIconClass`, sửa/xóa inline hoặc mở `#deviceModal`)
  7. Đại lí (`6%`)
  8. Mã 2FA Live OTP (`12%`)
- **Loading Skeleton:** `generateSkeletonHTML()` render 7 dòng skeleton giữ nguyên bố cục khi đang tải/chuyển tab.

### 4.2. Layout Mobile (`@media (max-width: 767px)`)
- Sidebar thu gọn (`toggleSidebar`, `closeMobileSidebar`).
- Chuyển bảng thành Mobile Card Layout, hỗ trợ mở rộng/thu gọn từng thẻ (`toggleMobileRow`).
- Tự động đóng bàn phím ảo khi scroll/chọn (`dismissMobileKeyboard`), hỗ trợ vuốt ngón tay (`handleMobileTouchStart`, `handleMobileTouchEnd`):
  - **Vuốt phải:** Copy nhanh Pass TikTok.
  - **Vuốt trái:** Kích hoạt lấy mã OTP Email.
- Các modal hiển thị dạng Bottom Sheet trên mobile.

---

## 5. Đặc Tả Chi Tiết Các Chức Năng Nghiệp Vụ

### 5.1. Tải dữ liệu & Chống Race Condition
- `loadData()` / `forceRefreshData()` gán ID tăng dần vào `currentFetchRequestId`. Khi người dùng chuyển tab nhanh qua `switchTab()`, response của request cũ hơn `currentFetchRequestId` bắt buộc bị hủy bỏ để không ghi đè dữ liệu tab mới.
- Dữ liệu trả về được làm sạch qua `sanitizeAccountData()` trước khi truyền vào `renderTable()`.

### 5.2. Bảo mật Hiển thị & Peek Effect (Pass TikTok, 2FA Secret)
- Sử dụng `.peek-container` gồm `.peek-obfuscated` và `.peek-real` (font `Consolas` monospace + `radial-gradient` mask theo tọa độ con trỏ qua `handlePeekMove`).
- Pass TikTok dùng hộp `.fluid-pass-box`.
- Hỗ trợ bật/tắt hiển thị rõ có xác thực hoặc theo dòng (`togglePlainText`, `togglePlainTextByIndex`, `executeTogglePlainText`, `togglePassword`, `togglePasswordByIndex`, `executeTogglePassword`, `toggleOTP`, `executeToggleOTP`).
- Sao chép an toàn kèm fallback cho iOS/Safari (`copyToClipboard`, `fallbackCopyText`, `copyFieldByIndex`, `copyOTP`, `copySecureText`, `copyRawText`).

### 5.3. Live TOTP 2FA Generator (RFC 6238)
- Giải mã Base32 (`base32ToBytes`) và sinh mã TOTP 6 chữ số hoàn toàn phía client (`generateTOTPSync` / `generateTOTP`) sử dụng HMAC-SHA1 của CryptoJS.
- Cập nhật đồng hồ đếm ngược 30 giây kèm vòng tròn SVG tiến độ (`updateTimerUI`, `updateTOTPs`).

### 5.4. Lấy Mã OTP Email Realtime & Chống Spam
- **Quy trình `fetchEmailCodeUI` / `fetchEmailCodeByIndex` / `pollCode`:**
  - Polling tối đa **6 lần**, mỗi lần cách nhau **5 giây** (gọi action GAS tìm email mới nhất thuộc target email).
  - **Chặn mã rác cố định:** Nếu mã bắt được là `"184973"`, bỏ qua/không nhận làm OTP hợp lệ.
  - **Rate Limit chống spam:** Bấm lấy mã >= 3 lần trong vòng 4 giây (`checkMailRateLimit`) -> kích hoạt khóa nút **20 giây** (`startRateLimit20s`).
  - **Phản hồi thành công:** Tự động copy mã OTP vào clipboard, phát âm thanh thông báo (`playOtpSuccessChime`), rung haptic trên thiết bị hỗ trợ (`triggerHaptic`), và lưu vào lịch sử tối đa 3 mã gần nhất (`recordOtpHistory`, `getOtpHistory`, `showOtpHistoryPopover`).
  - Có `pingMailboxHealth()` để kiểm tra sức khỏe hộp thư trung tâm.

### 5.5. Kiểm Tra Forward Mail (`#forwardModal`)
- Kho danh sách miễn kiểm tra cố định `PRE_VERIFIED_FORWARD_EMAILS` (31 email đã xác minh trước).
- Nút lọc nhanh `setForwardFilterPill` trên thanh công cụ chính.
- Trong `#forwardModal` (`openForwardModal`, `closeForwardModal`, `setForwardScanScope`, `switchForwardModalTab`):
  - Hỗ trợ 3 phạm vi quét (`getTargetAccountsForScope`, `loadScopeAccountsForDisplay`).
  - Quét song song tối đa **4 worker** (`startForwardScan`, `scanAccountWorker`, `pump`, `stopForwardScan`, `finishForwardScan`, `updateProgressUI`).
  - Hỗ trợ kiểm tra lại từng email (`recheckSingleEmailInModal`, `checkSingleRowForward`).
  - Cho phép **Alt+Click** hoặc **Shift+Click** để toggle thủ công trạng thái Forward của một dòng.
  - Cung cấp nút `copyUnforwardedEmails` (copy toàn bộ email chưa forward) và `exportForwardReport` (xuất file `.txt`).

### 5.6. Quản Lý Thiết Bị, Nhân Sự Mượn & Cảnh Báo Prime Radiant
- **Sửa/Xóa nhanh trực tiếp trên bảng:** `editDeviceInline()`, `saveInlineEdit()`, `deleteDeviceInline()`, cập nhật UI cục bộ qua `updateRowDeviceCell()` và `buildDeviceHtml()`.
- **Modal Chỉnh sửa chi tiết (`#deviceModal` — `openDeviceEditor`, `closeDeviceEditor`, `saveDeviceData`):**
  - Load danh sách thiết bị chuẩn từ sheet `Config` (`fetchConfigDevices`) vào Custom Dropdown có lọc phím mũi tên (`initGlobalDropdown`, `showCustomDropdown`, `filterCustomDropdown`, `handleDropdownKey`, `updateDropdownActive`, `selectDeviceOption`, `selectDeviceOptionByIndex`).
  - Autocomplete tên nhân sự qua `#staffNamesDataList`.
  - Hỗ trợ nhiều dòng thiết bị trên một tài khoản (`addDeviceRow`) và công tắc mượn tạm `[TẠM]` (`toggleTempSwitch`).
- **Nhật ký thiết bị (`#deviceAuditLogModal`):** Lưu local (`logLocalDeviceAudit`, `openDeviceAuditLogModal`, `closeDeviceAuditLogModal`) đồng thời ghi về sheet `Device_Logs` phía GAS.
- **Hệ thống Cảnh Báo Khẩn Cấp Thiết Bị `[TẠM]` Liên Sheet (Cross-Sheet Urgent Temp Device Alarms):**
  - *Storage & Đồng bộ 2 chiều:* Lưu localStorage `passion_temp_device_alarms` (`TEMP_ALARMS_KEY`, tự migrate dữ liệu cũ từ `prime_radiant_alarms` `LEGACY_ALARMS_KEY`), đồng bộ Firestore document `2fa_cache/temp_device_alarms` (`loadTempAlarms`, `saveTempAlarms`, `syncTempAlarmsFromFirestore`).
  - *Nhận diện & Vòng đời quá hạn:* `isTemporaryDeviceText`, `stripTempPrefix`, `normalizeDeviceText`, `splitDeviceList`, `getTempAlarmId(sheetName, account, device)`. Kiểm tra quá hạn sau `ONE_DAY_MS` (`24 * 60 * 60 * 1000`) hoặc qua ngày Việt Nam (`getTodayVN`, `getYesterdayVN`, `isTempAlarmOverdue`, `formatAlarmOverdueReason`, `isDeviceOverdueInTable`), kích hoạt/gỡ/quét toàn cục qua `triggerPrimeRadiantAlarm`, `removeTempAlarmForDevice`, `checkPrimeRadiantAlarms`.
  - *Banner, Toast bám dính & Thao tác nhanh:* Render `#tempDeviceUrgentBanner` (`renderTempDeviceUrgentBanner`), hiển thị `.cyber-toast.alarm-toast` (`showPersistentAlarmToast`), phát âm báo Web Audio (`playUrgentAlarmBeep`), hỗ trợ nhảy thẳng tới sheet/dòng tài khoản (`findRowIndexForAlarm`, `focusAndOpenTempDeviceRow`), gỡ nhanh `[TẠM]` trực tiếp và đồng bộ GAS (`quickRemoveTempDevice`), và xác nhận đã xử lý (`acknowledgeAlarm`).

### 5.7. Tìm Kiếm Fuzzy, Lọc Đa Chiều, Quét Trùng Lặp & Chọn Hàng Loạt
- **Tìm kiếm & Lọc (`filterData`, `clearSearch`, `filterBy2FAStatus`, `updateQuickStats`):** Chuẩn hóa tiếng Việt không dấu `removeVietnameseTones()` để tìm khớp theo email, kênh, team, thiết bị, đại lí.
- **Quét tài khoản trùng lặp (`scanDuplicates`, `renderDuplicatesResult`, `openScanModal`, `closeScanModal`):** Hiển thị trong `#scanModal`.
- **Thao tác hàng loạt (`#batchActionBar`):** `toggleSelectAll`, `updateBatchSelection`, `clearBatchSelection`, `batchExport` để copy danh sách tài khoản đã chọn.

### 5.8. Chế độ Passion 2FA Desktop App (`?desktop=1`) & Cầu nối Native (`/api/desktop/*`)
- **Phát hiện & Giao diện App (`isDesktopAppMode`, `initDesktopAppBridge`):** Khi truy cập với query `?desktop=1`, hiển thị cụm điều khiển `#desktopAppControls` (`#btnAlwaysOnTop`, `#btnHideToTray`) trên desktop và `#mobileDesktopAppControls` (`#mobileBtnAlwaysOnTop`, `#mobileBtnHideToTray`) trên mobile.
- **Điều khiển Native hai chiều:** Gọi `toggleDesktopAlwaysOnTop()`, `minimizeToDesktopTray()`, `sendDesktopCommand(type, extra)` gửi lệnh tới `server/server.mjs` (`desktop/Passion2FA.cs`), đồng thời polling trạng thái ngược từ app Windows qua `pollDesktopWebEvents()` (`GET /api/desktop/poll-web?since=...`), cập nhật `updateAlwaysOnTopUI(isTop)` và đồng bộ trạng thái Boss Key 2 chiều qua `setBossKeyState(show, syncDesktop = true)`.

---

## 6. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ đúng tên & thứ tự 6 tab** (`Passion Star`, `Prime Radiant`, `Idol Team`, `Acc Idol mới`, `Velion` -> `Velion Technologies`, `Acc Idol Retire`) và vùng dữ liệu tương ứng trên sheet `Tkhoan`.
2. **Giữ CSS Isolation màn hình khóa** (`#loginScreen:not(.hidden) ~ #authenticatedAppContent { display: none !important; }`), hiệu ứng Matrix (`stopMatrixBackground` khi mở khóa), Stealth Pass (56 ký tự, 4 góc không decoy, anti-spam `<450ms` streak >= 2 khóa 3s), auto-lock (300s / 15m), và Boss Key (`Ctrl+F1` / `Ctrl+\``, đồng bộ với Desktop App qua `setBossKeyState`).
3. **Giữ Dual Rescue API:** `/api/proxy` -> `runScriptJSONP` (`GAS_DIRECT_URL`) -> Firestore `2fa_cache`, kèm biến `currentFetchRequestId` ngăn race condition khi chuyển tab nhanh.
4. **Giữ tỷ lệ 8 cột bảng chính (3% / 9% / 21% / 18% / 13% / 18% / 6% / 12%)**, `overflow-x: clip !important`, sticky header đồng bộ qua `syncStickyHeaderTop()`, kéo dãn cột, 7 dòng skeleton, và viền tối `#334155`/`#283548`.
5. **Giữ logic Email OTP:** 6 lần poll * 5 giây, **chặn mã `"184973"`**, rate-limit 3 click / 4s khóa 20s, auto-copy + chime + haptic + lưu lịch sử tối đa 3 mã.
6. **Giữ logic Forward Check:** danh sách 31 email `PRE_VERIFIED_FORWARD_EMAILS`, 4 worker song song trong `#forwardModal`, Alt/Shift+Click toggle thủ công, copy email chưa forward và xuất `.txt`.
7. **Giữ toàn bộ nghiệp vụ Thiết bị & Cảnh báo `[TẠM]` + Desktop App:** `[TẠM]`, `Config` custom dropdown + `#staffNamesDataList`, cảnh báo quá hạn 24h / qua ngày VN liên sheet (`passion_temp_device_alarms` + Firestore `2fa_cache/temp_device_alarms`, banner `#tempDeviceUrgentBanner`, toast `.alarm-toast`, `quickRemoveTempDevice`), audit log cả local lẫn GAS, và cầu nối `?desktop=1` (`/api/desktop/*`).
8. **Không dùng native `alert`/`confirm`/`prompt`** và giữ nguyên Mobile Card + swipe trái/phải.
