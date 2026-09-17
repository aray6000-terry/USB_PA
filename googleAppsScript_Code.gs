/**
 * 優德美科技 - 績效考核與專案積分管理系統 (Google Apps Script 後端)
 * 模式二：Google 試算表 Web App (免伺服器輕量部署)
 * 
 * 部署指引：
 * 1. 在 Google Sheet 點選「擴充功能」>「Apps Script」
 * 2. 清空原本的程式碼，將此檔案全部內容貼上
 * 3. 點選「部署」>「新的部署作業」
 * 4. 類型選擇「網頁應用程式 (Web App)」
 * 5. 「執行身分」選「我 (您的 Google 帳號)」
 * 6. 「誰可以存取」選「所有人 (Anyone)」
 * 7. 點選「部署」，並複製產生的「網頁應用程式網址 (Web App URL)」
 * 8. 將此 URL 貼回系統前端設定中的「Google Apps Script Web App 網址」即可！
 */

// 預設資料庫加密傳輸金鑰 (請與前端設定一致，可自行修改)
var SECRET_KEY = "YouDeMei-Secure-Kpi-Key-2026";

// 表格名稱定義
var SHEET_PROJECTS = "專案資料表";
var SHEET_UPLOADS = "每月上傳紀錄表";
var SHEET_USERS = "人員權限表";

/**
 * 試算表初始化：建立標準標題列與範例資料
 */
function initDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 專案資料表
  var projSheet = ss.getSheetByName(SHEET_PROJECTS);
  if (!projSheet) {
    projSheet = ss.insertSheet(SHEET_PROJECTS);
  }
  if (projSheet.getLastRow() === 0) {
    var headers = [
      "案編", "案名", "圖編", "整合項目", "收件日期", 
      "專案工程師", "需求日期", "軟體工程師", "主管填寫佔比", 
      "軟體完成時間", "硬體完成時間", "是否為智慧建築", 
      "智慧建築等級", "戶數", "報價", "專案狀態", "完成比例", "基準積分"
    ];
    projSheet.appendRow(headers);
    projSheet.getRange(1, 1, 1, headers.length).setBackground("#1e293b").setFontColor("#f8fafc").setFontWeight("bold");
    
    // 預設範例專案
    var sampleProjects = [
      [
        "UDM-2026-001", "信義天際綠能大樓", "DWG-101", "門禁整合、BA監控、智慧建築", "2026-01-10",
        "陳專案", "2026-03-30", "林軟體", "林軟體:100%", "2026-03-25",
        "2026-03-28", "是", "鑽石", 120, 800000, "已結案", "100%", 96
      ],
      [
        "UDM-2026-002", "板橋智慧商業園區", "DWG-102", "中央監控、電力整合", "2026-02-05",
        "王專案", "2026-05-15", "林軟體, 李程式", "林軟體:60%, 李程式:40%", "2026-05-10",
        "2026-05-12", "是", "黃金", 80, 500000, "已結案", "100%", 57.5
      ],
      [
        "UDM-2026-003", "青埔明日之星住宅", "DWG-103", "弱電智慧宅、對講機系統", "2026-03-01",
        "陳專案", "2026-06-20", "李程式", "李程式:100%", "2026-06-18",
        "2026-06-20", "否", "無", 150, 280000, "已結案", "100%", 8
      ],
      [
        "UDM-2026-004", "內湖科技廠維護年度案", "DWG-104", "定期系統維護、軟體巡檢", "2026-01-01",
        "王專案", "2026-12-31", "張工程", "張工程:100%", "2026-06-30",
        "2026-06-30", "否", "無", 1, 60000, "已結案", "100%", 1
      ],
      [
        "UDM-2026-005", "南港智慧科技大樓", "DWG-105", "AI能源最佳化、智慧建築整合", "2026-04-12",
        "陳專案", "2026-08-30", "林軟體, 張工程", "林軟體:50%, 張工程:50%", "2026-08-20",
        "2026-08-25", "是", "銀", 240, 650000, "已結案", "100%", 71.5
      ],
      [
        "UDM-2025-012", "去年同期案：大安敦南名邸", "DWG-090", "門禁安全監控", "2025-03-05",
        "陳專案", "2025-05-30", "林軟體", "林軟體:100%", "2025-05-28",
        "2025-05-29", "是", "銅", 90, 400000, "已結案", "100%", 42
      ],
      [
        "UDM-2025-015", "去年同期案：新竹高鐵大廈", "DWG-095", "智慧水電與弱電系統", "2025-06-01",
        "王專案", "2025-08-15", "李程式", "李程式:100%", "2025-08-10",
        "2025-08-12", "否", "無", 45, 180000, "已結案", "100%", 5
      ]
    ];
    sampleProjects.forEach(function(row) {
      projSheet.appendRow(row);
    });
  }

  // 2. 每月固定上傳資料紀錄表 (0.2 分/月)
  var uploadSheet = ss.getSheetByName(SHEET_UPLOADS);
  if (!uploadSheet) {
    uploadSheet = ss.insertSheet(SHEET_UPLOADS);
  }
  if (uploadSheet.getLastRow() === 0) {
    var uploadHeaders = ["年月", "軟體工程師", "上傳狀態", "上傳時間", "助理審核狀態", "審核時間", "審核助理", "核可積分"];
    uploadSheet.appendRow(uploadHeaders);
    uploadSheet.getRange(1, 1, 1, uploadHeaders.length).setBackground("#1e293b").setFontColor("#f8fafc").setFontWeight("bold");
    
    var sampleUploads = [
      ["2026-01", "林軟體", "已上傳", "2026-01-28", "審核通過", "2026-01-29", "陳助理", 0.2],
      ["2026-02", "林軟體", "已上傳", "2026-02-26", "審核通過", "2026-02-27", "陳助理", 0.2],
      ["2026-03", "林軟體", "已上傳", "2026-03-27", "審核通過", "2026-03-28", "陳助理", 0.2],
      ["2026-04", "林軟體", "已上傳", "2026-04-28", "審核通過", "2026-04-29", "陳助理", 0.2],
      ["2026-05", "林軟體", "已上傳", "2026-05-29", "審核通過", "2026-05-30", "陳助理", 0.2],
      ["2026-06", "林軟體", "已上傳", "2026-06-28", "審核通過", "2026-06-29", "陳助理", 0.2],
      ["2026-01", "李程式", "已上傳", "2026-01-29", "審核通過", "2026-01-30", "陳助理", 0.2],
      ["2026-02", "李程式", "已上傳", "2026-02-28", "審核通過", "2026-03-01", "陳助理", 0.2],
      ["2026-03", "李程式", "已上傳", "2026-03-30", "審核通過", "2026-03-31", "陳助理", 0.2],
      ["2026-07", "林軟體", "已上傳", "2026-07-30", "待審核", "", "", 0],
      ["2026-07", "李程式", "已上傳", "2026-07-30", "待審核", "", "", 0],
      ["2026-07", "張工程", "已上傳", "2026-07-31", "待審核", "", "", 0]
    ];
    sampleUploads.forEach(function(row) {
      uploadSheet.appendRow(row);
    });
  }

  // 3. 人員權限表
  var userSheet = ss.getSheetByName(SHEET_USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(SHEET_USERS);
  }
  if (userSheet.getLastRow() === 0) {
    var userHeaders = ["帳號", "姓名", "角色", "管轄工程師名單", "密碼"];
    userSheet.appendRow(userHeaders);
    userSheet.getRange(1, 1, 1, userHeaders.length).setBackground("#1e293b").setFontColor("#f8fafc").setFontWeight("bold");
    
    var sampleUsers = [
      ["admin", "超級管理員", "超級使用者", "全部", "admin123"],
      ["manager1", "王主管", "主管", "林軟體, 李程式, 張工程", "mgr123"],
      ["engineer1", "林軟體", "工程師", "林軟體", "eng123"],
      ["engineer2", "李程式", "工程師", "李程式", "eng123"],
      ["engineer3", "張工程", "工程師", "張工程", "eng123"],
      ["assistant1", "陳助理", "助理", "無", "ast123"]
    ];
    sampleUsers.forEach(function(row) {
      userSheet.appendRow(row);
    });
  }
}

