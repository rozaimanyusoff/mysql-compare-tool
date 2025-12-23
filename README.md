# MySQL Compare Tool

A CLI tool that compares tables between local and production MySQL servers, allowing you to sync data from production to local.

## Features

- ✅ Connect to multiple MySQL servers (local & production)
- ✅ **Compare ALL tables in a database simultaneously**
- ✅ **Comprehensive comparison summary with status for each table**
- ✅ **Sync tables one by one (only tables with differences)**
- ✅ **Error handling: Replace or skip tables on sync failure**
- ✅ **Detailed sync logging with timestamped files (ddmmyyyyhhmmss format)**
- ✅ **Loop back to database selection after each database is synced**
- ✅ **Exclude already-synced databases from selection**
- ✅ **Production-safe deletion prompts**
- ✅ Identify differences between tables
- ✅ Update local table with production data
- ✅ CLI-based prompts for easy interaction

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following structure:

```env
# Local MySQL Connection
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=3306
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=your_local_password
LOCAL_DB_NAME=

# Production MySQL Connection
PROD_DB_HOST=your_production_host
PROD_DB_PORT=3306
PROD_DB_USER=prod_user
PROD_DB_PASSWORD=your_production_password
PROD_DB_NAME=
```

## Usage

### Development Mode

```bash
npm run dev
```

### Build & Run

```bash
npm run build
npm start
```

## How It Works

1. **Connection Check**: Verifies connectivity to both local and production databases
2. **Database Selection**: Prompts you to select which database to work with (excludes already synced databases)
3. **Batch Comparison**: Automatically compares ALL tables in the selected database
4. **Summary Report**: Shows status of all tables (in sync, need sync, errors)
5. **Table-by-Table Sync**: For each table with differences, prompts for confirmation before syncing
6. **Error Handling**: If sync fails, choose to replace the table or skip it
7. **Loop Control**: After syncing a database, either go to next database or exit
8. **Smart Tracking**: Remembers which databases have been synced and excludes them from future selections

## Workflow

```
Start
  ↓
Check Connections (Local & Prod)
  ↓
┌─────────────────────────────────────┐
│  Select Database                    │
│ (exclude already synced ones)       │
│  ↓                                  │
│ Compare All Tables                  │
│  ↓                                  │
│ Show Summary Report                 │
│  ↓                                  │
│ ┌─────────────────────────────────┐ │
│ │ Sync Table by Table             │ │
│ │ (only tables with differences)  │ │
│ │  ↓                              │ │
│ │ Confirm & Sync Each Table       │ │
│ │  ↓                              │ │
│ │ Continue to next table?         │ │
│ └─────────────────────────────────┘ │
│  ↓                                  │
│ Continue to next database?          │
└─────────────────────────────────────┘
  ↓
Exit
```

## Output Example

The tool displays a clear summary for each database:

```
╔════════════════════════════════════════╗
║  Database: my_database                 ║
╚════════════════════════════════════════╝

  ✓ users                               [In sync]
  ⚠ products                            [45 records to sync]
  ⚠ orders                              [12 records to sync]
  ✓ categories                          [In sync]

Summary: 2 in sync | 2 need sync | 0 errors
```

## Logging & Troubleshooting

### Accessing Logs
1. All sync sessions are automatically logged
2. Check the `logs/` directory in the project root
3. Each log file is named with timestamp: `sync_ddmmyyyyhhmmss.log`
4. Full path printed at the end of each session

### Using Logs for Troubleshooting
- **Connection Issues**: Check logs for initial connection errors
- **Sync Failures**: Review error details with full stack trace
- **Deletion Confirmation**: Verify what was deleted in logs
- **Recovery Actions**: Check backup table names and recovery status
- **Audit Trail**: All operations logged for compliance/reference

## Features Details

### Comparison Summary
- **Green (✓)**: Table is completely in sync between local and production
- **Yellow (⚠)**: Table has differences that need attention
- **Red (✗)**: Table-only records (in local but not in production)
- **Blue (⬆)**: Records that are only in production (will be added to local)

### Sync Process
- **Records to Add**: Copies new records from production to local
- **Records to Update**: Updates modified records in local with production versions
- **Records to Delete**: Optionally removes local-only records (not recommended)

### Error Recovery
When a sync error occurs, you have two options:
1. **Replace**: Renames the local table as backup and copies the entire table structure and data from production
   - Local table is renamed to: `table_name_backup_<timestamp>`
   - Fresh copy created from production
   - Safe way to recover from corrupted tables
2. **Skip**: Skip the current table and continue with the next one
   - No changes made
   - You can manually fix the table later

### Sync Logging
Every sync session is logged with detailed information:
- **Log Location**: `./logs/` directory
- **Log Format**: `sync_ddmmyyyyhhmmss.log`
- **Logs Include**:
  - Connection status
  - Database and table comparisons
  - Sync operations (success/failure)
  - Error details with stack traces
  - Session summary with statistics
  - Recovery actions taken
- **Usage**: Reference logs to troubleshoot failed syncs or verify completed operations

### Deletion Safety
When local-only records are detected:
- **Clear Prompt**: Explicitly reminds you that production data is live
- **Default**: Set to NOT delete (safe default)
- **Logging**: All deletion operations are logged for audit trail

### Database Tracking
- Once a database is synced, it won't appear in the selection menu again
- All synced databases are listed at the end of the session

