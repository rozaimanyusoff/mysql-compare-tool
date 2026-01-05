# Migration Guide: CLI to Web-Based

## Overview

Your MySQL Compare Tool has been successfully migrated from a CLI-based application to a modern web-based application with the following improvements:

## What's New

### 1. **Web Interface (React + Tailwind CSS)**
- Modern, responsive UI accessible from any browser
- Intuitive navigation and workflow
- Real-time feedback and status updates

### 2. **Backend API (Express.js)**
- RESTful API for all operations
- Scalable architecture
- Clean separation of concerns

### 3. **Credential Management**
- Save multiple database credentials in the web app
- Test connections directly from the UI
- Edit or delete credentials anytime
- No need to manage `.env` files manually

### 4. **Database Comparison**
- Same powerful comparison logic
- Visual comparison results
- One-click synchronization
- Track sync progress in real-time

### 5. **SQLite Local Database**
- Credentials stored locally in `credentials.db`
- Portable - no external database needed
- Easy to backup and transfer

## Project Structure

```
mysql-compare-tool/
├── backend/                    # NEW: Express API server
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── db.ts              # SQLite & credential management
│   │   ├── routes/
│   │   │   ├── credentials.ts # Credential CRUD API
│   │   │   └── comparison.ts  # Comparison API
│   │   └── services/
│   │       └── comparison.ts  # Comparison logic (migrated from CLI)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                   # NEW: React web app
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── api.ts             # API client
│   │   ├── main.tsx           # React entry point
│   │   ├── index.css          # Tailwind styles
│   │   ├── components/
│   │   │   ├── CredentialForm.tsx
│   │   │   └── Settings.tsx
│   │   └── pages/
│   │       └── ComparisonPage.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
│
├── src/                        # LEGACY: Original CLI code (kept for reference)
│   ├── comparison.ts          # Original comparison logic
│   ├── database.ts            # Original database connection
│   ├── index.ts               # Original CLI entry point
│   └── ...
│
├── QUICK_START.md             # NEW: Quick start guide
├── WEB_SETUP.md               # NEW: Detailed setup documentation
├── setup-web.sh               # NEW: Automated setup script
└── package.json               # UPDATED: Root-level scripts
```

## Key Changes

### Comparison Logic
✅ **Unchanged** - Core comparison algorithm remains the same
- Same data comparison logic
- Same sync strategy (only copies from production)
- Preserves all existing functionality

### Credential Handling
**CLI (Old)**:
```bash
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=3306
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=secret
PROD_DB_HOST=prod.server.com
...
```

**Web (New)**:
1. Go to Settings tab
2. Click "Add New Credential"
3. Fill in form
4. Saved securely in local database

### Database Comparison
**CLI (Old)**:
```bash
npm start  # Interactive prompts
```

**Web (New)**:
1. Click Compare tab
2. Select credentials from dropdown
3. Click Compare button
4. View results with one-click sync

## Installation & Usage

### Quick Setup
```bash
bash setup-web.sh
```

### Run Both Servers
**Terminal 1**:
```bash
npm run dev:backend
```

**Terminal 2**:
```bash
npm run dev:frontend
```

Then open: `http://localhost:3000`

### Or Run Separately
```bash
cd backend && npm run dev    # Port 5000
cd frontend && npm run dev   # Port 3000
```

## API Endpoints

All operations now go through RESTful API:

```
POST   /api/credentials              # Add credential
GET    /api/credentials              # List all
PUT    /api/credentials/:id          # Update
DELETE /api/credentials/:id          # Delete

POST   /api/comparison/test-connection   # Test DB connection
GET    /api/comparison/databases         # Get databases list
POST   /api/comparison/compare           # Compare tables
POST   /api/comparison/sync-table        # Sync table
```

## Data Migration

### From CLI to Web
1. **Credentials**: Manually add them in Settings tab (more secure than .env)
2. **History**: CLI logs in `logs/` folder remain available
3. **Configuration**: No config migration needed - simpler web UI

### Preserving Old Setup
- Original `src/` folder kept for reference
- Old CLI still works but superseded by web app
- Can run both if needed (they don't conflict)

## Development

### Backend Development
```bash
cd backend
npm install          # Install dependencies
npm run dev         # Start dev server with hot reload
npm run build       # Build for production
npm run type-check  # Check TypeScript
```

### Frontend Development
```bash
cd frontend
npm install         # Install dependencies
npm run dev        # Start dev server with Vite
npm run build      # Build for production
```

### Adding Features
1. Backend: Add routes in `backend/src/routes/`
2. Frontend: Add components in `frontend/src/components/`
3. API: Update `frontend/src/api.ts` with new endpoints

## Deployment

### Backend Deployment
```bash
cd backend
npm install --production
npm run build
npm start
```

### Frontend Deployment
```bash
cd frontend
npm install --production
npm run build
# Deploy dist/ folder to web server
```

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process using port
lsof -ti:5000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

### Clear Dependencies
```bash
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
```

### Database Issues
```bash
# Reset credentials database
rm backend/credentials.db
# Restart backend to recreate
```

## Comparison: CLI vs Web

| Feature | CLI | Web |
|---------|-----|-----|
| Interface | Terminal | Browser |
| Setup | `.env` file | UI Settings |
| Multi-credentials | Limited | Full support |
| Automation | Scripts | API ready |
| Scalability | Single user | Multi-user ready |
| Testing | Manual | Built-in test button |
| History | Logs file | Expandable |

## Next Steps

1. ✅ Run `bash setup-web.sh`
2. ✅ Start backend server
3. ✅ Start frontend server
4. ✅ Add credentials in Settings
5. ✅ Compare and sync databases
6. 📖 Read [WEB_SETUP.md](./WEB_SETUP.md) for detailed info
7. 🚀 Deploy using provided instructions

## Support

- **Quick Start**: See [QUICK_START.md](./QUICK_START.md)
- **Full Documentation**: See [WEB_SETUP.md](./WEB_SETUP.md)
- **API Reference**: Check [WEB_SETUP.md](./WEB_SETUP.md#api-endpoints)

---

**Your MySQL Compare Tool is now ready for web-based usage! 🎉**
