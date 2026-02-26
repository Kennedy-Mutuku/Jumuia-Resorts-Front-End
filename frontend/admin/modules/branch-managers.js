// Branch Managers Module
// Handles creating, listing, deleting, and resetting passwords for branch managers

(function () {
    'use strict';

    const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';

    function getToken() {
        try {
            const session = JSON.parse(localStorage.getItem('jumuia_resort_session'));
            return session ? session.token : null;
        } catch (e) {
            return null;
        }
    }

    const propertyMap = {
        'limuru': { name: 'Limuru Country Home', icon: 'fa-mountain' },
        'kanamai': { name: 'Kanamai Beach Resort', icon: 'fa-umbrella-beach' },
        'kisumu': { name: 'Kisumu Hotel', icon: 'fa-hotel' }
    };

    // ─── Email Auto-Generation ───────────────────────────────────────────

    const firstNameInput = document.getElementById('bmFirstName');
    const lastNameInput = document.getElementById('bmLastName');
    const emailInput = document.getElementById('bmEmail');
    const emailPreview = document.getElementById('bmEmailPreview');

    function updateEmail() {
        const first = (firstNameInput.value || '').trim().toLowerCase().replace(/\s+/g, '');
        const last = (lastNameInput.value || '').trim().toLowerCase().replace(/\s+/g, '');

        if (first && last) {
            const email = `${first}.${last}@jumuiaresorts.com`;
            emailInput.value = email;
            emailPreview.innerHTML = `Login email: <span>${email}</span>`;
        } else {
            emailPreview.innerHTML = 'Enter both names to generate email';
            emailInput.value = '';
        }
    }

    firstNameInput.addEventListener('input', updateEmail);
    lastNameInput.addEventListener('input', updateEmail);

    // ─── Password Toggle ─────────────────────────────────────────────────

    document.getElementById('bmTogglePassword').addEventListener('click', function () {
        const pwdInput = document.getElementById('bmPassword');
        const icon = this.querySelector('i');
        if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            pwdInput.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });

    // ─── Alert System ────────────────────────────────────────────────────

    function showAlert(message, type) {
        const alert = document.getElementById('bmAlert');
        const icon = document.getElementById('bmAlertIcon');
        const msg = document.getElementById('bmAlertMsg');

        alert.className = `bm-alert bm-alert-${type} show`;
        icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        msg.textContent = message;

        setTimeout(() => { alert.classList.remove('show'); }, 5000);
    }

    // ─── Copy to Clipboard ───────────────────────────────────────────────

    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            btn.classList.add('copied');
            const origIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = origIcon;
            }, 1500);
        }).catch(() => {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1500);
        });
    }

    // ─── Credentials Modal ───────────────────────────────────────────────

    function showCredsModal(email, password, title, subtitle) {
        document.getElementById('bmCredsEmail').textContent = email;
        document.getElementById('bmCredsPassword').textContent = password;
        document.getElementById('bmCredsTitle').textContent = title || 'Manager Created!';
        document.getElementById('bmCredsSubtitle').textContent = subtitle || 'Share these credentials with the branch manager';
        document.getElementById('bmCredsIcon').className = 'fas ' + (title && title.includes('Reset') ? 'fa-key' : 'fa-user-check') + ' creds-icon';
        document.getElementById('bmCredsModal').classList.add('show');
    }

    document.getElementById('bmCredsClose').addEventListener('click', () => {
        document.getElementById('bmCredsModal').classList.remove('show');
    });

    document.getElementById('bmCredsModal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('show');
    });

    document.getElementById('bmCopyEmail').addEventListener('click', function () {
        copyToClipboard(document.getElementById('bmCredsEmail').textContent, this);
    });

    document.getElementById('bmCopyPassword').addEventListener('click', function () {
        copyToClipboard(document.getElementById('bmCredsPassword').textContent, this);
    });

    document.getElementById('bmCopyAll').addEventListener('click', function () {
        const email = document.getElementById('bmCredsEmail').textContent;
        const password = document.getElementById('bmCredsPassword').textContent;
        const text = `Email: ${email}\nPassword: ${password}`;
        copyToClipboard(text, this);
        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            this.innerHTML = '<i class="fas fa-clipboard"></i> Copy Both Email & Password';
        }, 2000);
    });

    // ─── Create Manager ──────────────────────────────────────────────────

    document.getElementById('bmCreateForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = document.getElementById('bmPassword').value;
        const property = document.getElementById('bmProperty').value;
        const submitBtn = document.getElementById('bmSubmitBtn');

        if (!firstName || !lastName || !email || !password || !property) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            const token = getToken();
            if (!token) { showAlert('Session expired. Please log in again.', 'error'); return; }

            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: `${firstName} ${lastName}`,
                    email: email,
                    password: password,
                    role: 'manager',
                    assignedProperty: property
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to create manager');

            // Show credentials modal for easy sharing
            showCredsModal(email, password, 'Manager Created!', `Share these credentials with ${data.name}`);

            // Reset form
            this.reset();
            emailInput.value = '';
            emailPreview.innerHTML = 'Enter first and last name to generate email';

            loadManagers();

        } catch (error) {
            console.error('Create manager error:', error);
            showAlert(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Manager';
        }
    });

    // ─── Load Managers ───────────────────────────────────────────────────

    async function loadManagers() {
        const body = document.getElementById('bmManagersBody');
        const countEl = document.getElementById('bmManagerCount');

        body.innerHTML = '<div class="bm-loading"><i class="fas fa-spinner"></i><p>Loading managers...</p></div>';

        try {
            const token = getToken();
            if (!token) {
                body.innerHTML = '<div class="bm-empty"><i class="fas fa-lock"></i><h4>Authentication Required</h4></div>';
                return;
            }

            const response = await fetch(`${API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to load users');

            const users = await response.json();
            const managers = users.filter(u => u.role === 'manager');
            countEl.textContent = managers.length;

            if (managers.length === 0) {
                body.innerHTML = '<div class="bm-empty"><i class="fas fa-user-tie"></i><h4>No Branch Managers Yet</h4><p>Use the form above to create your first branch manager.</p></div>';
                return;
            }

            let tableHTML = `
                <table class="bm-table">
                    <thead>
                        <tr>
                            <th>Manager</th>
                            <th>Credentials</th>
                            <th>Branch</th>
                            <th>Created</th>
                            <th style="width: 110px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            managers.forEach(manager => {
                const initials = manager.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const property = manager.properties?.[0] || 'unknown';
                const propInfo = propertyMap[property] || { name: property, icon: 'fa-building' };
                const createdDate = new Date(manager.createdAt).toLocaleDateString('en-KE', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });

                tableHTML += `
                    <tr>
                        <td>
                            <div class="bm-user-cell">
                                <div class="bm-user-avatar">${initials}</div>
                                <div class="bm-user-details">
                                    <div class="bm-user-name">${manager.name}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="bm-cred-row">
                                <i class="fas fa-envelope"></i>
                                <span class="bm-cred-val">${manager.email}</span>
                                <button class="bm-copy-btn" title="Copy email" onclick="event.stopPropagation()" data-copy="${manager.email}">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="bm-cred-row">
                                <i class="fas fa-key"></i>
                                <span class="bm-cred-val" style="color: #999;">••••••••</span>
                            </div>
                        </td>
                        <td>
                            <span class="bm-property-badge ${property}">
                                <i class="fas ${propInfo.icon}"></i> ${propInfo.name}
                            </span>
                        </td>
                        <td style="color: #666; font-size: 0.85rem;">${createdDate}</td>
                        <td>
                            <div class="bm-action-btns">
                                <button class="bm-reset-btn" title="Reset password" data-id="${manager._id}" data-name="${manager.name}" data-email="${manager.email}">
                                    <i class="fas fa-key"></i>
                                </button>
                                <button class="bm-delete-btn" title="Delete manager" data-id="${manager._id}" data-name="${manager.name}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tableHTML += '</tbody></table>';
            body.innerHTML = tableHTML;

            // Attach copy handlers
            body.querySelectorAll('.bm-copy-btn[data-copy]').forEach(btn => {
                btn.addEventListener('click', function () {
                    copyToClipboard(this.dataset.copy, this);
                });
            });

            // Attach reset handlers
            body.querySelectorAll('.bm-reset-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    resetPassword(this.dataset.id, this.dataset.name, this.dataset.email);
                });
            });

            // Attach delete handlers
            body.querySelectorAll('.bm-delete-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    openDeleteModal(this.dataset.id, this.dataset.name);
                });
            });

        } catch (error) {
            console.error('Load managers error:', error);
            body.innerHTML = `<div class="bm-empty"><i class="fas fa-exclamation-triangle"></i><h4>Error Loading</h4><p>${error.message}</p></div>`;
        }
    }

    // ─── Reset Password ──────────────────────────────────────────────────

    async function resetPassword(id, name, email) {
        if (!confirm(`Reset password for ${name}?\nA new password will be generated.`)) return;

        try {
            const token = getToken();
            const response = await fetch(`${API_URL}/users/${id}/reset-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to reset password');

            // Show the new credentials in the modal
            showCredsModal(data.email, data.password, 'Password Reset!', `New credentials for ${name}`);

        } catch (error) {
            console.error('Reset password error:', error);
            showAlert(error.message, 'error');
        }
    }

    // ─── Delete Manager ──────────────────────────────────────────────────

    let pendingDeleteId = null;

    function openDeleteModal(id, name) {
        pendingDeleteId = id;
        document.getElementById('bmDeleteName').textContent = name;
        document.getElementById('bmDeleteModal').classList.add('show');
    }

    document.getElementById('bmCancelDelete').addEventListener('click', () => {
        document.getElementById('bmDeleteModal').classList.remove('show');
        pendingDeleteId = null;
    });

    document.getElementById('bmDeleteModal').addEventListener('click', function (e) {
        if (e.target === this) { this.classList.remove('show'); pendingDeleteId = null; }
    });

    document.getElementById('bmConfirmDelete').addEventListener('click', async function () {
        if (!pendingDeleteId) return;

        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        try {
            const token = getToken();
            const response = await fetch(`${API_URL}/users/${pendingDeleteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to delete');

            document.getElementById('bmDeleteModal').classList.remove('show');
            showAlert('Manager removed successfully', 'success');
            loadManagers();

        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
            pendingDeleteId = null;
        }
    });

    // ─── Initialize ──────────────────────────────────────────────────────

    loadManagers();

})();
