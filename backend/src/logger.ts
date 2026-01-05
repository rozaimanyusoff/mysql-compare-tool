import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
   fs.mkdirSync(LOGS_DIR, { recursive: true });
}

type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';

const getLogFile = (): string => {
   const date = new Date();
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   return path.join(LOGS_DIR, `app-${year}-${month}-${day}.log`);
};

const formatLog = (level: LogLevel, message: string, data?: any): string => {
   const timestamp = new Date().toISOString();
   let logLine = `[${timestamp}] [${level}] ${message}`;
   if (data) {
      logLine += ` | ${JSON.stringify(data)}`;
   }
   return logLine;
};

export const logger = {
   info: (message: string, data?: any) => {
      const logLine = formatLog('INFO', message, data);
      console.log(logLine);
      try {
         fs.appendFileSync(getLogFile(), logLine + '\n');
      } catch (error) {
         console.error('Failed to write log:', error);
      }
   },

   error: (message: string, error?: any) => {
      const logLine = formatLog('ERROR', message, error?.message || error);
      console.error(logLine);
      try {
         fs.appendFileSync(getLogFile(), logLine + '\n');
      } catch (writeError) {
         console.error('Failed to write error log:', writeError);
      }
   },

   warn: (message: string, data?: any) => {
      const logLine = formatLog('WARN', message, data);
      console.warn(logLine);
      try {
         fs.appendFileSync(getLogFile(), logLine + '\n');
      } catch (error) {
         console.error('Failed to write log:', error);
      }
   },

   debug: (message: string, data?: any) => {
      const logLine = formatLog('DEBUG', message, data);
      console.log(logLine);
      try {
         fs.appendFileSync(getLogFile(), logLine + '\n');
      } catch (error) {
         console.error('Failed to write log:', error);
      }
   }
};
