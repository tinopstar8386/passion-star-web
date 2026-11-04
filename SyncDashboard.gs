// =====================================================================
// KPI PASSION STAR - TỰ ĐỘNG ĐỒNG BỘ FORM DASHBOARD CHUẨN 100% GỐC
// File: SyncDashboard.gs (Lưu độc lập tại Apps Script)
// TUYỆT ĐỐI KHÔNG ẢNH HƯỞNG ĐẾN CODE API (doPost, doGet) TRONG Code.gs!
// =====================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⭐ KPI PASSION STAR")
    .addItem("🔄 Đồng Bộ Form Nhóm & Nhân Sự Mới", "dongBoDashboardChuanDep")
    .addToUi();
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
 * Hàm đọc nhân sự động từ Sheet DATA (nếu có nhân sự mới hoặc thay đổi)
 */
function scanIdolsFromDataSheet(dataSheet) {
  if (!dataSheet) return {};
  const data = dataSheet.getDataRange().getValues();
  if (!data || data.length < 2) return {};

  const teamIdols = {};
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      let cellVal = String(data[r][c] || "").trim().toUpperCase();
      let matchedTeam = null;
      if (cellVal === "ANGELIK") matchedTeam = "ANGELIK";
      else if (cellVal === "FASHION") matchedTeam = "FASHION";
      else if (cellVal === "ORION") matchedTeam = "ORION";
      else if (cellVal === "ROYEN:ONE" || cellVal === "ROYEN ONE") matchedTeam = "ROYEN:ONE";
      else if (cellVal === "MIRACLE" || cellVal === "BNART") matchedTeam = "MIRACLE";
      else if (cellVal === "ELRIS" || cellVal === "BEE") matchedTeam = "ELRIS";
      
      if (matchedTeam && !teamIdols[matchedTeam]) {
        const idols = [];
        const nameRow = r + 1;
        if (nameRow < data.length) {
          for (let col = c + 1; col < data[nameRow].length; col++) {
            let name = String(data[nameRow][col] || "").trim();
            if (!name || name.toUpperCase() === "TOTAL" || name.toUpperCase() === "DATE") {
              break;
            }
            idols.push(name.toUpperCase());
          }
        }
        if (idols.length > 0) {
          teamIdols[matchedTeam] = idols;
        }
      }
    }
  }
  return teamIdols;
}

/**
 * HÀM CHÍNH: TỰ ĐỘNG ĐỒNG BỘ FORM DASHBOARD ĐẸP 100% CHUẨN GỐC
 */
