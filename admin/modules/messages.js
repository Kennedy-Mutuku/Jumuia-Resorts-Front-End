// admin/modules/messages.js
// Messages Management Module

let messagesData = [];
let filteredMessages = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortField = 'timestamp';
let sortDirection = 'desc';

// Initialize messages module
function initMessagesModule() {
    console.log('Initializing Messages module...');
    
    // Initialize common utilities
    if (!window.CommonUtils || !CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        return;
    }
    
    // Load messages data
    loadMessages();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup real-time listener
    setupRealtimeListener();
}

// Load messages from Firebase
async function loadMessages() {
    try {
        CommonUtils.showLoading(true, 'Loading messages...');
        
        const { db, COLLECTIONS, currentUser, currentProperty } = CommonUtils;
        
        // Build query based on user permissions
        let messagesQuery;
        
        if (currentUser.permissions.properties.includes('all')) {
            messagesQuery = db.collection(COLLECTIONS.MESSAGES)
                .orderBy(sortField, sortDirection);
        } else {
            messagesQuery = db.collection(COLLECTIONS.MESSAGES)
                .where('property', '==', currentProperty)
                .orderBy(sortField, sortDirection);
        }
        
        const snapshot = await messagesQuery.get();
        messagesData = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            messagesData.push({
                id: doc.id,
                ...data,
                // Convert Firestore timestamp to Date if needed
                timestamp: data.timestamp ? data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp) : null,
                readAt: data.readAt ? data.readAt.toDate ? data.readAt.toDate() : new Date(data.readAt) : null,
                repliedAt: data.repliedAt ? data.repliedAt.toDate ? data.repliedAt.toDate() : new Date(data.repliedAt) : null
            });
        });
        
        console.log(`Loaded ${messagesData.length} messages`);
        
        // Apply filters
        applyFilters();
        
        // Render messages
        renderMessages();
        
        // Update stats
        updateStats();
        
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error loading messages:', error);
        CommonUtils.showNotification('Failed to load messages', 'error');
        CommonUtils.showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Filter inputs
    const filterInputs = ['propertyFilter', 'statusFilter', 'searchInput'];
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(applyFilters, 300));
        }
    });
    
    // Date filters
    const dateFilters = ['dateFrom', 'dateTo'];
    dateFilters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Items per page selector
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', function() {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            renderMessagesTable();
            updatePagination();
        });
    }
    
    // Pagination buttons
    document.getElementById('firstPageBtn')?.addEventListener('click', () => goToPage(1));
    document.getElementById('prevPageBtn')?.addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPageBtn')?.addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPageBtn')?.addEventListener('click', () => goToPage(Math.ceil(filteredMessages.length / itemsPerPage)));
    
    // Compose button
    const composeBtn = document.getElementById('composeMessageBtn');
    if (composeBtn) {
        composeBtn.addEventListener('click', showComposeModal);
    }
    
    // Mark all as read button
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportMessagesBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportMessages);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshMessagesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshMessages);
    }
    
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const field = this.dataset.field;
            if (sortField === field) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                sortDirection = 'desc';
            }
            
            // Update sort indicators
            updateSortIndicators();
            
            // Reload messages with new sort
            loadMessages();
        });
    });
}

// Setup real-time listener
function setupRealtimeListener() {
    const { db, COLLECTIONS, currentUser, currentProperty } = CommonUtils;
    
    let messagesQuery;
    
    if (currentUser.permissions.properties.includes('all')) {
        messagesQuery = db.collection(COLLECTIONS.MESSAGES)
            .orderBy('timestamp', 'desc');
    } else {
        messagesQuery = db.collection(COLLECTIONS.MESSAGES)
            .where('property', '==', currentProperty)
            .orderBy('timestamp', 'desc');
    }
    
    messagesQuery.onSnapshot((snapshot) => {
        messagesData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            messagesData.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp) : null,
                readAt: data.readAt ? data.readAt.toDate ? data.readAt.toDate() : new Date(data.readAt) : null,
                repliedAt: data.repliedAt ? data.repliedAt.toDate ? data.repliedAt.toDate() : new Date(data.repliedAt) : null
            });
        });
        
        applyFilters();
        renderMessages();
        updateStats();
        
        // Update dashboard badge
        updateUnreadMessagesCount();
        
    }, (error) => {
        console.error('Realtime listener error:', error);
        CommonUtils.showNotification('Realtime updates disconnected', 'warning');
    });
}

