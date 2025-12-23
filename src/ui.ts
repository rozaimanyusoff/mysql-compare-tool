import chalk from 'chalk';

export function printHeader(): void {
  console.clear();
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   MySQL Compare & Sync Tool v1.0.0     ║'));
  console.log(chalk.bold.cyan('║   Local ↔ Production Database Sync     ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));
}

export function printSuccess(message: string): void {
  console.log(chalk.green('✓ ' + message));
}

export function printError(message: string): void {
  console.log(chalk.red('✗ ' + message));
}

export function printWarning(message: string): void {
  console.log(chalk.yellow('⚠ ' + message));
}

export function printInfo(message: string): void {
  console.log(chalk.cyan('ℹ ' + message));
}

export function printSection(title: string): void {
  console.log('\n' + chalk.bold.cyan(`\n--- ${title} ---\n`));
}
