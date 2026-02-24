// admin/modules/content.js
// Content Management Module

let currentContent = null;
let contentData = [];
let mediaData = [];
let blogData = [];
let templatesData = [];
let analyticsData = [];
let currentTab = 'pages';
let currentEditorMode = 'create'; // 'create' or 'edit'
let currentContentId = null;

// Initialize content module
function initContentModule() {
    console.log('Initializing Content module...');
    
    // Initialize common utilities
    if (!window.CommonUtils || !window.CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        return;
    }
    
    // Initialize TinyMCE
    initTinyMCE();
    
    // Load initial data
    loadContentData();
    loadMediaData();
    loadBlogData();
    loadTemplatesData();
    loadAnalyticsData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup real-time listeners
    setupRealtimeListeners();
}

// Initialize TinyMCE editor
function initTinyMCE() {
    if (typeof tinymce !== 'undefined') {
        tinymce.init({
            selector: '#tinyEditor',
            height: 400,
            menubar: 'file edit view insert format tools table help',
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | ' +
                'bold italic forecolor | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat | help | link image media | code',
            content_style: 'body { font-family: Montserrat, sans-serif; font-size: 14px; }',
            skin: 'oxide',
            branding: false,
            promotion: false,
            images_upload_url: '/api/upload', // You'll need to implement this endpoint
            images_upload_handler: function (blobInfo, success, failure) {
                uploadImageToFirebase(blobInfo.blob()).then(function(url) {
                    success(url);
                }).catch(function(error) {
                    failure('Image upload failed: ' + error.message);
                });
            }
        });
    } else {
        console.warn('TinyMCE not loaded, using textarea');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Sidebar navigation in blog tab
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            showBlogSection(section);
        });
    });
    
    // New content button
    document.getElementById('newContentBtn').addEventListener('click', function() {
        openEditor('create');
    });
    
    // Refresh button
    document.getElementById('refreshContentBtn').addEventListener('click', function() {
        refreshAllData();
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchPages');
    if (searchInput) {
        searchInput.addEventListener('input', CommonUtils.debounce(searchContent, 300));
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterContent);
    }
    
    // Content type change
    const contentType = document.getElementById('contentType');
    if (contentType) {
        contentType.addEventListener('change', function() {
            updateEditorForType(this.value);
        });
    }
    
    // Content status change
    const contentStatus = document.getElementById('contentStatus');
    if (contentStatus) {
        contentStatus.addEventListener('change', function() {
            const scheduleGroup = document.getElementById('scheduleGroup');
            scheduleGroup.style.display = this.value === 'scheduled' ? 'block' : 'none';
        });
    }
    
    // Category input
    const categoryInput = document.getElementById('newCategoryInput');
    if (categoryInput) {
        categoryInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCategoryTag(this.value);
                this.value = '';
            }
        });
    }
    
    // Upload area
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', function() {
            document.getElementById('fileUpload').click();
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-green').trim();
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--gray-border').trim();
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--gray-border').trim();
            const files = e.dataTransfer.files;
            handleFileUpload(files);
        });
    }
    
    // File upload input
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.addEventListener('change', function(e) {
            handleFileUpload(this.files);
        });
    }
}

