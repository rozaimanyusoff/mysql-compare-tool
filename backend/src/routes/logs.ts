import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const LOGS_DIR = path.join(process.cwd(), 'logs');

interface LogEntry {
   timestamp: string;
   level: string;
   message: string;
   details?: any;
}

// Get all logs
router.get('/list', async (req: Request, res: Response) => {
   try {
      if (!fs.existsSync(LOGS_DIR)) {
         fs.mkdirSync(LOGS_DIR, { recursive: true });
      }

      const files = fs.readdirSync(LOGS_DIR);
      const logFiles = files.filter(f => f.endsWith('.log'));

      const logs: Array<{ file: string; size: number; modified: string; lines: number }> = [];

      for (const file of logFiles) {
         const filePath = path.join(LOGS_DIR, file);
         const stats = fs.statSync(filePath);
         const content = fs.readFileSync(filePath, 'utf-8');
         const lines = content.split('\n').filter(l => l.trim()).length;

         logs.push({
            file,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            lines
         });
      }

      // Sort by modification date (newest first)
      logs.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

      res.json({ logs });
   } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message });
   }
});

// Get log content
router.get('/content/:filename', async (req: Request, res: Response) => {
   try {
      const { filename } = req.params;

      // Prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
         res.status(400).json({ error: 'Invalid filename' });
         return;
      }

      const filePath = path.join(LOGS_DIR, filename);

      if (!fs.existsSync(filePath)) {
         res.status(404).json({ error: 'Log file not found' });
         return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      res.json({ filename, lines });
   } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message });
   }
});

// Export logs
router.get('/export/:filename', async (req: Request, res: Response) => {
   try {
      const { filename } = req.params;

      // Prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
         res.status(400).json({ error: 'Invalid filename' });
         return;
      }

      const filePath = path.join(LOGS_DIR, filename);

      if (!fs.existsSync(filePath)) {
         res.status(404).json({ error: 'Log file not found' });
         return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
   } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message });
   }
});

// Clear/delete specific log
router.delete('/:filename', async (req: Request, res: Response) => {
   try {
      const { filename } = req.params;

      // Prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
         res.status(400).json({ error: 'Invalid filename' });
         return;
      }

      const filePath = path.join(LOGS_DIR, filename);

      if (!fs.existsSync(filePath)) {
         res.status(404).json({ error: 'Log file not found' });
         return;
      }

      fs.unlinkSync(filePath);

      res.json({ success: true, message: `Log file ${filename} deleted` });
   } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message });
   }
});

export default router;
