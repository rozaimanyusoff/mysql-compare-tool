import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import { MigrationService } from '../services/migration';

const router = Router();

// Get migration status (test connection)
router.post('/test-connection', async (req: Request, res: Response) => {
   try {
      const { mysqlHost, mysqlPort, mysqlUser, mysqlPassword, mysqlDatabase, postgresHost, postgresPort, postgresUser, postgresPassword, postgresDatabase } = req.body;

      if (!mysqlHost || !mysqlUser || !mysqlPassword || !mysqlDatabase || !postgresHost || !postgresUser || !postgresPassword || !postgresDatabase) {
         res.status(400).json({ error: 'Missing required fields' });
         return;
      }

      const migration = new MigrationService({
         mysqlHost,
         mysqlPort: mysqlPort || 3306,
         mysqlUser,
         mysqlPassword,
         mysqlDatabase,
         postgresHost,
         postgresPort: postgresPort || 5432,
         postgresUser,
         postgresPassword,
         postgresDatabase
      });

      const connected = await migration.connect();
      await migration.disconnect();

      logger.info('Migration connection test', { mysqlHost, postgresHost, success: connected });

      res.json({ success: connected });
   } catch (error) {
      const err = error as Error;
      logger.error('Migration connection test failed', err);
      res.status(500).json({ error: err.message });
   }
});

// Get MySQL tables
router.post('/get-tables', async (req: Request, res: Response) => {
   try {
      const { mysqlHost, mysqlPort, mysqlUser, mysqlPassword, mysqlDatabase } = req.body;

      if (!mysqlHost || !mysqlUser || !mysqlPassword || !mysqlDatabase) {
         res.status(400).json({ error: 'Missing required MySQL fields' });
         return;
      }

      const migration = new MigrationService({
         mysqlHost,
         mysqlPort: mysqlPort || 3306,
         mysqlUser,
         mysqlPassword,
         mysqlDatabase,
         postgresHost: 'localhost',
         postgresPort: 5432,
         postgresUser: 'postgres',
         postgresPassword: '',
         postgresDatabase: 'postgres'
      });

      await migration.connect();
      const tables = await migration.getTables();
      await migration.disconnect();

      logger.info('Retrieved MySQL tables', { count: tables.length });

      res.json({ tables });
   } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tables', err);
      res.status(500).json({ error: err.message });
   }
});

// Start migration
router.post('/start', async (req: Request, res: Response) => {
   try {
      const { mysqlHost, mysqlPort, mysqlUser, mysqlPassword, mysqlDatabase, postgresHost, postgresPort, postgresUser, postgresPassword, postgresDatabase, tables } = req.body;

      if (!mysqlHost || !mysqlUser || !mysqlPassword || !mysqlDatabase || !postgresHost || !postgresUser || !postgresPassword || !postgresDatabase || !tables || tables.length === 0) {
         res.status(400).json({ error: 'Missing required fields' });
         return;
      }

      const migration = new MigrationService({
         mysqlHost,
         mysqlPort: mysqlPort || 3306,
         mysqlUser,
         mysqlPassword,
         mysqlDatabase,
         postgresHost,
         postgresPort: postgresPort || 5432,
         postgresUser,
         postgresPassword,
         postgresDatabase
      });

      const connected = await migration.connect();
      if (!connected) {
         res.status(500).json({ error: 'Failed to connect to databases' });
         return;
      }

      const results: Array<{ table: string; success: boolean; message: string; recordsInserted?: number }> = [];

      for (const table of tables) {
         try {
            const result = await migration.migrateTable(table);
            results.push({ table, ...result });

            if (result.success) {
               logger.info(`Table migrated: ${table}`, { records: result.recordsInserted });
            } else {
               logger.warn(`Table migration failed: ${table}`, { message: result.message });
            }
         } catch (tableError) {
            const err = tableError as Error;
            logger.error(`Migration error for table ${table}`, err);
            results.push({
               table,
               success: false,
               message: `Error: ${err.message}`
            });
         }
      }

      await migration.disconnect();

      logger.info('Migration completed', { tablesCount: tables.length, successCount: results.filter(r => r.success).length });

      res.json({
         success: true,
         results,
         summary: {
            totalTables: results.length,
            successfulTables: results.filter(r => r.success).length,
            failedTables: results.filter(r => !r.success).length,
            totalRecordsMigrated: results.reduce((sum, r) => sum + (r.recordsInserted || 0), 0)
         }
      });
   } catch (error) {
      const err = error as Error;
      logger.error('Migration failed', err);
      res.status(500).json({ error: err.message });
   }
});

export default router;
