import React from 'react';

export const ProgressBar = ({ progress = 0, status = 'queued', message = '' }) => {
  const statusColors = {
    queued: 'bg-gray-400',
    processing: 'bg-blue-500',
    done: 'bg-green-500',
    error: 'bg-red-500'
  };

  const statusLabels = {
    queued: 'En cola',
    processing: 'Procesando',
    done: 'Completado',
    error: 'Error'
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          {statusLabels[status] || status}
        </span>
        <span className="text-sm font-medium text-gray-600">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${statusColors[status]}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {message && (
        <p className="text-xs text-gray-600 mt-1">{message}</p>
      )}
    </div>
  );
};

export default ProgressBar;

