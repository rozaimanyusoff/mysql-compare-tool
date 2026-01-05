import React, { useState, useEffect } from 'react';

interface DialogProps {
   isOpen: boolean;
   title: string;
   message: string;
   type?: 'success' | 'error' | 'info' | 'warning';
   onClose: () => void;
   actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'danger' }>;
}

export const Dialog: React.FC<DialogProps> = ({
   isOpen,
   title,
   message,
   type = 'info',
   onClose,
   actions = []
}) => {
   if (!isOpen) return null;

   const bgColorMap = {
      success: 'bg-green-50 border-green-200',
      error: 'bg-red-50 border-red-200',
      info: 'bg-blue-50 border-blue-200',
      warning: 'bg-yellow-50 border-yellow-200'
   };

   const iconColorMap = {
      success: 'text-green-600',
      error: 'text-red-600',
      info: 'text-blue-600',
      warning: 'text-yellow-600'
   };

   const iconMap = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
   };

   const titleColorMap = {
      success: 'text-green-900',
      error: 'text-red-900',
      info: 'text-blue-900',
      warning: 'text-yellow-900'
   };

   return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
         <div className={`bg-white rounded-lg shadow-lg max-w-md w-full p-6 border-l-4 ${bgColorMap[type]}`}>
            <div className="flex items-start gap-4">
               <div className={`text-2xl font-bold ${iconColorMap[type]}`}>
                  {iconMap[type]}
               </div>
               <div className="flex-1">
                  <h2 className={`text-lg font-semibold ${titleColorMap[type]} mb-2`}>
                     {title}
                  </h2>
                  <p className="text-gray-700 text-sm">
                     {message}
                  </p>
               </div>
            </div>

            <div className="flex gap-2 mt-6 justify-end">
               {actions.length > 0 ? (
                  actions.map((action, index) => (
                     <button
                        key={index}
                        onClick={() => {
                           action.onClick();
                           onClose();
                        }}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition ${action.variant === 'danger'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                           }`}
                     >
                        {action.label}
                     </button>
                  ))
               ) : (
                  <button
                     onClick={onClose}
                     className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md hover:bg-gray-400 font-medium text-sm transition"
                  >
                     OK
                  </button>
               )}
            </div>
         </div>
      </div>
   );
};