// Clear filters
function clearFilters() {
    document.getElementById('propertyFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    applyFilters();
    CommonUtils.showNotification('Filters cleared', 'info');
}

// Apply filters
function applyFilters() {
    const propertyFilter = document.getElementById('propertyFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    
    filteredMessages = messagesData.filter(message => {
        // Property filter
        if (propertyFilter !== 'all' && message.property !== propertyFilter) {
            return false;
        }
        
        // Status filter (read/unread)
        if (statusFilter !== 'all') {
            const isRead = message.read === true;
            if (statusFilter === 'read' && !isRead) return false;
            if (statusFilter === 'unread' && isRead) return false;
        }
        
        // Search filter
        if (searchInput) {
            const searchStr = searchInput.toLowerCase();
            const messageText = [
                message.name || '',
                message.email || '',
                message.subject || '',
                message.message || '',
                message.property || ''
            ].join(' ').toLowerCase();
            
            if (!messageText.includes(searchStr)) {
                return false;
            }
        }
        
        // Date range filter
        if (dateFrom && message.timestamp) {
            const messageDate = new Date(message.timestamp);
            const filterFrom = new Date(dateFrom);
            
            if (messageDate < filterFrom) {
                return false;
            }
        }
        
        if (dateTo && message.timestamp) {
            const messageDate = new Date(message.timestamp);
            const filterTo = new Date(dateTo);
            
            if (messageDate > filterTo) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort filtered messages
    filteredMessages = CommonUtils.sortData(filteredMessages, sortField, sortDirection);
    
    // Reset to first page
    currentPage = 1;
    
    // Update display
    updatePagination();
    renderMessagesTable();
}

// Render messages
function renderMessages() {
    renderMessagesTable();
    updatePagination();
}

// Render messages table
function renderMessagesTable() {
    const tableBody = document.getElementById('messagesTableBody');
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
    
    if (paginatedMessages.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <h4>No messages found</h4>
                    <p>Try adjusting your filters</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    paginatedMessages.forEach((message, index) => {
        const isRead = message.read === true;
        const rowClass = isRead ? '' : 'unread-message';
        const senderInitial = message.name ? message.name.charAt(0).toUpperCase() : '?';
        
        html += `
            <tr class="${rowClass}" onclick="viewMessage('${message.id}')" style="cursor: pointer;">
                <td>${startIndex + index + 1}</td>
                <td>
                    <div class="message-sender">
                        <div class="sender-name">
                            <strong>${message.name || 'Unknown'}</strong>
                            ${!isRead ? '<span class="unread-indicator"></span>' : ''}
                        </div>
                        <div class="sender-email">${message.email || 'No email'}</div>
                    </div>
                </td>
                <td>
                    <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(message.property)}">
                        <i class="${CommonUtils.getPropertyIcon(message.property)}"></i>
                        ${CommonUtils.PROPERTY_NAMES[message.property] || message.property || 'All'}
                    </span>
                </td>
                <td>
                    <div class="message-subject">
                        <strong>${message.subject || 'No Subject'}</strong>
                        <div class="message-preview">${(message.message || '').substring(0, 100)}${message.message && message.message.length > 100 ? '...' : ''}</div>
                    </div>
                </td>
                <td>
                    <div class="message-date">
                        ${CommonUtils.getTimeAgo(message.timestamp)}
                        <br>
                        <small>${CommonUtils.formatDate(message.timestamp)}</small>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${isRead ? 'status-read' : 'status-unread'}">
                        ${isRead ? 'READ' : 'UNREAD'}
                    </span>
                </td>
                <td>
                    ${message.replied ? 
                        '<span class="replied-indicator" title="Replied"><i class="fas fa-reply"></i></span>' : 
                        '<span class="not-replied" title="Not replied"><i class="fas fa-clock"></i></span>'
                    }
                </td>
                <td>
                    <div class="message-actions" onclick="event.stopPropagation()">
                        <button class="action-btn btn-view" onclick="viewMessage('${message.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-reply" onclick="replyToMessage('${message.id}')" title="Reply">
                            <i class="fas fa-reply"></i>
                        </button>
                        ${CommonUtils.checkPermission('delete') ? 
                            `<button class="action-btn btn-delete" onclick="deleteMessage('${message.id}')" title="Delete">
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
    const paginationContainer = document.getElementById('messagesPagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
    
    // Update pagination info
    document.getElementById('startIndex').textContent = filteredMessages.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    document.getElementById('endIndex').textContent = Math.min(currentPage * itemsPerPage, filteredMessages.length);
    document.getElementById('totalMessages').textContent = filteredMessages.length;
    
    // Update button states
    document.getElementById('firstPageBtn').disabled = currentPage === 1;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    document.getElementById('lastPageBtn').disabled = currentPage === totalPages;
    
    if (totalPages <= 1) {
        document.getElementById('pageNumbers').innerHTML = '';
        return;
    }
    
    // Generate page numbers
    let pageNumbersHTML = '';
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust if we're near the beginning
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Show first page and ellipsis if needed
    if (startPage > 1) {
        pageNumbersHTML += `<div class="page-number" onclick="goToPage(1)">1</div>`;
        if (startPage > 2) {
            pageNumbersHTML += `<div class="page-ellipsis">...</div>`;
        }
    }
    
    // Show page numbers
    for (let i = startPage; i <= endPage; i++) {
        pageNumbersHTML += `
            <div class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </div>
        `;
    }
    
    // Show last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbersHTML += `<div class="page-ellipsis">...</div>`;
        }
        pageNumbersHTML += `<div class="page-number" onclick="goToPage(${totalPages})">${totalPages}</div>`;
    }
    
    document.getElementById('pageNumbers').innerHTML = pageNumbersHTML;
}

// Go to page
function goToPage(page) {
    const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
    
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    
    currentPage = page;
    renderMessagesTable();
    updatePagination();
}

// Update stats
function updateStats() {
    const stats = {
        total: messagesData.length,
        unread: 0,
        replied: 0,
        today: 0
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    messagesData.forEach(message => {
        if (!message.read) stats.unread++;
        if (message.replied) stats.replied++;
        
        // Messages from today
        if (message.timestamp) {
            const messageDate = new Date(message.timestamp);
            messageDate.setHours(0, 0, 0, 0);
            
            if (messageDate.getTime() === today.getTime()) {
                stats.today++;
            }
        }
    });
    
    // Update DOM elements
    document.getElementById('totalMessagesCount').textContent = stats.total;
    document.getElementById('unreadMessagesCount').textContent = stats.unread;
    document.getElementById('repliedMessagesCount').textContent = stats.replied;
    document.getElementById('todayMessagesCount').textContent = stats.today;
    
    // Update change indicators
    const messagesChange = document.getElementById('messagesChange');
    const unreadChange = document.getElementById('unreadChange');
    const repliedChange = document.getElementById('repliedChange');
    const todayChange = document.getElementById('todayChange');
    
    messagesChange.textContent = stats.total > 0 ? `${stats.total} total` : 'No messages';
    unreadChange.textContent = stats.unread > 0 ? `${stats.unread} require attention` : 'All read';
    repliedChange.textContent = stats.replied > 0 ? `${stats.replied} of ${stats.total}` : 'None replied';
    todayChange.textContent = stats.today > 0 ? `${stats.today} new today` : 'No new messages';
}

// Update unread messages count for dashboard
function updateUnreadMessagesCount() {
    const unreadCount = messagesData.filter(m => !m.read).length;
    
    // Update dashboard badge
    const badge = document.querySelector('[data-module="messages"] .badge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// View message details
async function viewMessage(messageId) {
    const message = messagesData.find(m => m.id === messageId);
    if (!message) return;
    
    // Mark as read if unread
    if (!message.read) {
        await markAsRead(messageId);
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${message.subject || 'No Subject'}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="message-details">
                    <div class="message-header">
                        <div class="sender-info">
                            <div class="sender-avatar">
                                ${message.name ? message.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div class="sender-details">
                                <h5>${message.name || 'Unknown'}</h5>
                                <p>${message.email || 'No email provided'}</p>
                                <p>
                                    <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(message.property)}">
                                        <i class="${CommonUtils.getPropertyIcon(message.property)}"></i>
                                        ${CommonUtils.PROPERTY_NAMES[message.property] || message.property || 'All Properties'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="message-meta">
                            <div class="message-date">
                                <i class="fas fa-clock"></i>
                                ${CommonUtils.formatDate(message.timestamp, true)}
                            </div>
                            <div class="message-status">
                                ${message.read ? 
                                    '<span class="status-read"><i class="fas fa-check-circle"></i> Read</span>' : 
                                    '<span class="status-unread"><i class="fas fa-envelope"></i> Unread</span>'
                                }
                                ${message.replied ? 
                                    '<span class="status-replied"><i class="fas fa-reply"></i> Replied</span>' : 
                                    '<span class="status-not-replied"><i class="fas fa-clock"></i> Not replied</span>'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <div class="message-content">
                        <h4>Message:</h4>
                        <div class="message-body">${formatMessageText(message.message)}</div>
                    </div>
                    
                    ${message.phone ? `
                        <div class="message-contact">
                            <h4>Contact Information:</h4>
                            <p><i class="fas fa-phone"></i> ${message.phone}</p>
                        </div>
                    ` : ''}
                    
                    ${message.preferredContact ? `
                        <div class="message-preferences">
                            <h4>Preferred Contact Method:</h4>
                            <p>${message.preferredContact}</p>
                        </div>
                    ` : ''}
                    
                    ${message.reply ? `
                        <div class="message-reply">
                            <h4>Your Reply:</h4>
                            <div class="reply-body">
                                <div class="reply-header">
                                    <strong>Replied by: ${message.repliedBy || 'Admin'}</strong>
                                    <small>${CommonUtils.formatDate(message.repliedAt, true)}</small>
                                </div>
                                <div class="reply-content">${formatMessageText(message.reply)}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                ${!message.replied ? 
                    `<button class="btn btn-primary" onclick="replyToMessage('${message.id}'); this.closest('.modal').remove()">
                        <i class="fas fa-reply"></i> Reply
                    </button>` : 
                    `<button class="btn btn-warning" onclick="replyToMessage('${message.id}'); this.closest('.modal').remove()">
                        <i class="fas fa-edit"></i> Edit Reply
                    </button>`
                }
                <button class="btn btn-danger" onclick="deleteMessage('${message.id}'); this.closest('.modal').remove()">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Format message text (preserve line breaks)
function formatMessageText(text) {
    if (!text) return '<em>No message content</em>';
    return text.replace(/\n/g, '<br>');
}

// Mark message as read
async function markAsRead(messageId) {
    try {
        const { db, COLLECTIONS, currentUser } = CommonUtils;
        
        await db.collection(COLLECTIONS.MESSAGES).doc(messageId).update({
            read: true,
            readAt: new Date(),
            readBy: currentUser.name || 'Admin',
            updatedAt: new Date()
        });
        
        // Update local data
        const messageIndex = messagesData.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            messagesData[messageIndex].read = true;
            messagesData[messageIndex].readAt = new Date();
            messagesData[messageIndex].readBy = currentUser.name || 'Admin';
        }
        
        // Update UI
        updateStats();
        updateUnreadMessagesCount();
        
    } catch (error) {
        console.error('Error marking message as read:', error);
        CommonUtils.showNotification('Failed to mark message as read', 'error');
    }
}

// Mark all as read
async function markAllAsRead() {
    CommonUtils.showConfirm(
        'Mark all unread messages as read?',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Marking messages as read...');
                
                const { db, COLLECTIONS, currentUser } = CommonUtils;
                
                // Get all unread messages
                const unreadMessages = messagesData.filter(m => !m.read);
                
                // Update each message
                for (const message of unreadMessages) {
                    await db.collection(COLLECTIONS.MESSAGES).doc(message.id).update({
                        read: true,
                        readAt: new Date(),
                        readBy: currentUser.name || 'Admin',
                        updatedAt: new Date()
                    });
                    
                    // Update local data
                    message.read = true;
                    message.readAt = new Date();
                    message.readBy = currentUser.name || 'Admin';
                }
                
                CommonUtils.showNotification(`${unreadMessages.length} messages marked as read!`, 'success');
                CommonUtils.showLoading(false);
                
                // Update UI
                updateStats();
                updateUnreadMessagesCount();
                renderMessagesTable();
                
            } catch (error) {
                console.error('Error marking all as read:', error);
                CommonUtils.showNotification('Failed to mark messages as read', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Reply to message
function replyToMessage(messageId) {
    const message = messagesData.find(m => m.id === messageId);
    if (!message) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Reply to ${message.name || 'Guest'}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="original-message">
                    <h4>Original Message:</h4>
                    <div class="message-preview">
                        <strong>From:</strong> ${message.name || 'Unknown'} &lt;${message.email || 'No email'}&gt;<br>
                        <strong>Subject:</strong> ${message.subject || 'No Subject'}<br>
                        <strong>Message:</strong> ${(message.message || '').substring(0, 200)}${message.message && message.message.length > 200 ? '...' : ''}
                    </div>
                </div>
                
                <form id="replyForm" onsubmit="sendReply(event, '${message.id}')">
                    <div class="form-group">
                        <label for="replySubject">Subject *</label>
                        <input type="text" id="replySubject" class="form-control" 
                               value="Re: ${message.subject || 'Your Message'}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="replyMessage">Your Reply *</label>
                        <textarea id="replyMessage" class="form-control" rows="6" required 
                                  placeholder="Type your reply here...">${message.reply || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="sendCopy" checked>
                            <label for="sendCopy">Send a copy to my email</label>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> ${message.reply ? 'Update Reply' : 'Send Reply'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Send reply
async function sendReply(event, messageId) {
    event.preventDefault();
    
    try {
        CommonUtils.showLoading(true, 'Sending reply...');
        
        const { db, COLLECTIONS, currentUser } = CommonUtils;
        const message = messagesData.find(m => m.id === messageId);
        
        if (!message) {
            throw new Error('Message not found');
        }
        
        const replyData = {
            reply: document.getElementById('replyMessage').value,
            replied: true,
            repliedAt: new Date(),
            repliedBy: currentUser.name || 'Admin',
            updatedAt: new Date()
        };
        
        await db.collection(COLLECTIONS.MESSAGES).doc(messageId).update(replyData);
        
        // Update local data
        const messageIndex = messagesData.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            messagesData[messageIndex] = {
                ...messagesData[messageIndex],
                ...replyData
            };
        }
        
        // Send email notification (mock implementation)
        const sendCopy = document.getElementById('sendCopy').checked;
        if (sendCopy) {
            await sendEmailNotification(message, replyData.reply);
        }
        
        // Close modal
        document.querySelector('.modal')?.remove();
        
        CommonUtils.showNotification('Reply sent successfully!', 'success');
        CommonUtils.showLoading(false);
        
        // Update UI
        updateStats();
        renderMessagesTable();
        
    } catch (error) {
        console.error('Error sending reply:', error);
        CommonUtils.showNotification('Failed to send reply', 'error');
        CommonUtils.showLoading(false);
    }
}

// Send email notification (mock function)
async function sendEmailNotification(message, reply) {
    // In a real application, this would call a cloud function
    // or use an email service like SendGrid, Mailgun, etc.
    
    console.log('Sending email notification:', {
        to: message.email,
        subject: `Re: ${message.subject || 'Your Message'}`,
        reply: reply.substring(0, 100) + '...'
    });
    
    // Simulate API call
    return new Promise(resolve => setTimeout(resolve, 1000));
}

// Delete message
async function deleteMessage(messageId) {
    CommonUtils.showConfirm(
        'Are you sure you want to delete this message? This action cannot be undone.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting message...');
                
                const { db, COLLECTIONS } = CommonUtils;
                
                await db.collection(COLLECTIONS.MESSAGES).doc(messageId).delete();
                
                // Remove from local data
                messagesData = messagesData.filter(m => m.id !== messageId);
                filteredMessages = filteredMessages.filter(m => m.id !== messageId);
                
                CommonUtils.showNotification('Message deleted successfully!', 'success');
                CommonUtils.showLoading(false);
                
                // Update UI
                updateStats();
                updateUnreadMessagesCount();
                renderMessagesTable();
                updatePagination();
                
            } catch (error) {
                console.error('Error deleting message:', error);
                CommonUtils.showNotification('Failed to delete message', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Show compose modal
function showComposeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Compose New Message</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="composeForm" onsubmit="sendNewMessage(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="composeTo">To *</label>
                            <input type="email" id="composeTo" class="form-control" 
                                   placeholder="recipient@example.com" required>
                        </div>
                        <div class="form-group">
                            <label for="composeProperty">Property</label>
                            <select id="composeProperty" class="form-control">
                                <option value="">Select Property (Optional)</option>
                                <option value="limuru">Limuru Country Home</option>
                                <option value="kanamai">Kanamai Beach Resort</option>
                                <option value="kisumu">Kisumu Hotel</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="composeSubject">Subject *</label>
                        <input type="text" id="composeSubject" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="composeMessage">Message *</label>
                        <textarea id="composeMessage" class="form-control" rows="8" required 
                                  placeholder="Type your message here..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Send new message
async function sendNewMessage(event) {
    event.preventDefault();
    
    try {
        CommonUtils.showLoading(true, 'Sending message...');
        
        const { db, COLLECTIONS, currentUser } = CommonUtils;
        
        const messageData = {
            name: 'System Admin',
            email: document.getElementById('composeTo').value,
            subject: document.getElementById('composeSubject').value,
            message: document.getElementById('composeMessage').value,
            property: document.getElementById('composeProperty').value || null,
            source: 'admin',
            read: false,
            replied: false,
            timestamp: new Date(),
            createdAt: new Date(),
            createdBy: currentUser.name || 'Admin',
            updatedAt: new Date()
        };
        
        const docRef = await db.collection(COLLECTIONS.MESSAGES).add(messageData);
        
        // Add to local data
        messagesData.unshift({
            id: docRef.id,
            ...messageData
        });
        
        // Close modal
        document.querySelector('.modal')?.remove();
        
        CommonUtils.showNotification('Message sent successfully!', 'success');
        CommonUtils.showLoading(false);
        
        // Update UI
        applyFilters();
        renderMessagesTable();
        updateStats();
        
    } catch (error) {
        console.error('Error sending message:', error);
        CommonUtils.showNotification('Failed to send message', 'error');
        CommonUtils.showLoading(false);
    }
}

// Export messages
function exportMessages() {
    const exportData = filteredMessages.map(message => ({
        'From': message.name || 'Unknown',
        'Email': message.email || 'N/A',
        'Property': CommonUtils.PROPERTY_NAMES[message.property] || message.property || 'All',
        'Subject': message.subject || 'No Subject',
        'Message': message.message || '',
        'Phone': message.phone || 'N/A',
        'Preferred Contact': message.preferredContact || 'Email',
        'Status': message.read ? 'Read' : 'Unread',
        'Replied': message.replied ? 'Yes' : 'No',
        'Received': CommonUtils.formatDate(message.timestamp, true),
        'Read By': message.readBy || 'N/A',
        'Read At': message.readAt ? CommonUtils.formatDate(message.readAt, true) : 'N/A',
        'Replied By': message.repliedBy || 'N/A',
        'Replied At': message.repliedAt ? CommonUtils.formatDate(message.repliedAt, true) : 'N/A'
    }));
    
    CommonUtils.exportToCSV(exportData, 'jumuia_messages');
}

// Refresh messages
function refreshMessages() {
    loadMessages();
    CommonUtils.showNotification('Messages refreshed!', 'info');
}

// Update sort indicators
function updateSortIndicators() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const field = btn.dataset.field;
        const icon = btn.querySelector('i');
        
        if (field === sortField) {
            icon.className = sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        } else {
            icon.className = 'fas fa-sort';
        }
    });
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the messages module
    if (document.querySelector('[data-module="messages"]')) {
        setTimeout(() => {
            initMessagesModule();
        }, 100);
    }
});

// Export functions
window.MessagesModule = {
    initMessagesModule,
    loadMessages,
    viewMessage,
    markAsRead,
    markAllAsRead,
    replyToMessage,
    sendReply,
    deleteMessage,
    showComposeModal,
    sendNewMessage,
    refreshMessages,
    exportMessages,
    goToPage,
    applyFilters,
    clearFilters
};