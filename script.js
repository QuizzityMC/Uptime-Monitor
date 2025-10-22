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
    
    // Check if Canary Cloud is down and show announcement
    checkCanaryCloudStatus(statusData);
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

// Function to check if Canary Cloud is down and show announcement
function checkCanaryCloudStatus(statusData) {
    const canaryCloudStatus = statusData?.services?.['canary-cloud']?.status;
    const container = document.getElementById('announcementsContainer');
    
    // Clear any existing auto-generated announcements
    container.innerHTML = '';
    
    // If Canary Cloud is down, show red announcement
    if (canaryCloudStatus === 'down') {
        const banner = document.createElement('div');
        banner.className = 'announcement-banner error';
        banner.innerHTML = `
            <div class="announcement-content">
                <div class="announcement-title">Canary Cloud is Down</div>
                <div class="announcement-message">We are working hard to get it back online as soon as possible. This might take some time as the server admins need to be contacted.</div>
            </div>
        `;
        container.appendChild(banner);
    } else {
        // Also load any regular announcements from the file
        loadAnnouncements();
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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load initial status
    loadStatus();
    
    // Refresh status every 60 seconds (1 minute)
    setInterval(loadStatus, 60000);
});
