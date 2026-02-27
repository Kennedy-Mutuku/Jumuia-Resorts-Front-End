// admin/modules/users.js
// Users Management Module

let usersData = [];
let filteredUsers = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortField = 'createdAt';
let sortDirection = 'desc';

// User roles
const USER_ROLES = {
    SYSTEM_ADMIN: 'system-admin',
    GENERAL_MANAGER: 'general-manager',
    STAFF: 'staff'
};

// Role display names
const ROLE_DISPLAY_NAMES = {
    'system-admin': 'System Administrator',
    'general-manager': 'General Manager',
    'staff': 'Staff'
};

// Initialize users module
function initUsersModule() {
    console.log('Initializing Users module...');

    // Check permissions
    if (!CommonUtils.checkPermission('manageUsers')) {
        CommonUtils.showNotification('You do not have permission to manage users', 'error');
        setTimeout(() => {
            window.loadModule('dashboard');
        }, 2000);
        return;
    }

    // Initialize common utilities
    if (!window.CommonUtils || !window.CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        CommonUtils.showNotification('Users module failed to initialize', 'error');
        return;
    }

    // Setup UI based on user permissions
    setupPermissions();

    // Load users data
    loadUsers();

    // Setup event listeners
    setupEventListeners();

    // Setup real-time listener
    setupRealtimeListener();
}

// Setup permissions
function setupPermissions() {
    const { currentUser } = CommonUtils;

    // Hide property filter for staff
    if (currentUser.role === 'staff') {
        const propertyFilter = document.getElementById('propertyFilter');
        if (propertyFilter) {
            propertyFilter.value = currentUser.property;
            propertyFilter.disabled = true;
        }
    }

    // Disable system-admin option for non-system admins
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter && currentUser.role !== USER_ROLES.SYSTEM_ADMIN) {
        const systemAdminOption = roleFilter.querySelector('option[value="system-admin"]');
        if (systemAdminOption) {
            systemAdminOption.disabled = true;
        }
    }
}

// Load users from API
async function loadUsers() {
    try {
        CommonUtils.showLoading(true, 'Loading users...');

        const response = await fetch(`${CommonUtils.API_URL}/users`, {
            headers: {
                // Future consideration: Pass auth token if required by API,
                // e.g. 'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch users');

        const data = await response.json();

        usersData = data.map(doc => {
            const userData = {
                id: doc._id || doc.id,
                ...doc
            };

            // Ensure required fields exist
            if (!userData.role) userData.role = USER_ROLES.STAFF;
            if (!userData.property) userData.property = CommonUtils.currentUser?.property || 'all';
            if (userData.active === undefined) userData.active = true;

            return userData;
        });

        // Apply filters
        applyFilters();

        // Render users
        renderUsers();

        // Update stats
        updateStats();

        CommonUtils.showLoading(false);

    } catch (error) {
        console.error('Error loading users:', error);
        CommonUtils.showNotification('Failed to load users', 'error');
        CommonUtils.showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Filter inputs
    document.getElementById('roleFilter')?.addEventListener('change', applyFilters);
    document.getElementById('propertyFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('searchInput')?.addEventListener('input', debounce(applyFilters, 300));

    // Apply filters button
    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);

    // Clear filters button
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);

    // Create user button
    document.getElementById('createUserBtn')?.addEventListener('click', showCreateUserModal);

    // Export button
    document.getElementById('exportUsersBtn')?.addEventListener('click', exportUsers);

    // Refresh button
    document.getElementById('refreshUsersBtn')?.addEventListener('click', refreshUsers);

    // Items per page
    document.getElementById('itemsPerPage')?.addEventListener('change', function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        renderUsersTable();
    });

    // Sort field
    document.getElementById('sortField')?.addEventListener('change', function () {
        sortField = this.value;
        loadUsers();
    });
}

// Setup polling listener
function setupRealtimeListener() {
    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`${CommonUtils.API_URL}/users`);
            if (!response.ok) return;

            const data = await response.json();

            usersData = data.map(doc => {
                const userData = {
                    id: doc._id || doc.id,
                    ...doc
                };

                // Ensure required fields exist
                if (!userData.role) userData.role = USER_ROLES.STAFF;
                if (!userData.property) userData.property = CommonUtils.currentUser?.property || 'all';
                if (userData.active === undefined) userData.active = true;

                return userData;
            });

            applyFilters();
            renderUsers();
            updateStats();

        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 15000);

    window.usersPollingInterval = pollInterval;
}

