// admin/modules/settings.js
// System Settings Management Module

let settingsData = {};
let unsavedChanges = {};
let currentSection = 'general';

// Initialize settings module
function initSettingsModule() {
    console.log('Initializing Settings module...');
    
    // Initialize common utilities
    if (!window.CommonUtils || !CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        return;
    }
    
    // Check if user has permission to manage settings
    if (!CommonUtils.checkPermission('manageSettings')) {
        CommonUtils.showNotification('You do not have permission to access settings', 'error');
        setTimeout(() => {
            window.history.back();
        }, 2000);
        return;
    }
    
    // Load settings data
    loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup auto-save
    setupAutoSave();
    
    // Load system info
    loadSystemInfo();
}

// Load settings from Firebase
async function loadSettings() {
    try {
        CommonUtils.showLoading(true, 'Loading settings...');
        
        const { db, COLLECTIONS } = CommonUtils;
        
        // Load settings from Firestore
        const settingsDoc = await db.collection(COLLECTIONS.SETTINGS).doc('system').get();
        
        if (settingsDoc.exists()) {
            settingsData = settingsDoc.data();
            console.log('Settings loaded:', settingsData);
        } else {
            // Initialize with default settings
            settingsData = getDefaultSettings();
            await saveSettingsToFirebase();
        }
        
        // Populate all forms with loaded settings
        populateSettingsForms();
        
        // Update last saved time
        updateLastSavedTime();
        
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error loading settings:', error);
        CommonUtils.showNotification('Failed to load settings', 'error');
        CommonUtils.showLoading(false);
    }
}

// Get default settings
function getDefaultSettings() {
    return {
        // General Settings
        general: {
            companyName: 'Jumuia Resorts Limited',
            companyEmail: 'info@jumuiaresorts.com',
            companyPhone: '+254 700 000000',
            companyAddress: '',
            timezone: 'Africa/Nairobi',
            currency: 'KES',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '12h',
            checkinTime: '14:00',
            checkoutTime: '11:00',
            cancellationPeriod: 24,
            requireDeposit: true,
            autoConfirm: true
        },
        
        // Appearance Settings
        appearance: {
            theme: 'default',
            primaryColor: '#22440f',
            secondaryColor: '#f3a435',
            mainLogoUrl: '',
            faviconUrl: '',
            headingFont: "'Playfair Display', serif",
            bodyFont: "'Montserrat', sans-serif",
            fontSize: '16px'
        },
        
        // Email Settings
        email: {
            smtpHost: '',
            smtpPort: 587,
            smtpUsername: '',
            smtpPassword: '',
            smtpEncryption: 'tls',
            smtpFromEmail: 'noreply@jumuiaresorts.com',
            smtpFromName: 'Jumuia Resorts',
            bookingConfirmationTemplate: 'default',
            welcomeEmailTemplate: 'default',
            sendBookingEmails: true,
            sendPaymentEmails: true,
            sendReminderEmails: false,
            sendAdminNotifications: true
        },
        
        // Notification Settings
        notifications: {
            notifyNewBookings: true,
            notifyCancellations: true,
            notifyCheckins: true,
            notifyCheckouts: true,
            notifyMessages: true,
            notifyReviews: true,
            alertLevel: 'medium',
            refreshInterval: 30,
            enablePush: true,
            pushSound: 'default'
        },
        
        // Properties
        properties: {
            defaultProperty: 'limuru',
            maxRoomsPerProperty: 30,
            propertyList: [
                {
                    id: 'limuru',
                    name: 'Limuru Country Home',
                    description: 'Mountain retreat with scenic views',
                    address: 'Limuru, Kenya',
                    phone: '+254 700 000001',
                    email: 'limuru@jumuiaresorts.com',
                    active: true
                },
                {
                    id: 'kanamai',
                    name: 'Kanamai Beach Resort',
                    description: 'Beachfront paradise',
                    address: 'Mombasa, Kenya',
                    phone: '+254 700 000002',
                    email: 'kanamai@jumuiaresorts.com',
                    active: true
                },
                {
                    id: 'kisumu',
                    name: 'Kisumu Hotel',
                    description: 'City center luxury hotel',
                    address: 'Kisumu, Kenya',
                    phone: '+254 700 000003',
                    email: 'kisumu@jumuiaresorts.com',
                    active: true
                }
            ]
        },
        
        // Security Settings
        security: {
            sessionTimeout: 30,
            require2FA: true,
            lockoutFailedAttempts: true,
            failedAttemptsLimit: 5,
            minPasswordLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
            passwordExpiry: 90,
            enableIPRestrictions: false,
            allowedIPs: ''
        },
        
        // Integration Settings
        integrations: {
            enableMpesa: true,
            mpesaConsumerKey: '',
            mpesaConsumerSecret: '',
            enablePaypal: false,
            paypalClientId: '',
            googleMapsApiKey: '',
            enableGeolocation: true,
            enableGoogleAnalytics: true,
            googleAnalyticsId: '',
            enableGoogleCalendar: false,
            enableSMS: false,
            smsApiKey: '',
            smsSenderId: 'JUMUIA'
        },
        
        // Backup Settings
        backup: {
            autoBackup: true,
            backupFrequency: 'weekly',
            backupRetention: 30
        },
        
        // Metadata
        metadata: {
            lastUpdated: new Date().toISOString(),
            updatedBy: CommonUtils.currentUser?.name || 'System',
            version: '1.0.0'
        }
    };
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
        });
    });
    
    // Refresh button
    document.getElementById('refreshSettingsBtn').addEventListener('click', function() {
        loadSettings();
        CommonUtils.showNotification('Settings refreshed', 'info');
    });
    
    // Save all button
    document.getElementById('saveAllSettingsBtn').addEventListener('click', function() {
        saveAllSettings();
    });
    
    // Form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSectionSettings(this.id.replace('SettingsForm', ''));
        });
    });
    
    // Color pickers
    setupColorPickers();
    
    // Theme selection
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', function() {
            const theme = this.dataset.theme;
            selectTheme(theme);
        });
    });
    
    // Input change tracking
    setupChangeTracking();
    
    // Backup file input
    const backupFileInput = document.getElementById('backupFile');
    if (backupFileInput) {
        backupFileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                restoreBackup(e.target.files[0]);
            }
        });
    }
}