function dongBoDashboardChuanDep() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName("KPI_DASHBOARD");
  if (!dashSheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy trang tính KPI_DASHBOARD!");
    return;
  }
  
  const selectedMonth = dashSheet.getRange("B1").getValue() || "T11.2026";
  const dataSheetName = "DATA " + selectedMonth;
  const dataSheet = ss.getSheetByName(dataSheetName);
  
  if (!dataSheet) {
    SpreadsheetApp.getUi().alert("Không tìm thấy trang tính dữ liệu: " + dataSheetName);
    return;
  }

  const prevMonthSheet = getPreviousMonthSheetName(ss, selectedMonth);

  // 1. Cấu hình bảng phụ trợ V, W, X, Y (Dynamic Range & Month Length Adaptation)
  // Đảm bảo không bị lệch dòng khi tháng có 28, 29, 30 hay 31 ngày
  dashSheet.getRange("V3:Y3").setValues([["SHEET NAME", "Range Bảng", "Cột tổng", "Cột KPI"]]);
  dashSheet.getRange("V4:Y9").setFormulas([
    // Hàng 4: FASHION (B2:G37)
    ["=\"DATA \" & $B$1", "B2:G37", "=MATCH(\"TOTAL\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0)", "=IFERROR(MATCH(\"KPI SALARY*\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0), MATCH(\"KPI*\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0))"],
    // Hàng 5: ROYEN:ONE (W2:AD37)
    ["=\"DATA \" & $B$1", "W2:AD37", "=MATCH(\"TOTAL\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0)", "=IFERROR(MATCH(\"KPI SALARY*\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0), MATCH(\"KPI*\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0))"],
    // Hàng 6: ANGELIK (B44:G79)
    ["=\"DATA \" & $B$1", "B44:G79", "=MATCH(\"TOTAL\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0)", "=IFERROR(MATCH(\"KPI SALARY*\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0), MATCH(\"KPI*\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0))"],
    // Hàng 7: MIRACLE (W44:AA79)
    ["=\"DATA \" & $B$1", "W44:AA79", "=MATCH(\"TOTAL\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0)", "=IFERROR(MATCH(\"KPI SALARY*\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0), MATCH(\"KPI*\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0))"],
    // Hàng 8: ELRIS (AR2:AV37)
    ["=\"DATA \" & $B$1", "AR2:AV37", "=MATCH(\"TOTAL\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0)", "=IFERROR(MATCH(\"KPI SALARY*\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0), MATCH(\"KPI*\", INDIRECT($V$4 & \"!$A$2:$A$37\"), 0))"],
    // Hàng 9: ORION (AR44:AX79)
    ["=\"DATA \" & $B$1", "AR44:AX79", "=MATCH(\"TOTAL\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0)", "=IFERROR(MATCH(\"KPI SALARY*\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0), MATCH(\"KPI*\", INDIRECT($V$4 & \"!$A$44:$A$79\"), 0))"]
  ]);

  // 2. Unmerge và xóa sạch vùng dữ liệu cũ từ hàng 3 đến hàng 65
  const maxRows = 65;
  dashSheet.getRange(3, 3, maxRows, 13).breakApart();
  dashSheet.getRange(3, 3, maxRows, 13).clearContent().clearFormat();

  // 3. Quét idol động từ sheet DATA
  const scannedIdols = scanIdolsFromDataSheet(dataSheet);

  // Bảng cấu hình Team theo THỨ TỰ VÀNG CHUẨN GỐC (ANGELIK -> FASHION -> ORION -> ROYEN:ONE -> MIRACLE -> ELRIS)
  const teamsConfig = [
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
      defaultIdols: ["SURI", "BAMBI", "KONI", "CARROT", "HAKIRA", "SOFIE"],
      lastRowName: "ZUMI"
    },
    {
      name: "ELRIS",
      target: 2000000,
      basic: 1500000,
      hRow: 8,
      defaultIdols: ["COOKIES", "ALICE", "NINI", "RUBY", "ANGEL"],
      lastRowName: "CHISTY"
    }
  ];

  // Màu sắc chuẩn 100% bản gốc
  const cTeam = "#8E7CC2";       // Tím Lavender đậm
  const cTeamTotal = "#F4B082";  // Cam đào ấm
  const cKpi = "#8EAADA";        // Xanh Slate nhạt
  const cName = "#D9D9D9";       // Xám nhạt
  const cPrevCoins = "#FFE498";  // Vàng kem nhạt
  const cCurrCoins = "#B3534D";  // Đỏ gạch
  const cKpiDay10 = "#C48BFF";   // Tím Lilac
  const cKpiSalary = "#6FA7DB";  // Xanh da trời
  const cChange = "#FFFF85";     // Vàng tươi
  const cEval = "#D9D9D9";       // Xám đánh giá
  const cWhite = "#FFFFFF";

  const numFmtCoins = '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)';
  const numFmtChange = '[Color10]▲ 0%;[Red]▼ -0%;0%';
  const numFmtTotal = '#,##0';

  let curRow = 3;

  teamsConfig.forEach(function(team) {
    // Ưu tiên danh sách idol quét được từ sheet DATA, nếu không có thì dùng danh sách chuẩn
    let idols = team.defaultIdols;
    if (scannedIdols[team.name] && scannedIdols[team.name].length > 0) {
      idols = team.defaultIdols;
    }

    let count = idols.length;
    let blockStart = curRow;
    let blockEnd = curRow + count; // Dòng gạch nối cuối block

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

    // Cột F: TEAM KPI TARGET (Merge dọc)
    let targetCell = dashSheet.getRange(blockStart, 6, count + 1, 1);
    targetCell.merge();
    targetCell.setValue(team.target)
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
    basicCell.setValue(team.basic)
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

      // I: Previous Coins (VLOOKUP chuẩn sang Sheet tháng trước)
      dashSheet.getRange("I" + r)
        .setFormula("=iferror(Vlookup(H" + r + ", '" + prevMonthSheet + "'!$H$3:$J$100, 3, 0), 0)")
        .setBackground(cPrevCoins)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // J: Current Coins (HLOOKUP động theo bảng phụ V, W, X)
      dashSheet.getRange("J" + r)
        .setFormula("=iferror(hlookup(H" + r + ", INDIRECT($V$" + team.hRow + "&\"!\"&$W$" + team.hRow + "), $X$" + team.hRow + ", 0), 0)")
        .setBackground(cCurrCoins)
        .setFontColor("#000000")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // K: KPI Day 10 (HLOOKUP động theo bảng phụ V, W, Y)
      dashSheet.getRange("K" + r)
        .setFormula("=iferror(hlookup(H" + r + ", INDIRECT($V$" + team.hRow + "&\"!\"&$W$" + team.hRow + "), $Y$" + team.hRow + ", 0), 0)")
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

      // M: Tăng/Giảm (Công thức % có mũi tên xanh lá ▲ / đỏ ▼)
      dashSheet.getRange("M" + r)
        .setFormula("=IFERROR(((J" + r + "-I" + r + ")/I" + r + "), \"\")")
        .setBackground(cChange)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtChange)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      // N: Lãnh Lương Ngày 10 (Bỏ qua ô trống hoặc KPI=0)
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
    dashSheet.getRange("H" + sepRow)
      .setValue(team.lastRowName || "")
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
    dashSheet.getRange("N" + sepRow).setValue("").setBackground(cWhite);
    dashSheet.getRange("O" + sepRow).setValue("").setBackground(cWhite);

    // Kẻ viền đóng khung đẹp cho cả nhóm
    let blockRange = dashSheet.getRange(blockStart, 3, count + 1, 13);
    blockRange.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

    curRow = blockEnd + 1;
  });

  // 6. DÒNG TOTAL TỔNG CỘNG - FONT SIZE 16pt, IN ĐẬM, VIỀN ĐẬM ĐẸP CHUẨN GỐC
  let totalRow = curRow;
  dashSheet.getRange("C" + totalRow).setValue("TOTAL").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("D" + totalRow).setFormula("=SUM(D3:D" + (totalRow - 1) + ")").setBackground(cTeamTotal).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("E" + totalRow).setFormula("=SUM(E3:E" + (totalRow - 1) + ")").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("F" + totalRow).setFormula("=SUM(F3:F" + (totalRow - 1) + ")").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("G" + totalRow).setFormula("=SUM(G3:G" + (totalRow - 1) + ")").setBackground(cKpi).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("H" + totalRow).setValue("").setBackground(cName).setFontSize(16);
  dashSheet.getRange("I" + totalRow).setFormula("=SUM(I3:I" + (totalRow - 1) + ")").setBackground(cPrevCoins).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("J" + totalRow).setFormula("=SUM(J3:J" + (totalRow - 1) + ")").setBackground(cCurrCoins).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("K" + totalRow).setFormula("=SUM(K3:K" + (totalRow - 1) + ")").setBackground(cKpiDay10).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("L" + totalRow).setFormula("=SUM(L3:L" + (totalRow - 1) + ")").setBackground(cKpiSalary).setFontColor("#000000").setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("M" + totalRow).setValue("").setBackground(cChange);
  dashSheet.getRange("N" + totalRow).setValue("").setBackground(cWhite);
  dashSheet.getRange("O" + totalRow).setValue("").setBackground(cWhite);

  let totalRange = dashSheet.getRange(totalRow, 3, 1, 13);
  totalRange.setBorder(true, true, true, true, null, true, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

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

  SpreadsheetApp.getActiveSpreadsheet().toast("Đã hoàn tất đồng bộ Dashboard chuẩn đẹp 100%!", "Thành Công ⭐", 4);
}
