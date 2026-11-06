// =====================================================================
// KPI PASSION STAR - TỰ ĐỘNG ĐỒNG BỘ FORM DASHBOARD CHUẨN 100% GỐC
// File: SyncDashboard.gs (Lưu độc lập tại Apps Script)
// TUYỆT ĐỐI KHÔNG ẢNH HƯỞNG ĐẾN CODE API (doPost, doGet) TRONG Code.gs!
// =====================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⭐ KPI PASSION STAR")
    .addItem("🔄 Đồng Bộ Form Nhóm & Nhân Sự Mới", "dongBoDashboardChuanDep")
    .addSeparator()
    .addItem("🚀 Chuyển Sang Tháng Mới (Tự Động Clone & Lưu Trữ)", "chuyenSangThangMoiTuDong")
    .addItem("📦 Lưu Trữ & Đóng Băng Sheet Tháng Hiện Tại", "luuTruDashboardDongBang")
    .addSeparator()
    .addItem("💾 Lưu Dữ Liệu KPI Cột F & G (Tháng Hiện Tại)", "luuKpiDashboardThuCong")
    .addItem("👁️ Hiện / Ẩn Sheet Lưu Trữ KPI (_KPI_TARGET_DB)", "toggleDbSheetVisibility")
    .addToUi();
}

/**
 * TỰ ĐỘNG CHẠY KHI NGƯỜI DÙNG THAO TÁC TRÊN KPI_DASHBOARD:
 * 1. Đổi tháng tại ô B1 (ví dụ từ T11.2026 sang T12.2026):
 *    - Tự động lưu cấu hình Target & Basic của tháng cũ vào database ngầm.
 *    - Tự động lưu trữ / đóng băng (Paste Values) KPI_DASHBOARD tháng cũ thành sheet riêng (ví dụ NOV.2026).
 *    - Tự động nhân bản (clone) sheet DATA mới (ví dụ DATA T12.2026) từ DATA tháng cũ nếu chưa có.
 *    - Kích hoạt đồng bộ form nhóm, nhân sự và chỉ tiêu cho tháng mới.
 * 2. Nhập hoặc sửa Target (Cột F) / Basic (Cột G): Tự động lưu giá trị vào database
 *    ngầm _KPI_TARGET_DB tương ứng với tháng đang chọn ở ô B1!
 */
function onEdit(e) {
  if (!e || !e.range) return;
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== "KPI_DASHBOARD") return;

    const a1 = e.range.getA1Notation();

    // 1. Thay đổi tháng tại ô B1
    if (a1 === "B1") {
      let oldMonthVal = (e && e.oldValue && typeof e.oldValue === "string") ? e.oldValue.trim() : "";
      const newMonthVal = (sheet.getRange("B1").getValue() || "").toString().trim();

      if (newMonthVal) {
        if (!oldMonthVal) {
          // Tự động suy ra tháng cũ nếu Google Sheets không truyền oldValue
          const parsedNew = parseMonthYear(newMonthVal);
          let prevM = parsedNew.month - 1;
          let prevY = parsedNew.year;
          if (prevM === 0) { prevM = 12; prevY -= 1; }
          oldMonthVal = "T" + prevM + "." + prevY;
        }

        if (oldMonthVal !== newMonthVal) {
          // A. Lưu trữ Target & Basic của tháng cũ vào database
          saveAllCurrentDashboardKpi(sheet.getParent(), sheet, oldMonthVal);

          // B. Tự động lưu trữ / đóng băng KPI_DASHBOARD của tháng cũ thành sheet riêng (Paste Values)
          try {
            archiveDashboardSheet(sheet.getParent(), oldMonthVal);
          } catch (errArch) {}

          // C. Tự động clone sheet DATA cho tháng mới nếu chưa có
          try {
            const newDataSheetName = "DATA " + newMonthVal;
            if (!sheet.getParent().getSheetByName(newDataSheetName)) {
              cloneDataSheetForNewMonth(sheet.getParent(), oldMonthVal, newMonthVal);
              sheet.getParent().toast("Đã tự động khởi tạo sheet " + newDataSheetName + " cho tháng mới!", "Tự Động Clone ✨", 5);
            }
          } catch (errClone) {}
        }
      }

      dongBoDashboardChuanDep(true);
      return;
    }

    // 2. Chỉnh sửa cột Target (Cột F = cột 6) hoặc Basic KPI (Cột G = cột 7)
    const col = e.range.getColumn();
    const row = e.range.getRow();
    if ((col === 6 || col === 7) && row >= 3) {
      handleKpiCellEdit(sheet, e.range);
    }
  } catch (err) {
    // Tránh lỗi trigger context
  }
}

// Tên trang tính cơ sở dữ liệu ngầm lưu trữ Target và Basic KPI theo từng tháng
const DB_SHEET_NAME = "_KPI_TARGET_DB";

/**
 * Bảng cấu hình Team mặc định theo THỨ TỰ VÀNG CHUẨN GỐC
 * (ANGELIK -> FASHION -> ORION -> ROYEN:ONE -> MIRACLE -> ELRIS)
 */
const DEFAULT_TEAMS_CONFIG = [
  {
    name: "ANGELIK",
    target: 3600000,
    basic: 2500000,
    hRow: 6,
    defaultIdols: ["SUNNY", "CHLOE", "DOLIA", "SWEETIE", "JENNY", "NYA"],
    lastRowName: ""
  },
  {
    name: "FASHION",
    target: 3700000,
    basic: 3000000,
    hRow: 4,
    defaultIdols: ["DYLAN", "NAUL", "TAT", "TBOO", "FENG", "LILL RAID"],
    lastRowName: ""
  },
  {
    name: "ORION",
    target: 1500000,
    basic: 1000000,
    hRow: 9,
    defaultIdols: ["WILLY", "SOREN", "NEKO", "ROY", "DESNAS", "CHRIST", "TARMIX"],
    lastRowName: ""
  },
  {
    name: "ROYEN:ONE",
    target: 4200000,
    basic: 2700000,
    hRow: 5,
    defaultIdols: ["KAI", "DRAKE", "KYO", "COBRA", "MARYZ", "SUGAR", "VINCT", "WREN"],
    lastRowName: ""
  },
  {
    name: "MIRACLE",
    target: 5400000,
    basic: 3500000,
    hRow: 7,
    defaultIdols: ["SURI", "BAMBI", "KONI", "HAKIRA", "SOFIE", "CARROT"],
    lastRowName: ""
  },
  {
    name: "ELRIS",
    target: 2000000,
    basic: 1500000,
    hRow: 8,
    defaultIdols: ["COOKIES", "ALICE", "NINI", "RUBY", "ANGEL"],
    lastRowName: ""
  }
];

/**
 * Cấu hình vị trí chuẩn mực (Golden Anchors) của 6 nhóm trong sheet DATA:
 * - Top teams: FASHION (Cột B=2, Hàng 2), ROYEN:ONE (Cột W=23, Hàng 2), ELRIS (Cột AR=44, Hàng 2)
 * - Bottom teams: ANGELIK (Cột B=2, Hàng 44), MIRACLE (Cột W=23, Hàng 44), ORION (Cột AR=44, Hàng 44)
 */
const TEAM_ANCHORS = [
  { name: "FASHION", isTop: true, startCol: 2, defRange: "B2:H37", defLabel: "$A$2:$A$37", defTotal: 34, defKpi: 36 },
  { name: "ROYEN:ONE", isTop: true, startCol: 23, defRange: "W2:AE37", defLabel: "$A$2:$A$37", defTotal: 34, defKpi: 36 },
  { name: "ELRIS", isTop: true, startCol: 44, defRange: "AR2:AW37", defLabel: "$A$2:$A$37", defTotal: 34, defKpi: 36 },
  { name: "ANGELIK", isTop: false, startCol: 2, defRange: "B44:H79", defLabel: "$A$44:$A$79", defTotal: 34, defKpi: 36 },
  { name: "MIRACLE", isTop: false, startCol: 23, defRange: "W44:AC79", defLabel: "$A$44:$A$79", defTotal: 34, defKpi: 36 },
  { name: "ORION", isTop: false, startCol: 44, defRange: "AR44:AY79", defLabel: "$A$44:$A$79", defTotal: 34, defKpi: 36 }
];

