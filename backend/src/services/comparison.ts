import * as mysql from 'mysql2/promise';
import { Connection } from 'mysql2/promise';

export interface ComparisonResult {
  onlyInLocal: any[];
  onlyInProduction: any[];
  modified: Array<{ local: any; production: any }>;
  identical: any[];
}

export interface ColumnConsistency {
  table: string;
  missingInLocal: string[];
  missingInProduction: string[];
  allColumnsMatch: boolean;
}

export interface TableComparison {
  table: string;
  primaryKey: string | null;
  localCount: number;
  prodCount: number;
  comparison: ComparisonResult | null;
  columnConsistency?: ColumnConsistency;
  error?: string;
  onlyInProduction?: boolean;
}

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export class DatabaseConnection {
  private config: DBConfig;
  public connection: Connection | null = null;

  constructor(config: DBConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      this.connection = await mysql.createConnection(this.config);
      return true;
    } catch (error) {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async getDatabases(): Promise<string[]> {
    if (!this.connection) throw new Error('Not connected');
    const [rows] = await this.connection.query('SHOW DATABASES');
    return (rows as Array<{ Database: string }>).map(row => row.Database);
  }

  async getTables(database: string): Promise<string[]> {
    if (!this.connection) throw new Error('Not connected');
    const [rows] = await this.connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [database]
    );
    return (rows as Array<{ TABLE_NAME: string }>).map(row => row.TABLE_NAME);
  }

  async getTableData(database: string, table: string): Promise<any[]> {
    if (!this.connection) throw new Error('Not connected');
    const query = `SELECT * FROM ${database}.${table}`;
    const [rows] = await this.connection.query(query);
    return rows as any[];
  }

  async getPrimaryKey(database: string, table: string): Promise<string | null> {
    if (!this.connection) throw new Error('Not connected');
    const [rows] = await this.connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'`,
      [database, table]
    );
    const keys = rows as Array<{ COLUMN_NAME: string }>;
    return keys.length > 0 ? keys[0].COLUMN_NAME : null;
  }

  async insertOrUpdateData(
    database: string,
    table: string,
    data: any[],
    primaryKey: string
  ): Promise<void> {
    if (!this.connection) throw new Error('Not connected');

    for (const record of data) {
      const columns = Object.keys(record);
      const values = Object.values(record);
      const placeholders = columns.map(() => '?').join(',');
      const updateClause = columns
        .filter(col => col !== primaryKey)
        .map(col => `${col} = VALUES(${col})`)
        .join(',');

      const query = `
        INSERT INTO ${database}.${table} (${columns.join(',')})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClause}
      `;

      await this.connection.query(query, values);
    }
  }

  async getTableStructure(database: string, table: string): Promise<any> {
    if (!this.connection) throw new Error('Not connected');
    const [columns] = await this.connection.query(
      `SELECT COLUMN_NAME, COLUMN_KEY, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [database, table]
    );
    return columns;
  }

  async getColumnNames(database: string, table: string): Promise<string[]> {
    if (!this.connection) throw new Error('Not connected');
    const structure = await this.getTableStructure(database, table);
    return (structure as Array<{ COLUMN_NAME: string }>).map(col => col.COLUMN_NAME);
  }

  async getTableRowCount(database: string, table: string): Promise<number> {
    if (!this.connection) throw new Error('Not connected');
    const [rows] = await this.connection.query(
      `SELECT COUNT(*) as count FROM ${database}.${table}`
    );
    return (rows as Array<{ count: number }>)[0].count;
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.connection) {
        await this.connection.ping();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async addColumn(
    database: string,
    table: string,
    columnName: string,
    columnDefinition: string
  ): Promise<void> {
    if (!this.connection) throw new Error('Not connected');
    const query = `ALTER TABLE ${database}.${table} ADD COLUMN ${columnName} ${columnDefinition}`;
    await this.connection.query(query);
  }

  async getColumnDefinition(database: string, table: string, columnName: string): Promise<string> {
    if (!this.connection) throw new Error('Not connected');
    const [columns] = await this.connection.query(
      `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [database, table, columnName]
    );
    
    const col = (columns as any[])[0];
    if (!col) throw new Error(`Column ${columnName} not found in ${database}.${table}`);
    
    let definition = col.COLUMN_TYPE;
    if (col.IS_NULLABLE === 'NO') {
      definition += ' NOT NULL';
    }
    if (col.COLUMN_DEFAULT !== null) {
      definition += ` DEFAULT ${col.COLUMN_DEFAULT}`;
    }
    if (col.EXTRA) {
      definition += ` ${col.EXTRA}`;
    }
    
    return definition;
  }

  async getCreateTableStatement(database: string, table: string): Promise<string> {
    if (!this.connection) throw new Error('Not connected');
    const [rows] = await this.connection.query(
      `SHOW CREATE TABLE ${database}.${table}`
    );
    const createTableSQL = (rows as any[])[0]['Create Table'];
    // Modify to use CREATE TABLE IF NOT EXISTS
    const modified = createTableSQL.replace(
      /^CREATE TABLE\s+/i,
      'CREATE TABLE IF NOT EXISTS '
    );
    return modified;
  }
}

// Helper function to compare records ignoring column order
function areRecordsIdentical(record1: any, record2: any): boolean {
  const keys1 = Object.keys(record1).sort();
  const keys2 = Object.keys(record2).sort();
  
  if (keys1.length !== keys2.length) return false;
  if (!keys1.every((key, i) => key === keys2[i])) return false;
  
  for (const key of keys1) {
    if (JSON.stringify(record1[key]) !== JSON.stringify(record2[key])) {
      return false;
    }
  }
  return true;
}

export function compareTableData(
  localData: any[],
  prodData: any[],
  primaryKey: string
): ComparisonResult {
  const result: ComparisonResult = {
    onlyInLocal: [],
    onlyInProduction: [],
    modified: [],
    identical: []
  };

  const localMap = new Map(localData.map(row => [row[primaryKey], row]));
  const prodMap = new Map(prodData.map(row => [row[primaryKey], row]));

  // Find records only in local
  for (const [id, localRecord] of localMap) {
    if (!prodMap.has(id)) {
      result.onlyInLocal.push(localRecord);
    }
  }

  // Find records only in production and modified records
  for (const [id, prodRecord] of prodMap) {
    const localRecord = localMap.get(id);
    if (!localRecord) {
      result.onlyInProduction.push(prodRecord);
    } else {
      // Check if records are different (ignoring column order)
      const isIdentical = areRecordsIdentical(localRecord, prodRecord);
      if (isIdentical) {
        result.identical.push(prodRecord);
      } else {
        result.modified.push({ local: localRecord, production: prodRecord });
      }
    }
  }

  return result;
}

export function compareTableColumns(
  localColumns: string[],
  prodColumns: string[]
): ColumnConsistency {
  const localSet = new Set(localColumns);
  const prodSet = new Set(prodColumns);

  const missingInLocal = prodColumns.filter(col => !localSet.has(col));
  const missingInProduction = localColumns.filter(col => !prodSet.has(col));

  return {
    table: '',
    missingInLocal,
    missingInProduction,
    allColumnsMatch: missingInLocal.length === 0 && missingInProduction.length === 0
  };
}

export function getRecordsToSync(result: ComparisonResult): any[] {
  return [
    ...result.onlyInProduction,
    ...result.modified.map(m => m.production)
  ];
}
