# Đặc tả kỹ thuật — `tonkhomakeup.html` & `data/tonkhomakeup_data.json` (Quản Lý Tồn Kho Vật Tư Makeup)

- **File nguồn:**
  - `tonkhomakeup.html` (~10,168 dòng, Vanilla HTML/Tailwind/JS + Lucide Icons + Firebase 11.6.1 Firestore/Auth)
  - `data/tonkhomakeup_data.json` (Dữ liệu JSON backup / seed ban đầu cho 42 mặt hàng tồn kho makeup)
- **Mục đích:** Theo dõi tồn kho vật tư makeup theo ngày, ghi nhận Nhập kho / Xuất kho kèm ảnh chứng cứ, đồng bộ 2 chiều với Google Sheets (`gviz`) và Cloud Firestore, tự cảnh báo sắp hết/hết hàng và chuyển danh sách thiếu sang đề xuất mua sắm (`tonmakeup.html`).

---

## 1. Kiến trúc dữ liệu, Firebase & Google Sheets Sync

- **Firebase Project:** `passionstar-2014d`, namespace `appId = 'passionstar-makeup-sheet1'` (mặc định nếu không có `__app_id`).
- **Firestore Collections & Documents:**
  - `artifacts/${appId}/public/data/makeup_inventory/{itemId}`: Từng mặt hàng tồn kho (`id`, `sku`, `stt`, `nameVi`, `nameZh`, `category`, `unit`, `minStock`, `initStockOriginal`, `initStock`, `usedStock`, `stock`, `dailyUsage[]`, `dailyInbound[]`, `note`, `location`, `supplier`, `image`, `hasCustomHistory`).
  - `artifacts/${appId}/public/data/makeup_inventory_tx/{txId}`: Nhật ký giao dịch nhập/xuất (`INBOUND` / `OUTBOUND`, `stockBefore`, `stockAfter`, `operator`, `recipient`, `shortDate`, `dateStr`, `evidenceImage`).
  - `artifacts/${appId}/public/data/makeup_inventory_settings/config`: Cấu hình chung tồn kho.
  - `artifacts/${appId}/public/settings_categories`: Danh sách danh mục vật tư tùy chỉnh (`categories[]`).
- **Google Sheets Live Sync (`fetchGoogleSheetInventory` + `parseAndApplyGvizData`):**
  - Tải JSONP từ `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=responseHandler:<cb>`.
  - Tự đọc header ngày ở Row 0 (cột 4 -> 39), tồn ban đầu ở Col 3, số lượng lấy từng ngày -> tạo `dailyUsage[]` (`id: "gsheet-<stt>-<c>"`). Nếu Gviz lỗi hoặc timeout, fallback về `completeWithBuiltInSheetData()` (42 mặt hàng từ `SEED_INVENTORY_ITEMS`).
- **`localStorage` Keys:**
  - `makeup_inv_initialized_v2` (`INIT_STATUS_KEY`): Đánh dấu đã khởi tạo/từng chỉnh sửa bởi người dùng để không bị ghi đè ngược khi chưa đủ 42 món seed.
  - `makeup_inventory_cache_v1` (+ `STORAGE_ITEMS_KEY`): Cache cục bộ danh sách tồn kho.
  - `makeup_inventory_tx_cache_v1`: Cache nhật ký giao dịch.
  - `makeup_inv_categories_v1`: Cache danh mục vật tư.
  - `makeup_inv_col_widths_v8` (`STORAGE_COL_WIDTHS_KEY`): Lưu độ rộng cột sau khi kéo resize (`initColumnResizers`).
  - `makeup_low_stock_transfer`: Hàng đợi vật tư thiếu chuyển từ `tonkhomakeup.html` sang `tonmakeup.html`.
  - `makeup_inventory_view_mode`: Chế độ hiển thị Bảng / Thẻ.

---

## 2. Nghiệp vụ cốt lõi (Công thức tính tồn, Xuất/Nhập & Chứng cứ)

1. **Tính lại tồn kho chuẩn từ lịch sử (`recalculateItemStockFromHistory` & `normalizeInventoryItem`):**
   - `initStock = Math.max(0, Number(it.initStockOriginal) + sum(dailyInbound.qty))`
   - `usedStock = sum(dailyUsage.qty)`
   - `stock = Math.max(0, it.initStock - it.usedStock)`
   - Đồng thời tự bổ sung `image` (`IMAGE_MAP_BY_STT`), `category` (`CATEGORY_MAP_BY_STT` / `detectCategoryFromKeywords`), `nameZh` (`ZH_MAP_BY_STT`) và sinh ID ổn định (`du-...`, `di-...`) cho từng dòng lịch sử.
