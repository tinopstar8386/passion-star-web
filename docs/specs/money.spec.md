# 📘 TINO MONEY — ĐẶC TẢ KỸ THUẬT CHI TIẾT (`money/index.html`)

- **File nguồn chính:** `money/index.html` (Vanilla HTML/CSS/JS + Tailwind CDN + Lucide Icons + `AnimateKit`)
- **PWA & Offline:** `money/manifest.json`, `money/sw.js`, `money/tino-money.mobileconfig`, `money/icon/tino_money.svg`, `money/icon/tino_money.png` (`180x180`), `money/icon/tino_money_512.png` (`512x512`)
- **Mục đích:** Quản lý tiền mặt, tiền ngân hàng **MB Bank**, dòng tiền Vô/Ra/Chuyển ví nội bộ trên nền tảng **iPhone View trực quan** và cài đặt ra **Màn hình chính iPhone (PWA Standalone)** tại `https://passion-star-webapp.vercel.app/money/`.

---

## 1. Hợp Đồng Giao Diện iPhone View & PWA

1. **Meta Tags Chuẩn iOS Safari:**
   - `viewport`: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
   - `apple-mobile-web-app-capable`: `yes`
   - `apple-mobile-web-app-status-bar-style`: `black-translucent`
   - `apple-mobile-web-app-title`: `Tino Money`
   - `link[rel="apple-touch-icon"][sizes="180x180"]`: `./icon/tino_money.png`
   - `link[rel="manifest"]`: `./manifest.json`
2. **Service Worker Riêng Biệt (`money/sw.js`):**
   - Tách riêng trong thư mục `money/`, không ảnh hưởng `manifest.json` của `2fa.html`; cache `money/index.html`, `money/manifest.json`, `../animate-kit/*` và bộ `money/icon/tino_money*` để mở tức thì từ Màn hình chính iPhone mà không ảnh hưởng các module khác.
3. **Quy tắc Chống Zoom & Chống Cuộn Ngang (QTSC):**
   - Toàn bộ thẻ `<input>`, `<select>`, `<textarea>` hiển thị đều đạt `font-size >= 16px` (`#txAmountInput` là `24px`, các input/select/textarea khác là `16px !important`).
   - Trên viewport mobile `< 768px`, `document.documentElement.scrollWidth <= window.innerWidth` (0% tràn ngang).
4. **Chế Độ Hiển Thị (`toggleViewportMode`):**
   - `iphone` (mặc định trên Desktop): Khung mô phỏng iPhone 16 Pro Max (`430px x 874px`) với `#dynamicIsland`, `#iosStatusBar`, `#iphoneHomeIndicator`.
   - `full`: Bung rộng tối đa `1080px`, tự chia lưới 2 cột cho cặp thẻ ví MB Bank và Tiền Mặt (`.wallet-cards-grid`).
   - Trên màn hình `< 768px`, tự động ẩn `#desktopControlDock`, khung giả lập và hiển thị full màn hình thật kèm safe-area iOS.

---

## 2. Cấu Trúc Dữ Liệu (`localStorage` & `sessionStorage`)

| Key | Kiểu dữ liệu | Mô tả trường chính |
| :--- | :--- | :--- |
| `tino_finance_transactions_v1` | `Array<Transaction>` | `{ id, type: 'income'\|'expense'\|'transfer', wallet, toWallet?, amount, categoryId, categoryName, note, date, time, isAdjustment?, createdAt }` |
| `tino_finance_wallets_v1` | `Object` | `{ cashInitBalance, mbInitBalance, mbAccountNumber, mbAccountName, mbBranch, mbCardSkin, extraWallets: Array<ExtraWallet> }` |
| `tino_finance_categories_v1` | `Array<Category>` | `{ id, type: 'income'\|'expense', name, icon, color }` |
| `tino_finance_settings_v1` | `Object` | `{ hideBalance, viewportMode, requirePinOnStart, pinCode, decoyPinEnabled, decoyPinCode, autoLockSeconds, soundHapticEnabled, cloudSyncEnabled, cloudSyncRoom, monthlyBudget }` |
| `sessionStorage['tino_finance_pin_verified']` | `'ok' \| 'decoy' \| null` | Đánh dấu phiên đã vượt qua PIN (thật hoặc ví khách Decoy) |
| `tino_finance_decoy_tx_v1` & `tino_finance_decoy_wallets_v1` | `Array` / `Object` | Dữ liệu ví khách cô lập hoàn toàn khi nhập Decoy PIN (mặc định `'0000'`), không đồng bộ lên Cloud |
| `tino_finance_cloud_ts_v1` | `String` | Mốc thời gian đồng bộ gần nhất với Firestore `tino_money_sync/{roomId}` (dự án `passionstar-2014d`) |