/**
 * 處理 GET 請求：取得所有資料
 */
function doGet(e) {
  try {
    initDatabase();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

    // 支援以 GET 方式進行安全登入 (避免瀏覽器對 POST 之 302 重導向觸發 CORS 封鎖)
    if (action === "login") {
      var username = (e && e.parameter && e.parameter.username) ? e.parameter.username : "";
      var passwordHash = (e && e.parameter && e.parameter.passwordHash) ? e.parameter.passwordHash : "";
      return handleLoginAuth(ss, username, passwordHash);
    }
    
    var projectsData = sheetToObjects(ss.getSheetByName(SHEET_PROJECTS));
    var uploadsData = sheetToObjects(ss.getSheetByName(SHEET_UPLOADS));
    var rawUsers = sheetToObjects(ss.getSheetByName(SHEET_USERS));
    
    // 安全過濾：絕對不外洩人員密碼至前端
    var safeUsers = rawUsers.map(function(u) {
      return {
        "帳號": u["帳號"],
        "姓名": u["姓名"],
        "角色": u["角色"],
        "管轄工程師名單": u["管轄工程師名單"]
      };
    });
    
    var payload = {
      status: "success",
      timestamp: new Date().toISOString(),
      projects: projectsData,
      uploads: uploadsData,
      users: safeUsers
    };
    
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 POST 請求：接收登入驗證、新增專案、更新主管佔比、助理審核
 */
function doPost(e) {
  try {
    initDatabase();
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var data = requestData.data || {};
    
    // 資安金鑰驗證 (前端資料庫加密核對)
    var clientKey = requestData.authKey || "";
    if (clientKey !== SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "資料庫金鑰驗證失敗，請求已被拒絕"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "login") {
      var username = data.username || "";
      var passwordHash = data.passwordHash || "";
      return handleLoginAuth(ss, username, passwordHash);
    }
    
    if (action === "addProject") {
      // 助理 / 超級使用者 新增專案
      var projSheet = ss.getSheetByName(SHEET_PROJECTS);
      var newRow = [
        data.projectId || ("UDM-" + new Date().getFullYear() + "-" + ("000" + (projSheet.getLastRow())).slice(-3)),
        data.projectName || "",
        data.drawingId || "",
        data.integrationItem || "",
        data.receiptDate || "",
        data.projectEngineer || "",
        data.requiredDate || "",
        data.softwareEngineer || "",
        data.contributionRatio || (data.softwareEngineer ? (data.softwareEngineer + ":100%") : ""),
        data.softwareCompletionDate || "",
        data.hardwareCompletionDate || "",
        data.isSmartBuilding ? "是" : "否",
        data.smartGrade || "無",
        parseInt(data.units, 10) || 0,
        parseFloat(data.quote) || 0,
        data.status || "進行中",
        data.completionRate || "0%",
        parseFloat(data.baseScore) || 0
      ];
      projSheet.appendRow(newRow);
      return returnSuccess({ message: "專案新增成功", projectId: newRow[0] });
    }
    
    if (action === "updateRatios") {
      // 主管 填寫 / 調整多位工程師付出佔比
      var projSheet = ss.getSheetByName(SHEET_PROJECTS);
      var projectId = data.projectId;
      var newRatio = data.contributionRatio;
      
      var rows = projSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == projectId) {
          projSheet.getRange(i + 1, 9).setValue(newRatio); // 第9欄: 主管填寫佔比
          return returnSuccess({ message: "工程師付出佔比更新成功" });
        }
      }
      return returnError("找不到指定案編：" + projectId);
    }

    if (action === "updateSoftwareEngineers") {
      // 主管 / 超級使用者 新增或修改專案軟體工程師
      var projSheet = ss.getSheetByName(SHEET_PROJECTS);
      var projectId = data.projectId;
      var softwareEngineer = data.softwareEngineer;
      var contributionRatio = data.contributionRatio;

      var rows = projSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == projectId) {
          projSheet.getRange(i + 1, 8).setValue(softwareEngineer); // 第8欄: 軟體工程師
          if (contributionRatio) {
            projSheet.getRange(i + 1, 9).setValue(contributionRatio); // 第9欄: 主管填寫佔比
          }
          return returnSuccess({ message: "軟體工程師名單更新成功" });
        }
      }
      return returnError("找不到指定案編：" + projectId);
    }
    
    if (action === "auditUpload") {
      // 助理 審核每月固定上傳資料 (0.2 分)
      var uploadSheet = ss.getSheetByName(SHEET_UPLOADS);
      var yearMonth = data.yearMonth;
      var engineer = data.engineer;
      var auditStatus = data.auditStatus; // "審核通過" 或 "退回"
      var auditor = data.auditor || "助理";
      
      var rows = uploadSheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == yearMonth && rows[i][1] == engineer) {
          uploadSheet.getRange(i + 1, 5).setValue(auditStatus);
          uploadSheet.getRange(i + 1, 6).setValue(Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm"));
          uploadSheet.getRange(i + 1, 7).setValue(auditor);
          uploadSheet.getRange(i + 1, 8).setValue(auditStatus === "審核通過" ? 0.2 : 0);
          found = true;
          break;
        }
      }
      if (!found) {
        uploadSheet.appendRow([
          yearMonth, engineer, "已上傳", Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd"),
          auditStatus, Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm"), auditor,
          (auditStatus === "審核通過" ? 0.2 : 0)
        ]);
      }
      return returnSuccess({ message: "每月上傳審核已完成" });
    }
    
    if (action === "updateCompletion") {
      // 助理 審核專案完成比例及狀態
      var projSheet = ss.getSheetByName(SHEET_PROJECTS);
      var projectId = data.projectId;
      var completionRate = data.completionRate;
      var status = data.status;
      var softwareDate = data.softwareCompletionDate;
      
      var rows = projSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == projectId) {
          if (completionRate !== undefined) projSheet.getRange(i + 1, 17).setValue(completionRate);
          if (status !== undefined) projSheet.getRange(i + 1, 16).setValue(status);
          if (softwareDate !== undefined) projSheet.getRange(i + 1, 10).setValue(softwareDate);
          return returnSuccess({ message: "專案完成進度審核更新成功" });
        }
      }
      return returnError("找不到指定案編：" + projectId);
    }
    
    return returnError("未知的操作：" + action);
  } catch (err) {
    return returnError(err.toString());
  }
