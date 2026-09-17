/**
 * 優德美科技 - 主介面邏輯控制器 (App Controller)
 * 整合：RBAC 權限切換、篩選器、動態試算、主管佔比填寫、助理審查、雲端同步
 */

(function(window) {
  'use strict';

  var App = {
    init: function() {
      window.AppState.init();
      App.setupEventListeners();
      App.setupTheme();

      // 檢查是否已登入
      if (!window.AppState.isLoggedIn()) {
        App.renderUserRoleUI();
        App.openLoginModal();
      } else {
        App.renderUserRoleUI();
        App.populateFilterDropdowns();
        App.refreshView();

        // 僅在登入後同步試算表資料
        if (window.ApiService.hasGasConfigured()) {
          App.handleSyncData();
        }
      }
    },

    // 設定主題 (深色/淺色)
    setupTheme: function() {
      var savedTheme = localStorage.getItem('udm_theme') || 'dark';
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
      var themeToggle = document.getElementById('btn-toggle-theme');
      if (themeToggle) {
        themeToggle.innerHTML = document.body.classList.contains('light-theme') ? '🌙' : '☀️';
      }
    },

    toggleTheme: function() {
      document.body.classList.toggle('light-theme');
      var isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('udm_theme', isLight ? 'light' : 'dark');
      var themeToggle = document.getElementById('btn-toggle-theme');
      if (themeToggle) {
        themeToggle.innerHTML = isLight ? '🌙' : '☀️';
      }
      App.refreshView();
    },

    // 繫結主要事件
    setupEventListeners: function() {
      // 主題切換
      var themeBtn = document.getElementById('btn-toggle-theme');
      if (themeBtn) themeBtn.addEventListener('click', App.toggleTheme);

      // 登入表單提交
      var loginForm = document.getElementById('form-login');
      if (loginForm) loginForm.addEventListener('submit', App.handleLogin);

      // 登出按鈕
      var btnLogout = document.getElementById('btn-logout');
      if (btnLogout) btnLogout.addEventListener('click', App.handleLogout);

      // 登入開啟按鈕
      var btnLoginOpen = document.getElementById('btn-login-open');
      if (btnLoginOpen) btnLoginOpen.addEventListener('click', App.openLoginModal);

      // 超級管理員模擬切換視角
      var impersonateSelect = document.getElementById('select-impersonate-role');
      if (impersonateSelect) {
        impersonateSelect.addEventListener('change', function(e) {
          window.AppState.setCurrentUser(e.target.value);
          App.renderUserRoleUI();
          App.populateFilterDropdowns();
          App.refreshView();
          App.showToast('已切換視角為：' + window.AppState.currentUser.name + ' (' + window.AppState.currentUser.role + ')');
        });
      }

      // 篩選區段變更 (年、月、工程師、搜尋)
      var filterYear = document.getElementById('filter-year');
      var filterMonth = document.getElementById('filter-month');
      var filterEng = document.getElementById('filter-engineer');
      var searchInput = document.getElementById('search-keyword');

      function updateFilters() {
        var y = filterYear.value;
        var m = filterMonth.value;
        if (y === 'ALL') {
          window.AppState.filterPeriod = 'ALL';
        } else if (m === 'ALL') {
          window.AppState.filterPeriod = y;
        } else {
          window.AppState.filterPeriod = y + '-' + m;
        }
        window.AppState.filterYear = y;
        window.AppState.filterMonth = m;
        window.AppState.filterEngineer = filterEng.value;
        window.AppState.searchKeyword = searchInput.value;
        App.refreshView();
      }

      if (filterYear) filterYear.addEventListener('change', updateFilters);
      if (filterMonth) filterMonth.addEventListener('change', updateFilters);
      if (filterEng) filterEng.addEventListener('change', updateFilters);
      if (searchInput) searchInput.addEventListener('input', updateFilters);

      // 導覽分頁切換
      var navTabs = document.querySelectorAll('.nav-tab');
      navTabs.forEach(function(tab) {
        tab.addEventListener('click', function(e) {
          var targetTab = e.currentTarget.getAttribute('data-tab');
          App.switchTab(targetTab);
        });
      });

      // 專案考核明細表狀態快速切換 (全部 / 進行中 / 已結案)
      var statusTabs = document.querySelectorAll('.btn-status-tab');
      statusTabs.forEach(function(tab) {
        tab.addEventListener('click', function(e) {
          var targetStatus = e.currentTarget.getAttribute('data-status');
          window.AppState.filterProjectStatus = targetStatus;
          statusTabs.forEach(function(t) {
            t.classList.toggle('active', t.getAttribute('data-status') === targetStatus);
          });
          App.refreshView();
        });
      });

      // 同步按鈕
      var btnSync = document.getElementById('btn-sync-data');
      if (btnSync) {
        btnSync.addEventListener('click', App.handleSyncData);
      }

      // 新增專案按鈕與 Modal
      var btnOpenAdd = document.getElementById('btn-open-add-project');
      if (btnOpenAdd) {
        btnOpenAdd.addEventListener('click', function() {
          App.openAddProjectModal();
        });
      }

      // 新增專案表單即時算分監聽
      var addForm = document.getElementById('form-add-project');
      if (addForm) {
        addForm.addEventListener('input', App.updateAddProjectLivePreview);
        addForm.addEventListener('change', App.updateAddProjectLivePreview);
        addForm.addEventListener('submit', App.handleCreateProject);
      }

      // 主管佔比表單提交
      var ratioForm = document.getElementById('form-ratio-editor');
      if (ratioForm) {
        ratioForm.addEventListener('submit', App.handleSaveRatios);
      }

      // 主管/超級使用者修改軟體工程師表單提交
      var editEngForm = document.getElementById('form-edit-engineers');
      if (editEngForm) {
        editEngForm.addEventListener('submit', App.handleSaveEngineers);
      }

      // 快速下拉選擇工程師 (主管指派工程師 Modal)
      var selectCompanyEng = document.getElementById('select-company-engineer');
      var btnAddCompanyEng = document.getElementById('btn-add-selected-engineer');
      var editEngInput = document.getElementById('edit-eng-input');

      if (selectCompanyEng) {
        selectCompanyEng.addEventListener('change', function(e) {
          var val = e.target.value;
          if (val) {
            App.addEngineerToInput('edit-eng-input', 'selected-engineers-tags', val);
            e.target.value = '';
          }
        });
      }
      if (btnAddCompanyEng) {
        btnAddCompanyEng.addEventListener('click', function() {
          if (!selectCompanyEng) return;
          var val = selectCompanyEng.value;
          if (val) {
            App.addEngineerToInput('edit-eng-input', 'selected-engineers-tags', val);
            selectCompanyEng.value = '';
          } else {
            alert('請先從下拉選單選擇一位工程師！');
          }
        });
      }
      if (editEngInput) {
        editEngInput.addEventListener('input', function() {
          App.renderEngineerTags('edit-eng-input', 'selected-engineers-tags');
        });
      }

      // 快速下拉選擇工程師 (新增專案 Modal)
      var selectAddProjEng = document.getElementById('select-add-project-engineer');
      var btnAddProjEng = document.getElementById('btn-add-project-selected-engineer');
      var addProjEngInput = document.getElementById('add-software-engineer');

      if (selectAddProjEng) {
        selectAddProjEng.addEventListener('change', function(e) {
          var val = e.target.value;
          if (val) {
            App.addEngineerToInput('add-software-engineer', 'add-project-engineers-tags', val);
            e.target.value = '';
          }
        });
      }
      if (btnAddProjEng) {
        btnAddProjEng.addEventListener('click', function() {
          if (!selectAddProjEng) return;
          var val = selectAddProjEng.value;
          if (val) {
            App.addEngineerToInput('add-software-engineer', 'add-project-engineers-tags', val);
            selectAddProjEng.value = '';
          } else {
            alert('請先從下拉選單選擇一位工程師！');
          }
        });
      }
      if (addProjEngInput) {
        addProjEngInput.addEventListener('input', function() {
          App.renderEngineerTags('add-software-engineer', 'add-project-engineers-tags');
        });
      }

      // 助理完成度表單提交
      var completionForm = document.getElementById('form-completion-editor');
      if (completionForm) {
        completionForm.addEventListener('submit', App.handleSaveCompletion);
      }

      // 登記每月上傳按鈕與表單
      var btnOpenAddUpload = document.getElementById('btn-open-add-upload');
      if (btnOpenAddUpload) {
        btnOpenAddUpload.addEventListener('click', App.openAddUploadModal);
      }

      var formAddUpload = document.getElementById('form-add-upload');
      if (formAddUpload) {
        formAddUpload.addEventListener('submit', App.handleSubmitAddUpload);
      }

      // 設定 Modal 相關
      var btnSettings = document.getElementById('btn-open-settings');
      if (btnSettings) {
        btnSettings.addEventListener('click', App.openSettingsModal);
      }
      var formSettings = document.getElementById('form-settings');
      if (formSettings) {
        formSettings.addEventListener('submit', App.handleSaveSettings);
      }
    },

    // 切換分頁
    switchTab: function(tabName) {
      window.AppState.activeTab = tabName;
      document.querySelectorAll('.nav-tab').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
      });
      document.querySelectorAll('.tab-pane').forEach(function(p) {
        p.classList.toggle('active', p.id === 'pane-' + tabName);
      });
      App.refreshView();
    },

    // 渲染使用者身份狀態指示器
    renderUserRoleUI: function() {
      var user = window.AppState.currentUser;
      var roleBadge = document.getElementById('current-role-badge');
      var userAvatar = document.getElementById('current-user-avatar');
      var userName = document.getElementById('current-user-name');
      var btnLogout = document.getElementById('btn-logout');
      var btnLoginOpen = document.getElementById('btn-login-open');
      var adminSwitch = document.getElementById('admin-switch-wrapper');
      var btnAdd = document.getElementById('btn-open-add-project');

      if (!user) {
        if (roleBadge) {
          roleBadge.textContent = '訪客';
          roleBadge.className = 'badge badge-role';
        }
        if (userAvatar) userAvatar.textContent = '👤';
        if (userName) userName.textContent = '未登入';
        if (btnLogout) btnLogout.style.display = 'none';
        if (btnLoginOpen) btnLoginOpen.style.display = 'inline-block';
        if (adminSwitch) adminSwitch.style.display = 'none';
        if (btnAdd) btnAdd.style.display = 'none';
        return;
      }

      if (btnLogout) btnLogout.style.display = 'inline-block';
      if (btnLoginOpen) btnLoginOpen.style.display = 'none';

      if (roleBadge) {
        roleBadge.textContent = user.role;
        roleBadge.className = 'badge badge-role badge-' + user.roleCode;
      }
      if (userAvatar) userAvatar.textContent = user.avatar || '👤';
      if (userName) userName.textContent = user.name;

      // 若為管理員帳號，開放模擬切換視角功能
      if (adminSwitch) {
        var isAdmin = (user.roleCode === 'admin' || user.id === 'admin');
        adminSwitch.style.display = isAdmin ? 'inline-block' : 'none';
        var impSelect = document.getElementById('select-impersonate-role');
        if (impSelect) impSelect.value = user.id;
      }

      // 根據 RBAC 權限控制元件可見性
      if (btnAdd) {
        // 主管、助理與超級使用者皆可新增專案；工程師身分隱藏
        var canAdd = (user.roleCode === 'assistant' || user.roleCode === 'admin' || user.roleCode === 'manager');
        btnAdd.style.display = canAdd ? 'inline-flex' : 'none';
      }

      var assistantTab = document.getElementById('tab-assistant-audit');
      if (assistantTab) {
        if (user.roleCode === 'assistant') {
          assistantTab.classList.add('highlight-tab');
        } else {
          assistantTab.classList.remove('highlight-tab');
        }
      }
    },

    // 填充下拉式選單選項
    populateFilterDropdowns: function() {
      var filterEng = document.getElementById('filter-engineer');
      if (!filterEng) return;

      var user = window.AppState.currentUser;
      if (!user) {
        filterEng.innerHTML = '<option value="ALL">請先登入系統</option>';
        filterEng.disabled = true;
        return;
      }

      var visibleEngs = window.AppState.getVisibleEngineers();
      var currentVal = window.AppState.filterEngineer;

      var html = '<option value="ALL">全部軟體工程師</option>';
      visibleEngs.forEach(function(eng) {
        html += '<option value="' + eng + '" ' + (currentVal === eng ? 'selected' : '') + '>' + eng + '</option>';
      });
      filterEng.innerHTML = html;

      // 若為工程師身分，鎖定只能選自己
      if (user.roleCode === 'engineer') {
        filterEng.value = user.engineerName;
        filterEng.disabled = true;
      } else {
        filterEng.disabled = false;
      }
    },

    // 核心資料更新與畫面重繪
    refreshView: function() {
      var user = window.AppState.currentUser;
      if (!user) {
        var tableBody = document.getElementById('projects-table-body');
        if (tableBody) {
          tableBody.innerHTML = '<tr><td colspan="12" class="text-center py-5 text-muted">🔒 請先登入系統以檢視績效考核與專案資料</td></tr>';
        }
        return;
      }

      var projects = window.AppState.projects;
      var uploads = window.AppState.monthlyUploads;
      var period = window.AppState.filterPeriod;
      var targetEng = (window.AppState.filterEngineer === 'ALL') ? null : window.AppState.filterEngineer;

      // 1. 計算績效總合
      var perfResult = window.Calculator.aggregatePerformance(projects, uploads, {
        period: period,
        engineer: targetEng
      });

      // 2. 渲染頂部 KPI 統計卡片
      App.renderKpiCards(perfResult);

      // 3. 渲染主要專案列表
      App.renderProjectsTable();

      // 4. 渲染圖表與去年同期比較
      window.ChartsModule.renderCharts(perfResult);

      // 5. 渲染助理專屬審查面板 (若正在該分頁)
      App.renderAssistantAuditPanel();

      // 6. 更新安全與連線狀態顯示
      App.updateSecurityStatusBadge();
    },

    // 渲染 KPI 指標卡片
    renderKpiCards: function(perfResult) {
      var totalScore = 0, smartScore = 0, nonSmartScore = 0, maintScore = 0, uploadScore = 0;
      var totalProjects = 0;

      perfResult.engineers.forEach(function(e) {
        totalScore += e.totalScore;
        smartScore += e.smartScore;
        nonSmartScore += e.nonSmartScore;
        maintScore += e.maintenanceScore;
        uploadScore += e.uploadScore;
        totalProjects += e.totalProjects;
      });

      var elTotal = document.getElementById('stat-total-score');
      var elSmart = document.getElementById('stat-smart-score');
      var elNonSmart = document.getElementById('stat-nonsmart-score');
      var elMaint = document.getElementById('stat-maint-score');
      var elUpload = document.getElementById('stat-upload-score');
      var elCount = document.getElementById('stat-project-count');

      if (elTotal) elTotal.textContent = totalScore.toFixed(1);
      if (elSmart) elSmart.textContent = smartScore.toFixed(1);
      if (elNonSmart) elNonSmart.textContent = nonSmartScore.toFixed(1);
      if (elMaint) elMaint.textContent = maintScore.toFixed(1);
      if (elUpload) elUpload.textContent = uploadScore.toFixed(1);
      if (elCount) elCount.textContent = totalProjects + ' 案';

      // 顯示當前選取的期間標籤
      var periodLabel = document.getElementById('current-period-display');
      if (periodLabel) {
        var p = window.AppState.filterPeriod;
        periodLabel.textContent = (p === 'ALL') ? '歷史全部' : (p.length === 7 ? p + ' 月份' : p + ' 年度');
      }
    },

    // 渲染專案列表表格 (7 大複合維度欄位，極致易讀性與考核焦點)
    renderProjectsTable: function() {
      var container = document.getElementById('projects-table-body');
      if (!container) return;

      var currentUser = window.AppState.currentUser;
      var role = currentUser.roleCode;

      // 先取得符合當前時間/人員/關鍵字的角色可見專案清單 (忽視狀態) 用於狀態計數
      var savedStatus = window.AppState.filterProjectStatus;
      window.AppState.filterProjectStatus = 'ALL';
      var allBaseProjects = window.AppState.getVisibleProjects();
      window.AppState.filterProjectStatus = savedStatus;

      var countAll = allBaseProjects.length;
      var countActive = 0;
      var countClosed = 0;

      allBaseProjects.forEach(function(p) {
        var st = p.status || '進行中';
        if (st === '已結案') {
          countClosed++;
        } else {
          countActive++;
        }
      });

      // 更新狀態標籤計數
      var elCountAll = document.getElementById('count-all-projects');
      var elCountActive = document.getElementById('count-active-projects');
      var elCountClosed = document.getElementById('count-closed-projects');
      if (elCountAll) elCountAll.textContent = countAll;
      if (elCountActive) elCountActive.textContent = countActive;
      if (elCountClosed) elCountClosed.textContent = countClosed;

      // 依當前狀態標籤過濾後之顯示專案清單
      var visibleProjects = window.AppState.getVisibleProjects();

      if (visibleProjects.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">' +
          '<div style="font-size: 2.2rem; margin-bottom: 8px;">📂</div>' +
          '<strong style="font-size: 1rem;">無符合條件之專案資料</strong>' +
          '<div class="text-xs text-muted mt-1">請嘗試切換上方考核年度、月份、工程師或狀態標籤</div>' +
          '</td></tr>';
        return;
      }

      var html = '';
      visibleProjects.forEach(function(proj) {
        var baseScore = window.Calculator.calculateProjectBaseScore(proj);
        var shares = window.Calculator.calculateEngineerProjectShares(proj);

        // 格式化各工程師實得積分與主管佔比 (卡片式 Pill)
        var shareBadges = shares.length > 0
          ? shares.map(function(s) {
              return '<div class="share-pill-card">' +
                '<span class="share-pill-name">👨‍💻 ' + s.engineer + '</span>' +
                '<div>' +
                  '<span class="share-pill-score font-bold">' + s.earnedScore + ' 分</span> ' +
                  '<span class="share-pill-ratio text-xs">(' + s.ratioPercent + '%)</span>' +
                '</div>' +
              '</div>';
            }).join('')
          : '<span class="text-muted text-xs">尚未指派軟體工程師</span>';

        // 建築規格與等級標籤
        var isSmart = (proj.isSmartBuilding === true || proj.isSmartBuilding === '是');
        var smartTag = isSmart
          ? '<span class="badge badge-smart">🏙️ 智慧建築 · ' + (proj.smartGrade || '合格') + '</span>'
          : '<span class="badge badge-nonsmart">🏢 一般建築 · ' + (proj.units || 0) + '戶</span>';

        if (proj.projectType === '維護專案' || (proj.integrationItem && proj.integrationItem.indexOf('維護') !== -1)) {
          smartTag = '<span class="badge badge-maint">🛠️ 維護專案 (固定1分)</span>';
        }

        // 狀態標籤
        var statusBadgeClass = 'badge-progress';
        if (proj.status === '已結案') statusBadgeClass = 'badge-done';
        else if (proj.status === '軟體完成') statusBadgeClass = 'badge-soft-done';

        // 權限操作按鈕
        var actionBtns = '';
        
        // 主管與超級使用者：可「指派/修改軟體工程師」與「調整付出佔比」
        if (role === 'manager' || role === 'admin') {
          actionBtns += '<button type="button" class="btn btn-xs btn-primary btn-edit-engineers" data-id="' + proj.projectId + '" title="主管指派或修改軟體工程師">👥 指派工程師</button>';
          actionBtns += '<button type="button" class="btn btn-xs btn-outline-primary btn-edit-ratio" data-id="' + proj.projectId + '" title="主管填寫多位工程師付出佔比">✏️ 調整佔比</button>';
        }

        // 助理與超級使用者：審核專案完成比例與結案狀態
        if (role === 'assistant' || role === 'admin') {
          actionBtns += '<button type="button" class="btn btn-xs btn-outline-secondary btn-edit-completion" data-id="' + proj.projectId + '" title="審核完成比例與結案時間">📋 審核進度</button>';
        }

        // 報價顯示保護 (助理若受限制可顯示保護)
        var quoteDisplay = '$' + Number(proj.quote || 0).toLocaleString();
        if (role === 'assistant') {
          quoteDisplay = '<span class="text-muted">受保護</span>';
        }

        html += '<tr>' +
          // 欄位 1: 專案識別與項目
          '<td>' +
            '<div class="d-flex align-items-center gap-2 mb-1">' +
              '<span class="badge-proj-id">' + proj.projectId + '</span>' +
              '<span class="text-xs text-muted font-mono">圖編: ' + (proj.drawingId || '-') + '</span>' +
            '</div>' +
            '<div class="proj-title-main text-main mb-1">' + proj.projectName + '</div>' +
            '<div class="text-xs text-muted proj-integration-text">' +
              '📦 ' + (proj.integrationItem || '無細項說明') +
            '</div>' +
          '</td>' +

          // 欄位 2: 建築規格與報價
          '<td>' +
            '<div class="mb-1">' + smartTag + '</div>' +
            '<div class="proj-quote-badge font-mono text-xs">' +
              '<span class="text-muted">報價:</span> <strong>' + quoteDisplay + '</strong>' +
            '</div>' +
          '</td>' +

          // 欄位 3: 負責人員 (軟 / 硬體)
          '<td>' +
            '<div class="mb-1">' +
              '<span class="staff-role-label">💻 軟體:</span>' +
              '<span class="font-semibold text-main">' + (proj.softwareEngineer || '<span class="text-muted">未指派</span>') + '</span>' +
            '</div>' +
            '<div class="text-xs text-muted">' +
              '<span class="staff-role-label">🔌 硬體:</span>' +
              '<span>' + (proj.projectEngineer || '-') + '</span>' +
            '</div>' +
          '</td>' +

          // 欄位 4: 🎯 專案基準分與實得分分配 (主管佔比)
          '<td>' +
            '<div class="d-flex align-items-baseline gap-2 mb-2">' +
              '<span class="text-xs text-muted">專案基準底分:</span>' +
              '<span class="font-mono font-bold score-base-display">' + baseScore.toFixed(1) + ' <small class="text-xs">分</small></span>' +
            '</div>' +
            '<div class="engineer-shares-pills">' +
              shareBadges +
            '</div>' +
          '</td>' +

          // 欄位 5: 重要時程節點 (垂直收納，清晰對比)
          '<td class="text-xs font-mono">' +
            '<div class="schedule-row mb-1">' +
              '<span class="schedule-dot dot-receipt"></span>' +
              '<span class="text-muted">收件:</span> ' +
              '<span>' + (proj.receiptDate || '-') + '</span>' +
            '</div>' +
            '<div class="schedule-row mb-1">' +
              '<span class="schedule-dot dot-soft"></span>' +
              '<span class="text-muted">軟體:</span> ' +
              '<span class="' + (proj.softwareCompletionDate ? 'text-success font-semibold' : 'text-muted') + '">' +
                (proj.softwareCompletionDate || '進行中') +
              '</span>' +
            '</div>' +
            '<div class="schedule-row">' +
              '<span class="schedule-dot dot-hard"></span>' +
              '<span class="text-muted">硬體:</span> ' +
              '<span>' + (proj.hardwareCompletionDate || '-') + '</span>' +
            '</div>' +
          '</td>' +

          // 欄位 6: 進度 & 狀態
          '<td>' +
            '<div class="mb-1">' +
              '<span class="badge ' + statusBadgeClass + '">' + (proj.status || '進行中') + '</span>' +
            '</div>' +
            '<div class="completion-bar-wrap">' +
              '<div class="progress-bar"><div class="progress-fill" style="width: ' + (proj.completionRate || '0%') + '"></div></div>' +
              '<span class="text-xs font-mono font-semibold">' + (proj.completionRate || '0%') + '</span>' +
            '</div>' +
          '</td>' +

          // 欄位 7: 操作
          '<td style="text-align: center;">' +
            '<div class="action-btn-group-vertical">' +
              (actionBtns || '<span class="text-muted text-xs">唯讀檢視</span>') +
            '</div>' +
          '</td>' +
        '</tr>';
      });

      container.innerHTML = html;

      // 綁定動態生成的按鈕事件
      container.querySelectorAll('.btn-edit-engineers').forEach(function(b) {
        b.addEventListener('click', function(e) {
          var id = e.currentTarget.getAttribute('data-id');
          App.openEditEngineersModal(id);
        });
      });

      container.querySelectorAll('.btn-edit-ratio').forEach(function(b) {
        b.addEventListener('click', function(e) {
          var id = e.currentTarget.getAttribute('data-id');
          App.openRatioEditorModal(id);
        });
      });

      container.querySelectorAll('.btn-edit-completion').forEach(function(b) {
        b.addEventListener('click', function(e) {
          var id = e.currentTarget.getAttribute('data-id');
          App.openCompletionEditorModal(id);
        });
      });
    },

    // 渲染助理審查面板
    renderAssistantAuditPanel: function() {
      var container = document.getElementById('assistant-upload-list');
      if (!container) return;

      var uploads = window.AppState.monthlyUploads;
      var currentUser = window.AppState.currentUser;
      var isAssistantOrAdmin = (currentUser.roleCode === 'assistant' || currentUser.roleCode === 'admin');

      if (uploads.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">目前無上傳審核紀錄</td></tr>';
        return;
      }

      var html = '';
      uploads.forEach(function(item) {
        var statusBadge = 'badge-warning';
        if (item.auditStatus === '審核通過') statusBadge = 'badge-success';
        else if (item.auditStatus === '退回') statusBadge = 'badge-danger';

        var actionCol = '';
        if (isAssistantOrAdmin) {
          if (item.auditStatus !== '審核通過') {
            actionCol += '<button class="btn btn-xs btn-success btn-audit-pass" data-ym="' + item.yearMonth + '" data-eng="' + item.engineer + '">✅ 核准 (0.2分)</button> ';
          }
          if (item.auditStatus !== '退回') {
            actionCol += '<button class="btn btn-xs btn-outline-danger btn-audit-reject" data-ym="' + item.yearMonth + '" data-eng="' + item.engineer + '">❌ 退回</button>';
          }
        } else {
          actionCol = '<span class="text-muted text-xs">需助理權限</span>';
        }

        html += '<tr>' +
          '<td class="font-mono font-bold">' + item.yearMonth + '</td>' +
          '<td class="font-medium">' + item.engineer + '</td>' +
          '<td class="text-xs">' + (item.uploadDate || '-') + '</td>' +
          '<td><span class="badge ' + statusBadge + '">' + (item.auditStatus || '待審核') + '</span></td>' +
          '<td class="font-bold ' + (item.earnedScore > 0 ? 'text-emerald' : 'text-muted') + '">+' + (item.earnedScore || 0) + ' 分</td>' +
          '<td class="text-xs text-muted">' + (item.auditor ? item.auditor + ' (' + item.auditDate + ')' : '-') + '</td>' +
          '<td><div class="action-btn-group">' + actionCol + '</div></td>' +
        '</tr>';
      });

      container.innerHTML = html;

      // 綁定審核核准與退回按鈕
      container.querySelectorAll('.btn-audit-pass').forEach(function(b) {
        b.addEventListener('click', function(e) {
          var ym = e.currentTarget.getAttribute('data-ym');
          var eng = e.currentTarget.getAttribute('data-eng');
          App.handleAuditUpload(ym, eng, '審核通過');
        });
      });

      container.querySelectorAll('.btn-audit-reject').forEach(function(b) {
        b.addEventListener('click', function(e) {
          var ym = e.currentTarget.getAttribute('data-ym');
          var eng = e.currentTarget.getAttribute('data-eng');
          App.handleAuditUpload(ym, eng, '退回');
        });
      });
    },

    // 助理審核動作處理 (核准/退回)
    handleAuditUpload: function(yearMonth, engineer, status) {
      var auditorName = window.AppState.currentUser ? window.AppState.currentUser.name : '助理';
      window.ApiService.auditUpload(yearMonth, engineer, status, auditorName).then(function(res) {
        App.showToast(res.message || (engineer + ' ' + yearMonth + ' 月度固定上傳審核已設定為：' + status));
        App.refreshView();
      });
    },

    // 開啟登記每月上傳 Modal
    openAddUploadModal: function() {
      var modal = document.getElementById('modal-add-upload');
      if (!modal) return;

      var now = new Date();
      var y = now.getFullYear();
      var m = now.getMonth() + 1;
      var ymStr = y + '-' + (m < 10 ? '0' + m : m);
      var nowStr = now.toISOString().substring(0, 10);

      var ymInput = document.getElementById('add-upload-year-month');
      var dateInput = document.getElementById('add-upload-date');
      var engSelect = document.getElementById('add-upload-engineer');

      if (ymInput) ymInput.value = ymStr;
      if (dateInput) dateInput.value = nowStr;

      if (engSelect) {
        var engineers = window.AppState.getDistinctEngineers();
        engSelect.innerHTML = engineers.map(function(eng) {
          return '<option value="' + eng + '">' + eng + '</option>';
        }).join('');
      }

      modal.classList.add('show');
    },

    // 提交登記每月上傳
    handleSubmitAddUpload: function(e) {
      e.preventDefault();
      var ym = document.getElementById('add-upload-year-month').value.trim();
      var eng = document.getElementById('add-upload-engineer').value.trim();
      var uploadDate = document.getElementById('add-upload-date').value.trim();
      var auditStatus = document.getElementById('add-upload-status').value.trim();
      var auditorName = window.AppState.currentUser ? window.AppState.currentUser.name : '助理';

      if (!ym || !eng) {
        App.showToast('請完整填寫考核年月與工程師姓名');
        return;
      }

      var submitBtn = document.getElementById('btn-submit-add-upload');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '同步中...';
      }

      window.ApiService.addUpload(ym, eng, uploadDate, auditStatus, auditorName)
        .then(function(res) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '確認登記並同步';
          }
          document.getElementById('modal-add-upload').classList.remove('show');
          App.showToast(res.message || ('已成功登記 ' + eng + ' ' + ym + ' 上傳資料！'));
          App.refreshView();
        })
        .catch(function(err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '確認登記並同步';
          }
          App.showToast('登記失敗：' + err.message);
        });
    },

    // 主管填寫付出佔比 Modal
    openRatioEditorModal: function(projectId) {
      var proj = window.AppState.projects.find(function(p) { return p.projectId === projectId; });
      if (!proj) return;

      var modal = document.getElementById('modal-ratio-editor');
      document.getElementById('ratio-modal-project-id').value = proj.projectId;
      document.getElementById('ratio-modal-project-title').textContent = proj.projectId + ' · ' + proj.projectName;

      var baseScore = window.Calculator.calculateProjectBaseScore(proj);
      document.getElementById('ratio-modal-base-score').textContent = baseScore.toFixed(1) + ' 分';

      var engineers = window.Calculator.parseSoftwareEngineers(proj);
      var ratioMap = window.Calculator.parseContributionRatios(proj, engineers);

      var container = document.getElementById('ratio-engineers-inputs');
      var html = '';

      if (engineers.length === 1) {
        html = '<div class="alert alert-info">此專案僅有一位軟體工程師 (<strong>' + engineers[0] + '</strong>)，付出佔比固定為 100%。</div>' +
               '<input type="hidden" class="ratio-input" data-eng="' + engineers[0] + '" value="100">';
      } else {
        html = '<div class="mb-3 text-xs text-muted">主管請填寫各軟體工程師在此專案之付出佔比（合計須為 100%）：</div>';
        engineers.forEach(function(eng) {
          var val = ratioMap[eng] !== undefined ? ratioMap[eng] : Math.round(100 / engineers.length);
          html += '<div class="form-group mb-3">' +
            '<div class="d-flex justify-content-between align-items-center mb-1">' +
              '<label class="font-medium">' + eng + '</label>' +
              '<span class="text-xs font-mono ratio-preview-score text-primary" id="preview-score-' + eng + '">預估分: -</span>' +
            '</div>' +
            '<div class="input-group">' +
              '<input type="number" min="0" max="100" step="5" class="form-control ratio-input" data-eng="' + eng + '" value="' + val + '">' +
              '<span class="input-group-addon">%</span>' +
            '</div>' +
          '</div>';
        });
        html += '<div class="d-flex justify-content-between font-bold text-xs mt-2">' +
          '<span>佔比總計：</span><span id="ratio-sum-display" class="text-indigo">100%</span>' +
        '</div>';
      }

      container.innerHTML = html;

      // 即時計算總和與各自分數
      function recalculateRatioSum() {
        var inputs = container.querySelectorAll('.ratio-input');
        var sum = 0;
        inputs.forEach(function(inp) {
          var v = parseFloat(inp.value) || 0;
          sum += v;
          var engName = inp.getAttribute('data-eng');
          var scoreSpan = document.getElementById('preview-score-' + engName);
          if (scoreSpan) {
            var earned = Math.round(baseScore * (v / 100.0) * 100) / 100;
            scoreSpan.textContent = '實得: ' + earned + ' 分';
          }
        });
        var sumDisplay = document.getElementById('ratio-sum-display');
        if (sumDisplay) {
          sumDisplay.textContent = sum + '%';
          sumDisplay.className = (sum === 100) ? 'text-emerald font-bold' : 'text-rose font-bold';
        }
      }

      container.querySelectorAll('.ratio-input').forEach(function(inp) {
        inp.addEventListener('input', recalculateRatioSum);
      });
      recalculateRatioSum();

      modal.classList.add('show');
    },

    // 儲存主管佔比
    handleSaveRatios: function(e) {
      e.preventDefault();
      var projectId = document.getElementById('ratio-modal-project-id').value;
      var inputs = document.querySelectorAll('#ratio-engineers-inputs .ratio-input');
      
      var sum = 0;
      var ratioParts = [];
      inputs.forEach(function(inp) {
        var eng = inp.getAttribute('data-eng');
        var val = parseFloat(inp.value) || 0;
        sum += val;
        ratioParts.push(eng + ':' + val + '%');
      });

      if (inputs.length > 1 && sum !== 100) {
        alert('工程師付出佔比總和必須為 100%！目前為：' + sum + '%');
        return;
      }

      var ratioString = ratioParts.join(', ');
      window.ApiService.updateRatios(projectId, ratioString).then(function() {
        document.getElementById('modal-ratio-editor').classList.remove('show');
        App.showToast('主管已成功設定工程師付出佔比：' + ratioString);
        App.refreshView();
      });
    },

    // 主管 / 超級使用者：指派與修改軟體工程師名單 Modal
    // 動態依 Google Sheet 名單填充工程師下拉選單
    populateCompanyEngineerSelect: function(selectId) {
      var select = document.getElementById(selectId);
      if (!select) return;
      var engs = window.AppState.getAllCompanyEngineers();
      
      var html = '<option value="">-- 請由下拉選單挑選軟體工程師 --</option>';
      engs.forEach(function(name) {
        html += '<option value="' + name + '">💻 ' + name + '</option>';
      });
      select.innerHTML = html;
    },

    // 渲染工程師標籤 (支援點擊 ❌ 一鍵從輸入框移除)
    renderEngineerTags: function(inputId, containerId) {
      var input = document.getElementById(inputId);
      var container = document.getElementById(containerId);
      if (!input || !container) return;

      var cur = input.value.trim();
      var list = cur ? cur.split(/[,，、;；\s]+/).map(function(s){return s.trim();}).filter(Boolean) : [];
      
      var unique = [];
      list.forEach(function(item) {
        if (unique.indexOf(item) === -1) unique.push(item);
      });

      if (unique.length === 0) {
        container.innerHTML = '<span class="text-xs text-muted">尚未選取任何工程師</span>';
        return;
      }

      var html = '';
      unique.forEach(function(name) {
        html += '<span class="engineer-tag">' +
          '<span>' + name + '</span>' +
          '<span class="engineer-tag-remove" data-name="' + name + '" data-input="' + inputId + '" data-container="' + containerId + '" title="移除此工程師">&times;</span>' +
          '</span>';
      });
      container.innerHTML = html;

      // 綁定標籤上的移除按鈕
      container.querySelectorAll('.engineer-tag-remove').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rmName = e.currentTarget.getAttribute('data-name');
          App.removeEngineerFromInput(inputId, containerId, rmName);
        });
      });
    },

    // 加入工程師至指定輸入框
    addEngineerToInput: function(inputId, containerId, name) {
      if (!name) return;
      var input = document.getElementById(inputId);
      if (!input) return;
      var cur = input.value.trim();
      var list = cur ? cur.split(/[,，、;；\s]+/).map(function(s){return s.trim();}).filter(Boolean) : [];
      if (list.indexOf(name) === -1) {
        list.push(name);
        input.value = list.join(', ');
        App.renderEngineerTags(inputId, containerId);
      }
    },

    // 從指定輸入框移除工程師
    removeEngineerFromInput: function(inputId, containerId, name) {
      var input = document.getElementById(inputId);
      if (!input) return;
      var cur = input.value.trim();
      var list = cur ? cur.split(/[,，、;；\s]+/).map(function(s){return s.trim();}).filter(Boolean) : [];
      var filtered = list.filter(function(n) { return n !== name; });
      input.value = filtered.join(', ');
      App.renderEngineerTags(inputId, containerId);
    },

    // 開啟指派/修改軟體工程師 Modal (主管與超級管理員專用)
    openEditEngineersModal: function(projectId) {
      var proj = window.AppState.projects.find(function(p) { return p.projectId === projectId; });
      if (!proj) return;

      var modal = document.getElementById('modal-edit-engineers');
      document.getElementById('edit-eng-modal-project-id').value = proj.projectId;
      document.getElementById('edit-eng-modal-project-title').textContent = proj.projectId + ' · ' + proj.projectName;
      document.getElementById('edit-eng-input').value = proj.softwareEngineer || '';

      // 填充最新 Google Sheet 下拉選單並繪製已選標籤
      App.populateCompanyEngineerSelect('select-company-engineer');
      App.renderEngineerTags('edit-eng-input', 'selected-engineers-tags');

      modal.classList.add('show');
    },

    // 儲存主管 / 超級使用者 修改之軟體工程師名單
    handleSaveEngineers: function(e) {
      e.preventDefault();
      var projectId = document.getElementById('edit-eng-modal-project-id').value;
      var newEngs = document.getElementById('edit-eng-input').value.trim();

      if (!newEngs) {
        alert('請至少指派一位軟體工程師！');
        return;
      }

      window.ApiService.updateSoftwareEngineers(projectId, newEngs).then(function() {
        document.getElementById('modal-edit-engineers').classList.remove('show');
        App.showToast('專案軟體工程師名單已成功更新為：' + newEngs);
        App.refreshView();
      });
    },

    // 助理審核完成進度 Modal
    openCompletionEditorModal: function(projectId) {
      var proj = window.AppState.projects.find(function(p) { return p.projectId === projectId; });
      if (!proj) return;

      var modal = document.getElementById('modal-completion-editor');
      document.getElementById('comp-modal-project-id').value = proj.projectId;
      document.getElementById('comp-modal-project-title').textContent = proj.projectId + ' · ' + proj.projectName;

      var currentRate = parseInt(proj.completionRate || '0', 10);
      var rangeInput = document.getElementById('comp-rate-range');
      var numDisplay = document.getElementById('comp-rate-display');
      var statusSelect = document.getElementById('comp-status-select');
      var softDateInput = document.getElementById('comp-software-date');

      if (rangeInput) rangeInput.value = currentRate;
      if (numDisplay) numDisplay.textContent = currentRate + '%';
      if (statusSelect) statusSelect.value = proj.status || '進行中';
      if (softDateInput) softDateInput.value = proj.softwareCompletionDate || '';

      if (rangeInput && numDisplay) {
        rangeInput.oninput = function() {
          numDisplay.textContent = this.value + '%';
          if (parseInt(this.value, 10) === 100) {
            statusSelect.value = '已結案';
            if (!softDateInput.value) {
              softDateInput.value = new Date().toISOString().substring(0, 10);
            }
          }
        };
      }

      modal.classList.add('show');
    },

    // 儲存助理審核進度
    handleSaveCompletion: function(e) {
      e.preventDefault();
      var projectId = document.getElementById('comp-modal-project-id').value;
      var rate = document.getElementById('comp-rate-range').value + '%';
      var status = document.getElementById('comp-status-select').value;
      var softDate = document.getElementById('comp-software-date').value;

      window.ApiService.updateCompletion(projectId, rate, status, softDate).then(function() {
        document.getElementById('modal-completion-editor').classList.remove('show');
        App.showToast('助理已更新專案完成比例與結案狀態');
        App.refreshView();
      });
    },

    // 開啟新增專案 Modal
    openAddProjectModal: function() {
      var modal = document.getElementById('modal-add-project');
      var nextId = 'UDM-2026-' + ('000' + (window.AppState.projects.length + 1)).slice(-3);
      document.getElementById('add-project-id').value = nextId;
      document.getElementById('add-receipt-date').value = new Date().toISOString().substring(0, 10);
      document.getElementById('add-required-date').value = new Date(Date.now() + 30*86400000).toISOString().substring(0, 10);
      
      // 填充最新 Google Sheet 下拉選單並繪製標籤
      App.populateCompanyEngineerSelect('select-add-project-engineer');
      App.renderEngineerTags('add-software-engineer', 'add-project-engineers-tags');

      App.updateAddProjectLivePreview();
      modal.classList.add('show');
    },

    // 新增專案表單即時算分預覽
    updateAddProjectLivePreview: function() {
      var form = document.getElementById('form-add-project');
      if (!form) return;

      var isSmart = document.getElementById('add-is-smart').value === '是';
      var grade = document.getElementById('add-smart-grade').value;
      var units = parseInt(document.getElementById('add-units').value, 10) || 0;
      var quote = parseFloat(document.getElementById('add-quote').value) || 0;
      var item = document.getElementById('add-integration').value || '';
      var type = document.getElementById('add-project-type').value || '';

      // 依條件切換欄位提示
      var smartFields = document.getElementById('smart-building-fields');
      var nonSmartFields = document.getElementById('nonsmart-building-fields');
      if (smartFields && nonSmartFields) {
        smartFields.style.display = isSmart ? 'block' : 'none';
        nonSmartFields.style.display = !isSmart ? 'block' : 'none';
      }

      var previewProject = {
        isSmartBuilding: isSmart,
        smartGrade: grade,
        units: units,
        quote: quote,
        integrationItem: item,
        projectType: type
      };

      var baseScore = window.Calculator.calculateProjectBaseScore(previewProject);
      var scoreDisplay = document.getElementById('add-live-score-preview');
      var formulaDisplay = document.getElementById('add-live-formula-preview');

      if (scoreDisplay) scoreDisplay.textContent = baseScore.toFixed(1) + ' 分';
      if (formulaDisplay) {
        if (type === '維護專案' || item.indexOf('維護') !== -1) {
          formulaDisplay.textContent = '計算規則：維護專案固定 1 案 1 分';
        } else if (isSmart) {
          var mult = window.Calculator.SMART_GRADES[grade] || 1.0;
          formulaDisplay.textContent = '計算規則：(' + quote.toLocaleString() + ' / 10000) × 等級係數 ' + mult + ' = ' + baseScore.toFixed(1) + ' 分';
        } else {
          formulaDisplay.textContent = '計算規則：戶數 ' + units + ' 戶，依級距評定為 ' + baseScore + ' 分';
        }
      }
    },

    // 處理建立新專案
    handleCreateProject: function(e) {
      e.preventDefault();
      var isSmart = document.getElementById('add-is-smart').value === '是';
      var engineersStr = document.getElementById('add-software-engineer').value.trim();
      var quoteVal = parseFloat(document.getElementById('add-quote').value) || 0;
      var unitsVal = parseInt(document.getElementById('add-units').value, 10) || 0;

      if (!engineersStr) {
        alert('請至少填寫一位軟體工程師！');
        return;
      }

      var newProject = {
        projectId: document.getElementById('add-project-id').value.trim(),
        projectName: document.getElementById('add-project-name').value.trim(),
        drawingId: document.getElementById('add-drawing-id').value.trim(),
        integrationItem: document.getElementById('add-integration').value.trim(),
        receiptDate: document.getElementById('add-receipt-date').value,
        projectEngineer: document.getElementById('add-project-engineer').value.trim(),
        requiredDate: document.getElementById('add-required-date').value,
        softwareEngineer: engineersStr,
        contributionRatio: engineersStr.indexOf(',') !== -1 ? '' : (engineersStr + ':100%'),
        softwareCompletionDate: document.getElementById('add-software-completion-date').value,
        hardwareCompletionDate: document.getElementById('add-hardware-completion-date').value,
        isSmartBuilding: isSmart,
        smartGrade: isSmart ? document.getElementById('add-smart-grade').value : '無',
        units: unitsVal,
        quote: quoteVal,
        projectType: document.getElementById('add-project-type').value,
        status: document.getElementById('add-status').value,
        completionRate: document.getElementById('add-completion-rate').value + '%'
      };

      window.ApiService.addProject(newProject).then(function(res) {
        document.getElementById('modal-add-project').classList.remove('show');
        document.getElementById('form-add-project').reset();
        App.showToast('專案已成功建立並同步！');
        App.refreshView();
      });
    },

    // 觸發手動同步
    handleSyncData: function() {
      var btn = document.getElementById('btn-sync-data');
      if (btn) btn.classList.add('loading');

      window.ApiService.fetchData().then(function(data) {
        if (btn) btn.classList.remove('loading');
        App.showToast(data.warning ? ('注意：' + data.warning) : 'Google Sheet 資料庫已同步完成！');
        App.populateFilterDropdowns();
        App.refreshView();
      });
    },

    // 登入驗證相關
    openLoginModal: function() {
      var modal = document.getElementById('modal-login');
      if (modal) {
        modal.classList.add('show');
        var errBox = document.getElementById('login-error-alert');
        if (errBox) errBox.style.display = 'none';
        var userInput = document.getElementById('login-username');
        if (userInput) userInput.focus();
      }
    },

    closeLoginModal: function() {
      var modal = document.getElementById('modal-login');
      if (modal) modal.classList.remove('show');
    },

    handleLogin: function(e) {
      e.preventDefault();
      var username = (document.getElementById('login-username').value || '').trim();
      var password = document.getElementById('login-password').value;
      var errBox = document.getElementById('login-error-alert');
      var submitBtn = document.getElementById('btn-submit-login');

      if (!username || !password) {
        if (errBox) {
          errBox.textContent = '請輸入人員帳號與密碼';
          errBox.style.display = 'block';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '🔐 驗證中...';
      }

      window.ApiService.login(username, password)
        .then(function(res) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔐 安全登入';
          }

          if (res.success && res.user) {
            if (errBox) errBox.style.display = 'none';
            window.AppState.setAuthenticatedUser(res.user);
            App.closeLoginModal();
            document.getElementById('login-password').value = '';

            App.renderUserRoleUI();
            App.populateFilterDropdowns();
            App.showToast('🎉 歡迎回來，' + res.user.name + ' (' + res.user.role + ')！');

            // 登入成功後，即刻從後端載入該角色專案與資料
            if (window.ApiService.hasGasConfigured()) {
              App.handleSyncData();
            } else {
              App.refreshView();
            }
          } else {
            if (errBox) {
              errBox.textContent = '❌ ' + (res.message || '帳號或密碼錯誤');
              errBox.style.display = 'block';
            }
          }
        })
        .catch(function(err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔐 安全登入';
          }
          if (errBox) {
            errBox.textContent = '❌ 登入驗證失敗：' + err.message;
            errBox.style.display = 'block';
          }
        });
    },

    handleLogout: function() {
      window.AppState.logout();
      window.AppState.projects = [];
      window.AppState.monthlyUploads = [];
      App.renderUserRoleUI();
      App.populateFilterDropdowns();
      App.refreshView();
      App.openLoginModal();
      App.showToast('已安全登出系統。');
    },

    // 設定 Modal 相關
    openSettingsModal: function() {
      var modal = document.getElementById('modal-settings');
      document.getElementById('settings-gas-url').value = window.AppState.gasUrl || '';
      document.getElementById('settings-secret-key').value = window.CryptoService.getSecretKey();
      modal.classList.add('show');
    },

    handleSaveSettings: function(e) {
      e.preventDefault();
      var url = document.getElementById('settings-gas-url').value.trim();
      var key = document.getElementById('settings-secret-key').value.trim();

      window.AppState.gasUrl = url;
      localStorage.setItem('udm_gas_url', url);
      window.CryptoService.setSecretKey(key);

      document.getElementById('modal-settings').classList.remove('show');
      App.showToast('設定已儲存！即刻嘗試連線 Google Sheet...');
      App.handleSyncData();
    },

    // 更新資安加密狀態徽章
    updateSecurityStatusBadge: function() {
      var badge = document.getElementById('security-status-badge');
      if (!badge) return;

      var hasGas = window.ApiService.hasGasConfigured();
      if (hasGas) {
        badge.className = 'security-badge live';
        badge.innerHTML = '<span class="status-dot green"></span> AES-256 雲端連線保護中';
      } else {
        badge.className = 'security-badge local';
        badge.innerHTML = '<span class="status-dot blue"></span> 本地安全沙盒模式';
      }
    },

    // Toast 訊息提示
    showToast: function(msg) {
      var container = document.getElementById('toast-container');
      if (!container) return;

      var toast = document.createElement('div');
      toast.className = 'toast-msg';
      toast.textContent = msg;
      container.appendChild(toast);

      setTimeout(function() {
        toast.classList.add('fade-out');
        setTimeout(function() { toast.remove(); }, 300);
      }, 3000);
    }
  };

  // 全域註冊與啟動
  window.App = App;
  document.addEventListener('DOMContentLoaded', App.init);
})(window);