/**
 * Chuyển đổi chỉ số cột 1-based sang chữ cái A1 (1 -> A, 2 -> B, 23 -> W, 27 -> AA...)
 */
function colToA1(col) {
  let str = "";
  while (col > 0) {
    let mod = (col - 1) % 26;
    str = String.fromCharCode(65 + mod) + str;
    col = Math.floor((col - mod) / 26);
  }
  return str;
}

/**
 * Chuẩn hóa chuỗi tháng để làm khóa tra cứu (ví dụ: " T11.2026 " -> "T11.2026")
 */
function normalizeMonthKey(m) {
  return String(m || "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Kiểm tra xem một giá trị ô có phải là số, ngày tháng, tiền tệ hoặc timestamp không
 * (Tránh tuyệt đối việc quét nhầm dữ liệu doanh số/ngày tháng thành tên Idol)
 */
function isNumericOrDate(val) {
  if (val === null || val === undefined || val === "") return false;
  if (val instanceof Date) return true;
  if (typeof val === "number") return true;
  const str = String(val).trim();
  if (!str) return false;
  if (str === "-" || str === "--") return true;
  const cleanNum = str.replace(/[,\$\s]/g, "").replace(/^\((.+)\)$/, "-$1");
  if (/^-?\d+(\.\d+)?$/.test(cleanNum)) return true;
  if (/^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/.test(str)) return true;
  if (/GMT[+-]\d/i.test(str)) return true;
  if (/^\d{1,2}:\d{2}/.test(str)) return true;
  return false;
}

/**
 * Kiểm tra xem chuỗi có phải là tiêu đề rác (ngày, stt...) không
 */
function isHeaderNoise(str) {
  const u = String(str || "").trim().toUpperCase();
  if (!u) return true;
  if (u === "DATE" || u === "NGÀY" || u === "STT" || u === "TIME" || u === "DAY" || u === "NO" || u === "NO." || u === "THỨ") return true;
  return false;
}

/**
 * Kiểm tra xem chuỗi có phải là cột tổng cộng không
 */
function isTotalCol(str) {
  const u = String(str || "").trim().toUpperCase();
  return u === "TOTAL" || u === "TỔNG" || u === "SUM" || u === "AVG" || u === "AVERAGE" || u.indexOf("TOTAL") !== -1 || u.indexOf("TỔNG") !== -1;
}

/**
 * Lấy hoặc khởi tạo sheet cơ sở dữ liệu ngầm _KPI_TARGET_DB
 */
function getOrCreateDbSheet(ss) {
  let dbSheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!dbSheet) {
    dbSheet = ss.insertSheet(DB_SHEET_NAME);
    dbSheet.getRange("A1:E1").setValues([
      ["Tháng", "Team", "Target KPI (Cột F)", "Basic KPI (Cột G)", "Cập Nhật Lúc"]
    ]);
    dbSheet.getRange("A1:E1")
      .setBackground("#333333")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    dbSheet.setColumnWidth(1, 110);
    dbSheet.setColumnWidth(2, 130);
    dbSheet.setColumnWidth(3, 170);
    dbSheet.setColumnWidth(4, 170);
    dbSheet.setColumnWidth(5, 180);
    dbSheet.hideSheet();
  }
  return dbSheet;
}

/**
 * Đọc cấu hình Target & Basic của một tháng từ sheet _KPI_TARGET_DB
 */
function loadKpiConfigForMonth(ss, monthVal) {
  const dbSheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!dbSheet) return {};

  const lastRow = dbSheet.getLastRow();
  if (lastRow < 2) return {};

  const data = dbSheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const config = {};
  const targetMonth = normalizeMonthKey(monthVal);

  for (let i = 0; i < data.length; i++) {
    const rowMonth = normalizeMonthKey(data[i][0]);
    const rowTeam = String(data[i][1] || "").trim().toUpperCase();
    const targetVal = data[i][2];
    const basicVal = data[i][3];

    if (rowMonth === targetMonth && rowTeam) {
      config[rowTeam] = {
        target: (targetVal !== "" && targetVal !== null && !isNaN(targetVal)) ? Number(targetVal) : null,
        basic: (basicVal !== "" && basicVal !== null && !isNaN(basicVal)) ? Number(basicVal) : null
      };
    }
  }
  return config;
}

/**
 * Lưu hoặc cập nhật Target hoặc Basic của một team theo tháng vào _KPI_TARGET_DB
 */
function saveTeamKpi(ss, monthVal, teamName, targetVal, basicVal) {
  if (!monthVal || !teamName) return;

  const dbSheet = getOrCreateDbSheet(ss);
  const targetMonth = normalizeMonthKey(monthVal);
  const targetTeam = String(teamName).trim().toUpperCase();
  const lastRow = dbSheet.getLastRow();

  let foundRow = -1;
  let currentTarget = null;
  let currentBasic = null;

  if (lastRow >= 2) {
    const data = dbSheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowMonth = normalizeMonthKey(data[i][0]);
      const rowTeam = String(data[i][1] || "").trim().toUpperCase();
      if (rowMonth === targetMonth && rowTeam === targetTeam) {
        foundRow = i + 2;
        currentTarget = data[i][2];
        currentBasic = data[i][3];
        break;
      }
    }
  }

  const nowStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  const finalTarget = (targetVal !== undefined && targetVal !== null && targetVal !== "") ? targetVal : currentTarget;
  const finalBasic = (basicVal !== undefined && basicVal !== null && basicVal !== "") ? basicVal : currentBasic;

  if (foundRow > 0) {
    if (finalTarget !== null && finalTarget !== undefined && finalTarget !== "") {
      dbSheet.getRange(foundRow, 3).setValue(finalTarget);
    }
    if (finalBasic !== null && finalBasic !== undefined && finalBasic !== "") {
      dbSheet.getRange(foundRow, 4).setValue(finalBasic);
    }
    dbSheet.getRange(foundRow, 5).setValue(nowStr);
  } else {
    dbSheet.appendRow([String(monthVal).trim(), teamName, finalTarget || "", finalBasic || "", nowStr]);
  }
}

/**
 * Xác định thông tin nhóm (Tên Team & Hàng bắt đầu block) tại một hàng bất kỳ trên KPI_DASHBOARD
 */
function getTeamBlockInfo(dashSheet, row) {
  for (let r = row; r >= 3; r--) {
    let cellVal = String(dashSheet.getRange(r, 3).getValue() || "").trim().toUpperCase();
    if (cellVal) {
      if (cellVal === "TOTAL") return null;
      let matched = cellVal;
      if (cellVal === "ROYEN ONE") matched = "ROYEN:ONE";
      else if (cellVal === "BNART") matched = "MIRACLE";
      else if (cellVal === "BEE") matched = "ELRIS";
      return { teamName: matched, startRow: r };
    }
  }
  return null;
}

/**
 * Xử lý sự kiện chỉnh sửa ô Target (F) hoặc Basic (G) trên KPI_DASHBOARD
 */
