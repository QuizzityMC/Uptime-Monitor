// Configuration for monitored services
const SERVICES = [
    {
        name: "Canary Cloud",
        url: "https://cloud.thalizar.info/",
        id: "canary-cloud"
    },
    {
        name: "Character wiki",
        url: "https://characters.thalizar.info/",
        id: "character-wiki"
    }
];

// Status data file path
const STATUS_DATA_URL = './status.json';
const ANNOUNCEMENTS_DATA_URL = './announcements.json';

// Admin credentials (simple check - in production use proper auth)
const ADMIN_PASSWORD = 'admin123';

// Function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
}

// Function to format short timestamp for tooltip
function formatShortTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to calculate uptime percentage
function calculateUptime(checks) {
    if (!checks || checks.length === 0) return '0.00';
    const successfulChecks = checks.filter(c => c.status === 'operational').length;
    return ((successfulChecks / checks.length) * 100).toFixed(2);
}

// Function to get average response time
function getAverageResponseTime(checks) {
    if (!checks || checks.length === 0) return 'N/A';
    const validChecks = checks.filter(c => c.responseTime && c.responseTime > 0);
    if (validChecks.length === 0) return 'N/A';
    const sum = validChecks.reduce((acc, c) => acc + c.responseTime, 0);
    const avg = sum / validChecks.length;
    return `${Math.round(avg)}ms`;
}

// Function to get last 60 checks for uptime bars
function getLast60Checks(checks) {
    if (!checks || checks.length === 0) {
        // Return 60 empty checks
        return Array(60).fill({ status: 'checking', timestamp: null });
    }
    
    // Get the last 60 checks
    const last60 = checks.slice(-60);
    
    // If we have less than 60, pad with empty checks at the beginning
    if (last60.length < 60) {
        const padding = Array(60 - last60.length).fill({ status: 'checking', timestamp: null });
        return [...padding, ...last60];
    }
    
    return last60;
}

// Function to create uptime tracker bars
function createUptimeTracker(checks) {
    const last60 = getLast60Checks(checks);
    
    const barsHTML = last60.map((check, index) => {
        const status = check.status || 'checking';
        const tooltip = check.timestamp 
            ? `${formatShortTimestamp(check.timestamp)}<br>${status}${check.responseTime ? `<br>${check.responseTime}ms` : ''}`
            : 'No data';
        
        return `
            <div class="uptime-bar ${status}">
                <div class="uptime-bar-tooltip">${tooltip}</div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="uptime-tracker">
            <div class="uptime-tracker-label">Last 60 minutes</div>
            <div class="uptime-bars">
                ${barsHTML}
            </div>
            <div class="uptime-tracker-legend">
                <span>60 min ago</span>
                <span>Now</span>
            </div>
        </div>
    `;
}

// Function to create a status card
function createStatusCard(service, statusData) {
    const card = document.createElement('div');
    card.className = 'status-card';
    card.id = service.id;
    
    const serviceStatus = statusData?.services?.[service.id];
    const status = serviceStatus?.status || 'checking';
    const lastChecked = serviceStatus?.lastChecked;
    const responseTime = serviceStatus?.responseTime;
    const checks = serviceStatus?.recentChecks || [];
    const uptime = calculateUptime(checks);
    const avgResponseTime = getAverageResponseTime(checks);
    const uptimeTrackerHTML = createUptimeTracker(checks);
    
    card.innerHTML = `
        <div class="status-header">
            <h2 class="service-name">${service.name}</h2>
            <span class="status-badge ${status}">${status}</span>
        </div>
        <div class="service-url">
            <a href="${service.url}" target="_blank" rel="noopener noreferrer">${service.url}</a>
        </div>
        <div class="status-details">
            <div class="detail-item">
                <span class="detail-label">Response Time</span>
                <span class="detail-value">${responseTime ? responseTime + 'ms' : 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Uptime (30d)</span>
                <span class="detail-value">${uptime}%</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Avg Response</span>
                <span class="detail-value">${avgResponseTime}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Last Checked</span>
                <span class="detail-value">${formatTimestamp(lastChecked)}</span>
            </div>
        </div>
        ${uptimeTrackerHTML}
    `;
    
    return card;
}

// Function to update the status display
function updateStatus(statusData) {
    const statusGrid = document.getElementById('statusGrid');
    const lastUpdate = document.getElementById('lastUpdate');
    
    // Clear existing content
    statusGrid.innerHTML = '';
    
    // Create status cards for each service
    SERVICES.forEach(service => {
        const card = createStatusCard(service, statusData);
        statusGrid.appendChild(card);
    });
    
    // Update last update time
    const updateTime = statusData?.lastUpdate || new Date().toISOString();
    lastUpdate.textContent = formatTimestamp(updateTime);
}

// Function to load status data
async function loadStatus() {
    try {
        const response = await fetch(STATUS_DATA_URL);
        if (!response.ok) {
            throw new Error('Failed to load status data');
        }
        const data = await response.json();
        updateStatus(data);
    } catch (error) {
        console.error('Error loading status:', error);
        // Show initial state with checking status
        updateStatus({
            lastUpdate: new Date().toISOString(),
            services: {}
        });
    }
}

// Announcements functionality
let announcements = [];

// Function to load announcements
async function loadAnnouncements() {
    try {
        const response = await fetch(ANNOUNCEMENTS_DATA_URL);
        if (!response.ok) {
            throw new Error('Failed to load announcements');
        }
        const data = await response.json();
        announcements = data.announcements || [];
        displayAnnouncements();
    } catch (error) {
        console.error('Error loading announcements:', error);
        announcements = [];
    }
}

// Function to display announcements
function displayAnnouncements() {
    const container = document.getElementById('announcementsContainer');
    container.innerHTML = '';
    
    // Get dismissed announcements from localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
    
    announcements.forEach((announcement, index) => {
        if (!dismissed.includes(announcement.id)) {
            const banner = document.createElement('div');
            banner.className = `announcement-banner ${announcement.type}`;
            banner.innerHTML = `
                <div class="announcement-content">
                    <div class="announcement-title">${announcement.title}</div>
                    <div class="announcement-message">${announcement.message}</div>
                </div>
                <button class="announcement-close" onclick="dismissAnnouncement('${announcement.id}')">&times;</button>
            `;
            container.appendChild(banner);
        }
    });
}

// Function to dismiss announcement
function dismissAnnouncement(id) {
    const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
    dismissed.push(id);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
    displayAnnouncements();
}

// Admin panel functionality
function setupAdminPanel() {
    const adminButton = document.getElementById('adminButton');
    const adminPanel = document.getElementById('adminPanel');
    const adminClose = document.getElementById('adminClose');
    const cancelBtn = document.getElementById('cancelBtn');
    const announcementForm = document.getElementById('announcementForm');
    
    // Open admin panel
    adminButton.addEventListener('click', () => {
        // Simple password check
        const password = prompt('Enter admin password:');
        if (password === ADMIN_PASSWORD) {
            adminPanel.classList.add('active');
            loadAnnouncementsList();
        } else if (password !== null) {
            alert('Incorrect password');
        }
    });
    
    // Close admin panel
    adminClose.addEventListener('click', () => {
        adminPanel.classList.remove('active');
    });
    
    cancelBtn.addEventListener('click', () => {
        adminPanel.classList.remove('active');
    });
    
    // Close on background click
    adminPanel.addEventListener('click', (e) => {
        if (e.target === adminPanel) {
            adminPanel.classList.remove('active');
        }
    });
    
    // Handle form submission
    announcementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addAnnouncement();
    });
}

