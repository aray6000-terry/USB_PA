// 考核計分單元測試 (相容 Node.js 全版本)
var assert = require('assert');

require('./js/calculator.js');
var calculateProjectBaseScore = global.Calculator.calculateProjectBaseScore;
var calculateEngineerScoresForProject = function(project) {
  return global.Calculator.calculateEngineerProjectShares(project).map(function(s) {
    return {
      engineer: s.engineer,
      baseScore: s.baseScore,
      ratioPercent: s.ratioPercent + '%',
      finalScore: s.earnedScore
    };
  });
};

// 執行測試
console.log('=== 開始測試績效評分演算法 (三大類別 + 智慧建築手動倍率) ===');

// 測試 1: 智慧建築 (預設等級鑽石級 * 1.2 => (500000/10000)*1.2 = 60)
var p1 = {
  category: '智慧建築',
  smartGrade: '鑽石',
  quote: 500000,
  softwareEngineer: '林軟體'
};
var s1 = calculateProjectBaseScore(p1);
console.log('測試 1 智慧建築 (鑽石預設係數):', s1, '分 (預期 60)');
assert.strictEqual(s1, 60);

// 測試 2: 智慧建築 - 手動倍率調整機制 (手動設定 1.35 => (500000/10000)*1.35 = 67.5)
var p2 = {
  category: '智慧建築',
  smartGrade: '黃金',
  smartMultiplier: 1.35, // 手動調整倍率
  quote: 500000,
  softwareEngineer: '林軟體'
};
var s2 = calculateProjectBaseScore(p2);
console.log('測試 2 智慧建築 (手動自訂倍率 1.35):', s2, '分 (預期 67.5)');
assert.strictEqual(s2, 67.5);

// 測試 3: 一般建築戶數區間
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
  var score = calculateProjectBaseScore({ category: '一般建築', units: t.units });
  assert.strictEqual(score, t.expected, '戶數 ' + t.units + ' 應為 ' + t.expected);
});
console.log('測試 3 一般建築 10 組戶數邊界測試全部通過！');

// 測試 4: 修改類別 (預設 1 分)
var pModDefault = {
  category: '修改',
  softwareEngineer: '林軟體'
};
assert.strictEqual(calculateProjectBaseScore(pModDefault), 1.0);
console.log('測試 4 修改專案測試通過 (預設 1 分)');

// 測試 5: 修改類別 (手動自訂點數 2.5 分)
var pModCustom = {
  category: '修改',
  modScore: 2.5,
  softwareEngineer: '張工程'
};
assert.strictEqual(calculateProjectBaseScore(pModCustom), 2.5);
console.log('測試 5 修改專案手動自訂點數測試通過 (2.5 分)');

// 測試 6: 向下相容歷史資料 (isSmartBuilding 與 維護專案)
var pLegacySmart = { isSmartBuilding: '是', smartGrade: '銀', quote: 200000 };
assert.strictEqual(calculateProjectBaseScore(pLegacySmart), 22.0); // 20 * 1.1 = 22
var pLegacyNonSmart = { isSmartBuilding: '否', units: 80 };
assert.strictEqual(calculateProjectBaseScore(pLegacyNonSmart), 6.0);
var pLegacyMaint = { projectType: '維護專案' };
assert.strictEqual(calculateProjectBaseScore(pLegacyMaint), 1.0);
console.log('測試 6 向下相容歷史資料全部通過！');

// 測試 7: 多位工程師佔比分配
var pMulti = {
  category: '智慧建築',
  smartMultiplier: 1.2,
  quote: 100000, // 基準分 12 分
  softwareEngineer: '陳工程師, 王工程師',
  contributionRatio: '陳工程師:60%, 王工程師:40%'
};
var multiResults = calculateEngineerScoresForProject(pMulti);
console.log('測試 7 多位工程師佔比分配:');
multiResults.forEach(function(r) {
  console.log('  ' + r.engineer + ': ' + r.finalScore + ' 分 (預期 ' + (r.engineer === '陳工程師' ? '7.2' : '4.8') + ')');
});
assert.strictEqual(multiResults[0].finalScore, 7.2);
assert.strictEqual(multiResults[1].finalScore, 4.8);

console.log('=== 所有三大類別與手動倍率評分規則單元測試驗證成功！ ===');