function handleKpiCellEdit(dashSheet, editedRange) {
  const row = editedRange.getRow();
  const col = editedRange.getColumn();
  const newVal = editedRange.getValue();

  const monthVal = dashSheet.getRange("B1").getValue() || "T11.2026";
  const teamInfo = getTeamBlockInfo(dashSheet, row);
  if (!teamInfo) return;

  const ss = dashSheet.getParent();
  if (col === 6) {
    saveTeamKpi(ss, monthVal, teamInfo.teamName, newVal, null);
    ss.toast("Đã tự động lưu Target " + teamInfo.teamName + " cho " + monthVal, "Lưu KPI Thành Công ⭐", 3);
  } else if (col === 7) {
    saveTeamKpi(ss, monthVal, teamInfo.teamName, null, newVal);
    ss.toast("Đã tự động lưu Basic KPI " + teamInfo.teamName + " cho " + monthVal, "Lưu KPI Thành Công ⭐", 3);
  }
}

/**
 * Lưu toàn bộ số liệu Target & Basic hiện có trên Dashboard vào _KPI_TARGET_DB
 */
function saveAllCurrentDashboardKpi(ss, dashSheet, monthVal) {
  if (!monthVal) return;
  const lastRow = dashSheet.getLastRow();
  if (lastRow < 3) return;

  let r = 3;
  while (r <= lastRow) {
    let teamName = String(dashSheet.getRange(r, 3).getValue() || "").trim();
    if (teamName.toUpperCase() === "TOTAL") break;

    if (teamName) {
      let targetVal = dashSheet.getRange(r, 6).getValue();
      let basicVal = dashSheet.getRange(r, 7).getValue();
      saveTeamKpi(ss, monthVal, teamName, targetVal, basicVal);
    }
    r++;
  }
}

/**
 * Menu Item: Lưu thủ công số liệu Cột F & G cho tháng hiện tại
 */
function luuKpiDashboardThuCong() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName("KPI_DASHBOARD");
  if (!dashSheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy trang tính KPI_DASHBOARD!");
    return;
  }
  const monthVal = dashSheet.getRange("B1").getValue() || "T11.2026";
  saveAllCurrentDashboardKpi(ss, dashSheet, monthVal);
  ss.toast("Đã lưu toàn bộ số liệu Target (Cột F) & Basic (Cột G) của " + monthVal + " vào cơ sở dữ liệu ngầm!", "Đã Lưu Thành Công ⭐", 4);
}

/**
 * Menu Item: Bật / Tắt hiển thị sheet cơ sở dữ liệu _KPI_TARGET_DB
 */
function toggleDbSheetVisibility() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dbSheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!dbSheet) {
    dbSheet = getOrCreateDbSheet(ss);
    dbSheet.showSheet();
    ss.toast("Đã khởi tạo và hiển thị sheet " + DB_SHEET_NAME, "Thông Báo ℹ️", 4);
    return;
  }

  if (dbSheet.isSheetHidden()) {
    dbSheet.showSheet();
    ss.toast("Đã hiển thị sheet cơ sở dữ liệu " + DB_SHEET_NAME, "Hiện Sheet 👁️", 4);
  } else {
    dbSheet.hideSheet();
    ss.toast("Đã ẩn sheet cơ sở dữ liệu " + DB_SHEET_NAME, "Ẩn Sheet 🔒", 4);
  }
}

/**
 * Hàm tự động xác định tên Sheet tháng trước dựa trên ô B1 (ví dụ: T11.2026 -> OCT.2026)
 */
function getPreviousMonthSheetName(ss, currentMonthVal) {
  const m = String(currentMonthVal).match(/T?(\d{1,2})\.(\d{4})/);
  if (!m) return "OCT.2026";

  let month = parseInt(m[1], 10);
  let year = parseInt(m[2], 10);
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const abbr = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JULY", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const candidate1 = abbr[prevMonth] + "." + prevYear; // ví dụ: OCT.2026
  const candidate2 = "T" + prevMonth + "." + prevYear;
  const candidate3 = "DATA T" + prevMonth + "." + prevYear;

  if (ss.getSheetByName(candidate1)) return candidate1;
  if (ss.getSheetByName(candidate2)) return candidate2;
  if (ss.getSheetByName(candidate3)) return candidate3;
  return candidate1;
}

/**
 * Tự động quét động thông minh và chính xác 100% cho từng nhóm:
 * - Đảm bảo chỉ nhận diện hàng chứa CHỮ (Tên Idol), TUYỆT ĐỐI LOẠI BỎ HÀNG SỐ VÀ DATE
 * - Bao trọn toàn bộ Idol (kể cả CARROT) VÀ CỘT TOTAL trong Range Bảng
 * - Nhận diện dòng TOTAL và KPI thực tế theo số ngày của tháng
 */
