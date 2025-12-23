# Log File Examples

This file shows what you can expect to see in sync log files.

## Log File Location
```
./logs/sync_ddmmyyyyhhmmss.log
```

Example: `sync_23122024141230.log` = 23 Dec 2024, 14:12:30

## Sample Log File Content

```
[2024-12-23T14:12:30.123Z] ===== SYNC SESSION STARTED =====
[2024-12-23T14:12:30.456Z] INFO: MySQL Compare Tool started
[2024-12-23T14:12:31.789Z] INFO: Connecting to local database...
[2024-12-23T14:12:32.012Z] SUCCESS: Connected to local database
[2024-12-23T14:12:32.345Z] INFO: Connecting to production database...
[2024-12-23T14:12:33.678Z] SUCCESS: Connected to production database

[2024-12-23T14:12:34.901Z] --- Selecting Database ---
[2024-12-23T14:12:35.234Z] [DB: my_app_db] Database selected

[2024-12-23T14:12:36.567Z] --- Comparing All Tables ---
[2024-12-23T14:12:36.890Z] [DB: my_app_db] Found 8 tables. Comparing...
[2024-12-23T14:12:37.123Z] [DB: my_app_db] [TABLE: users] Comparing...
[2024-12-23T14:12:37.456Z] [DB: my_app_db] [TABLE: products] Comparing...
[2024-12-23T14:12:37.789Z] [DB: my_app_db] [TABLE: orders] Comparing...
[2024-12-23T14:12:38.012Z] [DB: my_app_db] [TABLE: categories] Comparing...
[2024-12-23T14:12:38.345Z] [DB: my_app_db] [TABLE: reviews] Comparing...
[2024-12-23T14:12:38.678Z] [DB: my_app_db] [TABLE: settings] Comparing...
[2024-12-23T14:12:39.901Z] [DB: my_app_db] [TABLE: logs] Comparing...
[2024-12-23T14:12:40.234Z] [DB: my_app_db] [TABLE: cache] Comparing...

[2024-12-23T14:12:41.567Z] --- Table Synchronization ---
[2024-12-23T14:12:42.890Z] [DB: my_app_db] [TABLE: users] Syncing 45 records...
[2024-12-23T14:12:43.123Z] SUCCESS: Successfully synced 45 records in users
[2024-12-23T14:12:43.456Z] [DB: my_app_db] [TABLE: products] Syncing 12 records...
[2024-12-23T14:12:43.789Z] SUCCESS: Successfully synced 12 records in products

[2024-12-23T14:12:44.012Z] [DB: my_app_db] [TABLE: orders] Sync cancelled by user
[2024-12-23T14:12:44.345Z] [DB: my_app_db] [TABLE: reviews] Syncing 8 records...
[2024-12-23T14:12:44.678Z] SUCCESS: Successfully synced 8 records in reviews

[2024-12-23T14:12:45.901Z] [DB: my_app_db] [TABLE: settings] Error: Foreign key constraint failed
  Details: Cannot add or update a child row: a foreign key constraint fails
  Stack: Error: Foreign key constraint failed at ...

[2024-12-23T14:12:46.234Z] ERROR: Sync failed for table "settings": Foreign key constraint failed
[2024-12-23T14:12:47.567Z] INFO: Replacing table "settings" with production version...
[2024-12-23T14:12:47.890Z] [DB: my_app_db] [TABLE: settings] Local table backed up as: settings_backup_1703329107890
[2024-12-23T14:12:48.123Z] SUCCESS: Table "settings" successfully replaced with production version

[2024-12-23T14:12:48.456Z] [DB: my_app_db] [TABLE: logs] Skipped syncing
[2024-12-23T14:12:48.789Z] [DB: my_app_db] [TABLE: cache] Sync cancelled by user

[2024-12-23T14:12:49.012Z] [DB: my_app_db] Sync session completed
[2024-12-23T14:12:49.345Z] SUCCESS: Database "my_app_db" sync session completed

[2024-12-23T14:12:50.678Z]
[2024-12-23T14:12:50.678Z] ═══════════════════════════════════════════
[2024-12-23T14:12:50.678Z] SESSION SUMMARY
[2024-12-23T14:12:50.678Z] ═══════════════════════════════════════════
[2024-12-23T14:12:50.678Z] Total Databases Synced: 1
[2024-12-23T14:12:50.678Z] Databases: my_app_db
[2024-12-23T14:12:50.678Z] Total Tables Processed: 8
[2024-12-23T14:12:50.678Z] Tables Synced: 5
[2024-12-23T14:12:50.678Z] Tables Skipped: 2
[2024-12-23T14:12:50.678Z] Errors Encountered: 1
[2024-12-23T14:12:50.678Z] Log File: /Users/rozaiman/mysql-compare-tool/logs/sync_23122024141250.log
[2024-12-23T14:12:50.678Z] ═══════════════════════════════════════════
```

## Reading Logs for Different Scenarios

### ✓ Successful Sync
Look for:
```
SUCCESS: Successfully synced X records in table_name
```

### ⚠️ Skipped Table
Look for:
```
[TABLE: table_name] Skipped syncing
```

### ✗ Error with Recovery
Look for:
```
ERROR: Sync failed for table "table_name": [error details]
INFO: Replacing table "table_name" with production version...
SUCCESS: Table "table_name" successfully replaced
[TABLE: table_name] Local table backed up as: table_name_backup_1234567890
```

### 📊 Quick Summary
Jump to the end of the log:
```
SESSION SUMMARY
═══════════════════════════════════════════
Total Databases Synced: X
Tables Processed: X (Synced: X, Skipped: X)
Errors Encountered: X
```

## Useful Commands

### View latest log
```bash
ls -lh logs/ | tail -1
```

### Check specific table in log
```bash
grep "TABLE: users" logs/sync_*.log
```

### Find all errors
```bash
grep "ERROR" logs/sync_*.log
```

### Find successful syncs
```bash
grep "Successfully synced" logs/sync_*.log
```

### View last sync summary
```bash
tail -20 logs/sync_$(ls logs/ | tail -1)
```

### Count total records synced
```bash
grep "Successfully synced" logs/sync_*.log | awk '{sum+=$9} END {print "Total records synced: " sum}'
```

## Log Retention

Logs are kept indefinitely. To clean up old logs:

```bash
# Remove logs older than 30 days
find logs/ -name "sync_*.log" -mtime +30 -delete

# Or keep only last 10 logs
ls logs/sync_*.log | sort -r | tail -n +11 | xargs rm
```

## Integration with External Tools

### Upload to monitoring system
```bash
# Add to cron job
0 22 * * * cp /path/to/logs/sync_*.log /backup/location/
```

### Email on error
```bash
if grep -q "ERROR" logs/sync_*.log; then
  echo "Sync errors detected" | mail -s "DB Sync Alert" admin@example.com
fi
```

### Parse for metrics
```bash
# Extract summary for dashboard
grep "SESSION SUMMARY" logs/sync_*.log -A 5 > metrics.txt
```