// Apply filters
function applyFilters() {
    const roleFilter = document.getElementById('roleFilter')?.value || 'all';
    const propertyFilter = document.getElementById('propertyFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';

    filteredUsers = usersData.filter(user => {
        // Don't show current user if they can't manage users
        if (user.id === CommonUtils.currentUser?.uid && !CommonUtils.checkPermission('manageUsers')) {
            return false;
        }

        // Role filter
        if (roleFilter !== 'all' && user.role !== roleFilter) {
            return false;
        }

        // Property filter
        if (propertyFilter !== 'all' && user.property !== propertyFilter) {
            return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
            const isActive = user.active !== false;
            if (statusFilter === 'active' && !isActive) return false;
            if (statusFilter === 'inactive' && isActive) return false;
        }

        // Search filter
        if (searchInput) {
            const searchStr = searchInput.toLowerCase();
            const userText = [
                user.name || '',
                user.email || '',
                user.role || '',
                user.property || ''
            ].join(' ').toLowerCase();

            if (!userText.includes(searchStr)) {
                return false;
            }
        }

        return true;
    });

    // Sort filtered users
    filteredUsers = CommonUtils.sortData(filteredUsers, sortField, sortDirection);

    // Reset to first page
    currentPage = 1;

    // Update display
    updatePagination();
    renderUsersTable();
}

// Clear filters
function clearFilters() {
    document.getElementById('roleFilter').value = 'all';
    document.getElementById('propertyFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('searchInput').value = '';

    applyFilters();
    CommonUtils.showNotification('Filters cleared', 'info');
}

// Render users
function renderUsers() {
    renderUsersTable();
    updatePagination();
}

// Render users table
function renderUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    if (paginatedUsers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h4>No users found</h4>
                    <p>Try adjusting your filters or create a new user</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    paginatedUsers.forEach((user, index) => {
        const isCurrentUser = user.id === CommonUtils.currentUser?.uid;
        const rowClass = isCurrentUser ? 'current-user' : '';
        const roleClass = `role-${user.role}`;

        html += `
            <tr class="${rowClass}">
                <td>${startIndex + index + 1}</td>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div class="user-details">
                            <div class="user-name">
                                <strong>${user.name || 'Unnamed User'}</strong>
                                ${isCurrentUser ? '<span class="current-user-badge">(You)</span>' : ''}
                            </div>
                            <div class="user-email">${user.email || 'No email'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${roleClass}">
                        ${ROLE_DISPLAY_NAMES[user.role] || user.role}
                    </span>
                </td>
                <td>
                    ${user.property === 'all' ?
                '<span class="property-badge all-properties"><i class="fas fa-globe"></i> All Properties</span>' :
                `<span class="property-badge" style="background: ${CommonUtils.getPropertyColor(user.property)}">
                            <i class="${CommonUtils.getPropertyIcon(user.property)}"></i>
                            ${CommonUtils.PROPERTY_NAMES[user.property] || user.property}
                        </span>`
            }
                </td>
                <td>
                    <div class="user-status">
                        ${user.active !== false ?
                '<span class="status-active"><i class="fas fa-circle"></i> Active</span>' :
                '<span class="status-inactive"><i class="fas fa-circle"></i> Inactive</span>'
            }
                    </div>
                </td>
                <td>
                    <div class="user-dates">
                        <div><strong>Created:</strong> ${CommonUtils.formatDate(user.createdAt)}</div>
                        ${user.lastLogin ?
                `<div><strong>Last login:</strong> ${CommonUtils.getTimeAgo(user.lastLogin)}</div>` :
                '<div><strong>Never logged in</strong></div>'
            }
                    </div>
                </td>
                <td>
                    <div class="user-actions">
                        <button class="action-btn btn-view" onclick="viewUser('${user.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!isCurrentUser ?
                `<button class="action-btn btn-edit" onclick="editUser('${user.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>` : ''
            }
                        ${!isCurrentUser && user.role !== USER_ROLES.SYSTEM_ADMIN ?
                `<button class="action-btn btn-toggle" onclick="toggleUserStatus('${user.id}')" title="Toggle Status">
                                <i class="fas fa-power-off"></i>
                            </button>` : ''
            }
                        ${!isCurrentUser && user.role !== USER_ROLES.SYSTEM_ADMIN && CommonUtils.checkPermission('delete') ?
                `<button class="action-btn btn-delete" onclick="deleteUser('${user.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
            }
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

// Update pagination
function updatePagination() {
    const paginationContainer = document.getElementById('usersPagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `
        <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page if not in range
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += `<button class="pagination-btn" disabled>...</button>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    // Last page if not in range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<button class="pagination-btn" disabled>...</button>`;
        }
        html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `
        <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    paginationContainer.innerHTML = html;
}

// Go to page
function goToPage(page) {
    if (page < 1 || page > Math.ceil(filteredUsers.length / itemsPerPage)) return;
    currentPage = page;
    renderUsersTable();
}

// Update stats
function updateStats() {
    const stats = {
        total: usersData.length,
        systemAdmins: 0,
        generalManagers: 0,
        staff: 0,
        active: 0,
        inactive: 0
    };

    usersData.forEach(user => {
        // Count by role
        if (user.role === USER_ROLES.SYSTEM_ADMIN) stats.systemAdmins++;
        if (user.role === USER_ROLES.GENERAL_MANAGER) stats.generalManagers++;
        if (user.role === USER_ROLES.STAFF) stats.staff++;

        // Count by status
        if (user.active !== false) stats.active++;
        else stats.inactive++;
    });

    // Update stats cards
    const statsContainer = document.getElementById('usersStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.systemAdmins}</div>
                <div class="stat-label">System Admins</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.generalManagers}</div>
                <div class="stat-label">Managers</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.staff}</div>
                <div class="stat-label">Staff</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.active}</div>
                <div class="stat-label">Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.inactive}</div>
                <div class="stat-label">Inactive</div>
            </div>
        `;
    }
}

// View user details
function viewUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    const isCurrentUser = user.id === CommonUtils.currentUser?.uid;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>User Details</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="user-details-full">
                    <div class="user-header">
                        <div class="user-avatar-large">
                            ${(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div class="user-info-large">
                            <h4>${user.name || 'Unnamed User'}</h4>
                            <p>${user.email || 'No email'}</p>
                            <p>
                                <span class="role-badge role-${user.role}">
                                    ${ROLE_DISPLAY_NAMES[user.role] || user.role}
                                </span>
                                ${isCurrentUser ? '<span class="current-user-badge">(You)</span>' : ''}
                            </p>
                        </div>
                    </div>
                    
                    <div class="user-details-section">
                        <h4>Account Information</h4>
                        <div class="detail-row">
                            <div class="detail-label">User ID:</div>
                            <div class="detail-value"><code>${user.id}</code></div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Role:</div>
                            <div class="detail-value">
                                <span class="role-badge role-${user.role}">
                                    ${ROLE_DISPLAY_NAMES[user.role] || user.role}
                                </span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Assigned Property:</div>
                            <div class="detail-value">
                                ${user.property === 'all' ?
            '<span class="property-badge all-properties"><i class="fas fa-globe"></i> All Properties</span>' :
            `<span class="property-badge" style="background: ${CommonUtils.getPropertyColor(user.property)}">
                                        <i class="${CommonUtils.getPropertyIcon(user.property)}"></i>
                                        ${CommonUtils.PROPERTY_NAMES[user.property] || user.property}
                                    </span>`
        }
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Account Status:</div>
                            <div class="detail-value">
                                ${user.active !== false ?
            '<span class="status-active"><i class="fas fa-circle"></i> Active</span>' :
            '<span class="status-inactive"><i class="fas fa-circle"></i> Inactive</span>'
        }
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-details-section">
                        <h4>Timestamps</h4>
                        <div class="detail-row">
                            <div class="detail-label">Account Created:</div>
                            <div class="detail-value">${CommonUtils.formatDate(user.createdAt, true)}</div>
                        </div>
                        ${user.lastLogin ? `
                            <div class="detail-row">
                                <div class="detail-label">Last Login:</div>
                                <div class="detail-value">
                                    ${CommonUtils.formatDate(user.lastLogin, true)}
                                    <br>
                                    <small>(${CommonUtils.getTimeAgo(user.lastLogin)})</small>
                                </div>
                            </div>
                        ` : ''}
                        ${user.updatedAt ? `
                            <div class="detail-row">
                                <div class="detail-label">Last Updated:</div>
                                <div class="detail-value">${CommonUtils.formatDate(user.updatedAt, true)}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="user-details-section">
                        <h4>Permissions</h4>
                        ${generatePermissionsHTML(user.role, user.property)}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                ${!isCurrentUser ?
            `<button class="btn btn-primary" onclick="editUser('${user.id}'); this.closest('.modal').remove()">
                        <i class="fas fa-edit"></i> Edit User
                    </button>` : ''
        }
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Generate permissions HTML
function generatePermissionsHTML(role, property) {
    const permissions = CommonUtils.getPermissions(role, property);

    return `
        <div class="permissions-list">
            <div class="permission-item ${permissions.canViewAll ? 'allowed' : 'denied'}">
                <i class="fas fa-${permissions.canViewAll ? 'check' : 'times'}"></i>
                <span>View All Data</span>
            </div>
            <div class="permission-item ${permissions.canEditAll ? 'allowed' : 'denied'}">
                <i class="fas fa-${permissions.canEditAll ? 'check' : 'times'}"></i>
                <span>Edit All Data</span>
            </div>
            <div class="permission-item ${permissions.canDelete ? 'allowed' : 'denied'}">
                <i class="fas fa-${permissions.canDelete ? 'check' : 'times'}"></i>
                <span>Delete Data</span>
            </div>
            <div class="permission-item ${permissions.canManageUsers ? 'allowed' : 'denied'}">
                <i class="fas fa-${permissions.canManageUsers ? 'check' : 'times'}"></i>
                <span>Manage Users</span>
            </div>
            <div class="permission-item ${permissions.canManageSettings ? 'allowed' : 'denied'}">
                <i class="fas fa-${permissions.canManageSettings ? 'check' : 'times'}"></i>
                <span>Manage Settings</span>
            </div>
            <div class="permission-item">
                <i class="fas fa-building"></i>
                <span>Properties: ${permissions.properties.map(p =>
        p === 'all' ? 'All' : CommonUtils.PROPERTY_NAMES[p] || p
    ).join(', ')}</span>
            </div>
        </div>
    `;
}

// Edit user
function editUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    showCreateUserModal(userId);
}

// Show create/edit user modal
function showCreateUserModal(userId = null) {
    const user = userId ? usersData.find(u => u.id === userId) : null;
    const isCurrentUser = userId && userId === CommonUtils.currentUser?.uid;

    // Check if current user can edit this user
    if (user && user.role === USER_ROLES.SYSTEM_ADMIN &&
        CommonUtils.currentUser?.role !== USER_ROLES.SYSTEM_ADMIN) {
        CommonUtils.showNotification('Only system administrators can edit other administrators', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>${user ? 'Edit User' : 'Create New User'}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="userForm" onsubmit="saveUser(event, '${userId || ''}')">
                    <div class="form-section">
                        <h4>Basic Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="userName">Full Name *</label>
                                <input type="text" id="userName" class="form-control" 
                                       value="${user?.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="userEmail">Email Address *</label>
                                <input type="email" id="userEmail" class="form-control" 
                                       value="${user?.email || ''}" required 
                                       ${user ? 'readonly' : ''}>
                            </div>
                        </div>
                    </div>
                    
                    ${!user ? `
                        <div class="form-section">
                            <h4>Password</h4>
                            <div class="form-group">
                                <label for="userPassword">Initial Password *</label>
                                <input type="password" id="userPassword" class="form-control" required>
                                <small class="form-text">User will be asked to change this on first login</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="form-section">
                        <h4>Role & Permissions</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="userRole">Role *</label>
                                <select id="userRole" class="form-control" required>
                                    <option value="">Select Role</option>
                                    <option value="system-admin" ${user?.role === USER_ROLES.SYSTEM_ADMIN ? 'selected' : ''}
                                            ${CommonUtils.currentUser?.role !== USER_ROLES.SYSTEM_ADMIN ? 'disabled' : ''}>
                                        System Administrator
                                    </option>
                                    <option value="general-manager" ${user?.role === USER_ROLES.GENERAL_MANAGER ? 'selected' : ''}>
                                        General Manager
                                    </option>
                                    <option value="staff" ${user?.role === USER_ROLES.STAFF ? 'selected' : ''}>
                                        Staff
                                    </option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="userProperty">Assigned Property *</label>
                                <select id="userProperty" class="form-control" required>
                                    <option value="all" ${user?.property === 'all' ? 'selected' : ''}>All Properties</option>
                                    ${['limuru', 'kanamai', 'kisumu'].map(prop => `
                                        <option value="${prop}" ${user?.property === prop ? 'selected' : ''}>
                                            ${CommonUtils.PROPERTY_NAMES[prop] || prop}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Account Status</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="userActive">Account Active</label>
                                <select id="userActive" class="form-control">
                                    <option value="true" ${user?.active !== false ? 'selected' : ''}>Active</option>
                                    <option value="false" ${user?.active === false ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="submitUserForm('${userId || ''}')">
                    <i class="fas fa-save"></i> ${user ? 'Save Changes' : 'Create User'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Submit user form
async function submitUserForm(userId = null) {
    try {
        const user = userId ? usersData.find(u => u.id === userId) : null;
        const isCurrentUser = userId && userId === CommonUtils.currentUser?.uid;

        // Get form values
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const role = document.getElementById('userRole').value;
        const property = document.getElementById('userProperty').value;
        const active = document.getElementById('userActive').value === 'true';

        if (!name || !email || !role || !property) {
            CommonUtils.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (!user && !document.getElementById('userPassword').value) {
            CommonUtils.showNotification('Please provide an initial password', 'error');
            return;
        }

        CommonUtils.showLoading(true, user ? 'Updating user...' : 'Creating user...');

        if (user) {
            // Update existing user
            await updateUser(userId, { name, role, property, active });
        } else {
            // Create new user
            const password = document.getElementById('userPassword').value;
            await createUser(email, password, name, role, property);
        }

        CommonUtils.showLoading(false);
        document.querySelector('.modal')?.remove();
        CommonUtils.showNotification(`User ${user ? 'updated' : 'created'} successfully`, 'success');

    } catch (error) {
        console.error('Error saving user:', error);
        CommonUtils.showLoading(false);
        CommonUtils.showNotification('Failed to save user: ' + error.message, 'error');
    }
}

// Create new user
async function createUser(email, password, name, role, property) {
    try {
        const userData = {
            email: email,
            password: password,
            name: name,
            role: role,
            property: property,
            active: true,
            createdBy: CommonUtils.currentUser?.name || CommonUtils.currentUser?.email || 'System'
        };

        const response = await fetch(`${CommonUtils.API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create user');
        }

        const data = await response.json();

        // Log activity (mock via API if needed or kept client side)
        await logUserActivity(data.user?._id || data.user?.id || data._id, 'created', CommonUtils.currentUser);

        return { success: true, userId: data.user?._id || data.user?.id || data._id };

    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Update existing user
async function updateUser(userId, updateData) {
    try {
        const updateObj = {
            ...updateData,
            updatedBy: CommonUtils.currentUser?.name || CommonUtils.currentUser?.email || 'System'
        };

        const response = await fetch(`${CommonUtils.API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateObj)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update user');
        }

        // Log activity
        await logUserActivity(userId, 'updated', CommonUtils.currentUser);

        return { success: true };

    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

// Toggle user status
async function toggleUserStatus(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    if (user.role === USER_ROLES.SYSTEM_ADMIN) {
        CommonUtils.showNotification('Cannot deactivate system administrators', 'error');
        return;
    }

    const newStatus = !(user.active !== false);
    const action = newStatus ? 'activate' : 'deactivate';

    CommonUtils.showConfirm(
        `Are you sure you want to ${action} this user?`,
        async () => {
            try {
                CommonUtils.showLoading(true, `${action === 'activate' ? 'Activating' : 'Deactivating'} user...`);

                await updateUser(userId, { active: newStatus });

                CommonUtils.showLoading(false);
                CommonUtils.showNotification(`User ${action}d successfully`, 'success');

            } catch (error) {
                console.error('Error toggling user status:', error);
                CommonUtils.showLoading(false);
                CommonUtils.showNotification('Failed to update user status', 'error');
            }
        }
    );
}

// Delete user
async function deleteUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    if (user.role === USER_ROLES.SYSTEM_ADMIN) {
        CommonUtils.showNotification('Cannot delete system administrators', 'error');
        return;
    }

    if (userId === CommonUtils.currentUser?.uid) {
        CommonUtils.showNotification('Cannot delete your own account', 'error');
        return;
    }

    CommonUtils.showConfirm(
        'Are you sure you want to delete this user? This action cannot be undone.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting user...');

                const response = await fetch(`${CommonUtils.API_URL}/users/${userId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to delete user');
                }

                // Log activity
                await logUserActivity(userId, 'deleted', CommonUtils.currentUser);

                CommonUtils.showLoading(false);
                CommonUtils.showNotification('User deleted successfully', 'success');
                loadUsers(); // refresh data

            } catch (error) {
                console.error('Error deleting user:', error);
                CommonUtils.showLoading(false);
                CommonUtils.showNotification('Failed to delete user', 'error');
            }
        }
    );
}

// Log user activity
async function logUserActivity(userId, action, currentUser) {
    try {
        const user = usersData.find(u => u.id === userId);

        if (!user || !currentUser) return;

        const activity = {
            type: 'user',
            action: action,
            description: `User ${user.name} (${user.email}) ${action} by ${currentUser.name || currentUser.email}`,
            userId: currentUser.uid || currentUser.id,
            userName: currentUser.name,
            targetUserId: userId,
            targetUserName: user.name,
            metadata: {
                role: user.role,
                property: user.property,
                status: user.active !== false ? 'active' : 'inactive'
            }
        };

        // If you have a Node API route for activities, send it here 
        // e.g., await fetch(`${CommonUtils.API_URL}/activities`, { method: 'POST', ... });
        console.log('Activity logged:', activity);

    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Export users
function exportUsers() {
    const exportData = filteredUsers.map(user => ({
        'Name': user.name || 'Unnamed',
        'Email': user.email || '',
        'Role': ROLE_DISPLAY_NAMES[user.role] || user.role,
        'Property': user.property === 'all' ? 'All Properties' : CommonUtils.PROPERTY_NAMES[user.property] || user.property,
        'Status': user.active !== false ? 'Active' : 'Inactive',
        'Created': CommonUtils.formatDate(user.createdAt, true),
        'Last Login': user.lastLogin ? CommonUtils.formatDate(user.lastLogin, true) : 'Never',
        'Last Updated': user.updatedAt ? CommonUtils.formatDate(user.updatedAt, true) : 'Never'
    }));

    CommonUtils.exportToCSV(exportData, `jumuia_users_${new Date().toISOString().slice(0, 10)}`);
}

// Refresh users
function refreshUsers() {
    loadUsers();
    CommonUtils.showNotification('Users refreshed', 'info');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show/hide loading
function showLoading(show) {
    const loadingElement = document.getElementById('usersLoading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Check if we're on the users module
    if (document.querySelector('[data-module="users"]')) {
        setTimeout(() => {
            initUsersModule();
        }, 100);
    }
});

// Export functions to window
window.UsersModule = {
    initUsersModule,
    loadUsers,
    viewUser,
    editUser,
    toggleUserStatus,
    deleteUser,
    exportUsers,
    refreshUsers,
    goToPage,
    USER_ROLES,
    ROLE_DISPLAY_NAMES
};