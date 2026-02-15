'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FiClock, FiDownload, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface Version {
  id: string;
  file_id: string;
  version: number;
  size: number;
  created_at: string;
}

interface FileVersionHistoryProps {
  file: {
    id: string;
    name: string;
    path: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function FileVersionHistory({ file, isOpen, onClose }: FileVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `file-version-history_${Date.now()}`);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('file_versions')
        .select('*')
        .eq('file_id', file.id)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-version-history",
        message: "Failed to fetch versions.",
        data: {
          fileId: file.id,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to fetch file versions'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [file.id, supabase, toast, traceId]);

  useEffect(() => {
    if (isOpen) {
      void fetchVersions();
    }
  }, [fetchVersions, isOpen]);

  const handleDownloadVersion = async (version: Version) => {
    try {
      const versionPath = `versions/${file.id}/${version.version}/${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('files')
        .createSignedUrl(versionPath, 60);

      if (error) throw error;
      
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = `${file.name} (version ${version.version})`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-version-history",
        message: "Failed to download version.",
        data: {
          fileId: file.id,
          version: version.version,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to download version'),
        variant: 'destructive',
      });
    }
  };

  const handleRestoreVersion = async (version: Version) => {
    try {
      // Copy the version file to the main file path
      const sourcePath = `versions/${file.id}/${version.version}/${file.name}`;
      
      // First download the version file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('files')
        .download(sourcePath);
        
      if (downloadError) throw downloadError;
      
      // Then upload it to the original path
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(file.path, fileData as Blob, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      // Update the file record
      const { error: updateError } = await supabase
        .from('files')
        .update({
          size: version.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', file.id);
        
      if (updateError) throw updateError;
      
      toast({
        title: 'Success',
        description: `Restored version ${version.version} successfully`,
      });
      
      onClose();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-version-history",
        message: "Failed to restore version.",
        data: {
          fileId: file.id,
          version: version.version,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to restore version'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVersion = async (version: Version) => {
    if (!confirm(`Are you sure you want to delete version ${version.version}?`)) {
      return;
    }
    
    try {
      const versionPath = `versions/${file.id}/${version.version}/${file.name}`;
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([versionPath]);
        
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('file_versions')
        .delete()
        .eq('id', version.id);
        
      if (dbError) throw dbError;
      
      setVersions(versions.filter(v => v.id !== version.id));
      
      toast({
        title: 'Success',
        description: `Version ${version.version} deleted successfully`,
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-version-history",
        message: "Failed to delete version.",
        data: {
          fileId: file.id,
          version: version.version,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to delete version'),
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FiClock className="mr-2 h-5 w-5" />
            Version History - {file.name}
          </DialogTitle>
          <DialogDescription>
            View, download, restore, or delete previous versions of this file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 max-h-[70vh] overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FiClock className="mx-auto h-10 w-10 mb-2" />
              <p>No previous versions found for this file.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div 
                  key={version.id}
                  className="border rounded-lg p-4 bg-white"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Version {version.version}</h4>
                      <p className="text-sm text-slate-500">{formatDate(version.created_at)}</p>
                      <p className="text-sm text-slate-500">{formatFileSize(version.size)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadVersion(version)}
                      >
                        <FiDownload className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRestoreVersion(version)}
                      >
                        <FiRotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteVersion(version)}
                      >
                        <FiTrash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 