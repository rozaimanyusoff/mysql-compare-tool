import React, { useState, useEffect, useRef } from 'react';
import { comparisonAPI, Credential, DatabaseComparison, TableComparison } from '../api';
import { Dialog } from '../components/Dialog';

interface ComparisonPageProps {
  credentials: Credential[];
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({ credentials }) => {
  const [localCredentialId, setLocalCredentialId] = useState('');
  const [prodCredentialId, setProdCredentialId] = useState('');
  const [database, setDatabase] = useState('');
  const [databases, setDatabases] = useState<string[]>([]);
  const [comparison, setComparison] = useState<DatabaseComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ isOpen: false, title: '', message: '', type: 'info' });
  const tableRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const localCred = credentials.find(c => c.id === localCredentialId);
  const prodCred = credentials.find(c => c.id === prodCredentialId);

  const handleGetDatabases = async () => {
    if (!prodCredentialId) {
      setDialog({
        isOpen: true,
        title: 'Missing Selection',
        message: 'Please select a production database credential',
        type: 'info'
      });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const dbs = await comparisonAPI.getDatabases(prodCredentialId);
      setDatabases(dbs);
      setDatabase(dbs[0] || '');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch databases';
      setError(errorMsg);
      setDialog({
        isOpen: true,
        title: 'Error',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!localCredentialId || !prodCredentialId || !database) {
      setDialog({
        isOpen: true,
        title: 'Missing Selection',
        message: 'Please select all required options',
        type: 'info'
      });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await comparisonAPI.compareDatabase(
        localCredentialId,
        prodCredentialId,
        database
      );
      setComparison(result);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to compare databases';
      setError(errorMsg);
      setDialog({
        isOpen: true,
        title: 'Error',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTable = async (table: TableComparison) => {
    if (!table.primaryKey || !table.comparison) return;

    if (!confirm(`Sync ${table.table}?`)) return;

    setSyncing(table.table);
    try {
      await comparisonAPI.syncTable(
        localCredentialId,
        prodCredentialId,
        database,
        table.table,
        table.primaryKey
      );
      
      setDialog({
        isOpen: true,
        title: 'Success',
        message: `Successfully synced ${table.table}`,
        type: 'success'
      });
      
      // Wait for database to commit changes, then rerun comparison
      await new Promise(resolve => setTimeout(resolve, 1000));
      await handleCompare();
      
      // Find next table with differences and scroll to it
      setTimeout(() => {
        if (comparison) {
          const syncableTables = comparison.tables.filter(
            t => t.comparison && (t.comparison.onlyInProduction.length > 0 || t.comparison.modified.length > 0)
          );
          const currentIndex = syncableTables.findIndex(t => t.table === table.table);
          if (currentIndex < syncableTables.length - 1) {
            const nextTable = syncableTables[currentIndex + 1];
            tableRefs.current[nextTable.table]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to sync table';
      setDialog({
        isOpen: true,
        title: 'Error',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleExportTable = async (table: TableComparison) => {
    try {
      await comparisonAPI.exportTable(prodCredentialId, database, table.table);
      setDialog({
        isOpen: true,
        title: 'Success',
        message: `Table "${table.table}" exported successfully`,
        type: 'success'
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to export table';
      setDialog({
        isOpen: true,
        title: 'Error',
        message: errorMsg,
        type: 'error'
      });
    }
  };

  const handleCopyTable = async (table: TableComparison) => {
    if (!confirm(`Copy table "${table.table}" from production to local?`)) return;

    setSyncing(table.table);
    try {
      const result = await comparisonAPI.copyTable(
        localCredentialId,
        prodCredentialId,
        database,
        table.table
      );
      
      setDialog({
        isOpen: true,
        title: 'Success',
        message: `Successfully copied table "${table.table}" with ${result.copiedRecords} records`,
        type: 'success'
      });
      
      // Rerun comparison
      await handleCompare();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to copy table';
      setDialog({
        isOpen: true,
        title: 'Error',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncColumns = async (table: TableComparison) => {
    if (!table.columnConsistency?.missingInLocal?.length) {
      setDialog({
        isOpen: true,
        title: 'No Missing Columns',
        message: 'All columns from production exist in local',
        type: 'info'
      });
      return;
    }

    const missingCols = table.columnConsistency.missingInLocal.join(', ');
    if (!confirm(`Add missing columns to local table?\n\n${missingCols}`)) return;

    setSyncing(table.table);
    try {
      const result = await comparisonAPI.syncSchema(
        localCredentialId,
        prodCredentialId,
        database,
        table.table
      );
      
      setDialog({
        isOpen: true,
        title: 'Success',
        message: `Added ${result.addedColumns.length} column(s): ${result.addedColumns.join(', ')}`,
        type: 'success'
      });
      
      // Rerun comparison to update schema info
      await handleCompare();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to sync schema';
      setDialog({
        isOpen: true,
        title: 'Error',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setSyncing(null);
    }
  };

  const localCreds = credentials.filter(c => c.type === 'local');
  const prodCreds = credentials.filter(c => c.type === 'production');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Database Comparison</h2>

      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Local Database</label>
            <select
              value={localCredentialId}
              onChange={(e) => {
                setLocalCredentialId(e.target.value);
                setDatabases([]);
                setDatabase('');
              }}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select local database...</option>
              {localCreds.map(cred => (
                <option key={cred.id} value={cred.id}>{cred.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Production Database</label>
            <select
              value={prodCredentialId}
              onChange={(e) => setProdCredentialId(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select production database...</option>
              {prodCreds.map(cred => (
                <option key={cred.id} value={cred.id}>{cred.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGetDatabases}
          disabled={!prodCredentialId || loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Load Databases from Production'}
        </button>

        {databases.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Database</label>
            <select
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {databases.map(db => (
                <option key={db} value={db}>{db}</option>
              ))}
            </select>
          </div>
        )}

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          onClick={handleCompare}
          disabled={!localCredentialId || !prodCredentialId || !database || loading}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Comparing...' : 'Sync Local from Production'}
        </button>
      </div>

      {comparison && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Comparison Results: {comparison.database}</h3>

          {comparison.tables.map(table => (
            <div
              key={table.table}
              ref={el => {
                if (el) tableRefs.current[table.table] = el;
              }}
              className="bg-white p-4 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{table.table}</h4>
                  <p className="text-sm text-gray-600">
                    Local: {table.localCount} | Production: {table.prodCount}
                  </p>
                </div>
                {table.onlyInProduction && (
                  <span className="text-red-600 text-sm font-semibold">Only in Production</span>
                )}
                {table.error && !table.onlyInProduction && (
                  <span className="text-red-600 text-sm">{table.error}</span>
                )}
              </div>

              {table.onlyInProduction ? (
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">This table exists in production but not in local database</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleCopyTable(table)}
                      disabled={syncing === table.table}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-xs"
                    >
                      {syncing === table.table ? 'Copying...' : 'Copy from Production'}
                    </button>
                    <button
                      onClick={() => handleExportTable(table)}
                      disabled={syncing === table.table}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 text-xs"
                    >
                      Export (Prod)
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {table.comparison && (
                    <div className="space-y-2 text-sm">
                      <p className="text-green-600">✓ Identical: {table.comparison.identical.length}</p>
                      <p className="text-yellow-600">⚠ Modified: {table.comparison.modified.length}</p>
                      <p className="text-blue-600">⬆ To Add: {table.comparison.onlyInProduction.length}</p>

                      {table.columnConsistency && !table.columnConsistency.allColumnsMatch && (
                        <div className="bg-red-50 border border-red-200 p-2 rounded text-red-700 text-xs">
                          <p className="font-semibold">Schema Mismatch:</p>
                          {table.columnConsistency.missingInLocal?.length > 0 && (
                            <p>Missing in local: {table.columnConsistency.missingInLocal.join(', ')}</p>
                          )}
                          {table.columnConsistency.missingInProduction?.length > 0 && (
                            <p>Only in local: {table.columnConsistency.missingInProduction.join(', ')}</p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3 flex-wrap">
                        {table.columnConsistency && !table.columnConsistency.allColumnsMatch && (
                          <button
                            onClick={() => handleSyncColumns(table)}
                            disabled={syncing === table.table}
                            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 text-xs"
                          >
                            {syncing === table.table ? 'Processing...' : 'Sync Schema'}
                          </button>
                        )}
                        
                        {(table.comparison.onlyInProduction.length > 0 || table.comparison.modified.length > 0) && table.columnConsistency?.allColumnsMatch && (
                          <button
                            onClick={() => handleSyncTable(table)}
                            disabled={syncing === table.table}
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-xs"
                          >
                            {syncing === table.table ? 'Syncing...' : 'Sync Table'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleExportTable(table)}
                          disabled={syncing === table.table}
                          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 text-xs"
                        >
                          Export (Prod)
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
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
