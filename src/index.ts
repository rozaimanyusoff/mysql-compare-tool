import dotenv from 'dotenv';
import chalk from 'chalk';
import { DatabaseConnection, DBConfig } from './database';
import { logger } from './logger';
import {
  promptForDatabaseSelection,
  promptForDatabaseSelectionWithExclusion,
  promptForTableSyncSelection,
  promptForSyncConfirmation,
  promptForDeleteLocalOnly,
  promptContinueToNextDatabase,
  promptForSyncErrorAction,
  promptForMissingColumnsInLocal,
  promptForMissingColumnsInProduction
} from './prompts';
import {
  compareTableData,
  printComparisonSummary,
  printDatabaseComparisonSummary,
  getRecordsToSync,
  getTablesToSync,
  TableComparison,
  DatabaseComparison,
  compareTableColumns,
  hasTableDifferences
} from './comparison';
import {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printSection
} from './ui';

dotenv.config();

async function main(): Promise<void> {
  try {
    printHeader();
    logger.info('MySQL Compare Tool started');

    // Validate environment variables
    const requiredEnvVars = [
      'LOCAL_DB_HOST',
      'LOCAL_DB_PORT',
      'LOCAL_DB_USER',
      'LOCAL_DB_PASSWORD',
      'PROD_DB_HOST',
      'PROD_DB_PORT',
      'PROD_DB_USER',
      'PROD_DB_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      logger.error(`Missing environment variables: ${missingVars.join(', ')}`);
      printInfo('Please create a .env file with all required variables');
      process.exit(1);
    }

    // Create database connections
    const localConfig: DBConfig = {
      host: process.env.LOCAL_DB_HOST!,
      port: parseInt(process.env.LOCAL_DB_PORT!),
      user: process.env.LOCAL_DB_USER!,
      password: process.env.LOCAL_DB_PASSWORD!
    };

    const prodConfig: DBConfig = {
      host: process.env.PROD_DB_HOST!,
      port: parseInt(process.env.PROD_DB_PORT!),
      user: process.env.PROD_DB_USER!,
      password: process.env.PROD_DB_PASSWORD!
    };

    // Test connections
    logger.section('Checking Database Connections');

    const localDB = new DatabaseConnection(localConfig);
    const prodDB = new DatabaseConnection(prodConfig);

    logger.info('Connecting to local database...');
    if (!(await localDB.connect())) {
      logger.error('Failed to connect to local database');
      process.exit(1);
    }
    logger.success('Connected to local database');

    logger.info('Connecting to production database...');
    if (!(await prodDB.connect())) {
      logger.error('Failed to connect to production database');
      await localDB.disconnect();
      process.exit(1);
    }
    logger.success('Connected to production database');

    // Main loop for database selection
    const syncedDatabases: string[] = [];
    let continueLoop = true;
    let totalTablesProcessed = 0;
    let totalTablesSynced = 0;
    let totalTablesSkipped = 0;
    let totalErrors = 0;

    while (continueLoop) {
      // Get available databases
      const localDatabases = await localDB.getDatabases();

      // Select database with exclusion of already synced ones
      logger.section('Selecting Database');
      let database: string | null;
      
      if (syncedDatabases.length > 0) {
        database = await promptForDatabaseSelectionWithExclusion(localDatabases, syncedDatabases);
        if (!database) {
          logger.info('All databases have been synced. Exiting...');
          printInfo('All databases have been synced. Exiting...');
          break;
        }
      } else {
        database = await promptForDatabaseSelection(localDatabases);
      }

      logger.database(database, 'Database selected');
      printSuccess(`Selected database: ${database}`);

      // Get all tables
      logger.section('Comparing All Tables');
      const tables = await localDB.getTables(database);
      if (tables.length === 0) {
        logger.warning(`No tables found in database: ${database}`);
        printWarning('No tables found in this database');
        syncedDatabases.push(database);
        
        const continueNext = await promptContinueToNextDatabase();
        if (!continueNext) {
          continueLoop = false;
        }
        continue;
      }

      logger.database(database, `Found ${tables.length} tables. Comparing...`);

      // Compare all tables with column consistency checks
      const dbComparison: DatabaseComparison = {
        database,
        tables: []
      };

      for (const table of tables) {
        try {
          const primaryKey = await localDB.getPrimaryKey(database, table);
          
          if (!primaryKey) {
            dbComparison.tables.push({
              table,
              primaryKey: null,
              localCount: 0,
              prodCount: 0,
              comparison: null,
              error: 'No primary key'
            });
            logger.table(database, table, 'Skipped: No primary key');
            continue;
          }

          // Check column consistency first
          const localColumns = await localDB.getColumnNames(database, table);
          const prodColumns = await prodDB.getColumnNames(database, table);
          const columnConsistency = compareTableColumns(localColumns, prodColumns);

          const localData = await localDB.getTableData(database, table);
          const prodData = await prodDB.getTableData(database, table);

          const comparison = compareTableData(localData, prodData, primaryKey);

          dbComparison.tables.push({
            table,
            primaryKey,
            localCount: localData.length,
            prodCount: prodData.length,
            comparison,
            columnConsistency: {
              ...columnConsistency,
              table
            }
          });
        } catch (error) {
          const err = error as Error;
          logger.table(database, table, `Error: ${err.message}`);
          dbComparison.tables.push({
            table,
            primaryKey: null,
            localCount: 0,
            prodCount: 0,
            comparison: null,
            error: err.message
          });
          totalErrors++;
        }
      }

      // Print comparison summary
      printDatabaseComparisonSummary(dbComparison);

      // Count processed tables
      totalTablesProcessed += tables.length;

      // Auto-sync all tables
      logger.section('Auto-syncing All Tables');
      printInfo('Starting automatic synchronization of all tables...\n');

      let skippedTableCount = 0;

      for (const tableComp of dbComparison.tables) {
        // Skip tables with errors or no differences
        if (tableComp.error) {
          logger.table(database, tableComp.table, `Skipped: ${tableComp.error}`);
          printWarning(`⚠ Skipping ${tableComp.table}: ${tableComp.error}`);
          totalTablesSkipped++;
          skippedTableCount++;
          continue;
        }

        // Check column consistency
        const colConsistency = tableComp.columnConsistency;
        if (colConsistency) {
          // Handle missing columns in local database
          if (colConsistency.missingInLocal.length > 0) {
            logger.section(`Column Check: ${tableComp.table}`);
            printWarning(`Columns missing in local database:`);
            colConsistency.missingInLocal.forEach(col => printInfo(`  • ${col}`));

            const shouldAdd = await promptForMissingColumnsInLocal(colConsistency.missingInLocal);
            if (shouldAdd) {
              try {
                for (const col of colConsistency.missingInLocal) {
                  const colDef = await prodDB.getColumnDefinition(database, tableComp.table, col);
                  await localDB.addColumn(database, tableComp.table, col, colDef);
                  logger.table(database, tableComp.table, `Added column: ${col}`);
                  printSuccess(`✓ Added column: ${col}`);
                }
              } catch (err) {
                const error = err as Error;
                logger.error(`Failed to add columns to ${tableComp.table}: ${error.message}`, err as Error);
                printError(`Failed to add columns: ${error.message}`);
                totalErrors++;
                continue;
              }
            } else {
              logger.table(database, tableComp.table, 'Skipped adding missing local columns');
              printWarning(`Skipping column addition for ${tableComp.table}`);
              totalTablesSkipped++;
              skippedTableCount++;
              continue;
            }
          }

          // Handle missing columns in production database
          if (colConsistency.missingInProduction.length > 0) {
            logger.section(`Column Check: ${tableComp.table}`);
            printWarning(`Columns missing in production database:`);
            colConsistency.missingInProduction.forEach(col => printInfo(`  • ${col}`));

            const action = await promptForMissingColumnsInProduction(colConsistency.missingInProduction);
            if (action === 'skip') {
              logger.table(database, tableComp.table, 'Skipped: Columns missing in production');
              printWarning(`Skipping ${tableComp.table}: Columns missing in production`);
              totalTablesSkipped++;
              skippedTableCount++;
              continue;
            } else {
              try {
                for (const col of colConsistency.missingInProduction) {
                  const colDef = await localDB.getColumnDefinition(database, tableComp.table, col);
                  await prodDB.addColumn(database, tableComp.table, col, colDef);
                  logger.table(database, tableComp.table, `Added column to production: ${col}`);
                  printSuccess(`✓ Added column to production: ${col}`);
                }
              } catch (err) {
                const error = err as Error;
                logger.error(`Failed to add columns to production ${tableComp.table}: ${error.message}`, err as Error);
                printError(`Failed to add columns to production: ${error.message}`);
                totalErrors++;
              }
            }
          }
        }

        // Skip if no data differences
        if (!tableComp.comparison || (!hasTableDifferences(tableComp))) {
          logger.table(database, tableComp.table, 'Already in sync');
          printSuccess(`✓ ${tableComp.table}: Already in sync`);
          continue;
        }

        // Sync the table data
        logger.section(`Syncing Table: ${tableComp.table}`);
        
        const recordsToSync = getRecordsToSync(tableComp.comparison);
        const recordsToDelete = tableComp.comparison.onlyInLocal.length;

        printInfo(`${tableComp.table}:`);
        console.log(`  • Records to add: ${tableComp.comparison.onlyInProduction.length}`);
        console.log(`  • Records to update: ${tableComp.comparison.modified.length}`);
        console.log(`  • Records to delete: ${recordsToDelete}\n`);

        try {
          // Sync the data
          if (recordsToSync.length > 0) {
            logger.table(database, tableComp.table, `Syncing ${recordsToSync.length} records...`);
            printInfo(`Syncing ${recordsToSync.length} records...`);
            await localDB.insertOrUpdateData(database, tableComp.table, recordsToSync, tableComp.primaryKey!);
            logger.success(`Successfully synced ${recordsToSync.length} records in ${tableComp.table}`);
            printSuccess(`✓ Synced ${recordsToSync.length} records`);
          }

          // Handle deletion if needed
          if (recordsToDelete > 0) {
            logger.table(database, tableComp.table, `Found ${recordsToDelete} local-only records`);
            const confirmDelete = await promptForDeleteLocalOnly();
            if (confirmDelete) {
              logger.table(database, tableComp.table, `Deleting ${recordsToDelete} local-only records...`);
              printInfo(`Deleting ${recordsToDelete} records...`);
              for (const record of tableComp.comparison.onlyInLocal) {
                await localDB.deleteData(database, tableComp.table, tableComp.primaryKey!, record[tableComp.primaryKey!]);
              }
              logger.success(`Successfully deleted ${recordsToDelete} records in ${tableComp.table}`);
              printSuccess(`✓ Deleted ${recordsToDelete} records`);
            } else {
              logger.table(database, tableComp.table, 'User declined deletion of local-only records');
              printWarning(`Skipped deletion of ${recordsToDelete} local-only records`);
            }
          }

          totalTablesSynced++;
          logger.table(database, tableComp.table, 'Successfully synced');
        } catch (syncError) {
          const error = syncError as Error;
          logger.error(`Sync failed for table "${tableComp.table}": ${error.message}`, error);
          printError(`Sync failed for table "${tableComp.table}": ${error.message}`);
          totalErrors++;
          
          const action = await promptForSyncErrorAction();
          
          if (action === 'replace') {
            try {
              logger.info(`Replacing table "${tableComp.table}" with production version...`);
              printInfo(`Replacing table "${tableComp.table}" with production version...`);
              
              // Rename local table as backup
              const backupName = `${tableComp.table}_backup_${Date.now()}`;
              await localDB.renameTable(database, tableComp.table, backupName);
              logger.table(database, tableComp.table, `Local table backed up as: ${backupName}`);
              printInfo(`Local table backed up as: ${backupName}`);
              
              // Copy table structure and data from production
              await localDB.copyTableStructureAndData(
                database,
                tableComp.table,
                database,
                tableComp.table,
                prodDB
              );
              
              logger.success(`Table "${tableComp.table}" successfully replaced with production version`);
              printSuccess(`✓ Table replaced with production version`);
              totalTablesSynced++;
            } catch (replaceError) {
              const replaceErr = replaceError as Error;
              logger.error(`Failed to replace table: ${replaceErr.message}`, replaceErr);
              printError(`Failed to replace table: ${replaceErr.message}`);
              printWarning(`Please manually fix the table "${tableComp.table}" and try again`);
              totalErrors++;
              totalTablesSkipped++;
              skippedTableCount++;
            }
          } else {
            logger.table(database, tableComp.table, 'Skipped syncing');
            printWarning(`Skipped syncing table "${tableComp.table}"`);
            totalTablesSkipped++;
            skippedTableCount++;
          }
        }
      }

      // Mark database as synced
      syncedDatabases.push(database);
      logger.database(database, `Sync session completed`);
      logger.success(`Database "${database}" sync session completed`);
      printSection('Database Sync Complete');
      printSuccess(`✓ Synced ${totalTablesSynced} table(s) in database "${database}"`);
      if (skippedTableCount > 0) {
        printWarning(`⚠ Skipped ${skippedTableCount} table(s)`);
      }

      // Ask to continue to next database
      const continueNext = await promptContinueToNextDatabase();
      if (!continueNext) {
        continueLoop = false;
      }
    }

    // Cleanup
    await localDB.disconnect();
    await prodDB.disconnect();

    // Print and log summary
    logger.summary(syncedDatabases, totalTablesProcessed, totalTablesSynced, totalTablesSkipped, totalErrors);
    printSection('Session Complete');
    printSuccess(`Synced ${syncedDatabases.length} database(s): ${syncedDatabases.join(', ')}`);
    console.log(chalk.cyan(`\nLog saved to: ${logger.getLogFilePath()}\n`));
    process.exit(0);

  } catch (error) {
    const err = error as Error;
    logger.error('Unhandled error occurred', err);
    console.error(chalk.red('\n✗ Error:'), err);
    process.exit(1);
  }
}

main();
