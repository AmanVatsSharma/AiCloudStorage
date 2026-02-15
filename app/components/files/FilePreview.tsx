'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FiX, FiDownload, FiInfo } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

type FileItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  created_at: string;
  parent_id: string | null;
  is_folder: boolean;
};

interface FilePreviewProps {
  file: FileItem;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Create a cached URL to avoid regenerating the signed URL every time
  useEffect(() => {
    // Try to fetch from local storage first for immediate display
    const cachedUrl = localStorage.getItem(`file_url_${file.id}`);
    const cachedTimestamp = localStorage.getItem(`file_url_${file.id}_timestamp`);
    
    // Use cached URL if it's less than 15 minutes old
    if (cachedUrl && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      if (Date.now() - timestamp < 15 * 60 * 1000) { // 15 minutes
        setUrl(cachedUrl);
        setLoading(false);
        return;
      }
    }
    
    const getFileUrl = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase.storage
          .from('files')
          .createSignedUrl(file.path, 60 * 60); // Extended to 1 hour

        if (error) throw error;
        
        const signedUrl = data?.signedUrl || null;
        setUrl(signedUrl);
        
        // Cache the URL in localStorage for quick loading next time
        if (signedUrl) {
          localStorage.setItem(`file_url_${file.id}`, signedUrl);
          localStorage.setItem(`file_url_${file.id}_timestamp`, Date.now().toString());
        }
      } catch (error) {
        console.error('Error loading file:', error);
      } finally {
        setLoading(false);
      }
    };

    getFileUrl();
  }, [file.id, file.path, supabase]);

  const handleDownload = async () => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderPreview = () => {
    if (loading) return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
    
    if (!url) return (
      <div className="flex justify-center items-center h-64">Failed to load file</div>
    );

    if (file.type.startsWith('image/')) {
      return (
        <div className="flex justify-center relative">
          {/* Show low-quality placeholder while loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full bg-gray-200 animate-pulse rounded"></div>
              <div className="absolute">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          )}
          
          <Image 
            src={url} 
            alt={file.name} 
            className={`max-w-full max-h-64 object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            width={400}
            height={300}
            priority={true}
            onLoad={() => setImageLoaded(true)}
            onLoadingComplete={() => setImageLoaded(true)}
          />
        </div>
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <video controls className="max-w-full max-h-64">
          <source src={url} type={file.type} />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (file.type.startsWith('audio/')) {
      return (
        <audio controls className="w-full mt-4">
          <source src={url} type={file.type} />
          Your browser does not support the audio tag.
        </audio>
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <iframe src={url} className="w-full h-64" title={file.name}>
          This browser does not support PDFs. Please download the PDF to view it.
        </iframe>
      );
    }

    // For other file types, just show download option
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="p-4 bg-gray-100 rounded-full mb-4">
          <FiInfo className="h-8 w-8 text-gray-500" />
        </div>
        <p className="text-center text-gray-600 mb-4">
          Preview not available for this file type
        </p>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <h3 className="font-medium truncate">{file.name}</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-full hover:bg-gray-100"
            title="Download"
          >
            <FiDownload className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100"
            title="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {renderPreview()}

        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">File Information</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm">{file.type || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Size</span>
              <span className="text-sm">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created</span>
              <span className="text-sm">{formatDate(file.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 