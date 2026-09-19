/**
 * 優德美科技 - 績效考核核心計算引擎
 * 支援三大專案類別（一般建築、智慧建築、修改）與智慧建築手動倍率調整機制
 * 嚴格遵循：只評估軟體工程師、多位工程師主管填寫佔比、月/年區段篩選、去年同期比較
 */

(function(window) {
  'use strict';

  var Calculator = {
    // 智慧建築預設等級權重 (提供手動倍率連動預設值)
    SMART_GRADES: {
      '合格': 1.0,
      '銅': 1.05,
      '銅級': 1.05,
      '銀': 1.10,
      '銀級': 1.10,
      '黃金': 1.15,
      '黃金級': 1.15,
      '鑽石': 1.20,
      '鑽石級': 1.20
    },

    // 0. 取得專案標準分類：一般建築、智慧建築、修改 (向下相容舊資料)
    getProjectCategory: function(project) {
      if (!project) return '一般建築';
      var cat = (project.category || project['專案類別'] || project['類別'] || '').toString().trim();
      if (cat === '智慧建築' || cat === '一般建築' || cat === '修改') {
        return cat;
      }

      // 向下相容既有資料庫格式
      var type = (project.projectType || project['專案類型'] || '').toString();
      var item = (project.integrationItem || project['整合項目'] || '').toString();
      if (type === '維護專案' || item.indexOf('維護') !== -1 || type === '修改' || item.indexOf('修改') !== -1) {
        return '修改';
      }

      var isSmartVal = project.isSmartBuilding !== undefined ? project.isSmartBuilding : project['是否為智慧建築'];
      var isSmart = isSmartVal === true || isSmartVal === '是' || isSmartVal === 'true' || isSmartVal === 1;
      return isSmart ? '智慧建築' : '一般建築';
    },

    // 1. 計算專案基準分 (Base Score)
    calculateProjectBaseScore: function(project) {
      if (!project) return 0;
      var category = Calculator.getProjectCategory(project);

      // 類別 1: 修改 (預設 1 案 1 分，支援手動自訂修改點數)
      if (category === '修改') {
        if (project.modScore !== undefined && project.modScore !== null && project.modScore !== '') {
          return parseFloat(project.modScore) || 0;
        }
        return 1.0;
      }

      // 類別 2: 智慧建築 (公式：(報價金額 / 10000) * 倍率，支援手動倍率調整機制)
      if (category === '智慧建築') {
        var quote = parseFloat(project.quote || project['報價']) || 0;
        var multiplier = 1.0;

        // 優先採用手動指定倍率 (smartMultiplier / 倍率)
        var rawMultiplier = project.smartMultiplier !== undefined ? project.smartMultiplier : (project['智慧建築倍率'] || project['倍率']);
        if (rawMultiplier !== undefined && rawMultiplier !== null && rawMultiplier !== '') {
          multiplier = parseFloat(rawMultiplier) || 1.0;
        } else {
          var gradeRaw = (project.smartGrade || project['智慧建築等級'] || '合格').toString().trim();
          multiplier = Calculator.SMART_GRADES[gradeRaw] || 1.0;
        }

        var score = (quote / 10000.0) * multiplier;
        return Math.round(score * 100) / 100;
      }

      // 類別 3: 一般建築：依戶數級距 (<=20: 4分, 21~50: 5分, 51~100: 6分, 101~200: 8分, 201以上: 10分)
      var units = parseInt(project.units || project['戶數'], 10) || 0;
      if (units <= 20) return 4.0;
      if (units <= 50) return 5.0;
      if (units <= 100) return 6.0;
      if (units <= 200) return 8.0;
      return 10.0;
    },

    // 2. 解析軟體工程師名單 (支援多位)
    parseSoftwareEngineers: function(project) {
      var raw = (project.softwareEngineer || project['軟體工程師'] || '').toString();
      if (!raw) return [];
      return raw.split(/[,，、;；\s]+/).map(function(s) { return s.trim(); }).filter(Boolean);
    },

    // 3. 解析主管填寫的付出佔比
    parseContributionRatios: function(project, engineers) {
      if (!engineers || engineers.length === 0) return {};
      var rawRatio = (project.contributionRatio || project['主管填寫佔比'] || '').toString();
      var ratioMap = {};

      if (rawRatio) {
        var parts = rawRatio.split(/[,，;；\n]+/);
        parts.forEach(function(part) {
          var m = part.match(/([^:：]+)[:：]\s*(\d+(?:\.\d+)?)/);
          if (m) {
            ratioMap[m[1].trim()] = parseFloat(m[2]);
          }
        });
      }

      var finalMap = {};
      if (engineers.length === 1) {
        finalMap[engineers[0]] = 100;
      } else {
        var totalDefined = 0;
        var undefinedEngs = [];
        engineers.forEach(function(eng) {
          if (ratioMap[eng] !== undefined) {
            finalMap[eng] = ratioMap[eng];
            totalDefined += ratioMap[eng];
          } else {
            undefinedEngs.push(eng);
          }
        });
        if (undefinedEngs.length > 0) {
          var remaining = Math.max(0, 100 - totalDefined);
          var avg = Math.round((remaining / undefinedEngs.length) * 10) / 10;
          undefinedEngs.forEach(function(eng) {
            finalMap[eng] = avg;
          });
        }
      }
      return finalMap;
    },

    // 4. 計算專案中各工程師實得積分
    calculateEngineerProjectShares: function(project) {
      var baseScore = Calculator.calculateProjectBaseScore(project);
      var engineers = Calculator.parseSoftwareEngineers(project);
      var ratioMap = Calculator.parseContributionRatios(project, engineers);

      return engineers.map(function(eng) {
        var percent = ratioMap[eng] !== undefined ? ratioMap[eng] : 100;
        var ratio = percent / 100.0;
        var earnedScore = Math.round(baseScore * ratio * 100) / 100;
        return {
          engineer: eng,
          baseScore: baseScore,
          ratioPercent: percent,
          earnedScore: earnedScore
        };
      });
    },

    // 5. 判斷專案是否落入指定時間區段 (雙軌判定：軟體完成時間 vs 收件/需求日期)
    isProjectInPeriod: function(project, period) {
      if (!period || period === 'ALL') return true;
      var dateStr = (project.softwareCompletionDate || project['軟體完成時間'] || '').toString().trim();
      if (!dateStr) {
        dateStr = (project.receiptDate || project['收件日期'] || project.requiredDate || project['需求日期'] || '').toString().trim();
      }
      if (!dateStr) return false;

      if (period.length === 7) { // '2026-03'
        return dateStr.substring(0, 7) === period;
      } else if (period.length === 4) { // '2026'
        return dateStr.substring(0, 4) === period;
      }
      return true;
    },

    // 6. 統計所有工程師在指定區段之總績效 (智慧建築、一般建築、修改、每月上傳、以及去年同期比較)
    aggregatePerformance: function(projects, uploads, options) {
      options = options || {};
      var currentPeriod = options.period || '2026';
      var targetEngineer = options.engineer;

      // 計算去年同期 Period 字串
      var lastYearPeriod = null;
      if (currentPeriod && currentPeriod !== 'ALL') {
        var year = parseInt(currentPeriod.substring(0, 4), 10);
        if (!isNaN(year)) {
          lastYearPeriod = (year - 1) + currentPeriod.substring(4);
        }
      }

      var statsMap = {};

      function initStats(name) {
        if (!statsMap[name]) {
          statsMap[name] = {
            name: name,
            totalScore: 0,
            smartScore: 0,
            smartCount: 0,
            generalScore: 0,
            generalCount: 0,
            modScore: 0,
            modCount: 0,
            uploadScore: 0,
            uploadCount: 0,
            totalProjects: 0,
            lastYearTotalScore: 0,
            lastYearProjects: 0,
            projectsList: []
          };
          // 向下相容既有屬性 getter/setter
          Object.defineProperty(statsMap[name], 'nonSmartScore', {
            get: function() { return this.generalScore; },
            set: function(v) { this.generalScore = v; }
          });
          Object.defineProperty(statsMap[name], 'nonSmartCount', {
            get: function() { return this.generalCount; },
            set: function(v) { this.generalCount = v; }
          });
          Object.defineProperty(statsMap[name], 'maintenanceScore', {
            get: function() { return this.modScore; },
            set: function(v) { this.modScore = v; }
          });
          Object.defineProperty(statsMap[name], 'maintenanceCount', {
            get: function() { return this.modCount; },
            set: function(v) { this.modCount = v; }
          });
        }
      }

      // 處理當期專案
      projects.forEach(function(proj) {
        var inCurrent = Calculator.isProjectInPeriod(proj, currentPeriod);
        var inLastYear = lastYearPeriod ? Calculator.isProjectInPeriod(proj, lastYearPeriod) : false;

        var shares = Calculator.calculateEngineerProjectShares(proj);
        var baseScore = Calculator.calculateProjectBaseScore(proj);
        var category = Calculator.getProjectCategory(proj);

        shares.forEach(function(sh) {
          var eng = sh.engineer;
          if (targetEngineer && targetEngineer !== eng) return;

          initStats(eng);

          if (inCurrent) {
            var isCompleted = !!((proj.softwareCompletionDate || proj['軟體完成時間'] || '').toString().trim() || proj.status === '已結案' || proj.status === '軟體完成');

            if (isCompleted) {
              statsMap[eng].totalScore += sh.earnedScore;
              statsMap[eng].totalProjects += 1;

              if (category === '智慧建築') {
                statsMap[eng].smartScore += sh.earnedScore;
                statsMap[eng].smartCount += 1;
              } else if (category === '一般建築') {
                statsMap[eng].generalScore += sh.earnedScore;
                statsMap[eng].generalCount += 1;
              } else if (category === '修改') {
                statsMap[eng].modScore += sh.earnedScore;
                statsMap[eng].modCount += 1;
              }
            }

            statsMap[eng].projectsList.push({
              project: proj,
              share: sh,
              baseScore: baseScore,
              isCompleted: isCompleted,
              category: category
            });
          }

          if (inLastYear) {
            var isLastYearCompleted = !!((proj.softwareCompletionDate || proj['軟體完成時間'] || '').toString().trim() || proj.status === '已結案' || proj.status === '軟體完成');
            if (isLastYearCompleted) {
              statsMap[eng].lastYearTotalScore += sh.earnedScore;
              statsMap[eng].lastYearProjects += 1;
            }
          }
        });
      });

      // 處理每月固定上傳 (0.2 分/月)
      if (Array.isArray(uploads)) {
        uploads.forEach(function(up) {
          var ym = (up.yearMonth || up['年月'] || '').toString();
          var eng = (up.engineer || up['軟體工程師'] || '').toString().trim();
          var auditStatus = (up.auditStatus || up['助理審核狀態'] || '').toString();
          var score = parseFloat(up.earnedScore || up['核可積分']) || (auditStatus === '審核通過' ? 0.2 : 0);

          if (targetEngineer && targetEngineer !== eng) return;

          initStats(eng);

          var inCurrent = false;
          if (!currentPeriod || currentPeriod === 'ALL') {
            inCurrent = true;
          } else if (currentPeriod.length === 7) {
            inCurrent = (ym === currentPeriod);
          } else if (currentPeriod.length === 4) {
            inCurrent = (ym.substring(0, 4) === currentPeriod);
          }

          if (inCurrent && auditStatus === '審核通過') {
            statsMap[eng].uploadScore += score;
            statsMap[eng].uploadCount += 1;
            statsMap[eng].totalScore += score;
          }

          if (lastYearPeriod) {
            var matchLast = false;
            if (lastYearPeriod.length === 7) {
              matchLast = (ym === lastYearPeriod);
            } else if (lastYearPeriod.length === 4) {
              matchLast = (ym.substring(0, 4) === lastYearPeriod);
            }
            if (matchLast && auditStatus === '審核通過') {
              statsMap[eng].lastYearTotalScore += score;
            }
          }
        });
      }

      // 四捨五入與計算 YoY 成長率
      var list = Object.keys(statsMap).map(function(k) {
        var item = statsMap[k];
        item.totalScore = Math.round(item.totalScore * 100) / 100;
        item.smartScore = Math.round(item.smartScore * 100) / 100;
        item.generalScore = Math.round(item.generalScore * 100) / 100;
        item.modScore = Math.round(item.modScore * 100) / 100;
        item.uploadScore = Math.round(item.uploadScore * 100) / 100;
        item.lastYearTotalScore = Math.round(item.lastYearTotalScore * 100) / 100;

        // 同比成長率
        var diff = item.totalScore - item.lastYearTotalScore;
        var growthRate = 0;
        if (item.lastYearTotalScore > 0) {
          growthRate = Math.round((diff / item.lastYearTotalScore) * 1000) / 10;
        } else if (item.totalScore > 0) {
          growthRate = 100.0;
        }
        item.yoyDiff = Math.round(diff * 100) / 100;
        item.yoyGrowthRate = growthRate;

        return item;
      });

      // 依總積分由高至低排序
      list.sort(function(a, b) {
        return b.totalScore - a.totalScore;
      });

      return {
        period: currentPeriod,
        lastYearPeriod: lastYearPeriod,
        engineers: list
      };
    }
  };

  window.Calculator = Calculator;
})(typeof window !== 'undefined' ? window : global);
