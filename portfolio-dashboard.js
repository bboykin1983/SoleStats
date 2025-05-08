/**
 * SoleStats Portfolio Dashboard Component
 * Adds stock-style financial tracking to the sneaker inventory
 */

class PortfolioDashboard {
  constructor(inventoryData) {
    this.inventoryData = inventoryData;
    this.summaryMetrics = {};
    this.performanceData = {};
    this.calculateMetrics();
  }

  /**
   * Calculate portfolio metrics based on inventory data
   */
  calculateMetrics() {
    const totalItems = this.inventoryData.length;
    let totalInvested = 0;
    let totalMarketValue = 0;
    let totalProfit = 0;
    let bestPerformer = null;
    let worstPerformer = null;
    let bestPerformerROI = -Infinity;
    let worstPerformerROI = Infinity;
    let inStockCount = 0;
    let soldCount = 0;
    
    // Group by brand for brand breakdown
    const brandBreakdown = {};
    
    this.inventoryData.forEach(item => {
      const purchasePrice = parseFloat(item.purchase_price) || 0;
      const marketValue = parseFloat(item.market_value) || purchasePrice;
      const profit = marketValue - purchasePrice;
      const roi = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;
      
      // Update totals
      totalInvested += purchasePrice;
      totalMarketValue += marketValue;
      totalProfit += profit;
      
      // Update item counts
      if (item.status === 'In Stock') {
        inStockCount++;
      } else if (item.status === 'Sold') {
        soldCount++;
      }
      
      // Track best and worst performers
      if (roi > bestPerformerROI) {
        bestPerformerROI = roi;
        bestPerformer = item;
      }
      
      if (roi < worstPerformerROI && item.status === 'In Stock') {
        worstPerformerROI = roi;
        worstPerformer = item;
      }
      
      // Update brand breakdown
      const brand = item.brand || 'Unknown';
      if (!brandBreakdown[brand]) {
        brandBreakdown[brand] = {
          count: 0,
          totalValue: 0
        };
      }
      brandBreakdown[brand].count++;
      brandBreakdown[brand].totalValue += marketValue;
    });
    
    // Save metrics to instance
    this.summaryMetrics = {
      totalItems,
      inStockCount,
      soldCount,
      totalInvested,
      totalMarketValue,
      totalProfit,
      overallROI: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
      bestPerformer,
      bestPerformerROI,
      worstPerformer,
      worstPerformerROI,
      brandBreakdown
    };
    
    // Prepare performance data for charts
    this.prepareChartData();
  }
  
  /**
   * Prepare data for performance charts
   */
  prepareChartData() {
    // Brand distribution data
    const brandLabels = [];
    const brandData = [];
    const brandColors = [
      '#00C35A', '#212529', '#FF5A5F', '#4A90E2', '#9B59B6', 
      '#3498DB', '#F1C40F', '#E67E22', '#E74C3C', '#1ABC9C'
    ];
    
    let idx = 0;
    for (const brand in this.summaryMetrics.brandBreakdown) {
      brandLabels.push(brand);
      brandData.push(this.summaryMetrics.brandBreakdown[brand].count);
      idx++;
    }
    
    // Monthly performance data (mocked for demo)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const monthlyValue = [
      this.summaryMetrics.totalMarketValue * 0.8,
      this.summaryMetrics.totalMarketValue * 0.85,
      this.summaryMetrics.totalMarketValue * 0.9,
      this.summaryMetrics.totalMarketValue * 0.95,
      this.summaryMetrics.totalMarketValue
    ];
    