function scanAllTeamsDynamic(dataSheet) {
  if (!dataSheet) return {};
  const data = dataSheet.getDataRange().getValues();
  if (!data || data.length < 2) return {};

  const numRows = data.length;
  const numCols = data[0].length;
  const result = {};

  TEAM_ANCHORS.forEach(function(anchor) {
    const tName = anchor.name;
    const colStartExpected = anchor.startCol - 1; // 0-indexed
    const colEndExpected = Math.min(numCols, colStartExpected + 16);

    // 1. Định vị chính xác Hàng chứa Tên Idol (chỉ nhận hàng toàn CHỮ, loại bỏ hàng chứa SỐ hoặc DATE)
    const rowSearchStart = anchor.isTop ? 0 : 38;
    const rowSearchEnd = anchor.isTop ? Math.min(6, numRows) : Math.min(48, numRows);

    let bestRow = -1;
    let bestTextScore = 0;

    for (let r = rowSearchStart; r < rowSearchEnd; r++) {
      let textCount = 0;
      let numberCount = 0;

      for (let c = colStartExpected; c < colEndExpected; c++) {
        let val = data[r][c];
        if (val === "" || val === null || val === undefined) continue;

        if (isNumericOrDate(val)) {
          numberCount++;
        } else {
          let str = String(val).trim().toUpperCase();
          if (!isHeaderNoise(str)) {
            textCount++;
          }
        }
      }

      // Hàng Tên Idol chuẩn mực: Có ít nhất 2 tên bằng chữ và TUYỆT ĐỐI KHÔNG CÓ SỐ
      if (textCount >= 2 && numberCount === 0) {
        if (textCount > bestTextScore) {
          bestTextScore = textCount;
          bestRow = r;
        }
      }
    }

    // Nếu không tìm thấy bằng quét động, sử dụng hàng chuẩn gốc (Top = Row 2 index 1, Bottom = Row 44 index 43)
    if (bestRow === -1) {
      bestRow = anchor.isTop ? 1 : 43;
    }

    // 2. Quét danh sách Idol và xác định cột bắt đầu, cột kết thúc (bao gồm cả Cột TOTAL)
    let idols = [];
    let firstCol = -1;
    let lastIdolCol = -1;
    let totalCol = -1;
    let blanks = 0;

    for (let c = colStartExpected; c < Math.min(numCols, colStartExpected + 20); c++) {
      let val = data[bestRow][c];
      if (val === "" || val === null || val === undefined) {
        if (firstCol !== -1) {
          blanks++;
          if (blanks >= 3) break; // 3 ô trống liên tiếp mới dừng
        }
        continue;
      }

      // Bỏ qua nếu là số, ngày hoặc tiền tệ
      if (isNumericOrDate(val)) continue;

      let str = String(val).trim();
      let upper = str.toUpperCase();

      // Bỏ qua tiêu đề rác
      if (isHeaderNoise(upper)) continue;

      // Nhận diện cột TOTAL / TỔNG để mở rộng Range Bảng (không thêm vào danh sách idol)
      if (isTotalCol(upper)) {
        totalCol = c;
        blanks = 0;
        continue;
      }

      // Là tên Idol hợp lệ!
      blanks = 0;
      if (firstCol === -1) firstCol = c;
      lastIdolCol = c;
      idols.push(upper);
    }

    // Riêng nhóm MIRACLE: Đảm bảo CARROT luôn có mặt trong danh sách idol
    if (tName === "MIRACLE") {
      let hasCarrot = false;
      for (let m = 0; m < idols.length; m++) {
        if (idols[m] === "CARROT" || idols[m].indexOf("CARROT") !== -1) {
          hasCarrot = true;
          break;
        }
      }
      if (!hasCarrot) {
        // Kiểm tra xem CARROT có nằm ở các ô lân cận trong sheet không
        let foundCarrotCol = -1;
        for (let testC = Math.max(0, colStartExpected - 2); testC < Math.min(numCols, colStartExpected + 15); testC++) {
          for (let testR = Math.max(0, bestRow - 1); testR <= Math.min(numRows - 1, bestRow + 1); testR++) {
            let cellStr = String(data[testR][testC] || "").trim().toUpperCase();
            if (cellStr === "CARROT" || cellStr.indexOf("CARROT") !== -1) {
              foundCarrotCol = testC;
              break;
            }
          }
          if (foundCarrotCol !== -1) break;
        }
        if (foundCarrotCol !== -1) {
          idols.push("CARROT");
          if (foundCarrotCol > lastIdolCol) lastIdolCol = foundCarrotCol;
        } else {
          // Bổ sung CARROT từ cấu hình chuẩn
          idols.push("CARROT");
        }
      }
    }

    if (firstCol === -1) firstCol = colStartExpected;
    if (lastIdolCol === -1) lastIdolCol = colStartExpected + 5;

    // Range Bảng cột W bắt buộc phải bao trọn toàn bộ Idol VÀ CỘT TOTAL!
    let effectiveLastCol = Math.max(lastIdolCol, totalCol !== -1 ? totalCol : lastIdolCol + 1);

    // 3. Dò tìm dòng TOTAL và dòng KPI SALARY (Lãnh lương Ngày 10) để tính toán chỉ số tương đối
    let rTotal = -1;
    let rKpiSalary = -1;
    let rKpiGeneric = -1;
    let labelColCandidates = [0];
    if (firstCol > 0 && firstCol - 1 !== 0) labelColCandidates.push(firstCol - 1);
    let winningLabelCol = 0;

    for (let r = bestRow + 1; r < Math.min(bestRow + 42, numRows); r++) {
      for (let lci = 0; lci < labelColCandidates.length; lci++) {
        let lc = labelColCandidates[lci];
        let val = String(data[r][lc] || "").trim().toUpperCase();
        if (rTotal === -1 && (val.indexOf("TOTAL") !== -1 || val.indexOf("TỔNG") !== -1) && val.indexOf("KPI") === -1) {
          rTotal = r;
          winningLabelCol = lc;
        }
        // Ưu tiên dòng KPI SALARY / LÃNH LƯƠNG NGÀY 10
        if (rKpiSalary === -1 && (
          val.indexOf("KPI SALARY") !== -1 ||
          val.indexOf("LÃNH LƯƠNG") !== -1 ||
          val.indexOf("LƯƠNG NGÀY 10") !== -1 ||
          val.indexOf("DAY 10") !== -1
        )) {
          rKpiSalary = r;
        }
        // Lưu tạm KPI chung nếu chưa gặp KPI SALARY
        if (rKpiGeneric === -1 && val.indexOf("KPI") !== -1) {
          rKpiGeneric = r;
        }
      }
    }

    if (rTotal === -1) rTotal = bestRow + 33;
    let rKpi = rKpiSalary !== -1 ? rKpiSalary : (rKpiGeneric !== -1 ? rKpiGeneric : rTotal + 2);

    let maxRowIndex = Math.max(rTotal, rKpi);
    let startColLetter = colToA1(firstCol + 1);
    let endColLetter = colToA1(effectiveLastCol + 1);
    let startRowNum = bestRow + 1;
    let endRowNum = Math.max(maxRowIndex + 1, startRowNum + 35);
    let rangeStr = startColLetter + startRowNum + ":" + endColLetter + endRowNum;
    let totalRelIdx = (rTotal - bestRow) + 1;
    let kpiRelIdx = (rKpi - bestRow) + 1;
    let labelColLetter = colToA1(winningLabelCol + 1);
    let labelRangeA1 = "$" + labelColLetter + "$" + startRowNum + ":$" + labelColLetter + "$" + endRowNum;

    result[tName] = {
      teamName: tName,
      idols: idols,
      firstCol: firstCol,
      lastIdolCol: lastIdolCol,
      totalCol: totalCol,
      effectiveLastCol: effectiveLastCol,
      rangeStr: rangeStr,
      totalRelIdx: totalRelIdx,
      kpiRelIdx: kpiRelIdx,
      labelRangeA1: labelRangeA1,
      startColLetter: startColLetter,
      endColLetter: endColLetter,
      startRowNum: startRowNum,
      endRowNum: endRowNum
    };
  });

  return result;
}

/**
 * HÀM CHÍNH: TỰ ĐỘNG ĐỒNG BỘ FORM DASHBOARD ĐẸP 100% CHUẨN GỐC
 */