// Function to add announcement
function addAnnouncement() {
    const title = document.getElementById('announcementTitle').value;
    const message = document.getElementById('announcementMessage').value;
    const type = document.getElementById('announcementType').value;
    
    const newAnnouncement = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date().toISOString()
    };
    
    announcements.unshift(newAnnouncement);
    saveAnnouncements();
    
    // Reset form
    document.getElementById('announcementForm').reset();
    
    // Refresh displays
    displayAnnouncements();
    loadAnnouncementsList();
}

// Function to delete announcement
function deleteAnnouncement(id) {
    if (confirm('Are you sure you want to delete this announcement?')) {
        announcements = announcements.filter(a => a.id !== id);
        saveAnnouncements();
        displayAnnouncements();
        loadAnnouncementsList();
    }
}

// Function to save announcements
function saveAnnouncements() {
    // In a real implementation, this would save to the server
    // For now, we'll simulate by saving to localStorage and showing a message
    const data = {
        announcements: announcements
    };
    
    localStorage.setItem('announcements', JSON.stringify(data));
    
    // Show message to user
    alert('Announcement saved! Note: In production, this would save to the server.');
}

// Function to load announcements list in admin panel
function loadAnnouncementsList() {
    const listContainer = document.getElementById('announcementList');
    
    if (announcements.length === 0) {
        listContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No announcements yet</p>';
        return;
    }
    
    listContainer.innerHTML = '<h3 style="margin-bottom: 16px; font-size: 1.2rem;">Current Announcements</h3>';
    
    announcements.forEach(announcement => {
        const item = document.createElement('div');
        item.className = 'announcement-list-item';
        item.innerHTML = `
            <div class="announcement-list-header">
                <div class="announcement-list-title">${announcement.title}</div>
                <div class="announcement-list-type ${announcement.type}">${announcement.type}</div>
            </div>
            <div class="announcement-list-message">${announcement.message}</div>
            <div class="announcement-list-actions">
                <button class="btn btn-danger" onclick="deleteAnnouncement('${announcement.id}')">Delete</button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load initial status and announcements
    loadStatus();
    
    // Try to load announcements from localStorage first (for demo purposes)
    const localData = localStorage.getItem('announcements');
    if (localData) {
        const data = JSON.parse(localData);
        announcements = data.announcements || [];
        displayAnnouncements();
    }
    
    // Also try to load from file
    loadAnnouncements();
    
    // Setup admin panel
    setupAdminPanel();
    
    // Refresh status every 60 seconds (1 minute)
    setInterval(loadStatus, 60000);
    
    // Refresh announcements every 5 minutes
    setInterval(loadAnnouncements, 300000);
});
