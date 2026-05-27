import React from 'react';
import { X, FileText, Download } from 'lucide-react';
import { ProjectFile } from '../types';

interface FilePreviewModalProps {
  file: ProjectFile;
  onClose: () => void;
}

export default function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const isImage = file.type === 'image';
  const isPdf = file.type === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{file.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={file.downloadUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          {isImage ? (
            <img src={file.downloadUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
          ) : isPdf ? (
            <iframe src={file.downloadUrl} className="w-full h-full min-h-[500px]" title={file.name} />
          ) : (
            <div className="text-center p-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Preview not available for this file type: {file.type}</p>
              <a 
                href={file.downloadUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