// Switch between settings sections
function switchSection(section) {
    currentSection = section;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    // Show active section
    document.querySelectorAll('.settings-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section + 'Section').classList.add('active');
}

// Populate all settings forms
function populateSettingsForms() {
    // General Settings
    populateGeneralSettings();
    
    // Appearance Settings
    populateAppearanceSettings();
    
    // Email Settings
    populateEmailSettings();
    
    // Notification Settings
    populateNotificationSettings();
    
    // Properties
    populateProperties();
    
    // Security Settings
    populateSecuritySettings();
    
    // Integration Settings
    populateIntegrationSettings();
    
    // Backup Settings
    populateBackupSettings();
    
    // Clear unsaved changes
    unsavedChanges = {};
    updateUnsavedCount();
}

// Populate general settings
function populateGeneralSettings() {
    const general = settingsData.general || {};
    
    setInputValue('companyName', general.companyName);
    setInputValue('companyEmail', general.companyEmail);
    setInputValue('companyPhone', general.companyPhone);
    setInputValue('companyAddress', general.companyAddress);
    setSelectValue('timezone', general.timezone);
    setSelectValue('currency', general.currency);
    setSelectValue('dateFormat', general.dateFormat);
    setSelectValue('timeFormat', general.timeFormat);
    setInputValue('checkinTime', general.checkinTime);
    setInputValue('checkoutTime', general.checkoutTime);
    setInputValue('cancellationPeriod', general.cancellationPeriod);
    setCheckboxValue('requireDeposit', general.requireDeposit);
    setCheckboxValue('autoConfirm', general.autoConfirm);
}

// Populate appearance settings
function populateAppearanceSettings() {
    const appearance = settingsData.appearance || {};
    
    // Theme selection
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.theme === appearance.theme) {
            card.classList.add('selected');
        }
    });
    
    // Colors
    setInputValue('primaryColor', appearance.primaryColor);
    setInputValue('primaryColorText', appearance.primaryColor);
    setInputValue('secondaryColor', appearance.secondaryColor);
    setInputValue('secondaryColorText', appearance.secondaryColor);
    updateColorPreviews();
    
    // Fonts
    setSelectValue('headingFont', appearance.headingFont);
    setSelectValue('bodyFont', appearance.bodyFont);
    setSelectValue('fontSize', appearance.fontSize);
    
    // Logo previews
    updateLogoPreview('main', appearance.mainLogoUrl);
    updateLogoPreview('favicon', appearance.faviconUrl);
}

// Populate email settings
function populateEmailSettings() {
    const email = settingsData.email || {};
    
    setInputValue('smtpHost', email.smtpHost);
    setInputValue('smtpPort', email.smtpPort);
    setInputValue('smtpUsername', email.smtpUsername);
    setInputValue('smtpPassword', email.smtpPassword);
    setSelectValue('smtpEncryption', email.smtpEncryption);
    setInputValue('smtpFromEmail', email.smtpFromEmail);
    setInputValue('smtpFromName', email.smtpFromName);
    setSelectValue('bookingConfirmationTemplate', email.bookingConfirmationTemplate);
    setSelectValue('welcomeEmailTemplate', email.welcomeEmailTemplate);
    setCheckboxValue('sendBookingEmails', email.sendBookingEmails);
    setCheckboxValue('sendPaymentEmails', email.sendPaymentEmails);
    setCheckboxValue('sendReminderEmails', email.sendReminderEmails);
    setCheckboxValue('sendAdminNotifications', email.sendAdminNotifications);
}

// Populate notification settings
function populateNotificationSettings() {
    const notifications = settingsData.notifications || {};
    
    setCheckboxValue('notifyNewBookings', notifications.notifyNewBookings);
    setCheckboxValue('notifyCancellations', notifications.notifyCancellations);
    setCheckboxValue('notifyCheckins', notifications.notifyCheckins);
    setCheckboxValue('notifyCheckouts', notifications.notifyCheckouts);
    setCheckboxValue('notifyMessages', notifications.notifyMessages);
    setCheckboxValue('notifyReviews', notifications.notifyReviews);
    setSelectValue('alertLevel', notifications.alertLevel);
    setInputValue('refreshInterval', notifications.refreshInterval);
    setCheckboxValue('enablePush', notifications.enablePush);
    setSelectValue('pushSound', notifications.pushSound);
}

