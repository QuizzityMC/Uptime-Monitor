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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load initial status
    loadStatus();
    
    // Refresh status every 30 seconds
    setInterval(loadStatus, 30000);
});