// Setup real-time listeners
function setupRealtimeListeners() {
    const { db, COLLECTIONS } = CommonUtils;
    
    // Listen for content changes
    const contentQuery = firebase.firestore()
        .collection(COLLECTIONS.CONTENT)
        .orderBy('updatedAt', 'desc');
    
    contentQuery.onSnapshot((snapshot) => {
        contentData = [];
        snapshot.forEach(doc => {
            contentData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderPagesGrid();
        updateContentStats();
    });
    
    // Listen for media changes
    const mediaQuery = firebase.firestore()
        .collection(COLLECTIONS.MEDIA)
        .orderBy('uploadedAt', 'desc');
    
    mediaQuery.onSnapshot((snapshot) => {
        mediaData = [];
        snapshot.forEach(doc => {
            mediaData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderMediaManager();
        updateStorageStats();
    });
}

// Switch tabs
function switchTab(tabId) {
    currentTab = tabId;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    
    // Show active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabId}Tab`).classList.add('active');
    
    // Load specific tab data
    switch(tabId) {
        case 'pages':
            loadContentData();
            break;
        case 'blog':
            loadBlogData();
            break;
        case 'media':
            loadMediaData();
            break;
        case 'templates':
            loadTemplatesData();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
    }
}

// Show blog section
function showBlogSection(section) {
    // Update active nav item
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active');
    
    // Show active section
    document.querySelectorAll('.blog-section').forEach(sec => {
        sec.style.display = 'none';
    });
    document.getElementById(`${section}Section`).style.display = 'block';
}

// Load content data
async function loadContentData() {
    try {
        CommonUtils.showLoading(true, 'Loading content...');
        
        const { db, COLLECTIONS } = CommonUtils;
        
        const snapshot = await firebase.firestore()
            .collection(COLLECTIONS.CONTENT)
            .orderBy('updatedAt', 'desc')
            .get();
        
        contentData = [];
        snapshot.forEach(doc => {
            contentData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderPagesGrid();
        updateContentStats();
        
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error loading content data:', error);
        CommonUtils.showNotification('Failed to load content', 'error');
        CommonUtils.showLoading(false);
    }
}

// Load media data
async function loadMediaData() {
    try {
        const { db, COLLECTIONS } = CommonUtils;
        
        const snapshot = await firebase.firestore()
            .collection(COLLECTIONS.MEDIA)
            .orderBy('uploadedAt', 'desc')
            .get();
        
        mediaData = [];
        snapshot.forEach(doc => {
            mediaData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderMediaManager();
        updateStorageStats();
        
    } catch (error) {
        console.error('Error loading media data:', error);
    }
}

// Load blog data
async function loadBlogData() {
    try {
        const { db, COLLECTIONS } = CommonUtils;
        
        // Load blog posts
        const postsSnapshot = await firebase.firestore()
            .collection(COLLECTIONS.CONTENT)
            .where('type', '==', 'post')
            .orderBy('createdAt', 'desc')
            .get();
        
        blogData = [];
        postsSnapshot.forEach(doc => {
            blogData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Load categories
        const categoriesSnapshot = await firebase.firestore()
            .collection(COLLECTIONS.CATEGORIES)
            .get();
        
        const categories = [];
        categoriesSnapshot.forEach(doc => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Load comments
        const commentsSnapshot = await firebase.firestore()
            .collection(COLLECTIONS.COMMENTS)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const comments = [];
        commentsSnapshot.forEach(doc => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Render blog data
        renderBlogPosts();
        renderCategories(categories);
        renderComments(comments);
        updateBlogStats();
        
    } catch (error) {
        console.error('Error loading blog data:', error);
    }
}

// Load templates data
async function loadTemplatesData() {
    try {
        const { db, COLLECTIONS } = CommonUtils;
        
        const snapshot = await firebase.firestore()
            .collection(COLLECTIONS.TEMPLATES)
            .orderBy('updatedAt', 'desc')
            .get();
        
        templatesData = [];
        snapshot.forEach(doc => {
            templatesData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderTemplates();
        updateTemplateStats();
        
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Load analytics data
async function loadAnalyticsData() {
    try {
        // For now, we'll use mock data
        // In a real implementation, you would fetch from your analytics service
        
        analyticsData = generateMockAnalyticsData();
        
        renderAnalyticsCharts();
        renderTopPagesTable();
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

// Render pages grid
function renderPagesGrid() {
    const pagesGrid = document.getElementById('pagesGrid');
    if (!pagesGrid) return;
    
    const filteredContent = filterContentByStatus(contentData);
    
    if (filteredContent.length === 0) {
        pagesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-file-alt" style="font-size: 4rem; color: var(--gray-border); margin-bottom: 20px;"></i>
                <h4 style="color: var(--text-light); margin-bottom: 10px;">No content found</h4>
                <p style="color: var(--text-light); font-size: 0.9rem;">Create your first page or adjust your filters</p>
                <button class="btn btn-primary" onclick="openEditor('create')" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> Create New Page
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredContent.forEach((content, index) => {
        const statusClass = `status-${content.status || 'draft'}`;
        const typeIcon = content.type === 'post' ? 'fa-blog' : 'fa-file-alt';
        const previewText = content.excerpt || content.content || 'No content available';
        const truncatedPreview = previewText.length > 150 ? previewText.substring(0, 150) + '...' : previewText;
        
        html += `
            <div class="page-card">
                <div class="page-header">
                    <h3><i class="fas ${typeIcon}"></i> ${content.title || 'Untitled'}</h3>
                    <p>Last updated: ${CommonUtils.formatDate(content.updatedAt, true)}</p>
                </div>
                <div class="page-content">
                    <div class="page-stats">
                        <div class="page-stat">
                            <div class="stat-number">${content.views || 0}</div>
                            <div class="stat-label">Views</div>
                        </div>
                        <div class="page-stat">
                            <div class="stat-number">${content.comments || 0}</div>
                            <div class="stat-label">Comments</div>
                        </div>
                        <div class="page-stat">
                            <span class="status-badge ${statusClass}">${content.status || 'draft'}</span>
                        </div>
                    </div>
                    
                    <div class="page-preview">
                        ${truncatedPreview}
                    </div>
                    
                    <div class="page-actions">
                        <button class="btn btn-sm btn-primary" onclick="editContent('${content.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="previewContent('${content.id}')">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        ${content.status !== 'published' ? 
                            `<button class="btn btn-sm btn-success" onclick="publishContent('${content.id}')">
                                <i class="fas fa-paper-plane"></i> Publish
                            </button>` : ''
                        }
                        <button class="btn btn-sm btn-danger" onclick="deleteContent('${content.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    pagesGrid.innerHTML = html;
}

// Render media manager
function renderMediaManager() {
    const mediaManager = document.getElementById('mediaManager');
    if (!mediaManager) return;
    
    if (mediaData.length === 0) {
        mediaManager.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-images" style="font-size: 4rem; color: var(--gray-border); margin-bottom: 20px;"></i>
                <h4 style="color: var(--text-light); margin-bottom: 10px;">No media files</h4>
                <p style="color: var(--text-light); font-size: 0.9rem;">Upload your first image or document</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    mediaData.forEach((media, index) => {
        const fileType = media.type || 'image';
        const icon = fileType.includes('image') ? 'fa-image' : 
                    fileType.includes('video') ? 'fa-video' : 
                    'fa-file';
        
        html += `
            <div class="media-item" onclick="selectMedia('${media.id}')">
                ${fileType.includes('image') ? 
                    `<img src="${media.url}" alt="${media.name}" class="media-preview">` :
                    `<div class="media-preview" style="display: flex; align-items: center; justify-content: center; background-color: var(--light-green);">
                        <i class="fas ${icon}" style="font-size: 2rem; color: var(--primary-green);"></i>
                    </div>`
                }
                <div class="media-info">
                    ${media.name || 'Unnamed file'}
                    <br>
                    <small>${formatFileSize(media.size)} • ${CommonUtils.formatDate(media.uploadedAt, false)}</small>
                </div>
            </div>
        `;
    });
    
    mediaManager.innerHTML = html;
}

// Render blog posts
function renderBlogPosts() {
    const postsList = document.getElementById('blogPostsList');
    if (!postsList) return;
    
    if (blogData.length === 0) {
        postsList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-blog" style="font-size: 3rem; color: var(--gray-border); margin-bottom: 15px;"></i>
                <h4 style="color: var(--text-light); margin-bottom: 10px;">No blog posts yet</h4>
                <p style="color: var(--text-light); font-size: 0.9rem;">Create your first blog post</p>
                <button class="btn btn-primary" onclick="openEditor('create')" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Create New Post
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    blogData.forEach((post, index) => {
        const statusClass = `status-${post.status || 'draft'}`;
        const author = post.author || 'Unknown';
        const categories = post.categories ? post.categories.join(', ') : 'Uncategorized';
        
        html += `
            <div style="background-color: white; border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <h4 style="color: var(--primary-green); margin-bottom: 5px;">${post.title || 'Untitled'}</h4>
                        <div style="color: var(--text-light); font-size: 0.85rem;">
                            <i class="fas fa-user"></i> ${author} • 
                            <i class="fas fa-calendar"></i> ${CommonUtils.formatDate(post.createdAt)} • 
                            <i class="fas fa-eye"></i> ${post.views || 0} views
                        </div>
                    </div>
                    <span class="status-badge ${statusClass}">${post.status || 'draft'}</span>
                </div>
                
                <p style="color: var(--text-dark); margin-bottom: 15px; line-height: 1.5;">
                    ${post.excerpt || 'No excerpt available'}
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: var(--text-light); font-size: 0.85rem;">
                        <i class="fas fa-tags"></i> ${categories}
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary" onclick="editContent('${post.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="previewContent('${post.id}')">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    postsList.innerHTML = html;
}

// Render categories
function renderCategories(categories) {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;
    
    if (categories.length === 0) {
        categoriesList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-light);">
                <i class="fas fa-tags" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No categories yet</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: grid; gap: 10px;">';
    categories.forEach(category => {
        const postCount = category.postCount || 0;
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background-color: var(--light-green); border-radius: var(--radius);">
                <div>
                    <strong style="color: var(--primary-green);">${category.name}</strong>
                    <div style="color: var(--text-light); font-size: 0.85rem; margin-top: 5px;">
                        ${postCount} post${postCount !== 1 ? 's' : ''}
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary" onclick="editCategory('${category.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    categoriesList.innerHTML = html;
}

// Render comments
function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-light);">
                <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No comments yet</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    comments.forEach(comment => {
        const status = comment.status || 'pending';
        const statusColor = status === 'approved' ? '#28a745' : 
                          status === 'pending' ? '#ffc107' : '#dc3545';
        
        html += `
            <div style="background-color: white; border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); border-left: 4px solid ${statusColor};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <strong style="color: var(--primary-green);">${comment.author || 'Anonymous'}</strong>
                        <div style="color: var(--text-light); font-size: 0.85rem;">
                            ${CommonUtils.getTimeAgo(comment.createdAt)} • 
                            On: ${comment.postTitle || 'Unknown Post'}
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 10px; background-color: ${statusColor}; color: white;">
                        ${status}
                    </span>
                </div>
                
                <p style="color: var(--text-dark); line-height: 1.5; margin-bottom: 15px;">
                    ${comment.content}
                </p>
                
                <div style="display: flex; gap: 10px;">
                    ${status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveComment('${comment.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="replyToComment('${comment.id}')">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteComment('${comment.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    commentsList.innerHTML = html;
}

// Render templates
function renderTemplates() {
    const templatesGrid = document.getElementById('templatesGrid');
    if (!templatesGrid) return;
    
    if (templatesData.length === 0) {
        templatesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-layer-group" style="font-size: 4rem; color: var(--gray-border); margin-bottom: 20px;"></i>
                <h4 style="color: var(--text-light); margin-bottom: 10px;">No templates yet</h4>
                <p style="color: var(--text-light); font-size: 0.9rem;">Create your first template</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    templatesData.forEach((template, index) => {
        const typeIcon = template.type === 'email' ? 'fa-envelope' : 
                        template.type === 'system' ? 'fa-cog' : 'fa-file-alt';
        const typeColor = template.type === 'email' ? '#17a2b8' : 
                         template.type === 'system' ? '#6c757d' : getComputedStyle(document.documentElement).getPropertyValue('--primary-green').trim();
        
        html += `
            <div class="template-card" onclick="editTemplate('${template.id}')">
                <div class="template-preview" style="background-color: ${typeColor}20; color: ${typeColor};">
                    <i class="fas ${typeIcon}"></i>
                </div>
                <div class="template-info">
                    <h4>${template.name || 'Unnamed Template'}</h4>
                    <p>${template.description || 'No description'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.85rem; color: var(--text-light);">
                            ${template.type} template
                        </span>
                        <span style="font-size: 0.85rem; color: var(--text-light);">
                            ${template.usedCount || 0} uses
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    templatesGrid.innerHTML = html;
}

// Render analytics charts
function renderAnalyticsCharts() {
    // Views chart
    const viewsCtx = document.getElementById('viewsChart')?.getContext('2d');
    if (viewsCtx) {
        new Chart(viewsCtx, {
            type: 'line',
            data: {
                labels: analyticsData.dates,
                datasets: [{
                    label: 'Page Views',
                    data: analyticsData.views,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-green').trim(),
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-green').trim() + '20',
                    tension: 0.4,
                    fill: true
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
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Top pages chart
    const topPagesCtx = document.getElementById('topPagesChart')?.getContext('2d');
    if (topPagesCtx) {
        new Chart(topPagesCtx, {
            type: 'bar',
            data: {
                labels: analyticsData.topPages.map(p => p.name),
                datasets: [{
                    label: 'Views',
                    data: analyticsData.topPages.map(p => p.views),
                    backgroundColor: [
                        getComputedStyle(document.documentElement).getPropertyValue('--primary-green').trim(),
                        getComputedStyle(document.documentElement).getPropertyValue('--primary-orange').trim(),
                        getComputedStyle(document.documentElement).getPropertyValue('--secondary-green').trim(),
                        '#17a2b8',
                        '#6c757d'
                    ]
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
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    }
}

// Render top pages table
function renderTopPagesTable() {
    const tableBody = document.getElementById('topPagesTable');
    if (!tableBody) return;
    
    let html = '';
    analyticsData.topPages.forEach((page, index) => {
        html += `
            <tr style="border-bottom: 1px solid var(--gray-border);">
                <td style="padding: 12px; color: var(--text-dark);">${page.name}</td>
                <td style="padding: 12px; text-align: center; color: var(--primary-green); font-weight: 600;">${page.views}</td>
                <td style="padding: 12px; text-align: center; color: var(--text-dark);">${page.avgTime}</td>
                <td style="padding: 12px; text-align: center; color: ${page.bounceRate > 50 ? '#dc3545' : '#28a745'}">${page.bounceRate}%</td>
                <td style="padding: 12px; text-align: center; color: var(--text-dark);">${page.conversions}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Open editor
function openEditor(mode, contentId = null) {
    currentEditorMode = mode;
    currentContentId = contentId;
    
    const modal = document.getElementById('editorModal');
    modal.style.display = 'block';
    
    if (mode === 'edit' && contentId) {
        loadContentForEdit(contentId);
    } else {
        resetEditor();
    }
}

// Close editor
function closeEditor() {
    const modal = document.getElementById('editorModal');
    modal.style.display = 'none';
    
    if (tinymce.activeEditor) {
        tinymce.activeEditor.setContent('');
    }
}

// Load content for editing
async function loadContentForEdit(contentId) {
    try {
        CommonUtils.showLoading(true, 'Loading content...');
        
        const { db, COLLECTIONS } = CommonUtils;
        
        const doc = await firebase.firestore()
            .collection(COLLECTIONS.CONTENT)
            .doc(contentId)
            .get();
        
        if (doc.exists) {
            const content = doc.data();
            currentContent = content;
            
            // Populate form fields
            document.getElementById('contentType').value = content.type || 'page';
            document.getElementById('contentStatus').value = content.status || 'draft';
            document.getElementById('contentTitle').value = content.title || '';
            document.getElementById('contentSlug').value = content.slug || '';
            document.getElementById('contentExcerpt').value = content.excerpt || '';
            
            if (tinymce.activeEditor) {
                tinymce.activeEditor.setContent(content.content || '');
            }
            
            // Set SEO fields
            document.getElementById('seoTitle').value = content.seoTitle || '';
            document.getElementById('seoDescription').value = content.seoDescription || '';
            
            // Set featured image
            if (content.featuredImage) {
                document.getElementById('featuredImageId').value = content.featuredImage;
                // You would load the image preview here
            }
            
            // Set categories
            if (content.categories && Array.isArray(content.categories)) {
                content.categories.forEach(cat => {
                    addCategoryTag(cat);
                });
            }
            
            // Update editor for type
            updateEditorForType(content.type || 'page');
            
            // Show schedule date if scheduled
            const scheduleGroup = document.getElementById('scheduleGroup');
            scheduleGroup.style.display = content.status === 'scheduled' ? 'block' : 'none';
            if (content.scheduledFor) {
                document.getElementById('scheduleDate').value = content.scheduledFor;
            }
        }
        
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error loading content for edit:', error);
        CommonUtils.showNotification('Failed to load content', 'error');
        CommonUtils.showLoading(false);
    }
}

// Reset editor
function resetEditor() {
    document.getElementById('contentType').value = 'page';
    document.getElementById('contentStatus').value = 'draft';
    document.getElementById('contentTitle').value = '';
    document.getElementById('contentSlug').value = '';
    document.getElementById('contentExcerpt').value = '';
    document.getElementById('seoTitle').value = '';
    document.getElementById('seoDescription').value = '';
    document.getElementById('featuredImageId').value = '';
    document.getElementById('scheduleDate').value = '';
    document.getElementById('newCategoryInput').value = '';
    document.getElementById('categoryTags').innerHTML = '';
    document.getElementById('scheduleGroup').style.display = 'none';
    
    if (tinymce.activeEditor) {
        tinymce.activeEditor.setContent('');
    }
    
    // Reset featured image preview
    const preview = document.getElementById('featuredImagePreview');
    preview.innerHTML = '<i class="fas fa-image" style="font-size: 2rem; color: var(--primary-green);"></i>';
}

// Update editor for content type
function updateEditorForType(type) {
    const excerptField = document.getElementById('contentExcerpt').closest('.form-group');
    const categoriesField = document.querySelector('label[for="newCategoryInput"]').closest('.form-group');
    const featuredImageField = document.querySelector('label[for="featuredImageId"]').closest('.form-group');
    
    if (type === 'post') {
        excerptField.style.display = 'block';
        categoriesField.style.display = 'block';
        featuredImageField.style.display = 'block';
    } else if (type === 'page') {
        excerptField.style.display = 'none';
        categoriesField.style.display = 'none';
        featuredImageField.style.display = 'block';
    } else if (type === 'template') {
        excerptField.style.display = 'none';
        categoriesField.style.display = 'none';
        featuredImageField.style.display = 'none';
    }
}

// Add category tag
function addCategoryTag(category) {
    const tagsContainer = document.getElementById('categoryTags');
    
    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.style.cssText = `
        display: inline-flex;
        align-items: center;
        background-color: var(--light-green);
        color: var(--primary-green);
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 0.85rem;
        margin-right: 5px;
        margin-bottom: 5px;
    `;
    
    tag.innerHTML = `
        ${category}
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; margin-left: 5px; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    tagsContainer.appendChild(tag);
}

// Select featured image
function selectFeaturedImage() {
    // This would open the media manager to select an image
    CommonUtils.showNotification('Opening media library...', 'info');
    // In a real implementation, you would show the media manager modal
}

// Save content
async function saveContent() {
    try {
        CommonUtils.showLoading(true, 'Saving content...');
        
        const { db, COLLECTIONS, currentUser } = CommonUtils;
        
        // Get form values
        const contentType = document.getElementById('contentType').value;
        const contentStatus = document.getElementById('contentStatus').value;
        const title = document.getElementById('contentTitle').value.trim();
        const slug = document.getElementById('contentSlug').value.trim() || generateSlug(title);
        const excerpt = document.getElementById('contentExcerpt').value.trim();
        const seoTitle = document.getElementById('seoTitle').value.trim();
        const seoDescription = document.getElementById('seoDescription').value.trim();
        const featuredImage = document.getElementById('featuredImageId').value;
        const scheduledFor = document.getElementById('scheduleDate').value;
        
        // Get categories from tags
        const categoryTags = document.querySelectorAll('.category-tag');
        const categories = Array.from(categoryTags).map(tag => 
            tag.textContent.replace('×', '').trim()
        );
        
        // Get editor content
        const content = tinymce.activeEditor ? 
            tinymce.activeEditor.getContent() : 
            document.getElementById('tinyEditor').value;
        
        // Prepare content data
        const contentData = {
            type: contentType,
            title: title,
            slug: slug,
            content: content,
            excerpt: excerpt,
            status: contentStatus,
            author: currentUser.name || 'Admin',
            authorId: currentUser.uid,
            categories: categories,
            featuredImage: featuredImage || null,
            seoTitle: seoTitle || title,
            seoDescription: seoDescription || excerpt,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.name || 'Admin'
        };
        
        // Add schedule date if scheduled
        if (contentStatus === 'scheduled' && scheduledFor) {
            contentData.scheduledFor = scheduledFor;
        }
        
        // Add creation timestamp for new content
        if (currentEditorMode === 'create') {
            contentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // Save to Firestore
        if (currentEditorMode === 'create') {
            await firebase.firestore()
                .collection(COLLECTIONS.CONTENT)
                .add(contentData);
        } else if (currentContentId) {
            await firebase.firestore()
                .collection(COLLECTIONS.CONTENT)
                .doc(currentContentId)
                .update(contentData);
        }
        
        CommonUtils.showNotification('Content saved successfully!', 'success');
        CommonUtils.showLoading(false);
        
        // Close editor and refresh
        closeEditor();
        refreshAllData();
        
    } catch (error) {
        console.error('Error saving content:', error);
        CommonUtils.showNotification('Failed to save content', 'error');
        CommonUtils.showLoading(false);
    }
}

// Save and publish
function saveAndPublish() {
    document.getElementById('contentStatus').value = 'published';
    saveContent();
}

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

// Edit content
function editContent(contentId) {
    openEditor('edit', contentId);
}

// Preview content
function previewContent(contentId) {
    const content = contentData.find(c => c.id === contentId);
    if (!content) return;
    
    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    previewContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <h1 style="color: var(--primary-green); margin-bottom: 20px;">${content.title || 'Untitled'}</h1>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px; color: var(--text-light); font-size: 0.9rem;">
                <div>
                    <i class="fas fa-user"></i> ${content.author || 'Unknown'}
                </div>
                <div>
                    <i class="fas fa-calendar"></i> ${CommonUtils.formatDate(content.createdAt)}
                </div>
                <div>
                    <i class="fas fa-eye"></i> ${content.views || 0} views
                </div>
            </div>
            
            ${content.featuredImage ? `
                <div style="margin-bottom: 30px;">
                    <img src="${content.featuredImage}" alt="${content.title}" style="width: 100%; height: auto; border-radius: var(--radius);">
                </div>
            ` : ''}
            
            <div style="line-height: 1.6; color: var(--text-dark);">
                ${content.content || 'No content available'}
            </div>
        </div>
    `;
    
    previewModal.classList.add('active');
}

// Close preview
function closePreview() {
    const previewModal = document.getElementById('previewModal');
    previewModal.classList.remove('active');
}

// Print preview
function printPreview() {
    window.print();
}

// Publish content
async function publishContent(contentId) {
    CommonUtils.showConfirm(
        'Are you sure you want to publish this content?',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Publishing...');
                
                const { db, COLLECTIONS, currentUser } = CommonUtils;
                
                await firebase.firestore()
                    .collection(COLLECTIONS.CONTENT)
                    .doc(contentId)
                    .update({
                        status: 'published',
                        publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedBy: currentUser.name || 'Admin'
                    });
                
                CommonUtils.showNotification('Content published successfully!', 'success');
                CommonUtils.showLoading(false);
                
                refreshAllData();
                
            } catch (error) {
                console.error('Error publishing content:', error);
                CommonUtils.showNotification('Failed to publish content', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Delete content
async function deleteContent(contentId) {
    CommonUtils.showConfirm(
        'Are you sure you want to delete this content? This action cannot be undone.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting...');
                
                const { db, COLLECTIONS } = CommonUtils;
                
                await firebase.firestore()
                    .collection(COLLECTIONS.CONTENT)
                    .doc(contentId)
                    .delete();
                
                CommonUtils.showNotification('Content deleted successfully!', 'success');
                CommonUtils.showLoading(false);
                
                refreshAllData();
                
            } catch (error) {
                console.error('Error deleting content:', error);
                CommonUtils.showNotification('Failed to delete content', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Filter content by status
function filterContentByStatus(content) {
    const statusFilter = document.getElementById('statusFilter')?.value;
    
    if (!statusFilter || statusFilter === 'all') {
        return content;
    }
    
    return content.filter(item => item.status === statusFilter);
}

// Search content
function searchContent() {
    const searchTerm = document.getElementById('searchPages')?.value.toLowerCase() || '';
    
    if (!searchTerm) {
        renderPagesGrid();
        return;
    }
    
    const filteredContent = contentData.filter(item => 
        item.title?.toLowerCase().includes(searchTerm) ||
        item.content?.toLowerCase().includes(searchTerm) ||
        item.excerpt?.toLowerCase().includes(searchTerm) ||
        item.author?.toLowerCase().includes(searchTerm)
    );
    
    // Temporarily replace contentData for rendering
    const originalData = contentData;
    contentData = filteredContent;
    renderPagesGrid();
    contentData = originalData;
}

// Filter content
function filterContent() {
    renderPagesGrid();
}

// Refresh all data
function refreshAllData() {
    loadContentData();
    loadMediaData();
    loadBlogData();
    loadTemplatesData();
    loadAnalyticsData();
    
    CommonUtils.showNotification('Data refreshed!', 'info');
}

// Upload image to Firebase
async function uploadImageToFirebase(file) {
    return new Promise((resolve, reject) => {
        const { storage, currentUser } = CommonUtils;
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`content/${Date.now()}_${file.name}`);
        
        const uploadTask = fileRef.put(file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
            },
            (error) => {
                reject(error);
            },
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                
                // Save to Firestore
                const { db, COLLECTIONS } = CommonUtils;
                await db.collection(COLLECTIONS.MEDIA).add({
                    name: file.name,
                    url: downloadURL,
                    type: file.type,
                    size: file.size,
                    uploadedBy: currentUser.name || 'Admin',
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                resolve(downloadURL);
            }
        );
    });
}

// Handle file upload
async function handleFileUpload(files) {
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadBar = document.getElementById('uploadBar');
    const uploadPercent = document.getElementById('uploadPercent');
    
    uploadProgress.style.display = 'block';
    uploadBar.style.width = '0%';
    uploadPercent.textContent = '0%';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = ((i + 1) / files.length) * 100;
        
        uploadBar.style.width = `${progress}%`;
        uploadPercent.textContent = `${Math.round(progress)}%`;
        
        try {
            await uploadImageToFirebase(file);
        } catch (error) {
            console.error('Error uploading file:', error);
            CommonUtils.showNotification(`Failed to upload ${file.name}`, 'error');
        }
    }
    
    setTimeout(() => {
        uploadProgress.style.display = 'none';
        CommonUtils.showNotification('Files uploaded successfully!', 'success');
    }, 500);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update content stats
function updateContentStats() {
    const totalPages = contentData.length;
    const publishedPages = contentData.filter(c => c.status === 'published').length;
    const draftPages = contentData.filter(c => c.status === 'draft').length;
    const totalViews = contentData.reduce((sum, c) => sum + (c.views || 0), 0);
    
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('publishedPages').textContent = publishedPages;
    document.getElementById('draftPages').textContent = draftPages;
    document.getElementById('totalViews').textContent = totalViews;
}

// Update storage stats
function updateStorageStats() {
    const totalSize = mediaData.reduce((sum, m) => sum + (m.size || 0), 0);
    const usedMB = (totalSize / (1024 * 1024)).toFixed(2);
    const percentage = Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100); // Assuming 1GB limit
    
    document.getElementById('storageUsed').textContent = `${usedMB} MB`;
    document.getElementById('storageBar').style.width = `${percentage}%`;
}

// Update blog stats
function updateBlogStats() {
    const totalPosts = blogData.length;
    const thisMonth = new Date().getMonth();
    const monthlyPosts = blogData.filter(post => {
        const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
        return postDate.getMonth() === thisMonth;
    }).length;
    
    document.getElementById('totalPosts').textContent = totalPosts;
    document.getElementById('monthlyPosts').textContent = monthlyPosts;
    // You would need to load actual comment and view data for these
    document.getElementById('totalComments').textContent = '0';
    document.getElementById('avgViews').textContent = '0';
}

// Update template stats
function updateTemplateStats() {
    document.getElementById('totalTemplates').textContent = templatesData.length;
    const activeTemplates = templatesData.filter(t => t.isActive).length;
    document.getElementById('activeTemplates').textContent = activeTemplates;
    
    if (templatesData.length > 0) {
        const lastModified = templatesData[0].updatedAt;
        document.getElementById('lastModified').textContent = CommonUtils.formatDate(lastModified, false);
    }
}

// Generate mock analytics data
function generateMockAnalyticsData() {
    const dates = [];
    const views = [];
    const topPages = [];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }));
        views.push(Math.floor(Math.random() * 100) + 50);
    }
    
    // Generate top pages
    const pageNames = ['Home Page', 'About Us', 'Room Details', 'Booking Page', 'Contact Us'];
    pageNames.forEach((name, index) => {
        topPages.push({
            name: name,
            views: Math.floor(Math.random() * 1000) + 500,
            avgTime: `${Math.floor(Math.random() * 3) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            bounceRate: Math.floor(Math.random() * 30) + 20,
            conversions: Math.floor(Math.random() * 50) + 10
        });
    });
    
    return {
        dates: dates,
        views: views,
        topPages: topPages
    };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the content module
    if (document.querySelector('[data-module="content"]')) {
        setTimeout(() => {
            initContentModule();
        }, 100);
    }
});

// Export functions
window.ContentModule = {
    initContentModule,
    openEditor,
    closeEditor,
    saveContent,
    publishContent,
    deleteContent,
    previewContent,
    refreshAllData,
    uploadImageToFirebase
};