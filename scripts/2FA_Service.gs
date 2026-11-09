// =====================================================================
// PASSION STAR - GOOGLE APPS SCRIPT WEB APP DỊCH VỤ 2FA & QUẢN LÝ TÀI KHOẢN
// File: scripts/2FA_Service.gs
// SPREADSHEET ID: 1YzG8IsQnJ8sKMovRxj2XmL3Xb7SU9SByjTHET6eYk1w
// =====================================================================
// HƯỚNG DẪN CẬP NHẬT TRÊN GOOGLE SHEETS:
// 1. Mở trang tính: https://docs.google.com/spreadsheets/d/1YzG8IsQnJ8sKMovRxj2XmL3Xb7SU9SByjTHET6eYk1w/edit
// 2. Vào Tiện ích mở rộng (Extensions) > Apps Script.
// 3. Dán toàn bộ nội dung file này vào file Code.gs (hoặc tạo file mới 2FA_Service.gs).
// 4. Nhấn nút "Triển khai" (Deploy) > "Quản lý bản triển khai" (Manage deployments).
// 5. Chọn icon Bút chì (Chỉnh sửa) > Phiên bản (Version) chọn "Phiên bản mới" (New version) > Nhấn "Triển khai" (Deploy).
// =====================================================================

const SPREADSHEET_ID = "1YzG8IsQnJ8sKMovRxj2XmL3Xb7SU9SByjTHET6eYk1w";
const VALID_AUTH_HASH = "11fbfb0a6a696da38da248f9568be2c32c43bd89812696fccc1d068ba41b8bf5";

// =====================================================================
// CẤU HÌNH ZALO BOT & WEBHOOK THÔNG BÁO TỰ ĐỘNG
// =====================================================================
const ZALO_CONFIG = {
  // Access Token của Zalo Official Account (hoặc lưu trong Cài đặt dự án > Thuộc tính tập lệnh)
  ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty("ZALO_ACCESS_TOKEN") || "",
  // Zalo User ID của Quản trị viên nhận thông báo đẩy OTP tự động
  ADMIN_USER_ID: PropertiesService.getScriptProperties().getProperty("ZALO_ADMIN_USER_ID") || "",
  // OpenAPI Endpoint gửi tin nhắn của Zalo OA v3
  SEND_MESSAGE_URL: "https://openapi.zalo.me/v3.0/oa/message/cs",
  // Webhook bot tùy chọn nếu dùng bot trung gian ngoài OA
  CUSTOM_WEBHOOK_URL: PropertiesService.getScriptProperties().getProperty("ZALO_WEBHOOK_URL") || ""
};

function getMasterSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
}

/**
 * Xử lý yêu cầu HTTP POST (chính) từ Web App
 */
function doPost(e) {
  return handleAppScriptRequest(e);
}

/**
 * Xử lý yêu cầu HTTP GET (dự phòng JSONP cho Mobile)
 */
function doGet(e) {
  return handleAppScriptRequest(e);
}

