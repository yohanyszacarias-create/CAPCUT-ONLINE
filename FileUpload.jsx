import React, { useRef } from 'react';

export const FileUpload = ({ label, accept, multiple = false, onChange, disabled = false }) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    onChange(files);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <span className="text-gray-600">
          {multiple ? 'Selecciona archivos' : 'Selecciona un archivo'}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default FileUpload;

