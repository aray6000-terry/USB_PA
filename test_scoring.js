// 考核計分單元測試 (相容 Node.js 全版本)
var assert = require('assert');

function calculateProjectBaseScore(project) {
  // 1. 維護專案判斷 (優先檢視整合項目或專案類型是否為維護)
  var isMaintenance = false;
  if (project.projectType === '維護專案' || (project.integrationItem && project.integrationItem.indexOf('維護') !== -1)) {
    isMaintenance = true;
  }
  if (isMaintenance) {
    return 1.0; // 1 案 1 分
  }

  // 2. 智慧建築
  var isSmart = project.isSmartBuilding === true || project.isSmartBuilding === '是' || project.isSmartBuilding === 'true';
  if (isSmart) {
    var quote = parseFloat(project.quote) || 0;
    var grade = (project.smartGrade || '').trim();
    var multiplier = 1.0;
    if (grade === '合格') multiplier = 1.0;
    else if (grade === '銅' || grade === '銅級') multiplier = 1.05;
    else if (grade === '銀' || grade === '銀級') multiplier = 1.10;
    else if (grade === '黃金' || grade === '黃金級') multiplier = 1.15;
    else if (grade === '鑽石' || grade === '鑽石級') multiplier = 1.20;
    
    // (報價金額 / 10000) * 等級係數
    var score = (quote / 10000) * multiplier;
    return Math.round(score * 100) / 100;
  }

  // 3. 非智慧建築 (依戶數級距: <=20: 4分, 21~50: 5分, 51~100: 6分, 101~200: 8分, 201以上: 10分)
  var units = parseInt(project.units, 10) || 0;
  if (units <= 20) return 4.0;
  if (units <= 50) return 5.0;
  if (units <= 100) return 6.0;
  if (units <= 200) return 8.0;
  return 10.0;
}

function calculateEngineerScoresForProject(project) {
  var baseScore = calculateProjectBaseScore(project);
  var engineersStr = project.softwareEngineer || '';
  var engineers = engineersStr.split(/[,，、;；\s]+/).filter(Boolean);
  
  if (engineers.length === 0) return [];
  
  // 取得主管填寫的佔比設定 (例如: "張小明:60%, 李大華:40%")
  // 或以物件格式提供: { "張小明": 60, "李大華": 40 }
  var ratioMap = {};
  if (project.ratios && typeof project.ratios === 'object') {
    ratioMap = project.ratios;
  } else if (typeof project.contributionRatio === 'string') {
    var parts = project.contributionRatio.split(/[,，;；]+/);
    parts.forEach(function(part) {
      var match = part.match(/([^:：]+)[:：]\s*(\d+(?:\.\d+)?)/);
      if (match) {
        ratioMap[match[1].trim()] = parseFloat(match[2]);
      }
    });
  }

  var results = [];
  var totalRatio = 0;
  engineers.forEach(function(eng) {
    if (ratioMap[eng] !== undefined) {
      totalRatio += ratioMap[eng];
    }
  });

  engineers.forEach(function(eng) {
    var ratio = 1.0;
    if (engineers.length > 1) {
      if (ratioMap[eng] !== undefined) {
        ratio = ratioMap[eng] / 100.0;
      } else {
        // 未填寫主管佔比時，平均分配
        ratio = 1.0 / engineers.length;
      }
    }
    var finalScore = Math.round(baseScore * ratio * 100) / 100;
    results.push({
      engineer: eng,
      baseScore: baseScore,
      ratio: ratio,
      ratioPercent: Math.round(ratio * 100) + '%',
      finalScore: finalScore
    });
  });

  return results;
}

// 執行測試
console.log('=== 開始測試績效評分演算法 ===');

// 測試 1: 智慧建築 (報價 500,000, 鑽石級 * 1.2 => (500000/10000)*1.2 = 60)
var p1 = {
  isSmartBuilding: '是',
  smartGrade: '鑽石',
  quote: 500000,
  softwareEngineer: '林軟體'
};
var s1 = calculateProjectBaseScore(p1);
console.log('測試 1 智慧建築 (鑽石):', s1, '分 (預期 60)');
assert.strictEqual(s1, 60);

// 測試 2: 智慧建築 (黃金級 1.15, 報價 120,000 => 12 * 1.15 = 13.8)
var p2 = {
  isSmartBuilding: '是',
  smartGrade: '黃金',
  quote: 120000,
  softwareEngineer: '林軟體'
};
var s2 = calculateProjectBaseScore(p2);
console.log('測試 2 智慧建築 (黃金):', s2, '分 (預期 13.8)');
assert.strictEqual(s2, 13.8);

// 測試 3: 非智慧建築戶數區間
var unitsTests = [
  { units: 15, expected: 4.0 },
  { units: 20, expected: 4.0 },
  { units: 21, expected: 5.0 },
  { units: 50, expected: 5.0 },
  { units: 51, expected: 6.0 },
  { units: 100, expected: 6.0 },
  { units: 101, expected: 8.0 },
  { units: 200, expected: 8.0 },
  { units: 201, expected: 10.0 },
  { units: 500, expected: 10.0 }
];
unitsTests.forEach(function(t) {
  var score = calculateProjectBaseScore({ isSmartBuilding: '否', units: t.units });
  assert.strictEqual(score, t.expected, '戶數 ' + t.units + ' 應為 ' + t.expected);
});
console.log('測試 3 非智慧建築 10 組戶數邊界測試全部通過！');

// 測試 4: 維護專案
var pMaint = {
  projectType: '維護專案',
  softwareEngineer: '林軟體'
};
assert.strictEqual(calculateProjectBaseScore(pMaint), 1.0);
console.log('測試 4 維護專案測試通過 (固定 1 分)');

// 測試 5: 多位工程師付出佔比 (主管填寫 60% / 40%)
var pMulti = {
  isSmartBuilding: '是',
  smartGrade: '合格',
  quote: 100000, // 基準分 10 分
  softwareEngineer: '陳工程師, 王工程師',
  contributionRatio: '陳工程師:60%, 王工程師:40%'
};
var multiResults = calculateEngineerScoresForProject(pMulti);
console.log('測試 5 多位工程師佔比分配:');
console.log('  陳工程師:', multiResults[0].finalScore, '分 (預期 6)');
console.log('  王工程師:', multiResults[1].finalScore, '分 (預期 4)');
assert.strictEqual(multiResults[0].finalScore, 6.0);
assert.strictEqual(multiResults[1].finalScore, 4.0);

console.log('=== 所有評分規則單元測試驗證成功！ ===');