function dongBoDashboardChuanDep(isAuto) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName("KPI_DASHBOARD");
  if (!dashSheet) {
    if (!isAuto) SpreadsheetApp.getUi().alert("Không tìm thấy trang tính KPI_DASHBOARD!");
    return;
  }
  
  const selectedMonth = (dashSheet.getRange("B1").getValue() || "T11.2026").toString().trim();
  const dataSheetName = "DATA " + selectedMonth;
  let dataSheet = ss.getSheetByName(dataSheetName);
  
  if (!dataSheet) {
    // Tự động kiểm tra và clone tạo sheet DATA mới từ tháng trước nếu chưa có!
    try {
      const prevMonthSheetName = getPreviousMonthSheetName(ss, selectedMonth);
      dataSheet = cloneDataSheetForNewMonth(ss, prevMonthSheetName, selectedMonth);
      if (dataSheet) {
        ss.toast("Đã tự động khởi tạo sheet dữ liệu " + dataSheetName + " từ tháng trước!", "Tự Động Clone ✨", 5);
      }
    } catch (eClone) {}
  }

  if (!dataSheet) {
    if (!isAuto) {
      SpreadsheetApp.getUi().alert("Không tìm thấy trang tính dữ liệu: " + dataSheetName);
    } else {
      ss.toast("Chưa tìm thấy sheet dữ liệu " + dataSheetName + " để tự động đồng bộ!", "Lưu ý ⚠️", 5);
    }
    return;
  }

  if (!isAuto) {
    saveAllCurrentDashboardKpi(ss, dashSheet, selectedMonth);
  }

  // 1. Quét động toàn bộ 6 nhóm từ sheet DATA
  const dynamicTeams = scanAllTeamsDynamic(dataSheet);

  // Tải cấu hình Target & Basic đã lưu
  const savedMonthKpi = loadKpiConfigForMonth(ss, selectedMonth);

  const prevMonthSheet = getPreviousMonthSheetName(ss, selectedMonth);

  // 2. Cấu hình bảng phụ trợ V, W, X, Y (Hoàn toàn ĐỘNG, bao gồm cả cột TOTAL)
  dashSheet.getRange("V3:Y3").setValues([["SHEET NAME", "Range Bảng", "Cột tổng", "Cột KPI"]]);

  const helperRowOrder = [
    { teamName: "FASHION", row: 4, defRange: "B2:H37", defLabel: "$A$2:$A$37", defTotal: 34, defKpi: 36 },
    { teamName: "ROYEN:ONE", row: 5, defRange: "W2:AE37", defLabel: "$A$2:$A$37", defTotal: 34, defKpi: 36 },
    { teamName: "ANGELIK", row: 6, defRange: "B44:H79", defLabel: "$A$44:$A$79", defTotal: 34, defKpi: 36 },
    { teamName: "MIRACLE", row: 7, defRange: "W44:AC79", defLabel: "$A$44:$A$79", defTotal: 34, defKpi: 36 },
    { teamName: "ELRIS", row: 8, defRange: "AR2:AW37", defLabel: "$A$2:$A$37", defTotal: 34, defKpi: 36 },
    { teamName: "ORION", row: 9, defRange: "AR44:AY79", defLabel: "$A$44:$A$79", defTotal: 34, defKpi: 36 }
  ];

  const helperValues = helperRowOrder.map(function(item) {
    let tInfo = dynamicTeams[item.teamName];
    let rangeStr = (tInfo && tInfo.rangeStr) ? tInfo.rangeStr : item.defRange;
    let labelRange = (tInfo && tInfo.labelRangeA1) ? tInfo.labelRangeA1 : item.defLabel;
    let totalIdx = (tInfo && tInfo.totalRelIdx) ? tInfo.totalRelIdx : item.defTotal;
    let kpiIdx = (tInfo && tInfo.kpiRelIdx) ? tInfo.kpiRelIdx : item.defKpi;
    let hRow = item.row;

    return [
      '="DATA " & $B$1',
      rangeStr,
      '=IFERROR(MATCH("TOTAL*", INDIRECT(CHAR(39) & $V$' + hRow + ' & CHAR(39) & "!' + labelRange + '"), 0), ' + totalIdx + ')',
      '=IFERROR(MATCH("KPI SALARY*", INDIRECT(CHAR(39) & $V$' + hRow + ' & CHAR(39) & "!' + labelRange + '"), 0), IFERROR(MATCH("LÃNH LƯƠNG*", INDIRECT(CHAR(39) & $V$' + hRow + ' & CHAR(39) & "!' + labelRange + '"), 0), IFERROR(MATCH("KPI*", INDIRECT(CHAR(39) & $V$' + hRow + ' & CHAR(39) & "!' + labelRange + '"), 0), ' + kpiIdx + ')))'
    ];
  });

  dashSheet.getRange("V4:Y9").setValues(helperValues);

  // Ẩn bảng phụ trợ V, W, X, Y để bảng tính gọn gàng
  dashSheet.hideColumns(22, 4);

  // Chuẩn hóa Header Hàng 1 và Hàng 2:
  dashSheet.setRowHeight(1, 45);
  dashSheet.setRowHeight(2, 42);

  // Tiêu đề Hàng 1 (C1:O1)
  dashSheet.getRange("C1:O1")
    .setFormula('="KPI OF TEAMS - " & $B$1')
    .setBackground("#595959")
    .setFontColor("#FFFFFF")
    .setFontFamily("Calibri")
    .setFontSize(20)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, false, false, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // Chuẩn hóa nội dung Tiêu đề Cột Hàng 2 (C2:O2) động theo tháng:
  const monthFullNames = ["", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const parsedCurMonth = parseMonthYear(selectedMonth);
  let prevMonthNumber = parsedCurMonth.month - 1;
  if (prevMonthNumber === 0) prevMonthNumber = 12;
  const prevMonthFullName = monthFullNames[prevMonthNumber] || "PREVIOUS";
  const curMonthFullName = monthFullNames[parsedCurMonth.month] || "CURRENT";

  const headersRow2 = [
    "TEAM",
    "TEAM TOTAL",
    "TEAM KPI\n(MC SETUP)",
    "TEAM KPI TARGET\n(Get salary on Day 10)",
    "Basic KPI\n(Get KPI Salary)",
    "NAME",
    prevMonthFullName + " COINS",
    curMonthFullName + " KPI",
    curMonthFullName + " KPI\n(Get salary on Day 10)",
    curMonthFullName + " KPI\n(Get KPI salary)",
    "Tăng/\nGiảm",
    "LÃNH LƯƠNG\nNGÀY 10",
    "ĐẠT KPI"
  ];

  let headerRange = dashSheet.getRange(2, 3, 1, 13);
  headerRange.setValues([headersRow2])
    .setFontFamily("Calibri")
    .setFontSize(14)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  dashSheet.getRange("C2:O2").setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // 3. Unmerge và xóa sạch vùng dữ liệu cũ
  const maxRows = Math.max(dashSheet.getLastRow(), 80);
  dashSheet.getRange(3, 3, maxRows, 13).breakApart();
  dashSheet.getRange(3, 3, maxRows, 13).clearContent().clearFormat();

  const teamsConfig = DEFAULT_TEAMS_CONFIG;

  const cTeam = "#8E7CC2";
  const cTeamTotal = "#F4B082";
  const cKpi = "#8EAADA";
  const cName = "#D9D9D9";
  const cPrevCoins = "#FFE498";
  const cCurrCoins = "#B3534D";
  const cKpiDay10 = "#C48BFF";
  const cKpiSalary = "#6FA7DB";
  const cChange = "#FFFF85";
  const cEval = "#D9D9D9";
  const cWhite = "#FFFFFF";

  const numFmtCoins = '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)';
  const numFmtChange = '[Color10]▲ 0%;[Red]▼ -0%;0%';
  const numFmtTotal = '#,##0';

  let curRow = 3;

  teamsConfig.forEach(function(team) {
    // Ưu tiên danh sách idol quét được thực tế từ sheet DATA (kể cả CARROT, ZUMI...)
    let idols = team.defaultIdols;
    if (dynamicTeams[team.name] && dynamicTeams[team.name].idols && dynamicTeams[team.name].idols.length > 0) {
      idols = dynamicTeams[team.name].idols;
    }

    let count = idols.length;
    let blockStart = curRow;
    let blockEnd = curRow + count;

    // Cột C: Tên Team (Merge dọc)
    let teamCell = dashSheet.getRange(blockStart, 3, count + 1, 1);
    teamCell.merge();
    teamCell.setValue(team.name)
      .setBackground(cTeam)
      .setFontColor(cWhite)
      .setFontFamily("Calibri")
      .setFontSize(14)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Cột D: TEAM TOTAL (Merge dọc)
    let totalCell = dashSheet.getRange(blockStart, 4, count + 1, 1);
    totalCell.merge();
    totalCell.setFormula("=sum(J" + blockStart + ":J" + blockEnd + ")")
      .setBackground(cTeamTotal)
      .setFontColor("#000000")
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Cột E: TEAM KPI (MC SETUP) (Merge dọc)
    let kpiCell = dashSheet.getRange(blockStart, 5, count + 1, 1);
    kpiCell.merge();
    kpiCell.setFormula("=sum(K" + blockStart + ":K" + blockEnd + ")")
      .setBackground(cKpi)
      .setFontColor("#000000")
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Lấy giá trị Target & Basic đã lưu
    let teamTarget = team.target;
    let teamBasic = team.basic;

    if (savedMonthKpi && savedMonthKpi[team.name]) {
      let cfg = savedMonthKpi[team.name];
      if (cfg.target !== null && cfg.target !== undefined && cfg.target !== "") {
        teamTarget = cfg.target;
      }
      if (cfg.basic !== null && cfg.basic !== undefined && cfg.basic !== "") {
        teamBasic = cfg.basic;
      }
    }

    // Cột F: TEAM KPI TARGET (Merge dọc)
    let targetCell = dashSheet.getRange(blockStart, 6, count + 1, 1);
    targetCell.merge();
    targetCell.setValue(teamTarget)
      .setBackground(cKpi)
      .setFontColor("#000000")
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Cột G: Basic KPI (Merge dọc)
    let basicCell = dashSheet.getRange(blockStart, 7, count + 1, 1);
    basicCell.merge();
    basicCell.setValue(teamBasic)
      .setBackground(cKpi)
      .setFontColor("#000000")
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // 4. Render từng Idol trong nhóm
    for (let i = 0; i < count; i++) {
      let r = blockStart + i;
      let idol = idols[i];

      // H: NAME
      dashSheet.getRange("H" + r).setValue(idol)
        .setBackground(cName)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      // I: Previous Coins
      dashSheet.getRange("I" + r)
        .setFormula("=iferror(Vlookup(H" + r + ", '" + prevMonthSheet + "'!$H$3:$J$100, 3, 0), 0)")
        .setBackground(cPrevCoins)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // J: Current Coins (HLOOKUP động theo Range Bảng đã mở rộng)
      dashSheet.getRange("J" + r)
        .setFormula("=iferror(hlookup(H" + r + ", INDIRECT(CHAR(39) & $V$" + team.hRow + " & CHAR(39) & \"!\" & $W$" + team.hRow + "), $X$" + team.hRow + ", 0), 0)")
        .setBackground(cCurrCoins)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // K: KPI Day 10
      dashSheet.getRange("K" + r)
        .setFormula("=iferror(hlookup(H" + r + ", INDIRECT(CHAR(39) & $V$" + team.hRow + " & CHAR(39) & \"!\" & $W$" + team.hRow + "), $Y$" + team.hRow + ", 0), 0)")
        .setBackground(cKpiDay10)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // L: KPI Thưởng
      dashSheet.getRange("L" + r).setValue("")
        .setBackground(cKpiSalary)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // M: Tăng/Giảm
      dashSheet.getRange("M" + r)
        .setFormula("=IFERROR(((J" + r + "-I" + r + ")/I" + r + "), \"\")")
        .setBackground(cChange)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtChange)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      // N: Lãnh Lương Ngày 10
      dashSheet.getRange("N" + r)
        .setFormula("=IF(OR(ISBLANK(K" + r + "), K" + r + "=0, K" + r + "=\"\"), \"\", IF(OR(J" + r + ">K" + r + ", J" + r + "=K" + r + "), \"PASS\", if(J" + r + "<K" + r + ", \"FAIL\", \"\")))")
        .setBackground(cEval)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      // O: Đạt KPI Thưởng
      dashSheet.getRange("O" + r)
        .setFormula("=IF(OR(ISBLANK(L" + r + "), L" + r + "=0, L" + r + "=\"\"), \"\", IF(OR(J" + r + ">L" + r + ", J" + r + "=L" + r + "), \"PASS\", if(J" + r + "<L" + r + ", \"FAIL\", \"\")))")
        .setBackground(cWhite)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
    }

    // 5. Dòng gạch nối cuối block
    let sepRow = blockEnd;
    let sepName = team.lastRowName || "";
    if (sepName && idols.indexOf(sepName) !== -1) {
      sepName = "";
    }

    dashSheet.getRange("H" + sepRow)
      .setValue(sepName)
      .setBackground(cName)
      .setFontColor("#000000")
      .setFontFamily("Calibri")
      .setFontSize(12)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    dashSheet.getRange("I" + sepRow).setValue("-").setBackground(cPrevCoins).setFontColor("#000000").setFontFamily("Calibri").setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle");
    dashSheet.getRange("J" + sepRow).setValue("-").setBackground(cCurrCoins).setFontColor("#000000").setFontFamily("Calibri").setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle");
    dashSheet.getRange("K" + sepRow).setValue("-").setBackground(cKpiDay10).setFontColor("#000000").setFontFamily("Calibri").setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle");
    dashSheet.getRange("L" + sepRow).setValue("").setBackground(cKpiSalary);
    dashSheet.getRange("M" + sepRow).setValue("").setBackground(cChange).setNumberFormat(numFmtChange);
    dashSheet.getRange("N" + sepRow).setValue("").setBackground(cEval);
    dashSheet.getRange("O" + sepRow).setValue("").setBackground(cWhite);

    // Kẻ viền đóng khung đẹp cho cả nhóm
    let blockRange = dashSheet.getRange(blockStart, 3, count + 1, 13);
    blockRange.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
    blockRange.setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

    curRow = blockEnd + 1;
  });

  // Đảm bảo toàn bộ Cột N từ hàng 3 đến hàng cuối đều là nền #D9D9D9 (trừ dòng TOTAL)
  dashSheet.getRange(3, 14, curRow - 3, 1).setBackground(cEval);

  // 6. DÒNG TOTAL TỔNG CỘNG
  let totalRow = curRow;
  let lastDataRow = totalRow - 1;
  dashSheet.getRange("C" + totalRow).setValue("TOTAL").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("D" + totalRow).setFormula("=SUM(D3:D" + lastDataRow + ")").setBackground(cTeamTotal).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("E" + totalRow).setFormula("=SUM(E3:E" + lastDataRow + ")").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("F" + totalRow).setFormula("=SUM(F3:F" + lastDataRow + ")").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("G" + totalRow).setFormula("=SUM(G3:G" + lastDataRow + ")").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("H" + totalRow).setValue("").setBackground(cName).setFontSize(16);
  dashSheet.getRange("I" + totalRow).setFormula("=SUM(I3:I" + lastDataRow + ")").setBackground(cPrevCoins).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("J" + totalRow).setFormula("=SUM(J3:J" + lastDataRow + ")").setBackground(cCurrCoins).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("K" + totalRow).setFormula("=SUM(K3:K" + lastDataRow + ")").setBackground(cKpiDay10).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("L" + totalRow).setFormula("=SUM(L3:L" + lastDataRow + ")").setBackground(cKpiSalary).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("M" + totalRow).setValue("").setBackground(cChange);
  dashSheet.getRange("N" + totalRow).setValue("").setBackground(cWhite);
  dashSheet.getRange("O" + totalRow).setValue("").setBackground(cWhite);

  let totalRange = dashSheet.getRange(totalRow, 3, 1, 13);
  totalRange.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // 7. Định dạng có điều kiện (PASS: Xanh lá, FAIL: Xám)
  let rulePass = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("PASS")
    .setBackground("#00FF00")
    .setFontColor("#000000")
    .setRanges([dashSheet.getRange(3, 14, totalRow - 3, 2)])
    .build();

  let ruleFail = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("FAIL")
    .setBackground("#B7B7B7")
    .setFontColor("#000000")
    .setRanges([dashSheet.getRange(3, 14, totalRow - 3, 2)])
    .build();

  dashSheet.setConditionalFormatRules([rulePass, ruleFail]);

  // Đảm bảo dữ liệu của tháng này đã được ghi nhận vào _KPI_TARGET_DB (nếu là tháng mới)
  saveAllCurrentDashboardKpi(ss, dashSheet, selectedMonth);

  SpreadsheetApp.getActiveSpreadsheet().toast("Đã hoàn tất đồng bộ Dashboard chuẩn đẹp 100%!", "Thành Công ⭐", 4);
}

