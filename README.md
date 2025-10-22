# Uptime Monitor

A simple, elegant uptime monitoring solution for tracking the availability and performance of web services. This monitor tracks:
- **Canary Cloud** (https://cloud.thalizar.info/)
- **Character wiki** (https://characters.thalizar.info/)

## Features

- 🚀 Real-time status monitoring
- 📊 Response time tracking
- 📈 30-day uptime percentage
- 📉 **60-minute uptime tracker bars** - Visual timeline showing status over the last hour
- 📢 **Announcement system** - Display important notifications to users
- 🎨 Clean, modern UI with dark theme
- 🔄 **Automatic updates every 5 minutes** - Regular status checks
- 📱 Responsive design
- ☁️ Deployable to GitHub Pages or Vercel

## How It Works

1. A GitHub Actions workflow runs **every 5 minutes** to check the status of monitored websites
2. Status data is stored in `status.json`
3. The static website displays the current status and historical data
4. **Uptime tracker bars** show the status for the last 60 minutes with color-coded visualization
5. The page auto-refreshes every 5 minutes to show the latest status
6. **Announcements** can be managed through the announcements.json file to notify users of important updates

## Deployment

### GitHub Pages

1. Go to your repository settings
2. Navigate to Pages section
3. Select "GitHub Actions" as the source
4. The site will be deployed automatically on push to main branch
5. Access your monitor at `https://[username].github.io/[repository-name]/`

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy
4. Or connect your GitHub repository in the Vercel dashboard for automatic deployments

## Local Development

To test the monitor locally:

```bash
# Check status manually
node check-status.js

# Serve the website locally
python -m http.server 8000
# or
npx http-server
```

Then open `http://localhost:8000` in your browser.

## Configuration

To monitor additional websites or modify existing ones, edit the `SERVICES` array in:
- `script.js` (frontend display)
- `check-status.js` (status checking)

Example:
```javascript
const SERVICES = [
    {
        name: "My Service",
        url: "https://example.com/",
        id: "my-service"
    }
];
```

### Admin Panel

~~The admin panel feature has been removed. To manage announcements, edit the `announcements.json` file directly.~~

**Note:** For production use, you should implement proper server-side authentication if you want to add announcement management features.

## Status File

The `status.json` file stores:
- Current status of each service (operational, degraded, down)
- Latest response time
- Last check timestamp
- Historical check data (last 12 checks for 60-minute uptime tracker bars, collected every 5 minutes)

## Announcements File

The `announcements.json` file stores:
- Active announcements to display to users
- Announcement type (info, warning, error, success)
- Title and message content
- Timestamp of creation

## License

MIT