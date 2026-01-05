import axios from 'axios';

const API_BASE_URL = '/api';

export interface Credential {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  type: 'local' | 'production' | 'postgres';
  createdAt: string;
}

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
  columnConsistency?: any;
  error?: string;
  onlyInProduction?: boolean;
}

export interface DatabaseComparison {
  database: string;
  tables: TableComparison[];
}

// Credentials API
export const credentialsAPI = {
  getAll: async (): Promise<Credential[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/credentials`);
    return data;
  },

  create: async (name: string, host: string, port: number, user: string, password: string, type: 'local' | 'production' | 'postgres'): Promise<Credential> => {
    const { data } = await axios.post(`${API_BASE_URL}/credentials`, {
      name,
      host,
      port,
      user,
      password,
      type
    });
    return data;
  },

  update: async (id: string, updates: Partial<Credential & { password: string }>): Promise<Credential> => {
    const { data } = await axios.put(`${API_BASE_URL}/credentials/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/credentials/${id}`);
  }
};

// Comparison API
export const comparisonAPI = {
  testConnection: async (credentialId: string): Promise<boolean> => {
    const { data } = await axios.post(`${API_BASE_URL}/comparison/test-connection`, {
      credentialId
    });
    return data.success;
  },

  getDatabases: async (credentialId: string): Promise<string[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/comparison/databases`, {
      params: { credentialId }
    });
    return data.databases;
  },

  compareDatabase: async (localCredentialId: string, prodCredentialId: string, database: string): Promise<DatabaseComparison> => {
    const { data } = await axios.post(`${API_BASE_URL}/comparison/compare`, {
      localCredentialId,
      prodCredentialId,
      database
    });
    return data;
  },

  syncTable: async (localCredentialId: string, prodCredentialId: string, database: string, table: string, primaryKey: string): Promise<{ success: boolean; syncedRecords: number }> => {
    const { data } = await axios.post(`${API_BASE_URL}/comparison/sync-table`, {
      localCredentialId,
      prodCredentialId,
      database,
      table,
      primaryKey
    });
    return data;
  },

  exportTable: async (credentialId: string, database: string, table: string): Promise<void> => {
    const response = await axios.get(`${API_BASE_URL}/comparison/export-table/${credentialId}/${database}/${table}`, {
      responseType: 'blob'
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${table}.sql`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  copyTable: async (localCredentialId: string, prodCredentialId: string, database: string, table: string): Promise<{ success: boolean; copiedRecords: number }> => {
    const { data } = await axios.post(`${API_BASE_URL}/comparison/copy-table`, {
      localCredentialId,
      prodCredentialId,
      database,
      table
    });
    return data;
  },

  syncSchema: async (localCredentialId: string, prodCredentialId: string, database: string, table: string): Promise<{ success: boolean; addedColumns: string[] }> => {
    const { data } = await axios.post(`${API_BASE_URL}/comparison/sync-schema`, {
      localCredentialId,
      prodCredentialId,
      database,
      table
    });
    return data;
  }
};
