import chalk from 'chalk';

export interface ComparisonResult {
  onlyInLocal: any[];
  onlyInProduction: any[];
  modified: Array<{ local: any; production: any }>;
  identical: any[];
}

export interface TableComparison {
  table: string;
  primaryKey: string | null;
  localCount: number;
  prodCount: number;
  comparison: ComparisonResult | null;
  error?: string;
}

export interface DatabaseComparison {
  database: string;
  tables: TableComparison[];
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
      // Check if records are different
      const isIdentical = JSON.stringify(localRecord) === JSON.stringify(prodRecord);
      if (isIdentical) {
        result.identical.push(prodRecord);
      } else {
        result.modified.push({ local: localRecord, production: prodRecord });
      }
    }
  }

  return result;
}

export function hasTableDifferences(comparison: TableComparison): boolean {
  if (!comparison.comparison) return false;
  return (
    comparison.comparison.onlyInProduction.length > 0 ||
    comparison.comparison.modified.length > 0
  );
}

export function printComparisonSummary(result: ComparisonResult): void {
  console.log('\n' + chalk.bold.cyan('=== Comparison Summary ===\n'));

  console.log(chalk.green(`✓ Identical Records: ${result.identical.length}`));
  console.log(chalk.yellow(`⚠ Modified Records: ${result.modified.length}`));
  console.log(chalk.red(`✗ Only in Local: ${result.onlyInLocal.length}`));
  console.log(chalk.blue(`⬆ Only in Production: ${result.onlyInProduction.length}`));

  if (result.onlyInProduction.length > 0) {
    console.log('\n' + chalk.bold.blue('Records Only in Production (will be added to local):'));
    console.log(JSON.stringify(result.onlyInProduction, null, 2).substring(0, 500) + '...');
  }

  if (result.modified.length > 0) {
    console.log('\n' + chalk.bold.yellow('Modified Records (will be updated in local):'));
    console.log(JSON.stringify(result.modified.slice(0, 2), null, 2));
    if (result.modified.length > 2) {
      console.log(`... and ${result.modified.length - 2} more records`);
    }
  }

  if (result.onlyInLocal.length > 0) {
    console.log('\n' + chalk.bold.red('Records Only in Local (no action):'));
    console.log(JSON.stringify(result.onlyInLocal.slice(0, 2), null, 2));
    if (result.onlyInLocal.length > 2) {
      console.log(`... and ${result.onlyInLocal.length - 2} more records`);
    }
  }
}

export function printDatabaseComparisonSummary(dbComparison: DatabaseComparison): void {
  console.log('\n' + chalk.bold.cyan(`\n╔════════════════════════════════════════╗`));
  console.log(chalk.bold.cyan(`║  Database: ${dbComparison.database.padEnd(31)} ║`));
  console.log(chalk.bold.cyan(`╚════════════════════════════════════════╝\n`));

  let syncNeeded = 0;
  let inSync = 0;
  let withErrors = 0;

  for (const table of dbComparison.tables) {
    if (table.error) {
      console.log(chalk.red(`  ✗ ${table.table.padEnd(30)} [ERROR: ${table.error}]`));
      withErrors++;
    } else if (hasTableDifferences(table)) {
      const toSync = (table.comparison?.onlyInProduction.length || 0) + (table.comparison?.modified.length || 0);
      console.log(chalk.yellow(`  ⚠ ${table.table.padEnd(30)} [${toSync} records to sync]`));
      syncNeeded++;
    } else {
      console.log(chalk.green(`  ✓ ${table.table.padEnd(30)} [In sync]`));
      inSync++;
    }
  }

  console.log('\n' + chalk.cyan(`Summary: ${chalk.green(inSync + ' in sync')} | ${chalk.yellow(syncNeeded + ' need sync')} | ${chalk.red(withErrors + ' errors')}\n`));
}

export function getRecordsToSync(result: ComparisonResult): any[] {
  return [
    ...result.onlyInProduction,
    ...result.modified.map(m => m.production)
  ];
}

export function getTablesToSync(dbComparison: DatabaseComparison): TableComparison[] {
  return dbComparison.tables.filter(t => !t.error && hasTableDifferences(t));
}
