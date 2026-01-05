import React, { useState, useEffect } from 'react';
import { credentialsAPI, Credential } from './api';
import { Settings } from './components/Settings';
import { ComparisonPage } from './pages/ComparisonPage';
import { LogsPage } from './pages/LogsPage';
import { MigrationPage } from './pages/MigrationPage';
import './index.css';

type Page = 'comparison' | 'settings' | 'logs' | 'migration';

function App() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('comparison');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const creds = await credentialsAPI.getAll();
      setCredentials(creds);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialAdded = (credential: Credential) => {
    setCredentials([credential, ...credentials]);
  };

  const handleCredentialDeleted = (id: string) => {
    setCredentials(credentials.filter(c => c.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">MySQL Compare Tool</h1>
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentPage('comparison')}
                className={`px-4 py-2 rounded-md transition ${
                  currentPage === 'comparison'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Compare
              </button>
              <button
                onClick={() => setCurrentPage('settings')}
                className={`px-4 py-2 rounded-md transition ${
                  currentPage === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setCurrentPage('migration')}
                className={`px-4 py-2 rounded-md transition ${
                  currentPage === 'migration'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Migrate
              </button>
              <button
                onClick={() => setCurrentPage('logs')}
                className={`px-4 py-2 rounded-md transition ${
                  currentPage === 'logs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Logs
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentPage === 'comparison' && <ComparisonPage credentials={credentials} />}
        {currentPage === 'settings' && (
          <Settings
            credentials={credentials}
            onCredentialAdded={handleCredentialAdded}
            onCredentialDeleted={handleCredentialDeleted}
          />
        )}
        {currentPage === 'migration' && <MigrationPage />}
        {currentPage === 'logs' && <LogsPage />}
      </main>
    </div>
  );
}

export default App;
