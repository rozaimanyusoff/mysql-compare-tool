import sqlite3 from 'sqlite3';
import path from 'path';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface DBCredential {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  createdAt: string;
  type: 'local' | 'production' | 'postgres';
}

const DB_PATH = path.join(process.cwd(), 'credentials.db');

let db: sqlite3.Database | null = null;

export function getDB(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
  }
  return db;
}

export async function initializeDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDB();
    
    database.serialize(() => {
      database.run(`
        CREATE TABLE IF NOT EXISTS db_credentials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          host TEXT NOT NULL,
          port INTEGER NOT NULL,
          user TEXT NOT NULL,
          password TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('local', 'production', 'postgres')),
          createdAt TEXT NOT NULL
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export async function saveCredential(
  name: string,
  host: string,
  port: number,
  user: string,
  password: string,
  type: 'local' | 'production' | 'postgres'
): Promise<DBCredential> {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
    db.run(
      `INSERT INTO db_credentials (id, name, host, port, user, password, type, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, host, port, user, password, type, createdAt],
      function(err) {
        if (err) reject(err);
        else {
          resolve({
            id,
            name,
            host,
            port,
            user,
            password,
            type,
            createdAt
          });
        }
      }
    );
  });
}

export async function getCredentials(): Promise<Omit<DBCredential, 'password'>[]> {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all(
      `SELECT id, name, host, port, user, type, createdAt FROM db_credentials ORDER BY createdAt DESC`,
      (err, rows: any) => {
        if (err) reject(err);
        else resolve((rows || []) as Omit<DBCredential, 'password'>[]);
      }
    );
  });
}

export async function getCredentialById(id: string): Promise<DBCredential | null> {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.get(
      `SELECT * FROM db_credentials WHERE id = ?`,
      [id],
      (err, row: any) => {
        if (err) reject(err);
        else resolve((row as DBCredential) || null);
      }
    );
  });
}

export async function updateCredential(
  id: string,
  updates: Partial<Omit<DBCredential, 'id' | 'createdAt'>>
): Promise<DBCredential | null> {
  return new Promise(async (resolve, reject) => {
    const db = getDB();
    const credential = await getCredentialById(id);
    
    if (!credential) {
      resolve(null);
      return;
    }

    const updated = { ...credential, ...updates };
    
    db.run(
      `UPDATE db_credentials SET name = ?, host = ?, port = ?, user = ?, password = ?, type = ? WHERE id = ?`,
      [updated.name, updated.host, updated.port, updated.user, updated.password, updated.type, id],
      function(err) {
        if (err) reject(err);
        else resolve(updated);
      }
    );
  });
}

export async function deleteCredential(id: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run(
      `DELETE FROM db_credentials WHERE id = ?`,
      [id],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

export async function closeDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
