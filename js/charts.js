/**
 * 優德美科技 - 圖表視覺化模組 (Chart.js)
 * 包含：各工程師(智慧建築、非智慧、維護、每月上傳)堆疊分佈圖、去年同期比較圖 (YoY)
 */

(function(window) {
  'use strict';

  var ChartsModule = {
    chartEngineerCategories: null,
    chartYoY: null,
    chartTypeDistribution: null,

    // 初始化或更新所有圖表
    renderCharts: function(perfData) {
      if (!window.Chart) {
        console.warn('Chart.js 尚未載入');
        return;
      }

      ChartsModule.renderEngineerCategoriesChart(perfData);
      ChartsModule.renderYoYChart(perfData);
      ChartsModule.renderTypeDistributionChart(perfData);
      ChartsModule.renderYoYTable(perfData);
    },

    // 1. 各工程師 (智慧建築、非智慧、維護、每月上傳) 堆疊長條圖
    renderEngineerCategoriesChart: function(perfData) {
      var ctx = document.getElementById('chart-engineer-categories');
      if (!ctx) return;

      var engineers = perfData.engineers || [];
      var labels = engineers.map(function(e) { return e.name; });

      var smartData = engineers.map(function(e) { return e.smartScore; });
      var nonSmartData = engineers.map(function(e) { return e.nonSmartScore; });
      var maintenanceData = engineers.map(function(e) { return e.maintenanceScore; });
      var uploadData = engineers.map(function(e) { return e.uploadScore; });

      if (ChartsModule.chartEngineerCategories) {
        ChartsModule.chartEngineerCategories.destroy();
      }

      ChartsModule.chartEngineerCategories = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: '智慧建築積分',
              data: smartData,
              backgroundColor: 'rgba(99, 102, 241, 0.85)', // Indigo
              borderColor: 'rgba(99, 102, 241, 1)',
              borderWidth: 1,
              borderRadius: 4
            },
            {
              label: '非智慧建築積分',
              data: nonSmartData,
              backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 1,
              borderRadius: 4
            },
            {
              label: '維護專案 (1分/案)',
              data: maintenanceData,
              backgroundColor: 'rgba(245, 158, 11, 0.85)', // Amber
              borderColor: 'rgba(245, 158, 11, 1)',
              borderWidth: 1,
              borderRadius: 4
            },
            {
              label: '每月固定上傳 (0.2分/月)',
              data: uploadData,
              backgroundColor: 'rgba(236, 72, 153, 0.85)', // Pink
              borderColor: 'rgba(236, 72, 153, 1)',
              borderWidth: 1,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: document.body.classList.contains('light-theme') ? '#334155' : '#cbd5e1',
                font: { family: 'Outfit, sans-serif', size: 12, weight: '500' }
              }
            },
            tooltip: {
              callbacks: {
                footer: function(tooltipItems) {
                  var sum = 0;
                  tooltipItems.forEach(function(item) {
                    sum += item.parsed.y;
                  });
                  return '當期個人總積分：' + Math.round(sum * 100) / 100 + ' 分';
                }
              }
            }
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { color: document.body.classList.contains('light-theme') ? '#64748b' : '#94a3b8' }
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: document.body.classList.contains('light-theme') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' },
              ticks: { color: document.body.classList.contains('light-theme') ? '#64748b' : '#94a3b8' }
            }
          }
        }
      });
    },

    // 2. 去年同期比較長條圖 (YoY Comparison)
    renderYoYChart: function(perfData) {
      var ctx = document.getElementById('chart-yoy');
      if (!ctx) return;

      var engineers = perfData.engineers || [];
      var labels = engineers.map(function(e) { return e.name; });

      var currentData = engineers.map(function(e) { return e.totalScore; });
      var lastYearData = engineers.map(function(e) { return e.lastYearTotalScore; });

      var currentLabel = '本期 (' + (perfData.period === 'ALL' ? '全部' : perfData.period) + ')';
      var lastYearLabel = '去年同期 (' + (perfData.lastYearPeriod || '前年度') + ')';

      if (ChartsModule.chartYoY) {
        ChartsModule.chartYoY.destroy();
      }

      ChartsModule.chartYoY = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: currentLabel,
              data: currentData,
              backgroundColor: 'rgba(59, 130, 246, 0.85)', // Blue
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1,
              borderRadius: 5
            },
            {
              label: lastYearLabel,
              data: lastYearData,
              backgroundColor: 'rgba(148, 163, 184, 0.5)', // Slate
              borderColor: 'rgba(148, 163, 184, 0.8)',
              borderWidth: 1,
              borderRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: document.body.classList.contains('light-theme') ? '#334155' : '#cbd5e1',
                font: { family: 'Outfit, sans-serif', size: 12 }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: document.body.classList.contains('light-theme') ? '#64748b' : '#94a3b8' }
            },
            y: {
              beginAtZero: true,
              grid: { color: document.body.classList.contains('light-theme') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' },
              ticks: { color: document.body.classList.contains('light-theme') ? '#64748b' : '#94a3b8' }
            }
          }
        }
      });
    },

    // 3. 專案類型分佈環狀圖
    renderTypeDistributionChart: function(perfData) {
      var ctx = document.getElementById('chart-distribution');
      if (!ctx) return;

      var engineers = perfData.engineers || [];
      var totalSmart = 0, totalNonSmart = 0, totalMaint = 0, totalUpload = 0;
      engineers.forEach(function(e) {
        totalSmart += e.smartScore;
        totalNonSmart += e.nonSmartScore;
        totalMaint += e.maintenanceScore;
        totalUpload += e.uploadScore;
      });

      if (ChartsModule.chartTypeDistribution) {
        ChartsModule.chartTypeDistribution.destroy();
      }

      ChartsModule.chartTypeDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['智慧建築', '非智慧建築', '維護專案', '每月固定上傳'],
          datasets: [{
            data: [
              Math.round(totalSmart * 10) / 10,
              Math.round(totalNonSmart * 10) / 10,
              Math.round(totalMaint * 10) / 10,
              Math.round(totalUpload * 10) / 10
            ],
            backgroundColor: [
              'rgba(99, 102, 241, 0.85)',
              'rgba(16, 185, 129, 0.85)',
              'rgba(245, 158, 11, 0.85)',
              'rgba(236, 72, 153, 0.85)'
            ],
            borderColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: document.body.classList.contains('light-theme') ? '#334155' : '#cbd5e1',
                padding: 12
              }
            }
          }
        }
      });
    },

    // 4. 渲染去年同期比較詳細表格
    renderYoYTable: function(perfData) {
      var container = document.getElementById('yoy-table-body');
      if (!container) return;

      var engineers = perfData.engineers || [];
      if (engineers.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">查無工程師資料</td></tr>';
        return;
      }

      var html = '';
      engineers.forEach(function(e) {
        var growthClass = e.yoyDiff >= 0 ? 'text-emerald' : 'text-rose';
        var growthSign = e.yoyDiff > 0 ? '+' : '';
        var growthBadge = e.yoyDiff >= 0 ? 'badge-success' : 'badge-danger';

        html += '<tr>' +
          '<td class="font-medium">' +
            '<div class="d-flex align-items-center gap-2">' +
              '<span class="avatar-sm">💻</span>' +
              '<span>' + e.name + '</span>' +
            '</div>' +
          '</td>' +
          '<td class="font-bold text-primary">' + e.totalScore.toFixed(1) + ' 分</td>' +
          '<td class="text-muted">' + e.lastYearTotalScore.toFixed(1) + ' 分</td>' +
          '<td class="' + growthClass + ' font-semibold">' + growthSign + e.yoyDiff.toFixed(1) + '</td>' +
          '<td><span class="badge ' + growthBadge + '">' + growthSign + e.yoyGrowthRate + '%</span></td>' +
          '<td>' + e.totalProjects + ' 案 (去年 ' + e.lastYearProjects + ' 案)</td>' +
          '<td>' +
            '<div class="mini-breakdown text-xs text-muted">' +
              '智: ' + e.smartScore.toFixed(1) + ' | 非: ' + e.nonSmartScore.toFixed(1) + ' | 維: ' + e.maintenanceScore.toFixed(1) + ' | 傳: ' + e.uploadScore.toFixed(1) +
            '</div>' +
          '</td>' +
        '</tr>';
      });

      container.innerHTML = html;
    }
  };

  window.ChartsModule = ChartsModule;
})(window);
