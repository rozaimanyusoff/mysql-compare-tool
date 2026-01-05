import React, { useState, useEffect } from 'react';
import { credentialsAPI, Credential } from '../api';
import { Dialog } from '../components/Dialog';

export const MigrationPage: React.FC = () => {
  const [step, setStep] = useState<'config' | 'tables' | 'progress' | 'results'>('config');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ isOpen: false, title: '', message: '', type: 'info' });

  // Selected Credentials
  const [mysqlCredentialId, setMysqlCredentialId] = useState('');
  const [postgresCredentialId, setPostgresCredentialId] = useState('');

  // Tables
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  // Results
  const [migrationResults, setMigrationResults] = useState<any>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const creds = await credentialsAPI.getAll();
      setCredentials(creds);
    } catch (error) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load credentials',
        type: 'error'
      });
    }
  };

  const mysqlCreds = credentials.filter(c => ['local', 'production'].includes(c.type));
  const postgresCreds = credentials.filter(c => c.type === 'postgres');

  const handleTestConnection = async () => {
    if (!mysqlCredentialId || !postgresCredentialId) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Please select both MySQL and PostgreSQL credentials',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch credentials with passwords
      const mysqlCredRes = await fetch(`/api/credentials/${mysqlCredentialId}`);
      const postgresCredRes = await fetch(`/api/credentials/${postgresCredentialId}`);

      if (!mysqlCredRes.ok || !postgresCredRes.ok) {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: 'Failed to load credential details',
          type: 'error'
        });
        return;
      }

      const mysqlCred = await mysqlCredRes.json();
      const postgresCred = await postgresCredRes.json();

      const response = await fetch('/api/migration/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysqlHost: mysqlCred.host,
          mysqlPort: mysqlCred.port,
          mysqlUser: mysqlCred.user,
          mysqlPassword: mysqlCred.password,
          mysqlDatabase: mysqlCred.name,
          postgresHost: postgresCred.host,
          postgresPort: postgresCred.port,
          postgresUser: postgresCred.user,
          postgresPassword: postgresCred.password,
          postgresDatabase: postgresCred.name
        })
      });

      const data = await response.json();

      if (data.success) {
        setDialog({
          isOpen: true,
          title: 'Success',
          message: 'Connected to both databases successfully!',
          type: 'success'
        });

        // Fetch tables
        await fetchTables();
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: 'Failed to connect to databases',
          type: 'error'
        });
      }
    } catch (error) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Connection test failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const mysqlCredRes = await fetch(`/api/credentials/${mysqlCredentialId}`);
      if (!mysqlCredRes.ok) return;

      const mysqlCred = await mysqlCredRes.json();

      const response = await fetch('/api/migration/get-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysqlHost: mysqlCred.host,
          mysqlPort: mysqlCred.port,
          mysqlUser: mysqlCred.user,
          mysqlPassword: mysqlCred.password,
          mysqlDatabase: mysqlCred.name
        })
      });

      const data = await response.json();

      if (data.tables && data.tables.length > 0) {
        setAvailableTables(data.tables);
        setSelectedTables(data.tables);
        setStep('tables');
      } else {
        setDialog({
          isOpen: true,
          title: 'Info',
          message: 'No tables found in MySQL database',
          type: 'info'
        });
      }
    } catch (error) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to fetch tables',
        type: 'error'
      });
    }
  };

  const handleStartMigration = async () => {
    if (selectedTables.length === 0) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Please select at least one table',
        type: 'error'
      });
      return;
    }

    setStep('progress');
    setLoading(true);

    try {
      // Fetch credentials with passwords
      const mysqlCredRes = await fetch(`/api/credentials/${mysqlCredentialId}`);
      const postgresCredRes = await fetch(`/api/credentials/${postgresCredentialId}`);

      if (!mysqlCredRes.ok || !postgresCredRes.ok) {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: 'Failed to load credential details',
          type: 'error'
        });
        setStep('tables');
        return;
      }

      const mysqlCred = await mysqlCredRes.json();
      const postgresCred = await postgresCredRes.json();

      const response = await fetch('/api/migration/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysqlHost: mysqlCred.host,
          mysqlPort: mysqlCred.port,
          mysqlUser: mysqlCred.user,
          mysqlPassword: mysqlCred.password,
          mysqlDatabase: mysqlCred.name,
          postgresHost: postgresCred.host,
          postgresPort: postgresCred.port,
          postgresUser: postgresCred.user,
          postgresPassword: postgresCred.password,
          postgresDatabase: postgresCred.name,
          tables: selectedTables
        })
      });

      const data = await response.json();

      if (data.success) {
        setMigrationResults(data);
        setStep('results');
        setDialog({
          isOpen: true,
          title: 'Migration Complete',
          message: `Successfully migrated ${data.summary.successfulTables}/${data.summary.totalTables} tables with ${data.summary.totalRecordsMigrated} records`,
          type: 'success'
        });
      } else {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: 'Migration failed',
          type: 'error'
        });
      }
    } catch (error) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: 'Migration process failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTableSelection = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">MySQL to PostgreSQL Migration</h1>

      {/* Step 1: Configuration */}
      {step === 'config' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Select Source & Target Databases</h3>
            
            {/* MySQL Credential Selection */}
            <div className="border-l-4 border-orange-500 pl-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">MySQL Source Database</label>
              <select
                value={mysqlCredentialId}
                onChange={(e) => setMysqlCredentialId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                disabled={loading}
              >
                <option value="">-- Select MySQL Database --</option>
                {mysqlCreds.map(cred => (
                  <option key={cred.id} value={cred.id}>
                    {cred.name} ({cred.type === 'local' ? 'Local' : 'Production'})
                  </option>
                ))}
              </select>
              {mysqlCreds.length === 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  No MySQL credentials found. Please add them in Settings first.
                </p>
              )}
            </div>

            {/* PostgreSQL Credential Selection */}
            <div className="border-l-4 border-purple-500 pl-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">PostgreSQL Target Database</label>
              <select
                value={postgresCredentialId}
                onChange={(e) => setPostgresCredentialId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                disabled={loading}
              >
                <option value="">-- Select PostgreSQL Database --</option>
                {postgresCreds.map(cred => (
                  <option key={cred.id} value={cred.id}>
                    {cred.name}
                  </option>
                ))}
              </select>
              {postgresCreds.length === 0 && (
                <p className="text-sm text-purple-600 mt-2">
                  No PostgreSQL credentials found. Please add them in Settings first.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={loading || !mysqlCredentialId || !postgresCredentialId}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? 'Testing Connection...' : 'Test Connection & Continue'}
          </button>
        </div>
      )}

      {/* Step 2: Table Selection */}
      {step === 'tables' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Tables to Migrate</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {availableTables.map(table => (
                <label key={table} className="flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table)}
                    onChange={() => toggleTableSelection(table)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-gray-900">{table}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('config')}
              className="flex-1 bg-gray-400 text-white py-2 rounded-md hover:bg-gray-500"
            >
              Back
            </button>
            <button
              onClick={handleStartMigration}
              disabled={loading || selectedTables.length === 0}
              className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Migrating...' : `Start Migration (${selectedTables.length} tables)`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Progress */}
      {step === 'progress' && (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-900 font-semibold">Migration in progress...</p>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && migrationResults && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Migration Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-gray-600 text-sm">Total Tables</p>
                <p className="text-2xl font-bold text-blue-600">{migrationResults.summary.totalTables}</p>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <p className="text-gray-600 text-sm">Successful</p>
                <p className="text-2xl font-bold text-green-600">{migrationResults.summary.successfulTables}</p>
              </div>
              <div className="p-4 bg-red-50 rounded">
                <p className="text-gray-600 text-sm">Failed</p>
                <p className="text-2xl font-bold text-red-600">{migrationResults.summary.failedTables}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded">
                <p className="text-gray-600 text-sm">Records Migrated</p>
                <p className="text-2xl font-bold text-purple-600">{migrationResults.summary.totalRecordsMigrated.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-2 max-h-64 overflow-auto">
              {migrationResults.results.map((result: any, idx: number) => (
                <div key={idx} className={`p-4 rounded border-l-4 ${result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{result.table}</p>
                      <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
                    </div>
                    {result.recordsInserted !== undefined && (
                      <p className="text-gray-600 text-sm font-mono whitespace-nowrap ml-4">{result.recordsInserted.toLocaleString()} records</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setStep('config');
              setSelectedTables([]);
              setMigrationResults(null);
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-semibold"
          >
            Migrate Another Database
          </button>
        </div>
      )}

      <Dialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
      />
    </div>
  );
};
