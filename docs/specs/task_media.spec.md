# Đặc tả kỹ thuật — `task_media.html` (Quản Lý Lịch Quay / Dựng / Chụp — Bộ Phận Media)

- **File nguồn:** `task_media.html` (~4,763 dòng, Vanilla HTML/Tailwind/JS + Lucide Icons + Firebase Firestore)
- **Mục đích:** Hệ thống điều phối lịch quay, chụp, dựng video và công việc cho nhân sự Media (Mỹ, Anh Quý, v.v.), hỗ trợ song ngữ Việt/Trung 100%, phân quyền 2 vai trò Quản lý (khóa PIN `0908`) vs Nhân sự (link cá nhân `?staff=` / `?role=media`), quy trình xin duyệt xóa task và 5 chế độ Timeline + Báo cáo hiệu suất.

---

## 1. Phân quyền, Bảo mật PIN & Chia sẻ Link cá nhân

1. **Bảo mật link Quản Lý (`MANAGER_PIN = '0908'`):**
   - Trong `startMediaApp()`, kiểm tra nếu không phải link nhân sự (`!lockedStaffName && roleParam !== 'media'`) và `!window.isManagerAuthenticated()` (`sessionStorage.getItem('media_manager_pin_verified') === '0908'`), tự động mở modal `#managerPinModal` khóa hoàn toàn giao diện cho tới khi nhập đúng 4 số `0908` (`enterPinDigit`, `verifyEnteredPin`).
   - Cho phép bấm khóa lại nhanh qua `lockManagerPortal()`.
2. **Chế độ Link Nhân Sự (`?staff=<Tên>` hoặc `?role=media`):**
   - `applyRoleVisibility()` ẩn hoàn toàn: `#roleSwitcherGroup` (nút chuyển sang Manager), `#kpiSection`, `#managerActionButtons`, `#headerAddTaskBtn`, `#viewReportBtn`, và chuyển hướng khỏi tab `report` nếu đang đứng ở đó; đồng thời hiển thị `#mediaModeBanner`.
   - `deleteTaskById` chặn tuyệt đối nhân sự chỉnh/xóa task không thuộc `lockedStaffName` (`targetTask.assignee !== lockedStaffName`).
3. **Bảng tổng hợp & sao chép Link (`#linksModal`):**
   - `openLinksModal()` + `renderIndividualStaffLinks()`: tự sinh `?role=media`, `?role=manager`, và từng URL cá nhân `?staff=<encodeURIComponent(name)>` theo `staffList`, kèm nút copy clipboard (`copyStaffPersonalLink`, fallback `execCommand('copy')`).

---

## 2. Kiến trúc dữ liệu Firebase, Cache & Song ngữ (VI / ZH)

- **Firebase Project (`FIREBASE_CONFIG`):** `passionstar_media_prod` (`passionstar-2014d`).
- **Firestore Collections & Documents:**
  - `media_tasks/{taskId}`: Danh sách task (`id`, `title`, `date`, `startHour`, `duration`, `assignee`, `category`, `deleteRequested`, `deleteRequestedBy`, ...). Lắng nghe realtime qua `onSnapshot`.
  - `media_settings/config`: Chứa `staffList` (khởi tạo mặc định `['Mỹ', 'Anh Quý']` nếu chưa có doc) và `customCategories` (hạng mục công việc tùy biến).
- **`localStorage` & `sessionStorage` Keys:**
  - `media_tasks_cache_v2` (`TASKS_CACHE_KEY`): Cache task offline/instant-load.
  - `media_timeline_submode`: Chế độ timeline đang chọn (`'agenda' | 'staff' | 'week'`, v.v.).
  - `media_lang_pref`: Ngôn ngữ UI `'vi'` hoặc `'zh'`.
  - `media_quick_staff`: Nhân sự chọn nhanh gần nhất (mặc định `lockedStaffName || 'Mỹ'`).
  - `sessionStorage['media_manager_pin_verified']`: Trạng thái đã mở khóa PIN `'0908'`.
