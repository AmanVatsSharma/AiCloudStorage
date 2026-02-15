'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AuthError } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FiBell, FiUser, FiLogOut, FiSettings, FiHelpCircle } from 'react-icons/fi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = React.useMemo(() => createClient(), []);
  const [traceId] = React.useState(() => `header_${Date.now()}`);
  const [userMeta, setUserMeta] = React.useState<{
    email: string;
    fullName: string;
    avatarUrl: string | null;
  }>({
    email: 'user@example.com',
    fullName: 'User',
    avatarUrl: '/placeholder-user.jpg',
  });

  React.useEffect(() => {
    const loadUserMeta = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return;

        const fallbackName = userData.user.email?.split("@")[0] ?? "User";
        const fallbackEmail = userData.user.email ?? "user@example.com";

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', userData.user.id)
          .single();

        setUserMeta({
          email: fallbackEmail,
          fullName: profileData?.full_name || fallbackName,
          avatarUrl: profileData?.avatar_url || '/placeholder-user.jpg',
        });
      } catch (error: unknown) {
        logger.warn({
          traceId,
          scope: "header",
          message: "Failed to resolve profile metadata in header.",
          data: {
            error: error instanceof Error ? error.message : error,
          },
        });
      }
    };

    void loadUserMeta();
  }, [supabase, traceId]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      logger.info({
        traceId,
        scope: "header",
        message: "User signed out.",
      });
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
      router.push('/login');
      router.refresh();
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: 'Error',
        description: authError.message || 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex gap-6 md:gap-10 items-center">
          <Link href="/dashboard" className="hidden md:flex">
            <Image
              src="/file.svg"
              alt="AI Cloud Storage"
              width={30}
              height={30}
              className="mr-2"
            />
            <span className="hidden font-bold sm:inline-block">
              CloudStorage
            </span>
          </Link>
        </div>
        
        {/* Search components or other elements passed from parent */}
        {children}
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="relative">
              <FiBell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                3
              </Badge>
              <span className="sr-only">Notifications</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userMeta.avatarUrl || '/placeholder-user.jpg'} alt={userMeta.fullName} />
                    <AvatarFallback>{userMeta.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userMeta.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userMeta.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <FiUser className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <FiSettings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/help')}>
                  <FiHelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <FiLogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
} 