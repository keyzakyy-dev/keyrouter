# 🏠 Localhost Deployment

Run KeyRouter on your local machine for development and personal use.

---

## 📦 Installation

Install KeyRouter globally via npm:

```bash
npm install -g keyrouter
```

**Requirements:**
- Node.js 20 or higher
- npm 9 or higher

---

## 🚀 Starting the Server

Start KeyRouter with a single command:

```bash
keyrouter
```

The dashboard will automatically open in your browser at `http://localhost:3000`

**Default Configuration:**
- **Dashboard**: `http://localhost:3000`
- **API Endpoint**: `http://localhost:20131/v1`
- **Data Directory**: `~/.keyrouter`

---

## 🔧 Configuration

### Custom Data Directory

Set a custom data directory using environment variable:

```bash
DATA_DIR=/path/to/data keyrouter
```

### Custom Port

The API port (20131) and dashboard port (3000) are configured in the application. To change them, you'll need to modify the source code or use environment variables if supported.

---

## 🛑 Stopping the Server

Press `Ctrl+C` in the terminal where KeyRouter is running.

```bash
# In the terminal running keyrouter
^C  # Press Ctrl+C
```

The server will gracefully shut down and save all data.

---

## 🔄 Restarting the Server

Simply run the start command again:

```bash
keyrouter
```

All your configurations, API keys, and combos are preserved in the data directory.

---

## 📊 Updating KeyRouter

Update to the latest version:

```bash
npm update -g keyrouter
```

Check your current version:

```bash
npm list -g keyrouter
```

---

## 🔍 Troubleshooting

### Port Already in Use

If port 20131 or 3000 is already in use:

```bash
# Find process using the port (macOS/Linux)
lsof -i :20131
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Permission Errors

If you encounter permission errors during installation:

```bash
# Use sudo (not recommended)
sudo npm install -g keyrouter

# Or fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Data Directory Issues

If the data directory is not accessible:

```bash
# Check permissions
ls -la ~/.keyrouter

# Fix permissions
chmod 755 ~/.keyrouter
```

---

## 📁 Data Directory Structure

```
~/.keyrouter/
├── db.json           # Main database (providers, combos, settings)
├── logs/             # Application logs
└── cache/            # Temporary cache files
```

**Backup Your Data:**

```bash
# Backup
cp -r ~/.keyrouter ~/.keyrouter.backup

# Restore
cp -r ~/.keyrouter.backup ~/.keyrouter
```

---

## 🔗 Next Steps

- [Connect Providers](/providers/subscription.md)
- [Create Combos](/features/combos.md)
- [Integrate with CLI Tools](/integration/cursor.md)
