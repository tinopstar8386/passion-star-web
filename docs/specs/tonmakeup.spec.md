# Đặc tả kỹ thuật — `tonmakeup.html` (Đề Xuất Mua Sắm Đồ Makeup Hàng Tháng)

- **File nguồn:** `tonmakeup.html` (~4,503 dòng, Vanilla HTML/Tailwind/JS + Lucide Icons + SheetJS/Excel + Firebase 11.6.1 Firestore/Auth)
- **Mục đích:** Quản lý danh sách đề xuất mua vật tư/mỹ phẩm trang điểm theo từng tháng (`YYYY-MM`), tự động dịch Việt -> Trung, quy đổi tỷ giá VNĐ <-> Nhân dân tệ (`¥`), hỗ trợ nhập liệu từ Excel/Sheet/Smart Paste, quản lý ảnh sản phẩm và đồng bộ realtime qua Firebase.

---

## 1. Kiến trúc dữ liệu & `localStorage`

- **Firebase Project:** `passionstar-2014d`, namespace `appId = 'passionstar-makeup-sheet1'`.
- **Authentication:** `signInAnonymously(auth)` (hoặc `signInWithCustomToken` nếu có `__initial_auth_token`).
- **Firestore Collections & Documents:**
  - `artifacts/${appId}/public/data/makeup_products/{productId}`: Từng sản phẩm đề xuất (`id`, `month` e.g. `'2026-11'`, `nameVi`, `nameZh`, `price` VNĐ, `quantity`, `link`, `image`, `createdAt`).
  - `artifacts/${appId}/public/data/makeup_settings/config`: Lưu `exchangeRate` (tỷ giá VNĐ/CNY) đồng bộ realtime qua `onSnapshot` -> cập nhật `#exchange-rate-input` và tính lại toàn bảng (`updateExchangeRate`).
- **`localStorage` Keys (chỉ lưu cục bộ trên trình duyệt từng máy):**
  - `makeup_products_backup_v1`: Bản sao offline fallback khi Firestore gián đoạn (`backupProductsLocally`).
  - `makeup_view_mode_proposal`: Chế độ hiển thị `'table'` hoặc `'cards'` (mặc định `'cards'` nếu `window.innerWidth <= 768`).
  - `STORAGE_COL_WIDTHS_KEY`: Lưu độ rộng cột bảng sau khi kéo resize (`initColumnResizers`, `saveAllColumnWidths`, `resetColumnWidths`), **tuyệt đối không ghi lên Firestore** để không ảnh hưởng layout máy khác.

---

## 2. Chức năng nghiệp vụ cốt lõi

1. **Quản lý theo Tháng & Nhân bản tháng trước:**
   - Chọn/điều hướng tháng (`changeSelectedMonth`, `navigateMonth`, `filterProductsForSelectedMonth`).
   - `copyFromPreviousMonth()`: Tự tính tháng liền trước (`prevMonthKey`), sao chép toàn bộ sản phẩm sang `selectedMonth` với ID mới `mk-<timestamp>-<idx>` và lưu Firestore.
2. **Dịch Việt -> Trung tự động & Song ngữ UI:**
   - `autoTranslateToChinese(textVi)`: Nếu đã chứa chữ Hán thì giữ nguyên; tra từ điển `MAKEUP_DICT_VI_TO_ZH` (~40 từ khóa mỹ phẩm) & `translationCache`; fallback gọi `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=zh-CN&dt=t&q=...`.
   - Khi nhập tên trong `#product-modal`, `scheduleModalAutoTranslate()` debounce `300ms` để cập nhật preview `#modal-zh-preview`.
   - Giao diện song ngữ 100% Việt / Trung (`I18N.vi`, `I18N.zh`, `setLanguage('vi' | 'zh')`), gồm cả nhãn tháng (`getMonthDisplayString`), toast, header CSV.
3. **Nhập liệu đa kênh (Excel / Sheet Import & Smart Bulk Paste):**
   - **Import từ Sheet/Excel (`#import-sheet-modal`, `openImportModal`, `confirmImportData`):** Hỗ trợ dán bảng từ Excel/Google Sheet (`handlePasteInput`) hoặc tải file `.xlsx/.xls/.csv` (`handleExcelFileUpload`, kèm nút tải file mẫu `downloadSampleExcel`), xem trước tại `#import-preview-body`, cho phép **gán ảnh hàng loạt** (`handleBulkPreviewImageUpload`) cho các dòng xem trước, tự dịch sang tiếng Trung trước khi lưu ở 2 chế độ: Thêm tiếp (`append`) hoặc Thay thế toàn bộ tháng (`replace`).
   - **Smart Bulk Paste (`#smart-paste-modal`, `parseSmartItemList`):** Phân tách danh sách text tự do (có mẫu `SAMPLE_RAW_MAKEUP_LIST` như `Keo tóc : 9 chai`, `6 son wodwod : 6 cây`), tự lọc số lặp đầu dòng và dấu `:`, `-` thừa.
4. **Quản lý Hình ảnh & Chỉnh sửa nhanh trên bảng:**
   - `readFileAsCompressedDataUrl` + `compressImageDataUrl(maxDim=400, quality=0.8)` nén ảnh trước khi lưu Firestore.
   - Hỗ trợ upload nhanh trên từng dòng (`triggerQuickUpload`, `handleQuickUploadFile`), gán link ảnh + dán từ clipboard (`#image-link-modal`, `pasteClipboardToLinkModal`), xóa ảnh (`clearProductImage`), xem ảnh lớn (`#lightbox-modal`).
   - Chỉnh sửa trực tiếp số lượng (`stepQuantity`, `updateProductField`), thêm nhanh dòng trống (`addQuickBlankRow`), xóa từng món (`#confirm-delete-modal`) hoặc xóa nhanh nhiều món (`#quick-delete-modal`).
5. **Thống kê, Chia sẻ & Xuất CSV:**
   - Quy đổi đồng thời VNĐ & Nhân dân tệ `¥` theo `exchangeRate` (`formatVND`, `formatCNYFromVND`), tổng hợp `updateSummaryTotals` & `updateCardsSummary`.
   - Copy tóm tắt đề xuất (`copyProposalSummary`), copy link sản phẩm (`copyProductLink`), và xuất file CSV `DE_XUAT_DO_MAKE_UP_<YYYY_MM>.csv` (`exportToCSV`, giữ ngôn ngữ hiện tại `'vi'` hoặc `'zh'`, có BOM `\uFEFF`).
6. **Khóa cuộn nền & In ấn (`@media print`):** `initModalScrollLockObserver()` quan sát class của `.fixed.inset-0.z-50` để khóa scroll trang nền khi mở modal; có stylesheet `@media print` ẩn `.no-print` và giữ `.print-full`.

---

## 3. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ nguyên Firestore paths `artifacts/passionstar-makeup-sheet1/public/data/{makeup_products,makeup_settings}` và cấu trúc trường `month` (`YYYY-MM`).
- [ ] Không đẩy `STORAGE_COL_WIDTHS_KEY` hoặc `makeup_view_mode_proposal` lên Firestore (chỉ giữ ở `localStorage` riêng từng máy).
- [ ] Bảo toàn hàm nén ảnh `compressImageDataUrl` để không vượt giới hạn kích thước document 1MB của Firestore.
- [ ] Không dùng `alert`/`confirm`/`prompt` native; mọi xác nhận xóa dùng `#confirm-delete-modal` / `#quick-delete-modal`.
