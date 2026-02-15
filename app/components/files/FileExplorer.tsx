'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiFolder, FiFile, FiArrowLeft, FiUpload, FiPlus, FiMoreVertical, FiCopy, FiMove, FiTrash2, FiShare2, FiSearch, FiClock, FiTag } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { FilePreview } from './FilePreview';
import { FileMoveDialog } from './FileMoveDialog';
import { FileShareDialog } from './FileShareDialog';
import { FileVersionHistory } from './FileVersionHistory';
import { FileTags } from './FileTags';
import { FileSearch } from './FileSearch';
import { useToast } from '@/components/ui/use-toast';
import { PostgrestError } from '@supabase/supabase-js';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// This component will handle generating and displaying thumbnails
const FileThumbnail = ({ file }: { file: FileItem }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Skip for non-image files
    if (!file.is_folder && file.type?.startsWith('image/')) {
      // Try to get from cache first
      const cachedUrl = localStorage.getItem(`thumb_${file.id}`);
      const cachedTimestamp = localStorage.getItem(`thumb_${file.id}_timestamp`);
      
      if (cachedUrl && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        if (Date.now() - timestamp < 60 * 60 * 1000) { // 1 hour
          setThumbnailUrl(cachedUrl);
          setLoading(false);
          return;
        }
      }
      
      const getSignedUrl = async () => {
        try {
          const { data, error } = await supabase.storage
            .from('files')
            .createSignedUrl(file.path, 60 * 60);
            
          if (error) {
            console.error('Error getting thumbnail URL:', error);
            return;
          }
          
          if (data?.signedUrl) {
            setThumbnailUrl(data.signedUrl);
            // Cache the URL
            localStorage.setItem(`thumb_${file.id}`, data.signedUrl);
            localStorage.setItem(`thumb_${file.id}_timestamp`, Date.now().toString());
          }
        } catch (err) {
          console.error('Error creating thumbnail:', err);
        } finally {
          setLoading(false);
        }
      };
      
      getSignedUrl();
    } else {
      setLoading(false);
    }
  }, [file, supabase]);

  // For folders, just show the folder icon
  if (file.is_folder) {
    return (
      <div className="flex items-center justify-center w-24 h-24 mb-2">
        <FiFolder className="h-16 w-16 text-primary" />
      </div>
    );
  }
  
  // For images, show a thumbnail
  if (file.type?.startsWith('image/') && thumbnailUrl) {
    return (
      <div className="w-24 h-24 mb-2 relative overflow-hidden rounded-md shadow-sm border border-gray-200">
        {loading ? (
          <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
            <FiFile className="h-8 w-8 text-gray-400" />
          </div>
        ) : (
          <Image 
            src={thumbnailUrl} 
            alt={file.name}
            className="object-cover transition-opacity duration-300" 
            fill 
            sizes="96px"
            priority={false}
            loading="lazy"
          />
        )}
      </div>
    );
  }
  
  // For other file types, determine what icon to show based on type
  const FileIcon = FiFile;
  let iconColor = "text-blue-400";
  let bgColor = "bg-blue-50";
  
  if (file.type?.includes('pdf')) {
    iconColor = "text-red-500";
    bgColor = "bg-red-50";
  } else if (file.type?.includes('word') || file.type?.includes('document')) {
    iconColor = "text-blue-600";
    bgColor = "bg-blue-50";
  } else if (file.type?.includes('excel') || file.type?.includes('spreadsheet')) {
    iconColor = "text-green-600";
    bgColor = "bg-green-50";
  } else if (file.type?.includes('video')) {
    iconColor = "text-purple-500";
    bgColor = "bg-purple-50";
  } else if (file.type?.includes('audio')) {
    iconColor = "text-pink-500";
    bgColor = "bg-pink-50";
  }
  
  return (
    <div className={`flex items-center justify-center w-24 h-24 mb-2 rounded-md ${bgColor}`}>
      <FileIcon className={`h-12 w-12 ${iconColor}`} />
    </div>
  );
};

