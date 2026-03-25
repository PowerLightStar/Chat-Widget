import React from 'react';
import type { Attachment } from '../types';

interface FileAttachmentProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
  attachment,
  onRemove,
  onRetry,
}) => {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.startsWith('text/')) return '📃';
    return '📎';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
      attachment.status === 'error' 
        ? 'bg-red-50 border border-red-400' 
        : 'bg-gray-50 hover:bg-gray-100'
    } ${attachment.status === 'uploading' ? 'opacity-70' : ''}`}>
      <div className="text-2xl">{getFileIcon(attachment.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-700 truncate">{attachment.name}</div>
        <div className="text-xs text-gray-400">{formatFileSize(attachment.size)}</div>
        
        {attachment.status === 'uploading' && (
          <div className="relative h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className="absolute h-full bg-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${attachment.uploadProgress || 0}%` }}
            />
            <span className="absolute right-0 -top-3 text-[8px] text-gray-500">
              {Math.round(attachment.uploadProgress || 0)}%
            </span>
          </div>
        )}
        
        {attachment.status === 'error' && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-red-500">Upload failed</span>
            {onRetry && (
              <button
                onClick={() => onRetry(attachment.id)}
                className="text-xs px-1.5 py-0.5 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
      
      {onRemove && attachment.status !== 'uploading' && (
        <button
          onClick={() => onRemove(attachment.id)}
          className="p-1 hover:bg-gray-200 rounded transition-colors opacity-50 hover:opacity-100"
          title="Remove"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default FileAttachment;