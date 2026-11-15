# Đặc tả Kỹ thuật Module: Smart Paste Studio (`smartpaste.html`)

- **File chính:** `smartpaste.html` (1,803 dòng)
- **Mục đích:** Trợ lý chuẩn hóa danh sách tên và sao chép/xuất dữ liệu cho các ô gộp (Merged Cells) trên Google Sheets và Excel với định dạng chuẩn tuyệt đối.

---

## 1. Mục tiêu & Tổng quan Kiến trúc

`smartpaste.html` giải quyết bài toán dán hàng loạt tên Idol/kênh vào Google Sheets có cấu trúc **ô Merge theo hàng dọc (`rowspan` 2, 3 hoặc 4 dòng)** mà không bị vỡ bố cục, mất font, hoặc lệch hàng.

### Công nghệ & Giao diện:
- **Vanilla HTML/CSS/JS** độc lập (không cần backend).
- **Fonts & Icons:** `Plus Jakarta Sans`, `JetBrains Mono`, Bootstrap Icons 1.11.3, FontAwesome 6.4.0.
- **Thư viện:** `canvas-confetti@1.6.0` (hiệu ứng khi copy/export), `xlsx@0.18.5` (SheetJS xuất file `.xlsx` có `!merges`).
- **Dark Glassmorphism:** Nền `#050508`, modal xác nhận kính mờ `#customConfirmModal` (`showGlassConfirm`, `closeConfirmModal`), thông báo qua `#toast-container` (`showToast`). Tuyệt đối không dùng native `alert()`/`confirm()`.

---

## 2. Giao diện & Bố cục (`workspace-grid` 2 cột)

1. **Header & Banner chuẩn định dạng (`.critical-sheets-banner`):** Hiển thị quy cách bắt buộc khi dán bằng `Ctrl + V` vào Google Sheets: **Font Arial • Cỡ chữ 12pt • In đậm (Bold) • Căn giữa ngang & dọc**. Có nút điều hướng về `index.html`.
2. **Cột trái — Dữ Liệu Đầu Vào & Bộ Lọc Thông Minh:**
   - Thanh công cụ: Nút **Dán Nhanh** (`pasteFromClipboard`), **Nạp Mẫu Ảnh (Christ, Roy...)** (`loadSampleData`), **Xóa** (`clearInput`), badge đếm `#inputCountBadge`.
   - Ô nhập liệu `#rawInput` (`oninput="processData()"`).
   - **Bộ lọc làm sạch (Checkbox):**
     - `#chkCleanPrefix` (mặc định bật): Gọt số thứ tự và bullet đầu dòng (`1.`, `1/`, `-`, `•`...).
     - `#chkDeduplicate`: Lọc bỏ tên trùng lặp.
     - `#chkSplitDelimiters` (mặc định bật): Tự động tách khi người dùng dán chuỗi ngăn cách bởi dấu phẩy, chấm phẩy, dấu gạch chéo...
     - `#chkTrimLines` (mặc định bật): Cắt khoảng trắng thừa và loại bỏ dòng trống.
   - **Chuyển đổi Kiểu chữ (`setTextCase`):**
     - `upper` (`#case-upper`, mặc định): `IN HOA TOÀN BỘ`.
     - `title` (`#case-title`): `Viết Hoa Đầu Từ`.
     - `raw` (`#case-raw`): `Giữ Nguyên Gốc`.
   - **Độ rộng gộp dòng (`setRowspan`):** Chọn số dòng gộp cho mỗi tên gồm `2` (`#btnSpan2`, mặc định), `3` (`#btnSpan3`), hoặc `4` (`#btnSpan4`).
   - **Ghép cột phụ kế bên (`#chkIncludeExtraCol`):** Hiện/ẩn `#extraColInputsContainer` cho phép tùy chỉnh nhãn hàng con mặc định (`#subRowVal1` = `"LINK NHẠC"`, `#subRowVal2` = `"LINK BACKGROUND"`).
