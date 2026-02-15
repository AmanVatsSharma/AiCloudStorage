'use client';

import React, { useState } from 'react';
import { FiSearch, FiSliders, FiX } from 'react-icons/fi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FileSearchCategory,
  FileSearchFilterInput,
  FileSearchRequestInput,
  getActiveFilterCount,
  normalizeFileSearchRequest,
} from '@/lib/files/search';

interface FileSearchProps {
  onSearch: (request: FileSearchRequestInput) => void;
}

export function FileSearch({ onSearch }: FileSearchProps) {
  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FileSearchFilterInput>({
    itemScope: 'all',
    category: 'all',
    metadataQuery: '',
    minSizeMb: '',
    maxSizeMb: '',
    updatedAfter: '',
    updatedBefore: '',
  });

  const normalizedRequest = normalizeFileSearchRequest({ query, filters });
  const activeFilterCount = getActiveFilterCount(normalizedRequest.filters);

  const categoryOptions: { value: FileSearchCategory; label: string }[] = [
    { value: 'all', label: 'All categories' },
    { value: 'document', label: 'Documents' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'archive', label: 'Archives' },
    { value: 'other', label: 'Other' },
  ];

  const handleApply = () => {
    onSearch({ query, filters });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApply();
  };

  const handleClear = () => {
    setQuery('');
    const emptyFilters: FileSearchFilterInput = {
      itemScope: 'all',
      category: 'all',
      metadataQuery: '',
      minSizeMb: '',
      maxSizeMb: '',
      updatedAfter: '',
      updatedBefore: '',
    };
    setFilters(emptyFilters);
    onSearch({ query: '', filters: emptyFilters });
  };

  const handleClearFilters = () => {
    setFilters({
      itemScope: 'all',
      category: 'all',
      metadataQuery: '',
      minSizeMb: '',
      maxSizeMb: '',
      updatedAfter: '',
      updatedBefore: '',
    });
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters((current) => !current)}
              className="absolute -right-10 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <FiSliders size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-primary text-white text-[10px] leading-none px-1 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>
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

      {isActive && showFilters && (
        <div className="absolute z-20 right-0 mt-2 w-80 rounded-md border bg-background p-3 shadow-lg space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Item Scope</label>
            <select
              value={filters.itemScope ?? 'all'}
              onChange={(event) =>
                setFilters((current) => ({ ...current, itemScope: event.target.value as FileSearchFilterInput['itemScope'] }))
              }
              className="w-full border rounded-md px-2 py-1 text-sm"
            >
              <option value="all">All items</option>
              <option value="files">Files only</option>
              <option value="folders">Folders only</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select
              value={filters.category ?? 'all'}
              onChange={(event) =>
                setFilters((current) => ({ ...current, category: event.target.value as FileSearchCategory }))
              }
              className="w-full border rounded-md px-2 py-1 text-sm"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Metadata contains</label>
            <Input
              value={filters.metadataQuery ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, metadataQuery: event.target.value }))
              }
              placeholder="owner:finance"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Min size (MB)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={filters.minSizeMb ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, minSizeMb: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Max size (MB)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={filters.maxSizeMb ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, maxSizeMb: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Updated after</label>
              <Input
                type="date"
                value={filters.updatedAfter ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, updatedAfter: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Updated before</label>
              <Input
                type="date"
                value={filters.updatedBefore ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, updatedBefore: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClearFilters}>
              Clear filters
            </Button>
            <Button type="button" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      )}
      
      {isActive && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => {
            setIsActive(false);
            setShowFilters(false);
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
} 