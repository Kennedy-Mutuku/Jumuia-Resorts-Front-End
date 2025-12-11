// admin/modules/offers.js
// Offers Management Module

let offersData = [];
let filteredOffers = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortField = 'createdAt';
let sortDirection = 'desc';

// Initialize offers module
function initOffersModule() {
    console.log('Initializing Offers module...');
    
    // Initialize common utilities
    if (!window.CommonUtils || !window.CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        return;
    }
    
    // Load offers data
    loadOffers();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup real-time listener
    setupRealtimeListener();
}

// Load offers from Firebase
async function loadOffers() {
    try {
        CommonUtils.showLoading(true, 'Loading offers...');
        
        const { db, COLLECTIONS, currentUser, currentProperty } = CommonUtils;
        
        // Build query based on user permissions
        let offersQuery;
        
        if (currentUser.permissions.properties.includes('all')) {
            offersQuery = firebase.firestore()
                .collection(COLLECTIONS.OFFERS)
                .orderBy(sortField, sortDirection);
        } else {
            offersQuery = firebase.firestore()
                .collection(COLLECTIONS.OFFERS)
                .where('property', '==', currentProperty)
                .orderBy(sortField, sortDirection);
        }
        
        const snapshot = await offersQuery.get();
        offersData = [];
        
        snapshot.forEach(doc => {
            offersData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Apply filters
        applyFilters();
        
        // Render offers
        renderOffers();
        
        // Update stats
        updateStats();
        
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error loading offers:', error);
        CommonUtils.showNotification('Failed to load offers', 'error');
        CommonUtils.showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Filter inputs
    const filterInputs = ['propertyFilter', 'statusFilter', 'categoryFilter', 'searchInput'];
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
    
    // Create offer button
    const createBtn = document.getElementById('createOfferBtn');
    if (createBtn) {
        createBtn.addEventListener('click', showOfferModal);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportOffersBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportOffers);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshOffersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshOffers);
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
            
            // Reload offers with new sort
            loadOffers();
        });
    });
}

