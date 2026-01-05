import mysql from 'mysql2/promise';
import { Client } from 'pg';

export interface MigrationConfig {
   mysqlHost: string;
   mysqlPort: number;
   mysqlUser: string;
   mysqlPassword: string;
   mysqlDatabase: string;
   postgresHost: string;
   postgresPort: number;
   postgresUser: string;
   postgresPassword: string;
   postgresDatabase: string;
}

interface TableInfo {
   name: string;
   columns: ColumnInfo[];
}

interface ColumnInfo {
   name: string;
   type: string;
   nullable: boolean;
   defaultValue: string | null;
   extra: string;
   key: string;
}

// Map MySQL types to PostgreSQL types
const mapMySQLTypeToPG = (mysqlType: string): string => {
   const type = mysqlType.toLowerCase();

   if (type.includes('int')) {
      if (type.includes('bigint')) return 'BIGINT';
      if (type.includes('smallint')) return 'SMALLINT';
      if (type.includes('tinyint')) return 'SMALLINT';
      return 'INTEGER';
   }
   if (type.includes('decimal') || type.includes('numeric')) return 'NUMERIC';
   if (type.includes('float') || type.includes('double')) return 'DOUBLE PRECISION';
   if (type.includes('varchar')) return 'VARCHAR';
   if (type.includes('char')) return 'CHAR';
   if (type.includes('text')) return 'TEXT';
   if (type.includes('blob')) return 'BYTEA';
   if (type.includes('date')) return 'DATE';
   if (type.includes('datetime') || type.includes('timestamp')) return 'TIMESTAMP';
   if (type.includes('time')) return 'TIME';
   if (type.includes('boolean') || type.includes('bool')) return 'BOOLEAN';
   if (type.includes('json')) return 'JSONB';

   return 'TEXT'; // Default fallback
};

export class MigrationService {
   private mysqlConnection: mysql.Connection | null = null;
   private pgClient: Client | null = null;
   private config: MigrationConfig;

   constructor(config: MigrationConfig) {
      this.config = config;
   }

   async connect(): Promise<boolean> {
      try {
         // Connect to MySQL
         this.mysqlConnection = await mysql.createConnection({
            host: this.config.mysqlHost,
            port: this.config.mysqlPort,
            user: this.config.mysqlUser,
            password: this.config.mysqlPassword,
            database: this.config.mysqlDatabase
         });

         // Connect to PostgreSQL
         this.pgClient = new Client({
            host: this.config.postgresHost,
            port: this.config.postgresPort,
            user: this.config.postgresUser,
            password: this.config.postgresPassword,
            database: this.config.postgresDatabase
         });

         await this.pgClient.connect();
         return true;
      } catch (error) {
         console.error('Connection failed:', error);
         return false;
      }
   }

   async disconnect(): Promise<void> {
      if (this.mysqlConnection) {
         await this.mysqlConnection.end();
      }
      if (this.pgClient) {
         await this.pgClient.end();
      }
   }

   async getTableStructure(tableName: string): Promise<ColumnInfo[]> {
      if (!this.mysqlConnection) throw new Error('MySQL connection not established');

      const [rows] = await this.mysqlConnection.query(
         `SELECT COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable, COLUMN_DEFAULT as defaultValue, EXTRA as extra, COLUMN_KEY as \`key\` FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ? ORDER BY ORDINAL_POSITION`,
         [tableName, this.config.mysqlDatabase]
      ) as any[];

      return (rows as any[]).map(row => ({
         name: row.name,
         type: row.type,
         nullable: row.nullable === 'YES',
         defaultValue: row.defaultValue,
         extra: row.extra || '',
         key: row.key || ''
      }));
   }

   async getTables(): Promise<string[]> {
      if (!this.mysqlConnection) throw new Error('MySQL connection not established');

      const [rows] = await this.mysqlConnection.query(
         'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
         [this.config.mysqlDatabase]
      ) as any[];

      return (rows as any[]).map((row: any) => row.TABLE_NAME);
   }