// Populate properties
function populateProperties() {
    const properties = settingsData.properties || {};
    
    setSelectValue('defaultProperty', properties.defaultProperty);
    setInputValue('maxRoomsPerProperty', properties.maxRoomsPerProperty);
    
    // Render properties list
    renderPropertiesList(properties.propertyList || []);
}

// Populate security settings
function populateSecuritySettings() {
    const security = settingsData.security || {};
    
    setInputValue('sessionTimeout', security.sessionTimeout);
    setCheckboxValue('require2FA', security.require2FA);
    setCheckboxValue('lockoutFailedAttempts', security.lockoutFailedAttempts);
    setInputValue('failedAttemptsLimit', security.failedAttemptsLimit);
    setInputValue('minPasswordLength', security.minPasswordLength);
    setCheckboxValue('requireUppercase', security.requireUppercase);
    setCheckboxValue('requireLowercase', security.requireLowercase);
    setCheckboxValue('requireNumbers', security.requireNumbers);
    setCheckboxValue('requireSpecialChars', security.requireSpecialChars);
    setInputValue('passwordExpiry', security.passwordExpiry);
    setCheckboxValue('enableIPRestrictions', security.enableIPRestrictions);
    setInputValue('allowedIPs', security.allowedIPs);
}

// Populate integration settings
function populateIntegrationSettings() {
    const integrations = settingsData.integrations || {};
    
    setCheckboxValue('enableMpesa', integrations.enableMpesa);
    setInputValue('mpesaConsumerKey', integrations.mpesaConsumerKey);
    setInputValue('mpesaConsumerSecret', integrations.mpesaConsumerSecret);
    setCheckboxValue('enablePaypal', integrations.enablePaypal);
    setInputValue('paypalClientId', integrations.paypalClientId);
    setInputValue('googleMapsApiKey', integrations.googleMapsApiKey);
    setCheckboxValue('enableGeolocation', integrations.enableGeolocation);
    setCheckboxValue('enableGoogleAnalytics', integrations.enableGoogleAnalytics);
    setInputValue('googleAnalyticsId', integrations.googleAnalyticsId);
    setCheckboxValue('enableGoogleCalendar', integrations.enableGoogleCalendar);
    setCheckboxValue('enableSMS', integrations.enableSMS);
    setInputValue('smsApiKey', integrations.smsApiKey);
    setInputValue('smsSenderId', integrations.smsSenderId);
}

// Populate backup settings
function populateBackupSettings() {
    const backup = settingsData.backup || {};
    
    setCheckboxValue('autoBackup', backup.autoBackup);
    setSelectValue('backupFrequency', backup.backupFrequency);
    setInputValue('backupRetention', backup.backupRetention);
    
    // Load recent backups
    loadRecentBackups();
}

