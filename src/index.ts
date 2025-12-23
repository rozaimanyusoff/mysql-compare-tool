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
  promptForSyncErrorAction
} from './prompts';
import {
  compareTableData,
  printComparisonSummary,
  printDatabaseComparisonSummary,
  getRecordsToSync,
  getTablesToSync,
  TableComparison,
  DatabaseComparison
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

      // Compare all tables
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
            continue;
          }

          const localData = await localDB.getTableData(database, table);
          const prodData = await prodDB.getTableData(database, table);

          const comparison = compareTableData(localData, prodData, primaryKey);

          dbComparison.tables.push({
            table,
            primaryKey,
            localCount: localData.length,
            prodCount: prodData.length,
            comparison
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
      const tablesToSync = getTablesToSync(dbComparison);

      if (tablesToSync.length === 0) {
        printSuccess('All tables are in sync!');
        syncedDatabases.push(database);
        
        const continueNext = await promptContinueToNextDatabase();
        if (!continueNext) {
          continueLoop = false;
        }
        continue;
      }

      // Sync table by table
      logger.section('Table Synchronization');
      let remainingTables = [...tablesToSync];
      let skipRemaining = false;

      while (remainingTables.length > 0 && !skipRemaining) {
        const selectedTable = await promptForTableSyncSelection(remainingTables);

        if (!selectedTable) {
          logger.info('Skipping remaining tables for this database');
          printInfo('Skipping remaining tables for this database');
          skipRemaining = true;
          break;
        }

        // Get the comparison data
        const tableComp = selectedTable.comparison!;
        const recordsToSync = getRecordsToSync(tableComp);
        const recordsToDelete = tableComp.onlyInLocal.length;

        logger.section(`Syncing Table: ${selectedTable.table}`);
        const confirmSync = await promptForSyncConfirmation(
          selectedTable.comparison!.onlyInProduction.length,
          selectedTable.comparison!.modified.length,
          0
        );

        if (confirmSync) {
          try {
            // Sync the data
            if (recordsToSync.length > 0) {
              logger.table(database, selectedTable.table, `Syncing ${recordsToSync.length} records...`);
              await localDB.insertOrUpdateData(database, selectedTable.table, recordsToSync, selectedTable.primaryKey!);
              logger.success(`Successfully synced ${recordsToSync.length} records in ${selectedTable.table}`);
            }

            // Handle deletion if needed
            if (recordsToDelete > 0) {
              const confirmDelete = await promptForDeleteLocalOnly();
              if (confirmDelete) {
                logger.table(database, selectedTable.table, `Deleting ${recordsToDelete} local-only records...`);
                for (const record of tableComp.onlyInLocal) {
                  await localDB.deleteData(database, selectedTable.table, selectedTable.primaryKey!, record[selectedTable.primaryKey!]);
                }
                logger.success(`Successfully deleted ${recordsToDelete} records in ${selectedTable.table}`);
              }
            }

            totalTablesSynced++;
          } catch (syncError) {
            const error = syncError as Error;
            logger.error(`Sync failed for table "${selectedTable.table}": ${error.message}`, error);
            printError(`Sync failed for table "${selectedTable.table}": ${error.message}`);
            totalErrors++;
            
            const action = await promptForSyncErrorAction();
            
            if (action === 'replace') {
              try {
                logger.info(`Replacing table "${selectedTable.table}" with production version...`);
                printInfo(`Replacing table "${selectedTable.table}" with production version...`);
                
                // Rename local table as backup
                const backupName = `${selectedTable.table}_backup_${Date.now()}`;
                await localDB.renameTable(database, selectedTable.table, backupName);
                logger.table(database, selectedTable.table, `Local table backed up as: ${backupName}`);
                printInfo(`Local table backed up as: ${backupName}`);
                
                // Copy table structure and data from production
                await localDB.copyTableStructureAndData(
                  database,
                  selectedTable.table,
                  database,
                  selectedTable.table,
                  prodDB
                );
                
                logger.success(`Table "${selectedTable.table}" successfully replaced with production version`);
                totalTablesSynced++;
              } catch (replaceError) {
                const replaceErr = replaceError as Error;
                logger.error(`Failed to replace table: ${replaceErr.message}`, replaceErr);
                printError(`Failed to replace table: ${replaceErr.message}`);
                printWarning(`Please manually fix the table "${selectedTable.table}" and try again`);
                totalErrors++;
              }
            } else {
              logger.table(database, selectedTable.table, 'Skipped syncing');
              printWarning(`Skipped syncing table "${selectedTable.table}"`);
              totalTablesSkipped++;
            }
          }
        } else {
          logger.table(database, selectedTable.table, 'Sync cancelled by user');
          printWarning('Sync cancelled for this table');
          totalTablesSkipped++;
        }

        // Remove synced table from remaining
        remainingTables = remainingTables.filter(t => t.table !== selectedTable.table);
      }

      // Mark database as synced
      syncedDatabases.push(database);
      logger.database(database, `Sync session completed`);
      logger.success(`Database "${database}" sync session completed`);

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
