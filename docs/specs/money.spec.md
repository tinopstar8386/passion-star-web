# 📘 TINO MONEY — ĐẶC TẢ KỸ THUẬT CHI TIẾT (`money.html`)

- **File nguồn chính:** `money.html` (Vanilla HTML/CSS/JS + Tailwind CDN + Lucide Icons + `AnimateKit`)
- **PWA & Offline:** `manifest-money.json`, `sw-money.js`, `icon/tino_money.svg`, `icon/png/tino_money.png` (`180x180`), `icon/png/tino_money_512.png` (`512x512`)
- **Mục đích:** Quản lý tiền mặt, tiền ngân hàng **MB Bank**, dòng tiền Vô/Ra/Chuyển ví nội bộ trên nền tảng **iPhone View trực quan** và cài đặt ra **Màn hình chính iPhone (PWA Standalone)** tại `https://passion-star-webapp.vercel.app/money.html`.

---

## 1. Hợp Đồng Giao Diện iPhone View & PWA

1. **Meta Tags Chuẩn iOS Safari:**
   - `viewport`: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
   - `apple-mobile-web-app-capable`: `yes`
   - `apple-mobile-web-app-status-bar-style`: `black-translucent`
   - `apple-mobile-web-app-title`: `Tino Money`
   - `link[rel="apple-touch-icon"][sizes="180x180"]`: `./icon/png/tino_money.png`
   - `link[rel="manifest"]`: `./manifest-money.json`
2. **Service Worker Riêng Biệt (`sw-money.js`):**
   - Tách riêng khỏi `manifest.json` của `2fa.html`, cache `money.html`, `manifest-money.json`, `animate-kit/*` và bộ `icon/tino_money*` để mở tức thì từ Màn hình chính iPhone mà không ảnh hưởng các module khác.
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
| `tino_finance_transactions_v1` | `Array<Transaction>` | `{ id, type: 'income'\|'expense'\|'transfer', wallet: 'mbbank'\|'cash', toWallet?, amount, categoryId, categoryName, note, date, time, isAdjustment?, createdAt }` |
| `tino_finance_wallets_v1` | `Object` | `{ cashInitBalance, mbInitBalance, mbAccountNumber, mbAccountName, mbBranch }` |
| `tino_finance_categories_v1` | `Array<Category>` | `{ id, type: 'income'\|'expense', name, icon, color }` |
| `tino_finance_settings_v1` | `Object` | `{ hideBalance, viewportMode, requirePinOnStart, pinCode, monthlyBudget }` |
| `sessionStorage['tino_finance_pin_verified']` | `'ok' \| null` | Đánh dấu phiên đã vượt qua màn hình khóa PIN |

---

## 3. Danh Sách Hàm Lõi & Trách Nhiệm (`window.*`)

1. **Tính toán dòng tiền & Số dư:**
   - `calculateWalletBalances(periodMonth)`: Tính `cashBalance`, `mbBalance`, `totalBalance`, `monthIncome`, `monthExpense`, `monthNet`, `cashIncome`, `cashExpense`, `mbIncome`, `mbExpense`. Giao dịch `transfer` chỉ dịch chuyển giữa 2 ví; giao dịch `isAdjustment: true` cân chỉnh số dư ví mà không bóp méo thống kê Thu/Chi thực tế.
2. **Thao tác Giao dịch & Ví:**
   - `addOrUpdateTransaction(payload)`, `deleteTransactionById(txId)`, `executeInternalTransfer(fromWallet, amount, note)`, `adjustWalletBalance(wallet, actualBalance)`.
3. **Kỹ năng kế thừa từ Passion Star Code:**
   - `docTien(soInput)`: Đọc chính xác số tiền VNĐ bằng chữ tiếng Việt.
   - `parseSmartTransactions(rawText)` & `applySmartPasteTransactions()`: Bóc tách nhiều dòng ghi chú viết tắt (`k`, `tr`, `3tr5`, `mb`, `tm`, `+`, `rút`/`rut`, `nộp`/`nop`) hỗ trợ tiếng Việt có dấu và không dấu.
   - `escapeHtml(str)`, `showToast(message, type)`, `showGlassConfirm(...)`: Chống XSS 100% và cấm hoàn toàn native `alert`/`confirm`/`prompt`.
4. **Bảo mật PIN & Tiện ích MB Bank:**
   - `pressPinDigit(digit)`, `verifyPinInput(entered)`, `lockAppWithPin()`, `togglePinOnStart(enabled)`, `updatePinCode()`: PIN mặc định `'0908'`, sai 5 lần tự khóa 10 giây (`.pin-shake`).
   - `openVietQrModal()`, `refreshVietQrImage()`, `copyMbAccountNumber()`: Sinh VietQR chuẩn MB Bank (`MB-<STK>-compact2.png`) có fallback offline.
   - `exportCSV()`, `exportBackupJSON()`, `handleImportBackupFile(ev)`, `seedDemoTransactions()`, `resetAllData(silent)`.

---

## 4. Checklist Chống Bỏ Sót Khi Sửa/Nâng Cấp Code

- [ ] **Không dùng `alert()`, `confirm()`, `prompt()`** trong `money.html`.
- [ ] **Giữ nguyên manifest riêng `manifest-money.json` và `sw-money.js`** (không ghi đè `manifest.json` của `2fa.html`).
- [ ] **Giữ nguyên 5 key lưu trữ** (`tino_finance_*` và `sessionStorage['tino_finance_pin_verified']`).
- [ ] **Giữ chuẩn Mobile iPhone** (`viewport-fit=cover`, `apple-touch-icon` `./icon/png/tino_money.png` tồn tại trên đĩa, mọi input `>= 16px`, `overflowX === false`).
- [ ] **Chạy kiểm thử Mobile & PWA sau khi sửa:** `tests/pentest_mobile_all.mjs money.html`.
