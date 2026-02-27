// admin/modules/feedback.js
// Feedback & Reviews Management Module

let feedbackData = [];
let filteredFeedback = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortField = 'timestamp';
let sortDirection = 'desc';

// Feedback statuses
const FEEDBACK_STATUS = {
    PENDING: 'pending',
    PUBLISHED: 'published',
    ARCHIVED: 'archived'
};

// Initialize feedback module
function initFeedbackModule() {
    console.log('Initializing Feedback module...');

    // Initialize common utilities
    if (!window.CommonUtils || !window.CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        return;
    }

    // Load feedback data
    loadFeedback();

    // Setup event listeners
    setupEventListeners();

    // Setup real-time listener
    setupRealtimeListener();
}

// Load feedback from Node API
async function loadFeedback() {
    try {
        CommonUtils.showLoading(true, 'Loading feedback...');

        const { currentUser, currentProperty } = CommonUtils;

        // Build query based on user permissions
        let url = `${CommonUtils.API_URL}/feedback`;
        if (!currentUser.permissions.properties.includes('all')) {
            url += `?resort=${currentProperty}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch feedback');

        const data = await response.json();

        feedbackData = data.map(doc => ({
            id: doc._id || doc.id,
            ...doc,
            // Normalize mapping properties
            guestName: doc.name || doc.fullName || doc.guestName || 'Anonymous',
            property: doc.resort || doc.property,
            comment: doc.comment || doc.details,
            timestamp: doc.createdAt || doc.date || new Date().toISOString()
        }));

        // Apply filters
        applyFilters();

        // Render feedback
        renderFeedback();

        // Update stats
        updateStats();

        CommonUtils.showLoading(false);

    } catch (error) {
        console.error('Error loading feedback:', error);
        CommonUtils.showNotification('Failed to load feedback', 'error');
        CommonUtils.showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Filter inputs
    const filterInputs = ['propertyFilter', 'statusFilter', 'ratingFilter', 'searchInput'];
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

    // Bulk actions
    document.getElementById('publishSelectedBtn')?.addEventListener('click', publishSelected);
    document.getElementById('archiveSelectedBtn')?.addEventListener('click', archiveSelected);
    document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelected);

    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
    }

    // Export button
    const exportBtn = document.getElementById('exportFeedbackBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportFeedback);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshFeedbackBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshFeedback);
    }

    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const field = this.dataset.field;
            if (sortField === field) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                sortDirection = 'desc';
            }

            // Update sort indicators
            updateSortIndicators();

            // Reload feedback with new sort
            loadFeedback();
        });
    });
}

// Setup polling listener
function setupRealtimeListener() {
    // Poll the Node API every 15 seconds instead of using Firebase WebSockets
    const pollInterval = setInterval(async () => {
        try {
            const { currentUser, currentProperty } = CommonUtils;

            // Build query based on user permissions
            let url = `${CommonUtils.API_URL}/feedback`;
            if (!currentUser.permissions.properties.includes('all')) {
                url += `?resort=${currentProperty}`;
            }

            const response = await fetch(url);
            if (!response.ok) return;

            const data = await response.json();

            feedbackData = data.map(doc => ({
                id: doc._id || doc.id,
                ...doc,
                guestName: doc.name || doc.fullName || doc.guestName || 'Anonymous',
                property: doc.resort || doc.property,
                comment: doc.comment || doc.details,
                timestamp: doc.createdAt || doc.date || new Date().toISOString()
            }));

            applyFilters();
            renderFeedback();
            updateStats();
            updatePendingFeedbackCount();

        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 15000);

    // Store interval ID to clear it later if needed (e.g., when changing tabs)
    window.feedbackPollingInterval = pollInterval;
}

// Apply filters
function applyFilters() {
    const propertyFilter = document.getElementById('propertyFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const ratingFilter = document.getElementById('ratingFilter')?.value || 'all';
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;

    filteredFeedback = feedbackData.filter(feedback => {
        // Property filter
        if (propertyFilter !== 'all' && feedback.property !== propertyFilter) {
            return false;
        }

        // Status filter
        if (statusFilter !== 'all' && feedback.status !== statusFilter) {
            return false;
        }

        // Rating filter
        if (ratingFilter !== 'all' && Math.floor(feedback.rating) !== parseInt(ratingFilter)) {
            return false;
        }

        // Search filter
        if (searchInput) {
            const searchStr = searchInput.toLowerCase();
            const feedbackText = [
                feedback.guestName,
                feedback.email,
                feedback.comment,
                feedback.property
            ].join(' ').toLowerCase();

            if (!feedbackText.includes(searchStr)) {
                return false;
            }
        }

        // Date range filter
        if (dateFrom && feedback.timestamp) {
            const feedbackDate = feedback.timestamp.toDate ?
                feedback.timestamp.toDate() : new Date(feedback.timestamp);
            const filterFrom = new Date(dateFrom);

            if (feedbackDate < filterFrom) {
                return false;
            }
        }

        if (dateTo && feedback.timestamp) {
            const feedbackDate = feedback.timestamp.toDate ?
                feedback.timestamp.toDate() : new Date(feedback.timestamp);
            const filterTo = new Date(dateTo);

            if (feedbackDate > filterTo) {
                return false;
            }
        }

        return true;
    });

    // Sort filtered feedback
    filteredFeedback = CommonUtils.sortData(filteredFeedback, sortField, sortDirection);

    // Reset to first page
    currentPage = 1;

    // Update display
    updatePagination();
    renderFeedbackTable();
}

// Render feedback
function renderFeedback() {
    renderFeedbackTable();
    updatePagination();
}

// Render feedback table
function renderFeedbackTable() {
    const tableBody = document.getElementById('feedbackTableBody');
    if (!tableBody) return;

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedFeedback = filteredFeedback.slice(startIndex, endIndex);

    if (paginatedFeedback.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h4>No feedback found</h4>
                    <p>Try adjusting your filters</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    paginatedFeedback.forEach((feedback, index) => {
        const ratingStars = generateStarRating(feedback.rating);
        const statusClass = `status-${feedback.status || 'pending'}`;

        html += `
            <tr>
                <td>
                    <input type="checkbox" class="feedback-checkbox" value="${feedback.id}">
                </td>
                <td>
                    <div class="guest-info">
                        <div class="guest-avatar">
                            ${feedback.guestName?.charAt(0).toUpperCase() || 'G'}
                        </div>
                        <div class="guest-details">
                            <div class="guest-name">${feedback.guestName || 'Anonymous'}</div>
                            <div class="guest-email">${feedback.email || 'No email'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(feedback.property)}">
                        <i class="${CommonUtils.getPropertyIcon(feedback.property)}"></i>
                        ${CommonUtils.PROPERTY_NAMES[feedback.property] || feedback.property}
                    </span>
                </td>
                <td>
                    <div class="rating-display">
                        ${ratingStars}
                        <div class="rating-value">${feedback.rating?.toFixed(1) || '0.0'}</div>
                    </div>
                </td>
                <td>
                    <div class="feedback-comment">
                        ${feedback.comment ? `
                            <div class="comment-text">${truncateText(feedback.comment, 100)}</div>
                            ${feedback.comment.length > 100 ?
                    '<a href="#" onclick="event.preventDefault(); viewFullComment(\'' + feedback.id + '\')" class="read-more">Read more</a>' : ''
                }
                        ` : 'No comment'}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${(feedback.status || 'pending').toUpperCase()}
                    </span>
                </td>
                <td>
                    <div class="feedback-date">
                        ${CommonUtils.getTimeAgo(feedback.timestamp)}
                        <br>
                        <small>${CommonUtils.formatDate(feedback.timestamp)}</small>
                    </div>
                </td>
                <td>
                    ${feedback.replied ?
                '<span class="replied-indicator" title="Replied"><i class="fas fa-reply"></i></span>' :
                '<span class="not-replied" title="Not replied"><i class="fas fa-clock"></i></span>'
            }
                </td>
                <td>
                    <div class="feedback-actions">
                        <button class="action-btn btn-view" onclick="viewFeedback('${feedback.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${feedback.status !== FEEDBACK_STATUS.PUBLISHED ?
                `<button class="action-btn btn-publish" onclick="updateFeedbackStatus('${feedback.id}', '${FEEDBACK_STATUS.PUBLISHED}')" title="Publish">
                                <i class="fas fa-check"></i>
                            </button>` : ''
            }
                        ${feedback.status !== FEEDBACK_STATUS.ARCHIVED ?
                `<button class="action-btn btn-archive" onclick="updateFeedbackStatus('${feedback.id}', '${FEEDBACK_STATUS.ARCHIVED}')" title="Archive">
                                <i class="fas fa-archive"></i>
                            </button>` : ''
            }
                        ${!feedback.replied ?
                `<button class="action-btn btn-reply" onclick="replyToFeedback('${feedback.id}')" title="Reply">
                                <i class="fas fa-reply"></i>
                            </button>` : ''
            }
                        ${CommonUtils.checkPermission('delete') ?
                `<button class="action-btn btn-delete" onclick="deleteFeedback('${feedback.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
            }
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;

    // Update select all checkbox
    updateSelectAllCheckbox();
}

// Generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '';

    // Full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }

    // Half star
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }

    return `<div class="star-rating">${starsHTML}</div>`;
}

// Truncate text
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Update pagination
function updatePagination() {
    const paginationContainer = document.getElementById('feedbackPagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.innerHTML = CommonUtils.createPagination(
        filteredFeedback.length,
        itemsPerPage,
        currentPage,
        'goToPage'
    );
}

// Go to page
function goToPage(page) {
    currentPage = page;
    renderFeedbackTable();
}

// Update stats
function updateStats() {
    const stats = {
        total: feedbackData.length,
        averageRating: 0,
        pending: 0,
        published: 0,
        archived: 0,
        today: 0
    };

    let totalRating = 0;
    const today = new Date().toISOString().split('T')[0];

    feedbackData.forEach(feedback => {
        // Count by status
        if (feedback.status === FEEDBACK_STATUS.PENDING) stats.pending++;
        if (feedback.status === FEEDBACK_STATUS.PUBLISHED) stats.published++;
        if (feedback.status === FEEDBACK_STATUS.ARCHIVED) stats.archived++;

        // Calculate average rating (only for published feedback)
        if (feedback.status === FEEDBACK_STATUS.PUBLISHED && feedback.rating) {
            totalRating += feedback.rating;
        }

        // Feedback from today
        if (feedback.timestamp) {
            const feedbackDate = feedback.timestamp.toDate ?
                feedback.timestamp.toDate().toISOString().split('T')[0] :
                new Date(feedback.timestamp).toISOString().split('T')[0];

            if (feedbackDate === today) stats.today++;
        }
    });

    // Calculate average rating
    if (stats.published > 0) {
        stats.averageRating = totalRating / stats.published;
    }

    // Update DOM elements
    document.getElementById('totalFeedbackCount')?.textContent = stats.total;
    document.getElementById('averageRating')?.textContent = stats.averageRating.toFixed(1);
    document.getElementById('pendingFeedbackCount')?.textContent = stats.pending;
    document.getElementById('publishedFeedbackCount')?.textContent = stats.published;
    document.getElementById('todayFeedbackCount')?.textContent = stats.today;

    // Update star rating display
    const avgRatingElement = document.getElementById('averageRatingStars');
    if (avgRatingElement) {
        avgRatingElement.innerHTML = generateStarRating(stats.averageRating);
    }
}

// Update pending feedback count for dashboard
function updatePendingFeedbackCount() {
    const pendingCount = feedbackData.filter(f => f.status === FEEDBACK_STATUS.PENDING).length;

    // Update dashboard badge
    const badge = document.querySelector('[data-module="feedback"] .badge');
    if (badge) {
        badge.textContent = pendingCount;
    }
}

// View feedback details
function viewFeedback(feedbackId) {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Feedback Details</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="feedback-details">
                    <div class="feedback-header">
                        <div class="guest-info-large">
                            <div class="guest-avatar-large">
                                ${feedback.guestName?.charAt(0).toUpperCase() || 'G'}
                            </div>
                            <div class="guest-details-large">
                                <h4>${feedback.guestName || 'Anonymous'}</h4>
                                <p>${feedback.email || 'No email provided'}</p>
                                <p>
                                    <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(feedback.property)}">
                                        <i class="${CommonUtils.getPropertyIcon(feedback.property)}"></i>
                                        ${CommonUtils.PROPERTY_NAMES[feedback.property] || feedback.property}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="feedback-meta">
                            <div class="rating-large">
                                ${generateStarRating(feedback.rating)}
                                <div class="rating-value-large">${feedback.rating?.toFixed(1) || '0.0'}/5.0</div>
                            </div>
                            <div class="feedback-date-large">
                                <i class="fas fa-clock"></i>
                                ${CommonUtils.formatDate(feedback.timestamp, true)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="feedback-content">
                        <h4>Review:</h4>
                        <div class="feedback-comment-full">${formatFeedbackText(feedback.comment)}</div>
                    </div>
                    
                    <div class="feedback-status-info">
                        <h4>Status Information:</h4>
                        <div class="status-details">
                            <div class="status-item">
                                <strong>Status:</strong>
                                <span class="status-badge status-${feedback.status || 'pending'}">
                                    ${(feedback.status || 'pending').toUpperCase()}
                                </span>
                            </div>
                            ${feedback.replied ? `
                                <div class="status-item">
                                    <strong>Replied:</strong> Yes
                                </div>
                                <div class="status-item">
                                    <strong>Replied By:</strong> ${feedback.repliedBy || 'Admin'}
                                </div>
                                <div class="status-item">
                                    <strong>Replied At:</strong> ${CommonUtils.formatDate(feedback.repliedAt, true)}
                                </div>
                            ` : `
                                <div class="status-item">
                                    <strong>Replied:</strong> No
                                </div>
                            `}
                            ${feedback.publishedBy ? `
                                <div class="status-item">
                                    <strong>Published By:</strong> ${feedback.publishedBy}
                                </div>
                                <div class="status-item">
                                    <strong>Published At:</strong> ${CommonUtils.formatDate(feedback.publishedAt, true)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${feedback.reply ? `
                        <div class="feedback-reply">
                            <h4>Your Reply:</h4>
                            <div class="reply-body">
                                <div class="reply-header">
                                    <strong>Replied by: ${feedback.repliedBy || 'Admin'}</strong>
                                    <small>${CommonUtils.formatDate(feedback.repliedAt, true)}</small>
                                </div>
                                <div class="reply-content">${formatFeedbackText(feedback.reply)}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                ${feedback.status !== FEEDBACK_STATUS.PUBLISHED ?
            `<button class="btn btn-success" onclick="updateFeedbackStatus('${feedback.id}', '${FEEDBACK_STATUS.PUBLISHED}'); this.closest('.modal').remove()">
                        <i class="fas fa-check"></i> Publish
                    </button>` : ''
        }
                ${!feedback.replied ?
            `<button class="btn btn-primary" onclick="replyToFeedback('${feedback.id}'); this.closest('.modal').remove()">
                        <i class="fas fa-reply"></i> Reply
                    </button>` : ''
        }
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Format feedback text (preserve line breaks)
function formatFeedbackText(text) {
    if (!text) return 'No comment provided.';
    return text.replace(/\n/g, '<br>');
}

// View full comment
function viewFullComment(feedbackId) {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback || !feedback.comment) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Full Comment</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="full-comment">
                    ${formatFeedbackText(feedback.comment)}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Update feedback status
async function updateFeedbackStatus(feedbackId, newStatus) {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback) return;

    const statusMessages = {
        'published': 'Publish this feedback? It will be visible on the website.',
        'archived': 'Archive this feedback? It will be hidden from the website.',
        'pending': 'Mark this feedback as pending?'
    };

    const action = statusMessages[newStatus] || 'Update feedback status?';

    CommonUtils.showConfirm(
        `Are you sure you want to ${action.toLowerCase()}`,
        async () => {
            try {
                CommonUtils.showLoading(true, 'Updating feedback...');

                const response = await fetch(`${CommonUtils.API_URL}/feedback/${feedbackId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: newStatus,
                        updatedBy: CommonUtils.currentUser.name || 'Admin',
                        publishedBy: newStatus === FEEDBACK_STATUS.PUBLISHED ? (CommonUtils.currentUser.name || 'Admin') : undefined
                    })
                });

                if (!response.ok) throw new Error('Failed to update status');

                CommonUtils.showNotification(`Feedback ${newStatus} successfully!`, 'success');
                loadFeedback(); // refresh data

            } catch (error) {
                console.error('Error updating feedback status:', error);
                CommonUtils.showNotification('Failed to update feedback', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Reply to feedback
function replyToFeedback(feedbackId) {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Reply to ${feedback.guestName || 'Guest'}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="original-feedback">
                    <h4>Original Feedback:</h4>
                    <div class="feedback-preview">
                        <strong>Rating:</strong> ${feedback.rating?.toFixed(1) || '0.0'}/5.0<br>
                        <strong>Comment:</strong> ${(feedback.comment || '').substring(0, 200)}...
                    </div>
                </div>
                
                <form id="feedbackReplyForm" onsubmit="sendFeedbackReply(event, '${feedback.id}')">
                    <div class="form-group">
                        <label for="replyMessage">Your Reply *</label>
                        <textarea id="replyMessage" class="form-control" rows="6" required 
                                  placeholder="Type your reply here...">${feedback.reply || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Reply
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Send feedback reply
async function sendFeedbackReply(event, feedbackId) {
    event.preventDefault();

    try {
        CommonUtils.showLoading(true, 'Sending reply...');

        const { db, COLLECTIONS, currentUser } = CommonUtils;
        const feedback = feedbackData.find(f => f.id === feedbackId);

        if (!feedback) {
            throw new Error('Feedback not found');
        }

        const replyData = {
            reply: document.getElementById('replyMessage').value,
            replied: true,
            repliedAt: firebase.firestore.FieldValue.serverTimestamp(),
            repliedBy: currentUser.name || 'Admin',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTIONS.FEEDBACK).doc(feedbackId).update(replyData);

        // Send email notification
        if (feedback.email) {
            await sendFeedbackEmailNotification(feedback, replyData.reply);
        }

        // Close modal
        document.querySelector('.modal')?.remove();

        CommonUtils.showNotification('Reply sent successfully!', 'success');
        CommonUtils.showLoading(false);

    } catch (error) {
        console.error('Error sending reply:', error);
        CommonUtils.showNotification('Failed to send reply', 'error');
        CommonUtils.showLoading(false);
    }
}

// Send email notification for feedback reply
async function sendFeedbackEmailNotification(feedback, reply) {
    // In a real application, this would call a cloud function
    // or use an email service like SendGrid, Mailgun, etc.

    console.log('Sending feedback reply email:', {
        to: feedback.email,
        subject: `Response to your feedback at ${CommonUtils.PROPERTY_NAMES[feedback.property] || feedback.property}`,
        reply: reply.substring(0, 100) + '...'
    });

    // Simulate API call
    return new Promise(resolve => setTimeout(resolve, 1000));
}

// Delete feedback
async function deleteFeedback(feedbackId) {
    CommonUtils.showConfirm(
        'Are you sure you want to delete this feedback? This action cannot be undone.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting feedback...');

                const { db, COLLECTIONS } = CommonUtils;

                await db.collection(COLLECTIONS.FEEDBACK).doc(feedbackId).delete();

                CommonUtils.showNotification('Feedback deleted successfully!', 'success');
                CommonUtils.showLoading(false);

            } catch (error) {
                console.error('Error deleting feedback:', error);
                CommonUtils.showNotification('Failed to delete feedback', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Toggle select all
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.feedback-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Update select all checkbox
function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('.feedback-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    if (!selectAllCheckbox || checkboxes.length === 0) return;

    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    const someChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
}

// Get selected feedback IDs
function getSelectedFeedbackIds() {
    const checkboxes = document.querySelectorAll('.feedback-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.value);
}

// Publish selected feedback
async function publishSelected() {
    const selectedIds = getSelectedFeedbackIds();
    if (selectedIds.length === 0) {
        CommonUtils.showNotification('Please select feedback to publish', 'error');
        return;
    }

    CommonUtils.showConfirm(
        `Publish ${selectedIds.length} selected feedback items?`,
        async () => {
            try {
                CommonUtils.showLoading(true, 'Publishing feedback...');

                // Send individual requests for each selected feedback
                await Promise.all(selectedIds.map(feedbackId => {
                    return fetch(`${CommonUtils.API_URL}/feedback/${feedbackId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: FEEDBACK_STATUS.PUBLISHED,
                            publishedBy: CommonUtils.currentUser.name || 'Admin',
                            updatedBy: CommonUtils.currentUser.name || 'Admin'
                        })
                    });
                }));

                CommonUtils.showNotification(`${selectedIds.length} feedback items published!`, 'success');
                loadFeedback(); // refresh data

                // Clear selection
                document.getElementById('selectAllCheckbox').checked = false;

            } catch (error) {
                console.error('Error publishing selected feedback:', error);
                CommonUtils.showNotification('Failed to publish feedback', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Archive selected feedback
async function archiveSelected() {
    const selectedIds = getSelectedFeedbackIds();
    if (selectedIds.length === 0) {
        CommonUtils.showNotification('Please select feedback to archive', 'error');
        return;
    }

    CommonUtils.showConfirm(
        `Archive ${selectedIds.length} selected feedback items?`,
        async () => {
            try {
                CommonUtils.showLoading(true, 'Archiving feedback...');

                await Promise.all(selectedIds.map(feedbackId => {
                    return fetch(`${CommonUtils.API_URL}/feedback/${feedbackId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: FEEDBACK_STATUS.ARCHIVED,
                            updatedBy: CommonUtils.currentUser.name || 'Admin'
                        })
                    });
                }));

                CommonUtils.showNotification(`${selectedIds.length} feedback items archived!`, 'success');
                loadFeedback(); // refresh data

                // Clear selection
                document.getElementById('selectAllCheckbox').checked = false;

            } catch (error) {
                console.error('Error archiving selected feedback:', error);
                CommonUtils.showNotification('Failed to archive feedback', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Delete selected feedback
async function deleteSelected() {
    const selectedIds = getSelectedFeedbackIds();
    if (selectedIds.length === 0) {
        CommonUtils.showNotification('Please select feedback to delete', 'error');
        return;
    }

    CommonUtils.showConfirm(
        `Delete ${selectedIds.length} selected feedback items? This action cannot be undone.`,
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting feedback...');

                await Promise.all(selectedIds.map(feedbackId => {
                    return fetch(`${CommonUtils.API_URL}/feedback/${feedbackId}`, {
                        method: 'DELETE'
                    });
                }));

                CommonUtils.showNotification(`${selectedIds.length} feedback items deleted!`, 'success');
                loadFeedback(); // refresh data

                // Clear selection
                document.getElementById('selectAllCheckbox').checked = false;

            } catch (error) {
                console.error('Error deleting selected feedback:', error);
                CommonUtils.showNotification('Failed to delete feedback', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Export feedback
function exportFeedback() {
    const exportData = filteredFeedback.map(feedback => ({
        'Guest Name': feedback.guestName || 'Anonymous',
        'Email': feedback.email || 'N/A',
        'Property': CommonUtils.PROPERTY_NAMES[feedback.property] || feedback.property,
        'Rating': feedback.rating?.toFixed(1) || '0.0',
        'Comment': feedback.comment || 'No comment',
        'Status': feedback.status || 'pending',
        'Replied': feedback.replied ? 'Yes' : 'No',
        'Reply': feedback.reply || 'N/A',
        'Submitted': CommonUtils.formatDate(feedback.timestamp, true),
        'Published By': feedback.publishedBy || 'N/A',
        'Published At': feedback.publishedAt ? CommonUtils.formatDate(feedback.publishedAt, true) : 'N/A',
        'Replied By': feedback.repliedBy || 'N/A',
        'Replied At': feedback.repliedAt ? CommonUtils.formatDate(feedback.repliedAt, true) : 'N/A'
    }));

    CommonUtils.exportToCSV(exportData, 'jumuia_feedback');
}

// Refresh feedback
function refreshFeedback() {
    loadFeedback();
    CommonUtils.showNotification('Feedback refreshed!', 'info');
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
document.addEventListener('DOMContentLoaded', function () {
    // Check if we're on the feedback module
    if (document.querySelector('[data-module="feedback"]')) {
        setTimeout(() => {
            initFeedbackModule();
        }, 100);
    }
});

// Export functions
window.FeedbackModule = {
    initFeedbackModule,
    loadFeedback,
    viewFeedback,
    updateFeedbackStatus,
    replyToFeedback,
    sendFeedbackReply,
    deleteFeedback,
    publishSelected,
    archiveSelected,
    deleteSelected,
    refreshFeedback,
    exportFeedback,
    goToPage,
    FEEDBACK_STATUS
};