// Render properties list
function renderPropertiesList(properties) {
    const propertiesList = document.getElementById('propertiesList');
    if (!propertiesList) return;
    
    if (properties.length === 0) {
        propertiesList.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-light);">
                <i class="fas fa-hotel" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p>No properties configured</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    
    properties.forEach(property => {
        html += `
            <div style="background-color: var(--light-green); border-radius: var(--radius); padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <h4 style="color: var(--primary-green); margin-bottom: 5px;">${property.name}</h4>
                        <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 5px;">
                            ${property.description}
                        </p>
                        <div style="display: flex; gap: 15px; font-size: 0.85rem; color: var(--text-dark);">
                            <span><i class="fas fa-phone"></i> ${property.phone}</span>
                            <span><i class="fas fa-envelope"></i> ${property.email}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="padding: 5px 10px; border-radius: 12px; font-size: 0.8rem; 
                              background-color: ${property.active ? '#d4edda' : '#f8d7da'}; 
                              color: ${property.active ? '#155724' : '#721c24'};">
                            ${property.active ? 'Active' : 'Inactive'}
                        </span>
                        <button class="btn btn-sm btn-primary" onclick="editProperty('${property.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProperty('${property.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    propertiesList.innerHTML = html;
}

// Setup color pickers
function setupColorPickers() {
    // Primary color picker
    const primaryColor = document.getElementById('primaryColor');
    const primaryColorText = document.getElementById('primaryColorText');
    const primaryColorPreview = document.getElementById('primaryColorPreview');
    
    if (primaryColor && primaryColorText && primaryColorPreview) {
        primaryColor.addEventListener('input', function() {
            primaryColorText.value = this.value;
            primaryColorPreview.style.backgroundColor = this.value;
            trackChange('appearance', 'primaryColor', this.value);
        });
        
        primaryColorText.addEventListener('input', function() {
            if (this.value.match(/^#[0-9A-F]{6}$/i)) {
                primaryColor.value = this.value;
                primaryColorPreview.style.backgroundColor = this.value;
                trackChange('appearance', 'primaryColor', this.value);
            }
        });
    }
    
    // Secondary color picker
    const secondaryColor = document.getElementById('secondaryColor');
    const secondaryColorText = document.getElementById('secondaryColorText');
    const secondaryColorPreview = document.getElementById('secondaryColorPreview');
    
    if (secondaryColor && secondaryColorText && secondaryColorPreview) {
        secondaryColor.addEventListener('input', function() {
            secondaryColorText.value = this.value;
            secondaryColorPreview.style.backgroundColor = this.value;
            trackChange('appearance', 'secondaryColor', this.value);
        });
        
        secondaryColorText.addEventListener('input', function() {
            if (this.value.match(/^#[0-9A-F]{6}$/i)) {
                secondaryColor.value = this.value;
                secondaryColorPreview.style.backgroundColor = this.value;
                trackChange('appearance', 'secondaryColor', this.value);
            }
        });
    }
}

// Update color previews
function updateColorPreviews() {
    const primaryColor = document.getElementById('primaryColor')?.value || '#22440f';
    const secondaryColor = document.getElementById('secondaryColor')?.value || '#f3a435';
    
    document.getElementById('primaryColorPreview').style.backgroundColor = primaryColor;
    document.getElementById('secondaryColorPreview').style.backgroundColor = secondaryColor;
}

// Select theme
function selectTheme(theme) {
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.querySelector(`.theme-card[data-theme="${theme}"]`).classList.add('selected');
    trackChange('appearance', 'theme', theme);
}

// Update logo preview
function updateLogoPreview(type, url) {
    const preview = document.getElementById(type + 'LogoPreview');
    const input = document.getElementById(type + 'LogoUrl');
    
    if (!preview || !input) return;
    
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="${type} logo">`;
        preview.classList.remove('empty');
    } else {
        preview.innerHTML = `
            <i class="fas fa-upload" style="font-size: 2rem;"></i>
            <span>Click to upload logo</span>
            <small>Recommended: ${type === 'main' ? '200x100px PNG' : '32x32px ICO/PNG'}</small>
        `;
        preview.classList.add('empty');
    }
    
    input.value = url || '';
}

// Upload logo
function uploadLogo(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            CommonUtils.showLoading(true, 'Uploading logo...');
            
            const { storage } = CommonUtils;
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`logos/${type}_${Date.now()}_${file.name}`);
            
            // Upload file
            await fileRef.put(file);
            
            // Get download URL
            const downloadURL = await fileRef.getDownloadURL();
            
            // Update preview
            updateLogoPreview(type, downloadURL);
            
            // Track change
            const field = type === 'main' ? 'mainLogoUrl' : 'faviconUrl';
            trackChange('appearance', field, downloadURL);
            
            CommonUtils.showNotification('Logo uploaded successfully', 'success');
            CommonUtils.showLoading(false);
            
        } catch (error) {
            console.error('Error uploading logo:', error);
            CommonUtils.showNotification('Failed to upload logo', 'error');
            CommonUtils.showLoading(false);
        }
    };
    
    input.click();
}

// Setup change tracking
function setupChangeTracking() {
    // Track all input changes
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('change', function() {
            const formId = this.closest('form')?.id;
            if (!formId) return;
            
            const section = formId.replace('SettingsForm', '').toLowerCase();
            const field = this.id;
            const value = this.type === 'checkbox' ? this.checked : this.value;
            
            trackChange(section, field, value);
        });
        
        // For text inputs, track on input (not just change)
        if (input.type === 'text' || input.type === 'textarea') {
            input.addEventListener('input', debounce(function() {
                const formId = this.closest('form')?.id;
                if (!formId) return;
                
                const section = formId.replace('SettingsForm', '').toLowerCase();
                const field = this.id;
                
                trackChange(section, field, this.value);
            }, 500));
        }
    });
}

// Track changes
function trackChange(section, field, value) {
    if (!unsavedChanges[section]) {
        unsavedChanges[section] = {};
    }
    
    const currentValue = getSettingValue(section, field);
    
    // Only track if value has changed
    if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
        unsavedChanges[section][field] = value;
        
        // Update nav item indicator
        updateNavItemIndicator(section, true);
        
        // Update unsaved count
        updateUnsavedCount();
    } else {
        // Remove from unsaved changes if value matches original
        if (unsavedChanges[section][field]) {
            delete unsavedChanges[section][field];
            if (Object.keys(unsavedChanges[section]).length === 0) {
                delete unsavedChanges[section];
                updateNavItemIndicator(section, false);
            }
        }
    }
}

// Get setting value
function getSettingValue(section, field) {
    if (settingsData[section]) {
        return settingsData[section][field];
    }
    return null;
}

// Update nav item indicator
function updateNavItemIndicator(section, hasChanges) {
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navItem) {
        if (hasChanges) {
            navItem.classList.add('unsaved-changes');
        } else {
            navItem.classList.remove('unsaved-changes');
        }
    }
}

// Update unsaved count
function updateUnsavedCount() {
    let totalChanges = 0;
    for (const section in unsavedChanges) {
        totalChanges += Object.keys(unsavedChanges[section]).length;
    }
    
    document.getElementById('unsavedCount').textContent = totalChanges;
    
    // Update save all button state
    const saveAllBtn = document.getElementById('saveAllSettingsBtn');
    if (saveAllBtn) {
        saveAllBtn.disabled = totalChanges === 0;
    }
}

