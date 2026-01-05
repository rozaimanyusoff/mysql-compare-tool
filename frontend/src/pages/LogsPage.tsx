import React, { useState, useEffect } from 'react';
import { Dialog } from '../components/Dialog';

interface LogFile {
   file: string;
   size: number;
   modified: string;
   lines: number;
}

export const LogsPage: React.FC = () => {
   const [logs, setLogs] = useState<LogFile[]>([]);
   const [loading, setLoading] = useState(false);
   const [selectedLog, setSelectedLog] = useState<{ file: string; lines: string[] } | null>(null);
   const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ isOpen: false, title: '', message: '', type: 'info' });

   useEffect(() => {
      fetchLogs();
   }, []);

   const fetchLogs = async () => {
      setLoading(true);
      try {
         const response = await fetch('/api/logs/list');
         const data = await response.json();
         setLogs(data.logs || []);
      } catch (error) {
         setDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to fetch logs',
            type: 'error'
         });
      } finally {
         setLoading(false);
      }
   };

   const handleViewLog = async (filename: string) => {
      try {
         const response = await fetch(`/api/logs/content/${filename}`);
         const data = await response.json();
         setSelectedLog({
            file: filename,
            lines: data.lines || []
         });
      } catch (error) {
         setDialog({
            isOpen: true,
            title: 'Error',
            message: `Failed to view log: ${filename}`,
            type: 'error'
         });
      }
   };

   const handleExportLog = async (filename: string) => {
      try {
         const response = await fetch(`/api/logs/export/${filename}`);
         if (!response.ok) throw new Error('Export failed');

         const blob = await response.blob();
         const url = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute('download', filename);
         document.body.appendChild(link);
         link.click();
         link.parentNode?.removeChild(link);
         window.URL.revokeObjectURL(url);

         setDialog({
            isOpen: true,
            title: 'Success',
            message: `Log exported: ${filename}`,
            type: 'success'
         });
      } catch (error) {
         setDialog({
            isOpen: true,
            title: 'Error',
            message: `Failed to export log: ${filename}`,
            type: 'error'
         });
      }
   };

   const handleDeleteLog = async (filename: string) => {
      if (!confirm(`Delete ${filename}?`)) return;

      try {
         const response = await fetch(`/api/logs/${filename}`, { method: 'DELETE' });
         if (!response.ok) throw new Error('Delete failed');

         setDialog({
            isOpen: true,
            title: 'Success',
            message: `Log deleted: ${filename}`,
            type: 'success'
         });

         fetchLogs();
      } catch (error) {
         setDialog({
            isOpen: true,
            title: 'Error',
            message: `Failed to delete log: ${filename}`,
            type: 'error'
         });
      }
   };

   const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
   };

   const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString();
   };

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Logs</h2>
            <button
               onClick={fetchLogs}
               disabled={loading}
               className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
               {loading ? 'Loading...' : 'Refresh'}
            </button>
         </div>

         {logs.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
               No logs available
            </div>
         ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
               <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                     <tr>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">File</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Size</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Lines</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Modified</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-900">Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {logs.map((log, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                           <td className="px-6 py-3 text-gray-900 font-medium">{log.file}</td>
                           <td className="px-6 py-3 text-gray-600">{formatBytes(log.size)}</td>
                           <td className="px-6 py-3 text-gray-600">{log.lines.toLocaleString()}</td>
                           <td className="px-6 py-3 text-gray-600 text-sm">{formatDate(log.modified)}</td>
                           <td className="px-6 py-3">
                              <div className="flex gap-2">
                                 <button
                                    onClick={() => handleViewLog(log.file)}
                                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                 >
                                    View
                                 </button>
                                 <button
                                    onClick={() => handleExportLog(log.file)}
                                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                 >
                                    Export
                                 </button>
                                 <button
                                    onClick={() => handleDeleteLog(log.file)}
                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                 >
                                    Delete
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {/* Log Viewer Modal */}
         {selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-96 flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b">
                     <h3 className="text-lg font-bold text-gray-900">{selectedLog.file}</h3>
                     <button
                        onClick={() => setSelectedLog(null)}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                     >
                        ×
                     </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-gray-50">
                     <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
                        {selectedLog.lines.slice(-100).join('\n')}
                     </pre>
                     {selectedLog.lines.length > 100 && (
                        <p className="text-xs text-gray-500 mt-2">
                           (Showing last 100 of {selectedLog.lines.length} lines)
                        </p>
                     )}
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                     <button
                        onClick={() => handleExportLog(selectedLog.file)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                     >
                        Export
                     </button>
                     <button
                        onClick={() => setSelectedLog(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 text-sm"
                     >
                        Close
                     </button>
                  </div>
               </div>
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
