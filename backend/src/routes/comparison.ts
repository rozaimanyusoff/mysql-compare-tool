import { Router, Request, Response } from 'express';
import { getCredentialById } from '../db';
import { logger } from '../logger';
import {
  DatabaseConnection,
  compareTableData,
  compareTableColumns,
  getRecordsToSync,
  TableComparison,
  DBConfig
} from '../services/comparison';

const router = Router();

// Test database connection
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { credentialId } = req.body;

    if (!credentialId) {
      res.status(400).json({ error: 'Missing credentialId' });
      return;
    }

    const credential = await getCredentialById(credentialId);
    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    logger.info('Testing connection', { credentialId, name: credential.name });

    const config: DBConfig = {
      host: credential.host,
      port: credential.port,
      user: credential.user,
      password: credential.password
    };

    const db = new DatabaseConnection(config);
    const connected = await db.connect();

    if (!connected) {
      logger.error('Failed to connect to database', { credentialId });
      res.json({ success: false, error: 'Failed to connect' });
      return;
    }

    const isAlive = await db.testConnection();
    await db.disconnect();

    logger.info('Connection test successful', { credentialId, alive: isAlive });
    res.json({ success: isAlive });
  } catch (error) {
    const err = error as Error;
    logger.error('Connection test failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Get databases
router.get('/databases', async (req: Request, res: Response) => {
  try {
    const { credentialId } = req.query;

    if (!credentialId) {
      res.status(400).json({ error: 'Missing credentialId' });
      return;
    }

    const credential = await getCredentialById(credentialId as string);
    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const config: DBConfig = {
      host: credential.host,
      port: credential.port,
      user: credential.user,
      password: credential.password
    };

    const db = new DatabaseConnection(config);
    if (!(await db.connect())) {
      res.status(500).json({ error: 'Failed to connect to database' });
      return;
    }

    const databases = await db.getDatabases();
    await db.disconnect();

    res.json({ databases });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Compare databases
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { localCredentialId, prodCredentialId, database } = req.body;

    if (!localCredentialId || !prodCredentialId || !database) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const localCred = await getCredentialById(localCredentialId);
    const prodCred = await getCredentialById(prodCredentialId);

    if (!localCred || !prodCred) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const localConfig: DBConfig = {
      host: localCred.host,
      port: localCred.port,
      user: localCred.user,
      password: localCred.password
    };

    const prodConfig: DBConfig = {
      host: prodCred.host,
      port: prodCred.port,
      user: prodCred.user,
      password: prodCred.password
    };

    const localDB = new DatabaseConnection(localConfig);
    const prodDB = new DatabaseConnection(prodConfig);

    if (!(await localDB.connect())) {
      res.status(500).json({ error: 'Failed to connect to local database' });
      return;
    }

    if (!(await prodDB.connect())) {
      await localDB.disconnect();
      res.status(500).json({ error: 'Failed to connect to production database' });
      return;
    }

    const localTables = await localDB.getTables(database);
    const prodTables = await prodDB.getTables(database);
    const tableComparisons: TableComparison[] = [];

    console.log(`Local tables: ${localTables.join(', ')}`);
    console.log(`Production tables: ${prodTables.join(', ')}`);

    // Compare ALL production tables (production is the source of truth)
    for (const table of prodTables) {
      try {
        const primaryKey = await prodDB.getPrimaryKey(database, table);
        const prodColumns = await prodDB.getColumnNames(database, table);
        let localColumns: string[] = [];
        let localData: any[] = [];
        
        // Try to get local data, but don't fail if the table doesn't exist there
        try {
          localColumns = await localDB.getColumnNames(database, table);
          localData = await localDB.getTableData(database, table);
        } catch (localError) {
          // Table might not exist in local, which is fine
          localColumns = [];
          localData = [];
        }
        
        // Get production data
        let prodData: any[] = [];
        try {
          prodData = await prodDB.getTableData(database, table);
        } catch (prodError) {
          prodData = [];
        }
        
        // If no primary key, still show the table but mark it
        if (!primaryKey) {
          tableComparisons.push({
            table,
            primaryKey: null,
            localCount: localData.length,
            prodCount: prodData.length,
            comparison: null,
            error: 'No primary key in production (table exists but cannot sync)',
            onlyInProduction: localData.length === 0 && localColumns.length === 0
          });
          continue;
        }
        
        const columnConsistency = compareTableColumns(localColumns, prodColumns);
        const comparison = compareTableData(localData, prodData, primaryKey);

        tableComparisons.push({
          table,
          primaryKey,
          localCount: localData.length,
          prodCount: prodData.length,
          comparison,
          columnConsistency: {
            ...columnConsistency,
            table
          },
          onlyInProduction: localData.length === 0 && localColumns.length === 0
        });
      } catch (error) {
        const err = error as Error;
        console.error(`Error processing table ${table}:`, err);
        tableComparisons.push({
          table,
          primaryKey: null,
          localCount: 0,
          prodCount: 0,
          comparison: null,
          error: err.message
        });
      }
    }

    await localDB.disconnect();
    await prodDB.disconnect();

    res.json({
      database,
      tables: tableComparisons
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Export table data as SQL
router.get('/export-table/:credentialId/:database/:table', async (req: Request, res: Response) => {
  try {
    const { credentialId, database, table } = req.params;

    if (!credentialId || !database || !table) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const credential = await getCredentialById(credentialId);
    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const config: DBConfig = {
      host: credential.host,
      port: credential.port,
      user: credential.user,
      password: credential.password
    };

    const db = new DatabaseConnection(config);
    if (!(await db.connect())) {
      res.status(500).json({ error: 'Failed to connect to database' });
      return;
    }

    let createTableStatement: string | null = null;
    let data: any[] = [];
    let totalRecords = 0;

    try {
      // Try to get the CREATE TABLE statement
      createTableStatement = await db.getCreateTableStatement(database, table);
      
      // Try to get the table data
      data = await db.getTableData(database, table);
      totalRecords = data.length;
    } catch (error) {
      const err = error as Error;
      // If we can't get either the structure or data, it likely means the table doesn't exist
      if (err.message.includes("doesn't exist")) {
        await db.disconnect();
        res.status(404).json({ 
          error: `Table "${table}" not found in database "${database}". Please verify the table exists on the source database.` 
        });
        return;
      }
      throw error;
    }

    await db.disconnect();

    // If no data but we have the structure, still export the CREATE TABLE
    if (totalRecords === 0) {
      if (!createTableStatement) {
        res.status(400).json({ error: 'No data found in table and cannot retrieve table structure' });
        return;
      }

      // Export just the table structure
      const sqlStatements = [
        `-- SQL Export from ${database}.${table}`,
        `-- Generated: ${new Date().toISOString()}`,
        `-- Total records: 0 (structure only)`,
        '',
        createTableStatement + ';'
      ].join('\n');

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${table}.sql"`);
      res.send(sqlStatements);
      return;
    }

    // Convert to SQL INSERT statements
    const headers = Object.keys(data[0]);
    const sqlStatements = [
      `-- SQL Export from ${database}.${table}`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- Total records: ${totalRecords}`,
      '',
      (createTableStatement || `CREATE TABLE IF NOT EXISTS \`${table}\` ();`) + ';',
      '',
      ...data.map(row => {
        const columns = headers.map(h => `\`${h}\``).join(', ');
        const values = headers.map(h => {
          const value = (row as any)[h];
          if (value === null || value === undefined) return 'NULL';
          if (typeof value === 'number') return value;
          if (typeof value === 'boolean') return value ? '1' : '0';
          const escaped = String(value).replace(/'/g, "''");
          return `'${escaped}'`;
        }).join(', ');
        return `INSERT INTO \`${table}\` (${columns}) VALUES (${values});`;
      })
    ].join('\n');

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${table}.sql"`);
    res.send(sqlStatements);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Sync table data
router.post('/sync-table', async (req: Request, res: Response) => {
  try {
    const { localCredentialId, prodCredentialId, database, table, primaryKey } = req.body;

    if (!localCredentialId || !prodCredentialId || !database || !table || !primaryKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const localCred = await getCredentialById(localCredentialId);
    const prodCred = await getCredentialById(prodCredentialId);

    if (!localCred || !prodCred) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const localConfig: DBConfig = {
      host: localCred.host,
      port: localCred.port,
      user: localCred.user,
      password: localCred.password
    };

    const prodConfig: DBConfig = {
      host: prodCred.host,
      port: prodCred.port,
      user: prodCred.user,
      password: prodCred.password
    };

    const localDB = new DatabaseConnection(localConfig);
    const prodDB = new DatabaseConnection(prodConfig);

    if (!(await localDB.connect()) || !(await prodDB.connect())) {
      res.status(500).json({ error: 'Failed to connect to databases' });
      return;
    }

    const localData = await localDB.getTableData(database, table);
    const prodData = await prodDB.getTableData(database, table);

    const comparison = compareTableData(localData, prodData, primaryKey);
    const recordsToSync = getRecordsToSync(comparison);

    if (recordsToSync.length > 0) {
      await localDB.insertOrUpdateData(database, table, recordsToSync, primaryKey);
    }

    await localDB.disconnect();
    await prodDB.disconnect();

    res.json({
      success: true,
      message: `Synced ${recordsToSync.length} records`,
      syncedRecords: recordsToSync.length
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Sync schema (columns) from production to local
router.post('/sync-schema', async (req: Request, res: Response) => {
  try {
    const { localCredentialId, prodCredentialId, database, table } = req.body;

    if (!localCredentialId || !prodCredentialId || !database || !table) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const localCred = await getCredentialById(localCredentialId);
    const prodCred = await getCredentialById(prodCredentialId);

    if (!localCred || !prodCred) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const localConfig: DBConfig = {
      host: localCred.host,
      port: localCred.port,
      user: localCred.user,
      password: localCred.password
    };

    const prodConfig: DBConfig = {
      host: prodCred.host,
      port: prodCred.port,
      user: prodCred.user,
      password: prodCred.password
    };

    const localDB = new DatabaseConnection(localConfig);
    const prodDB = new DatabaseConnection(prodConfig);

    if (!(await localDB.connect()) || !(await prodDB.connect())) {
      res.status(500).json({ error: 'Failed to connect to databases' });
      return;
    }

    try {
      // Get column structures from both databases
      const localStructure = await localDB.getTableStructure(database, table);
      const prodStructure = await prodDB.getTableStructure(database, table);

      const localCols = new Set((localStructure as any[]).map(col => col.COLUMN_NAME));
      const prodCols = new Map((prodStructure as any[]).map(col => [col.COLUMN_NAME, col]));

      // Find missing columns in local
      const missingCols: string[] = [];
      for (const [colName, colInfo] of prodCols) {
        if (!localCols.has(colName)) {
          missingCols.push(colName);
        }
      }

      if (missingCols.length === 0) {
        await localDB.disconnect();
        await prodDB.disconnect();
        res.json({
          success: true,
          message: 'All columns already exist in local',
          addedColumns: []
        });
        return;
      }

      // Add missing columns to local table
      const addedColumns: string[] = [];
      for (const colName of missingCols) {
        const colInfo = prodCols.get(colName) as any;
        const colDef = await prodDB.getColumnDefinition(database, table, colName);
        
        try {
          await localDB.addColumn(database, table, colName, colDef);
          addedColumns.push(colName);
        } catch (colErr) {
          console.error(`Failed to add column ${colName}:`, colErr);
          // Continue with other columns
        }
      }

      await localDB.disconnect();
      await prodDB.disconnect();

      res.json({
        success: true,
        message: `Added ${addedColumns.length} column(s) to local`,
        addedColumns
      });
    } catch (error) {
      await localDB.disconnect();
      await prodDB.disconnect();
      throw error;
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