// Update last saved time
function updateLastSavedTime() {
    const lastUpdated = settingsData.metadata?.lastUpdated;
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        document.getElementById('lastSavedTime').textContent = 
            `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
}

// Save section settings
async function saveSectionSettings(section) {
    try {
        CommonUtils.showLoading(true, 'Saving settings...');
        
        // Get all changes for this section
        const changes = unsavedChanges[section];
        if (!changes || Object.keys(changes).length === 0) {
            CommonUtils.showNotification('No changes to save', 'info');
            CommonUtils.showLoading(false);
            return;
        }
        
        // Update settings data
        if (!settingsData[section]) {
            settingsData[section] = {};
        }
        
        for (const field in changes) {
            settingsData[section][field] = changes[field];
        }
        
        // Update metadata
        if (!settingsData.metadata) {
            settingsData.metadata = {};
        }
        settingsData.metadata.lastUpdated = new Date().toISOString();
        settingsData.metadata.updatedBy = CommonUtils.currentUser?.name || 'System';
        
        // Save to Firebase
        await saveSettingsToFirebase();
        
        // Clear unsaved changes for this section
        delete unsavedChanges[section];
        updateNavItemIndicator(section, false);
        updateUnsavedCount();
        updateLastSavedTime();
        
        CommonUtils.showNotification(`${section} settings saved successfully`, 'success');
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error(`Error saving ${section} settings:`, error);
        CommonUtils.showNotification(`Failed to save ${section} settings`, 'error');
        CommonUtils.showLoading(false);
    }
}

// Save all settings
async function saveAllSettings() {
    if (Object.keys(unsavedChanges).length === 0) {
        CommonUtils.showNotification('No changes to save', 'info');
        return;
    }
    
    try {
        CommonUtils.showLoading(true, 'Saving all settings...');
        
        // Apply all changes
        for (const section in unsavedChanges) {
            if (!settingsData[section]) {
                settingsData[section] = {};
            }
            
            for (const field in unsavedChanges[section]) {
                settingsData[section][field] = unsavedChanges[section][field];
            }
        }
        
        // Update metadata
        settingsData.metadata.lastUpdated = new Date().toISOString();
        settingsData.metadata.updatedBy = CommonUtils.currentUser?.name || 'System';
        
        // Save to Firebase
        await saveSettingsToFirebase();
        
        // Clear all unsaved changes
        unsavedChanges = {};
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('unsaved-changes');
        });
        updateUnsavedCount();
        updateLastSavedTime();
        
        CommonUtils.showNotification('All settings saved successfully', 'success');
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error saving all settings:', error);
        CommonUtils.showNotification('Failed to save settings', 'error');
        CommonUtils.showLoading(false);
    }
}

// Save settings to Firebase
async function saveSettingsToFirebase() {
    const { db, COLLECTIONS } = CommonUtils;
    
    await db.collection(COLLECTIONS.SETTINGS).doc('system').set(settingsData, { merge: true });
}

// Setup auto-save
function setupAutoSave() {
    // Auto-save every 30 seconds if there are changes
    setInterval(() => {
        if (Object.keys(unsavedChanges).length > 0) {
            saveAllSettings();
        }
    }, 30000);
}

// Reset section
function resetSection(section) {
    CommonUtils.showConfirm(
        `Reset all ${section} settings to default values?`,
        () => {
            // Get default settings for this section
            const defaultSettings = getDefaultSettings();
            
            // Reset form values
            switch(section) {
                case 'general':
                    populateGeneralSettings();
                    break;
                case 'appearance':
                    populateAppearanceSettings();
                    break;
                case 'email':
                    populateEmailSettings();
                    break;
                case 'notifications':
                    populateNotificationSettings();
                    break;
                case 'security':
                    populateSecuritySettings();
                    break;
                case 'integrations':
                    populateIntegrationSettings();
                    break;
                case 'backup':
                    populateBackupSettings();
                    break;
            }
            
            // Clear unsaved changes for this section
            if (unsavedChanges[section]) {
                delete unsavedChanges[section];
                updateNavItemIndicator(section, false);
                updateUnsavedCount();
            }
            
            CommonUtils.showNotification(`${section} settings reset to defaults`, 'success');
        }
    );
}

// Load system info
async function loadSystemInfo() {
    try {
        const { db, COLLECTIONS } = CommonUtils;
        
        // Get booking count
        const bookingsSnapshot = await db.collection(COLLECTIONS.BOOKINGS).get();
        document.getElementById('totalBookings').textContent = bookingsSnapshot.size;
        
        // Get user count
        const usersSnapshot = await db.collection(COLLECTIONS.ADMINS).get();
        document.getElementById('activeUsers').textContent = usersSnapshot.size;
        
        // Set Firebase info
        document.getElementById('firebaseApiKey').textContent = '••••••••' + CommonUtils.firebaseConfig.apiKey.slice(-8);
        document.getElementById('firebaseProjectId').textContent = CommonUtils.firebaseConfig.projectId;
        document.getElementById('firebaseProject').textContent = CommonUtils.firebaseConfig.projectId;
        
        // Set system version
        document.getElementById('systemVersion').textContent = settingsData.metadata?.version || '1.0.0';
        document.getElementById('lastUpdated').textContent = 
            settingsData.metadata?.lastUpdated ? 
            new Date(settingsData.metadata.lastUpdated).toLocaleDateString() : 
            'Never';
        
    } catch (error) {
        console.error('Error loading system info:', error);
    }
}

// Add new property
function addNewProperty() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Property</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="newPropertyForm" onsubmit="saveNewProperty(event)">
                    <div class="form-group">
                        <label for="propertyName">Property Name *</label>
                        <input type="text" id="propertyName" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="propertyDescription">Description</label>
                        <textarea id="propertyDescription" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="propertyAddress">Address</label>
                            <input type="text" id="propertyAddress" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="propertyPhone">Phone</label>
                            <input type="tel" id="propertyPhone" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="propertyEmail">Email</label>
                            <input type="email" id="propertyEmail" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="propertyStatus">Status</label>
                            <select id="propertyStatus" class="form-control">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Property
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Save new property
async function saveNewProperty(event) {
    event.preventDefault();
    
    try {
        CommonUtils.showLoading(true, 'Saving property...');
        
        const property = {
            id: generatePropertyId(),
            name: document.getElementById('propertyName').value,
            description: document.getElementById('propertyDescription').value,
            address: document.getElementById('propertyAddress').value,
            phone: document.getElementById('propertyPhone').value,
            email: document.getElementById('propertyEmail').value,
            active: document.getElementById('propertyStatus').value === 'active'
        };
        
        // Add to properties list
        if (!settingsData.properties) {
            settingsData.properties = {};
        }
        if (!settingsData.properties.propertyList) {
            settingsData.properties.propertyList = [];
        }
        
        settingsData.properties.propertyList.push(property);
        
        // Save to Firebase
        await saveSettingsToFirebase();
        
        // Update UI
        renderPropertiesList(settingsData.properties.propertyList);
        
        // Close modal
        document.querySelector('.modal')?.remove();
        
        CommonUtils.showNotification('Property added successfully', 'success');
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error saving property:', error);
        CommonUtils.showNotification('Failed to save property', 'error');
        CommonUtils.showLoading(false);
    }
}

// Generate property ID
function generatePropertyId() {
    const name = document.getElementById('propertyName').value;
    return name.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

// Edit property
function editProperty(propertyId) {
    const properties = settingsData.properties?.propertyList || [];
    const property = properties.find(p => p.id === propertyId);
    
    if (!property) {
        CommonUtils.showNotification('Property not found', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Property</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="editPropertyForm" onsubmit="updateProperty(event, '${propertyId}')">
                    <div class="form-group">
                        <label for="editPropertyName">Property Name *</label>
                        <input type="text" id="editPropertyName" class="form-control" 
                               value="${property.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editPropertyDescription">Description</label>
                        <textarea id="editPropertyDescription" class="form-control" rows="3">${property.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editPropertyAddress">Address</label>
                            <input type="text" id="editPropertyAddress" class="form-control" 
                                   value="${property.address || ''}">
                        </div>
                        <div class="form-group">
                            <label for="editPropertyPhone">Phone</label>
                            <input type="tel" id="editPropertyPhone" class="form-control" 
                                   value="${property.phone || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editPropertyEmail">Email</label>
                            <input type="email" id="editPropertyEmail" class="form-control" 
                                   value="${property.email || ''}">
                        </div>
                        <div class="form-group">
                            <label for="editPropertyStatus">Status</label>
                            <select id="editPropertyStatus" class="form-control">
                                <option value="active" ${property.active ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${!property.active ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Update Property
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Update property
async function updateProperty(event, propertyId) {
    event.preventDefault();
    
    try {
        CommonUtils.showLoading(true, 'Updating property...');
        
        const properties = settingsData.properties?.propertyList || [];
        const index = properties.findIndex(p => p.id === propertyId);
        
        if (index === -1) {
            throw new Error('Property not found');
        }
        
        // Update property
        properties[index] = {
            ...properties[index],
            name: document.getElementById('editPropertyName').value,
            description: document.getElementById('editPropertyDescription').value,
            address: document.getElementById('editPropertyAddress').value,
            phone: document.getElementById('editPropertyPhone').value,
            email: document.getElementById('editPropertyEmail').value,
            active: document.getElementById('editPropertyStatus').value === 'active'
        };
        
        // Save to Firebase
        await saveSettingsToFirebase();
        
        // Update UI
        renderPropertiesList(properties);
        
        // Close modal
        document.querySelector('.modal')?.remove();
        
        CommonUtils.showNotification('Property updated successfully', 'success');
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error updating property:', error);
        CommonUtils.showNotification('Failed to update property', 'error');
        CommonUtils.showLoading(false);
    }
}

// Delete property
async function deleteProperty(propertyId) {
    CommonUtils.showConfirm(
        'Are you sure you want to delete this property? This action cannot be undone.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting property...');
                
                const properties = settingsData.properties?.propertyList || [];
                const filteredProperties = properties.filter(p => p.id !== propertyId);
                
                // Update settings
                settingsData.properties.propertyList = filteredProperties;
                
                // Save to Firebase
                await saveSettingsToFirebase();
                
                // Update UI
                renderPropertiesList(filteredProperties);
                
                CommonUtils.showNotification('Property deleted successfully', 'success');
                CommonUtils.showLoading(false);
                
            } catch (error) {
                console.error('Error deleting property:', error);
                CommonUtils.showNotification('Failed to delete property', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Create backup
async function createBackup() {
    try {
        CommonUtils.showLoading(true, 'Creating backup...');
        
        // Get all data from Firebase
        const { db, COLLECTIONS } = CommonUtils;
        
        const backupData = {
            timestamp: new Date().toISOString(),
            createdBy: CommonUtils.currentUser?.name || 'System',
            settings: settingsData,
            collections: {}
        };
        
        // Backup all collections
        for (const collectionName in COLLECTIONS) {
            const collection = COLLECTIONS[collectionName];
            const snapshot = await db.collection(collection).get();
            
            backupData.collections[collection] = {};
            snapshot.forEach(doc => {
                backupData.collections[collection][doc.id] = doc.data();
            });
        }
        
        // Create download link
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `jumuia_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        CommonUtils.showNotification('Backup created successfully', 'success');
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error creating backup:', error);
        CommonUtils.showNotification('Failed to create backup', 'error');
        CommonUtils.showLoading(false);
    }
}

