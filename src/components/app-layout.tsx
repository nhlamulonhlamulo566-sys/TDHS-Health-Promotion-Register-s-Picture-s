
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { useIdle } from '@/hooks/use-idle';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { FirebaseClientProvider } from '@/firebase';
import { AppProvider } from '@/context/app-context';
import { FileProvider } from '@/context/file-context';


const pageTitles: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/documents': 'Documents',
  '/departments': 'Departments',
  '/workflows': 'Workflows',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/login': 'Login',
};

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = React.useState(false);

  const handleIdle = () => {
    if (!auth) return;
    signOut(auth).then(() => {
      toast({
        title: 'Session Expired',
        description: 'You have been logged out due to inactivity.',
      });
      router.push('/login');
    });
  };

  useIdle({ onIdle: handleIdle, idleTime: 5 });

  const notifications: Notification[] = []; // Placeholder
  const unreadCount = 0; // Placeholder

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user status is resolved
    }
    if (!user && pathname !== '/login') {
      router.push('/login');
    }
  }, [isUserLoading, user, pathname, router]);

  const handleReadNotification = async () => {
    // Placeholder for marking notifications as read
  }

  const getPageTitle = () => {
    if (pathname.startsWith('/documents/')) {
        return 'Document Details';
    }
    return pageTitles[pathname] || 'Dashboard';
  }
  
  const isAuthPage = pathname === '/login' || pathname === '/';

  // The root page handles the initial redirect, so this loader is for subsequent page loads.
  if (isUserLoading && !isAuthPage) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }
  
  if (!user && !isAuthPage) {
      return (
         <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
  }
  
  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>
  }


  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <div className="flex h-full flex-col">
            <div className="p-4 flex items-center justify-center gap-2 group-[[data-collapsible=icon]]:justify-center">
               <svg role="img" viewBox="0 0 24 24" className="h-8 w-8 text-primary flex-shrink-0">
                <title>TDHS Health Promotion Register & Picture's</title>
                <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 9v4h-2v-4H9V9h2V5h2v4h2v2h-2zm4-10.17L19.17 4H14V.83zM18 20H6V4h7v5h5v11z"/>
              </svg>
              <span className="font-bold text-lg group-[[data-collapsible=icon]]:hidden">TDHS</span>
            </div>
            <MainNav />
          </div>
        </Sidebar>

        <SidebarInset>
          <header className={cn(
            "sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 md:px-6",
            isMounted && "backdrop-blur-sm"
          )}>
            <div className="flex items-center gap-4">
              <h1 className="font-headline text-xl font-semibold tracking-tight">
                {getPageTitle()}
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" onClick={handleReadNotification}>
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                        {unreadCount}
                      </span>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="grid gap-2">
                    <h4 className="font-medium leading-none">Notifications</h4>
                    <div className="grid gap-2">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 4).map((notification) => (
                          <div key={notification.id} className="grid grid-cols-[25px_1fr] items-start pb-2 last:pb-0">
                            {!notification.isRead && <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />}
                            <div className={cn("grid gap-1", notification.isRead && "col-start-2")}>
                              <p className="text-sm">{notification.message}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.timestamp)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">You have no new notifications.</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <UserNav />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-8 pt-6">
            <div className="mx-auto w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AppProvider>
        <FileProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </FileProvider>
      </AppProvider>
    </FirebaseClientProvider>
  )
}
