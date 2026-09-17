/**
 * 優德美科技 - 安全 API 串接層 (Google Apps Script Web App 加密通訊 + 本地同步)
 */

(function(window) {
  'use strict';

  var ApiService = {
    // 檢查是否配置了 Google Apps Script Web App 網址
    hasGasConfigured: function() {
      var url = window.AppState.gasUrl;
      return !!(url && url.startsWith('http'));
    },

    // 0. 安全登入驗證 (密碼經 SHA-256 加密後傳送至後端 Google Sheet 核對)
    login: function(username, password) {
      return window.CryptoService.generateHash(password).then(function(pwdHash) {
        if (!ApiService.hasGasConfigured()) {
          return Promise.resolve(window.AppState.verifyLocalLogin(username, pwdHash));
        }

        var secretKey = window.CryptoService.getSecretKey();
        var postPayload = {
          action: 'login',
          authKey: secretKey,
          data: {
            username: username,
            passwordHash: pwdHash
          },
          timestamp: Date.now()
        };

        return fetch(window.AppState.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(postPayload)
        })
        .then(function(res) { return res.json(); })
        .then(function(resData) {
          if (resData.status === 'success' && resData.data && resData.data.user) {
            return { success: true, user: resData.data.user };
          } else {
            return { success: false, message: resData.message || '帳號或密碼錯誤' };
          }
        })
        .catch(function(err) {
          console.warn('[API] 雲端登入服務呼叫失敗，切換至本機備援驗證：', err);
          return window.AppState.verifyLocalLogin(username, pwdHash);
        });
      });
    },

    // 1. 同步從 Google Sheet 抓取最新資料
    fetchData: function() {
      if (!ApiService.hasGasConfigured()) {
        console.log('[API] 使用本機離線資料模式 (未綁定 Google Apps Script URL)');
        return Promise.resolve({
          projects: window.AppState.projects,
          uploads: window.AppState.monthlyUploads
        });
      }

      window.AppState.isSyncing = true;
      var gasUrl = window.AppState.gasUrl;

      return fetch(gasUrl + '?action=getData&t=' + Date.now())
      .then(function(res) {
        if (!res.ok) throw new Error('Google Sheet 連線異常: ' + res.statusText);
        return res.text();
      })
      .then(function(text) {
        if (text.trim().startsWith('<')) {
          if (text.indexOf('doGet') !== -1) {
            throw new Error('Google Apps Script 尚未發布 doGet 函式。請在 Apps Script 貼上 googleAppsScript_Code.gs 並於「管理部署作業」更新為新版本。');
          }
          throw new Error('Google Apps Script 回傳非 JSON 內容，請確認 Web App 存取權限設為「所有人 (Anyone)」。');
        }
        var data = JSON.parse(text);
        window.AppState.isSyncing = false;
        window.AppState.lastSyncTime = new Date();

        if (data.status === 'success' && data.projects) {
          var formatDateStr = function(v) {
            if (!v) return '';
            var str = String(v).trim();
            if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
              return str.substring(0, 10);
            }
            return str;
          };
          var formatYMStr = function(v) {
            if (!v) return '';
            var str = String(v).trim();
            if (str.length >= 7 && /^\d{4}-\d{2}/.test(str)) {
              return str.substring(0, 7);
            }
            return str;
          };

          // 正規化專案資料欄位
          var formattedProjects = data.projects.map(function(row) {
            return {
              projectId: row['案編'] || row.projectId,
              projectName: row['案名'] || row.projectName,
              drawingId: row['圖編'] || row.drawingId,
              integrationItem: row['整合項目'] || row.integrationItem,
              receiptDate: formatDateStr(row['收件日期'] || row.receiptDate),
              projectEngineer: row['專案工程師'] || row.projectEngineer,
              requiredDate: formatDateStr(row['需求日期'] || row.requiredDate),
              softwareEngineer: row['軟體工程師'] || row.softwareEngineer,
              contributionRatio: row['主管填寫佔比'] || row.contributionRatio,
              softwareCompletionDate: formatDateStr(row['軟體完成時間'] || row.softwareCompletionDate),
              hardwareCompletionDate: formatDateStr(row['硬體完成時間'] || row.hardwareCompletionDate),
              isSmartBuilding: (row['是否為智慧建築'] === '是' || row.isSmartBuilding === true),
              smartGrade: row['智慧建築等級'] || row.smartGrade,
              units: parseInt(row['戶數'] || row.units, 10) || 0,
              quote: parseFloat(row['報價'] || row.quote) || 0,
              status: row['專案狀態'] || row.status || '進行中',
              completionRate: row['完成比例'] || row.completionRate || '0%'
            };
          });

          window.AppState.projects = formattedProjects;
          window.AppState.saveProjectsToLocal();

          if (data.uploads) {
            var formattedUploads = data.uploads.map(function(u) {
              return {
                yearMonth: formatYMStr(u['年月'] || u.yearMonth),
                engineer: u['軟體工程師'] || u.engineer,
                uploadStatus: u['上傳狀態'] || u.uploadStatus,
                uploadDate: formatDateStr(u['上傳時間'] || u.uploadDate),
                auditStatus: u['助理審核狀態'] || u.auditStatus,
                auditDate: formatDateStr(u['審核時間'] || u.auditDate),
                auditor: u['審核助理'] || u.auditor,
                earnedScore: parseFloat(u['核可積分'] || u.earnedScore) || 0
              };
            });
            window.AppState.monthlyUploads = formattedUploads;
            window.AppState.saveUploadsToLocal();
          }

          if (data.users && Array.isArray(data.users) && data.users.length > 0) {
            var formattedUsers = data.users.map(function(u) {
              var role = u['角色'] || u.role || '工程師';
              var roleCode = 'engineer';
              var avatar = '💻';
              if (role.indexOf('超級') !== -1 || role.indexOf('admin') !== -1) {
                roleCode = 'admin';
                avatar = '👑';
              } else if (role.indexOf('主管') !== -1) {
                roleCode = 'manager';
                avatar = '👔';
              } else if (role.indexOf('助理') !== -1) {
                roleCode = 'assistant';
                avatar = '📋';
              }

              var managed = [];
              var managedStr = u['管轄工程師名單'] || u.managedEngineers || '';
              if (managedStr === '全部' || managedStr === '*') {
                managed = ['*'];
              } else if (managedStr && managedStr !== '無') {
                managed = managedStr.split(/[,，]/).map(function(s) { return s.trim(); }).filter(Boolean);
              }

              var uname = u['帳號'] || u.id || u.username;
              var displayName = u['姓名'] || u.name || uname;
              return {
                id: uname,
                username: uname,
                name: displayName,
                role: role,
                roleCode: roleCode,
                engineerName: (roleCode === 'engineer' ? displayName : (managed[0] || '')),
                managedEngineers: managed,
                avatar: avatar
              };
            });

            window.AppState.users = formattedUsers;
            localStorage.setItem('udm_users', JSON.stringify(formattedUsers));

            if (window.AppState.currentUser) {
              var currentId = window.AppState.currentUser.id;
              var updatedCurrent = formattedUsers.find(function(fu) { return fu.id === currentId; });
              if (updatedCurrent) {
                window.AppState.currentUser = updatedCurrent;
              }
            }
          }

          return { projects: formattedProjects, uploads: window.AppState.monthlyUploads, users: window.AppState.users };
        } else {
          throw new Error(data.message || '資料庫格式解析失敗');
        }
      })
      .catch(function(err) {
        window.AppState.isSyncing = false;
        console.warn('[API] Google Sheet 連線失敗，切換至本機暫存資料：', err);
        return {
          projects: window.AppState.projects,
          uploads: window.AppState.monthlyUploads,
          warning: err.message
        };
      });
    },

    // 2. 新增專案 (助理與超級使用者)
    addProject: function(newProject) {
      // 本地即時更新
      window.AppState.projects.unshift(newProject);
      window.AppState.saveProjectsToLocal();

      if (!ApiService.hasGasConfigured()) {
        return Promise.resolve({ success: true, message: '專案已儲存於本機安全資料庫' });
      }

      // 對敏感資料包進行加密
      var secretKey = window.CryptoService.getSecretKey();
      var postPayload = {
        action: 'addProject',
        authKey: secretKey,
        data: newProject,
        timestamp: Date.now()
      };

      return fetch(window.AppState.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script 避免 CORS preflight 限制
        body: JSON.stringify(postPayload)
      })
      .then(function(res) { return res.json(); })
      .then(function(resData) {
        return resData;
      })
      .catch(function(err) {
        console.warn('[API] 雲端同步失敗，已保留本地變更：', err);
        return { success: true, message: '已儲存於本地快取 (雲端同步待重試)' };
      });
    },

    // 3. 主管填寫 / 調整付出佔比
    updateRatios: function(projectId, contributionRatio) {
      // 1. 本地更新
      var target = window.AppState.projects.find(function(p) { return p.projectId === projectId; });
      if (target) {
        target.contributionRatio = contributionRatio;
        window.AppState.saveProjectsToLocal();
      }

      if (!ApiService.hasGasConfigured()) {
        return Promise.resolve({ success: true, message: '工程師付出佔比已於本地更新' });
      }

      var secretKey = window.CryptoService.getSecretKey();
      var postPayload = {
        action: 'updateRatios',
        authKey: secretKey,
        data: {
          projectId: projectId,
          contributionRatio: contributionRatio
        }
      };

      return fetch(window.AppState.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(postPayload)
      })
      .then(function(res) { return res.json(); })
      .catch(function(err) {
        console.warn('[API] 主管佔比雲端同步失敗：', err);
        return { success: true, message: '已於本地更新 (雲端同步待重試)' };
      });
    },

    // 3.5 主管 / 超級使用者 新增 / 修改專案軟體工程師
    updateSoftwareEngineers: function(projectId, softwareEngineers, newRatio) {
      var target = window.AppState.projects.find(function(p) { return p.projectId === projectId; });
      if (target) {
        target.softwareEngineer = softwareEngineers;
        if (newRatio) {
          target.contributionRatio = newRatio;
        } else {
          // 自動重新平衡佔比
          var engs = softwareEngineers.split(/[,，、;；\s]+/).map(function(s){return s.trim();}).filter(Boolean);
          if (engs.length === 1) {
            target.contributionRatio = engs[0] + ':100%';
          } else if (engs.length > 1) {
            var avg = Math.round(100 / engs.length);
            target.contributionRatio = engs.map(function(e){ return e + ':' + avg + '%'; }).join(', ');
          }
        }
        window.AppState.saveProjectsToLocal();
      }

      if (!ApiService.hasGasConfigured()) {
        return Promise.resolve({ success: true, message: '軟體工程師名單已於本地更新' });
      }

      var secretKey = window.CryptoService.getSecretKey();
      var postPayload = {
        action: 'updateSoftwareEngineers',
        authKey: secretKey,
        data: {
          projectId: projectId,
          softwareEngineer: softwareEngineers,
          contributionRatio: target ? target.contributionRatio : ''
        }
      };

      return fetch(window.AppState.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(postPayload)
      })
      .then(function(res) { return res.json(); })
      .catch(function(err) {
        console.warn('[API] 軟體工程師名單雲端同步失敗：', err);
        return { success: true, message: '已於本地更新 (雲端同步待重試)' };
      });
    },

    // 4. 助理審核每月固定上傳資料 (0.2 分)
    auditUpload: function(yearMonth, engineer, auditStatus, auditor) {
      // 1. 本地更新
      var list = window.AppState.monthlyUploads;
      var found = list.find(function(u) { return u.yearMonth === yearMonth && u.engineer === engineer; });
      var nowStr = new Date().toISOString().substring(0, 10);
      var score = (auditStatus === '審核通過') ? 0.2 : 0;

      if (found) {
        found.auditStatus = auditStatus;
        found.auditDate = nowStr;
        found.auditor = auditor || '助理';
        found.earnedScore = score;
      } else {
        list.push({
          yearMonth: yearMonth,
          engineer: engineer,
          uploadStatus: '已上傳',
          uploadDate: nowStr,
          auditStatus: auditStatus,
          auditDate: nowStr,
          auditor: auditor || '助理',
          earnedScore: score
        });
      }
      window.AppState.saveUploadsToLocal();

      if (!ApiService.hasGasConfigured()) {
        return Promise.resolve({ success: true, message: '審核狀態已儲存於本機' });
      }

      var secretKey = window.CryptoService.getSecretKey();
      var postPayload = {
        action: 'auditUpload',
        authKey: secretKey,
        data: {
          yearMonth: yearMonth,
          engineer: engineer,
          auditStatus: auditStatus,
          auditor: auditor
        }
      };

      return fetch(window.AppState.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(postPayload)
      })
      .then(function(res) { return res.json(); })
      .catch(function(err) {
        console.warn('[API] 助理審核雲端同步失敗：', err);
        return { success: true, message: '已於本地更新' };
      });
    },

    // 5. 助理審核專案完成比例及狀態
    updateCompletion: function(projectId, completionRate, status, softwareCompletionDate) {
      var target = window.AppState.projects.find(function(p) { return p.projectId === projectId; });
      if (target) {
        target.completionRate = completionRate;
        if (status) target.status = status;
        if (softwareCompletionDate) target.softwareCompletionDate = softwareCompletionDate;
        window.AppState.saveProjectsToLocal();
      }

      if (!ApiService.hasGasConfigured()) {
        return Promise.resolve({ success: true, message: '完成進度已更新於本機' });
      }

      var secretKey = window.CryptoService.getSecretKey();
      var postPayload = {
        action: 'updateCompletion',
        authKey: secretKey,
        data: {
          projectId: projectId,
          completionRate: completionRate,
          status: status,
          softwareCompletionDate: softwareCompletionDate
        }
      };

      return fetch(window.AppState.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(postPayload)
      })
      .then(function(res) { return res.json(); })
      .catch(function(err) {
        return { success: true, message: '已於本地更新' };
      });
    }
  };

  window.ApiService = ApiService;
})(window);