// =====================================================================
// BỘ TỰ ĐỘNG HÓA CHUYỂN THÁNG, CLONE DATA VÀ ĐÓNG BĂNG LƯU TRỮ
// =====================================================================

/**
 * Phân tích chuỗi tháng (ví dụ: "T11.2026", "11.2026", "NOV.2026") thành { month, year, formatted }
 */
function parseMonthYear(monthStr) {
  const m = String(monthStr || "").match(/T?(\d{1,2})\.(\d{4})/i);
  if (m) {
    const mm = parseInt(m[1], 10);
    const yy = parseInt(m[2], 10);
    return {
      month: mm,
      year: yy,
      formatted: "T" + mm + "." + yy
    };
  }
  const abbr = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JULY", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const mEn = String(monthStr || "").match(/([A-Z]{3,4})\.(\d{4})/i);
  if (mEn) {
    const idx = abbr.indexOf(mEn[1].toUpperCase());
    if (idx !== -1) {
      return {
        month: idx,
        year: parseInt(mEn[2], 10),
        formatted: "T" + idx + "." + mEn[2]
      };
    }
  }
  return { month: 11, year: 2026, formatted: "T11.2026" };
}

/**
 * Lấy tên viết tắt tiếng Anh của tháng (ví dụ: month=11, year=2026 -> "NOV.2026")
 */