2. **Nhập kho (`handleInboundSubmit` / `#inbound-modal`) & Xuất kho (`handleOutboundSubmit` / `#outbound-modal`):**
   - Kiểm tra hợp lệ (`qty > 0`), và đối với xuất kho **chặn xuất vượt tồn hiện tại** (`if (qty > current) showToast(...)`).
   - Tạo đồng thời entry trong `item.dailyInbound` / `item.dailyUsage` và bản ghi `txObj` trong `transactionLogs`, chạy `recalculateItemStockFromHistory`, lưu local + đồng bộ Firestore (`saveTransactionToFirebase`, `saveItemToFirebase`).
   - Hỗ trợ đính kèm **ảnh chứng cứ** qua upload file nén (`readFileAsCompressedDataUrl`) hoặc dán URL, xem phóng to qua `#lightbox-modal`.
3. **Sửa/Xóa lịch sử theo ngày & Tồn đầu gốc (`#item-history-modal`):**
   - Inline editing từng ngày nhập/xuất (`inlineEditingDailyState`, không dùng `prompt`), điều chỉnh trực tiếp `initStockOriginal` qua `adjustModalOrigInitStock(delta)`.
   - Sửa ghi chú nhanh qua `#quick-note-modal` với các nút chọn nhanh preset.

---

## 3. Smart Paste, Dịch Tự Động, Quản Lý Danh Mục & Chuyển Đề Xuất Mua

1. **Smart Paste (`parseSmartItemList` + `#smart-paste-modal`):**
   - Phân tích văn bản nhiều dòng đa định dạng (`Tên: SL đơn vị`, `SL đơn vị tên`, `Tên - SL đơn vị`), nhận diện ~25 đơn vị phổ biến (`chai`, `bịch`, `cây`, `cái`, `hộp`, `hủ`/`hũ`, `bảng`, `tuýp`, `thỏi`, `gói`, `bộ`, `miếng`, `cặp`, `lọ`, `vỉ`, `cuộn`, `khay`, `tệp`, `ống`, `bình`, `ly`, `túi`, `chiếc`), tự tìm item khớp sẵn trong kho (`findMatchingInventoryCandidates`).
2. **Quản lý Danh mục (`#category-manage-modal`):**
   - Thêm mới (`addNewCategory`), sửa tên inline kèm cập nhật hàng loạt item thuộc danh mục (`saveCategoryInlineEdit`), xóa danh mục (`confirmDeleteCategoryAction`) và đồng bộ lên `settings_categories`.
3. **Dịch Việt -> Trung & Song ngữ UI:**
   - Tra từ điển nội bộ `MAKEUP_DICT_VI_TO_ZH`, nếu chưa có gọi `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=zh-CN&dt=t&q=...` (debounce ở `debounceItemTranslate`).
   - Nút chuyển đổi giao diện Việt / Trung trên Desktop & Mobile (`setLanguage('vi' | 'zh')`).
4. **Cảnh báo & Liên kết sang Đề xuất mua (`openProposalModal` -> `tonmakeup.html`):**
   - Lọc các món `getItemStatus(i) !== 'IN_STOCK'` (`ĐÃ HẾT HÀNG` khi `stock <= 0`, `SẮP HẾT` khi `<= minStock`).
   - Tự tính số lượng đề xuất mua: `suggestedQty = Math.max(1, (minStock * 2) - stock)`.
   - Khi xác nhận (`confirmNavigateToProposal`), ghi danh sách vào `localStorage['makeup_low_stock_transfer']` và điều hướng sang `tonmakeup.html`.
5. **Xuất CSV & Khôi phục mẫu:** `exportInventoryCSV()` tải file `TonKho_Makeup_<YYYY-MM-DD>.csv` (BOM UTF-8); `restoreSeedItems()` nạp lại 42 mặt hàng mặc định từ `SEED_INVENTORY_ITEMS`.

---

## 4. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ nguyên công thức `recalculateItemStockFromHistory` (`initStockOriginal + dailyInbound - dailyUsage`), không cho sửa `stock` rời rạc làm lệch lịch sử.
- [ ] Bảo toàn đường dẫn Firestore `artifacts/passionstar-makeup-sheet1/public/data/{makeup_inventory,makeup_inventory_tx,makeup_inventory_settings}` và `settings_categories`.
- [ ] Giữ `INIT_STATUS_KEY = 'makeup_inv_initialized_v2'` để không mất chỉnh sửa của người dùng khi sync Gviz/Seed.
- [ ] Không dùng `alert`/`confirm`/`prompt` native; thao tác xóa qua `#confirm-delete-modal` / `#quick-delete-modal`.
