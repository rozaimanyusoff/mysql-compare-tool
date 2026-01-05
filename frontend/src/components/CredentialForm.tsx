import React, { useState } from 'react';
import { credentialsAPI, Credential } from '../api';

interface CredentialFormProps {
   onCredentialAdded: (credential: Credential) => void;
   initialData?: Credential & { password?: string };
   isEditing?: boolean;
}

export const CredentialForm: React.FC<CredentialFormProps> = ({ onCredentialAdded, initialData, isEditing = false }) => {
   const [name, setName] = useState(initialData?.name || '');
   const [host, setHost] = useState(initialData?.host || 'localhost');
   const [port, setPort] = useState(initialData?.port || 3306);
   const [user, setUser] = useState(initialData?.user || 'root');
   const [password, setPassword] = useState(initialData?.password || '');
   const [type, setType] = useState<'local' | 'production' | 'postgres'>(initialData?.type || 'local');
   const [loading, setLoading] = useState(false);

   const getDefaultPort = (dbType: 'local' | 'production' | 'postgres'): number => {
      return dbType === 'postgres' ? 5432 : 3306;
   };

   const handleTypeChange = (newType: 'local' | 'production' | 'postgres') => {
      setType(newType);
      // Auto-update port if it's the default for the previous type
      if (port === getDefaultPort(type)) {
         setPort(getDefaultPort(newType));
      }
   };
   const [error, setError] = useState('');

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
         if (isEditing && initialData) {
            await credentialsAPI.update(initialData.id, {
               name,
               host,
               port: Number(port),
               user,
               password: password || undefined,
               type
            });
         } else {
            const credential = await credentialsAPI.create(name, host, Number(port), user, password, type);
            onCredentialAdded(credential);
         }

         // Reset form
         setName('');
         setHost('localhost');
         setPort(3306);
         setUser('root');
         setPassword('');
         setType('local');
      } catch (err: any) {
         setError(err.response?.data?.error || 'Failed to save credential');
      } finally {
         setLoading(false);
      }
   };

   return (
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
         <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
               type="text"
               value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="e.g., Production DB"
               className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               required
            />
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700">Host</label>
               <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
               />
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700">Port</label>
               <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
               />
            </div>
         </div>

         <div>
            <label className="block text-sm font-medium text-gray-700">User</label>
            <input
               type="text"
               value={user}
               onChange={(e) => setUser(e.target.value)}
               className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               required
            />
         </div>

         <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               required={!isEditing}
            />
         </div>

         <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
               value={type}
               onChange={(e) => handleTypeChange(e.target.value as 'local' | 'production' | 'postgres')}
               className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
               <option value="local">MySQL - Local</option>
               <option value="production">MySQL - Production</option>
               <option value="postgres">PostgreSQL</option>
            </select>
         </div>

         {error && <div className="text-red-600 text-sm">{error}</div>}

         <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
         >
            {loading ? 'Saving...' : isEditing ? 'Update' : 'Add Credential'}
         </button>
      </form>
   );
};
