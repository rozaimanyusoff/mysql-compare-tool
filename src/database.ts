import * as mysql from 'mysql2/promise';
import { Connection } from 'mysql2/promise';

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export class DatabaseConnection {
  private config: DBConfig;
  private connection: Connection | null = null;

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

  async deleteData(database: string, table: string, primaryKey: string, id: any): Promise<void> {
    if (!this.connection) throw new Error('Not connected');
    const query = `DELETE FROM ${database}.${table} WHERE ${primaryKey} = ?`;
    await this.connection.query(query, [id]);
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

  async dropTable(database: string, table: string): Promise<void> {
    if (!this.connection) throw new Error('Not connected');
    const query = `DROP TABLE IF EXISTS ${database}.${table}`;
    await this.connection.query(query);
  }

  async renameTable(database: string, oldName: string, newName: string): Promise<void> {
    if (!this.connection) throw new Error('Not connected');
    const query = `RENAME TABLE ${database}.${oldName} TO ${database}.${newName}`;
    await this.connection.query(query);
  }

  async copyTableStructureAndData(
    sourceDb: string,
    sourceTable: string,
    targetDb: string,
    targetTable: string,
    sourceConnection: DatabaseConnection
  ): Promise<void> {
    if (!this.connection) throw new Error('Not connected');
    
    try {
      // Drop target table if it exists
      const dropQuery = `DROP TABLE IF EXISTS ${targetDb}.${targetTable}`;
      await this.connection.query(dropQuery);

      // Create table structure in target database (like source table)
      const createQuery = `CREATE TABLE ${targetDb}.${targetTable} LIKE ${sourceDb}.${sourceTable}`;
      await this.connection.query(createQuery);

      // Copy all data from source to target
      const copyDataQuery = `INSERT INTO ${targetDb}.${targetTable} SELECT * FROM ${sourceDb}.${sourceTable}`;
      await sourceConnection.connection!.query(copyDataQuery);
    } catch (error) {
      throw new Error(`Failed to copy table ${sourceTable}: ${(error as Error).message}`);
    }
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
}