function handleAppScriptRequest(e) {
  let action = "";
  let payload = {};
  let callback = "";

  try {
    if (e && e.parameter && e.parameter.callback) {
      callback = e.parameter.callback;
    }
    if (e && e.parameter && e.parameter.req) {
      const parsed = JSON.parse(decodeURIComponent(e.parameter.req));
      action = parsed.action;
      payload = parsed.payload || {};
    } else if (e && e.postData && e.postData.contents) {
      let parsed = null;
      try {
        parsed = JSON.parse(e.postData.contents);
      } catch (err) {
        parsed = null;
      }

      if (parsed) {
        // Kiểm tra xem có phải Webhook gửi từ Zalo Bot không
        if (parsed.event_name || (parsed.sender && parsed.message) || parsed.is_zalo_webhook || (parsed.message && parsed.sender_id)) {
          return handleZaloBotWebhook(parsed);
        }
        action = parsed.action;
        payload = parsed.payload || {};
      }
    }

    let resultData = null;

    switch (action) {
      case "getSheetData":
        resultData = getSheetData(payload.sheetName || "Passion Star");
        break;

      case "getConfigDevices":
        resultData = getConfigDevices();
        break;

      case "updateDeviceToMasterSheet":
        resultData = updateDeviceToMasterSheet(
          payload.targetEmail,
          payload.targetTiktok,
          payload.targetName,
          payload.newDeviceString
        );
        break;

      case "getEmailVerificationCode":
        resultData = getEmailVerificationCode(payload.targetEmail);
        break;

      case "checkEmailForwardStatus":
        resultData = checkEmailForwardStatus(payload.targetEmail);
        break;

      case "logDeviceAction":
        resultData = logDeviceAction(payload.account, payload.actionType, payload.device);
        break;

      case "saveColumnWidths":
        resultData = saveColumnWidths(payload.widths);
        break;

      case "getColumnWidths":
        resultData = getColumnWidths();
        break;

      case "triggerZaloScan":
        resultData = scanAndNotifyNewOtpZalo();
        break;

      case "sendZaloTestMessage":
        resultData = sendZaloMessage(payload.userId || ZALO_CONFIG.ADMIN_USER_ID, payload.text || "🔔 Passion Star Test Zalo Bot OK!");
        break;

      case "setZaloConfig":
        if (payload.accessToken) PropertiesService.getScriptProperties().setProperty("ZALO_ACCESS_TOKEN", payload.accessToken);
        if (payload.adminUserId) PropertiesService.getScriptProperties().setProperty("ZALO_ADMIN_USER_ID", payload.adminUserId);
        if (payload.customWebhook) PropertiesService.getScriptProperties().setProperty("ZALO_WEBHOOK_URL", payload.customWebhook);
        resultData = { success: true, message: "Đã lưu cấu hình Zalo thành công!" };
        break;

      default:
        resultData = getSheetData("Passion Star");
        break;
    }

    const responseObj = { status: "success", data: resultData };
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + JSON.stringify(responseObj) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const errObj = { status: "error", message: err.toString() };
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + JSON.stringify(errObj) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(errObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * =========================================================================
 * BỘ PHÂN TÍCH & TRÍCH XUẤT DỮ LIỆU ĐỘNG 6 VÙNG THEO QUY TẮC PHÂN CHIA CHUẨN
 * =========================================================================
 * 1. Idol team: Vùng A51:J93, Dòng 50 là tiêu đề cột. Tự động co giãn khi thêm/xóa dòng, kết thúc tại tiêu đề Velion.
 * 2. Velion: Vùng A96:J105, kết thúc tại tiêu đề Prime Radiant.
 * 3. Prime Radiant: Vùng A108:J120, kết thúc tại tiêu đề Passion Star.
 * 4. Passion Star: Vùng A123:J145, kết thúc tại ô "End Data".
 * 5. Acc Idol mới: Vùng M51:U69, kết thúc tại ô "Account on Agency" ở cột M.
 * 6. Acc Idol Retire: Vùng W3:AN106 gồm 2 cột song song (W:AE và AF:AN).
 */
function getSheetData(sheetName) {
  const ss = getMasterSpreadsheet();
  const sheet = ss.getSheetByName("Tkhoan");
  if (!sheet) throw new Error("Không tìm thấy trang tính 'Tkhoan' trong bảng tính.");

  const values = sheet.getDataRange().getValues();
  const numRows = values.length;

  // Chuẩn hóa tên tab truy vấn
  const tab = (sheetName || "Passion Star").toString().trim();
  const normTab = tab.toLowerCase();

  // Định vị các mốc tiêu đề động trong trang tính
  let idolTeamHeaderRow = -1;     // Dòng header "TEAM | Email..." của Idol Team (~ row 50)
  let velionTitleRow = -1;        // Dòng tiêu đề "Velion Agency..." (~ row 94)
  let primeRadiantTitleRow = -1;  // Dòng tiêu đề "Prime Radiant Agency..." (~ row 106)
  let passionTitleRow = -1;       // Dòng tiêu đề "Passion Agency..." (~ row 121)
  let endDataRow = -1;            // Dòng kết thúc Passion Star "End Data" (~ row 146)
  let accMoiStartRow = -1;        // Dòng bắt đầu Acc Idol mới (~ row 51)
  let accMoiEndRow = -1;          // Dòng kết thúc Acc Idol mới "Account on Agency" (~ row 70)

  for (let i = 0; i < numRows; i++) {
    const colA = (values[i][0] || "").toString().trim();
    const colB = (values[i][1] || "").toString().trim();
    const colM = values[i].length > 12 ? (values[i][12] || "").toString().trim() : "";

    const aLower = colA.toLowerCase();
    const bLower = colB.toLowerCase();
    const mLower = colM.toLowerCase();

    // 1. Mốc Idol Team (tìm tiêu đề IDOL TEAM hoặc hàng header TEAM + Email)
    if (aLower.includes("idol team") || (colA === "TEAM" && bLower.includes("email") && idolTeamHeaderRow === -1)) {
      if (aLower.includes("idol team") && i + 1 < numRows && (values[i + 1][0] || "").toString().trim() === "TEAM") {
        idolTeamHeaderRow = i + 1; // Hàng tiêu đề cột là hàng kế tiếp
      } else if (idolTeamHeaderRow === -1) {
        idolTeamHeaderRow = i;
      }
    }

    // 2. Mốc Velion (Dòng 94)
    if (aLower.includes("velion")) {
      velionTitleRow = i;
    }

    // 3. Mốc Prime Radiant (Dòng 106)
    if (aLower.includes("prime radiant")) {
      primeRadiantTitleRow = i;
    }

    // 4. Mốc Passion Star (Dòng 121)
    if (aLower.includes("passion agency") || (aLower.includes("passion") && !aLower.includes("idol") && !aLower.includes("prime") && passionTitleRow === -1 && i > 110)) {
      passionTitleRow = i;
    }

    // 5. Mốc End Data của Passion Star (Dòng 146)
    if (aLower.includes("end data") || aLower === "end" || (aLower.startsWith("end") && i > 130)) {
      endDataRow = i;
    }

    // 6. Mốc Acc Idol mới (Cột M, dòng 49-50)
    if (mLower.includes("tk idol waiting") || (mLower.includes("email") && accMoiStartRow === -1 && i >= 40 && i <= 55)) {
      accMoiStartRow = i + 1; // Bắt đầu từ dòng kế tiếp
    }

    // 7. Mốc kết thúc Acc Idol mới (Cột M, dòng 70)
    if (mLower.includes("account on") || mLower.includes("angecy") || mLower.includes("agency")) {
      if (accMoiEndRow === -1 && i >= 55) {
        accMoiEndRow = i;
      }
    }
  }

  // Fallback an toàn nếu vị trí không tìm thấy do format thay đổi
  if (idolTeamHeaderRow === -1) idolTeamHeaderRow = 49; // Row 50
  if (velionTitleRow === -1) velionTitleRow = 93;        // Row 94
  if (primeRadiantTitleRow === -1) primeRadiantTitleRow = 105; // Row 106
  if (passionTitleRow === -1) passionTitleRow = 120;     // Row 121
  if (endDataRow === -1) endDataRow = Math.min(passionTitleRow + 26, numRows);
  if (accMoiStartRow === -1) accMoiStartRow = 50;        // Row 51
  if (accMoiEndRow === -1) accMoiEndRow = 69;            // Row 70

  // =========================================================================
  // XỬ LÝ TRẢ VỀ THEO TỪNG TAB YÊU CẦU
  // =========================================================================

  // 1. IDOL TEAM (Vùng chính A51:J93, từ sau header đến trước Velion)
  if (normTab.includes("idol team") || normTab === "idol") {
    const list = [];
    let currentTeam = "";
    const startIdx = idolTeamHeaderRow + 1; // Sau dòng 50 -> Dòng 51
    const endIdx = velionTitleRow;           // Đến trước dòng 94

    for (let i = startIdx; i < endIdx && i < numRows; i++) {
      const row = values[i];
      const teamCell = (row[0] || "").toString().trim();
      const email = (row[1] || "").toString().trim();
      const passEmail = (row[2] || "").toString().trim();
      const passTiktok = (row[3] || "").toString().trim();
      const tenIdol = (row[4] || "").toString().trim();
      const tiktokId = (row[5] || "").toString().trim();
      const thietBiIdol = (row[6] || "").toString().trim();
      const thietBiTroLi = (row[7] || "").toString().trim();
      const daiLi = (row[8] || "").toString().trim();
      const key2fa = (row[9] || "").toString().trim();

      // Cập nhật fill-down team khi ô team không rỗng
      if (teamCell && teamCell.toUpperCase() !== "TEAM") {
        currentTeam = teamCell;
      }

      // Bỏ qua dòng rỗng hoặc dòng header thừa
      if (!email && !tenIdol) continue;
      if (email.toLowerCase().includes("email") || tenIdol.toLowerCase().includes("tên idol")) continue;

      list.push({
        team: currentTeam || teamCell || "Idol Team",
        email: email,
        passEmail: passEmail,
        passTiktok: passTiktok,
        tenIdol: tenIdol,
        tiktokId: tiktokId,
        thietBiIdol: thietBiIdol,
        thietBiTroLi: thietBiTroLi,
        daiLi: daiLi || "Passion",
        key2fa: key2fa
      });
    }
    return list;
  }

  // 2. VELION / VELION TECHNOLOGIES (Vùng A96:J105, từ sau header đến trước Prime Radiant)
  if (normTab.includes("velion")) {
    const list = [];
    let startIdx = velionTitleRow + 1; // Sau dòng 94
    // Bỏ qua dòng tiêu đề cột nếu có (Dòng 95: TEAM | Email...)
    if (startIdx < numRows && (values[startIdx][0] || "").toString().trim().toUpperCase() === "TEAM") {
      startIdx++;
    }
    const endIdx = primeRadiantTitleRow; // Đến trước Prime Radiant (~ dòng 106)

    for (let i = startIdx; i < endIdx && i < numRows; i++) {
      const row = values[i];
      const teamCell = (row[0] || "").toString().trim();
      const email = (row[1] || "").toString().trim();
      const passEmail = (row[2] || "").toString().trim();
      const passTiktok = (row[3] || "").toString().trim();
      const tenIdol = (row[4] || "").toString().trim();
      const tiktokId = (row[5] || "").toString().trim();
      const thietBiIdol = (row[6] || "").toString().trim();
      const thietBiTroLi = (row[7] || "").toString().trim();
      const daiLi = (row[8] || "").toString().trim();
      const key2fa = (row[9] || "").toString().trim();

      if (!email && !tenIdol) continue;
      if (email.toLowerCase().includes("email") || teamCell.toUpperCase() === "TEAM") continue;

      list.push({
        team: teamCell || "Velion",
        email: email,
        passEmail: passEmail,
        passTiktok: passTiktok,
        tenIdol: tenIdol,
        tiktokId: tiktokId,
        thietBiIdol: thietBiIdol,
        thietBiTroLi: thietBiTroLi,
        daiLi: daiLi || "Velion",
        key2fa: key2fa
      });
    }
    return list;
  }

  // 3. PRIME RADIANT (Vùng A108:J120, từ sau header đến trước Passion Star)
  if (normTab.includes("prime radiant") || normTab.includes("radiant")) {
    const list = [];
    let startIdx = primeRadiantTitleRow + 1; // Sau dòng 106
    // Bỏ qua dòng tiêu đề cột nếu có (Dòng 107)
    if (startIdx < numRows && (values[startIdx][0] || "").toString().trim().toUpperCase() === "TEAM") {
      startIdx++;
    }
    const endIdx = passionTitleRow; // Đến trước Passion Star (~ dòng 121)

    for (let i = startIdx; i < endIdx && i < numRows; i++) {
      const row = values[i];
      const teamCell = (row[0] || "").toString().trim();
      const email = (row[1] || "").toString().trim();
      const passEmail = (row[2] || "").toString().trim();
      const passTiktok = (row[3] || "").toString().trim();
      const tenIdol = (row[4] || "").toString().trim();
      const tiktokId = (row[5] || "").toString().trim();
      const thietBiIdol = (row[6] || "").toString().trim();
      const thietBiTroLi = (row[7] || "").toString().trim();
      const daiLi = (row[8] || "").toString().trim();
      const key2fa = (row[9] || "").toString().trim();

      if (!email && !tenIdol) continue;
      if (email.toLowerCase().includes("email") || teamCell.toUpperCase() === "TEAM") continue;

      list.push({
        team: teamCell || "Prime Radiant",
        email: email,
        passEmail: passEmail,
        passTiktok: passTiktok,
        tenIdol: tenIdol,
        tiktokId: tiktokId,
        thietBiIdol: thietBiIdol,
        thietBiTroLi: thietBiTroLi,
        daiLi: daiLi || "Prime Radiant",
        key2fa: key2fa
      });
    }
    return list;
  }

  // 4. PASSION STAR (Vùng A123:J145, kết thúc tại ô "End Data")
  if (normTab.includes("passion")) {
    const list = [];
    let startIdx = passionTitleRow + 1;
    // Bỏ qua dòng trống hoặc header (Dòng 122 trống -> bắt đầu dòng 123)
    while (startIdx < numRows && (!(values[startIdx][1] || "").toString().trim() && !(values[startIdx][0] || "").toString().trim())) {
      startIdx++;
    }
    if (startIdx < numRows && (values[startIdx][0] || "").toString().trim().toUpperCase() === "TEAM") {
      startIdx++;
    }

    const endIdx = endDataRow !== -1 ? endDataRow : Math.min(startIdx + 25, numRows);

    for (let i = startIdx; i < endIdx && i < numRows; i++) {
      const row = values[i];
      const teamCell = (row[0] || "").toString().trim();
      const email = (row[1] || "").toString().trim();
      const passEmail = (row[2] || "").toString().trim();
      const passTiktok = (row[3] || "").toString().trim();
      const tenIdol = (row[4] || "").toString().trim();
      const tiktokId = (row[5] || "").toString().trim();
      const thietBiIdol = (row[6] || "").toString().trim();
      const thietBiTroLi = (row[7] || "").toString().trim();
      const daiLi = (row[8] || "").toString().trim();
      const key2fa = (row[9] || "").toString().trim();

      if (teamCell.toLowerCase().includes("end data") || teamCell.toLowerCase() === "end") break;
      if (!email && !tenIdol) continue;
      if (email.toLowerCase().includes("email") || teamCell.toUpperCase() === "TEAM") continue;

      list.push({
        team: teamCell || "Passion Star",
        email: email,
        passEmail: passEmail,
        passTiktok: passTiktok,
        tenIdol: tenIdol,
        tiktokId: tiktokId,
        thietBiIdol: thietBiIdol,
        thietBiTroLi: thietBiTroLi,
        daiLi: daiLi || "Passion",
        key2fa: key2fa
      });
    }
    return list;
  }

  // 5. ACC IDOL MỚI (Vùng M51:U69, kết thúc tại "Account on Agency" ở cột M)
  if (normTab.includes("acc idol mới") || normTab.includes("acc idol moi") || normTab.includes("mới") || normTab.includes("waiting")) {
    const list = [];
    const startIdx = accMoiStartRow; // Thường là dòng 51 (index 50)
    const endIdx = accMoiEndRow !== -1 ? accMoiEndRow : Math.min(startIdx + 20, numRows);

    for (let i = startIdx; i < endIdx && i < numRows; i++) {
      const row = values[i];
      if (row.length < 13) continue;

      const email = (row[12] || "").toString().trim();     // Cột M
      const passEmail = (row[13] || "").toString().trim(); // Cột N
      const passTiktok = (row[14] || "").toString().trim(); // Cột O
      const tenIdol = (row[15] || "").toString().trim();   // Cột P
      const tiktokId = (row[16] || "").toString().trim();  // Cột Q
      const thietBiIdol = (row[17] || "").toString().trim(); // Cột R
      const thietBiTroLi = (row[18] || "").toString().trim(); // Cột S
      const daiLi = (row[19] || "").toString().trim();     // Cột T
      const key2fa = (row[20] || "").toString().trim();    // Cột U

      // Dừng lại nếu gặp chữ Account on Agency
      if (email.toLowerCase().includes("account on") || email.toLowerCase().includes("agency") || email.toLowerCase().includes("angecy")) {
        break;
      }

      if (!email && !tenIdol) continue;
      if (email.toLowerCase().includes("email") || email.toLowerCase().includes("outlook")) continue;

      list.push({
        team: "Acc Mới",
        email: email,
        passEmail: passEmail,
        passTiktok: passTiktok,
        tenIdol: tenIdol || "Blank",
        tiktokId: tiktokId,
        thietBiIdol: thietBiIdol,
        thietBiTroLi: thietBiTroLi,
        daiLi: daiLi || "Passion",
        key2fa: key2fa
      });
    }
    return list;
  }

  // 6. ACC IDOL RETIRE (Vùng W3:AN106, 2 cột song song W:AE và AF:AN)
  if (normTab.includes("retire")) {
    const list = [];
    const startIdx = 2; // Dòng 3 (index 2)
    const endIdx = Math.min(106, numRows); // Dòng 106 (index 105)

    for (let i = startIdx; i < endIdx; i++) {
      const row = values[i];

      // Bảng 1: Cột W đến AE (indices 22 đến 30)
      if (row.length > 22) {
        const email1 = (row[22] || "").toString().trim();
        const passEmail1 = (row[23] || "").toString().trim();
        const passTiktok1 = (row[24] || "").toString().trim();
        const tenIdol1 = (row[25] || "").toString().trim();
        const tiktokId1 = (row[26] || "").toString().trim();
        const thietBiIdol1 = (row[27] || "").toString().trim();
        const daiLi1 = (row[28] || "").toString().trim();
        const key2fa1 = row.length > 30 ? (row[30] || "").toString().trim() : "";

        if (email1 && email1.toLowerCase() !== "outlook" && !email1.toLowerCase().includes("end  data") && !email1.toLowerCase().includes("end data")) {
          list.push({
            team: "Retire",
            email: email1,
            passEmail: passEmail1,
            passTiktok: passTiktok1,
            tenIdol: tenIdol1,
            tiktokId: tiktokId1,
            thietBiIdol: thietBiIdol1,
            thietBiTroLi: "",
            daiLi: daiLi1,
            key2fa: key2fa1
          });
        }
      }

      // Bảng 2: Cột AF đến AN (indices 31 đến 39)
      if (row.length > 31) {
        const email2 = (row[31] || "").toString().trim();
        const passEmail2 = (row[32] || "").toString().trim();
        const passTiktok2 = (row[33] || "").toString().trim();
        const tenIdol2 = (row[34] || "").toString().trim();
        const tiktokId2 = (row[35] || "").toString().trim();
        const key2fa2 = row.length > 39 ? (row[39] || "").toString().trim() : "";

        if (email2 && email2.toLowerCase() !== "outlook" && !email2.toLowerCase().includes("end  data") && !email2.toLowerCase().includes("end data")) {
          list.push({
            team: "Retire",
            email: email2,
            passEmail: passEmail2,
            passTiktok: passTiktok2,
            tenIdol: tenIdol2,
            tiktokId: tiktokId2,
            thietBiIdol: "",
            thietBiTroLi: "",
            daiLi: "",
            key2fa: key2fa2
          });
        }
      }
    }
    return list;
  }

  // Mặc định trả về Passion Star
  return getSheetData("Passion Star");
}

/**
 * Cập nhật thiết bị đăng nhập trực tiếp vào trang tính Tkhoan
 */
function updateDeviceToMasterSheet(targetEmail, targetTiktok, targetName, newDeviceString) {
  const ss = getMasterSpreadsheet();
  const sheet = ss.getSheetByName("Tkhoan");
  if (!sheet) throw new Error("Không tìm thấy trang tính Tkhoan");

  const values = sheet.getDataRange().getValues();
  const cleanEmail = (targetEmail || "").toString().trim().toLowerCase();
  const cleanTiktok = (targetTiktok || "").toString().trim().toLowerCase();
  const cleanName = (targetName || "").toString().trim().toLowerCase();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    // 1. Kiểm tra bảng chính (Cột A-J): Cột B là email (index 1), Cột G là thiết bị (index 6, col 7)
    const emailA = (row[1] || "").toString().trim().toLowerCase();
    const tiktokA = (row[5] || "").toString().trim().toLowerCase();
    const nameA = (row[4] || "").toString().trim().toLowerCase();

    if ((cleanEmail && emailA === cleanEmail) ||
        (cleanTiktok && tiktokA === cleanTiktok) ||
        (cleanName && nameA === cleanName && emailA)) {
      sheet.getRange(i + 1, 7).setValue(newDeviceString);
      return { success: true, row: i + 1, section: "main" };
    }

    // 2. Kiểm tra Acc Idol mới (Cột M-U): Cột M là email (index 12), Cột R là thiết bị (index 17, col 18)
    if (row.length > 12) {
      const emailM = (row[12] || "").toString().trim().toLowerCase();
      if (cleanEmail && emailM === cleanEmail) {
        sheet.getRange(i + 1, 18).setValue(newDeviceString);
        return { success: true, row: i + 1, section: "acc_moi" };
      }
    }

    // 3. Kiểm tra Retire bảng 1 (Cột W-AE): Cột W là email (index 22), Cột AB là thiết bị (index 27, col 28)
    if (row.length > 22) {
      const emailW = (row[22] || "").toString().trim().toLowerCase();
      if (cleanEmail && emailW === cleanEmail) {
        sheet.getRange(i + 1, 28).setValue(newDeviceString);
        return { success: true, row: i + 1, section: "retire" };
      }
    }
  }

  throw new Error("Không tìm thấy tài khoản tương ứng để cập nhật thiết bị trên Google Sheet.");
}

/**
 * Lấy danh sách thiết bị mẫu từ sheet Config
 */
function getConfigDevices() {
  const ss = getMasterSpreadsheet();
  const sheet = ss.getSheetByName("Config");
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  const devices = [];
  for (let i = 0; i < values.length; i++) {
    const val = (values[i][0] || "").toString().trim();
    if (val && !devices.includes(val)) {
      devices.push(val);
    }
  }
  return devices;
}

/**
 * Kiểm tra xem một email/tin nhắn cụ thể có thực sự gửi cho targetEmail hay không.
 * Phòng chống 100% việc nhiều tài khoản chung 1 Gmail Thread bị lấy nhầm mã của nhau.
 */
function isMessageForTarget(msg, cleanEmail, username) {
  if (!msg || !cleanEmail) return false;

  const to = (msg.getTo() || "").toLowerCase();
  const cc = (msg.getCc() || "").toLowerCase();
  const bcc = (msg.getBcc() || "").toLowerCase();
  const subject = (msg.getSubject() || "").toLowerCase();
  const body = (msg.getPlainBody() || "").toLowerCase();

  // 1. Kiểm tra địa chỉ email đầy đủ trong các trường cơ bản
  if (to.includes(cleanEmail) || cc.includes(cleanEmail) || bcc.includes(cleanEmail) || subject.includes(cleanEmail) || body.includes(cleanEmail)) {
    return true;
  }

  // 2. Kiểm tra username (nếu username dài >= 6 ký tự)
  if (username && username.length >= 6) {
    if (to.includes(username) || subject.includes(username) || body.includes(username)) {
      return true;
    }
  }

  // 3. Kiểm tra sâu trong Raw Headers (RFC 822) nơi lưu Delivered-To, X-Forwarded-For, X-Original-To
  try {
    const raw = (msg.getRawContent() || "").toLowerCase();
    if (raw.includes(cleanEmail)) return true;
    if (username && username.length >= 6 && (raw.includes("delivered-to: " + username) || raw.includes("for <" + username) || raw.includes("for " + username))) {
      return true;
    }
  } catch (e) {}

  return false;
}

/**
 * Quét Gmail tìm mã OTP xác thực email được forward về tino.hohr@gmail.com
 * CHỈ lấy mã từ email mới nhất nhận trong vòng 1 tiếng, hoặc trong cùng ngày hôm nay.
 * BẮT BUỘC tin nhắn phải thuộc về CHÍNH XÁC targetEmail (không lấy nhầm mã của tài khoản khác trong cùng thread).
 * Bỏ qua hoàn toàn các email cũ của các ngày trước đó để tránh lấy sai mã hết hạn.
 */
function getEmailVerificationCode(targetEmail) {
  if (!targetEmail) return "";
  const clean = targetEmail.trim().toLowerCase();
  const username = clean.split('@')[0];

  const now = new Date();
  const nowMs = now.getTime();
  const oneHourMs = 60 * 60 * 1000;
  const todayStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");

  const searchQueries = [
    '"' + clean + '"',
    clean,
    'to:' + clean,
    'from:' + clean,
    username.length >= 6 ? username : null
  ].filter(Boolean);

  let candidateMessages = [];

  for (let q of searchQueries) {
    try {
      let threads = GmailApp.search(q + " newer_than:1d", 0, 5);
      if (!threads || threads.length === 0) {
        threads = GmailApp.search(q, 0, 5);
      }

      for (let thread of threads) {
        const msgs = thread.getMessages();
        for (let msg of msgs) {
          // BƯỚC SỐNG CÒN 1: Bắt buộc tin nhắn này phải thuộc về chính xác targetEmail!
          // Triệt tiêu 100% tình trạng 2 tài khoản khác nhau trong cùng thread bị lấy nhầm mã của nhau!
          if (!isMessageForTarget(msg, clean, username)) {
            continue;
          }

          const msgDate = msg.getDate();
          if (!msgDate) continue;

          const msgTime = msgDate.getTime();
          const diffMs = nowMs - msgTime;
          const msgDayStr = Utilities.formatDate(msgDate, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");

          // BƯỚC SỐNG CÒN 2: Bắt buộc trong vòng 1 tiếng hoặc trong cùng ngày hôm nay!
          const isWithin1Hour = diffMs >= 0 && diffMs <= oneHourMs;
          const isToday = (msgDayStr === todayStr);

          // Bỏ qua hoàn toàn mail cũ từ ngày hôm trước trở về trước
          if (isWithin1Hour || isToday) {
            candidateMessages.push({
              msg: msg,
              time: msgTime,
              isWithin1Hour: isWithin1Hour,
              isToday: isToday
            });
          }
        }
      }
      if (candidateMessages.length > 0) break;
    } catch (e) {}
  }

  if (candidateMessages.length === 0) {
    return "";
  }

  // Sắp xếp giảm dần theo thời gian: tin nhắn mới nhất lên đầu tiên
  candidateMessages.sort((a, b) => b.time - a.time);

  function extractOtp(msgObj) {
    const body = (msgObj.getPlainBody() || "") + " " + (msgObj.getSubject() || "");

    // 1. TikTok format: "[TikTok] 123456 is your verification code"
    const mTikTok = body.match(/([0-9]{6})\s+is your (?:verification )?code/i);
    if (mTikTok) return mTikTok[1];

    // 2. Tiếng Việt: "mã xác minh của bạn là 123456"
    const mTiengViet = body.match(/(?:mã(?:\s+xác\s+(?:nhận|minh|thực))?|code|otp)[\s\:\-là]+([0-9]{4,8})/i);
    if (mTiengViet) return mTiengViet[1];

    // 3. Tiền tố tiếng Anh: "verification code: 123456"
    const mPrefix = body.match(/(?:verification|confirmation|security)[\s\-]+code[\s\:\-]+([0-9]{4,8})/i);
    if (mPrefix) return mPrefix[1];

    // 4. Mã 6 chữ số chuẩn (TikTok, Google, Outlook, ...)
    const m6 = body.match(/\b\d{6}\b/);
    if (m6) return m6[0];

    // 5. Mã 4 chữ số (Outlook, SMS ...)
    const m4 = body.match(/\b\d{4}\b/);
    if (m4) return m4[0];

    return "";
  }

  // Bước 1: Ưu tiên email mới trong vòng 1 tiếng
  const within1HourMsgs = candidateMessages.filter(item => item.isWithin1Hour);
  for (let item of within1HourMsgs) {
    const code = extractOtp(item.msg);
    if (code) return code;
  }

  // Bước 2: Nếu chưa có trong 1 tiếng, lấy từ email mới nhất trong ngày hôm nay
  for (let item of candidateMessages) {
    const code = extractOtp(item.msg);
    if (code) return code;
  }

  return "";
}

/**
 * Kiểm tra trạng thái kết nối Forward mail về tino.hohr@gmail.com
 * Nếu có bất kỳ email nào trong hòm thư liên quan đến địa chỉ này -> Xác nhận ĐÃ KẾT NỐI (hasMail: true)
 * TUYỆT ĐỐI KHÔNG gán mã OTP cũ của ngày trước hoặc của tài khoản khác làm mã hiển thị,
 * chỉ trả về mã OTP nếu email đó mới nhận trong vòng 1 tiếng / hôm nay, ngược lại trả về code: "Đã kết nối"
 */
function checkEmailForwardStatus(targetEmail) {
  if (!targetEmail) return { hasMail: false, message: "Email trống" };
  const clean = targetEmail.trim().toLowerCase();
  const username = clean.split('@')[0];

  const now = new Date();
  const nowMs = now.getTime();
  const oneHourMs = 60 * 60 * 1000;
  const todayStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");

  const searchQueries = [
    '"' + clean + '"',
    clean,
    'to:' + clean,
    'from:' + clean,
    username.length >= 6 ? username : null
  ].filter(Boolean);

  for (let q of searchQueries) {
    try {
      const threads = GmailApp.search(q, 0, 5);
      for (let thread of threads) {
        const msgs = thread.getMessages();
        // Lặp từ tin nhắn mới nhất trong thread ngược về trước
        for (let j = msgs.length - 1; j >= 0; j--) {
          const msg = msgs[j];
          if (!isMessageForTarget(msg, clean, username)) {
            continue;
          }

          const body = msg.getPlainBody() + " " + msg.getSubject();
          const msgDate = msg.getDate();
          const msgTime = msgDate ? msgDate.getTime() : 0;
          const msgDayStr = msgDate ? Utilities.formatDate(msgDate, "Asia/Ho_Chi_Minh", "yyyy-MM-dd") : "";

          // Kiểm tra xem email này có trong vòng 1 tiếng hoặc trong ngày hôm nay hay không
          const isRecent = msgDate && ((nowMs - msgTime) <= oneHourMs || msgDayStr === todayStr);

          let foundCode = "Đã kết nối";
          if (isRecent) {
            const mTikTok = body.match(/([0-9]{6})\s+is your (?:verification )?code/i);
            const mGoogleForward = body.match(/confirmation code[\s\:\-]+([0-9]{8,10})/i);
            const mPrefix = body.match(/(?:mã|code|otp|verification|xác thực|confirmation)[\s\:\-]*([0-9]{4,8})/i);
            const m6 = body.match(/\b\d{6}\b/);
            const m4 = body.match(/\b\d{4}\b/);

            if (mTikTok) foundCode = mTikTok[1];
            else if (mGoogleForward) foundCode = mGoogleForward[1];
            else if (mPrefix) foundCode = mPrefix[1];
            else if (m6) foundCode = m6[0];
            else if (m4) foundCode = m4[0];
          }

          return {
            hasMail: true,
            code: foundCode,
            subject: msg.getSubject(),
            date: msgDate ? msgDate.toISOString() : "",
            isRecent: isRecent
          };
        }
      }
    } catch (e) {}
  }

  return { hasMail: false, code: "", message: "Chưa tìm thấy mail" };
}

/**
 * Ghi nhận lịch sử thao tác thiết bị
 */
function logDeviceAction(account, actionType, device) {
  try {
    const ss = getMasterSpreadsheet();
    let logSheet = ss.getSheetByName("Device_Logs");
    if (!logSheet) {
      logSheet = ss.insertSheet("Device_Logs");
      logSheet.appendRow(["Thời gian", "Tài khoản", "Hành động", "Thiết bị"]);
    }
    logSheet.appendRow([new Date(), account, actionType, device]);
  } catch (e) {}
  return true;
}

function saveColumnWidths(widths) {
  try {
    PropertiesService.getScriptProperties().setProperty("2FA_COLUMN_WIDTHS", JSON.stringify(widths));
  } catch (e) {}
  return true;
}

function getColumnWidths() {
  try {
    const str = PropertiesService.getScriptProperties().getProperty("2FA_COLUMN_WIDTHS");
    return str ? JSON.parse(str) : null;
  } catch (e) {
    return null;
  }
}

/**
 * =========================================================================
 * BỘ TÍCH HỢP ZALO BOT: CHAT TƯƠNG TÁC 2 CHIỀU & TỰ ĐỘNG ĐẨY THÔNG BÁO OTP
 * =========================================================================
 */

/**
 * Xử lý Webhook tin nhắn đến từ Zalo Bot
 */
function handleZaloBotWebhook(data) {
  let senderId = "";
  let messageText = "";

  // 1. Trích xuất User ID & Nội dung tin nhắn từ Zalo Payload
  if (data.sender && data.sender.id) {
    senderId = data.sender.id;
  } else if (data.user_id_by_app) {
    senderId = data.user_id_by_app;
  } else if (data.sender_id) {
    senderId = data.sender_id;
  }

  if (data.message && typeof data.message.text === "string") {
    messageText = data.message.text.trim();
  } else if (typeof data.text === "string") {
    messageText = data.text.trim();
  }

  // Nếu không phải tin nhắn văn bản (ví dụ sự kiện quan tâm/bỏ quan tâm)
  if (!messageText) {
    const ack = { error: 0, message: "Event received" };
    return ContentService.createTextOutput(JSON.stringify(ack)).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Xử lý các câu lệnh /otp, /pass, /device, /fwd, /help
  const replyText = processZaloCommand(messageText, senderId);

  // 3. Gửi tin nhắn phản hồi về Zalo OpenAPI (nếu có senderId và Access Token)
  if (senderId) {
    sendZaloMessage(senderId, replyText);
  }

  // 4. Trả về phản hồi JSON HTTP (tương thích các nền tảng Webhook trực tiếp)
  const responseObj = {
    error: 0,
    message: "Success",
    reply: replyText,
    text: replyText
  };
  return ContentService.createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Bộ xử lý logic câu lệnh tương tác của Zalo Bot
 */
function processZaloCommand(rawText, senderId) {
  let text = (rawText || "").trim();
  if (text.startsWith("/")) text = text.slice(1).trim();

  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const query = parts.slice(1).join(" ").trim();

  // 1. LỆNH LẤY MÃ OTP (/otp hoặc /code hoặc /ma)
  if (cmd === "otp" || cmd === "code" || cmd === "ma" || cmd === "layma") {
    if (!query) {
      // Không truyền tên -> Quét mã OTP mới nhất từ toàn bộ hòm thư trong vòng 1 giờ
      const latestCode = getEmailVerificationCode("tino.hohr@gmail.com");
      if (latestCode) {
        return "🔐 [PASSION STAR - MÃ 2FA MỚI NHẤT]\n" +
               "━━━━━━━━━━━━━━━━━━━━\n" +
               "🔑 MÃ OTP: " + latestCode + "\n" +
               "📧 Hòm thư: tino.hohr@gmail.com\n" +
               "⏱️ Trạng thái: Hợp lệ trong 1 giờ\n" +
               "━━━━━━━━━━━━━━━━━━━━\n" +
               "👉 Bấm giữ mã số để sao chép nhanh!";
      } else {
        return "⚠️ [THÔNG BÁO OTP]\n" +
               "Hiện chưa có mã OTP nào gửi về trong vòng 1 giờ qua.\n" +
               "💡 Bạn có thể tìm theo tên Idol: /otp <tên idol hoặc email>";
      }
    }

    // Tìm tài khoản theo query
    const acc = findAccountInSheets(query);
    if (!acc) {
      return "❌ Không tìm thấy Idol hoặc Email nào khớp với: \"" + query + "\"\n" +
             "👉 Vui lòng thử lại với tên khác hoặc gõ /help để xem hướng dẫn.";
    }

    const code = getEmailVerificationCode(acc.email);
    if (code) {
      return "🔐 [PASSION STAR - MÃ 2FA TIKTOK]\n" +
             "━━━━━━━━━━━━━━━━━━━━\n" +
             "👤 Idol: " + acc.tenIdol + " (" + acc.team + ")\n" +
             "📧 Email: " + acc.email + "\n" +
             "🔑 MÃ OTP: " + code + "\n" +
             "⏱️ Thời gian: Vừa nhận trong 1 giờ\n" +
             "━━━━━━━━━━━━━━━━━━━━\n" +
             "👉 Bấm giữ mã số để sao chép nhanh vào TikTok!";
    } else {
      return "⏳ [CHƯA CÓ MÃ MỚI]\n" +
             "━━━━━━━━━━━━━━━━━━━━\n" +
             "👤 Idol: " + acc.tenIdol + "\n" +
             "📧 Email: " + acc.email + "\n" +
             "⚠️ Chưa tìm thấy mã OTP nào trong vòng 1 giờ qua.\n" +
             "💡 Hãy bấm 'Gửi lại mã' trên TikTok và gõ lại lệnh sau 5 giây!";
    }
  }

  // 2. LỆNH TRA MẬT KHẨU TIKTOK & EMAIL (/pass hoặc /mk hoặc /matkhau)
  if (cmd === "pass" || cmd === "mk" || cmd === "matkhau" || cmd === "password") {
    if (!query) {
      return "💡 Cú pháp: /pass <tên idol hoặc email>\nVí dụ: /pass royen";
    }
    const acc = findAccountInSheets(query);
    if (!acc) {
      return "❌ Không tìm thấy thông tin tài khoản: \"" + query + "\"";
    }

    return "🔑 [THÔNG TIN ĐĂNG NHẬP IDOL]\n" +
           "━━━━━━━━━━━━━━━━━━━━\n" +
           "👑 Idol: " + acc.tenIdol + " (" + acc.team + ")\n" +
           "🎵 TikTok ID: " + (acc.tiktokId || "Chưa có") + "\n" +
           "🔒 Pass TikTok: " + (acc.passTiktok || "(Trống)") + "\n" +
           "📧 Email: " + acc.email + "\n" +
           "🔒 Pass Email: " + (acc.passEmail || "(Trống)") + "\n" +
           "━━━━━━━━━━━━━━━━━━━━\n" +
           "⚠️ Nghiêm cấm chia sẻ mật khẩu ra bên ngoài!";
  }

  // 3. LỆNH TRA CỨU THIẾT BỊ ĐĂNG NHẬP (/device hoặc /may hoặc /thietbi)
  if (cmd === "device" || cmd === "may" || cmd === "thietbi") {
    if (!query) {
      return "💡 Cú pháp: /device <tên idol>\nVí dụ: /device royen";
    }
    const acc = findAccountInSheets(query);
    if (!acc) {
      return "❌ Không tìm thấy Idol: \"" + query + "\"";
    }

    let devStr = (acc.thietBiIdol || "").trim();
    if (!devStr) devStr = "Chưa có thiết bị nào được lưu";

    return "📱 [THIẾT BỊ ĐĂNG NHẬP]\n" +
           "━━━━━━━━━━━━━━━━━━━━\n" +
           "👤 Idol: " + acc.tenIdol + "\n" +
           "📋 Danh sách máy:\n" + devStr + "\n" +
           "━━━━━━━━━━━━━━━━━━━━\n" +
           "🏛️ Đại lý: " + (acc.daiLi || "Passion Star");
  }

  // 4. LỆNH KIỂM TRA FORWARD EMAIL (/fwd hoặc /forward hoặc /checkmail)
  if (cmd === "fwd" || cmd === "forward" || cmd === "checkmail") {
    return "📬 [TRẠNG THÁI CHUYỂN TIẾP EMAIL]\n" +
           "━━━━━━━━━━━━━━━━━━━━\n" +
           "🎯 Hòm thư đích: tino.hohr@gmail.com\n" +
           "⚙️ Hệ thống đang tự động lọc mã OTP trong 1 tiếng và trong ngày.\n" +
           "💡 Để kiểm tra từng tài khoản, vui lòng dùng lệnh:\n" +
           "👉 /otp <tên idol> để lấy mã trực tiếp.";
  }

  // 5. LỆNH HƯỚNG DẪN (/help hoặc /menu hoặc mặc định)
  return "🤖 [PASSION STAR BOT - HƯỚNG DẪN]\n" +
         "━━━━━━━━━━━━━━━━━━━━\n" +
         "1️⃣ /otp <tên idol> : Lấy mã OTP TikTok mới nhất\n" +
         "2️⃣ /pass <tên idol> : Lấy mật khẩu TikTok & Email\n" +
         "3️⃣ /device <tên idol> : Xem danh sách máy đang đăng nhập\n" +
         "4️⃣ /fwd : Kiểm tra hòm thư chuyển tiếp\n" +
         "5️⃣ /help : Xem danh sách lệnh\n" +
         "━━━━━━━━━━━━━━━━━━━━\n" +
         "💡 Mẹo: Có thể gõ không cần dấu gạch chéo (VD: otp royen)";
}

/**
 * Gửi tin nhắn qua Zalo OpenAPI v3
 */
function sendZaloMessage(recipientUserId, textMessage) {
  if (!recipientUserId || !textMessage) return null;

  const accessToken = ZALO_CONFIG.ACCESS_TOKEN || PropertiesService.getScriptProperties().getProperty("ZALO_ACCESS_TOKEN");
  if (accessToken && accessToken !== "YOUR_ZALO_ACCESS_TOKEN") {
    try {
      const url = ZALO_CONFIG.SEND_MESSAGE_URL || "https://openapi.zalo.me/v3.0/oa/message/cs";
      const payload = {
        recipient: { user_id: recipientUserId.toString() },
        message: { text: textMessage }
      };
      const options = {
        method: "post",
        contentType: "application/json",
        headers: { access_token: accessToken },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      const res = UrlFetchApp.fetch(url, options);
      return JSON.parse(res.getContentText());
    } catch (e) {
      Logger.log("Lỗi sendZaloMessage OA: " + e.toString());
    }
  }

  // Gửi qua Custom Webhook Bot (nếu cấu hình)
  const customWebhook = ZALO_CONFIG.CUSTOM_WEBHOOK_URL || PropertiesService.getScriptProperties().getProperty("ZALO_WEBHOOK_URL");
  if (customWebhook) {
    try {
      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          recipient_id: recipientUserId,
          text: textMessage,
          message: textMessage
        }),
        muteHttpExceptions: true
      };
      UrlFetchApp.fetch(customWebhook, options);
    } catch (e) {
      Logger.log("Lỗi sendZaloMessage Custom: " + e.toString());
    }
  }
  return null;
}

/**
 * TỰ ĐỘNG QUÉT & ĐẨY THÔNG BÁO VỀ ZALO KHI CÓ MÃ OTP MỚI ĐẾN
 * Thiết lập trong Apps Script: Kích hoạt (Triggers) > Thêm trình kích hoạt:
 * - Hàm chạy: scanAndNotifyNewOtpZalo
 * - Nguồn sự kiện: Theo thời gian (Time-driven)
 * - Loại bộ đếm: Theo số phút (Minutes timer) > Mỗi 1 hoặc 2 phút.
 */
function scanAndNotifyNewOtpZalo() {
  const adminId = ZALO_CONFIG.ADMIN_USER_ID || PropertiesService.getScriptProperties().getProperty("ZALO_ADMIN_USER_ID");
  if (!adminId) {
    return { success: false, message: "Chưa cấu hình ZALO_ADMIN_USER_ID" };
  }

  const now = new Date();
  const cache = CacheService.getScriptCache();
  let countNotified = 0;

  try {
    const threads = GmailApp.search("newer_than:5m", 0, 5);
    for (let thread of threads) {
      const msgs = thread.getMessages();
      for (let msg of msgs) {
        const msgId = msg.getId();
        if (cache.get("NOTIFIED_ZALO_" + msgId)) continue;

        const msgDate = msg.getDate();
        if (!msgDate || (now.getTime() - msgDate.getTime() > 5 * 60 * 1000)) continue;

        const body = (msg.getPlainBody() || "") + " " + (msg.getSubject() || "");
        
        // Trích xuất mã OTP
        let code = "";
        const mTikTok = body.match(/([0-9]{6})\s+is your (?:verification )?code/i);
        if (mTikTok) code = mTikTok[1];
        if (!code) {
          const mTiengViet = body.match(/(?:mã(?:\s+xác\s+(?:nhận|minh|thực))?|code|otp)[\s\:\-là]+([0-9]{4,8})/i);
          if (mTiengViet) code = mTiengViet[1];
        }
        if (!code) {
          const m6 = body.match(/\b\d{6}\b/);
          if (m6) code = m6[0];
        }

        if (!code) continue;

        // Xác định email nhận & Idol
        const toHeader = (msg.getTo() || "").toLowerCase();
        let matchedEmail = "";
        let matchedIdol = "";
        let matchedTeam = "";

        const allAccs = getAllAccountsCombined();
        for (let acc of allAccs) {
          if (acc.email && (toHeader.includes(acc.email.toLowerCase()) || body.includes(acc.email.toLowerCase()))) {
            matchedEmail = acc.email;
            matchedIdol = acc.tenIdol;
            matchedTeam = acc.team;
            break;
          }
        }

        const timeStr = Utilities.formatDate(msgDate, "Asia/Ho_Chi_Minh", "HH:mm:ss");
        const alertText =
          "🔔 [PASSION STAR - CÓ MÃ OTP MỚI VỪA VỀ]\n" +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          "👤 Idol: " + (matchedIdol || "Tài khoản TikTok") + (matchedTeam ? " (" + matchedTeam + ")" : "") + "\n" +
          "📧 Mail: " + (matchedEmail || toHeader) + "\n" +
          "🔑 MÃ OTP: " + code + "\n" +
          "⏱️ Nhận lúc: " + timeStr + "\n" +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          "👉 Bấm giữ mã số để copy nhanh!";

        sendZaloMessage(adminId, alertText);
        cache.put("NOTIFIED_ZALO_" + msgId, "1", 3600);
        countNotified++;
      }
    }
  } catch (err) {
    Logger.log("Lỗi scanAndNotifyNewOtpZalo: " + err.toString());
  }

  return { success: true, countNotified: countNotified };
}

/**
 * Tìm kiếm tài khoản trên tất cả các tab theo từ khóa (Tên Idol, Email, TikTok ID)
 */
function findAccountInSheets(rawQuery) {
  if (!rawQuery) return null;
  const q = normalizeVietnameseText(rawQuery).toLowerCase().trim();
  const allAccs = getAllAccountsCombined();

  // 1. Khớp chính xác
  for (let acc of allAccs) {
    const nameNorm = normalizeVietnameseText(acc.tenIdol || "").toLowerCase().trim();
    const mailNorm = (acc.email || "").toLowerCase().trim();
    const tiktokNorm = (acc.tiktokId || "").toLowerCase().trim();

    if (nameNorm === q || mailNorm === q || tiktokNorm === q) {
      return acc;
    }
  }

  // 2. Khớp một phần
  for (let acc of allAccs) {
    const nameNorm = normalizeVietnameseText(acc.tenIdol || "").toLowerCase().trim();
    const mailNorm = (acc.email || "").toLowerCase().trim();
    const tiktokNorm = (acc.tiktokId || "").toLowerCase().trim();

    if (nameNorm.includes(q) || mailNorm.includes(q) || (tiktokNorm && tiktokNorm.includes(q))) {
      return acc;
    }
  }

  return null;
}

/**
 * Gộp toàn bộ danh sách tài khoản từ tất cả các Tab
 */
function getAllAccountsCombined() {
  const tabs = ["Passion Star", "Idol team", "Velion", "Prime Radiant", "Acc Idol mới"];
  let combined = [];
  for (let t of tabs) {
    try {
      const data = getSheetData(t);
      if (Array.isArray(data)) {
        combined = combined.concat(data);
      }
    } catch (e) {}
  }
  return combined;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt bỏ dấu để tìm kiếm thông minh
 */
function normalizeVietnameseText(str) {
  if (!str) return "";
  return str.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, function(m) { return m === 'đ' ? 'd' : 'D'; });
}
