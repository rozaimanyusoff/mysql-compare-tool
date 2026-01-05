# Web-Based MySQL Compare Tool

This is a web-based version of the MySQL comparison and synchronization tool, featuring a modern React frontend and Express.js backend with secure credential management.

## Features

- **Database Credentials Management**: Securely store and manage multiple database credentials in the Settings panel
- **Database Comparison**: Compare tables between local and production databases
- **Smart Sync**: Synchronize only production data that's missing or modified on local databases
- **Multi-Database Support**: Compare any databases from your configured credentials
- **Connection Testing**: Test database connections before syncing
- **Responsive UI**: Clean, intuitive web interface built with React and Tailwind CSS

## Project Structure

```
.
├── backend/                 # Express.js backend server
│   ├── src/
│   │   ├── index.ts        # Main server entry point
│   │   ├── db.ts           # SQLite database setup & credential storage
│   │   ├── routes/
│   │   │   ├── credentials.ts   # Credential CRUD endpoints
│   │   │   └── comparison.ts    # Database comparison endpoints
│   │   └── services/
│   │       └── comparison.ts    # Comparison logic & database connection
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # React.js frontend
│   ├── src/
│   │   ├── App.tsx         # Main application component
│   │   ├── api.ts          # API client for backend communication
│   │   ├── main.tsx        # React entry point
│   │   ├── index.css       # Tailwind CSS imports
│   │   ├── components/
│   │   │   ├── CredentialForm.tsx   # Form for adding/editing credentials
│   │   │   └── Settings.tsx         # Settings page component
│   │   └── pages/
│   │       └── ComparisonPage.tsx   # Main comparison interface
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm/yarn installed
- MySQL 5.7+ (or compatible)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Build TypeScript**:
   ```bash
   npm run build
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory** (in a new terminal):
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

## Usage

### 1. Add Database Credentials

1. Click **Settings** in the navigation bar
2. Click **"+ Add New Credential"**
3. Fill in the database details:
   - **Name**: A friendly name for this credential (e.g., "Production DB", "Local Dev")
   - **Host**: Database hostname or IP
   - **Port**: Database port (default: 3306)
   - **User**: Database username
   - **Password**: Database password
   - **Type**: Select either "Local" or "Production"
4. Click **"Add Credential"**
5. You can test the connection by clicking the **"Test"** button on the credential card

### 2. Compare Databases

1. Click **Compare** in the navigation bar
2. Select your **Local Database** credential
3. Select your **Production Database** credential
4. Click **"Load Databases"** to fetch available databases
5. Select the **Database** to compare
6. Click **"Compare Tables"** to start the comparison

### 3. Sync Tables

1. After comparison, review the results showing:
   - **Identical**: Records that match
   - **Modified**: Records that differ (will be updated)
   - **To Add**: Records only in production (will be added to local)
2. Click **"Sync Table"** for tables that need synchronization
3. Confirm the sync operation

## API Endpoints

### Credentials API

- `GET /api/credentials` - List all credentials
- `POST /api/credentials` - Create new credential
- `GET /api/credentials/:id` - Get credential details
- `PUT /api/credentials/:id` - Update credential
- `DELETE /api/credentials/:id` - Delete credential

### Comparison API

- `POST /api/comparison/test-connection` - Test database connection
- `GET /api/comparison/databases?credentialId=...` - Get list of databases
- `POST /api/comparison/compare` - Compare databases
- `POST /api/comparison/sync-table` - Sync a specific table

## Data Storage

- **Credentials**: Stored in a local SQLite database (`credentials.db`)
- **Passwords**: Stored as plaintext in the database (recommended to use read-only database users where possible)
- **No remote storage**: All data remains local to your machine

## Security Notes

1. **Credentials Storage**: All credentials are stored in a local SQLite database
2. **Password Handling**: Passwords are stored without encryption for MySQL connection purposes
3. **Environment Variables**: Sensitive settings should be in `.env` files (not committed)
4. **Network**: Ensure the application runs on a trusted network or behind authentication

## Development

### Building for Production

**Backend**:
```bash
cd backend
npm run build
npm start
```

**Frontend**:
```bash
cd frontend
npm run build
```

The frontend build output will be in `frontend/dist/`

### Type Checking

Both frontend and backend support TypeScript:

```bash
# Backend
cd backend && npm run type-check

# Frontend
cd frontend && npm run type-check
```

## Troubleshooting

### Connection Refused
- Ensure both backend and frontend servers are running
- Check that backend is accessible at `http://localhost:5000`
- Verify database credentials and connectivity

### Database Not Appearing
- Click "Load Databases" again after selecting credentials
- Check that the database user has permission to view databases
- Test the connection first using the Test button in Settings

### Sync Failures
- Verify the table has a primary key
- Check that columns match between local and production
- Ensure the database user has INSERT/UPDATE permissions

## Performance Considerations

- Large tables (100k+ rows) may take longer to compare
- Sync operations are optimized with batch INSERT/UPDATE statements
- Consider syncing during off-peak hours for large datasets

## Future Enhancements

- [ ] SSL/TLS connection support for databases
- [ ] Encrypted credential storage
- [ ] Backup/restore functionality
- [ ] Scheduled sync operations
- [ ] Sync history and rollback capability
- [ ] Multi-user support with authentication
- [ ] Advanced filtering and selective sync

## License

ISC