- **Từ điển Song Ngữ `I18N` (`vi` & `zh`):**
  - `setLanguage(lang)` cập nhật `document.documentElement.lang`, đổi style `#langViBtn`/`#langZhBtn`, dịch động toàn bộ label/nút/toast/CSV header ngay lập tức mà không cần reload trang.

---

## 3. Quy trình Duyệt Xóa Task (`deleteRequested`)

- Khi nhân sự bấm xóa task, yêu cầu xóa được đánh dấu `deleteRequested: true` và `deleteRequestedBy` trên Firestore thay vì xóa thẳng.
- Ở phiên Quản Lý (`currentRole === 'manager'`):
  - Listener `onSnapshot(tasksColRef)` phát hiện các task mới có `deleteRequested === true` (dùng `knownPendingDeleteIds` tránh lặp thông báo khi load lần đầu) -> bật toast `toastManagerApprovalAlert`.
  - `renderManagerApprovalBanner()` hiển thị `#managerDeleteApprovalBanner` cùng danh sách task chờ duyệt với 2 nút `approveDeleteRequest(taskId)` (xóa khỏi `media_tasks`) và `rejectDeleteRequest(taskId)` (gỡ cờ yêu cầu xóa).

---

## 4. Các Chế độ Hiển Thị Timeline, Modal & Xuất Báo Cáo

1. **Chuyển chế độ Lịch trình (`switchTimelineSubmode`, `renderHourlyTimelineView`):**
   - `agenda` (`renderAgendaTimelineView`): Lịch trình dạng danh sách theo ngày được chọn trên thanh `#staffLanesDayBar` (`staffLaneDayPills`).
   - `staff` (`renderStaffLanesTimelineView`): Cột/làn song song theo từng nhân sự Media trong ngày.
   - `week` (`renderWeekGridTimelineView`): Lưới 7 ngày theo tuần (`#weekGridFilterBar`, có nút `quickFilterStaffWeek`).
   - Ngoài ra còn có `renderClassicShiftView` (dạng ca cổ điển), `renderFloatingCalendarGrid` (lịch ngày tháng), `renderKpiCards` (chỉ Manager), và `renderAnalyticsReportView` (tab Báo cáo thống kê, chỉ Manager).
2. **Modal & Tương tác nhanh:**
   - `#taskModal`: Tạo/sửa task, chọn hạng mục (`renderCategoryDropdownItems`), chọn người nhận (`renderAssigneeDropdownItems`), bộ chọn giờ kiểu iOS Wheel (`renderIosWheelItems`).
   - `#mobileFabAddTask`: Nút `+` nổi trên màn hình nhỏ `< xl`.
   - `#staffModal`: Quản lý thêm/xóa nhân sự trong `staffList` (`handleAddStaff`, `removeStaffMember`, tối thiểu giữ >= 1 nhân sự) và mở `#linksModal`.
3. **Xuất CSV:** Xuất file `Media_Schedule_<VI|ZH>_<YYYY-MM-DD>.csv` theo tuần hiện tại (`currentWeekMonday`).

---

## 5. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ khóa `MANAGER_PIN = '0908'` cho link Quản Lý và chế độ khóa nghiêm ngặt cho `?staff=` / `?role=media` (ẩn hoàn toàn `#roleSwitcherGroup`, `#kpiSection`, `#viewReportBtn`, `#headerAddTaskBtn`).
- [ ] Bảo toàn cơ chế duyệt xóa 2 bước (`deleteRequested` + `renderManagerApprovalBanner` + `knownPendingDeleteIds`).
- [ ] Giữ 100% tính năng song ngữ `I18N.vi` / `I18N.zh` và các khóa `localStorage` (`media_tasks_cache_v2`, `media_timeline_submode`, `media_lang_pref`, `media_quick_staff`).
- [ ] Không dùng `alert`/`confirm`/`prompt` native.
