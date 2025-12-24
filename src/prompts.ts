import inquirer from 'inquirer';
import { TableComparison } from './comparison';

export async function promptForDatabaseSelection(databases: string[]): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'database',
      message: 'Select a database to compare:',
      choices: databases.filter(db => !['mysql', 'information_schema', 'performance_schema', 'sys'].includes(db))
    }
  ]);
  return answers.database;
}

export async function promptForDatabaseSelectionWithExclusion(
  databases: string[],
  excludedDatabases: string[]
): Promise<string | null> {
  const availableDatabases = databases.filter(
    db => !['mysql', 'information_schema', 'performance_schema', 'sys'].includes(db) &&
           !excludedDatabases.includes(db)
  );

  if (availableDatabases.length === 0) {
    return null;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'database',
      message: 'Select a database to compare (synced databases are excluded):',
      choices: availableDatabases
    }
  ]);
  return answers.database;
}

export async function promptForTableSelection(tables: string[]): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'table',
      message: 'Select a table to compare:',
      choices: tables
    }
  ]);
  return answers.table;
}

export async function promptForTableSyncSelection(tablesToSync: TableComparison[]): Promise<TableComparison | null> {
  if (tablesToSync.length === 0) {
    return null;
  }

  const choices = tablesToSync.map(t => ({
    name: `${t.table} (${(t.comparison?.onlyInProduction.length || 0) + (t.comparison?.modified.length || 0)} records)`,
    value: t
  }));

  choices.push({
    name: '--- Skip all remaining tables ---',
    value: null as any
  });

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'table',
      message: 'Select table to sync:',
      choices
    }
  ]);
  return answers.table;
}

export async function promptForSyncConfirmation(
  recordsToAdd: number,
  recordsToUpdate: number,
  recordsToDelete: number
): Promise<boolean> {
  console.log('\nSync Summary:');
  console.log(`  • Records to add: ${recordsToAdd}`);
  console.log(`  • Records to update: ${recordsToUpdate}`);
  console.log(`  • Records to delete: ${recordsToDelete}`);

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed with synchronization?',
      default: false
    }
  ]);
  return answers.confirm;
}

export async function promptForDeleteLocalOnly(): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'delete',
      message: 'Delete records that only exist in local? (Production data is live - only delete if intentional)',
      default: false
    }
  ]);
  return answers.delete;
}

export async function promptContinueToNextDatabase(): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: 'Continue to next database?',
      default: true
    }
  ]);
  return answers.continue;
}

export async function promptForSyncErrorAction(): Promise<'replace' | 'skip'> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Error occurred during sync. What would you like to do?',
      choices: [
        {
          name: 'Replace - Delete/rename local table and copy from production',
          value: 'replace'
        },
        {
          name: 'Skip - Skip this table and continue to the next one',
          value: 'skip'
        }
      ],
      default: 'skip'
    }
  ]);
  return answers.action;
}

export async function promptForMissingColumnsInLocal(columns: string[]): Promise<boolean> {
  if (columns.length === 0) return true;
  
  console.log('\nMissing columns in local database:');
  columns.forEach(col => console.log(`  • ${col}`));

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'add',
      message: 'Add these columns to local database?',
      default: true
    }
  ]);
  return answers.add;
}

export async function promptForMissingColumnsInProduction(columns: string[]): Promise<'add' | 'skip'> {
  if (columns.length === 0) return 'add';
  
  console.log('\nMissing columns in production database:');
  columns.forEach(col => console.log(`  • ${col}`));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          name: 'Add column to production',
          value: 'add'
        },
        {
          name: 'Skip to next table',
          value: 'skip'
        }
      ],
      default: 'skip'
    }
  ]);
  return answers.action;
}
