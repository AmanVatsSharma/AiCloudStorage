'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiFolder, FiArrowLeft } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { PostgrestError } from '@supabase/supabase-js';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

interface FileMoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: FileItem[];
  currentFolder: string | null;
  operation: 'move' | 'copy';
  onComplete: () => void;
}

export function FileMoveDialog({
  isOpen,
  onClose,
  selectedFiles,
  currentFolder,
  operation,
  onComplete,
}: FileMoveDialogProps) {
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [targetFolder, setTargetFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [traceId] = useState(() => `file-move-dialog_${Date.now()}`);
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  useEffect(() => {
    const resolveUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        logger.warn({
          traceId,
          scope: "file-move-dialog",
          message: "Unable to resolve authenticated user for move/copy.",
          data: {
            error: error?.message,
          },
        });
        setUserId(null);
        return;
      }
      setUserId(data.user.id);
    };

    void resolveUser();
  }, [supabase, traceId]);

  const fetchFolders = useCallback(async (parentId: string | null = null) => {
    if (!userId) {
      setFolders([]);
      return;
    }

    try {
      let query = supabase
        .from('files')
        .select('*')
        .eq('is_folder', true)
        .eq('user_id', userId)
        .order('name');
      
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      logger.debug({
        traceId,
        scope: "file-move-dialog",
        message: "Fetched folders for move/copy destination.",
        data: {
          parentId,
          resultCount: data?.length ?? 0,
        },
      });
      setFolders(data || []);
    } catch (error: unknown) {
      const pgError = error as PostgrestError;
      logger.error({
        traceId,
        scope: "file-move-dialog",
        message: "Failed to fetch target folders.",
        data: {
          parentId,
          error: pgError.message,
        },
      });
      toast({
        title: 'Error',
        description: pgError.message || 'Failed to fetch folders',
        variant: 'destructive',
      });
    }
  }, [supabase, toast, userId, traceId]);

  useEffect(() => {
    if (isOpen) {
      setTargetFolder(null);
      setFolderPath([{ id: null, name: 'Root' }]);
      fetchFolders(null);
    }
  }, [isOpen, fetchFolders]);

  const handleFolderClick = (folder: FileItem) => {
    setTargetFolder(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
    fetchFolders(folder.id);
  };

  const navigateToFolder = (folderId: string | null, index: number) => {
    setTargetFolder(folderId);
    setFolderPath(folderPath.slice(0, index + 1));
    fetchFolders(folderId);
  };

  const handleOperation = async () => {
    // Don't allow moving to the same folder
    if (targetFolder === currentFolder) {
      toast({
        title: 'Invalid Operation',
        description: 'Cannot move files to the same folder',
        variant: 'destructive',
      });
      return;
    }

    // Don't allow moving a folder into itself or its descendants
    if (operation === 'move' && selectedFiles.some(file => file.is_folder && file.id === targetFolder)) {
      toast({
        title: 'Invalid Operation',
        description: 'Cannot move a folder into itself',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!userId) {
        throw new Error("User ID not available. Please sign in again.");
      }

      for (const file of selectedFiles) {
        if (operation === 'move') {
          // Update the file's parent_id
          const { error } = await supabase
            .from('files')
            .update({ parent_id: targetFolder })
            .eq('id', file.id)
            .eq('user_id', userId);

          if (error) throw error;

          // If it's a file (not a folder), update the storage path
          if (!file.is_folder) {
            const newPath = `${userId}/${targetFolder || 'root'}/${file.name}`;
            const oldPath = file.path;

            // Copy the file to the new location
            const { data: fileData } = await supabase.storage
              .from('files')
              .download(oldPath);

            if (fileData) {
              // Upload to new location
              const { error: uploadError } = await supabase.storage
                .from('files')
                .upload(newPath, fileData, {
                  upsert: true,
                });

              if (uploadError) throw uploadError;

              // Update the path in the database
              const { error: updateError } = await supabase
                .from('files')
                .update({ path: newPath })
                .eq('id', file.id)
                .eq('user_id', userId);

              if (updateError) throw updateError;

              // Delete from old location
              const { error: deleteError } = await supabase.storage
                .from('files')
                .remove([oldPath]);

              if (deleteError) throw deleteError;
            }
          }
        } else if (operation === 'copy') {
          // Create a copy of the file in the database
          const { data: newFile, error } = await supabase
            .from('files')
            .insert({
              name: `Copy of ${file.name}`,
              size: file.size,
              type: file.type,
              parent_id: targetFolder,
              is_folder: file.is_folder,
              path: file.is_folder ? null : `${userId}/${targetFolder || 'root'}/Copy of ${file.name}`,
              user_id: userId,
            })
            .select()
            .single();

          if (error) throw error;

          // If it's a file (not a folder), copy the storage file
          if (!file.is_folder && newFile) {
            const { data: fileData } = await supabase.storage
              .from('files')
              .download(file.path);

            if (fileData) {
              const newPath = `${userId}/${targetFolder || 'root'}/Copy of ${file.name}`;
              
              const { error: uploadError } = await supabase.storage
                .from('files')
                .upload(newPath, fileData);

              if (uploadError) throw uploadError;
            }
          }
        }
      }

      toast({
        title: 'Success',
        description: `Files ${operation === 'move' ? 'moved' : 'copied'} successfully`,
      });
      
      onComplete();
      onClose();
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-move-dialog",
        message: "Move/copy operation failed.",
        data: {
          operation,
          selectedCount: selectedFiles.length,
          targetFolder,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, `Failed to ${operation} files`),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {operation === 'move' ? 'Move' : 'Copy'} {selectedFiles.length} {selectedFiles.length === 1 ? 'item' : 'items'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4 flex items-center">
            {folderPath.length > 1 && (
              <button
                onClick={() => navigateToFolder(folderPath[folderPath.length - 2].id, folderPath.length - 2)}
                className="p-1 mr-2 rounded-full hover:bg-gray-100"
              >
                <FiArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id || 'root'}>
                  {index > 0 && <span>/</span>}
                  <button
                    onClick={() => navigateToFolder(folder.id, index)}
                    className={`hover:text-primary ${
                      index === folderPath.length - 1 ? 'font-medium text-gray-900' : ''
                    }`}
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto border rounded-md p-2">
            {folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 text-gray-500">
                <p>No folders in this location</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder)}
                    className={`p-2 border rounded-lg flex items-center cursor-pointer hover:border-primary hover:bg-gray-50 ${
                      targetFolder === folder.id ? 'border-primary bg-primary/10' : ''
                    }`}
                  >
                    <FiFolder className="h-5 w-5 text-primary mr-2" />
                    <span className="text-sm truncate">{folder.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleOperation} 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : operation === 'move' ? 'Move Here' : 'Copy Here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 