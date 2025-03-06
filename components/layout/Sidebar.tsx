'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiFolder, 
  FiUser, 
  FiSettings, 
  FiShare2, 
  FiTrash2
} from 'react-icons/fi';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome },
  { name: 'Files', href: '/files', icon: FiFolder },
  { name: 'Shared', href: '/shared', icon: FiShare2 },
  { name: 'Trash', href: '/trash', icon: FiTrash2 },
  { name: 'Profile', href: '/profile', icon: FiUser },
  { name: 'Settings', href: '/settings', icon: FiSettings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-secondary-800 w-64 border-r border-gray-200 dark:border-secondary-700">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex-grow mt-5 flex flex-col">
          <nav className="flex-1 px-2 space-y-1" aria-label="Sidebar">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-gray-100 dark:bg-secondary-700 text-primary dark:text-white' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-secondary-700'}
                  `}
                >
                  <item.icon 
                    className={`
                      mr-3 h-5 w-5
                      ${isActive 
                        ? 'text-primary dark:text-white' 
                        : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'}
                    `}
                    aria-hidden="true" 
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-secondary-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
              <FiUser className="h-4 w-4" />
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">User Account</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">View profile</p>
          </div>
        </div>
      </div>
    </div>
  );
} 