const https = require('https');
const http = require('http');
const fs = require('fs');
const url = require('url');

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

// Maximum number of recent checks to store
const MAX_RECENT_CHECKS = 60; // Last 60 minutes (1 check per minute)

// Function to check a URL
function checkUrl(urlString) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const parsedUrl = url.parse(urlString);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.path,
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'Uptime-Monitor/1.0'
            }
        };
        
        const req = protocol.request(options, (res) => {
            const responseTime = Date.now() - startTime;
            
            // Consume response data to free up memory
            res.on('data', () => {});
            res.on('end', () => {
                const status = res.statusCode >= 200 && res.statusCode < 400 ? 'operational' : 'degraded';
                resolve({
                    status,
                    responseTime,
                    statusCode: res.statusCode
                });
            });
        });
        
        req.on('error', (error) => {
            const responseTime = Date.now() - startTime;
            console.error(`Error checking ${urlString}:`, error.message);
            resolve({
                status: 'down',
                responseTime,
                error: error.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            const responseTime = Date.now() - startTime;
            resolve({
                status: 'down',
                responseTime,
                error: 'Timeout'
            });
        });
        
        req.end();
    });
}

// Function to load existing status data
function loadStatusData() {
    try {
        const data = fs.readFileSync('status.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Creating new status file');
        return {
            lastUpdate: null,
            services: {}
        };
    }
}

// Function to save status data
function saveStatusData(data) {
    fs.writeFileSync('status.json', JSON.stringify(data, null, 2));
}

// Main function to check all services
async function checkAllServices() {
    console.log('Checking service status...');
    const statusData = loadStatusData();
    const currentTime = new Date().toISOString();
    
    for (const service of SERVICES) {
        console.log(`Checking ${service.name}...`);
        const result = await checkUrl(service.url);
        
        // Initialize service data if not exists
        if (!statusData.services[service.id]) {
            statusData.services[service.id] = {
                status: 'checking',
                lastChecked: null,
                responseTime: null,
                recentChecks: []
            };
        }
        
        // Update service status
        const serviceData = statusData.services[service.id];
        serviceData.status = result.status;
        serviceData.lastChecked = currentTime;
        serviceData.responseTime = result.responseTime;
        
        // Add to recent checks
        if (!serviceData.recentChecks) {
            serviceData.recentChecks = [];
        }
        
        serviceData.recentChecks.push({
            timestamp: currentTime,
            status: result.status,
            responseTime: result.responseTime,
            statusCode: result.statusCode
        });
        
        // Limit the number of stored checks
        if (serviceData.recentChecks.length > MAX_RECENT_CHECKS) {
            serviceData.recentChecks = serviceData.recentChecks.slice(-MAX_RECENT_CHECKS);
        }
        
        console.log(`${service.name}: ${result.status} (${result.responseTime}ms)`);
    }
    
    // Update last update time
    statusData.lastUpdate = currentTime;
    
    // Save the updated status
    saveStatusData(statusData);
    console.log('Status updated successfully');
}

// Run the check
checkAllServices().catch(error => {
    console.error('Error checking services:', error);
    process.exit(1);
});