   async migrateTable(tableName: string): Promise<{ success: boolean; message: string; recordsInserted?: number }> {
      if (!this.mysqlConnection || !this.pgClient) {
         throw new Error('Connections not established');
      }

      try {
         // Get table structure from MySQL
         const columns = await this.getTableStructure(tableName);

         if (columns.length === 0) {
            return { success: false, message: `No columns found for table ${tableName}` };
         }

         // Drop existing table in PostgreSQL if it exists
         await this.pgClient.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);

         // Create table in PostgreSQL
         const createTableSQL = this.generateCreateTableSQL(tableName, columns);
         await this.pgClient.query(createTableSQL);

         // Migrate data
         const [rows] = await this.mysqlConnection.query(`SELECT * FROM ${tableName}`) as any[];
         const data = rows as any[];

         if (data.length === 0) {
            return { success: true, message: `Table ${tableName} created (0 records)`, recordsInserted: 0 };
         }

         // Insert data
         const insertedRecords = await this.insertDataIntoPostgres(tableName, columns, data);

         return {
            success: true,
            message: `Table ${tableName} migrated successfully`,
            recordsInserted: insertedRecords
         };
      } catch (error) {
         const err = error as Error;
         return { success: false, message: `Failed to migrate table ${tableName}: ${err.message}` };
      }
   }

   private generateCreateTableSQL(tableName: string, columns: ColumnInfo[]): string {
      const columnDefs = columns
         .map(col => {
            let columnDef = `"${col.name}" ${mapMySQLTypeToPG(col.type)}`;

            // Handle PRIMARY KEY and AUTO_INCREMENT
            if (col.key === 'PRI' && col.extra.toLowerCase().includes('auto_increment')) {
               // For BIGINT auto_increment, use BIGSERIAL, otherwise SERIAL
               const pgType = mapMySQLTypeToPG(col.type);
               if (pgType === 'BIGINT') {
                  columnDef = `"${col.name}" BIGSERIAL PRIMARY KEY`;
               } else {
                  columnDef = `"${col.name}" SERIAL PRIMARY KEY`;
               }
            } else if (col.key === 'PRI') {
               columnDef += ' PRIMARY KEY';
            } else {
               if (!col.nullable) {
                  columnDef += ' NOT NULL';
               }
               // Only add default if it's a simple value (not a MySQL function)
               if (col.defaultValue && !col.defaultValue.toLowerCase().includes('(')) {
                  // Escape single quotes in default values
                  const escapedDefault = String(col.defaultValue).replace(/'/g, "''");
                  columnDef += ` DEFAULT ${escapedDefault}`;
               }
            }

            return columnDef;
         })
         .join(', ');

      return `CREATE TABLE "${tableName}" (${columnDefs})`;
   }

   private async insertDataIntoPostgres(
      tableName: string,
      columns: ColumnInfo[],
      data: any[]
   ): Promise<number> {
      if (!this.pgClient) throw new Error('PostgreSQL connection not established');

      let insertedCount = 0;

      for (const row of data) {
         const columnNames = columns.map(col => `"${col.name}"`).join(', ');
         const values = columns.map(col => {
            const value = row[col.name];
            if (value === null || value === undefined) return 'NULL';

            // Handle different data types
            if (typeof value === 'boolean') {
               return value ? 'true' : 'false';
            }
            if (typeof value === 'number') {
               return String(value);
            }
            if (Buffer.isBuffer(value)) {
               return `'\\x${value.toString('hex')}'`;
            }
            if (value instanceof Date) {
               return `'${value.toISOString()}'`;
            }

            // Handle string values
            let stringValue = String(value);
            // Escape single quotes
            stringValue = stringValue.replace(/'/g, "''");
            return `'${stringValue}'`;
         }).join(', ');

         const insertSQL = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${values})`;

         try {
            await this.pgClient.query(insertSQL);
            insertedCount++;
         } catch (error) {
            // Log but continue - don't stop entire migration for one bad row
            console.error(`Error inserting row into ${tableName}:`, error);
         }
      }

      return insertedCount;
   }
}
