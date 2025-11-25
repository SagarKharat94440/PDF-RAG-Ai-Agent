'use client';

import * as React from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const FileUploadComponent: React.FC = () => {
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selectedFile = e.target.files[0];

    if (selectedFile.type !== 'application/pdf') {
      setError('Invalid file. Please upload a PDF.');
      return;
    }

    setFile(selectedFile);
    uploadFile(selectedFile);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setStatus(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${API_BASE_URL}/upload/pdf`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Upload failed');
      }

      setStatus(payload?.message ?? 'Upload successful');
      setFile(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-3">
      <h2 className="text-lg font-semibold text-white mb-2">Upload PDF</h2>
      <label
        htmlFor="file-upload"
        className="w-full p-8 border-2 border-dashed border-gray-600 rounded-xl 
                   flex flex-col items-center justify-center cursor-pointer
                   hover:border-blue-400 hover:bg-gray-800/50 transition-all duration-200"
      >
        {!isUploading && !file && (
          <>
            <Upload className="w-10 h-10 mb-2" />
            <p className="text-gray-300">Click to upload or drag & drop</p>
            <p className="text-xs text-gray-500">(PDF only, max 10MB)</p>
          </>
        )}

        {isUploading && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Uploading...</p>
          </div>
        )}

        {file && !isUploading && (
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            <span className="text-sm">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        )}
      </label>

      <input
        id="file-upload"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {status && (
        <div className="mt-3 p-3 bg-green-900/30 border border-green-500 rounded-lg text-green-400 text-sm">
          {status}
        </div>
      )}
      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;