export function FileExplorer() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root' },
  ]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState<FileItem | null>(null);
  const [moveOperation, setMoveOperation] = useState<'move' | 'copy'>('move');
  const supabase = createClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [fileForVersions, setFileForVersions] = useState<FileItem | null>(null);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [fileForTags, setFileForTags] = useState<FileItem | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [traceId] = useState(() => `file-explorer_${Date.now()}`);

  // Get the authenticated user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        logger.info({
          traceId,
          scope: "file-explorer",
          message: "Resolved authenticated user for file operations.",
          data: { userId: session.user.id },
        });
        setUserId(session.user.id);
      } else {
        logger.warn({
          traceId,
          scope: "file-explorer",
          message: "No authenticated user found while mounting explorer.",
        });
        toast({
          title: 'Authentication Error',
          description: 'Please log in to manage files',
          variant: 'destructive',
        });
      }
    };
    
    getUserId();
  }, [supabase, toast]);

  // Drag and drop functionality
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    // Check if we have a valid user ID
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'User ID not available. Please log in again.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        
        // Use consistent path format that worked in the test function
        const filePath = `${userId}/${currentFolder || 'root'}/${file.name}`;
        logger.debug({
          traceId,
          scope: "file-explorer-upload",
          message: "Uploading dropped file.",
          data: {
            position: `${i + 1}/${acceptedFiles.length}`,
            fileName: file.name,
            filePath,
            currentFolder,
          },
        });
        
        // Upload file to storage - simplified approach
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) {
          logger.error({
            traceId,
            scope: "file-explorer-upload",
            message: "Storage upload failed for dropped file.",
            data: { fileName: file.name, uploadError },
          });
          toast({
            title: 'Upload Failed',
            description: uploadError.message,
            variant: 'destructive',
          });
          continue; // Try the next file if there is one
        }
        
        // Create database entry
        const { error: dbError } = await supabase.from('files').insert({
          name: file.name,
          size: file.size,
          type: file.type,
          path: filePath,
          parent_id: currentFolder,
          is_folder: false,
          user_id: userId,
        });
        
        if (dbError) {
          logger.error({
            traceId,
            scope: "file-explorer-upload",
            message: "Database insert failed for dropped file.",
            data: { fileName: file.name, dbError },
          });
          toast({
            title: 'Database Error',
            description: dbError.message,
            variant: 'destructive',
          });
          continue;
        }
        
        toast({
          title: 'Success',
          description: `${file.name} uploaded successfully`,
        });
      }
      
      fetchFiles(currentFolder);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-explorer-upload",
        message: "Unexpected error during dropped file upload.",
        data: { error: error instanceof Error ? error.message : error },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to upload files'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [currentFolder, supabase, toast, userId]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const fetchFiles = useCallback(async (parentId: string | null = null) => {
    if (!userId) {
      logger.warn({
        traceId,
        scope: "file-explorer-fetch",
        message: "Skipped file fetch because user ID is missing.",
        data: { parentId },
      });
      setFiles([]);
      return;
    }

    try {
      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', userId);
      
      // Use "is" for null checks instead of "eq"
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }

      // Add ordering after the where conditions
      const { data, error } = await query
        .order('is_folder', { ascending: false })
        .order('name');

      if (error) throw error;
      logger.debug({
        traceId,
        scope: "file-explorer-fetch",
        message: "Fetched files for folder context.",
        data: {
          parentId,
          resultCount: data?.length ?? 0,
        },
      });
      setFiles(data || []);
      // Clear selected files when changing folders
      setSelectedFiles([]);
    } catch (error: unknown) {
      const pgError = error as PostgrestError;
      logger.error({
        traceId,
        scope: "file-explorer-fetch",
        message: "Failed to fetch files.",
        data: {
          parentId,
          error: pgError.message,
        },
      });
      toast({
        title: 'Error',
        description: pgError.message || 'Failed to fetch files',
        variant: 'destructive',
      });
    }
  }, [supabase, toast, traceId, userId]);

  useEffect(() => {
    fetchFiles(currentFolder);
  }, [currentFolder, fetchFiles]);

  const handleFileClick = (file: FileItem, e: React.MouseEvent<HTMLDivElement>) => {
    // If Ctrl/Cmd key is pressed, toggle selection
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.id === file.id);
        if (isSelected) {
          return prev.filter(f => f.id !== file.id);
        } else {
          return [...prev, file];
        }
      });
      return;
    }
    
    // If file is already selected, deselect it
    if (selectedFiles.length === 1 && selectedFiles[0].id === file.id) {
      setSelectedFiles([]);
      return;
    }
    
    // Clear selection if clicking without Ctrl/Cmd
    setSelectedFiles([]);
    
    if (file.is_folder) {
      setCurrentFolder(file.id);
      setFolderPath([...folderPath, { id: file.id, name: file.name }]);
    } else {
      setSelectedFile(file);
    }
  };

  const navigateToFolder = (folderId: string | null, index: number) => {
    setCurrentFolder(folderId);
    setFolderPath(folderPath.slice(0, index + 1));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles || uploadFiles.length === 0) return;

    // Check if we have a valid user ID
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'User ID not available. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        
        // Use consistent path format that worked in the test function
        const filePath = `${userId}/${currentFolder || 'root'}/${file.name}`;
        logger.debug({
          traceId,
          scope: "file-explorer-upload",
          message: "Uploading selected file.",
          data: {
            position: `${i + 1}/${uploadFiles.length}`,
            fileName: file.name,
            filePath,
            currentFolder,
          },
        });
        
        // Upload file to storage - simplified approach
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) {
          logger.error({
            traceId,
            scope: "file-explorer-upload",
            message: "Storage upload failed for selected file.",
            data: { fileName: file.name, uploadError },
          });
          toast({
            title: 'Upload Failed',
            description: uploadError.message,
            variant: 'destructive',
          });
          continue; // Try the next file if there is one
        }
        
        // Create database entry
        const { error: dbError } = await supabase.from('files').insert({
          name: file.name,
          size: file.size,
          type: file.type,
          path: filePath,
          parent_id: currentFolder,
          is_folder: false,
          user_id: userId,
        });
        
        if (dbError) {
          logger.error({
            traceId,
            scope: "file-explorer-upload",
            message: "Database insert failed for selected file.",
            data: { fileName: file.name, dbError },
          });
          toast({
            title: 'Database Error',
            description: dbError.message,
            variant: 'destructive',
          });
          continue;
        }
        
        toast({
          title: 'Success',
          description: `${file.name} uploaded successfully`,
        });
      }
      
      fetchFiles(currentFolder);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-explorer-upload",
        message: "Unexpected error during selected file upload.",
        data: { error: error instanceof Error ? error.message : error },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to upload files'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    // Check if we have a valid user ID
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'User ID not available. Please log in again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Create folder entry in database
      const folderData = {
        name: folderName,
        size: 0,
        type: 'folder',
        path: null,
        parent_id: currentFolder,
        is_folder: true,
        user_id: userId, // Add the user ID
      };
      
      const { error } = await supabase.from('files').insert(folderData);
      
      if (error) throw error;
      
      fetchFiles(currentFolder);
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
    } catch (error: unknown) {
      const pgError = error as PostgrestError;
      toast({
        title: 'Error',
        description: pgError.message || 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedFiles.length} item(s)?`);
    if (!confirmDelete) return;
    
    try {
      for (const file of selectedFiles) {
        // Delete from database
        const { error: dbError } = await supabase
          .from('files')
          .delete()
          .eq('id', file.id);
        
        if (dbError) throw dbError;
        
        // If it's a file (not a folder), delete from storage
        if (!file.is_folder) {
          const { error: storageError } = await supabase.storage
            .from('files')
            .remove([file.path]);
          
          if (storageError) throw storageError;
        }
      }
      
      fetchFiles(currentFolder);
      setSelectedFiles([]);
      toast({
        title: 'Success',
        description: 'Files deleted successfully',
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete files',
        variant: 'destructive',
      });
    }
  };

  const handleMoveFiles = (operation: 'move' | 'copy') => {
    if (selectedFiles.length === 0) return;
    setMoveOperation(operation);
    setIsMoveDialogOpen(true);
  };

  const handleShareFile = (file: FileItem) => {
    setFileToShare(file);
    setIsShareDialogOpen(true);
  };

  const isSelected = (file: FileItem) => {
    return selectedFiles.some(f => f.id === file.id);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'User session is required to search files.',
        variant: 'destructive',
      });
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${query}%`)
        .order('is_folder', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error: unknown) {
      const pgError = error as PostgrestError;
      logger.error({
        traceId,
        scope: "file-explorer-search",
        message: "File search failed.",
        data: {
          query,
          error: pgError.message,
        },
      });
      toast({
        title: 'Error',
        description: pgError.message || 'Failed to search files',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShowVersionHistory = (file: FileItem) => {
    // Only show version history for files, not folders
    if (!file.is_folder) {
      setFileForVersions(file);
      setIsVersionHistoryOpen(true);
    }
  };

  const handleManageTags = (file: FileItem) => {
    setFileForTags(file);
    setIsTagsDialogOpen(true);
  };

  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <div className="flex h-full" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10 flex items-center justify-center">
          <div className="text-center bg-white p-6 rounded-lg shadow-lg">
            <FiUpload className="h-10 w-10 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium">Drop files here to upload</p>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb and actions */}
        <div className="px-4 py-3 flex items-center justify-between bg-white border-b">
          <div className="flex items-center">
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
          <div className="flex space-x-2 items-center">
            <FileSearch onSearch={handleSearch} />
            
            {selectedFiles.length > 0 && (
              <div className="flex space-x-2 mr-2">
                <button
                  onClick={() => handleMoveFiles('move')}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md flex items-center hover:bg-gray-50"
                >
                  <FiMove className="h-4 w-4 mr-1" />
                  Move
                </button>
                <button
                  onClick={() => handleMoveFiles('copy')}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md flex items-center hover:bg-gray-50"
                >
                  <FiCopy className="h-4 w-4 mr-1" />
                  Copy
                </button>
                {selectedFiles.length === 1 && (
                  <button
                    onClick={() => handleShareFile(selectedFiles[0])}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md flex items-center hover:bg-gray-50"
                  >
                    <FiShare2 className="h-4 w-4 mr-1" />
                    Share
                  </button>
                )}
                <button
                  onClick={handleDeleteFiles}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md flex items-center hover:bg-gray-50 text-red-500"
                >
                  <FiTrash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            )}
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md flex items-center hover:bg-gray-50"
            >
              <FiPlus className="h-4 w-4 mr-1" />
              New Folder
            </button>
            <label className="px-3 py-1.5 text-sm bg-primary text-white rounded-md flex items-center cursor-pointer hover:bg-primary/90">
              <FiUpload className="h-4 w-4 mr-1" />
              Upload
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* File grid */}
        <div className="flex-1 p-4 overflow-auto">
          {searchQuery ? (
            // Search results
            <>
              <div className="mb-4">
                <h3 className="text-lg font-medium">Search results for &quot;{searchQuery}&quot;</h3>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
              
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <FiSearch className="h-12 w-12 mb-2" />
                  <p>No files found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {searchResults.map((file) => (
                    <div
                      key={file.id}
                      onClick={(e) => handleFileClick(file, e)}
                      className={`p-4 border rounded-lg bg-white flex flex-col items-center cursor-pointer hover:border-primary hover:shadow-sm transition-all relative ${
                        isSelected(file) ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      {isSelected(file) && (
                        <div className="absolute top-2 left-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}>
                            <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                              <FiMoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              setSelectedFiles([file]);
                              handleMoveFiles('move');
                            }}>
                              <FiMove className="mr-2 h-4 w-4" />
                              <span>Move</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              setSelectedFiles([file]);
                              handleMoveFiles('copy');
                            }}>
                              <FiCopy className="mr-2 h-4 w-4" />
                              <span>Copy</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              handleShareFile(file);
                            }}>
                              <FiShare2 className="mr-2 h-4 w-4" />
                              <span>Share</span>
                            </DropdownMenuItem>
                            {!file.is_folder && (
                              <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.stopPropagation();
                                handleShowVersionHistory(file);
                              }}>
                                <FiClock className="mr-2 h-4 w-4" />
                                <span>Version History</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                              handleManageTags(file);
                            }}>
                              <FiTag className="mr-2 h-4 w-4" />
                              <span>Manage Tags</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-500"
                              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.stopPropagation();
                                setSelectedFiles([file]);
                                handleDeleteFiles();
                              }}
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <FileThumbnail file={file} />
                      <div className="text-center w-full mt-1">
                        <p className="text-sm font-medium truncate max-w-full">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {file.is_folder
                            ? 'Folder'
                            : formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : files.length === 0 ? (
            // Empty folder state
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FiFolder className="h-12 w-12 mb-2" />
              <p>No files in this folder</p>
            </div>
          ) : (
            // Regular file grid
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={(e) => handleFileClick(file, e)}
                  className={`p-4 border rounded-lg bg-white flex flex-col items-center cursor-pointer hover:border-primary hover:shadow-sm transition-all relative ${
                    isSelected(file) ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  {isSelected(file) && (
                    <div className="absolute top-2 left-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}>
                        <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                          <FiMoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                          e.stopPropagation();
                          setSelectedFiles([file]);
                          handleMoveFiles('move');
                        }}>
                          <FiMove className="mr-2 h-4 w-4" />
                          <span>Move</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                          e.stopPropagation();
                          setSelectedFiles([file]);
                          handleMoveFiles('copy');
                        }}>
                          <FiCopy className="mr-2 h-4 w-4" />
                          <span>Copy</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                          e.stopPropagation();
                          handleShareFile(file);
                        }}>
                          <FiShare2 className="mr-2 h-4 w-4" />
                          <span>Share</span>
                        </DropdownMenuItem>
                        {!file.is_folder && (
                          <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation();
                            handleShowVersionHistory(file);
                          }}>
                            <FiClock className="mr-2 h-4 w-4" />
                            <span>Version History</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                          e.stopPropagation();
                          handleManageTags(file);
                        }}>
                          <FiTag className="mr-2 h-4 w-4" />
                          <span>Manage Tags</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-500"
                          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation();
                            setSelectedFiles([file]);
                            handleDeleteFiles();
                          }}
                        >
                          <FiTrash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <FileThumbnail file={file} />
                  <div className="text-center w-full mt-1">
                  <p className="text-sm font-medium truncate max-w-full">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                    {file.is_folder
                      ? 'Folder'
                        : formatFileSize(file.size)}
                  </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File preview */}
      {selectedFile && (
        <div className="w-1/3 border-l h-full">
          <FilePreview file={selectedFile} onClose={() => setSelectedFile(null)} />
        </div>
      )}

      {/* Move/Copy Dialog */}
      <FileMoveDialog
        isOpen={isMoveDialogOpen}
        onClose={() => setIsMoveDialogOpen(false)}
        selectedFiles={selectedFiles}
        currentFolder={currentFolder}
        operation={moveOperation}
        onComplete={() => fetchFiles(currentFolder)}
      />

      {/* Share Dialog */}
      {fileToShare && (
        <FileShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setFileToShare(null);
          }}
          file={fileToShare}
        />
      )}
      
      {/* Version History Dialog */}
      {fileForVersions && (
        <FileVersionHistory
          file={fileForVersions}
          isOpen={isVersionHistoryOpen}
          onClose={() => {
            setIsVersionHistoryOpen(false);
            setFileForVersions(null);
            // Refresh file list to show updated versions
            fetchFiles(currentFolder);
          }}
        />
      )}

      {/* Tags Dialog */}
      {fileForTags && (
        <FileTags
          fileId={fileForTags.id}
          isOpen={isTagsDialogOpen}
          onClose={() => {
            setIsTagsDialogOpen(false);
            setFileForTags(null);
            // Refresh file list to show updated tags
            fetchFiles(currentFolder);
          }}
        />
      )}
    </div>
  );
}