/**
 * 處理人員登入驗證 (支援 帳號/Email 或 姓名，動態標題比對與 SHA-256 加密核對)
 */
function handleLoginAuth(ss, username, passwordHash) {
  var userSheet = ss.getSheetByName(SHEET_USERS);
  if (!userSheet) return returnError("找不到人員權限表，請執行 initDatabase");
  var rows = userSheet.getDataRange().getValues();
  if (rows.length <= 1) return returnError("人員權限表尚無任何人員資料");

  var headers = rows[0].map(function(h) { return String(h || "").trim(); });
  var idxUser = headers.indexOf("帳號");
  var idxName = headers.indexOf("姓名");
  var idxRole = headers.indexOf("角色");
  var idxManaged = headers.indexOf("管轄工程師名單");
  var idxPwd = headers.indexOf("密碼");

  // 若欄位名稱不同則進行寬鬆模糊匹配
  if (idxUser === -1) idxUser = 0;
  if (idxName === -1) idxName = 1;
  if (idxRole === -1) idxRole = 2;
  if (idxManaged === -1) idxManaged = 3;
  if (idxPwd === -1) {
    for (var h = 0; h < headers.length; h++) {
      if (/密碼|password|pwd/i.test(headers[h])) {
        idxPwd = h;
        break;
      }
    }
  }
  if (idxPwd === -1) idxPwd = 4; // 預設第 5 欄

  var inputUser = String(username || "").trim().toLowerCase();
  var inputHash = String(passwordHash || "").trim().toLowerCase();

  var foundUserRow = null;

  for (var i = 1; i < rows.length; i++) {
    var rowUser = String(rows[i][idxUser] || "").trim();
    var rowName = String(rows[i][idxName] || "").trim();

    // 支援以「帳號(Email/ID)」或「姓名」進行比對
    if ((rowUser && rowUser.toLowerCase() === inputUser) || 
        (rowName && rowName.toLowerCase() === inputUser)) {
      foundUserRow = rows[i];
      break;
    }
  }

  if (!foundUserRow) {
    return returnError("找不到此帳號或姓名：「" + username + "」，請確認 Google Sheet 人員權限表");
  }

  var rowUser = String(foundUserRow[idxUser] || "").trim();
  var rowName = String(foundUserRow[idxName] || "").trim();
  var rowRole = String(foundUserRow[idxRole] || "").trim();
  var rowManaged = String(foundUserRow[idxManaged] || "").trim();
  var rowPwd = String(foundUserRow[idxPwd] || "").trim();

  // 若試算表此列尚未設定密碼
  if (!rowPwd) {
    return returnError("帳號「" + (rowName || rowUser) + "」於 Google Sheet 尚未填寫密碼，請在試算表「密碼」欄位設定。");
  }

  var rowPwdHash = sha256Hex(rowPwd).toLowerCase();

  // 比對：明文密碼之 SHA256 比對，或試算表內已直接填入 Hash
  if (rowPwdHash === inputHash || rowPwd.toLowerCase() === inputHash) {
    var roleCode = "engineer";
    var avatar = "💻";
    if (rowRole.indexOf("超級") !== -1 || rowRole.toLowerCase().indexOf("admin") !== -1) {
      roleCode = "admin";
      avatar = "👑";
    } else if (rowRole.indexOf("主管") !== -1) {
      roleCode = "manager";
      avatar = "👔";
    } else if (rowRole.indexOf("助理") !== -1) {
      roleCode = "assistant";
      avatar = "📋";
    }

    var managed = [];
    if (rowManaged === "全部" || rowManaged === "*") {
      managed = ["*"];
    } else if (rowManaged && rowManaged !== "無") {
      managed = rowManaged.split(/[,，]/).map(function(s) { return s.trim(); }).filter(Boolean);
    }

    var userObj = {
      id: rowUser,
      username: rowUser,
      name: rowName,
      role: rowRole,
      roleCode: roleCode,
      engineerName: (roleCode === "engineer" ? rowName : (managed[0] || "")),
      managedEngineers: managed,
      avatar: avatar
    };

    return returnSuccess({
      message: "登入成功",
      user: userObj
    });
  } else {
    return returnError("密碼錯誤，請重新輸入");
  }
}

function returnSuccess(data) {
  var res = { status: "success", data: data };
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function returnError(msg) {
  var res = { status: "error", message: msg };
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Taipei", "yyyy-MM-dd");
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

/**
 * 計算字串之標準 SHA-256 雜湊值 (十六進位)
 */
function sha256Hex(str) {
  if (!str) return "";
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    if (h.length === 1) hex += "0";
    hex += h;
  }
  return hex;
}

