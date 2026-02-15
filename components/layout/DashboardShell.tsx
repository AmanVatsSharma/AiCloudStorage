"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  FiHome, 
  FiFolder, 
  FiSettings, 
  FiUser, 
  FiPieChart, 
  FiClock, 
  FiShare2,
  FiStar,
  FiSearch,
  FiPlus,
  FiMenu,
  FiX,
  FiUsers,
  FiShield,
  FiBriefcase,
  FiCpu,
  FiActivity,
} from 'react-icons/fi'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  children: React.ReactNode
}

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: FiHome,
  },
  {
    title: 'Files',
    href: '/files',
    icon: FiFolder,
  },
  {
    title: 'Shared',
    href: '/shared',
    icon: FiShare2,
  },
  {
    title: 'Teams',
    href: '/teams',
    icon: FiUsers,
  },
  {
    title: 'Organizations',
    href: '/organizations',
    icon: FiBriefcase,
  },
  {
    title: 'Favorites',
    href: '/favorites',
    icon: FiStar,
  },
  {
    title: 'Recent',
    href: '/recent',
    icon: FiClock,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: FiPieChart,
  },
  {
    title: 'AI Tools',
    href: '/ai-tools',
    icon: FiCpu,
  },
  {
    title: 'Audit',
    href: '/audit',
    icon: FiShield,
  },
  {
    title: 'Compliance',
    href: '/compliance',
    icon: FiShield,
  },
  {
    title: 'Reliability',
    href: '/reliability',
    icon: FiActivity,
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: FiUser,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: FiSettings,
  },
]

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header>
        <button 
          className="md:hidden p-2 mr-2" 
          onClick={toggleMobileSidebar}
        >
          {isMobileSidebarOpen ? (
            <FiX className="h-5 w-5" />
          ) : (
            <FiMenu className="h-5 w-5" />
          )}
        </button>
        <div className="flex-1 flex items-center max-w-md">
          <div className="w-full relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input 
              type="search" 
              placeholder="Search files..." 
              className="w-full rounded-full bg-muted/30 border-0 pl-10 pr-4 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>
      </Header>
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-card p-4">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">CloudStorage</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <FiPlus size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Create New
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-1.5">
              {sidebarItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                    pathname === item.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-4 border-t">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="mb-2 text-sm font-medium">Storage</div>
              <div className="mb-2 h-2 w-full rounded-full bg-muted">
                <div className="h-full w-1/2 rounded-full bg-primary"></div>
              </div>
              <div className="text-xs text-muted-foreground">
                11.5 GB of 25 GB used
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card p-4 shadow-lg transition-transform duration-200 ease-in-out md:hidden",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg">CloudStorage</h2>
            <button 
              className="p-2 rounded-full hover:bg-muted" 
              onClick={toggleMobileSidebar}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  pathname === item.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
          <div className="mt-auto pt-4 border-t absolute bottom-4 left-4 right-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="mb-2 text-sm font-medium">Storage</div>
              <div className="mb-2 h-2 w-full rounded-full bg-muted">
                <div className="h-full w-1/2 rounded-full bg-primary"></div>
              </div>
              <div className="text-xs text-muted-foreground">
                11.5 GB of 25 GB used
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden" 
            onClick={toggleMobileSidebar}
          />
        )}
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 