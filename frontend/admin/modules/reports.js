// admin/modules/reports.js
// Reports & Analytics Module

let reportsData = {};
let currentFilters = {
    period: 'last7days',
    property: 'all',
    reportType: 'overview',
    dateFrom: null,
    dateTo: null
};

let revenueChart = null;
let occupancyChart = null;
let sourcesChart = null;
let roomsChart = null;

// Chart colors
const CHART_COLORS = {
    limuru: '#22440f',
    kanamai: '#f3a435',
    kisumu: '#17a2b8',
    revenue: '#28a745',
    occupancy: '#007bff',
    bookings: '#6c757d',
    website: '#22440f',
    phone: '#f3a435',
    email: '#17a2b8',
    walkin: '#6c757d',
    standard: '#22440f',
    deluxe: '#f3a435',
    suite: '#17a2b8',
    executive: '#6c757d'
};

// Initialize reports module
function initReportsModule() {
    console.log('Initializing Reports module...');

    // Initialize common utilities
    if (!window.CommonUtils || !window.CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        CommonUtils.showNotification('Reports module failed to initialize', 'error');
        return;
    }

    // Setup UI based on user permissions
    setupPermissions();

    // Setup event listeners
    setupEventListeners();

    // Set default dates
    setDefaultDates();

    // Load reports data
    loadReportsData();
}

// Setup permissions
function setupPermissions() {
    const { currentUser } = CommonUtils;

    // Hide property filter if user can only see their property
    if (!currentUser.permissions.properties.includes('all')) {
        const propertyFilter = document.getElementById('reportProperty');
        if (propertyFilter) {
            propertyFilter.value = currentUser.property;
            propertyFilter.disabled = true;
            currentFilters.property = currentUser.property;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Period selector
    const periodSelect = document.getElementById('reportPeriod');
    if (periodSelect) {
        periodSelect.addEventListener('change', function () {
            const value = this.value;
            const customRange = document.getElementById('customDateRange');

            if (value === 'custom') {
                customRange.style.display = 'block';
            } else {
                customRange.style.display = 'none';
                currentFilters.period = value;
                setDefaultDates();
                loadReportsData();
            }
        });
    }

    // Property filter
    const propertySelect = document.getElementById('reportProperty');
    if (propertySelect) {
        propertySelect.addEventListener('change', function () {
            currentFilters.property = this.value;
        });
    }

    // Report type
    const reportTypeSelect = document.getElementById('reportType');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', function () {
            currentFilters.reportType = this.value;
        });
    }

    // Custom date range
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom && dateTo) {
        dateFrom.addEventListener('change', function () {
            currentFilters.dateFrom = this.value;
            currentFilters.period = 'custom';
        });

        dateTo.addEventListener('change', function () {
            currentFilters.dateTo = this.value;
            currentFilters.period = 'custom';
        });
    }

    // Apply filters button
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', function () {
            if (currentFilters.period === 'custom' && (!currentFilters.dateFrom || !currentFilters.dateTo)) {
                CommonUtils.showNotification('Please select both start and end dates for custom range', 'warning');
                return;
            }
            loadReportsData();
        });
    }

    // Clear filters button
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            clearFilters();
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshReportsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadReportsData();
            CommonUtils.showNotification('Reports refreshed', 'info');
        });
    }

    // Export all button
    const exportAllBtn = document.getElementById('exportAllBtn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', function () {
            exportAllReports();
        });
    }

    // Chart period selectors
    const chartSelectors = ['revenueChartPeriod', 'occupancyChartPeriod', 'sourcesChartPeriod', 'roomsChartPeriod'];
    chartSelectors.forEach(id => {
        const selector = document.getElementById(id);
        if (selector) {
            selector.addEventListener('change', function () {
                if (reportsData.bookings) {
                    updateCharts();
                }
            });
        }
    });
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (currentFilters.period) {
        case 'today':
            currentFilters.dateFrom = today.toISOString().split('T')[0];
            currentFilters.dateTo = today.toISOString().split('T')[0];
            break;
        case 'yesterday':
            currentFilters.dateFrom = yesterday.toISOString().split('T')[0];
            currentFilters.dateTo = yesterday.toISOString().split('T')[0];
            break;
        case 'last7days':
            const last7 = new Date(today);
            last7.setDate(last7.getDate() - 7);
            currentFilters.dateFrom = last7.toISOString().split('T')[0];
            currentFilters.dateTo = today.toISOString().split('T')[0];
            break;
        case 'last30days':
            const last30 = new Date(today);
            last30.setDate(last30.getDate() - 30);
            currentFilters.dateFrom = last30.toISOString().split('T')[0];
            currentFilters.dateTo = today.toISOString().split('T')[0];
            break;
        case 'thisMonth':
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            currentFilters.dateFrom = firstDay.toISOString().split('T')[0];
            currentFilters.dateTo = today.toISOString().split('T')[0];
            break;
        case 'lastMonth':
            const lastMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthLast = new Date(today.getFullYear(), today.getMonth(), 0);
            currentFilters.dateFrom = lastMonthFirst.toISOString().split('T')[0];
            currentFilters.dateTo = lastMonthLast.toISOString().split('T')[0];
            break;
        case 'thisYear':
            const firstYearDay = new Date(today.getFullYear(), 0, 1);
            currentFilters.dateFrom = firstYearDay.toISOString().split('T')[0];
            currentFilters.dateTo = today.toISOString().split('T')[0];
            break;
    }

    // Update date inputs if they exist
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    if (dateFromInput) dateFromInput.value = currentFilters.dateFrom;
    if (dateToInput) dateToInput.value = currentFilters.dateTo;
}

