'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { FiCopy, FiLink, FiGlobe, FiLock, FiEye, FiCalendar } from 'react-icons/fi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getUserErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { trackAuditEvent } from '@/lib/audit';

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

interface FileShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem;
}

type ShareSettings = {
  isPublic: boolean;
  expiresAt: string | null;
  password: string | null;
  allowDownload: boolean;
  accessLevel: 'view' | 'edit';
};

export function FileShareDialog({
  isOpen,
  onClose,
  file,
}: FileShareDialogProps) {
  const [shareLink, setShareLink] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [traceId] = useState(() => `file-share-dialog_${Date.now()}`);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: true,
    expiresAt: null,
    password: null,
    allowDownload: true,
    accessLevel: 'view',
  });
  
  const supabase = React.useMemo(() => createClient(), []);
  const { toast } = useToast();

  useEffect(() => {
    const resolveUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        logger.warn({
          traceId,
          scope: "file-share-dialog",
          message: "Failed to resolve user for sharing flow.",
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

  useEffect(() => {
    if (isOpen) {
      setIsLinkGenerated(false);
      setShareLink('');
      setShareSettings({
        isPublic: true,
        expiresAt: null,
        password: null,
        allowDownload: true,
        accessLevel: 'view',
      });
    }
  }, [isOpen]);

  const generateShareLink = async () => {
    setIsLoading(true);

    try {
      if (!userId) {
        throw new Error("Authentication required to create share links.");
      }

      // Create a sharing record in the database
      const { data, error } = await supabase
        .from('shared_files')
        .insert({
          file_id: file.id,
          owner_id: userId,
          is_public: shareSettings.isPublic,
          expires_at: shareSettings.expiresAt,
          password: shareSettings.password,
          allow_download: shareSettings.allowDownload,
          access_level: shareSettings.accessLevel,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate the share URL
      const shareId = data.id;
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/shared/${shareId}`;
      
      setShareLink(shareUrl);
      setIsLinkGenerated(true);
      
      toast({
        title: 'Share link generated',
        description: 'Your file share link has been created successfully',
      });

      await trackAuditEvent({
        action: 'file.share.create',
        resourceType: 'file',
        resourceId: file.id,
        details: {
          shareId,
          isPublic: shareSettings.isPublic,
          accessLevel: shareSettings.accessLevel,
        },
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "file-share-dialog",
        message: "Failed to generate share link.",
        data: {
          fileId: file.id,
          userId,
          error: error instanceof Error ? error.message : error,
        },
      });
      toast({
        title: 'Error',
        description: getUserErrorMessage(error, 'Failed to generate share link'),
        variant: 'destructive',
      });

      await trackAuditEvent({
        action: 'file.share.create',
        resourceType: 'file',
        resourceId: file.id,
        status: 'failure',
        details: {
          isPublic: shareSettings.isPublic,
          accessLevel: shareSettings.accessLevel,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: 'Link copied',
      description: 'The share link has been copied to your clipboard',
    });
  };

  const handleExpirationChange = (value: string) => {
    let expiresAt: string | null = null;
    
    if (value === 'never') {
      expiresAt = null;
    } else {
      const now = new Date();
      if (value === '1day') {
        now.setDate(now.getDate() + 1);
      } else if (value === '7days') {
        now.setDate(now.getDate() + 7);
      } else if (value === '30days') {
        now.setDate(now.getDate() + 30);
      }
      expiresAt = now.toISOString();
    }
    
    setShareSettings(prev => ({ ...prev, expiresAt }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {file.name}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isLinkGenerated ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input 
                  value={shareLink} 
                  readOnly 
                  className="flex-1"
                />
                <Button
                  onClick={copyLinkToClipboard}
                  size="icon"
                  variant="outline"
                >
                  <FiCopy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    {shareSettings.isPublic ? (
                      <FiGlobe className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <FiLock className="mr-2 h-4 w-4 text-primary" />
                    )}
                    <span>
                      {shareSettings.isPublic ? 'Public link' : 'Private link'}
                    </span>
                  </div>
                </div>
                
                {shareSettings.expiresAt && (
                  <div className="flex items-center text-sm">
                    <FiCalendar className="mr-2 h-4 w-4 text-primary" />
                    <span>
                      Expires on {new Date(shareSettings.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center text-sm">
                  <FiEye className="mr-2 h-4 w-4 text-primary" />
                  <span>
                    {shareSettings.accessLevel === 'view' ? 'View only' : 'Can edit'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="visibility">Visibility</Label>
                <RadioGroup 
                  defaultValue={shareSettings.isPublic ? "public" : "private"}
                  onValueChange={(value) => setShareSettings(prev => ({ 
                    ...prev, 
                    isPublic: value === "public" 
                  }))}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="flex items-center">
                      <FiGlobe className="mr-2 h-4 w-4" />
                      Public - Anyone with the link can access
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="flex items-center">
                      <FiLock className="mr-2 h-4 w-4" />
                      Private - Only specific people can access
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="expiration">Link expiration</Label>
                <Select 
                  onValueChange={handleExpirationChange}
                  defaultValue="never"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiration time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="1day">1 day</SelectItem>
                    <SelectItem value="7days">7 days</SelectItem>
                    <SelectItem value="30days">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="password">Password protection (optional)</Label>
                <Input 
                  id="password"
                  type="password"
                  placeholder="Set a password"
                  onChange={(e) => setShareSettings(prev => ({ 
                    ...prev, 
                    password: e.target.value || null 
                  }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-download">Allow download</Label>
                <Switch 
                  id="allow-download"
                  checked={shareSettings.allowDownload}
                  onCheckedChange={(checked) => setShareSettings(prev => ({ 
                    ...prev, 
                    allowDownload: checked 
                  }))}
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="access-level">Access level</Label>
                <Select 
                  onValueChange={(value) => setShareSettings(prev => ({ 
                    ...prev, 
                    accessLevel: value as 'view' | 'edit'
                  }))}
                  defaultValue="view"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View only</SelectItem>
                    <SelectItem value="edit">Can edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!isLinkGenerated && (
            <Button 
              onClick={generateShareLink} 
              disabled={isLoading}
              className="flex items-center"
            >
              <FiLink className="mr-2 h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}