function getMonthAbbrName(month, year) {
  const abbr = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JULY", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return (abbr[month] || "M" + month) + "." + year;
}

/**
 * Lấy thông tin chi tiết tháng tiếp theo
 */
function getNextMonthInfo(monthStr) {
  const cur = parseMonthYear(monthStr);
  let nextM = cur.month + 1;
  let nextY = cur.year;
  if (nextM > 12) {
    nextM = 1;
    nextY += 1;
  }
  return {
    curMonth: cur.month,
    curYear: cur.year,
    curFormatted: cur.formatted,
    curAbbrName: getMonthAbbrName(cur.month, cur.year),
    month: nextM,
    year: nextY,
    formatted: "T" + nextM + "." + nextY,
    abbrName: getMonthAbbrName(nextM, nextY),
    dataSheetName: "DATA T" + nextM + "." + nextY
  };
}

/**
 * Tự động nhân bản (clone) sheet KPI_DASHBOARD thành sheet lưu trữ độc lập cho tháng đó
 * và khóa giá trị (Paste Values) để lưu giữ lịch sử vĩnh viễn không bị thay đổi số liệu.
 */
function archiveDashboardSheet(ss, monthStr) {
  const parsed = parseMonthYear(monthStr);
  const abbrName = getMonthAbbrName(parsed.month, parsed.year); // ví dụ: "NOV.2026"
  const altName = "KPI_" + parsed.formatted; // ví dụ: "KPI_T11.2026"

  // Kiểm tra xem sheet lưu trữ đã tồn tại chưa
  let targetName = abbrName;
  if (ss.getSheetByName(targetName)) {
    targetName = altName;
  }
  if (ss.getSheetByName(targetName)) {
    // Đã có bản lưu trữ, không tạo thêm để tránh trùng lặp
    return ss.getSheetByName(targetName);
  }

  const dashSheet = ss.getSheetByName("KPI_DASHBOARD");
  if (!dashSheet) return null;

  // Clone sheet KPI_DASHBOARD
  const clonedSheet = dashSheet.copyTo(ss);
  clonedSheet.setName(targetName);

  // Đóng băng toàn bộ công thức thành giá trị cố định (Paste Values)
  // để vĩnh viễn không bị thay đổi khi số liệu tháng mới cập nhật
  const dataRange = clonedSheet.getDataRange();
  const values = dataRange.getValues();
  dataRange.setValues(values);

  // Bỏ ẩn các cột phụ trợ V..Y nếu có và làm sạch
  try {
    clonedSheet.showColumns(22, 4);
    clonedSheet.getRange("V1:Y100").clear();
  } catch (eClean) {}

  // Đặt màu tab xám để phân biệt với sheet đang hoạt động
  try {
    clonedSheet.setTabColor("#708090");
  } catch (eColor) {}

  // Đưa sheet lưu trữ về sau KPI_DASHBOARD
  try {
    ss.setActiveSheet(clonedSheet);
    ss.moveActiveSheet(dashSheet.getIndex() + 1);
  } catch (eMove) {}

  return clonedSheet;
}

/**
 * Tự động clone sheet DATA của tháng cũ sang tháng mới:
 * - Clone nguyên vẹn cấu trúc bảng (Idols, Teams, công thức TOTAL, KPI, KPI SALARY, format, màu sắc, viền)
 * - Tự động cập nhật cột Ngày tháng (Cột A) sang ngày của tháng mới
 * - Xóa sạch vùng nhập liệu số coins hàng ngày để sẵn sàng nhập liệu tháng mới
 */
function cloneDataSheetForNewMonth(ss, oldMonthStr, newMonthStr) {
  const oldParsed = parseMonthYear(oldMonthStr);
  const newParsed = parseMonthYear(newMonthStr);

  const oldDataSheetName = "DATA " + oldParsed.formatted; // ví dụ: "DATA T11.2026"
  const newDataSheetName = "DATA " + newParsed.formatted; // ví dụ: "DATA T12.2026"

  // Nếu sheet mới đã tồn tại, trả về sheet đó và không ghi đè
  let existingNewSheet = ss.getSheetByName(newDataSheetName);
  if (existingNewSheet) {
    return existingNewSheet;
  }

  // Tìm sheet DATA nguồn để clone
  let sourceSheet = ss.getSheetByName(oldDataSheetName);
  if (!sourceSheet) {
    const altOldName = "DATA " + getMonthAbbrName(oldParsed.month, oldParsed.year);
    sourceSheet = ss.getSheetByName(altOldName);
  }
  if (!sourceSheet) {
    // Tìm bất kỳ sheet DATA nào gần nhất
    const allSheets = ss.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getName().indexOf("DATA ") === 0) {
        sourceSheet = allSheets[i];
        break;
      }
    }
  }

  if (!sourceSheet) {
    throw new Error("Không tìm thấy sheet DATA nguồn (" + oldDataSheetName + ") để nhân bản!");
  }

  // 1. Nhân bản sheet DATA (copyTo giữ nguyên 100% định dạng, merge, màu sắc và công thức)
  const newSheet = sourceSheet.copyTo(ss);
  newSheet.setName(newDataSheetName);

  // Số ngày của tháng mới (28, 29, 30 hoặc 31)
  const daysInNewMonth = new Date(newParsed.year, newParsed.month, 0).getDate();

  // 2. Cập nhật Cột Ngày tháng (Cột A, V, AQ nếu có) cho cả 2 tầng Top & Bottom:
  // Top teams: hàng 3 đến hàng 3+daysInNewMonth-1
  // Bottom teams: hàng 45 đến hàng 45+daysInNewMonth-1
  const dateCols = [1, 22, 43]; // Cột A (1), Cột V (22), Cột AQ (43)
  const dateRanges = [
    { startRow: 3, maxRows: 31 },
    { startRow: 45, maxRows: 31 }
  ];

  dateCols.forEach(function(colIdx) {
    if (colIdx > newSheet.getLastColumn()) return;
    dateRanges.forEach(function(dr) {
      const sampleCell = newSheet.getRange(dr.startRow, colIdx);
      const sampleFormula = sampleCell.getFormula();
      // Nếu cột này dùng công thức tham chiếu sang Cột A (ví dụ =A3) thì không ghi đè
      if (sampleFormula && sampleFormula.indexOf("A") !== -1) return;
      const sampleVal = sampleCell.getValue();
      // Nếu là ô ngày hoặc ô Cột A
      if (colIdx === 1 || sampleVal instanceof Date || isNumericOrDate(sampleVal)) {
        for (let d = 1; d <= dr.maxRows; d++) {
          const curRow = dr.startRow + d - 1;
          const cell = newSheet.getRange(curRow, colIdx);
          if (d <= daysInNewMonth) {
            const dateObj = new Date(newParsed.year, newParsed.month - 1, d, 0, 0, 0);
            cell.setValue(dateObj);
          } else {
            cell.setValue("");
          }
        }
      }
    });
  });

  // 3. Quét động danh sách các nhóm và xóa sạch vùng nhập coin của idol:
  // Giữ nguyên 100% công thức TOTAL, KPI, KPI SALARY và tên Idol!
  try {
    const dynamicTeams = scanAllTeamsDynamic(newSheet);
    Object.keys(dynamicTeams).forEach(function(tKey) {
      const tInfo = dynamicTeams[tKey];
      if (tInfo && tInfo.firstCol && tInfo.lastIdolCol && tInfo.lastIdolCol >= tInfo.firstCol) {
        const sRow = tInfo.isTop ? 3 : 45;
        const numCols = tInfo.lastIdolCol - tInfo.firstCol + 1;
        // Xóa nội dung coins 31 ngày (clearContent giữ nguyên viền, format số và màu nền)
        newSheet.getRange(sRow, tInfo.firstCol, 31, numCols).clearContent();
      }
    });
  } catch (errScan) {
    // Dự phòng an toàn theo TEAM_ANCHORS
    TEAM_ANCHORS.forEach(function(anchor) {
      const sRow = anchor.isTop ? 3 : 45;
      newSheet.getRange(sRow, anchor.startCol, 31, 8).clearContent();
    });
  }

  // 4. Cập nhật tiêu đề nhóm nếu có chứa tên tháng cũ (ví dụ: T11 -> T12)
  try {
    const oldStr = "T" + oldParsed.month;
    const newStr = "T" + newParsed.month;
    const headerRows = [1, 43];
    headerRows.forEach(function(r) {
      const rowRange = newSheet.getRange(r, 1, 1, 60);
      const rowVals = rowRange.getValues()[0];
      for (let c = 0; c < rowVals.length; c++) {
        if (typeof rowVals[c] === "string" && rowVals[c].indexOf(oldStr) !== -1) {
          rowRange.getCell(1, c + 1).setValue(rowVals[c].replace(oldStr, newStr));
        }
      }
    });
  } catch (errTitle) {}

  // Đặt sheet mới kế tiếp sheet nguồn
  try {
    ss.setActiveSheet(newSheet);
    ss.moveActiveSheet(sourceSheet.getIndex() + 1);
  } catch (eMove) {}

  return newSheet;
}