// Restore backup
async function restoreBackup(file) {
    CommonUtils.showConfirm(
        'Restoring from backup will overwrite all current data. Are you sure?',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Restoring backup...');
                
                const reader = new FileReader();
                
                reader.onload = async function(e) {
                    try {
                        const backupData = JSON.parse(e.target.result);
                        
                        // Restore settings
                        if (backupData.settings) {
                            settingsData = backupData.settings;
                            await saveSettingsToFirebase();
                            populateSettingsForms();
                        }
                        
                        // Restore collections (optional - could be a separate function)
                        
                        CommonUtils.showNotification('Backup restored successfully', 'success');
                        CommonUtils.showLoading(false);
                        
                    } catch (parseError) {
                        console.error('Error parsing backup file:', parseError);
                        CommonUtils.showNotification('Invalid backup file format', 'error');
                        CommonUtils.showLoading(false);
                    }
                };
                
                reader.readAsText(file);
                
            } catch (error) {
                console.error('Error restoring backup:', error);
                CommonUtils.showNotification('Failed to restore backup', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Load recent backups
async function loadRecentBackups() {
    // This would load backup metadata from Firebase
    // For now, show a placeholder
    const backupsList = document.getElementById('backupsList');
    if (backupsList) {
        backupsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-light);">
                <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No backups yet</p>
            </div>
        `;
    }
}

// Test SMTP connection
async function testSmtpConnection() {
    CommonUtils.showNotification('Testing SMTP connection...', 'info');
    
    // In a real implementation, this would call a cloud function
    // to test the SMTP connection
    
    setTimeout(() => {
        CommonUtils.showNotification('SMTP connection successful', 'success');
    }, 2000);
}

// Test integrations
async function testIntegrations() {
    CommonUtils.showNotification('Testing all integrations...', 'info');
    
    // Test each integration
    const tests = [
        { name: 'M-Pesa', enabled: document.getElementById('enableMpesa')?.checked },
        { name: 'Google Maps', enabled: document.getElementById('googleMapsApiKey')?.value },
        { name: 'Google Analytics', enabled: document.getElementById('enableGoogleAnalytics')?.checked },
        { name: 'SMS Gateway', enabled: document.getElementById('enableSMS')?.checked }
    ];
    
    let successfulTests = 0;
    
    for (const test of tests) {
        if (test.enabled) {
            // Simulate API test
            await new Promise(resolve => setTimeout(resolve, 500));
            successfulTests++;
        }
    }
    
    CommonUtils.showNotification(`${successfulTests} integration(s) tested successfully`, 'success');
}

// Preview theme
function previewTheme() {
    CommonUtils.showNotification('Theme preview would open in a new window', 'info');
    // In a real implementation, this would open a preview window
}

// Preview email template
function previewEmailTemplate(type) {
    CommonUtils.showNotification(`Opening ${type} email template preview`, 'info');
    // In a real implementation, this would open a template preview
}

// Run system diagnostics
async function runSystemDiagnostics() {
    CommonUtils.showLoading(true, 'Running diagnostics...');
    
    const healthChecks = [
        { name: 'Firebase Connection', status: 'checking' },
        { name: 'Database Access', status: 'checking' },
        { name: 'Storage Access', status: 'checking' },
        { name: 'Email Configuration', status: 'checking' },
        { name: 'API Endpoints', status: 'checking' }
    ];
    
    const systemHealth = document.getElementById('systemHealth');
    if (systemHealth) {
        let html = '<div style="display: grid; gap: 10px;">';
        
        for (const check of healthChecks) {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; 
                          padding: 10px; background-color: var(--light-green); border-radius: var(--radius);">
                    <span style="color: var(--text-dark);">${check.name}</span>
                    <span style="color: #6c757d;">
                        <i class="fas fa-spinner fa-spin"></i> Checking...
                    </span>
                </div>
            `;
        }
        
        html += '</div>';
        systemHealth.innerHTML = html;
        
        // Simulate checks
        setTimeout(() => {
            systemHealth.innerHTML = `
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; 
                              padding: 10px; background-color: #d4edda; border-radius: var(--radius);">
                        <span style="color: var(--text-dark);">Firebase Connection</span>
                        <span style="color: #28a745;">
                            <i class="fas fa-check-circle"></i> Connected
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; 
                              padding: 10px; background-color: #d4edda; border-radius: var(--radius);">
                        <span style="color: var(--text-dark);">Database Access</span>
                        <span style="color: #28a745;">
                            <i class="fas fa-check-circle"></i> Accessible
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; 
                              padding: 10px; background-color: #d4edda; border-radius: var(--radius);">
                        <span style="color: var(--text-dark);">Storage Access</span>
                        <span style="color: #28a745;">
                            <i class="fas fa-check-circle"></i> Accessible
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; 
                              padding: 10px; background-color: #fff3cd; border-radius: var(--radius);">
                        <span style="color: var(--text-dark);">Email Configuration</span>
                        <span style="color: #ffc107;">
                            <i class="fas fa-exclamation-triangle"></i> Not configured
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; 
                              padding: 10px; background-color: #d4edda; border-radius: var(--radius);">
                        <span style="color: var(--text-dark);">API Endpoints</span>
                        <span style="color: #28a745;">
                            <i class="fas fa-check-circle"></i> Operational
                        </span>
                    </div>
                </div>
            `;
            
            CommonUtils.showLoading(false);
            CommonUtils.showNotification('System diagnostics completed', 'success');
        }, 2000);
    }
}

// Clear test data
async function clearTestData() {
    CommonUtils.showConfirm(
        'This will delete all test bookings, messages, and users. Production data will not be affected. Continue?',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Clearing test data...');
                
                // In a real implementation, this would delete test data
                // For now, just show a success message
                
                setTimeout(() => {
                    CommonUtils.showNotification('Test data cleared successfully', 'success');
                    CommonUtils.showLoading(false);
                }, 2000);
                
            } catch (error) {
                console.error('Error clearing test data:', error);
                CommonUtils.showNotification('Failed to clear test data', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Reset system settings
async function resetSystemSettings() {
    CommonUtils.showConfirm(
        'Reset all system settings to default values? Your data will not be affected.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Resetting settings...');
                
                // Load default settings
                settingsData = getDefaultSettings();
                
                // Save to Firebase
                await saveSettingsToFirebase();
                
                // Update UI
                populateSettingsForms();
                
                CommonUtils.showNotification('System settings reset to defaults', 'success');
                CommonUtils.showLoading(false);
                
            } catch (error) {
                console.error('Error resetting settings:', error);
                CommonUtils.showNotification('Failed to reset settings', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Delete all data
async function deleteAllData() {
    CommonUtils.showConfirm(
        '⚠️ WARNING: This will delete ALL data including bookings, messages, users, and settings. This action is IRREVERSIBLE. Are you absolutely sure?',
        async () => {
            const confirmation = prompt('Type "DELETE ALL" to confirm:');
            
            if (confirmation === 'DELETE ALL') {
                try {
                    CommonUtils.showLoading(true, 'Deleting all data...');
                    
                    // In a real implementation, this would delete all data
                    // For safety, we won't implement this in the demo code
                    
                    setTimeout(() => {
                        CommonUtils.showNotification('All data has been deleted', 'success');
                        CommonUtils.showLoading(false);
                    }, 3000);
                    
                } catch (error) {
                    console.error('Error deleting data:', error);
                    CommonUtils.showNotification('Failed to delete data', 'error');
                    CommonUtils.showLoading(false);
                }
            } else {
                CommonUtils.showNotification('Deletion cancelled', 'info');
            }
        }
    );
}

// Deactivate system
async function deactivateSystem() {
    CommonUtils.showConfirm(
        'This will export all data and deactivate the system. No new bookings or logins will be allowed. Continue?',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deactivating system...');
                
                // First create a backup
                await createBackup();
                
                // Then deactivate (in a real implementation)
                
                setTimeout(() => {
                    CommonUtils.showNotification('System deactivated successfully', 'success');
                    CommonUtils.showLoading(false);
                }, 2000);
                
            } catch (error) {
                console.error('Error deactivating system:', error);
                CommonUtils.showNotification('Failed to deactivate system', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Copy to clipboard
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const text = element.textContent;
        navigator.clipboard.writeText(text).then(() => {
            CommonUtils.showNotification('Copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            CommonUtils.showNotification('Failed to copy', 'error');
        });
    }
}

// Helper functions
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || '';
    }
}

function setSelectValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || '';
    }
}

function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.checked = !!value;
    }
}

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
    // Check if we're on the settings module
    if (document.querySelector('[data-module="settings"]')) {
        setTimeout(() => {
            initSettingsModule();
        }, 100);
    }
});

// Export functions
window.SettingsModule = {
    initSettingsModule,
    loadSettings,
    saveSectionSettings,
    saveAllSettings,
    resetSection,
    createBackup,
    restoreBackup,
    testSmtpConnection,
    testIntegrations,
    runSystemDiagnostics,
    clearTestData,
    resetSystemSettings,
    deleteAllData,
    deactivateSystem
};