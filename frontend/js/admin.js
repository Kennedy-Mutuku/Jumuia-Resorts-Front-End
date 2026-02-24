// Jumuia Resorts Admin Dashboard
// Main Application Controller

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.currentProperty = 'all';
        this.currentModule = 'dashboard';
        this.modules = {};
        this.charts = {};
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('Admin Dashboard Initializing...');

            // Check authentication
            await this.checkAuth();

            // Setup UI components
            this.setupUI();

            // Load initial module
            await this.loadModule('dashboard');

            // Setup real-time listeners
            this.setupRealtimeListeners();

            this.isInitialized = true;
            console.log('Admin Dashboard Initialized');

        } catch (error) {
            console.error('Dashboard initialization error:', error);
            // Redirection handled in checkAuth
        }
    }

    async checkAuth() {
        const session = localStorage.getItem('jumuia_resort_session');
        if (!session) {
            console.log('No session found. Redirecting to login...');
            window.location.href = 'index.html';
            throw new Error('Not authenticated');
        }

        try {
            const sessionData = JSON.parse(session);
            const expiryTime = new Date(sessionData.expiryTime);

            if (new Date() > expiryTime) {
                console.log('Session expired. Redirecting to login...');
                localStorage.removeItem('jumuia_resort_session');
                sessionStorage.removeItem('jumuia_auth');
                window.location.href = 'index.html';
                throw new Error('Session expired');
            }

            this.currentUser = sessionData;
            this.currentProperty = sessionData.assignedProperty || 'all';
        } catch (error) {
            console.error('Session error:', error);
            localStorage.removeItem('jumuia_resort_session');
            window.location.href = 'index.html';
            throw error;
        }
    }


    setupUI() {
        // Setup event listeners
        this.setupEventListeners();

        // Setup real-time clock
        this.setupClock();

        // Setup mobile menu
        this.setupMobileMenu();

        // Update UI based on user role
        this.updateRoleBasedUI();

        // Update dashboard title
        this.updateDashboardTitle();
    }

    setupEventListeners() {
        // Property switcher
        const propertyToggle = document.getElementById('propertyToggle');
        const propertyDropdown = document.getElementById('propertyDropdown');

        if (propertyToggle && propertyDropdown) {
            propertyToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                propertyDropdown.classList.toggle('show');
            });

            document.querySelectorAll('.property-option').forEach(option => {
                option.addEventListener('click', () => {
                    const property = option.dataset.property;
                    this.switchProperty(property);
                    propertyDropdown.classList.remove('show');
                });
            });
        }

        // User menu
        const userProfile = document.getElementById('userProfile');
        const userMenu = document.getElementById('userMenu');

        if (userProfile && userMenu) {
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('show');
            });
        }

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = link.dataset.module;
                this.loadModule(module);

                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Close user menu
                if (userMenu) userMenu.classList.remove('show');
            });
        });

        // Quick actions
        document.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const module = card.dataset.module;
                if (module) {
                    this.loadModule(module);
                }
            });
        });

        // Sidebar collapse
        const collapseBtn = document.getElementById('collapseBtn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                const sidebar = document.getElementById('adminSidebar');
                sidebar.classList.toggle('collapsed');
                const icon = collapseBtn.querySelector('i');
                icon.classList.toggle('fa-chevron-left');
                icon.classList.toggle('fa-chevron-right');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            if (propertyDropdown) propertyDropdown.classList.remove('show');
            if (userMenu) userMenu.classList.remove('show');
        });
    }

    setupClock() {
        const updateTime = () => {
            const now = new Date();
            const time = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
            const date = now.toLocaleDateString('en-KE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Update any clock elements if they exist
            const timeEl = document.getElementById('currentTime');
            const dateEl = document.getElementById('currentDate');

            if (timeEl) timeEl.textContent = time;
            if (dateEl) dateEl.textContent = date;
        };

        updateTime();
        setInterval(updateTime, 1000);
    }

    setupMobileMenu() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (!mobileToggle) return;

        mobileToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('adminSidebar');
            sidebar.classList.toggle('mobile-open');
        });
    }

    updateUserUI() {
        // Update avatar
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.textContent = this.currentUser.name?.charAt(0)?.toUpperCase() || 'U';
        }

        // Update user name
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = this.currentUser.name || this.currentUser.email.split('@')[0];
        }

        // Update user role
        const userRole = document.getElementById('userRole');
        if (userRole) {
            const roleNames = {
                'general-manager': 'General Manager',
                'manager': 'Property Manager',
                'staff': 'Staff'
            };

            const roleBadgeClass = {
                'general-manager': 'badge-general-manager',
                'manager': 'badge-manager',
                'staff': 'badge-staff'
            };

            userRole.innerHTML = `
                <span class="role-badge ${roleBadgeClass[this.currentUser.role]}">
                    ${roleNames[this.currentUser.role]}
                </span>
            `;
        }
    }

    updateRoleBasedUI() {
        // Show/hide property switcher based on role
        const propertySwitcher = document.querySelector('.property-switcher');
        if (propertySwitcher) {
            if (this.currentUser.role === 'general-manager') {
                propertySwitcher.style.display = 'block';
            } else {
                propertySwitcher.style.display = 'none';

                // Show current property
                const propertyDetails = {
                    'limuru': { name: 'Limuru Country Home', icon: 'fa-mountain' },
                    'kanamai': { name: 'Kanamai Beach Resort', icon: 'fa-umbrella-beach' },
                    'kisumu': { name: 'Kisumu Hotel', icon: 'fa-hotel' }
                };

                const currentPropertyEl = document.querySelector('.current-property');
                if (currentPropertyEl && propertyDetails[this.currentProperty]) {
                    currentPropertyEl.innerHTML = `
                        <i class="fas ${propertyDetails[this.currentProperty].icon}"></i>
                        <span>${propertyDetails[this.currentProperty].name}</span>
                    `;
                }
            }
        }

        // Update navigation based on role
        this.updateNavigation();
    }

    updateNavigation() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;

        const accessibleModules = this.getAccessibleModules();

        // Build navigation HTML
        let navHTML = '';

        // Dashboard
        if (accessibleModules.includes('dashboard')) {
            navHTML += `
                <div class="nav-divider">Main</div>
                <div class="nav-item">
                    <a href="#dashboard" class="nav-link active" data-module="dashboard">
                        <i class="fas fa-tachometer-alt nav-icon"></i>
                        <span class="nav-text">Dashboard</span>
                    </a>
                </div>
            `;
        }

        // Booking Management
        if (accessibleModules.includes('bookings') || accessibleModules.includes('calendar')) {
            navHTML += `<div class="nav-divider">Booking Management</div>`;

            if (accessibleModules.includes('bookings')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#bookings" class="nav-link" data-module="bookings">
                            <i class="fas fa-calendar-check nav-icon"></i>
                            <span class="nav-text">Bookings</span>
                            <span class="badge" id="pendingBookingsBadge">0</span>
                        </a>
                    </div>
                `;
            }

            if (accessibleModules.includes('calendar')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#calendar" class="nav-link" data-module="calendar">
                            <i class="fas fa-calendar-alt nav-icon"></i>
                            <span class="nav-text">Calendar</span>
                        </a>
                    </div>
                `;
            }
        }

        // Guest Management
        if (accessibleModules.includes('feedback') || accessibleModules.includes('messages')) {
            navHTML += `<div class="nav-divider">Guest Management</div>`;

            if (accessibleModules.includes('feedback')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#feedback" class="nav-link" data-module="feedback">
                            <i class="fas fa-comments nav-icon"></i>
                            <span class="nav-text">Feedback</span>
                            <span class="badge" id="newFeedbackBadge">0</span>
                        </a>
                    </div>
                `;
            }

            if (accessibleModules.includes('messages')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#messages" class="nav-link" data-module="messages">
                            <i class="fas fa-envelope nav-icon"></i>
                            <span class="nav-text">Messages</span>
                            <span class="badge" id="unreadMessagesBadge">0</span>
                        </a>
                    </div>
                `;
            }
        }

        // Financial Management
        if (accessibleModules.includes('transactions') || accessibleModules.includes('reports') || accessibleModules.includes('reconciliation')) {
            navHTML += `<div class="nav-divider">Financial Management</div>`;

            if (accessibleModules.includes('transactions')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#transactions" class="nav-link" data-module="transactions">
                            <i class="fas fa-credit-card nav-icon"></i>
                            <span class="nav-text">Transactions</span>
                        </a>
                    </div>
                `;
            }

            if (accessibleModules.includes('reports')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#reports" class="nav-link" data-module="reports">
                            <i class="fas fa-chart-bar nav-icon"></i>
                            <span class="nav-text">Reports</span>
                        </a>
                    </div>
                `;
            }

            if (accessibleModules.includes('reconciliation')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#reconciliation" class="nav-link" data-module="reconciliation">
                            <i class="fas fa-balance-scale nav-icon"></i>
                            <span class="nav-text">Reconciliation</span>
                        </a>
                    </div>
                `;
            }
        }

        // Management
        if (accessibleModules.includes('offers') || accessibleModules.includes('users') || accessibleModules.includes('properties')) {
            navHTML += `<div class="nav-divider">Management</div>`;

            if (accessibleModules.includes('offers')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#offers" class="nav-link" data-module="offers">
                            <i class="fas fa-tags nav-icon"></i>
                            <span class="nav-text">Special Offers</span>
                        </a>
                    </div>
                `;
            }

            if (accessibleModules.includes('users')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#users" class="nav-link" data-module="users">
                            <i class="fas fa-users-cog nav-icon"></i>
                            <span class="nav-text">User Management</span>
                        </a>
                    </div>
                `;
            }

            if (accessibleModules.includes('properties')) {
                navHTML += `
                    <div class="nav-item">
                        <a href="#properties" class="nav-link" data-module="properties">
                            <i class="fas fa-hotel nav-icon"></i>
                            <span class="nav-text">Properties</span>
                        </a>
                    </div>
                `;
            }
        }

        // Settings
        if (accessibleModules.includes('settings')) {
            navHTML += `
                <div class="nav-divider">System</div>
                <div class="nav-item">
                    <a href="#settings" class="nav-link" data-module="settings">
                        <i class="fas fa-cog nav-icon"></i>
                        <span class="nav-text">Settings</span>
                    </a>
                </div>
            `;
        }

        navMenu.innerHTML = navHTML;

        // Re-attach event listeners
        this.setupNavigationListeners();
    }

    setupNavigationListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = link.dataset.module;
                this.loadModule(module);

                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    getAccessibleModules() {
        const roleModules = {
            'general-manager': [
                'dashboard', 'bookings', 'calendar', 'feedback', 'messages',
                'transactions', 'reports', 'reconciliation', 'offers',
                'users', 'properties', 'settings'
            ],
            'manager': [
                'dashboard', 'bookings', 'calendar', 'feedback', 'messages',
                'transactions', 'reports', 'offers'
            ],
            'staff': [
                'dashboard', 'bookings', 'calendar', 'feedback', 'messages'
            ]
        };

        return roleModules[this.currentUser.role] || ['dashboard'];
    }

    async loadModule(moduleName) {
        if (!this.isInitialized) {
            this.showAlert('Please wait for dashboard to initialize', 'warning');
            return;
        }

        this.currentModule = moduleName;
        window.location.hash = moduleName;

        const mainContent = document.getElementById('mainContentArea');

        // Show loading
        mainContent.innerHTML = `
            <div class="loading-overlay active">
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            // Check if module exists in modules folder
            const response = await fetch(`modules/${moduleName}.html`);

            if (response.ok) {
                // Load external module
                const html = await response.text();
                mainContent.innerHTML = html;

                // Load module JavaScript
                await this.loadModuleScript(moduleName);

                // Initialize module
                await this.initializeModule(moduleName);

            } else {
                // Use built-in module
                await this.loadBuiltInModule(moduleName);
            }

        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            await this.loadBuiltInModule(moduleName);
        }
    }

    async loadModuleScript(moduleName) {
        try {
            // Remove existing script if any
            const existingScript = document.getElementById(`module-script-${moduleName}`);
            if (existingScript) {
                existingScript.remove();
            }

            // Load new script
            const script = document.createElement('script');
            script.id = `module-script-${moduleName}`;
            script.src = `modules/${moduleName}.js`;

            return new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => {
                    console.warn(`Module script not found: ${moduleName}.js`);
                    resolve();
                };
                document.head.appendChild(script);
            });

        } catch (error) {
            console.error(`Error loading module script ${moduleName}:`, error);
        }
    }

    async initializeModule(moduleName) {
        // Call module initialization function if it exists
        const initFuncName = `init${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module`;
        if (typeof window[initFuncName] === 'function') {
            try {
                await window[initFuncName](this);
            } catch (error) {
                console.error(`Error initializing module ${moduleName}:`, error);
            }
        }
    }

    async loadBuiltInModule(moduleName) {
        const mainContent = document.getElementById('mainContentArea');

        switch (moduleName) {
            case 'dashboard':
                await this.loadDashboardModule();
                break;
            case 'transactions':
                await this.loadTransactionsModule();
                break;
            case 'reports':
                await this.loadReportsModule();
                break;
            case 'reconciliation':
                await this.loadReconciliationModule();
                break;
            default:
                mainContent.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-cogs"></i>
                        <h3>Module Coming Soon</h3>
                        <p>The ${moduleName} module is under development.</p>
                        <button onclick="dashboard.loadModule('dashboard')" class="btn btn-primary mt-3">
                            <i class="fas fa-tachometer-alt"></i> Return to Dashboard
                        </button>
                    </div>
                `;
        }
    }

    async loadDashboardModule() {
        const mainContent = document.getElementById('mainContentArea');

        // Build dashboard based on role
        let dashboardHTML = '';

        if (this.currentUser.role === 'general-manager') {
            dashboardHTML = this.buildGeneralManagerDashboard();
        } else if (this.currentUser.role === 'manager') {
            dashboardHTML = this.buildManagerDashboard();
        } else if (this.currentUser.role === 'staff') {
            dashboardHTML = this.buildStaffDashboard();
        }

        mainContent.innerHTML = dashboardHTML;

        // Initialize dashboard components
        await this.initializeDashboardComponents();
    }

    buildGeneralManagerDashboard() {
        const greeting = this.getGreeting();
        const propertyDetails = {
            'limuru': { name: 'Limuru Country Home', icon: 'fa-mountain', color: '#4CAF50' },
            'kanamai': { name: 'Kanamai Beach Resort', icon: 'fa-umbrella-beach', color: '#2196F3' },
            'kisumu': { name: 'Kisumu Hotel', icon: 'fa-hotel', color: '#9C27B0' }
        };

        return `
            <div id="dashboardModule" class="module-content active">
                <div class="content-header">
                    <div class="page-title">
                        <h1>${greeting}, ${this.currentUser.name?.split(' ')[0] || 'Manager'}!</h1>
                        <p>General Manager Dashboard - Overview of all properties</p>
                    </div>
                    <div class="breadcrumb">
                        <a href="#dashboard"><i class="fas fa-home"></i> Home</a>
                        <span>/</span>
                        <span>Dashboard</span>
                    </div>
                </div>

                <div id="alertBanner" class="alert" style="display: none;">
                    <i class="fas fa-info-circle"></i>
                    <div style="flex: 1;">
                        <span id="alertMessage"></span>
                    </div>
                    <button onclick="document.getElementById('alertBanner').style.display = 'none'" style="background: none; border: none; color: inherit; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <a href="#reports" class="quick-action-card" data-module="reports">
                        <div class="quick-action-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3>Generate Report</h3>
                        <p>Create financial reports</p>
                    </a>
                    <a href="#transactions" class="quick-action-card" data-module="transactions">
                        <div class="quick-action-icon">
                            <i class="fas fa-credit-card"></i>
                        </div>
                        <h3>View Transactions</h3>
                        <p>Monitor all payments</p>
                    </a>
                    <a href="#properties" class="quick-action-card" data-module="properties">
                        <div class="quick-action-icon">
                            <i class="fas fa-hotel"></i>
                        </div>
                        <h3>Manage Properties</h3>
                        <p>Update property details</p>
                    </a>
                    <a href="#users" class="quick-action-card" data-module="users">
                        <div class="quick-action-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3>User Management</h3>
                        <p>Manage staff accounts</p>
                    </a>
                </div>

                <!-- Property Comparison -->
                <div class="chart-container">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Property Performance Comparison</h3>
                        <select id="comparisonMetric" class="filter-select" style="width: auto;" onchange="dashboard.updateComparisonChart()">
                            <option value="revenue">Revenue</option>
                            <option value="occupancy">Occupancy Rate</option>
                            <option value="bookings">Number of Bookings</option>
                        </select>
                    </div>
                    <div class="comparison-view" id="propertyComparison">
                        ${['limuru', 'kanamai', 'kisumu'].map(property => `
                            <div class="property-dashboard ${this.currentProperty === property || this.currentProperty === 'all' ? 'active' : ''}">
                                <div class="property-dashboard-header">
                                    <div class="property-dashboard-icon">
                                        <i class="fas ${propertyDetails[property].icon}"></i>
                                    </div>
                                    <div>
                                        <h4 style="margin: 0;">${property === 'limuru' ? 'Limuru' : property === 'kanamai' ? 'Kanamai' : 'Kisumu'}</h4>
                                        <p style="font-size: 0.9rem; color: var(--text-light); margin: 5px 0 0 0;">${property === 'limuru' ? 'Country Home' : property === 'kanamai' ? 'Beach Resort' : 'Hotel'}</p>
                                    </div>
                                </div>
                                <div style="text-align: center; margin: 20px 0;">
                                    <div class="widget-stat" id="${property}Revenue">KES 0</div>
                                    <div style="font-size: 0.9rem; color: var(--text-light); margin-top: 5px;">Revenue</div>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-green);" id="${property}Occupancy">0%</div>
                                        <div style="font-size: 0.8rem; color: var(--text-light);">Occupancy</div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-green);" id="${property}Bookings">0</div>
                                        <div style="font-size: 0.8rem; color: var(--text-light);">Bookings</div>
                                    </div>
                                </div>
                                <button class="btn btn-secondary" style="width: 100%; margin-top: 20px;" onclick="dashboard.switchToProperty('${property}')">
                                    <i class="fas fa-external-link-alt"></i> View Details
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Financial Summary -->
                <div class="summary-cards">
                    <div class="summary-card primary">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="summary-value" id="totalRevenue">KES 0</div>
                        <div class="summary-label">Total Revenue</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-credit-card"></i>
                        <div class="summary-value" id="totalTransactions">0</div>
                        <div class="summary-label">Transactions</div>
                    </div>
                    <div class="summary-card secondary">
                        <i class="fas fa-percentage"></i>
                        <div class="summary-value" id="successRate">0%</div>
                        <div class="summary-label">Payment Success Rate</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-clock"></i>
                        <div class="summary-value" id="pendingPayments">0</div>
                        <div class="summary-label">Pending Payments</div>
                    </div>
                </div>

                <!-- Dashboard Widgets -->
                <div class="dashboard-widgets">
                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Total Occupancy Rate</div>
                                <div class="widget-stat" id="totalOccupancy">0%</div>
                                <div class="widget-change positive">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>Loading...</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-bed"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-info-circle"></i> Across all properties
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Total Bookings</div>
                                <div class="widget-stat" id="totalBookings">0</div>
                                <div class="widget-change positive">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>Loading...</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-calendar"></i> This month
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Pending Actions</div>
                                <div class="widget-stat" id="pendingActions">0</div>
                                <div class="widget-change">
                                    <span>Require attention</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-exclamation-circle"></i> Review pending items
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Guest Satisfaction</div>
                                <div class="widget-stat" id="avgRating">0.0</div>
                                <div class="widget-change positive">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>Loading...</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-star"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-comments"></i> Average rating
                        </div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="chart-container">
                    <h3 style="margin-bottom: 20px;">Revenue Trend (Last 7 Days)</h3>
                    <canvas id="revenueChart"></canvas>
                </div>

                <!-- Recent Activity -->
                <div class="activity-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Recent Activity</h3>
                        <button class="btn btn-secondary" onclick="dashboard.refreshActivity()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <ul class="activity-list" id="recentActivity">
                        <!-- Activity will be loaded here -->
                    </ul>
                </div>
            </div>
        `;
    }

    buildManagerDashboard() {
        const greeting = this.getGreeting();
        const propertyName = this.currentProperty === 'limuru' ? 'Limuru Country Home' :
            this.currentProperty === 'kanamai' ? 'Kanamai Beach Resort' : 'Kisumu Hotel';
        const propertyIcon = this.currentProperty === 'limuru' ? 'fa-mountain' :
            this.currentProperty === 'kanamai' ? 'fa-umbrella-beach' : 'fa-hotel';

        return `
            <div id="dashboardModule" class="module-content active">
                <div class="content-header">
                    <div class="page-title">
                        <h1>${greeting}, ${this.currentUser.name?.split(' ')[0] || 'Manager'}!</h1>
                        <p>${propertyName} - Manager Dashboard</p>
                    </div>
                    <div class="breadcrumb">
                        <a href="#dashboard"><i class="fas fa-home"></i> Home</a>
                        <span>/</span>
                        <span>Dashboard</span>
                    </div>
                </div>

                <div id="alertBanner" class="alert" style="display: none;">
                    <i class="fas fa-info-circle"></i>
                    <div style="flex: 1;">
                        <span id="alertMessage"></span>
                    </div>
                    <button onclick="document.getElementById('alertBanner').style.display = 'none'" style="background: none; border: none; color: inherit; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Property Quick Stats -->
                <div class="summary-cards">
                    <div class="summary-card primary">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="summary-value" id="propertyRevenue">KES 0</div>
                        <div class="summary-label">Monthly Revenue</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-bed"></i>
                        <div class="summary-value" id="propertyOccupancy">0%</div>
                        <div class="summary-label">Occupancy Rate</div>
                    </div>
                    <div class="summary-card secondary">
                        <i class="fas fa-calendar-check"></i>
                        <div class="summary-value" id="propertyBookings">0</div>
                        <div class="summary-label">Active Bookings</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-star"></i>
                        <div class="summary-value" id="propertyRating">0.0</div>
                        <div class="summary-label">Average Rating</div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <a href="#bookings" class="quick-action-card" data-module="bookings">
                        <div class="quick-action-icon">
                            <i class="fas fa-plus-circle"></i>
                        </div>
                        <h3>New Booking</h3>
                        <p>Create reservation</p>
                    </a>
                    <a href="#calendar" class="quick-action-card" data-module="calendar">
                        <div class="quick-action-icon">
                            <i class="fas fa-calendar-day"></i>
                        </div>
                        <h3>Today's Schedule</h3>
                        <p>View check-ins/outs</p>
                    </a>
                    <a href="#feedback" class="quick-action-card" data-module="feedback">
                        <div class="quick-action-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <h3>Guest Feedback</h3>
                        <p>Review feedback</p>
                    </a>
                    <a href="#reports" class="quick-action-card" data-module="reports">
                        <div class="quick-action-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3>Property Report</h3>
                        <p>Generate report</p>
                    </a>
                </div>

                <!-- Manager Dashboard Widgets -->
                <div class="dashboard-widgets">
                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Today's Check-ins</div>
                                <div class="widget-stat" id="todaysCheckins">0</div>
                                <div class="widget-change">
                                    <span id="nextCheckin">Loading...</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-sign-in-alt"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-clock"></i> Check-ins today
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Today's Revenue</div>
                                <div class="widget-stat" id="todaysRevenue">KES 0</div>
                                <div class="widget-change positive">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>Loading...</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-credit-card"></i> Transactions today
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Pending Tasks</div>
                                <div class="widget-stat" id="pendingTasks">0</div>
                                <div class="widget-change">
                                    <span>Require attention</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-tasks"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-exclamation-circle"></i> High priority tasks
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Staff On Duty</div>
                                <div class="widget-stat" id="staffOnDuty">0</div>
                                <div class="widget-change">
                                    <span>Current shift</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-users"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-user-clock"></i> Shift schedule
                        </div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="chart-container">
                    <h3 style="margin-bottom: 20px;">Property Performance - Last 7 Days</h3>
                    <canvas id="propertyChart"></canvas>
                </div>

                <!-- Today's Activity -->
                <div class="activity-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Today's Activity</h3>
                        <button class="btn btn-secondary" onclick="dashboard.refreshActivity()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <ul class="activity-list" id="propertyActivity">
                        <!-- Activity will be loaded here -->
                    </ul>
                </div>
            </div>
        `;
    }

    buildStaffDashboard() {
        const greeting = this.getGreeting();
        const propertyName = this.currentProperty === 'limuru' ? 'Limuru Country Home' :
            this.currentProperty === 'kanamai' ? 'Kanamai Beach Resort' : 'Kisumu Hotel';

        return `
            <div id="dashboardModule" class="module-content active">
                <div class="content-header">
                    <div class="page-title">
                        <h1>${greeting}, ${this.currentUser.name?.split(' ')[0] || 'Staff'}!</h1>
                        <p>${propertyName} - Staff Dashboard</p>
                    </div>
                    <div class="breadcrumb">
                        <a href="#dashboard"><i class="fas fa-home"></i> Home</a>
                        <span>/</span>
                        <span>Dashboard</span>
                    </div>
                </div>

                <div id="alertBanner" class="alert" style="display: none;">
                    <i class="fas fa-info-circle"></i>
                    <div style="flex: 1;">
                        <span id="alertMessage"></span>
                    </div>
                    <button onclick="document.getElementById('alertBanner').style.display = 'none'" style="background: none; border: none; color: inherit; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Staff Quick Stats -->
                <div class="summary-cards">
                    <div class="summary-card primary">
                        <i class="fas fa-calendar-check"></i>
                        <div class="summary-value" id="todaysCheckins">0</div>
                        <div class="summary-label">Today's Check-ins</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-sign-out-alt"></i>
                        <div class="summary-value" id="todaysCheckouts">0</div>
                        <div class="summary-label">Today's Check-outs</div>
                    </div>
                    <div class="summary-card secondary">
                        <i class="fas fa-envelope"></i>
                        <div class="summary-value" id="unreadMessages">0</div>
                        <div class="summary-label">New Messages</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-comments"></i>
                        <div class="summary-value" id="newFeedback">0</div>
                        <div class="summary-label">Feedback to Review</div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <a href="#bookings" class="quick-action-card" data-module="bookings">
                        <div class="quick-action-icon">
                            <i class="fas fa-plus-circle"></i>
                        </div>
                        <h3>New Booking</h3>
                        <p>Create reservation</p>
                    </a>
                    <a href="#calendar" class="quick-action-card" data-module="calendar">
                        <div class="quick-action-icon">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <h3>Check-in Guest</h3>
                        <p>Process check-in</p>
                    </a>
                    <a href="#messages" class="quick-action-card" data-module="messages">
                        <div class="quick-action-icon">
                            <i class="fas fa-reply"></i>
                        </div>
                        <h3>Reply Messages</h3>
                        <p>Respond to guests</p>
                    </a>
                    <a href="#feedback" class="quick-action-card" data-module="feedback">
                        <div class="quick-action-icon">
                            <i class="fas fa-star"></i>
                        </div>
                        <h3>Review Feedback</h3>
                        <p>View guest ratings</p>
                    </a>
                </div>

                <!-- Staff Dashboard Widgets -->
                <div class="dashboard-widgets">
                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Pending Check-ins</div>
                                <div class="widget-stat" id="pendingCheckins">0</div>
                                <div class="widget-change">
                                    <span id="nextArrival">Loading...</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-bed"></i> <span id="pendingRooms">No rooms</span>
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Check-outs Today</div>
                                <div class="widget-stat" id="todaysCheckoutsCount">0</div>
                                <div class="widget-change">
                                    <span id="nextCheckout">Loading...</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-sign-out-alt"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-clock"></i> Completed: <span id="completedCheckouts">0</span>
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Unread Messages</div>
                                <div class="widget-stat" id="unreadMessagesCount">0</div>
                                <div class="widget-change">
                                    <span>Require reply</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-envelope"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-exclamation-circle"></i> High priority: <span id="highPriorityMessages">0</span>
                        </div>
                    </div>

                    <div class="widget">
                        <div class="widget-header">
                            <div>
                                <div class="widget-title">Today's Tasks</div>
                                <div class="widget-stat" id="todaysTasks">0</div>
                                <div class="widget-change">
                                    <span id="tasksCompleted">0 completed</span>
                                </div>
                            </div>
                            <div class="widget-icon">
                                <i class="fas fa-tasks"></i>
                            </div>
                        </div>
                        <div class="widget-footer">
                            <i class="fas fa-check-circle"></i> <span id="tasksPercentage">0%</span> completed
                        </div>
                    </div>
                </div>

                <!-- Today's Schedule -->
                <div class="activity-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Today's Schedule</h3>
                        <button class="btn btn-secondary" onclick="dashboard.refreshSchedule()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Room</th>
                                    <th>Guest</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="scheduleTable">
                                <!-- Schedule will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Recent Messages -->
                <div class="activity-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Recent Messages</h3>
                        <a href="#messages" class="btn btn-secondary">
                            <i class="fas fa-external-link-alt"></i> View All
                        </a>
                    </div>
                    <ul class="activity-list" id="recentMessages">
                        <!-- Messages will be loaded here -->
                    </ul>
                </div>
            </div>
        `;
    }

    async initializeDashboardComponents() {
        // Load dashboard data
        await this.loadDashboardData();

        // Initialize charts
        this.initializeCharts();

        // Update dashboard title
        this.updateDashboardTitle();
    }

    async loadDashboardData() {
        try {
            if (this.currentUser.role === 'general-manager') {
                await this.loadGeneralManagerData();
            } else if (this.currentUser.role === 'manager') {
                await this.loadManagerData();
            } else if (this.currentUser.role === 'staff') {
                await this.loadStaffData();
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('Error loading dashboard data', 'error');
        }
    }

    async loadGeneralManagerData() {
        // Load data for all properties
        const properties = ['limuru', 'kanamai', 'kisumu'];

        for (const property of properties) {
            await this.loadPropertyData(property);
        }

        // Load overall statistics
        await this.loadOverallStatistics();

        // Load recent activity
        await this.loadRecentActivity();
    }

    async loadPropertyData(property) {
        if (!this.db) return;

        try {
            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

            // Get bookings for this property
            const bookingsQuery = this.db.collection('bookings')
                .where('property', '==', property)
                .where('checkInDate', '>=', monthStart)
                .limit(100);

            const bookingsSnapshot = await bookingsQuery.get();

            let totalRevenue = 0;
            let bookingCount = 0;
            let pendingBookings = 0;

            bookingsSnapshot.forEach(doc => {
                const booking = doc.data();
                bookingCount++;

                if (booking.status === 'pending') {
                    pendingBookings++;
                }

                if (booking.totalAmount) {
                    totalRevenue += parseFloat(booking.totalAmount) || 0;
                }
            });

            // Calculate occupancy (simplified)
            const totalRooms = 50; // Should come from property config
            const occupancyRate = Math.min(Math.round((bookingCount / totalRooms) * 100), 100);

            // Update UI
            document.getElementById(`${property}Revenue`).textContent = `KES ${totalRevenue.toLocaleString()}`;
            document.getElementById(`${property}Occupancy`).textContent = `${occupancyRate}%`;
            document.getElementById(`${property}Bookings`).textContent = bookingCount;

        } catch (error) {
            console.error(`Error loading data for ${property}:`, error);
        }
    }

    async loadOverallStatistics() {
        // This would aggregate data from all properties
        // For now, use demo data

        document.getElementById('totalRevenue').textContent = 'KES 3,680,000';
        document.getElementById('totalTransactions').textContent = '135';
        document.getElementById('successRate').textContent = '95%';
        document.getElementById('pendingPayments').textContent = '3';
        document.getElementById('totalOccupancy').textContent = '75%';
        document.getElementById('totalBookings').textContent = '135';
        document.getElementById('pendingActions').textContent = '7';
        document.getElementById('avgRating').textContent = '4.5';
    }

    async loadRecentActivity() {
        const activityList = document.getElementById('recentActivity');
        if (!activityList) return;

        // Demo activity data
        const activities = [
            {
                icon: 'fa-credit-card',
                color: '#012b02',
                title: 'New booking payment received - Kisumu Hotel',
                user: 'John Doe',
                time: '15 minutes ago',
                badge: 'KES 25,000'
            },
            {
                icon: 'fa-check-in',
                color: '#f39521',
                title: 'Guest checked in - Kanamai Beach Resort',
                user: 'Sarah Johnson',
                time: '1 hour ago',
                badge: 'Room 205'
            },
            {
                icon: 'fa-comment',
                color: '#184203',
                title: 'New feedback submitted - Limuru Country Home',
                user: 'Robert Chen',
                time: '2 hours ago',
                badge: '4.8 ★'
            }
        ];

        activityList.innerHTML = activities.map(activity => `
            <li class="activity-item">
                <div class="activity-icon" style="background: ${activity.color};">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">
                        <i class="fas fa-user"></i> ${activity.user} • 
                        <i class="fas fa-clock"></i> ${activity.time}
                    </div>
                </div>
                <span class="badge">${activity.badge}</span>
            </li>
        `).join('');
    }

    initializeCharts() {
        // Revenue chart for General Manager
        if (this.currentUser.role === 'general-manager') {
            const revenueCtx = document.getElementById('revenueChart');
            if (revenueCtx) {
                this.charts.revenueChart = new Chart(revenueCtx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        datasets: [
                            {
                                label: 'Limuru',
                                data: [120000, 190000, 150000, 180000, 220000, 250000, 200000],
                                borderColor: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'Kanamai',
                                data: [90000, 120000, 110000, 140000, 180000, 210000, 190000],
                                borderColor: '#2196F3',
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'Kisumu',
                                data: [150000, 220000, 180000, 210000, 250000, 280000, 240000],
                                borderColor: '#9C27B0',
                                backgroundColor: 'rgba(156, 39, 176, 0.1)',
                                tension: 0.4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top'
                            }
                        },
                        scales: {
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
            }
        }

        // Property chart for Manager
        if (this.currentUser.role === 'manager') {
            const propertyCtx = document.getElementById('propertyChart');
            if (propertyCtx) {
                this.charts.propertyChart = new Chart(propertyCtx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        datasets: [{
                            label: 'Daily Revenue (KES)',
                            data: [120000, 190000, 150000, 180000, 220000, 250000, 200000],
                            backgroundColor: 'rgba(34, 68, 15, 0.7)',
                            borderColor: 'rgb(34, 68, 15)',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
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
            }
        }
    }

    updateDashboardTitle() {
        const title = document.querySelector('.page-title h1');
        const subtitle = document.querySelector('.page-title p');

        if (!title || !subtitle) return;

        const greeting = this.getGreeting();

        if (this.currentUser.role === 'general-manager') {
            title.textContent = `${greeting}, ${this.currentUser.name?.split(' ')[0] || 'Manager'}!`;
            subtitle.textContent = 'General Manager Dashboard - Overview of all properties';
        } else {
            const propertyNames = {
                'limuru': 'Limuru Country Home',
                'kanamai': 'Kanamai Beach Resort',
                'kisumu': 'Kisumu Hotel'
            };

            const roleNames = {
                'manager': 'Manager Dashboard',
                'staff': 'Staff Dashboard'
            };

            title.textContent = `${greeting}, ${this.currentUser.name?.split(' ')[0] || 'User'}!`;
            subtitle.textContent = `${propertyNames[this.currentProperty]} - ${roleNames[this.currentUser.role]}`;
        }
    }

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }

    async loadTransactionsModule() {
        const mainContent = document.getElementById('mainContentArea');

        mainContent.innerHTML = `
            <div id="transactionsModule" class="module-content active">
                <div class="content-header">
                    <div class="page-title">
                        <h1>Transaction Management</h1>
                        <p>View and manage all payment transactions</p>
                    </div>
                    <div class="breadcrumb">
                        <a href="#dashboard"><i class="fas fa-home"></i> Home</a>
                        <span>/</span>
                        <span>Transactions</span>
                    </div>
                </div>

                <!-- Filters -->
                <div class="filters-container">
                    <div class="filter-row">
                        <div class="filter-group">
                            <label class="filter-label">Date Range</label>
                            <select id="dateRange" class="filter-select">
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="week">This Week</option>
                                <option value="month" selected>This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Status</label>
                            <select id="statusFilter" class="filter-select">
                                <option value="all">All Status</option>
                                <option value="successful">Successful</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Payment Method</label>
                            <select id="methodFilter" class="filter-select">
                                <option value="all">All Methods</option>
                                <option value="mpesa">M-Pesa</option>
                                <option value="card">Credit Card</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="cash">Cash</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">&nbsp;</label>
                            <button class="btn btn-primary" onclick="dashboard.filterTransactions()" style="width: 100%;">
                                <i class="fas fa-filter"></i> Apply Filters
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="summary-cards">
                    <div class="summary-card primary">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="summary-value" id="filteredRevenue">KES 0</div>
                        <div class="summary-label">Total Revenue</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-list"></i>
                        <div class="summary-value" id="totalFiltered">0</div>
                        <div class="summary-label">Transactions</div>
                    </div>
                    <div class="summary-card secondary">
                        <i class="fas fa-check-circle"></i>
                        <div class="summary-value" id="successfulTransactions">0</div>
                        <div class="summary-label">Successful</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-clock"></i>
                        <div class="summary-value" id="pendingTransactions">0</div>
                        <div class="summary-label">Pending</div>
                    </div>
                </div>

                <!-- Transactions Table -->
                <div class="activity-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Transaction List</h3>
                        <div class="action-buttons">
                            <button class="btn btn-secondary" onclick="dashboard.exportTransactions()">
                                <i class="fas fa-download"></i> Export CSV
                            </button>
                            <button class="btn btn-primary" onclick="dashboard.refreshTransactions()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Date & Time</th>
                                    <th>Guest</th>
                                    <th>Booking ID</th>
                                    <th>Property</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Reference</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="transactionsList">
                                <!-- Transactions will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Load transactions
        await this.loadTransactions();
    }

    async loadReportsModule() {
        const mainContent = document.getElementById('mainContentArea');

        mainContent.innerHTML = `
            <div id="reportsModule" class="module-content active">
                <div class="content-header">
                    <div class="page-title">
                        <h1>Financial Reports</h1>
                        <p>Generate and view detailed financial reports</p>
                    </div>
                    <div class="breadcrumb">
                        <a href="#dashboard"><i class="fas fa-home"></i> Home</a>
                        <span>/</span>
                        <span>Financial Reports</span>
                    </div>
                </div>

                <!-- Report Generator -->
                <div class="chart-container">
                    <h3 style="margin-bottom: 20px;">Generate Report</h3>
                    <div class="filter-row">
                        <div class="filter-group">
                            <label class="filter-label">Report Type</label>
                            <select id="reportType" class="filter-select">
                                <option value="revenue">Revenue Report</option>
                                <option value="occupancy">Occupancy Report</option>
                                <option value="transactions">Transaction Report</option>
                                <option value="property">Property Performance</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Period</label>
                            <select id="reportPeriod" class="filter-select">
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly" selected>Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Date Range</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <input type="date" id="reportStartDate" class="date-input" value="${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}">
                                <input type="date" id="reportEndDate" class="date-input" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">&nbsp;</label>
                            <button class="btn btn-primary" onclick="dashboard.generateReport()" style="width: 100%;">
                                <i class="fas fa-chart-line"></i> Generate Report
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Pre-defined Reports -->
                <div class="quick-actions">
                    <a href="javascript:void(0)" class="quick-action-card" onclick="dashboard.generateQuickReport('dailyRevenue')">
                        <div class="quick-action-icon">
                            <i class="fas fa-calendar-day"></i>
                        </div>
                        <h3>Daily Revenue</h3>
                        <p>Today's revenue report</p>
                    </a>
                    <a href="javascript:void(0)" class="quick-action-card" onclick="dashboard.generateQuickReport('monthlyPerformance')">
                        <div class="quick-action-icon">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <h3>Monthly Performance</h3>
                        <p>This month's performance</p>
                    </a>
                    <a href="javascript:void(0)" class="quick-action-card" onclick="dashboard.generateQuickReport('propertyComparison')">
                        <div class="quick-action-icon">
                            <i class="fas fa-hotel"></i>
                        </div>
                        <h3>Property Comparison</h3>
                        <p>Compare property performance</p>
                    </a>
                    <a href="javascript:void(0)" class="quick-action-card" onclick="dashboard.generateQuickReport('transactionSummary')">
                        <div class="quick-action-icon">
                            <i class="fas fa-credit-card"></i>
                        </div>
                        <h3>Transaction Summary</h3>
                        <p>Payment transaction summary</p>
                    </a>
                </div>
            </div>
        `;
    }

    async loadReconciliationModule() {
        const mainContent = document.getElementById('mainContentArea');

        mainContent.innerHTML = `
            <div id="reconciliationModule" class="module-content active">
                <div class="content-header">
                    <div class="page-title">
                        <h1>Reconciliation</h1>
                        <p>Reconcile payments and bookings</p>
                    </div>
                    <div class="breadcrumb">
                        <a href="#dashboard"><i class="fas fa-home"></i> Home</a>
                        <span>/</span>
                        <span>Reconciliation</span>
                    </div>
                </div>

                <!-- Reconciliation Summary -->
                <div class="summary-cards">
                    <div class="summary-card primary">
                        <i class="fas fa-check-circle"></i>
                        <div class="summary-value" id="reconciledAmount">KES 0</div>
                        <div class="summary-label">Reconciled Amount</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div class="summary-value" id="unreconciledAmount">KES 0</div>
                        <div class="summary-label">Unreconciled Amount</div>
                    </div>
                    <div class="summary-card secondary">
                        <i class="fas fa-percentage"></i>
                        <div class="summary-value" id="reconciliationRate">0%</div>
                        <div class="summary-label">Reconciliation Rate</div>
                    </div>
                    <div class="summary-card">
                        <i class="fas fa-clock"></i>
                        <div class="summary-value" id="pendingReconciliation">0</div>
                        <div class="summary-label">Pending Items</div>
                    </div>
                </div>

                <!-- Reconciliation Table -->
                <div class="activity-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Reconciliation Items</h3>
                        <div class="action-buttons">
                            <button class="btn btn-secondary" onclick="dashboard.exportReconciliation()">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="btn btn-primary" onclick="dashboard.runAutoReconciliation()">
                                <i class="fas fa-robot"></i> Auto-Reconcile
                            </button>
                        </div>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Booking ID</th>
                                    <th>Guest</th>
                                    <th>Property</th>
                                    <th>Booking Amount</th>
                                    <th>Payment Amount</th>
                                    <th>Difference</th>
                                    <th>Payment Method</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="reconciliationList">
                                <!-- Reconciliation items will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Load reconciliation data
        await this.loadReconciliationData();
    }

    async loadTransactions() {
        // This would load transactions from Firestore
        // For now, show demo data

        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;

        const demoTransactions = [
            {
                id: 'TX-001',
                date: new Date().toLocaleString(),
                guest: 'John Doe',
                bookingId: 'BOOK-123',
                property: 'Limuru',
                amount: 25000,
                method: 'M-Pesa',
                reference: 'MPESA123456',
                status: 'successful'
            },
            {
                id: 'TX-002',
                date: new Date().toLocaleString(),
                guest: 'Jane Smith',
                bookingId: 'BOOK-124',
                property: 'Kanamai',
                amount: 18000,
                method: 'Credit Card',
                reference: 'CARD789012',
                status: 'successful'
            },
            {
                id: 'TX-003',
                date: new Date().toLocaleString(),
                guest: 'Robert Johnson',
                bookingId: 'BOOK-125',
                property: 'Kisumu',
                amount: 32000,
                method: 'Bank Transfer',
                reference: 'BANK345678',
                status: 'pending'
            }
        ];

        transactionsList.innerHTML = demoTransactions.map(tx => `
            <tr>
                <td><strong>${tx.id}</strong></td>
                <td>${tx.date}</td>
                <td>${tx.guest}</td>
                <td>${tx.bookingId}</td>
                <td>${tx.property}</td>
                <td><strong>KES ${tx.amount.toLocaleString()}</strong></td>
                <td>${tx.method}</td>
                <td>${tx.reference}</td>
                <td><span class="status-badge status-${tx.status}">${tx.status}</span></td>
                <td class="actions">
                    <button class="action-icon" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update summary cards
        document.getElementById('filteredRevenue').textContent = 'KES 75,000';
        document.getElementById('totalFiltered').textContent = '3';
        document.getElementById('successfulTransactions').textContent = '2';
        document.getElementById('pendingTransactions').textContent = '1';
    }

    async loadReconciliationData() {
        // This would load reconciliation data from Firestore
        // For now, show demo data

        const reconciliationList = document.getElementById('reconciliationList');
        if (!reconciliationList) return;

        const demoData = [
            {
                bookingId: 'BOOK-123',
                guest: 'John Doe',
                property: 'Limuru',
                bookingAmount: 25000,
                paymentAmount: 25000,
                difference: 0,
                method: 'M-Pesa',
                status: 'reconciled'
            },
            {
                bookingId: 'BOOK-124',
                guest: 'Jane Smith',
                property: 'Kanamai',
                bookingAmount: 18000,
                paymentAmount: 18000,
                difference: 0,
                method: 'Credit Card',
                status: 'reconciled'
            },
            {
                bookingId: 'BOOK-125',
                guest: 'Robert Johnson',
                property: 'Kisumu',
                bookingAmount: 32000,
                paymentAmount: 30000,
                difference: 2000,
                method: 'Bank Transfer',
                status: 'discrepancy'
            }
        ];

        reconciliationList.innerHTML = demoData.map(item => `
            <tr>
                <td><strong>${item.bookingId}</strong></td>
                <td>${item.guest}</td>
                <td>${item.property}</td>
                <td>KES ${item.bookingAmount.toLocaleString()}</td>
                <td>KES ${item.paymentAmount.toLocaleString()}</td>
                <td>${item.difference === 0 ? 'KES 0' : `<span class="payment-failed">KES ${item.difference.toLocaleString()}</span>`}</td>
                <td>${item.method}</td>
                <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                <td class="actions">
                    <button class="action-icon" title="Reconcile">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-icon" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update summary cards
        document.getElementById('reconciledAmount').textContent = 'KES 43,000';
        document.getElementById('unreconciledAmount').textContent = 'KES 32,000';
        document.getElementById('reconciliationRate').textContent = '57%';
        document.getElementById('pendingReconciliation').textContent = '1';
    }

    setupRealtimeListeners() {
        if (!this.db) return;

        // Listen for new bookings
        const bookingsQuery = this.currentUser.role === 'general-manager'
            ? this.db.collection('bookings').where('status', '==', 'pending')
            : this.db.collection('bookings')
                .where('property', '==', this.currentProperty)
                .where('status', '==', 'pending');

        bookingsQuery.onSnapshot((snapshot) => {
            const pendingCount = snapshot.size;
            const badge = document.getElementById('pendingBookingsBadge');
            if (badge) {
                badge.textContent = pendingCount;
                badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
            }
        });

        // Listen for new feedback
        const feedbackQuery = this.currentUser.role === 'general-manager'
            ? this.db.collection('feedback').where('status', '==', 'new')
            : this.db.collection('feedback')
                .where('property', '==', this.currentProperty)
                .where('status', '==', 'new');

        feedbackQuery.onSnapshot((snapshot) => {
            const newCount = snapshot.size;
            const badge = document.getElementById('newFeedbackBadge');
            if (badge) {
                badge.textContent = newCount;
                badge.style.display = newCount > 0 ? 'inline-block' : 'none';
            }
        });

        // Listen for new messages
        const messagesQuery = this.currentUser.role === 'general-manager'
            ? this.db.collection('messages').where('read', '==', false)
            : this.db.collection('messages')
                .where('property', '==', this.currentProperty)
                .where('read', '==', false);

        messagesQuery.onSnapshot((snapshot) => {
            const unreadCount = snapshot.size;
            const badge = document.getElementById('unreadMessagesBadge');
            if (badge) {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }
        });
    }

    switchProperty(property) {
        if (property === this.currentProperty) return;

        this.currentProperty = property;

        // Update UI
        const propertyDetails = {
            'limuru': { name: 'Limuru Country Home', icon: 'fa-mountain' },
            'kanamai': { name: 'Kanamai Beach Resort', icon: 'fa-umbrella-beach' },
            'kisumu': { name: 'Kisumu Hotel', icon: 'fa-hotel' },
            'all': { name: 'All Properties', icon: 'fa-globe' }
        };

        const currentPropertyText = document.getElementById('currentPropertyText');
        if (currentPropertyText) {
            currentPropertyText.textContent = propertyDetails[property].name;
        }

        // Update active state
        document.querySelectorAll('.property-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.property === property) {
                option.classList.add('active');
            }
        });

        // Update dashboard title
        this.updateDashboardTitle();

        // Reload current module with new property filter
        this.loadModule(this.currentModule);

        this.showAlert(`Switched to ${propertyDetails[property].name}`, 'success');
    }

    switchToProperty(property) {
        if (this.currentUser.role === 'general-manager') {
            this.switchProperty(property);
        }
    }

    updateComparisonChart() {
        this.showAlert('Comparison chart updated', 'success');
    }

    refreshActivity() {
        this.loadDashboardData();
        this.showAlert('Activity refreshed', 'success');
    }

    refreshSchedule() {
        this.showAlert('Schedule refreshed', 'success');
    }

    filterTransactions() {
        this.showAlert('Transactions filtered', 'success');
    }

    exportTransactions() {
        this.showAlert('Transactions exported to CSV', 'success');
    }

    refreshTransactions() {
        this.loadTransactions();
        this.showAlert('Transactions refreshed', 'success');
    }

    generateReport() {
        this.showAlert('Report generated successfully', 'success');
    }

    generateQuickReport(type) {
        this.showAlert(`${type} report generated`, 'success');
    }

    runAutoReconciliation() {
        this.showAlert('Auto-reconciliation completed', 'success');
    }

    exportReconciliation() {
        this.showAlert('Reconciliation data exported', 'success');
    }

    showAlert(message, type = 'info') {
        const alertBanner = document.getElementById('alertBanner');
        const alertMessage = document.getElementById('alertMessage');

        if (!alertBanner || !alertMessage) return;

        alertMessage.textContent = message;
        alertBanner.className = `alert alert-${type}`;
        alertBanner.style.display = 'flex';

        setTimeout(() => {
            alertBanner.style.display = 'none';
        }, 5000);
    }

    async logout() {
        const confirmed = confirm('Are you sure you want to logout?');
        if (confirmed) {
            try {
                // Clear session
                localStorage.removeItem('jumuia_resort_session');
                sessionStorage.removeItem('jumuia_auth');

                // Sign out from Firebase
                if (this.auth) {
                    await this.auth.signOut();
                }

                // Redirect to login
                window.location.href = 'index.html';

            } catch (error) {
                console.error('Logout error:', error);
                this.showAlert('Logout failed. Please try again.', 'error');
            }
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AdminDashboard();
    window.dashboard.init();
});