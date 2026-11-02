// =====================================================================
// KPI PASSION STAR - TỰ ĐỘNG ĐỒNG BỘ FORM DASHBOARD CHUẨN 100% GỐC
// File này lưu độc lập tại Apps Script: SyncDashboard.gs
// KHÔNG ảnh hưởng hay đụng chạm đến code API (doPost, doGet) hiện tại!
// =====================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⭐ KPI PASSION STAR")
    .addItem("🔄 Đồng Bộ Form Nhóm & Nhân Sự Mới", "dongBoDashboardChuanDep")
    .addToUi();
}

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

  // 1. Unmerge và xóa toàn bộ vùng dữ liệu cũ từ hàng 3 đến hàng 60
  const maxRows = 60;
  dashSheet.getRange(3, 3, maxRows, 13).breakApart();
  dashSheet.getRange(3, 3, maxRows, 13).clearContent().clearFormat();

  // Bảng cấu hình Team chuẩn theo thứ tự của file gốc (OCT 2026 / NOV 2026)
  // Mapping đúng hàng phụ V, W, X, Y như file NOV.2026 gốc:
  // FASHION = Hàng 4, ROYEN:ONE = Hàng 5, ANGELIK = Hàng 6, MIRACLE = Hàng 7, ELRIS = Hàng 8, ORION = Hàng 9
  const teamsConfig = [
    { name: "ANGELIK",   target: 3600000, basic: 2500000, hRow: 6, idols: ["SUNNY", "CHLOE", "DOLIA", "SWEETIE", "JENNY", "NYA"] },
    { name: "FASHION",   target: 3700000, basic: 3000000, hRow: 4, idols: ["DYLAN", "NAUL", "TAT", "TBOO", "FENG", "LILL RAID"] },
    { name: "ORION",     target: 1500000, basic: 1000000, hRow: 9, idols: ["WILLY", "SOREN", "NEKO", "ROY", "DESNAS", "CHRIST", "TARMIX"] },
    { name: "ROYEN:ONE", target: 4200000, basic: 2700000, hRow: 5, idols: ["KAI", "DRAKE", "KYO", "COBRA", "MARYZ", "SUGAR", "VINCT", "WREN"] },
    { name: "MIRACLE",   target: 5400000, basic: 3500000, hRow: 7, idols: ["SURI", "BAMBI", "KONI", "HAKIRA", "SOFIE"] },
    { name: "ELRIS",     target: 2000000, basic: 1500000, hRow: 8, idols: ["WENDY", "ALICE", "JADE", "RUBY", "MILKA"] }
  ];

  // Màu sắc chuẩn 100% gốc OCT 2026 / NOV 2026
  const cTeam = "#8E7CC3";       // Tím Lavender
  const cTeamTotal = "#F9CB9C";  // Cam đào
  const cKpi = "#9FC5E8";        // Xanh dương nhạt
  const cName = "#D9D9D9";       // Xám nhạt
  const cPrevCoins = "#FFF2CC";  // Vàng nhạt
  const cCurrCoins = "#EA9999";  // Đỏ san hô
  const cKpiDay10 = "#D9D2E9";   // Tím nhạt
  const cKpiSalary = "#9FC5E8";  // Xanh thưởng
  const cChange = "#FFF2CC";     // Vàng
  const cEval = "#D9D9D9";       // Xám mặc định

  const numFmtCoins = '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)';
  const numFmtChange = '[Color10]▲ 0%;[Red]▼ -0%;0%';
  const numFmtTotal = '#,##0';

  let curRow = 3;

  teamsConfig.forEach(function(team) {
    let idols = team.idols;
    let count = idols.length;
    let blockStart = curRow;
    let blockEnd = curRow + count; // Bao gồm dòng gạch nối cuối

    // Cột C: Tên Team
    let teamCell = dashSheet.getRange(blockStart, 3, count + 1, 1);
    teamCell.merge();
    teamCell.setValue(team.name)
      .setBackground(cTeam)
      .setFontColor("#FFFFFF")
      .setFontFamily("Calibri")
      .setFontSize(14)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Cột D: TEAM TOTAL
    let totalCell = dashSheet.getRange(blockStart, 4, count + 1, 1);
    totalCell.merge();
    totalCell.setFormula(`=sum(J${blockStart}:J${blockEnd})`)
      .setBackground(cTeamTotal)
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Cột E: TEAM KPI
    let kpiCell = dashSheet.getRange(blockStart, 5, count + 1, 1);
    kpiCell.merge();
    kpiCell.setFormula(`=sum(K${blockStart}:K${blockEnd})`)
      .setBackground(cKpi)
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Cột F: TEAM KPI TARGET
    let targetCell = dashSheet.getRange(blockStart, 6, count + 1, 1);
    targetCell.merge();
    targetCell.setValue(team.target)
      .setBackground(cKpi)
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Cột G: Basic KPI
    let basicCell = dashSheet.getRange(blockStart, 7, count + 1, 1);
    basicCell.merge();
    basicCell.setValue(team.basic)
      .setBackground(cKpi)
      .setFontFamily("Calibri")
      .setFontSize(13)
      .setNumberFormat(numFmtCoins)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // Render từng Idol theo đúng công thức của file NOV.2026 gốc
    for (let i = 0; i < count; i++) {
      let r = blockStart + i;
      let idol = idols[i];

      // H: NAME
      dashSheet.getRange("H" + r).setValue(idol)
        .setBackground(cName)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      // I: Previous Coins
      dashSheet.getRange("I" + r)
        .setFormula(`=iferror(Vlookup(H${r}, OCT.2026!$H$3:$J$101, 3, 0), 0)`)
        .setBackground(cPrevCoins)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // J: Current Coins (HLOOKUP theo hàng phụ V, W, X của file gốc)
      dashSheet.getRange("J" + r)
        .setFormula(`=iferror(hlookup(H${r}, INDIRECT($V$${team.hRow}&"!"&$W$${team.hRow}), $X$${team.hRow}, 0), 0)`)
        .setBackground(cCurrCoins)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // K: KPI Day 10 (HLOOKUP theo hàng phụ V, W, Y của file gốc)
      dashSheet.getRange("K" + r)
        .setFormula(`=iferror(hlookup(H${r}, INDIRECT($V$${team.hRow}&"!"&$W$${team.hRow}), $Y$${team.hRow}, 0), 0)`)
        .setBackground(cKpiDay10)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // L: KPI Thưởng
      dashSheet.getRange("L" + r)
        .setBackground(cKpiSalary)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtCoins)
        .setHorizontalAlignment("right")
        .setVerticalAlignment("middle");

      // M: Tăng/Giảm (Công thức chuẩn file NOV.2026 gốc)
      dashSheet.getRange("M" + r)
        .setFormula(`=IFERROR(((J${r}-I${r})/I${r}), "")`)
        .setBackground(cChange)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setNumberFormat(numFmtChange)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      // N: Lãnh Lương Ngày 10 (Công thức chuẩn file NOV.2026 gốc)
      dashSheet.getRange("N" + r)
        .setFormula(`=IF(K${r}=0, "", IF(OR(J${r}>K${r}, J${r}=K${r}), "PASS", if(J${r}<K${r}, "FAIL", "")))`)
        .setBackground(cEval)
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

      // O: Đạt KPI (Công thức chuẩn file NOV.2026 gốc)
      dashSheet.getRange("O" + r)
        .setFormula(`=IF(L${r}=0, "", IF(OR(J${r}>L${r}, J${r}=L${r}), "PASS", if(J${r}<L${r}, "FAIL", "")))`)
        .setBackground("#FFFFFF")
        .setFontFamily("Calibri")
        .setFontSize(12)
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
    }

    // Dòng gạch nối cuối block
    let sepRow = blockEnd;
    dashSheet.getRange("H" + sepRow).setValue("").setBackground(cName);
    dashSheet.getRange("I" + sepRow).setValue("-").setBackground(cPrevCoins).setHorizontalAlignment("center").setVerticalAlignment("middle");
    dashSheet.getRange("J" + sepRow).setValue("-").setBackground(cCurrCoins).setHorizontalAlignment("center").setVerticalAlignment("middle");
    dashSheet.getRange("K" + sepRow).setValue("-").setBackground(cKpiDay10).setHorizontalAlignment("center").setVerticalAlignment("middle");
    dashSheet.getRange("L" + sepRow).setValue("").setBackground(cKpiSalary);
    dashSheet.getRange("M" + sepRow).setValue("").setBackground(cChange);
    dashSheet.getRange("N" + sepRow).setValue("").setBackground("#FFFFFF");
    dashSheet.getRange("O" + sepRow).setValue("").setBackground("#FFFFFF");

    // Viền khung đậm cho cả khối nhóm
    let blockRange = dashSheet.getRange(blockStart, 3, count + 1, 13);
    blockRange.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

    curRow = blockEnd + 1;
  });

  // Dòng TOTAL tổng cộng - CHỮ TO 16pt, IN ĐẬM, CHUẨN ĐẸP 100% GỐC
  let totalRow = curRow;
  dashSheet.getRange("C" + totalRow).setValue("TOTAL").setBackground(cKpi).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("D" + totalRow).setFormula(`=SUM(D3:D${totalRow - 1})`).setBackground(cTeamTotal).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("E" + totalRow).setFormula(`=SUM(E3:E${totalRow - 1})`).setBackground(cKpi).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("F" + totalRow).setFormula(`=SUM(F3:F${totalRow - 1})`).setBackground(cKpi).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("G" + totalRow).setFormula(`=SUM(G3:G${totalRow - 1})`).setBackground(cKpi).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("H" + totalRow).setValue("").setBackground(cName).setFontSize(16);
  dashSheet.getRange("I" + totalRow).setFormula(`=SUM(I3:I${totalRow - 1})`).setBackground(cPrevCoins).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("J" + totalRow).setFormula(`=SUM(J3:J${totalRow - 1})`).setBackground(cCurrCoins).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("K" + totalRow).setFormula(`=SUM(K3:K${totalRow - 1})`).setBackground(cKpiDay10).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("L" + totalRow).setFormula(`=SUM(L3:L${totalRow - 1})`).setBackground(cKpiSalary).setFontFamily("Calibri").setFontSize(16).setFontWeight("bold").setNumberFormat(numFmtTotal).setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashSheet.getRange("M" + totalRow).setValue("").setBackground(cChange);
  dashSheet.getRange("N" + totalRow).setValue("").setBackground("#FFFFFF");
  dashSheet.getRange("O" + totalRow).setValue("").setBackground("#FFFFFF");

  let totalRange = dashSheet.getRange(totalRow, 3, 1, 13);
  totalRange.setBorder(true, true, true, true, null, true, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Áp dụng Conditional Formatting cho PASS (Xanh lá) và FAIL (Xám)
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
