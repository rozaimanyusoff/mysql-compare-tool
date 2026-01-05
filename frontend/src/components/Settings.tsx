import React, { useState } from 'react';
import { credentialsAPI, Credential } from '../api';
import { CredentialForm } from './CredentialForm';
import { Dialog } from './Dialog';

interface SettingsProps {
   credentials: Credential[];
   onCredentialAdded: (credential: Credential) => void;
   onCredentialDeleted: (id: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ credentials, onCredentialAdded, onCredentialDeleted }) => {
   const [showForm, setShowForm] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);
   const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ isOpen: false, title: '', message: '', type: 'info' });

   const handleDelete = async (id: string) => {
      setDialog({
         isOpen: true,
         title: 'Confirm Delete',
         message: 'Are you sure you want to delete this credential?',
         type: 'info'
      });

      // Store the ID for actual deletion
      const confirmDelete = async () => {
         setLoading(true);
         try {
            await credentialsAPI.delete(id);
            onCredentialDeleted(id);
            setDialog({
               isOpen: true,
               title: 'Success',
               message: 'Credential deleted successfully',
               type: 'success'
            });
         } catch (error) {
            setDialog({
               isOpen: true,
               title: 'Error',
               message: 'Failed to delete credential',
               type: 'error'
            });
         } finally {
            setLoading(false);
         }
      };
   };

   const handleDeleteWithConfirm = async (id: string) => {
      if (confirm('Are you sure you want to delete this credential?')) {
         setLoading(true);
         try {
            await credentialsAPI.delete(id);
            onCredentialDeleted(id);
            setDialog({
               isOpen: true,
               title: 'Success',
               message: 'Credential deleted successfully',
               type: 'success'
            });
         } catch (error) {
            setDialog({
               isOpen: true,
               title: 'Error',
               message: 'Failed to delete credential',
               type: 'error'
            });
         } finally {
            setLoading(false);
         }
      }
   };

   const handleTestConnection = async (credentialId: string) => {
      try {
         const response = await fetch(`/api/comparison/test-connection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credentialId })
         }).then(res => res.json());

         setDialog({
            isOpen: true,
            title: response.success ? 'Connection Successful' : 'Connection Failed',
            message: response.success ? 'Database connection is working' : 'Could not connect to database',
            type: response.success ? 'success' : 'error'
         });
      } catch (error) {
         setDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to test connection',
            type: 'error'
         });
      }
   };

   return (
      <div className="space-y-6">
         <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Database Credentials</h2>

            <button
               onClick={() => setShowForm(!showForm)}
               className="mb-6 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
               {showForm ? 'Cancel' : '+ Add New Credential'}
            </button>

            {showForm && (
               <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <CredentialForm onCredentialAdded={(cred) => {
                     onCredentialAdded(cred);
                     setShowForm(false);
                  }} />
               </div>
            )}
         </div>

         {/* MySQL Credentials */}
         {credentials.filter(c => ['local', 'production'].includes(c.type)).length > 0 && (
            <div>
               <h3 className="text-lg font-semibold text-gray-900 mb-3">MySQL Databases</h3>
               <div className="grid gap-4">
                  {credentials.filter(c => ['local', 'production'].includes(c.type)).map((cred) => (
                     <div key={cred.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                        <div>
                           <h3 className="font-semibold text-gray-900">{cred.name}</h3>
                           <p className="text-sm text-gray-600">
                              {cred.user}@{cred.host}:{cred.port}
                           </p>
                           <p className="text-xs text-gray-500">
                              Type: <span className={`font-semibold ${cred.type === 'production' ? 'text-red-600' : 'text-blue-600'}`}>
                                 {cred.type.toUpperCase()}
                              </span>
                           </p>
                        </div>

                        <div className="flex gap-2">
                           <button
                              onClick={() => handleTestConnection(cred.id)}
                              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                           >
                              Test
                           </button>
                           <button
                              onClick={() => setEditingId(cred.id)}
                              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                           >
                              Edit
                           </button>
                           <button
                              onClick={() => handleDeleteWithConfirm(cred.id)}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                           >
                              Delete
                           </button>
                        </div>

                        {editingId === cred.id && (
                           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                              <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-auto">
                                 <h3 className="text-lg font-bold mb-4">Edit Credential</h3>
                                 <CredentialForm
                                    initialData={cred}
                                    isEditing={true}
                                    onCredentialAdded={() => {
                                       setEditingId(null);
                                       window.location.reload();
                                    }}
                                 />
                              </div>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* PostgreSQL Credentials */}
         {credentials.filter(c => c.type === 'postgres').length > 0 && (
            <div>
               <h3 className="text-lg font-semibold text-gray-900 mb-3">PostgreSQL Databases</h3>
               <div className="grid gap-4">
                  {credentials.filter(c => c.type === 'postgres').map((cred) => (
                     <div key={cred.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center border-l-4 border-purple-500">
                        <div>
                           <h3 className="font-semibold text-gray-900">{cred.name}</h3>
                           <p className="text-sm text-gray-600">
                              {cred.user}@{cred.host}:{cred.port}
                           </p>
                           <p className="text-xs text-gray-500">
                              Type: <span className="font-semibold text-purple-600">PostgreSQL</span>
                           </p>
                        </div>

                        <div className="flex gap-2">
                           <button
                              onClick={() => handleTestConnection(cred.id)}
                              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                           >
                              Test
                           </button>
                           <button
                              onClick={() => setEditingId(cred.id)}
                              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                           >
                              Edit
                           </button>
                           <button
                              onClick={() => handleDeleteWithConfirm(cred.id)}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                           >
                              Delete
                           </button>
                        </div>

                        {editingId === cred.id && (
                           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                              <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-auto">
                                 <h3 className="text-lg font-bold mb-4">Edit Credential</h3>
                                 <CredentialForm
                                    initialData={cred}
                                    isEditing={true}
                                    onCredentialAdded={() => {
                                       setEditingId(null);
                                       window.location.reload();
                                    }}
                                 />
                              </div>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         )}

         {credentials.length === 0 && (
            <div className="text-center py-12 text-gray-500">
               No credentials saved yet. Add one to get started.
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
