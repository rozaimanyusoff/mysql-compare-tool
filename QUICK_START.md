# Quick Start Guide - Web Version

## 🚀 Get Started in 3 Steps

### Step 1: Run Setup Script
```bash
bash setup-web.sh
```

This will:
- Install backend dependencies
- Install frontend dependencies
- Create `.env` files

### Step 2: Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```
✓ Backend runs at `http://localhost:5000`

### Step 3: Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
✓ Frontend runs at `http://localhost:3000`

## 📱 Using the Application

### Add Credentials
1. Go to **Settings** tab
2. Click **+ Add New Credential**
3. Fill in your database details
4. Select **Type**: Local or Production
5. Click **Add Credential**

### Compare Databases
1. Go to **Compare** tab
2. Select **Local Database** credential
3. Select **Production Database** credential
4. Click **Load Databases**
5. Select which database to compare
6. Click **Compare Tables**

### Sync Data
1. Review the comparison results
2. Click **Sync Table** on tables that need syncing
3. Confirm the sync operation
4. Data from production will be copied to local

## 📁 Project Structure

```
.
├── backend/               # Express API server
│   ├── src/
│   │   ├── index.ts      # Main server
│   │   ├── db.ts         # SQLite credentials storage
│   │   ├── routes/       # API endpoints
│   │   └── services/     # Business logic
│   └── package.json
│
├── frontend/              # React web app
│   ├── src/
│   │   ├── App.tsx       # Main app
│   │   ├── api.ts        # API client
│   │   ├── components/   # React components
│   │   └── pages/        # Page components
│   └── package.json
│
├── WEB_SETUP.md          # Detailed setup guide
└── README.md             # Original CLI documentation
```

## 🔧 Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev:backend` | Start backend server |
| `npm run dev:frontend` | Start frontend dev server |
| `npm run build:backend` | Build backend for production |
| `npm run build:frontend` | Build frontend for production |
| `bash setup-web.sh` | Setup both projects |

## 📚 What Changed from CLI?

| Feature | CLI | Web |
|---------|-----|-----|
| Interface | Terminal | Web Browser |
| Credentials | `.env` file | Database (Settings) |
| Configuration | Environment vars | UI Settings |
| Multi-user | Not supported | Ready for future |
| Ease of use | Command line | Graphical interface |

## 🌐 API Endpoints Reference

### Credentials
- `GET /api/credentials` - List all
- `POST /api/credentials` - Create new
- `PUT /api/credentials/:id` - Update
- `DELETE /api/credentials/:id` - Delete

### Comparison
- `POST /api/comparison/test-connection` - Test connection
- `GET /api/comparison/databases` - Get databases
- `POST /api/comparison/compare` - Compare tables
- `POST /api/comparison/sync-table` - Sync a table

## 🐛 Troubleshooting

### Frontend won't connect to backend
- Make sure backend is running on port 5000
- Check Vite proxy settings in `frontend/vite.config.ts`

### Connection test fails
- Verify database credentials are correct
- Check MySQL server is running and accessible
- Ensure user has proper permissions

### Build issues
- Delete `node_modules` and reinstall: `npm install`
- Clear cache: `npm cache clean --force`

## 📝 Next Steps

- Read [WEB_SETUP.md](./WEB_SETUP.md) for detailed documentation
- Check backend logs for API errors
- Use browser DevTools to debug frontend issues

---

**Need more help?** See WEB_SETUP.md for comprehensive documentation.
