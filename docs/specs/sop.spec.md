# Đặc tả Kỹ thuật Module: Hệ thống Quản lý Quy trình SOP, Nội quy & Thông báo (`sop.html`)

- **File chính:** `sop.html` (637 dòng)
- **Backend đi kèm:** Google Apps Script `https://script.google.com/macros/s/AKfycbxghvpqGIh2e6XlQeNO-OTqW8ILjJaY_g8esiD3gFIUPqyEBw5HLE8xj_74pBAwIu32/exec`
- **Mục đích:** Quản lý quy trình chuẩn (SOP) theo Bộ phận và từng Bước/Checklist giao cho từng Idol, kéo-thả sắp xếp lại Template SOP, đồng thời quản lý Thông báo công ty và Nội quy / Chính sách (hỗ trợ Copy gửi Zalo và xuất file Word `.doc`).

---

## 1. Mục tiêu & Kiến trúc Giao tiếp

`sop.html` sử dụng lớp cầu nối `google.script.run` giả lập (`withSuccessHandler`), gửi `POST text/plain;charset=utf-8` payload `{ action, args }` tới `API_URL`.

### Công nghệ & Giao diện:
- **Tailwind CSS CDN** (`darkMode: 'class'`), Google Fonts `Inter`.
- **SortableJS (`sortablejs@latest`):** Kéo-thả sắp xếp thứ tự các Bước lớn (`.step-drag-handle`) và chuyển Checklist giữa các bước (`.check-drag-handle`, `group: 'checklists'`).
- **Flatpickr:** Chọn ngày cho Nội quy & Thông báo (format lưu `Y-m-d`, hiển thị `d.m.Y`, tuần bắt đầu thứ Hai `firstDayOfWeek: 1`).
- **Toast & Modals (No native `confirm`/`alert`):** 8 modal ID (`#new-sop-modal`, `#confirm-modal`, `#edit-step-modal`, `#edit-check-modal`, `#edit-rule-modal`, `#edit-notice-modal`, `#modal`, `#rule-modal`), global loader `#global-loader`, hỗ trợ đóng mọi modal bằng phím `Escape`.

### Toàn bộ 18 API Actions:
- Tải dữ liệu: `getSopData`, `getRulesData`, `getNoticesData`
- Quy trình & Idol: `createNewSOP(d, s)`, `assignToIdol(d, s, i)`, `updateChecklist(id, st, i, d, s)`, `deleteIdol(d, s, i)`
- Template Admin: `renameTemplateStep(d, s, o, n)`, `editTemplateRow(id, ns, nt, nr, nf)`, `reorderTemplates(o)`, `addTemplateRow(d, s, sn, cn, r, f)`, `deleteTemplateRow(id)`
- Thông báo: `addNotice(t, c, z, d)`, `editNotice(id, t, c, z, d)`, `deleteNotice(id)`
- Nội quy: `addRule(t, c, z, d)`, `editRule(id, t, c, z, d)`, `deleteRule(id)`

---

## 2. Cấu trúc 5 Chế độ Màn hình (`state.view`)

1. **`dashboard` (`renderDashboard`):**
   - Thống kê 3 KPI card cho SOP đang chọn: Tổng Idol Gán SOP, Đang thực hiện, Đã hoàn thành.
   - Lưới thẻ Idol (lọc bỏ `'TEMPLATE'`, sắp xếp theo `_order`), hiển thị `% tiến độ`, thời gian hoàn thành. Chỉ Idol đạt `100%` mới hiện nút xóa dữ liệu (`confirmDeleteIdol`). Nút `+ Giao cho Idol mới` (`openModal` -> `confirmAssign`).
2. **`execution` (`renderExecution`):**
   - Sidebar timeline các Bước với 3 trạng thái do `getIdolSteps` tính toán: `completed`, `active`, `locked`.
   - **Quy tắc Checklist Tuần tự (Strict Sequential Guard):**
     - Chỉ checklist ngay sau mục đã tick gần nhất (`isPreviousDone`) và mục kế tiếp chưa bị tick (`!isNextChecked`) mới được tương tác (`canInteract = isStepActive && !isIdolCompleted && isPreviousDone && !isNextChecked`).
     - Khi Idol đã hoàn thành toàn bộ SOP (`progress === 100`), toàn bộ checklist bị khóa bảo vệ.
   - Mỗi checklist hỗ trợ nút xem nhanh Nội quy đính kèm (`openRuleModal(chk.rule)`) và link tải File (`chk.file`). Khi tick đủ `doneC === totalC`, hiện nút `nextStep()` hoặc `finishSop()`.
3. **`admin` (`renderAdmin`):**
   - Chỉnh sửa `TEMPLATE` của quy trình đang chọn (`+ Thêm tác vụ mới` hoặc tạo Bước Lớn Mới `__NEW__`), sửa tên bước (`#edit-step-modal`), sửa checklist/nội quy/file đính kèm (`#edit-check-modal`), xóa checklist (`adminDeleteStep`), và kéo thả SortableJS.
   - **Bảo vệ thay đổi chưa lưu (`hasUnsavedChanges`):** Khi kéo thả xong, cờ `hasUnsavedChanges = true` và hiện nút `Lưu thay đổi` (`saveOrderToServer`). Bị chặn chuyển SOP/chuyển View/sửa/xóa nếu chưa bấm lưu.
4. **`notices` (`renderNotices`):** Đăng, sửa (`#edit-notice-modal`), xóa (`uiDeleteNotice`), và copy mẫu Thông báo công ty kèm ngày Flatpickr & tên Group Zalo.
5. **`rules` (`renderRules`):** Đăng, sửa (`#edit-rule-modal`), xóa (`uiDeleteRule`), copy mẫu Nội quy (`copyRuleText` có `fallbackCopy`), và xuất file Word `.doc` (`downloadWord` tạo HTML MIME `application/msword` kèm BOM `\ufeff`).

---

## 3. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ đủ 18 API Action** trên `google.script.run` shim gửi tới `API_URL`.
2. **Giữ quy tắc khóa tuần tự checklist** (`isPreviousDone && !isNextChecked`) và khóa bảo vệ khi Idol đạt 100%, đồng thời ghi nhận timestamp `HH:mm - dd/MM` khi hoàn thành (`toggleChecklist`).
3. **Giữ cơ chế `hasUnsavedChanges`** ngăn rời màn hình/thực hiện thao tác Template khác trước khi gọi `reorderTemplates` (`saveOrderToServer`).
4. **Giữ cấu hình Flatpickr (`d.m.Y` hiển thị, `Y-m-d` lưu trữ, `firstDayOfWeek: 1`)**, phím `Escape` đóng tất cả 8 modal, và xuất file `.doc` với `\ufeff` UTF-8 BOM.