---

## 3. Danh Sách Hàm Lõi & Trách Nhiệm (`window.*`)

1. **Tính toán dòng tiền & Số dư đa ví:**
   - `getAllWallets()`, `getWalletMeta(walletId)`, `calculateWalletBalances(periodMonth)`: Tính `cashBalance`, `mbBalance`, `totalBalance` (gộp toàn bộ ví phụ), `byWallet`, `monthIncome`, `monthExpense`, `monthNet`, `cashIncome`, `cashExpense`, `mbIncome`, `mbExpense`. Giao dịch `transfer` dịch chuyển giữa bất kỳ 2 ví nào; giao dịch `isAdjustment: true` cân chỉnh số dư ví mà không bóp méo thống kê Thu/Chi thực tế.
2. **Thao tác Giao dịch, Nhiều Tài Khoản Ngân Hàng & Giao Diện Thẻ MB:**
   - `addOrUpdateTransaction(payload)`, `deleteTransactionById(txId)`, `executeInternalTransfer(fromWallet, amount, note, toWallet)`, `adjustWalletBalance(walletId, actualBalance)`.
   - `setMbCardSkin(skinId)`, `cycleMbCardSkin()`: Tùy chỉnh 5 skin thẻ MB (`priority`, `titanium`, `ruby`, `gold`, `emerald`).
   - `openExtraWalletModal(walletId)`, `applyExtraWalletPreset(bankCode)`, `saveExtraWallet()`, `requestDeleteExtraWallet()`: Thêm/sửa/xóa nhiều tài khoản ngân hàng (VCB, TCB, VietinBank, BIDV, ACB, VPBank, TPBank, MoMo, Ví phụ).
3. **Kỹ năng kế thừa & Phản hồi âm thanh/xúc giác:**
   - `docTien(soInput)`: Đọc chính xác số tiền VNĐ bằng chữ tiếng Việt.
   - `parseSmartTransactions(rawText)` & `applySmartPasteTransactions()`: Bóc tách nhiều dòng ghi chú viết tắt (`k`, `tr`, `3tr5`, `mb`, `tm`, `+`, `rút`/`rut`, `nộp`/`nop`) hỗ trợ tiếng Việt có dấu và không dấu.
   - `playFeedback(kind)`: Tổng hợp âm thanh vi mô Web Audio (`tap`, `switch`, `success`, `error`) kết hợp `navigator.vibrate`, bật/tắt qua `toggleSoundHaptic(enabled)`.
   - `escapeHtml(str)`, `showToast(message, type)`, `showGlassConfirm(...)`: Chống XSS 100% và cấm hoàn toàn native `alert`/`confirm`/`prompt`.