// Clear filters
function clearFilters() {
    currentFilters = {
        period: 'last7days',
        property: 'all',
        reportType: 'overview',
        dateFrom: null,
        dateTo: null
    };

    // Reset UI
    document.getElementById('reportPeriod').value = 'last7days';
    document.getElementById('reportProperty').value = 'all';
    document.getElementById('reportType').value = 'overview';
    document.getElementById('customDateRange').style.display = 'none';

    setDefaultDates();
    loadReportsData();

    CommonUtils.showNotification('Filters cleared', 'info');
}

// Load reports data
async function loadReportsData() {
    try {
        CommonUtils.showLoading(true, 'Loading reports...');

        const { currentUser } = CommonUtils;

        // Determine property filter
        let propertyFilter = currentFilters.property;
        if (propertyFilter === 'all' && !currentUser.permissions.properties.includes('all')) {
            propertyFilter = currentUser.property;
        }

        // Build query string
        let url = `${CommonUtils.API_URL}/bookings?`;

        if (propertyFilter !== 'all') {
            url += `property=${propertyFilter}&`;
        }

        // Apply date range
        if (currentFilters.dateFrom && currentFilters.dateTo) {
            url += `startDate=${currentFilters.dateFrom}&endDate=${currentFilters.dateTo}`;
        } else {
            // Default to last 7 days
            const last7 = new Date();
            last7.setDate(last7.getDate() - 7);
            url += `startDate=${last7.toISOString().split('T')[0]}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load report data');

        const bookingsData = await response.json();

        // Process bookings data
        reportsData = processBookingsData(bookingsData);

        // Get previous period data for comparison
        const previousData = await getPreviousPeriodData();

        // Update UI
        updateKPISummary(reportsData, previousData);
        updateReportCards(reportsData, previousData);
        createCharts();
        updateTables();

        CommonUtils.showLoading(false);

    } catch (error) {
        console.error('Error loading reports data:', error);
        CommonUtils.showNotification('Failed to load reports data', 'error');
        CommonUtils.showLoading(false);
    }
}

// Process bookings data
function processBookingsData(bookingsData) {
    const data = {
        bookings: [],
        revenue: 0,
        totalBookings: 0,
        properties: {},
        sources: {},
        roomTypes: {},
        dailyData: {},
        statusCounts: {}
    };

    // Check if bookingsData is directly an array (API response) or snapshot
    const items = Array.isArray(bookingsData) ? bookingsData : [];

    items.forEach(doc => {
        const booking = {
            id: doc._id || doc.id,
            ...doc
        };

        data.bookings.push(booking);

        // Calculate revenue
        if (booking.totalAmount && booking.status !== 'cancelled') {
            data.revenue += booking.totalAmount;
        }

        // Count bookings
        data.totalBookings++;

        // Group by property
        const property = booking.property || 'unknown';
        if (!data.properties[property]) {
            data.properties[property] = {
                revenue: 0,
                bookings: 0,
                occupancy: 0
            };
        }
        data.properties[property].revenue += booking.totalAmount || 0;
        data.properties[property].bookings++;

        // Group by source
        const source = booking.source || 'website';
        if (!data.sources[source]) {
            data.sources[source] = {
                revenue: 0,
                bookings: 0
            };
        }
        data.sources[source].revenue += booking.totalAmount || 0;
        data.sources[source].bookings++;

        // Group by room type
        const roomType = booking.roomType || 'standard';
        if (!data.roomTypes[roomType]) {
            data.roomTypes[roomType] = {
                revenue: 0,
                bookings: 0
            };
        }
        data.roomTypes[roomType].revenue += booking.totalAmount || 0;
        data.roomTypes[roomType].bookings++;

        // Daily data
        const date = booking.createdAt ? new Date(booking.createdAt).toISOString().split('T')[0] : 'unknown';
        if (!data.dailyData[date]) {
            data.dailyData[date] = {
                revenue: 0,
                bookings: 0
            };
        }
        data.dailyData[date].revenue += booking.totalAmount || 0;
        data.dailyData[date].bookings++;

        // Status counts
        const status = booking.status || 'pending';
        if (!data.statusCounts[status]) {
            data.statusCounts[status] = 0;
        }
        data.statusCounts[status]++;
    });

    // Calculate averages
    data.avgOccupancy = calculateAverageOccupancy(data.bookings);
    data.avgDailyRate = data.totalBookings > 0 ? data.revenue / data.totalBookings : 0;
    data.avgBookingValue = data.totalBookings > 0 ? data.revenue / data.totalBookings : 0;

    return data;
}

// Calculate average occupancy
function calculateAverageOccupancy(bookings) {
    // This is a simplified calculation
    // In a real system, you'd calculate based on total rooms available
    const totalRooms = 30; // Assuming 30 rooms per property
    const occupiedRooms = bookings.filter(b =>
        ['confirmed', 'checked-in'].includes(b.status)
    ).reduce((sum, b) => sum + (b.rooms || 1), 0);

    return Math.min(100, (occupiedRooms / totalRooms) * 100);
}

// Get previous period data for comparison
async function getPreviousPeriodData() {
    try {
        // Calculate previous period dates
        const fromDate = new Date(currentFilters.dateFrom);
        const toDate = new Date(currentFilters.dateTo);
        const periodDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

        const prevFromDate = new Date(fromDate);
        prevFromDate.setDate(prevFromDate.getDate() - periodDays);
        const prevToDate = new Date(toDate);
        prevToDate.setDate(prevToDate.getDate() - periodDays);

        let url = `${CommonUtils.API_URL}/bookings?`;

        if (currentFilters.property !== 'all') {
            url += `property=${currentFilters.property}&`;
        }

        url += `startDate=${prevFromDate.toISOString().split('T')[0]}&endDate=${prevToDate.toISOString().split('T')[0]}`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const bookingsData = await response.json();

        // Process previous data
        return processBookingsData(bookingsData);

    } catch (error) {
        console.error('Error getting previous period data:', error);
        return null;
    }
}

// Update KPI summary
function updateKPISummary(data, previousData) {
    const kpiContainer = document.getElementById('kpiSummary');
    if (!kpiContainer) return;

    const kpis = [
        {
            label: 'Confirmed',
            value: data.statusCounts.confirmed || 0,
            previous: previousData?.statusCounts?.confirmed || 0,
            icon: 'fa-check-circle'
        },
        {
            label: 'Checked In',
            value: data.statusCounts['checked-in'] || 0,
            previous: previousData?.statusCounts['checked-in'] || 0,
            icon: 'fa-sign-in-alt'
        },
        {
            label: 'Pending',
            value: data.statusCounts.pending || 0,
            previous: previousData?.statusCounts?.pending || 0,
            icon: 'fa-clock'
        },
        {
            label: 'Cancelled',
            value: data.statusCounts.cancelled || 0,
            previous: previousData?.statusCounts?.cancelled || 0,
            icon: 'fa-times-circle'
        },
        {
            label: 'Avg Nights',
            value: '2.5', // This would be calculated from actual data
            previous: '2.3',
            icon: 'fa-moon'
        },
        {
            label: 'Guest Rating',
            value: '4.8', // This would come from feedback data
            previous: '4.7',
            icon: 'fa-star'
        }
    ];

    let html = '';
    kpis.forEach(kpi => {
        const change = kpi.previous ? ((kpi.value - kpi.previous) / kpi.previous * 100) : 0;
        const changeClass = change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'trend-neutral';
        const changeIcon = change > 0 ? 'fa-arrow-up' : change < 0 ? 'fa-arrow-down' : 'fa-minus';

        html += `
            <div class="kpi-card">
                <i class="fas ${kpi.icon}"></i>
                <div class="kpi-value">${kpi.value}</div>
                <div class="kpi-label">${kpi.label}</div>
                ${kpi.previous ? `
                    <div class="${changeClass}" style="font-size: 11px; margin-top: 5px;">
                        <i class="fas ${changeIcon}"></i>
                        ${Math.abs(change).toFixed(1)}%
                    </div>
                ` : ''}
            </div>
        `;
    });

    kpiContainer.innerHTML = html;
}

// Update report cards
function updateReportCards(data, previousData) {
    // Update total revenue
    const revenueElement = document.getElementById('totalRevenue');
    const revenueChangeElement = document.getElementById('revenueChange');

    if (revenueElement) {
        revenueElement.textContent = `KES ${data.revenue.toLocaleString()}`;
    }

    if (revenueChangeElement && previousData) {
        const change = previousData.revenue ? ((data.revenue - previousData.revenue) / previousData.revenue * 100) : 100;
        revenueChangeElement.innerHTML = formatChange(change, data.revenue - previousData.revenue);
        revenueChangeElement.className = `report-card-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    // Update average occupancy
    const occupancyElement = document.getElementById('avgOccupancy');
    const occupancyChangeElement = document.getElementById('occupancyChange');

    if (occupancyElement) {
        occupancyElement.textContent = `${data.avgOccupancy.toFixed(1)}%`;
    }

    if (occupancyChangeElement && previousData) {
        const change = previousData.avgOccupancy ? (data.avgOccupancy - previousData.avgOccupancy) : data.avgOccupancy;
        occupancyChangeElement.innerHTML = formatChange(change, change, '%');
        occupancyChangeElement.className = `report-card-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    // Update total bookings
    const bookingsElement = document.getElementById('totalBookings');
    const bookingsChangeElement = document.getElementById('bookingsChange');

    if (bookingsElement) {
        bookingsElement.textContent = data.totalBookings;
    }

    if (bookingsChangeElement && previousData) {
        const change = previousData.totalBookings ? ((data.totalBookings - previousData.totalBookings) / previousData.totalBookings * 100) : 100;
        bookingsChangeElement.innerHTML = formatChange(change, data.totalBookings - previousData.totalBookings);
        bookingsChangeElement.className = `report-card-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    // Update average daily rate
    const adrElement = document.getElementById('avgDailyRate');
    const adrChangeElement = document.getElementById('adrChange');

    if (adrElement) {
        adrElement.textContent = `KES ${data.avgDailyRate.toFixed(0)}`;
    }

    if (adrChangeElement && previousData) {
        const change = previousData.avgDailyRate ? ((data.avgDailyRate - previousData.avgDailyRate) / previousData.avgDailyRate * 100) : 100;
        adrChangeElement.innerHTML = formatChange(change, data.avgDailyRate - previousData.avgDailyRate, 'KES');
        adrChangeElement.className = `report-card-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
}

// Format change for display
function formatChange(percentage, absolute, prefix = '') {
    const trend = percentage >= 0 ? 'up' : 'down';
    const icon = percentage >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

    return `
        <i class="fas ${icon}"></i>
        ${Math.abs(percentage).toFixed(1)}% (${prefix}${Math.abs(absolute).toFixed(0)})
    `;
}

// Create charts
function createCharts() {
    createRevenueChart();
    createOccupancyChart();
    createSourcesChart();
    createRoomsChart();
}

// Create revenue chart
function createRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    // Destroy existing chart
    if (revenueChart) {
        revenueChart.destroy();
    }

    // Prepare data
    const period = document.getElementById('revenueChartPeriod')?.value || 'weekly';
    const { labels, datasets } = prepareRevenueData(period);

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: KES ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return 'KES ' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Update legend
    updateChartLegend('revenueLegend', datasets);
}

// Create occupancy chart
function createOccupancyChart() {
    const ctx = document.getElementById('occupancyChart');
    if (!ctx) return;

    // Destroy existing chart
    if (occupancyChart) {
        occupancyChart.destroy();
    }

    // Prepare data
    const period = document.getElementById('occupancyChartPeriod')?.value || 'weekly';
    const { labels, datasets } = prepareOccupancyData(period);

    occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function (value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });

    // Update legend
    updateChartLegend('occupancyLegend', datasets);
}

// Create sources chart
function createSourcesChart() {
    const ctx = document.getElementById('sourcesChart');
    if (!ctx) return;

    // Destroy existing chart
    if (sourcesChart) {
        sourcesChart.destroy();
    }

    // Prepare data
    const { labels, data, colors } = prepareSourcesData();

    sourcesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} bookings (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Update legend
    updatePieChartLegend('sourcesLegend', labels, colors);
}

// Create rooms chart
function createRoomsChart() {
    const ctx = document.getElementById('roomsChart');
    if (!ctx) return;

    // Destroy existing chart
    if (roomsChart) {
        roomsChart.destroy();
    }

    // Prepare data
    const { labels, data, colors } = prepareRoomsData();

    roomsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} bookings (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Update legend
    updatePieChartLegend('roomsLegend', labels, colors);
}

// Prepare revenue data
function prepareRevenueData(period) {
    const dailyData = reportsData.dailyData;
    const dates = Object.keys(dailyData).sort();

    let labels = [];
    let revenueData = [];

    if (period === 'daily') {
        // Last 7 days
        const last7Dates = dates.slice(-7);
        labels = last7Dates.map(date => formatDateLabel(date, 'daily'));
        revenueData = last7Dates.map(date => dailyData[date]?.revenue || 0);
    } else if (period === 'weekly') {
        // Group by week
        const weeklyData = {};
        dates.forEach(date => {
            const week = getWeekNumber(new Date(date));
            if (!weeklyData[week]) {
                weeklyData[week] = 0;
            }
            weeklyData[week] += dailyData[date]?.revenue || 0;
        });

        labels = Object.keys(weeklyData).map(week => `Week ${week}`);
        revenueData = Object.values(weeklyData);
    } else if (period === 'monthly') {
        // Group by month
        const monthlyData = {};
        dates.forEach(date => {
            const month = new Date(date).toLocaleString('default', { month: 'short' });
            if (!monthlyData[month]) {
                monthlyData[month] = 0;
            }
            monthlyData[month] += dailyData[date]?.revenue || 0;
        });

        labels = Object.keys(monthlyData);
        revenueData = Object.values(monthlyData);
    }

    return {
        labels: labels,
        datasets: [{
            label: 'Revenue',
            data: revenueData,
            borderColor: CHART_COLORS.revenue,
            backgroundColor: `${CHART_COLORS.revenue}20`,
            fill: true,
            tension: 0.4
        }]
    };
}

// Prepare occupancy data
function prepareOccupancyData(period) {
    // Simplified occupancy calculation
    // In a real system, you'd calculate actual occupancy rates

    const sampleDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
    });

    const labels = sampleDates.map(date => formatDateLabel(date, 'daily'));
    const occupancyData = sampleDates.map(() => Math.floor(Math.random() * 30) + 70); // Random between 70-100%

    return {
        labels: labels,
        datasets: [{
            label: 'Occupancy Rate',
            data: occupancyData,
            backgroundColor: CHART_COLORS.occupancy,
            borderColor: CHART_COLORS.occupancy,
            borderWidth: 1
        }]
    };
}

// Prepare sources data
function prepareSourcesData() {
    const sources = reportsData.sources;
    const labels = Object.keys(sources).map(key => key.charAt(0).toUpperCase() + key.slice(1));
    const data = Object.values(sources).map(s => s.bookings);
    const colors = Object.keys(sources).map(key => CHART_COLORS[key] || getRandomColor());

    return { labels, data, colors };
}

// Prepare rooms data
function prepareRoomsData() {
    const roomTypes = reportsData.roomTypes;
    const labels = Object.keys(roomTypes).map(key => key.charAt(0).toUpperCase() + key.slice(1));
    const data = Object.values(roomTypes).map(r => r.bookings);
    const colors = Object.keys(roomTypes).map(key => CHART_COLORS[key] || getRandomColor());

    return { labels, data, colors };
}

// Update charts
function updateCharts() {
    createCharts();
}

// Update chart legend
function updateChartLegend(legendId, datasets) {
    const legendContainer = document.getElementById(legendId);
    if (!legendContainer) return;

    let html = '';
    datasets.forEach(dataset => {
        html += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${dataset.borderColor || dataset.backgroundColor}"></div>
                <span>${dataset.label}</span>
            </div>
        `;
    });

    legendContainer.innerHTML = html;
}

// Update pie chart legend
function updatePieChartLegend(legendId, labels, colors) {
    const legendContainer = document.getElementById(legendId);
    if (!legendContainer) return;

    let html = '';
    labels.forEach((label, index) => {
        html += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${colors[index]}"></div>
                <span>${label}</span>
            </div>
        `;
    });

    legendContainer.innerHTML = html;
}

// Update tables
function updateTables() {
    updatePropertiesTable();
    updateSourcesTable();
}

// Update properties table
function updatePropertiesTable() {
    const tableBody = document.getElementById('propertiesTableBody');
    if (!tableBody) return;

    const properties = reportsData.properties;

    if (Object.keys(properties).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-chart-bar"></i>
                    <p>No property data available</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    Object.entries(properties).forEach(([property, data]) => {
        const propertyName = CommonUtils.PROPERTY_NAMES[property] || property;
        const adr = data.bookings > 0 ? data.revenue / data.bookings : 0;

        html += `
            <tr>
                <td>
                    <div class="property-info">
                        <i class="${CommonUtils.getPropertyIcon(property)}"></i>
                        <strong>${propertyName}</strong>
                    </div>
                </td>
                <td><strong>KES ${data.revenue.toLocaleString()}</strong></td>
                <td>${data.occupancy ? data.occupancy.toFixed(1) : '0'}%</td>
                <td>${data.bookings}</td>
                <td>KES ${adr.toFixed(0)}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

// Update sources table
function updateSourcesTable() {
    const tableBody = document.getElementById('sourcesTableBody');
    if (!tableBody) return;

    const sources = reportsData.sources;
    const totalBookings = reportsData.totalBookings;

    if (Object.keys(sources).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <p>No source data available</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    Object.entries(sources).forEach(([source, data]) => {
        const conversionRate = totalBookings > 0 ? (data.bookings / totalBookings * 100).toFixed(1) : 0;
        const sourceName = source.charAt(0).toUpperCase() + source.slice(1);

        html += `
            <tr>
                <td>
                    <div class="source-info">
                        <i class="fas fa-${getSourceIcon(source)}"></i>
                        <span>${sourceName}</span>
                    </div>
                </td>
                <td><strong>${data.bookings}</strong></td>
                <td>KES ${data.revenue.toLocaleString()}</td>
                <td>${conversionRate}%</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

// Get source icon
function getSourceIcon(source) {
    const icons = {
        'website': 'globe',
        'phone': 'phone',
        'email': 'envelope',
        'walkin': 'walking',
        'agent': 'user-tie',
        'partner': 'handshake'
    };
    return icons[source] || 'question-circle';
}

// Format date label
function formatDateLabel(dateString, format) {
    const date = new Date(dateString);

    if (format === 'daily') {
        return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }

    return dateString;
}

// Get week number
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Get random color
function getRandomColor() {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#8AC926', '#1982C4',
        '#6A4C93', '#F15BB5'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Export report
function exportReport(type) {
    switch (type) {
        case 'revenue':
            exportRevenueReport();
            break;
        case 'bookings':
            exportBookingsReport();
            break;
        case 'occupancy':
            exportOccupancyReport();
            break;
        case 'financial':
            exportFinancialReport();
            break;
        case 'guest':
            exportGuestReport();
            break;
        case 'custom':
            showCustomExport();
            break;
    }
}

// Export revenue report
function exportRevenueReport() {
    const data = [];

    // Add header
    data.push(['Date', 'Property', 'Booking ID', 'Guest Name', 'Amount (KES)', 'Status']);

    // Add data
    reportsData.bookings.forEach(booking => {
        if (booking.totalAmount) {
            const date = booking.createdAt ?
                new Date(booking.createdAt.toDate ? booking.createdAt.toDate() : booking.createdAt).toLocaleDateString() :
                'N/A';

            data.push([
                date,
                CommonUtils.PROPERTY_NAMES[booking.property] || booking.property,
                booking.bookingId || 'N/A',
                `${booking.firstName} ${booking.lastName}`,
                booking.totalAmount,
                booking.status || 'pending'
            ]);
        }
    });

    CommonUtils.exportToCSV(data, `revenue_report_${new Date().toISOString().slice(0, 10)}`);
}

// Export bookings report
function exportBookingsReport() {
    const data = [];

    // Add header
    data.push(['Booking ID', 'Guest Name', 'Email', 'Phone', 'Property', 'Room Type', 'Check-in', 'Check-out', 'Status', 'Amount (KES)']);

    // Add data
    reportsData.bookings.forEach(booking => {
        data.push([
            booking.bookingId || 'N/A',
            `${booking.firstName} ${booking.lastName}`,
            booking.email || 'N/A',
            booking.phone || 'N/A',
            CommonUtils.PROPERTY_NAMES[booking.property] || booking.property,
            booking.roomType || 'N/A',
            booking.checkIn || 'N/A',
            booking.checkOut || 'N/A',
            booking.status || 'pending',
            booking.totalAmount || 0
        ]);
    });

    CommonUtils.exportToCSV(data, `bookings_report_${new Date().toISOString().slice(0, 10)}`);
}

// Export occupancy report
function exportOccupancyReport() {
    const data = [];

    // Add header
    data.push(['Date', 'Property', 'Occupancy Rate (%)', 'Available Rooms', 'Occupied Rooms', 'Revenue (KES)']);

    // Add data (simplified)
    Object.entries(reportsData.dailyData).forEach(([date, daily]) => {
        // This is simplified - in a real system you'd have actual occupancy data
        const occupancy = Math.floor(Math.random() * 30) + 70;
        const totalRooms = 30;
        const occupied = Math.round((occupancy / 100) * totalRooms);

        data.push([
            date,
            'All Properties',
            occupancy.toFixed(1),
            totalRooms - occupied,
            occupied,
            daily.revenue || 0
        ]);
    });

    CommonUtils.exportToCSV(data, `occupancy_report_${new Date().toISOString().slice(0, 10)}`);
}

// Export financial report
function exportFinancialReport() {
    const data = [];

    // Add header
    data.push(['Metric', 'Value', 'Previous Period', 'Change (%)']);

    // Calculate metrics
    const totalRevenue = reportsData.revenue;
    const avgDailyRate = reportsData.avgDailyRate;
    const avgOccupancy = reportsData.avgOccupancy;
    const totalBookings = reportsData.totalBookings;

    // This would come from previous period data
    const prevTotalRevenue = totalRevenue * 0.9; // Example
    const prevADR = avgDailyRate * 0.95; // Example
    const prevOccupancy = avgOccupancy * 0.98; // Example
    const prevBookings = totalBookings * 0.92; // Example

    // Add data
    data.push(['Total Revenue', `KES ${totalRevenue.toLocaleString()}`, `KES ${prevTotalRevenue.toLocaleString()}`, ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1)]);
    data.push(['Average Daily Rate', `KES ${avgDailyRate.toFixed(0)}`, `KES ${prevADR.toFixed(0)}`, ((avgDailyRate - prevADR) / prevADR * 100).toFixed(1)]);
    data.push(['Average Occupancy', `${avgOccupancy.toFixed(1)}%`, `${prevOccupancy.toFixed(1)}%`, ((avgOccupancy - prevOccupancy) / prevOccupancy * 100).toFixed(1)]);
    data.push(['Total Bookings', totalBookings, prevBookings.toFixed(0), ((totalBookings - prevBookings) / prevBookings * 100).toFixed(1)]);

    CommonUtils.exportToCSV(data, `financial_report_${new Date().toISOString().slice(0, 10)}`);
}

// Export guest report
function exportGuestReport() {
    const data = [];

    // Add header
    data.push(['Guest Name', 'Email', 'Phone', 'Total Bookings', 'Total Nights', 'Total Spent (KES)', 'Last Booking']);

    // Group bookings by guest (simplified)
    const guests = {};
    reportsData.bookings.forEach(booking => {
        const guestKey = booking.email;
        if (!guests[guestKey]) {
            guests[guestKey] = {
                name: `${booking.firstName} ${booking.lastName}`,
                email: booking.email,
                phone: booking.phone,
                bookings: 0,
                nights: 0,
                spent: 0,
                lastBooking: booking.createdAt
            };
        }

        guests[guestKey].bookings++;
        guests[guestKey].nights += booking.nights || 1;
        guests[guestKey].spent += booking.totalAmount || 0;

        // Update last booking if this one is newer
        const currentDate = booking.createdAt ?
            new Date(booking.createdAt.toDate ? booking.createdAt.toDate() : booking.createdAt) :
            new Date(0);
        const lastDate = guests[guestKey].lastBooking ?
            new Date(guests[guestKey].lastBooking.toDate ? guests[guestKey].lastBooking.toDate() : guests[guestKey].lastBooking) :
            new Date(0);

        if (currentDate > lastDate) {
            guests[guestKey].lastBooking = booking.createdAt;
        }
    });

    // Add data
    Object.values(guests).forEach(guest => {
        const lastBooking = guest.lastBooking ?
            new Date(guest.lastBooking.toDate ? guest.lastBooking.toDate() : guest.lastBooking).toLocaleDateString() :
            'N/A';

        data.push([
            guest.name,
            guest.email,
            guest.phone,
            guest.bookings,
            guest.nights,
            guest.spent,
            lastBooking
        ]);
    });

    CommonUtils.exportToCSV(data, `guest_report_${new Date().toISOString().slice(0, 10)}`);
}

// Show custom export modal
function showCustomExport() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Custom Report Export</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="customExportForm">
                    <div class="form-group">
                        <label for="exportFormat">Export Format</label>
                        <select id="exportFormat" class="form-control">
                            <option value="csv">CSV (Excel)</option>
                            <option value="pdf">PDF</option>
                            <option value="json">JSON</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Data Fields</label>
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="booking_id" checked> Booking ID</label>
                            </div>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="guest_info" checked> Guest Information</label>
                            </div>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="dates" checked> Dates</label>
                            </div>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="property" checked> Property</label>
                            </div>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="room_type" checked> Room Type</label>
                            </div>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="amount" checked> Amount</label>
                            </div>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="status" checked> Status</label>
                            </div>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="fields" value="source" checked> Source</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="dateRange">Date Range</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="date" id="customExportFrom" class="form-control" style="flex: 1;" value="${currentFilters.dateFrom}">
                            <input type="date" id="customExportTo" class="form-control" style="flex: 1;" value="${currentFilters.dateTo}">
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-download"></i> Generate Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#customExportForm');
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const format = document.getElementById('exportFormat').value;
        const fromDate = document.getElementById('customExportFrom').value;
        const toDate = document.getElementById('customExportTo').value;

        // Get selected fields
        const selectedFields = Array.from(form.querySelectorAll('input[name="fields"]:checked'))
            .map(input => input.value);

        if (selectedFields.length === 0) {
            CommonUtils.showNotification('Please select at least one field', 'warning');
            return;
        }

        if (!fromDate || !toDate) {
            CommonUtils.showNotification('Please select date range', 'warning');
            return;
        }

        generateCustomReport(format, selectedFields, fromDate, toDate);
        modal.remove();
    });
}

// Generate custom report
async function generateCustomReport(format, fields, fromDate, toDate) {
    try {
        CommonUtils.showNotification('Generating custom report...', 'info');

        // In a real system, you would:
        // 1. Fetch data based on selected fields and date range
        // 2. Format according to selected format
        // 3. Generate download

        // For now, we'll simulate with a delay
        setTimeout(() => {
            const data = [];

            // Create header based on selected fields
            const headers = fields.map(field => {
                const fieldNames = {
                    'booking_id': 'Booking ID',
                    'guest_info': 'Guest Name',
                    'dates': 'Booking Date',
                    'property': 'Property',
                    'room_type': 'Room Type',
                    'amount': 'Amount (KES)',
                    'status': 'Status',
                    'source': 'Source'
                };
                return fieldNames[field] || field;
            });
            data.push(headers);

            // Add sample data
            reportsData.bookings.slice(0, 10).forEach(booking => {
                const row = [];
                fields.forEach(field => {
                    switch (field) {
                        case 'booking_id':
                            row.push(booking.bookingId || 'N/A');
                            break;
                        case 'guest_info':
                            row.push(`${booking.firstName} ${booking.lastName}`);
                            break;
                        case 'dates':
                            const date = booking.createdAt ?
                                new Date(booking.createdAt.toDate ? booking.createdAt.toDate() : booking.createdAt).toLocaleDateString() :
                                'N/A';
                            row.push(date);
                            break;
                        case 'property':
                            row.push(CommonUtils.PROPERTY_NAMES[booking.property] || booking.property);
                            break;
                        case 'room_type':
                            row.push(booking.roomType || 'N/A');
                            break;
                        case 'amount':
                            row.push(booking.totalAmount || 0);
                            break;
                        case 'status':
                            row.push(booking.status || 'pending');
                            break;
                        case 'source':
                            row.push(booking.source || 'website');
                            break;
                        default:
                            row.push('');
                    }
                });
                data.push(row);
            });

            // Export based on format
            if (format === 'csv') {
                CommonUtils.exportToCSV(data, `custom_report_${new Date().toISOString().slice(0, 10)}`);
            } else if (format === 'json') {
                const jsonData = data.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });

                const jsonString = JSON.stringify(jsonData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `custom_report_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                CommonUtils.showNotification('PDF export requires additional setup', 'warning');
            }

            CommonUtils.showNotification('Custom report generated', 'success');

        }, 1000);

    } catch (error) {
        console.error('Error generating custom report:', error);
        CommonUtils.showNotification('Failed to generate custom report', 'error');
    }
}

// Export all reports
function exportAllReports() {
    CommonUtils.showConfirm(
        'Export all reports? This will generate multiple files.',
        () => {
            exportRevenueReport();
            setTimeout(() => exportBookingsReport(), 500);
            setTimeout(() => exportOccupancyReport(), 1000);
            setTimeout(() => exportFinancialReport(), 1500);
            CommonUtils.showNotification('All reports export initiated', 'info');
        }
    );
}

// Show/hide loading
function showLoading(show) {
    const loadingElement = document.getElementById('reportsLoading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Check if we're on the reports module
    if (document.querySelector('[data-module="reports"]')) {
        setTimeout(() => {
            initReportsModule();
        }, 100);
    }
});

// Export functions
window.ReportsModule = {
    initReportsModule,
    loadReportsData,
    exportReport,
    exportAllReports,
    clearFilters,
    refreshReports: loadReportsData
};