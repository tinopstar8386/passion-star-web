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
      const parsed = JSON.parse(e.postData.contents);
      action = parsed.action;
      payload = parsed.payload || {};
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
 * Quét Gmail tìm mã OTP xác thực email được forward về tino.hohr@gmail.com
 */
function getEmailVerificationCode(targetEmail) {
  if (!targetEmail) return "";
  const clean = targetEmail.trim().toLowerCase();
  const username = clean.split('@')[0];

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
        for (let j = msgs.length - 1; j >= 0; j--) {
          const body = msgs[j].getPlainBody() + " " + msgs[j].getSubject();
          
          // 1. Tìm mã 6 chữ số TikTok / Gmail / Outlook
          const m6 = body.match(/\b\d{6}\b/);
          if (m6) return m6[0];

          // 2. Tìm mã có tiền tố code / mã / verification / xác thực
          const mPrefix = body.match(/(?:mã|code|otp|verification|xác thực|confirmation)[\s\:\-]*([0-9]{4,8})/i);
          if (mPrefix) return mPrefix[1];

          // 3. Tìm mã 4 chữ số (VD Outlook code 2026)
          const m4 = body.match(/\b\d{4}\b/);
          if (m4) return m4[0];
        }
      }
    } catch (e) {}
  }
  return "";
}

/**
 * Kiểm tra trạng thái kết nối Forward mail về tino.hohr@gmail.com
 * Nếu có bất kỳ email nào trong hòm thư liên quan đến địa chỉ này -> Xác nhận ĐÃ KẾT NỐI
 */
function checkEmailForwardStatus(targetEmail) {
  if (!targetEmail) return { hasMail: false, message: "Email trống" };
  const clean = targetEmail.trim().toLowerCase();
  const username = clean.split('@')[0];

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
      if (threads && threads.length > 0) {
        const msgs = threads[0].getMessages();
        const latestMsg = msgs[msgs.length - 1];
        const body = latestMsg.getPlainBody() + " " + latestMsg.getSubject();
        
        let foundCode = "";
        const m6 = body.match(/\b\d{6}\b/);
        const mPrefix = body.match(/(?:mã|code|otp|verification|xác thực|confirmation)[\s\:\-]*([0-9]{4,8})/i);
        const mGoogleForward = body.match(/confirmation code[\s\:\-]+([0-9]{8,10})/i);
        const m4 = body.match(/\b\d{4}\b/);

        if (m6) foundCode = m6[0];
        else if (mGoogleForward) foundCode = mGoogleForward[1];
        else if (mPrefix) foundCode = mPrefix[1];
        else if (m4) foundCode = m4[0];
        else foundCode = "Đã kết nối";

        return {
          hasMail: true,
          code: foundCode,
          subject: latestMsg.getSubject(),
          date: latestMsg.getDate() ? latestMsg.getDate().toISOString() : ""
        };
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
