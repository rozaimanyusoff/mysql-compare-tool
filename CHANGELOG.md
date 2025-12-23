# MySQL Compare Tool - Quick Reference & Changes

## Latest Updates (23 Dec 2025)

### 1. Fixed Table Copy Error
**Problem**: SQL syntax error when copying tables from production with reserved keywords
**Solution**: Simplified `copyTableStructureAndData()` function to use:
- `DROP TABLE IF EXISTS` (safe drop)
- `CREATE TABLE ... LIKE` (structure copy)
- `INSERT INTO ... SELECT *` (data copy)

**Result**: Tables with reserved keywords (like "group") now copy correctly ✅

---

### 2. Comprehensive Sync Logging
**New Feature**: Every sync session creates a detailed log file

**Log Files**:
- Location: `./logs/` directory
- Format: `sync_ddmmyyyyhhmmss.log` (e.g., `sync_23122024141230.log`)
- Created automatically on each run

**What's Logged**:
```
✓ Connection attempts and results
✓ Database/table selections
✓ Comparison results per table
✓ Sync operations (add, update, delete)
✓ Errors with full stack traces
✓ Recovery actions (replace/skip)
✓ Session summary with statistics
✓ Log file path printed at end
```

**Access Logs**:
```bash
# View latest log
cat logs/sync_*.log | tail -100

# Search for errors
grep "ERROR" logs/sync_*.log

# View session summary
grep "SESSION SUMMARY" logs/sync_*.log -A 10
```

---

### 3. Production-Safe Deletion Prompt
**Enhancement**: More explicit deletion warning

**Before**: 
```
Delete records that only exist in local? (not recommended)
```

**After**:
```
Delete records that only exist in local? (Production data is live - only delete if intentional)
```

**Safety**:
- Default is always `false` (safe)
- All deletions are logged with details
- Requires explicit confirmation

---

### 4. Enhanced Error Recovery

When sync fails, you now see:

```
✗ Sync failed for table "users": [Error details]
? Error occurred during sync. What would you like to do?
  ▸ Replace - Delete/rename local table and copy from production
    Skip - Skip this table and continue to the next one
```

**Option 1: Replace**
- Renames local table: `tablename_backup_<timestamp>`
- Copies fresh structure from production
- Continues to next table
- Logged with backup details

**Option 2: Skip**
- No changes made
- Move to next table
- Manual fix can be done later
- Logged as skipped

---

## File Structure

```
mysql-compare-tool/
├── src/
│   ├── index.ts          # Main app with logging integration
│   ├── database.ts       # DB methods + copyTableStructureAndData fix
│   ├── comparison.ts     # Table comparison logic
│   ├── prompts.ts        # CLI prompts (enhanced deletion msg)
│   ├── logger.ts         # NEW: Timestamped logging system
│   └── ui.ts             # Console output formatting
├── dist/                 # Compiled JavaScript
├── logs/                 # NEW: Sync logs directory
├── package.json
├── README.md
└── .gitignore           # Updated to include logs/
```

---

## Key Improvements

### Before
- Single sync error = failure
- No detailed logging
- Manual investigation needed
- Lost session history

### After
- Sync error = recovery options
- Complete sync logs with timestamps
- Audit trail for all operations
- Session statistics and summary
- Backup tables for safety

---

## Using the Tool

### Basic Usage
```bash
npm start          # Compiled version
npm run dev        # TypeScript version
```

### Workflow
1. Tool connects to both MySQL servers
2. You select a database
3. ALL tables compared automatically
4. Summary shows status for each table
5. Sync each table needing updates
6. If error: choose Replace or Skip
7. Session logged with full details

### After Sync
- Check logs: `logs/sync_*.log`
- Verify tables synced
- Review any errors
- Check for backup tables if replaced

---

## Troubleshooting

### "Copy failed" Error?
✓ Fixed - Use latest build with new copyTableStructureAndData()

### Need to audit sync?
✓ Check logs directory - all operations logged

### Deleted wrong data?
✓ Check `tablename_backup_<timestamp>` for recovery

### Want to redo a sync?
✓ Just run the tool again - already-synced DBs excluded automatically

---

## Statistics & Monitoring

At end of each session, you'll see:
```
╔════════════════════════════════════════╗
SESSION SUMMARY
═══════════════════════════════════════════
Databases Synced: 2
Tables Processed: 15 (Synced: 12, Skipped: 2)
Errors: 1
Log File: /path/to/logs/sync_23122024141230.log
═══════════════════════════════════════════
```

---

## Next Steps

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Configure .env** (if not done):
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL credentials
   ```

3. **Run the tool**:
   ```bash
   npm start
   ```

4. **Check logs**:
   ```bash
   ls -lh logs/
   ```

---

## Technical Details

### Logger System
- **File**: `src/logger.ts`
- **Features**:
  - Timestamped entries (ISO format in logs)
  - Colored console output
  - File append mode (thread-safe)
  - Methods: info(), success(), error(), warning(), section(), database(), table(), summary()

### Database Methods (Fixed)
- **File**: `src/database.ts`
- **New/Fixed**:
  - `dropTable()` - Safe DROP TABLE IF EXISTS
  - `renameTable()` - For backup tables
  - `copyTableStructureAndData()` - Fixed to handle reserved keywords

### Logging Integration
- **File**: `src/index.ts`
- **Coverage**:
  - Connection status
  - Database/table selection
  - Comparison results
  - Sync operations
  - Error handling
  - Session summary

---

## Support

For issues or errors:
1. Check the log file first
2. Look for error details with stack trace
3. Check backup tables if replacement was attempted
4. Review comparison results in logs

Log files are your best friend for debugging! 🎯