4. **Bảo mật PIN (Auto-lock, Decoy PIN), Cloud Sync & Tiện ích VietQR:**
   - `pressPinDigit(digit)`, `verifyPinInput(entered)`, `lockAppWithPin(silent)`, `togglePinOnStart(enabled)`, `updatePinCode()`, `updateAutoLockSetting(seconds)`, `bindAutoLockLifecycle()`, `checkAndTriggerAutoLock()`, `toggleDecoyPinSetting(enabled)`, `saveDecoyPinCode()`: PIN thật mặc định `'0908'`, PIN giả Ví Khách mặc định `'0000'`, tự khóa khi rời app (`visibilitychange` / `pagehide`), sai 5 lần tự khóa 10 giây (`.pin-shake`).
   - `initCloudSync()`, `pushCloudSync()`, `scheduleCloudPush()`, `toggleCloudSync(enabled)`, `saveCloudRoomAndSync()`: Đồng bộ Realtime 2 chiều với Firebase Firestore (`tino_money_sync/{roomId}` thuộc dự án `passionstar-2014d`), tự fallback về `Offline Local` khi mất mạng và cô lập hoàn toàn khi đang ở chế độ Ví Khách (Decoy).
   - `openVietQrModal(walletId)`, `handleVietQrWalletChange(walletId)`, `refreshVietQrImage(immediate)`, `renderVietQrToPngBlob()`, `copyVietQrImage()`, `downloadVietQrImage()`, `downloadLockScreenQrWallpaper()`, `copyWalletAccountNumber(walletId)`, `copyActiveQrAccountNumber()`, `copyMbAccountNumber()`: Phím tắt QR 1-chạm trên Header (`#btnHeaderQuickQr`), hỗ trợ tham số `?quickqr=1`, tạo VietQR đa ngân hàng (`acqId: params.bin`) và xuất hình nền màn hình khóa iPhone `1290×2796` chứa mã QR chuẩn EMVCo.
   - `initIosSheetGestures()`, `dismissModalById(id)`: Tương tác thoát modal chuẩn iOS cho toàn bộ modal (`#txModal`, `#smartPasteModal`, `#adjustBalanceModal`, `#vietQrModal`, `#extraWalletModal`, `#categoryModal`, `#iosInstallModal`, `#glassConfirmModal`).
   - `playTabCascadeAnimation(tabName)`, `getTabCascadeTargets(tabName)`: Tạo hiệu ứng xuất hiện tuần tự từng thẻ từ trên xuống dưới (`.cascade-card-enter`, keyframe `cardCascadeDown` trễ `55ms` mỗi thẻ, hỗ trợ `prefers-reduced-motion`) khi tải trang, sau khi mở khóa PIN và khi chuyển tab (`home`, `ledger`, `analytics`, `settings`); sử dụng `html.tino-preload` để tránh nhấp nháy khung trước khi khởi tạo. Đã loại bỏ hoàn toàn hiệu ứng nghiêng thẻ 3D / cảm biến `DeviceOrientationEvent` (`#gyroPermissionBar`, `enableIosGyroTilt`, `data-animate="tilt"`) để không hiển thị hộp thoại xin quyền trên iOS.
   - `triggerHomeScreenInstall()`, `openIosInstallModal()`: Cài đặt tự động 1-chạm ra Màn hình chính (ưu tiên `beforeinstallprompt` nếu trình duyệt hỗ trợ, hoặc kích hoạt trực tiếp hồ sơ iOS WebClip `./tino-money.mobileconfig` thay cho modal hướng dẫn thủ công).
   - `exportCSV()`, `exportBackupJSON()`, `handleImportBackupFile(ev)`, `seedDemoTransactions()`, `resetAllData(silent)`.

---

## 4. Checklist Chống Bỏ Sót Khi Sửa/Nâng Cấp Code

- [ ] **Không dùng `alert()`, `confirm()`, `prompt()`** trong `money/index.html`.
- [ ] **Giữ nguyên manifest riêng `money/manifest.json` và `money/sw.js`** (không ghi đè `manifest.json` ở thư mục gốc của `2fa.html`).
- [ ] **Giữ nguyên 5 key lưu trữ** (`tino_finance_*` và `sessionStorage['tino_finance_pin_verified']`).
- [ ] **Giữ chuẩn Mobile iPhone** (`viewport-fit=cover`, `apple-touch-icon` `./icon/tino_money.png` tồn tại trong `money/icon/`, mọi input `>= 16px`, `overflowX === false`).
- [ ] **Chạy kiểm thử Mobile & PWA sau khi sửa:** `tests/pentest_mobile_all.mjs money/index.html`.
