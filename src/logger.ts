import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class Logger {
  private logFilePath: string;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    const timestamp = this.getTimestamp();
    const logsDir = path.join(process.cwd(), 'logs');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logFilePath = path.join(logsDir, `sync_${timestamp}.log`);
    this.writeToFile(`[${this.getFormattedTime()}] ===== SYNC SESSION STARTED =====\n`);
  }

  private getTimestamp(): string {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${dd}${mm}${yyyy}${hh}${min}${ss}`;
  }

  private getFormattedTime(): string {
    const now = new Date();
    return now.toISOString();
  }

  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFilePath, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message: string): void {
    const logMessage = `[${this.getFormattedTime()}] INFO: ${message}\n`;
    this.writeToFile(logMessage);
    console.log(chalk.cyan(`ℹ ${message}`));
  }

  success(message: string): void {
    const logMessage = `[${this.getFormattedTime()}] SUCCESS: ${message}\n`;
    this.writeToFile(logMessage);
    console.log(chalk.green(`✓ ${message}`));
  }

  error(message: string, errorDetails?: Error): void {
    let logMessage = `[${this.getFormattedTime()}] ERROR: ${message}`;
    if (errorDetails) {
      logMessage += `\n  Details: ${errorDetails.message}\n  Stack: ${errorDetails.stack}`;
    }
    logMessage += '\n';
    this.writeToFile(logMessage);
    console.log(chalk.red(`✗ ${message}`));
    if (errorDetails) {
      console.log(chalk.red(`  ${errorDetails.message}`));
    }
  }

  warning(message: string): void {
    const logMessage = `[${this.getFormattedTime()}] WARNING: ${message}\n`;
    this.writeToFile(logMessage);
    console.log(chalk.yellow(`⚠ ${message}`));
  }

  section(title: string): void {
    const logMessage = `[${this.getFormattedTime()}] --- ${title} ---\n`;
    this.writeToFile(logMessage);
    console.log('\n' + chalk.bold.cyan(`\n--- ${title} ---\n`));
  }

  database(database: string, message: string): void {
    const logMessage = `[${this.getFormattedTime()}] [DB: ${database}] ${message}\n`;
    this.writeToFile(logMessage);
  }

  table(database: string, table: string, message: string): void {
    const logMessage = `[${this.getFormattedTime()}] [DB: ${database}] [TABLE: ${table}] ${message}\n`;
    this.writeToFile(logMessage);
  }

  summary(syncedDatabases: string[], totalTables: number, syncedTables: number, skippedTables: number, errors: number): void {
    const summaryLines = [
      '\n',
      '═══════════════════════════════════════════\n',
      'SESSION SUMMARY\n',
      '═══════════════════════════════════════════\n',
      `Total Databases Synced: ${syncedDatabases.length}\n`,
      `Databases: ${syncedDatabases.join(', ') || 'None'}\n`,
      `Total Tables Processed: ${totalTables}\n`,
      `Tables Synced: ${syncedTables}\n`,
      `Tables Skipped: ${skippedTables}\n`,
      `Errors Encountered: ${errors}\n`,
      `Log File: ${this.logFilePath}\n`,
      '═══════════════════════════════════════════\n'
    ];

    summaryLines.forEach(line => this.writeToFile(line));
    console.log(chalk.cyan('\n═══════════════════════════════════════════'));
    console.log(chalk.cyan('SESSION SUMMARY'));
    console.log(chalk.cyan('═══════════════════════════════════════════'));
    console.log(`Databases Synced: ${syncedDatabases.length}`);
    console.log(`Tables Processed: ${totalTables} (Synced: ${syncedTables}, Skipped: ${skippedTables})`);
    console.log(`Errors: ${errors}`);
    console.log(chalk.cyan(`\nLog File: ${this.logFilePath}\n`));
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }
}

export const logger = new Logger();
