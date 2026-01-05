import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import {
  saveCredential,
  getCredentials,
  getCredentialById,
  updateCredential,
  deleteCredential,
  DBCredential
} from '../db';

const router = Router();

// Get all credentials (without passwords)
router.get('/', async (req: Request, res: Response) => {
  try {
    const credentials = await getCredentials();
    logger.debug('Fetched all credentials', { count: credentials.length });
    res.json(credentials);
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to fetch credentials', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new credential
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, host, port, user, password, type } = req.body;

    if (!name || !host || !port || !user || !password || !type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!['local', 'production', 'postgres'].includes(type)) {
      res.status(400).json({ error: 'Type must be "local", "production", or "postgres"' });
      return;
    }

    const credential = await saveCredential(name, host, port, user, password, type);
    logger.info('Credential created', { id: credential.id, name, host, user, type });
    
    // Don't return password
    const { password: _, ...credentialWithoutPassword } = credential;
    res.status(201).json(credentialWithoutPassword);
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to create credential', err);
    res.status(500).json({ error: err.message });
  }
});

// Get credential by ID (includes password for testing connections)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const credential = await getCredentialById(req.params.id);
    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }
    res.json(credential);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update credential
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, host, port, user, password, type } = req.body;

    if (type && !['local', 'production', 'postgres'].includes(type)) {
      res.status(400).json({ error: 'Type must be "local", "production", or "postgres"' });
      return;
    }

    const updates: Partial<DBCredential> = {};
    if (name !== undefined) updates.name = name;
    if (host !== undefined) updates.host = host;
    if (port !== undefined) updates.port = port;
    if (user !== undefined) updates.user = user;
    if (password !== undefined) updates.password = password;
    if (type !== undefined) updates.type = type as 'local' | 'production';

    const credential = await updateCredential(req.params.id, updates);
    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    logger.info('Credential updated', { id: req.params.id });
    // Don't return password
    const { password: _, ...credentialWithoutPassword } = credential;
    res.json(credentialWithoutPassword);
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to update credential', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete credential
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await deleteCredential(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }
    logger.info('Credential deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to delete credential', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
