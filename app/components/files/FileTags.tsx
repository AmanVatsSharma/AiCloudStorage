'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogHeader, 
  DialogTitle, 
  DialogContent, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FiX, FiPlus, FiTag } from 'react-icons/fi';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FileTags {
  id: string;
  file_id: string;
  tag_id: string;
  tag: Tag;
}

interface FileTagsProps {
  fileId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FileTags({ fileId, isOpen, onClose }: FileTagsProps) {
  const [loading, setLoading] = useState(true);
  const [fileTags, setFileTags] = useState<FileTags[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [traceId] = useState(() => `file-tags_${Date.now()}`);

  const colors = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#EC4899', // pink
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all tags
      const { data: allTags, error: tagsError } = await supabase
        .from('tags')
        .select('*');

      if (tagsError) throw tagsError;

      // Fetch file tags
      const { data: fileTagsData, error: fileTagsError } = await supabase
        .from('file_tags')
        .select('*, tag:tags(*)')
        .eq('file_id', fileId);

      if (fileTagsError) throw fileTagsError;

      setAvailableTags(allTags || []);
      setFileTags(fileTagsData || []);
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-tags",
        message: "Failed to fetch tags for file.",
        data: {
          fileId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to load tags'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [fileId, supabase, toast, traceId]);

  useEffect(() => {
    if (isOpen) {
      void fetchData();
    }
  }, [fetchData, isOpen]);

  const createTag = async () => {
    if (!newTagName.trim()) return;

    try {
      // Create new tag
      const { data: newTag, error: createError } = await supabase
        .from('tags')
        .insert({
          name: newTagName.trim(),
          color: selectedColor,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add to available tags
      setAvailableTags([...availableTags, newTag]);
      setNewTagName('');
      
      toast({
        title: 'Success',
        description: 'Tag created successfully',
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-tags",
        message: "Failed to create tag.",
        data: {
          fileId,
          tagName: newTagName,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to create tag'),
        variant: 'destructive',
      });
    }
  };

  const toggleTagForFile = async (tagId: string) => {
    // Check if file already has this tag
    const existingTag = fileTags.find(ft => ft.tag_id === tagId);

    try {
      if (existingTag) {
        // Remove tag from file
        const { error } = await supabase
          .from('file_tags')
          .delete()
          .eq('id', existingTag.id);

        if (error) throw error;

        // Update state
        setFileTags(fileTags.filter(ft => ft.id !== existingTag.id));
        
        toast({
          title: 'Success',
          description: 'Tag removed from file',
        });
      } else {
        // Add tag to file
        const { data, error } = await supabase
          .from('file_tags')
          .insert({
            file_id: fileId,
            tag_id: tagId,
          })
          .select('*, tag:tags(*)')
          .single();

        if (error) throw error;

        // Update state
        setFileTags([...fileTags, data]);
        
        toast({
          title: 'Success',
          description: 'Tag added to file',
        });
      }
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-tags",
        message: "Failed to toggle tag association for file.",
        data: {
          fileId,
          tagId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to update file tags'),
        variant: 'destructive',
      });
    }
  };

  const isTagSelected = (tagId: string) => {
    return fileTags.some(ft => ft.tag_id === tagId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FiTag className="mr-2 h-5 w-5" />
            Manage Tags
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">File Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {fileTags.length > 0 ? (
                    fileTags.map(fileTag => (
                      <div 
                        key={fileTag.id}
                        className="flex items-center px-3 py-1 rounded-full text-white text-sm"
                        style={{ backgroundColor: fileTag.tag.color }}
                      >
                        <span>{fileTag.tag.name}</span>
                        <button 
                          className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                          onClick={() => toggleTagForFile(fileTag.tag_id)}
                        >
                          <FiX className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags applied to this file</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Available Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        isTagSelected(tag.id) 
                          ? 'text-white' 
                          : 'text-gray-700 border'
                      }`}
                      style={{ 
                        backgroundColor: isTagSelected(tag.id) ? tag.color : 'transparent',
                        borderColor: tag.color 
                      }}
                      onClick={() => toggleTagForFile(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Create New Tag</h3>
                <div className="flex space-x-2">
                  <Input
                    placeholder="New tag name"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    className="flex-1"
                  />
                  <div className="relative">
                    <div 
                      className="w-10 h-10 rounded-md cursor-pointer"
                      style={{ backgroundColor: selectedColor }}
                      onClick={() => document.getElementById('color-dropdown')?.classList.toggle('hidden')}
                    ></div>
                    <div 
                      id="color-dropdown"
                      className="absolute top-full right-0 mt-2 p-2 bg-white border rounded-md shadow-md hidden z-10"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {colors.map(color => (
                          <div
                            key={color}
                            className="w-6 h-6 rounded-md cursor-pointer"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setSelectedColor(color);
                              document.getElementById('color-dropdown')?.classList.add('hidden');
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    onClick={createTag}
                    disabled={!newTagName.trim()}
                  >
                    <FiPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 