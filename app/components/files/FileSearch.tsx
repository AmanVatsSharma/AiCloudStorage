'use client';

import React, { useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FileSearchProps {
  onSearch: (query: string) => void;
}

export function FileSearch({ onSearch }: FileSearchProps) {
  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className={`relative transition-all duration-200 ${isActive ? 'w-full md:w-96' : 'w-10'}`}>
      <form onSubmit={handleSubmit} className="relative">
        {isActive ? (
          <>
            <Input
              type="text"
              placeholder="Search files and folders..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-8"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiSearch size={16} />
            </button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsActive(true)}
            className="p-0 h-10 w-10"
          >
            <FiSearch size={18} />
          </Button>
        )}
      </form>
      
      {isActive && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setIsActive(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
} 