/**
 * TÍNH NĂNG CHUYỂN SANG THÁNG MỚI (1-CLICK MỚI):
 * 1. Hỏi người dùng tháng muốn chuyển sang (gợi ý tự động, ví dụ T12.2026).
 * 2. Lưu trữ Target & Basic của tháng cũ vào _KPI_TARGET_DB.
 * 3. Clone sheet KPI_DASHBOARD thành sheet lưu trữ tháng cũ (ví dụ NOV.2026 / KPI_T11.2026)
 *    và đóng băng (Paste Values) toàn bộ số liệu để lưu giữ lịch sử vĩnh viễn.
 * 4. Tự động clone sheet DATA cũ (ví dụ DATA T11.2026) thành sheet DATA mới (DATA T12.2026):
 *    - Cập nhật tự động toàn bộ 31 ngày của tháng mới ở Cột A.
 *    - Xóa sạch dữ liệu coins cũ để sẵn sàng nhập liệu tháng mới.
 *    - Giữ nguyên 100% tên idol, công thức TOTAL, KPI, KPI SALARY và format viền màu.
 * 5. Cập nhật ô B1 = T12.2026 trên KPI_DASHBOARD và kích hoạt đồng bộ toàn diện!
 */
function chuyenSangThangMoiTuDong() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName("KPI_DASHBOARD");
  if (!dashSheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy trang tính KPI_DASHBOARD!");
    return;
  }

  const curMonth = String(dashSheet.getRange("B1").getValue() || "T11.2026").trim();
  const nextInfo = getNextMonthInfo(curMonth);
  const ui = SpreadsheetApp.getUi();

  const promptResult = ui.prompt(
    "🚀 CHUYỂN SANG THÁNG MỚI & TỰ ĐỘNG CLONE SHEET",
    "Tháng hiện tại trên Dashboard: " + curMonth + "\n\n" +
    "Hệ thống sẽ tự động thực hiện 3 bước:\n" +
    "1. Đóng băng & lưu trữ Dashboard Tháng cũ (" + curMonth + ") thành sheet độc lập (" + nextInfo.curAbbrName + ").\n" +
    "2. Nhân bản sheet dữ liệu mới (" + nextInfo.dataSheetName + ") từ " + ("DATA " + curMonth) + " với ngày tháng mới và làm sạch ô nhập liệu.\n" +
    "3. Cập nhật ô B1 sang tháng mới và kích hoạt đồng bộ Dashboard.\n\n" +
    "Nhập tên tháng mới bạn muốn chuyển sang (hoặc giữ nguyên mặc định):",
    ui.ButtonSet.OK_CANCEL
  );

  if (promptResult.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  let newMonthInput = promptResult.getResponseText().trim();
  if (!newMonthInput) {
    newMonthInput = nextInfo.formatted;
  }

  // Chuẩn hóa định dạng nếu người dùng nhập không có chữ T (ví dụ: 12.2026 -> T12.2026)
  if (/^\d{1,2}\.\d{4}$/.test(newMonthInput)) {
    newMonthInput = "T" + newMonthInput;
  }

  try {
    ss.toast("Đang tiến hành lưu trữ tháng cũ và clone dữ liệu tháng mới...", "Vui lòng chờ ⏳", 10);

    // 1. Lưu Target & Basic tháng cũ vào _KPI_TARGET_DB
    saveAllCurrentDashboardKpi(ss, dashSheet, curMonth);

    // 2. Clone và đóng băng KPI_DASHBOARD tháng cũ
    const archivedDash = archiveDashboardSheet(ss, curMonth);

    // 3. Clone sheet DATA tháng mới từ DATA tháng cũ
    const newDataSheet = cloneDataSheetForNewMonth(ss, curMonth, newMonthInput);

    // 4. Cập nhật ô B1 = newMonthInput
    dashSheet.getRange("B1").setValue(newMonthInput);

    // 5. Đồng bộ Dashboard cho tháng mới
    dongBoDashboardChuanDep(false);

    let archivedName = archivedDash ? archivedDash.getName() : "Đã lưu";
    let dataName = newDataSheet ? newDataSheet.getName() : ("DATA " + newMonthInput);

    ui.alert(
      "🎉 CHUYỂN THÁNG MỚI THÀNH CÔNG 100%!",
      "✅ Đã lưu trữ Dashboard tháng cũ (" + curMonth + ") vào sheet: " + archivedName + "\n" +
      "✅ Đã khởi tạo sheet dữ liệu tháng mới: " + dataName + " (Ngày tháng mới đã sẵn sàng, số liệu coins đã được dọn sạch để nhập mới!)\n" +
      "✅ Ô B1 đã chuyển sang: " + newMonthInput + "\n\n" +
      "Chúc bạn một tháng mới vận hành bùng nổ KPI! 🚀",
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert("Lỗi khi chuyển tháng: " + err.message);
  }
}

/**
 * ĐÓNG BĂNG & LƯU TRỮ DASHBOARD HIỆN TẠI RA SHEET ĐỘC LẬP
 * (Cho phép quản lý lưu trữ bất kỳ lúc nào mà không cần đổi ô B1)
 */
function luuTruDashboardDongBang() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName("KPI_DASHBOARD");
  if (!dashSheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy trang tính KPI_DASHBOARD!");
    return;
  }
  const curMonth = String(dashSheet.getRange("B1").getValue() || "T11.2026").trim();
  const ui = SpreadsheetApp.getUi();

  const confirm = ui.alert(
    "📦 LƯU TRỮ & ĐÓNG BĂNG SHEET THÁNG " + curMonth,
    "Hệ thống sẽ tạo một bản sao độc lập của KPI_DASHBOARD tháng " + curMonth + 
    ", khóa toàn bộ công thức thành giá trị cố định (Paste Values) để lưu trữ vĩnh viễn không bao giờ bị thay đổi số liệu.\n\n" +
    "Bạn có muốn tiếp tục?",
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  try {
    saveAllCurrentDashboardKpi(ss, dashSheet, curMonth);
    const archived = archiveDashboardSheet(ss, curMonth);
    if (archived) {
      ui.alert("✅ Đã lưu trữ thành công vào trang tính: " + archived.getName());
    } else {
      ui.alert("⚠️ Bản lưu trữ của tháng " + curMonth + " dường như đã tồn tại!");
    }
  } catch (e) {
    ui.alert("Lỗi khi lưu trữ: " + e.message);
  }
}