    this.performanceData = {
      brands: {
        labels: brandLabels,
        data: brandData,
        colors: brandColors.slice(0, brandLabels.length)
      },
      monthlyPerformance: {
        labels: months,
        data: monthlyValue
      }
    };
  }
  
  /**
   * Render the portfolio dashboard
   */
  renderDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Format currency values
    const formatCurrency = (value) => {
      return '$' + value.toFixed(2);
    };
    
    // Format percentage values
    const formatPercent = (value) => {
      return value.toFixed(2) + '%';
    };
    
    // Determine profit/loss class
    const getProfitLossClass = (value) => {
      return value >= 0 ? 'text-success' : 'text-danger';
    };
    
    // Profit/loss indicators
    const getProfitLossIndicator = (value) => {
      return value >= 0 ? 
        `<i class="fas fa-arrow-up me-1"></i>${formatPercent(value)}` : 
        `<i class="fas fa-arrow-down me-1"></i>${formatPercent(Math.abs(value))}`;
    };
    
    // Create dashboard HTML
    const dashboardHTML = `
      <div class="row mb-4">
        <div class="col-md-12">
          <h3>Portfolio Overview</h3>
        </div>
      </div>
      
      <!-- Summary Cards -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Invested</h6>
              <h3 class="card-title">${formatCurrency(this.summaryMetrics.totalInvested)}</h3>
              <p class="card-text">${this.summaryMetrics.totalItems} items</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Current Value</h6>
              <h3 class="card-title">${formatCurrency(this.summaryMetrics.totalMarketValue)}</h3>
              <p class="card-text ${getProfitLossClass(this.summaryMetrics.overallROI)}">
                ${getProfitLossIndicator(this.summaryMetrics.overallROI)}
              </p>
            </div>
          </div>
        </div>
        
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Profit/Loss</h6>
              <h3 class="card-title ${getProfitLossClass(this.summaryMetrics.totalProfit)}">
                ${formatCurrency(this.summaryMetrics.totalProfit)}
              </h3>
              <p class="card-text">Overall ROI: ${formatPercent(this.summaryMetrics.overallROI)}</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Inventory Status</h6>
              <h3 class="card-title">${this.summaryMetrics.inStockCount} / ${this.summaryMetrics.totalItems}</h3>
              <p class="card-text">In Stock / Total Items</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Charts Row -->
      <div class="row mb-4">
        <div class="col-md-8">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Portfolio Value Over Time</h5>
              <canvas id="portfolioChart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Brand Distribution</h5>
              <canvas id="brandChart" width="200" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Performance Cards -->
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Best Performer</h5>
              ${this.renderPerformerCard(this.summaryMetrics.bestPerformer, this.summaryMetrics.bestPerformerROI, true)}
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Worst Performer</h5>
              ${this.renderPerformerCard(this.summaryMetrics.worstPerformer, this.summaryMetrics.worstPerformerROI, false)}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Insert dashboard into container
    container.innerHTML = dashboardHTML;
    
    // Initialize charts
    this.initializeCharts();
  }
  
  /**
   * Helper method to render best/worst performer cards
   */
  renderPerformerCard(item, roi, isBest) {
    if (!item) return '<p>No data available</p>';
    
    const roiClass = isBest ? 'text-success' : 'text-danger';
    const roiIcon = isBest ? 'fa-arrow-up' : 'fa-arrow-down';
    
    return `
      <div class="d-flex align-items-center">
        <div class="flex-shrink-0">
          <div class="sneaker-img-container" style="width: 80px; height: 60px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
            <i class="fas fa-shoe-prints fa-2x text-muted"></i>
          </div>
        </div>
        <div class="flex-grow-1 ms-3">
          <h6 class="mb-0">${item.brand} ${item.name}</h6>
          <div class="text-muted small">Size ${item.size}</div>
          <div class="${roiClass} mt-2">
            <i class="fas ${roiIcon} me-1"></i>${roi.toFixed(2)}% ROI
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Initialize Chart.js charts
   */
  initializeCharts() {
    // Portfolio value chart
    const portfolioCtx = document.getElementById('portfolioChart');
    if (portfolioCtx) {
      new Chart(portfolioCtx, {
        type: 'line',
        data: {
          labels: this.performanceData.monthlyPerformance.labels,
          datasets: [{
            label: 'Portfolio Value',
            data: this.performanceData.monthlyPerformance.data,
            backgroundColor: 'rgba(0, 195, 90, 0.1)',
            borderColor: '#00C35A',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              grid: {
                drawBorder: false
              },
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString();
                }
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return '$' + context.parsed.y.toLocaleString();
                }
              }
            }
          }
        }
      });
    }
    
    // Brand distribution chart
    const brandCtx = document.getElementById('brandChart');
    if (brandCtx) {
      new Chart(brandCtx, {
        type: 'doughnut',
        data: {
          labels: this.performanceData.brands.labels,
          datasets: [{
            data: this.performanceData.brands.data,
            backgroundColor: this.performanceData.brands.colors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                padding: 10
              }
            }
          }
        }
      });
    }
  }
}

// Export for use in other modules
window.PortfolioDashboard = PortfolioDashboard;
