/**
 * 優德美科技 - 應用程式全域狀態與 RBAC 權限管理
 */

(function(window) {
  'use strict';

  var DEFAULT_USERS = [
    {
      id: 'admin',
      username: 'admin',
      name: '超級管理員',
      role: '超級使用者',
      roleCode: 'admin',
      managedEngineers: ['*'],
      avatar: '👑',
      pwdHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
    },
    {
      id: 'manager1',
      username: 'manager1',
      name: '王主管',
      role: '主管',
      roleCode: 'manager',
      managedEngineers: ['林軟體', '李程式', '張工程'],
      avatar: '👔',
      pwdHash: '49a0ac18e26df0b0724f5ac5837e436b336527485fc0a388f578913d6ee70e67'
    },
    {
      id: 'engineer1',
      username: 'engineer1',
      name: '林軟體',
      role: '工程師',
      roleCode: 'engineer',
      engineerName: '林軟體',
      managedEngineers: ['林軟體'],
      avatar: '💻',
      pwdHash: 'f63248efa4a61efc9f4c9f6e5de25b34b6f2b827717cd4c6b3905481c3bd483b'
    },
    {
      id: 'engineer2',
      username: 'engineer2',
      name: '李程式',
      role: '工程師',
      roleCode: 'engineer',
      engineerName: '李程式',
      managedEngineers: ['李程式'],
      avatar: '💻',
      pwdHash: 'f63248efa4a61efc9f4c9f6e5de25b34b6f2b827717cd4c6b3905481c3bd483b'
    },
    {
      id: 'engineer3',
      username: 'engineer3',
      name: '張工程',
      role: '工程師',
      roleCode: 'engineer',
      engineerName: '張工程',
      managedEngineers: ['張工程'],
      avatar: '💻',
      pwdHash: 'f63248efa4a61efc9f4c9f6e5de25b34b6f2b827717cd4c6b3905481c3bd483b'
    },
    {
      id: 'assistant1',
      username: 'assistant1',
      name: '陳助理',
      role: '助理',
      roleCode: 'assistant',
      managedEngineers: [],
      avatar: '📋',
      pwdHash: 'a78548d218b1450e8a5680033627e434b730c56cabffb8270291f0657c04c3c9'
    }
  ];

  var DEFAULT_PROJECTS = [
    {
      projectId: 'UDM-2026-001',
      projectName: '信義天際綠能大樓',
      drawingId: 'DWG-101',
      integrationItem: '門禁整合、BA監控、智慧建築標章',
      receiptDate: '2026-01-10',
      projectEngineer: '陳專案',
      requiredDate: '2026-03-30',
      softwareEngineer: '林軟體',
      contributionRatio: '林軟體:100%',
      softwareCompletionDate: '2026-03-25',
      hardwareCompletionDate: '2026-03-28',
      isSmartBuilding: true,
      smartGrade: '鑽石',
      units: 120,
      quote: 800000,
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2026-002',
      projectName: '板橋智慧商業園區',
      drawingId: 'DWG-102',
      integrationItem: '中央監控、智慧電表連動整合',
      receiptDate: '2026-02-05',
      projectEngineer: '王專案',
      requiredDate: '2026-05-15',
      softwareEngineer: '林軟體, 李程式',
      contributionRatio: '林軟體:60%, 李程式:40%',
      softwareCompletionDate: '2026-05-10',
      hardwareCompletionDate: '2026-05-12',
      isSmartBuilding: true,
      smartGrade: '黃金',
      units: 80,
      quote: 500000,
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2026-003',
      projectName: '青埔明日之星優質住宅',
      drawingId: 'DWG-103',
      integrationItem: '弱電智慧宅對講系統',
      receiptDate: '2026-03-01',
      projectEngineer: '陳專案',
      requiredDate: '2026-06-20',
      softwareEngineer: '李程式',
      contributionRatio: '李程式:100%',
      softwareCompletionDate: '2026-06-18',
      hardwareCompletionDate: '2026-06-20',
      isSmartBuilding: false,
      smartGrade: '無',
      units: 150, // 101~200戶 => 8分
      quote: 280000,
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2026-004',
      projectName: '內湖科技廠年度軟體維護案',
      drawingId: 'DWG-104',
      integrationItem: '定期系統維護與安全修補',
      receiptDate: '2026-01-01',
      projectEngineer: '王專案',
      requiredDate: '2026-12-31',
      softwareEngineer: '張工程',
      contributionRatio: '張工程:100%',
      softwareCompletionDate: '2026-06-30',
      hardwareCompletionDate: '2026-06-30',
      isSmartBuilding: false,
      smartGrade: '無',
      units: 1,
      quote: 60000,
      projectType: '維護專案',
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2026-005',
      projectName: '南港智慧科技總部大樓',
      drawingId: 'DWG-105',
      integrationItem: 'AI空調節能與智慧建築系統',
      receiptDate: '2026-04-12',
      projectEngineer: '陳專案',
      requiredDate: '2026-08-30',
      softwareEngineer: '林軟體, 張工程',
      contributionRatio: '林軟體:50%, 張工程:50%',
      softwareCompletionDate: '2026-08-20',
      hardwareCompletionDate: '2026-08-25',
      isSmartBuilding: true,
      smartGrade: '銀',
      units: 240,
      quote: 650000,
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2026-006',
      projectName: '竹北高鐵新創生醫園區',
      drawingId: 'DWG-106',
      integrationItem: '微氣候感知與環境感測系統',
      receiptDate: '2026-05-10',
      projectEngineer: '王專案',
      requiredDate: '2026-09-15',
      softwareEngineer: '李程式, 張工程',
      contributionRatio: '李程式:70%, 張工程:30%',
      softwareCompletionDate: '2026-09-05',
      hardwareCompletionDate: '2026-09-08',
      isSmartBuilding: true,
      smartGrade: '合格',
      units: 45,
      quote: 300000,
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2026-007',
      projectName: '台中七期市政尊爵住宅',
      drawingId: 'DWG-107',
      integrationItem: '全棟智能居家系統整合',
      receiptDate: '2026-06-01',
      projectEngineer: '陳專案',
      requiredDate: '2026-10-30',
      softwareEngineer: '林軟體',
      contributionRatio: '林軟體:100%',
      softwareCompletionDate: '', // 進行中
      hardwareCompletionDate: '',
      isSmartBuilding: false,
      smartGrade: '無',
      units: 220, // 201以上 => 10分
      quote: 450000,
      status: '進行中',
      completionRate: '65%'
    },
    // 去年同期範例專案 (2025年)，供比較分析
    {
      projectId: 'UDM-2025-010',
      projectName: '去年同期案：大安敦南名邸',
      drawingId: 'DWG-090',
      integrationItem: '智慧門禁整合',
      receiptDate: '2025-02-15',
      projectEngineer: '陳專案',
      requiredDate: '2025-05-20',
      softwareEngineer: '林軟體',
      contributionRatio: '林軟體:100%',
      softwareCompletionDate: '2025-05-15',
      hardwareCompletionDate: '2025-05-18',
      isSmartBuilding: true,
      smartGrade: '銅',
      units: 90,
      quote: 400000,
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2025-012',
      projectName: '去年同期案：新竹科學園區廠辦',
      drawingId: 'DWG-092',
      integrationItem: '電力智慧監控',
      receiptDate: '2025-03-10',
      projectEngineer: '王專案',
      requiredDate: '2025-06-25',
      softwareEngineer: '李程式',
      contributionRatio: '李程式:100%',
      softwareCompletionDate: '2025-06-20',
      hardwareCompletionDate: '2025-06-22',
      isSmartBuilding: false,
      smartGrade: '無',
      units: 48, // 21~50戶 => 5分
      quote: 200000,
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2025-015',
      projectName: '去年同期案：內湖科技廠年度維護',
      drawingId: 'DWG-095',
      integrationItem: '系統巡檢維護',
      receiptDate: '2025-01-01',
      projectEngineer: '王專案',
      requiredDate: '2025-12-31',
      softwareEngineer: '張工程',
      contributionRatio: '張工程:100%',
      softwareCompletionDate: '2025-06-28',
      hardwareCompletionDate: '2025-06-28',
      isSmartBuilding: false,
      smartGrade: '無',
      units: 1,
      quote: 50000,
      projectType: '維護專案',
      status: '已結案',
      completionRate: '100%'
    },
    {
      projectId: 'UDM-2025-018',
      projectName: '去年同期案：台中綠美圖智慧分案',
      drawingId: 'DWG-098',
      integrationItem: '智慧場館照明控制',
      receiptDate: '2025-05-01',
      projectEngineer: '陳專案',
      requiredDate: '2025-08-30',
      softwareEngineer: '林軟體',
      contributionRatio: '林軟體:100%',
      softwareCompletionDate: '2025-08-15',
      hardwareCompletionDate: '2025-08-20',
      isSmartBuilding: true,
      smartGrade: '銀',
      units: 30,
      quote: 350000,
      status: '已結案',
      completionRate: '100%'
    }
  ];

  var DEFAULT_UPLOADS = [
    { yearMonth: '2026-01', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-01-28', auditStatus: '審核通過', auditDate: '2026-01-29', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-02', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-02-26', auditStatus: '審核通過', auditDate: '2026-02-27', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-03', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-03-27', auditStatus: '審核通過', auditDate: '2026-03-28', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-04', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-04-28', auditStatus: '審核通過', auditDate: '2026-04-29', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-05', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-05-29', auditStatus: '審核通過', auditDate: '2026-05-30', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-06', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-06-28', auditStatus: '審核通過', auditDate: '2026-06-29', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-07', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-07-30', auditStatus: '待審核', auditDate: '', auditor: '', earnedScore: 0 },
    { yearMonth: '2026-08', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2026-08-30', auditStatus: '待審核', auditDate: '', auditor: '', earnedScore: 0 },
    { yearMonth: '2026-01', engineer: '李程式', uploadStatus: '已上傳', uploadDate: '2026-01-29', auditStatus: '審核通過', auditDate: '2026-01-30', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-02', engineer: '李程式', uploadStatus: '已上傳', uploadDate: '2026-02-28', auditStatus: '審核通過', auditDate: '2026-03-01', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-03', engineer: '李程式', uploadStatus: '已上傳', uploadDate: '2026-03-30', auditStatus: '審核通過', auditDate: '2026-03-31', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2026-07', engineer: '李程式', uploadStatus: '已上傳', uploadDate: '2026-07-30', auditStatus: '待審核', auditDate: '', auditor: '', earnedScore: 0 },
    { yearMonth: '2026-07', engineer: '張工程', uploadStatus: '已上傳', uploadDate: '2026-07-31', auditStatus: '待審核', auditDate: '', auditor: '', earnedScore: 0 },
    // 去年同期上傳紀錄
    { yearMonth: '2025-05', engineer: '林軟體', uploadStatus: '已上傳', uploadDate: '2025-05-28', auditStatus: '審核通過', auditDate: '2025-05-29', auditor: '陳助理', earnedScore: 0.2 },
    { yearMonth: '2025-06', engineer: '李程式', uploadStatus: '已上傳', uploadDate: '2025-06-29', auditStatus: '審核通過', auditDate: '2025-06-30', auditor: '陳助理', earnedScore: 0.2 }
  ];

  var State = {
    users: DEFAULT_USERS,
    currentUser: null, // 登入後之使用者物件 (未登入為 null)
    projects: [],
    monthlyUploads: [],
    
    // 篩選狀態
    filterPeriod: '2026', // '2026', '2026-05', 'ALL'
    filterYear: '2026',
    filterMonth: 'ALL',
    filterEngineer: 'ALL',
    searchKeyword: '',
    activeTab: 'projects', // 'projects', 'leaderboard', 'assistant_audit', 'settings'

    // Google Sheet 連線狀態
    syncMode: 'cloud', // 'local' 或 'cloud'
    gasUrl: localStorage.getItem('udm_gas_url') || 'https://script.google.com/macros/s/AKfycbz20hACtfqyKPF9tvq0A5sc1EMvU8fRxkUXLbi5d_LpXJIjqktSC9PzztC1DJdy67pc/exec',
    isSyncing: false,
    lastSyncTime: null,

    // 檢查是否已登入
    isLoggedIn: function() {
      return !!State.currentUser;
    },

    // 設定已通過身分驗證之使用者
    setAuthenticatedUser: function(user) {
      State.currentUser = user;
      localStorage.setItem('udm_current_user_id', user.id);

      if (user.roleCode === 'engineer') {
        State.filterEngineer = user.engineerName;
      } else {
        State.filterEngineer = 'ALL';
      }
    },

    // 本機離線驗證備援 (以 SHA-256 雜湊比對，不存明文)
    verifyLocalLogin: function(username, passwordHash) {
      var trimmedUser = (username || '').trim().toLowerCase();
      var trimmedHash = (passwordHash || '').trim().toLowerCase();

      var matched = State.users.find(function(u) {
        var uUser = (u.username || u.id || '').toLowerCase();
        var uHash = (u.pwdHash || '').toLowerCase();
        return (uUser === trimmedUser) && (uHash === trimmedHash);
      });

      if (matched) {
        State.setAuthenticatedUser(matched);
        return { success: true, user: matched };
      }

      return { success: false, message: '帳號或密碼錯誤，請確認後重試。' };
    },

    // 登出
    logout: function() {
      State.currentUser = null;
      localStorage.removeItem('udm_current_user_id');
      State.filterEngineer = 'ALL';
    },

    // 初始化狀態
    init: function() {
      // 確保具備預設 GAS URL
      if (!State.gasUrl) {
        State.gasUrl = 'https://script.google.com/macros/s/AKfycbz20hACtfqyKPF9tvq0A5sc1EMvU8fRxkUXLbi5d_LpXJIjqktSC9PzztC1DJdy67pc/exec';
      }

      // 載入同步快取的使用者清單
      var cachedUsers = localStorage.getItem('udm_users');
      if (cachedUsers) {
        try {
          var parsedUsers = JSON.parse(cachedUsers);
          if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
            State.users = parsedUsers;
          }
        } catch(e) {
          State.users = DEFAULT_USERS;
        }
      }

      // 檢查持久化登入狀態
      var savedUserId = localStorage.getItem('udm_current_user_id');
      if (savedUserId) {
        var foundUser = State.users.find(function(u) {
          return u.id === savedUserId || u.username === savedUserId;
        });
        if (foundUser) {
          State.currentUser = foundUser;
          if (foundUser.roleCode === 'engineer') {
            State.filterEngineer = foundUser.engineerName;
          }
        } else {
          State.currentUser = null;
        }
      } else {
        State.currentUser = null;
      }

      // 載入本地快取專案與上傳紀錄
      var cachedProj = localStorage.getItem('udm_projects');
      if (cachedProj) {
        try { State.projects = JSON.parse(cachedProj); } catch(e) { State.projects = DEFAULT_PROJECTS; }
      } else {
        State.projects = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
        State.saveProjectsToLocal();
      }

      var cachedUploads = localStorage.getItem('udm_uploads');
      if (cachedUploads) {
        try { State.monthlyUploads = JSON.parse(cachedUploads); } catch(e) { State.monthlyUploads = DEFAULT_UPLOADS; }
      } else {
        State.monthlyUploads = JSON.parse(JSON.stringify(DEFAULT_UPLOADS));
        State.saveUploadsToLocal();
      }
    },

    saveProjectsToLocal: function() {
      localStorage.setItem('udm_projects', JSON.stringify(State.projects));
    },

    saveUploadsToLocal: function() {
      localStorage.setItem('udm_uploads', JSON.stringify(State.monthlyUploads));
    },

    // 切換登入角色 (供管理員模擬視角)
    setCurrentUser: function(userId) {
      var found = State.users.find(function(u) { return u.id === userId || u.username === userId; });
      if (found) {
        State.currentUser = found;
        localStorage.setItem('udm_current_user_id', found.id);
        // 若為工程師，自動鎖定工程師篩選條件
        if (found.roleCode === 'engineer') {
          State.filterEngineer = found.engineerName;
        } else if (found.roleCode === 'manager') {
          State.filterEngineer = 'ALL';
        } else if (found.roleCode === 'assistant') {
          State.filterEngineer = 'ALL';
        }
      }
    },

    // 取得當前角色可見的工程師清單
    getVisibleEngineers: function() {
      var allSoftwareEngs = ['林軟體', '李程式', '張工程'];
      if (!State.currentUser) return [];

      if (State.currentUser.roleCode === 'admin') {
        return allSoftwareEngs;
      }
      if (State.currentUser.roleCode === 'manager') {
        return State.currentUser.managedEngineers || allSoftwareEngs;
      }
      if (State.currentUser.roleCode === 'engineer') {
        return [State.currentUser.engineerName];
      }
      if (State.currentUser.roleCode === 'assistant') {
        return allSoftwareEngs;
      }
      return allSoftwareEngs;
    },

    // 取得當前角色可見的專案清單
    getVisibleProjects: function() {
      if (!State.currentUser) return [];
      var list = State.projects;
      var role = State.currentUser.roleCode;

      if (role === 'admin') {
        // 全看
      } else if (role === 'manager') {
        var managed = State.currentUser.managedEngineers || [];
        list = list.filter(function(p) {
          var engs = (p.softwareEngineer || '').split(/[,，、;；\s]+/);
          return engs.some(function(e) { return managed.indexOf(e.trim()) !== -1; });
        });
      } else if (role === 'engineer') {
        var myName = State.currentUser.engineerName;
        list = list.filter(function(p) {
          var engs = (p.softwareEngineer || '').split(/[,，、;；\s]+/);
          return engs.some(function(e) { return e.trim() === myName; });
        });
      } else if (role === 'assistant') {
        // 助理可見全部專案，但 UI 會隱藏或只讀敏感財務報價與主管配分
      }

      // 依軟體完成時間 / 區段過濾
      if (State.filterPeriod && State.filterPeriod !== 'ALL') {
        list = list.filter(function(p) {
          return window.Calculator.isProjectInPeriod(p, State.filterPeriod);
        });
      }

      // 依工程師選單篩選
      if (State.filterEngineer && State.filterEngineer !== 'ALL') {
        list = list.filter(function(p) {
          var engs = (p.softwareEngineer || '').split(/[,，、;；\s]+/);
          return engs.some(function(e) { return e.trim() === State.filterEngineer; });
        });
      }

      // 依關鍵字搜尋
      if (State.searchKeyword && State.searchKeyword.trim()) {
        var kw = State.searchKeyword.trim().toLowerCase();
        list = list.filter(function(p) {
          return (p.projectId && p.projectId.toLowerCase().indexOf(kw) !== -1) ||
                 (p.projectName && p.projectName.toLowerCase().indexOf(kw) !== -1) ||
                 (p.drawingId && p.drawingId.toLowerCase().indexOf(kw) !== -1) ||
                 (p.softwareEngineer && p.softwareEngineer.toLowerCase().indexOf(kw) !== -1);
        });
      }

      return list;
    }
  };

  window.AppState = State;
})(window);