3. **Cột phải — Xem trước & 3 Cách Xuất Dữ Liệu:**
   - Thống kê: `#statIdolCount` (Số Idol) và `#statRowCount` (Tổng dòng).
   - Bảng mô phỏng trực quan Live Table Simulator (`#previewTable` render qua `renderPreviewTable`).
   - **Cách 1 (`copySmartMergeFormatted`):** Sao chép chuẩn định dạng `text/html` + `text/plain` để `Ctrl + V` vào Google Sheets.
   - **Cách 2 (`copyGoogleSheetsFormula` / `updateFormulaPreview`):** Sinh công thức tự điền Google Sheets theo ô bắt đầu `#startCellInput` (mặc định `B1`).
   - **Cách 3 (`copyFullTwoColumnsTable` & `exportExcelFile`):** Copy cả bảng 2 cột (tên + cột phụ Nhạc/Background) hoặc xuất thẳng file `.xlsx`.

---

## 3. Đặc Tả Kỹ Thuật Chi Tiết

### 3.1. Xử lý & Chuẩn hóa Dữ liệu (`cleanName`, `processData`)
- Áp dụng tuần tự các bộ lọc theo trạng thái checkbox: tách delimiter, bỏ prefix số thứ tự/bullet, trim, deduplicate, và biến đổi chữ hoa/thường theo chế độ `upper` | `title` | `raw`.
- Khi `#chkIncludeExtraCol` bật, mỗi khối `rowspan` dòng sẽ sinh thêm cột phụ tương ứng giá trị từ `#subRowVal1` / `#subRowVal2`.

### 3.2. Sao chép Định dạng Google Sheets (`copySmartMergeFormatted`)
- Tạo payload Clipboard kép (`text/html` và `text/plain`) sử dụng `ClipboardItem` kèm fallback `fallbackCopyText`:
  - `text/html`: Bảng HTML với thuộc tính Google Sheets chuyên dụng `data-sheets-userformat` bitmask **`15233`** ép Google Sheets nhận chuẩn **Arial 12pt, Bold, Horizontal Center, Vertical Middle**, đồng thời gắn `rowspan` đúng với số dòng đã chọn.
  - `text/plain`: Chèn đúng `(rowspan - 1)` dòng trống sau mỗi tên để khi dán vào vùng ô chưa merge hoặc trình soạn thảo thuần vẫn đúng bước nhảy dòng.

### 3.3. Sinh Công thức Google Sheets (`generateGoogleSheetsFormula`)
- Tạo công thức chuẩn:
  `=IFERROR(INDEX({...}, (ROW()-ROW($startCell))/span + 1), "")`
- Tự động cập nhật bản xem trước qua `updateFormulaPreview()` khi đổi `#startCellInput`, `rowspan`, hoặc danh sách tên.

### 3.4. Xuất Bảng 2 Cột & Excel `.xlsx` (`copyFullTwoColumnsTable`, `exportExcelFile`)
- `copyFullTwoColumnsTable()`: Copy cả cột tên đã merge và cột phụ nhãn hàng con (ví dụ `LINK NHẠC`, `LINK BACKGROUND`) sang clipboard với định dạng bảng.
- `exportExcelFile()`: Dùng thư viện SheetJS (`XLSX.utils`) tạo workbook `.xlsx`, thiết lập mảng `!merges` cho vùng ô dọc của từng tên, và tải file về máy.

---

## 4. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ nguyên bitmask `data-sheets-userformat="15233"`** và style Arial 12pt / Bold / Center / Middle trong HTML clipboard payload để dán `Ctrl + V` vào Google Sheets giữ 100% định dạng gốc.
2. **Giữ nguyên cả 2 định dạng clipboard (`text/html` kèm `rowspan` + `text/plain` kèm dòng trống padding)** và hàm `fallbackCopyText`.
3. **Giữ đủ 3 chế độ `setTextCase` (`upper`, `title`, `raw`), 3 mức `setRowspan` (`2`, `3`, `4`), và 4 bộ lọc** (`chkCleanPrefix`, `chkDeduplicate`, `chkSplitDelimiters`, `chkTrimLines`).
4. **Giữ đúng công thức `=IFERROR(INDEX({...}, (ROW()-ROW($startCell))/span + 1), "")`** tại `generateGoogleSheetsFormula`.
5. **Giữ tùy chọn ghép cột phụ (`LINK NHẠC` / `LINK BACKGROUND`)**, copy bảng 2 cột, và xuất `.xlsx` có `!merges` bằng SheetJS.
6. **Không dùng native `confirm()`/`alert()`** — giữ `#customConfirmModal` (`showGlassConfirm`) và `#toast-container`.
