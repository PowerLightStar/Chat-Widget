import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = 'image/*,.pdf,.doc,.docx,.txt',
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setError('');

    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the ${formatFileSize(maxSize)} limit`);
      return;
    }

    if (files.length > 0) {
      onFileSelect(files);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors opacity-70 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        title="Attach file"
      >
        📎
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {error && (
        <div className="absolute bottom-full left-0 mb-1 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;