// Setup real-time listener
function setupRealtimeListener() {
    const { db, COLLECTIONS, currentUser, currentProperty } = CommonUtils;
    
    let offersQuery;
    
    if (currentUser.permissions.properties.includes('all')) {
        offersQuery = firebase.firestore()
            .collection(COLLECTIONS.OFFERS)
            .orderBy('createdAt', 'desc');
    } else {
        offersQuery = firebase.firestore()
            .collection(COLLECTIONS.OFFERS)
            .where('property', '==', currentProperty)
            .orderBy('createdAt', 'desc');
    }
    
    offersQuery.onSnapshot((snapshot) => {
        offersData = [];
        snapshot.forEach(doc => {
            offersData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        applyFilters();
        renderOffers();
        updateStats();
    }, (error) => {
        console.error('Realtime listener error:', error);
    });
}

// Apply filters
function applyFilters() {
    const propertyFilter = document.getElementById('propertyFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    
    filteredOffers = offersData.filter(offer => {
        // Property filter
        if (propertyFilter !== 'all' && offer.property !== propertyFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            const status = getOfferStatus(offer);
            if (status !== statusFilter) {
                return false;
            }
        }
        
        // Category filter
        if (categoryFilter !== 'all' && offer.category !== categoryFilter) {
            return false;
        }
        
        // Search filter
        if (searchInput) {
            const searchStr = searchInput.toLowerCase();
            const offerText = [
                offer.title,
                offer.description,
                offer.offerCode,
                offer.property
            ].join(' ').toLowerCase();
            
            if (!offerText.includes(searchStr)) {
                return false;
            }
        }
        
        // Date range filter
        if (dateFrom && offer.startDate) {
            const startDate = offer.startDate.toDate ? 
                offer.startDate.toDate() : new Date(offer.startDate);
            const filterFrom = new Date(dateFrom);
            
            if (startDate < filterFrom) {
                return false;
            }
        }
        
        if (dateTo && offer.endDate) {
            const endDate = offer.endDate.toDate ? 
                offer.endDate.toDate() : new Date(offer.endDate);
            const filterTo = new Date(dateTo);
            
            if (endDate > filterTo) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort filtered offers
    filteredOffers = CommonUtils.sortData(filteredOffers, sortField, sortDirection);
    
    // Reset to first page
    currentPage = 1;
    
    // Update display
    updatePagination();
    renderOffersTable();
}

// Render offers
function renderOffers() {
    renderOffersTable();
    updatePagination();
}

// Render offers table
function renderOffersTable() {
    const tableBody = document.getElementById('offersTableBody');
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOffers = filteredOffers.slice(startIndex, endIndex);
    
    if (paginatedOffers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-gift"></i>
                    <h4>No offers found</h4>
                    <p>Try adjusting your filters or create a new offer</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    paginatedOffers.forEach((offer, index) => {
        const status = getOfferStatus(offer);
        const statusClass = `status-${status}`;
        
        html += `
            <tr>
                <td>${startIndex + index + 1}</td>
                <td>
                    <div class="offer-title-cell">
                        <strong>${offer.title}</strong>
                        ${offer.featured ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(offer.property)}">
                        <i class="${CommonUtils.getPropertyIcon(offer.property)}"></i>
                        ${CommonUtils.PROPERTY_NAMES[offer.property] || offer.property}
                    </span>
                </td>
                <td>
                    <span class="category-badge">${offer.category?.charAt(0).toUpperCase() + offer.category?.slice(1) || 'N/A'}</span>
                </td>
                <td>
                    <div class="date-range">
                        <div>${CommonUtils.formatDate(offer.startDate)}</div>
                        <div class="date-to">to ${CommonUtils.formatDate(offer.endDate)}</div>
                    </div>
                </td>
                <td>
                    <div class="price-display">
                        <div class="current-price">${CommonUtils.formatCurrency(offer.currentPrice)}</div>
                        ${offer.originalPrice > offer.currentPrice ? 
                            `<div class="original-price">${CommonUtils.formatCurrency(offer.originalPrice)}</div>` : ''
                        }
                    </div>
                </td>
                <td>
                    <span class="offer-status ${statusClass}">${status.toUpperCase()}</span>
                </td>
                <td>
                    <div class="offer-actions">
                        <button class="action-btn btn-view" onclick="viewOffer('${offer.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="editOffer('${offer.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-toggle" onclick="toggleOfferStatus('${offer.id}')" title="Toggle Status">
                            <i class="fas fa-power-off"></i>
                        </button>
                        ${CommonUtils.checkPermission('delete') ? 
                            `<button class="action-btn btn-delete" onclick="deleteOffer('${offer.id}')" title="Delete">
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
    const paginationContainer = document.getElementById('offersPagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    paginationContainer.innerHTML = CommonUtils.createPagination(
        filteredOffers.length,
        itemsPerPage,
        currentPage,
        'goToPage'
    );
}

// Go to page
function goToPage(page) {
    currentPage = page;
    renderOffersTable();
}

// Update stats
function updateStats() {
    const stats = {
        total: offersData.length,
        active: 0,
        upcoming: 0,
        expiring: 0
    };
    
    const now = new Date();
    
    offersData.forEach(offer => {
        const status = getOfferStatus(offer);
        
        if (status === 'active') stats.active++;
        if (status === 'upcoming') stats.upcoming++;
        
        // Check if expiring soon (within 7 days)
        if (offer.endDate) {
            const endDate = offer.endDate.toDate ? 
                offer.endDate.toDate() : new Date(offer.endDate);
            const daysToEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysToEnd <= 7 && daysToEnd > 0 && status === 'active') {
                stats.expiring++;
            }
        }
    });
    
    // Update DOM elements
    document.getElementById('totalOffersCount')?.textContent = stats.total;
    document.getElementById('activeOffersCount')?.textContent = stats.active;
    document.getElementById('upcomingOffersCount')?.textContent = stats.upcoming;
    document.getElementById('expiringOffersCount')?.textContent = stats.expiring;
    
    // Update navigation badge
    document.getElementById('activeOffersCount')?.textContent = stats.active;
}

// Get offer status
function getOfferStatus(offer) {
    if (!offer.isActive) return 'inactive';
    
    const now = new Date();
    const startDate = offer.startDate?.toDate ? 
        offer.startDate.toDate() : new Date(offer.startDate);
    const endDate = offer.endDate?.toDate ? 
        offer.endDate.toDate() : new Date(offer.endDate);
    
    if (!startDate || !endDate) return 'inactive';
    
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'expired';
    
    return 'active';
}

// View offer details
function viewOffer(offerId) {
    const offer = offersData.find(o => o.id === offerId);
    if (!offer) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${offer.title}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="offer-details">
                    <div class="detail-row">
                        <div class="detail-label">Property:</div>
                        <div class="detail-value">
                            <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(offer.property)}">
                                <i class="${CommonUtils.getPropertyIcon(offer.property)}"></i>
                                ${CommonUtils.PROPERTY_NAMES[offer.property] || offer.property}
                            </span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Category:</div>
                        <div class="detail-value">${offer.category?.charAt(0).toUpperCase() + offer.category?.slice(1) || 'N/A'}</div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Dates:</div>
                        <div class="detail-value">
                            ${CommonUtils.formatDate(offer.startDate)} to ${CommonUtils.formatDate(offer.endDate)}
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Price:</div>
                        <div class="detail-value">
                            <div class="price-display">
                                <div class="current-price">${CommonUtils.formatCurrency(offer.currentPrice)}</div>
                                ${offer.originalPrice > offer.currentPrice ? 
                                    `<div class="original-price">${CommonUtils.formatCurrency(offer.originalPrice)}</div>
                                     <div class="discount">Save ${offer.discountPercentage || 0}%</div>` : ''
                                }
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Promo Code:</div>
                        <div class="detail-value">${offer.offerCode || 'N/A'}</div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="offer-status status-${getOfferStatus(offer)}">
                                ${getOfferStatus(offer).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Description:</div>
                        <div class="detail-value">${offer.description}</div>
                    </div>
                    
                    ${offer.features?.length ? `
                        <div class="detail-row">
                            <div class="detail-label">Features:</div>
                            <div class="detail-value">
                                <ul class="features-list">
                                    ${offer.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${offer.termsConditions ? `
                        <div class="detail-row">
                            <div class="detail-label">Terms & Conditions:</div>
                            <div class="detail-value">${offer.termsConditions}</div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-row">
                        <div class="detail-label">Created:</div>
                        <div class="detail-value">
                            ${CommonUtils.formatDate(offer.createdAt, true)} by ${offer.createdBy || 'System'}
                        </div>
                    </div>
                    
                    ${offer.updatedAt ? `
                        <div class="detail-row">
                            <div class="detail-label">Last Updated:</div>
                            <div class="detail-value">
                                ${CommonUtils.formatDate(offer.updatedAt, true)} by ${offer.updatedBy || 'System'}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-row">
                        <div class="detail-label">Views:</div>
                        <div class="detail-value">${offer.views || 0}</div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Bookings:</div>
                        <div class="detail-value">${offer.bookings || 0}</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                <button class="btn btn-primary" onclick="editOffer('${offer.id}'); this.closest('.modal').remove()">
                    <i class="fas fa-edit"></i> Edit Offer
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Show offer modal for create/edit
function showOfferModal(offerId = null) {
    const offer = offerId ? offersData.find(o => o.id === offerId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${offer ? 'Edit Offer' : 'Create New Offer'}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="offerForm" onsubmit="saveOffer(event, '${offer?.id || ''}')">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="offerTitle">Offer Title *</label>
                            <input type="text" id="offerTitle" class="form-control" 
                                   value="${offer?.title || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="propertySelect">Property *</label>
                            <select id="propertySelect" class="form-control" required>
                                <option value="">Select Property</option>
                                <option value="limuru" ${offer?.property === 'limuru' ? 'selected' : ''}>Limuru Country Home</option>
                                <option value="kanamai" ${offer?.property === 'kanamai' ? 'selected' : ''}>Kanamai Beach Resort</option>
                                <option value="kisumu" ${offer?.property === 'kisumu' ? 'selected' : ''}>Kisumu Hotel</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="offerCategory">Category *</label>
                            <select id="offerCategory" class="form-control" required>
                                <option value="">Select Category</option>
                                <option value="accommodation" ${offer?.category === 'accommodation' ? 'selected' : ''}>Accommodation</option>
                                <option value="conference" ${offer?.category === 'conference' ? 'selected' : ''}>Conference</option>
                                <option value="church" ${offer?.category === 'church' ? 'selected' : ''}>Church Events</option>
                                <option value="family" ${offer?.category === 'family' ? 'selected' : ''}>Family Packages</option>
                                <option value="honeymoon" ${offer?.category === 'honeymoon' ? 'selected' : ''}>Honeymoon</option>
                                <option value="beach" ${offer?.category === 'beach' ? 'selected' : ''}>Beach</option>
                                <option value="weekend" ${offer?.category === 'weekend' ? 'selected' : ''}>Weekend Getaway</option>
                                <option value="seasonal" ${offer?.category === 'seasonal' ? 'selected' : ''}>Seasonal</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="offerCode">Promo Code</label>
                            <input type="text" id="offerCode" class="form-control" 
                                   value="${offer?.offerCode || ''}" 
                                   placeholder="Optional">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="offerDescription">Description *</label>
                        <textarea id="offerDescription" class="form-control" rows="3" required>${offer?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="originalPrice">Original Price (KES)</label>
                            <input type="number" id="originalPrice" class="form-control" 
                                   value="${offer?.originalPrice || ''}" 
                                   min="0" step="100">
                        </div>
                        
                        <div class="form-group">
                            <label for="currentPrice">Current Price (KES) *</label>
                            <input type="number" id="currentPrice" class="form-control" 
                                   value="${offer?.currentPrice || ''}" 
                                   min="0" step="100" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="startDate">Start Date *</label>
                            <input type="date" id="startDate" class="form-control" 
                                   value="${offer?.startDate?.toDate ? offer.startDate.toDate().toISOString().split('T')[0] : ''}" 
                                   required>
                        </div>
                        
                        <div class="form-group">
                            <label for="endDate">End Date *</label>
                            <input type="date" id="endDate" class="form-control" 
                                   value="${offer?.endDate?.toDate ? offer.endDate.toDate().toISOString().split('T')[0] : ''}" 
                                   required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Features</label>
                        <div id="featuresContainer">
                            ${(offer?.features || ['']).map(feature => `
                                <div class="feature-item">
                                    <input type="text" class="form-control feature-input" 
                                           value="${feature}" 
                                           placeholder="e.g., 2 nights accommodation">
                                    <button type="button" class="btn btn-sm btn-danger" onclick="removeFeature(this)">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="addFeature()">
                            <i class="fas fa-plus"></i> Add Feature
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label for="imageUrl">Image URL</label>
                        <input type="url" id="imageUrl" class="form-control" 
                               value="${offer?.imageUrl || ''}" 
                               placeholder="https://example.com/image.jpg">
                    </div>
                    
                    <div class="form-group">
                        <label for="termsConditions">Terms & Conditions</label>
                        <textarea id="termsConditions" class="form-control" rows="2">${offer?.termsConditions || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="isActive" ${offer?.isActive !== false ? 'checked' : ''}>
                            <label for="isActive">Active (Offer is live and bookable)</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="featured" ${offer?.featured ? 'checked' : ''}>
                            <label for="featured">Featured (Show on homepage)</label>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> ${offer ? 'Update Offer' : 'Create Offer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Save offer
async function saveOffer(event, offerId = null) {
    event.preventDefault();
    
    try {
        CommonUtils.showLoading(true, 'Saving offer...');
        
        const { db, COLLECTIONS, currentUser } = CommonUtils;
        
        // Get form values
        const formData = {
            title: document.getElementById('offerTitle').value,
            property: document.getElementById('propertySelect').value,
            category: document.getElementById('offerCategory').value,
            description: document.getElementById('offerDescription').value,
            originalPrice: parseFloat(document.getElementById('originalPrice').value) || 0,
            currentPrice: parseFloat(document.getElementById('currentPrice').value) || 0,
            offerCode: document.getElementById('offerCode').value || null,
            imageUrl: document.getElementById('imageUrl').value || null,
            termsConditions: document.getElementById('termsConditions').value || null,
            isActive: document.getElementById('isActive').checked,
            featured: document.getElementById('featured').checked,
            startDate: firebase.firestore.Timestamp.fromDate(
                new Date(document.getElementById('startDate').value)
            ),
            endDate: firebase.firestore.Timestamp.fromDate(
                new Date(document.getElementById('endDate').value)
            ),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.name || 'Admin'
        };
        
        // Calculate discount
        if (formData.originalPrice > 0 && formData.currentPrice > 0) {
            formData.discountPercentage = Math.round(
                ((formData.originalPrice - formData.currentPrice) / formData.originalPrice) * 100
            );
        }
        
        // Get features
        const featureInputs = document.querySelectorAll('.feature-input');
        const features = [];
        featureInputs.forEach(input => {
            if (input.value.trim()) {
                features.push(input.value.trim());
            }
        });
        formData.features = features;
        
        if (offerId) {
            // Update existing offer
            await db.collection(COLLECTIONS.OFFERS).doc(offerId).update(formData);
            CommonUtils.showNotification('Offer updated successfully!', 'success');
        } else {
            // Create new offer
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            formData.createdBy = currentUser.name || 'Admin';
            formData.views = 0;
            formData.bookings = 0;
            
            await db.collection(COLLECTIONS.OFFERS).add(formData);
            CommonUtils.showNotification('Offer created successfully!', 'success');
        }
        
        // Close modal
        document.querySelector('.modal')?.remove();
        
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error saving offer:', error);
        CommonUtils.showNotification('Failed to save offer', 'error');
        CommonUtils.showLoading(false);
    }
}

// Toggle offer status
async function toggleOfferStatus(offerId) {
    const offer = offersData.find(o => o.id === offerId);
    if (!offer) return;
    
    const newStatus = !offer.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    CommonUtils.showConfirm(
        `Are you sure you want to ${action} this offer?`,
        async () => {
            try {
                CommonUtils.showLoading(true, `${action === 'activate' ? 'Activating' : 'Deactivating'} offer...`);
                
                const { db, COLLECTIONS, currentUser } = CommonUtils;
                
                await db.collection(COLLECTIONS.OFFERS).doc(offerId).update({
                    isActive: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: currentUser.name || 'Admin'
                });
                
                CommonUtils.showNotification(`Offer ${action}d successfully!`, 'success');
                CommonUtils.showLoading(false);
                
            } catch (error) {
                console.error('Error toggling offer status:', error);
                CommonUtils.showNotification('Failed to update offer status', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Delete offer
async function deleteOffer(offerId) {
    CommonUtils.showConfirm(
        'Are you sure you want to delete this offer? This action cannot be undone.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting offer...');
                
                const { db, COLLECTIONS } = CommonUtils;
                
                await db.collection(COLLECTIONS.OFFERS).doc(offerId).delete();
                
                CommonUtils.showNotification('Offer deleted successfully!', 'success');
                CommonUtils.showLoading(false);
                
            } catch (error) {
                console.error('Error deleting offer:', error);
                CommonUtils.showNotification('Failed to delete offer', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Add feature input
function addFeature() {
    const container = document.getElementById('featuresContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'feature-item';
    div.innerHTML = `
        <input type="text" class="form-control feature-input" 
               placeholder="e.g., 2 nights accommodation">
        <button type="button" class="btn btn-sm btn-danger" onclick="removeFeature(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

// Remove feature input
function removeFeature(button) {
    const container = document.getElementById('featuresContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

// Edit offer
function editOffer(offerId) {
    showOfferModal(offerId);
}

// Refresh offers
function refreshOffers() {
    loadOffers();
    CommonUtils.showNotification('Offers refreshed!', 'info');
}

// Export offers
function exportOffers() {
    const exportData = filteredOffers.map(offer => ({
        'Offer Title': offer.title,
        'Property': CommonUtils.PROPERTY_NAMES[offer.property] || offer.property,
        'Category': offer.category?.charAt(0).toUpperCase() + offer.category?.slice(1) || 'N/A',
        'Start Date': CommonUtils.formatDate(offer.startDate),
        'End Date': CommonUtils.formatDate(offer.endDate),
        'Original Price': offer.originalPrice || 0,
        'Current Price': offer.currentPrice || 0,
        'Discount %': offer.discountPercentage || 0,
        'Promo Code': offer.offerCode || 'N/A',
        'Status': getOfferStatus(offer),
        'Active': offer.isActive ? 'Yes' : 'No',
        'Featured': offer.featured ? 'Yes' : 'No',
        'Views': offer.views || 0,
        'Bookings': offer.bookings || 0,
        'Created Date': CommonUtils.formatDate(offer.createdAt, true),
        'Created By': offer.createdBy || 'System'
    }));
    
    CommonUtils.exportToCSV(exportData, 'jumuia_offers');
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
    // Check if we're on the offers module
    if (document.querySelector('[data-module="offers"]')) {
        setTimeout(() => {
            initOffersModule();
        }, 100);
    }
});

// Export functions
window.OffersModule = {
    initOffersModule,
    loadOffers,
    showOfferModal,
    editOffer,
    viewOffer,
    toggleOfferStatus,
    deleteOffer,
    refreshOffers,
    exportOffers,
    addFeature,
    removeFeature,
    saveOffer,
    goToPage
};