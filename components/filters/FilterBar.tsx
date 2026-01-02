"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FilterBarProps, FilterValue, FilterState, NumberCondition } from "@/lib/filters/types";
import { FilterChip } from "./FilterChip";

export function FilterBar<TData = unknown>({
  filters,
  search,
  searchConfig,
  table,
  className,
  onFiltersChange,
  onSearchChange,
}: FilterBarProps<TData>) {
  // Support both search and searchConfig props (searchConfig takes precedence)
  const searchProps = searchConfig || search;
  const handleFiltersChange = onFiltersChange;
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize filter state from URL params
  const getInitialFilterState = (): FilterState => {
    const state: FilterState = {};
    const hasAnyParams = searchParams.toString().length > 0;
    
    filters.forEach((filter) => {
      const param = filter.param || filter.id;
      const paramValue = searchParams.get(param);
      
      if (paramValue) {
        if (filter.type === 'checkbox') {
          state[filter.id] = paramValue.split(',');
        } else if (filter.type === 'number') {
          // Parse number filter from URL: condition:value1:value2
          const parts = paramValue.split(':');
          if (parts.length >= 2) {
            state[filter.id] = {
              condition: (parts[0] === 'between' ? 'is-between' : parts[0]) as NumberCondition,
              value: [parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0],
            };
          }
        } else if (filter.type === 'date-range') {
          // Parse date range from URL: from:to (ISO date strings)
          const parts = paramValue.split(':');
          if (parts.length >= 2) {
            state[filter.id] = {
              from: parts[0] || '',
              to: parts[1] || '',
            };
          }
        } else {
          state[filter.id] = paramValue;
        }
      } else if (!hasAnyParams && filter.type === 'checkbox' && filter.options) {
        // If no URL params exist, don't select any checkbox filters by default
        // Only select if explicitly needed (e.g., cohortType is handled separately)
        // state[filter.id] = filter.options.map(opt => opt.value);
      } else if (!hasAnyParams && filter.type === 'select' && filter.options && filter.options.length > 0) {
        // For select filters, use the first option as default (or a specific default if needed)
        // For cohortType, default to 'annual'
        if (filter.id === 'cohortType') {
          state[filter.id] = 'annual';
        } else {
          state[filter.id] = filter.options[0].value;
        }
      }
    });
    return state;
  };

  const [filterState, setFilterState] = useState<FilterState>(getInitialFilterState);
  const [searchValue, setSearchValue] = useState(searchParams.get(searchProps?.param || 'q') || '');
  const isInitialMount = React.useRef(true);
  const isUpdatingFromURL = React.useRef(false);

  // Sync from URL params when they change externally
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Check if URL actually changed by comparing query strings
    const currentQuery = searchParams.toString();
    const currentStateQuery = (() => {
      const params = new URLSearchParams();
      filters.forEach((filter) => {
        const param = filter.param || filter.id;
        const value = filterState[filter.id];
        if (value !== undefined && (Array.isArray(value) ? value.length > 0 : true)) {
          if (filter.type === 'checkbox' && Array.isArray(value)) {
            params.set(param, value.join(','));
          } else if (filter.type === 'number' && typeof value === 'object' && value !== null) {
            const numVal = value as { condition: string; value: [number, number] };
            params.set(param, `${numVal.condition}:${numVal.value[0]}:${numVal.value[1]}`);
          } else if (typeof value === 'string') {
            params.set(param, value);
          }
        }
      });
      const searchParam = searchProps?.param || 'q';
      if (searchValue) {
        params.set(searchParam, searchValue);
      }
      return params.toString();
    })();
    
    // Only sync from URL if it's different from current state
    if (currentQuery !== currentStateQuery) {
      isUpdatingFromURL.current = true;
      const newState = getInitialFilterState();
      setFilterState(newState);
      const newSearch = searchParams.get(searchProps?.param || 'q') || '';
      setSearchValue(newSearch);
      
      // Reset flag after state updates
      setTimeout(() => {
        isUpdatingFromURL.current = false;
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    // Update filter params
    filters.forEach((filter) => {
      const param = filter.param || filter.id;
      const value = filterState[filter.id];
      
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        // Don't add empty params
      } else if (filter.type === 'checkbox' && Array.isArray(value)) {
        params.set(param, value.join(','));
      } else if (filter.type === 'number' && typeof value === 'object' && value !== null && 'condition' in value) {
        const numVal = value as { condition: string; value: [number, number] };
        params.set(param, `${numVal.condition}:${numVal.value[0]}:${numVal.value[1]}`);
      } else if (filter.type === 'date-range' && typeof value === 'object' && value !== null && 'from' in value) {
        const dateVal = value as { from: string; to: string };
        if (dateVal.from || dateVal.to) {
          params.set(param, `${dateVal.from || ''}:${dateVal.to || ''}`);
        }
      } else if (typeof value === 'string') {
        params.set(param, value);
      }
    });

    // Update search param
    const searchParam = search?.param || 'q';
    if (searchValue) {
      params.set(searchParam, searchValue);
    }

    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [filterState, searchValue, filters, search, router, pathname]);

  // Debounce search and update URL
  useEffect(() => {
    if (isInitialMount.current) return;
    
    const timer = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(searchValue);
      }
      if (!isUpdatingFromURL.current) {
        updateURL();
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange, updateURL]);

  // Sync filter state to URL (but not on initial mount or when syncing from URL)
  useEffect(() => {
    if (!isInitialMount.current && !isUpdatingFromURL.current) {
      updateURL();
    }
  }, [filterState, updateURL]);

  // Update TanStack Table when filters change
  useEffect(() => {
    if (table) {
      filters.forEach((filter) => {
        const column = table.getColumn(filter.id);
        if (column) {
          const value = filterState[filter.id];
          column.setFilterValue(value);
        }
      });
    }
  }, [filterState, filters, table]);

  // Update TanStack Table global filter when search changes
  useEffect(() => {
    if (table && searchProps) {
      table.setGlobalFilter(searchValue);
    }
  }, [searchValue, table, searchProps]);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFilterChange = (filterId: string, value: FilterValue) => {
    const newState = { ...filterState };
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete newState[filterId];
    } else {
      newState[filterId] = value;
    }
    setFilterState(newState);
    
    if (handleFiltersChange) {
      handleFiltersChange(newState);
    }
  };

  const handleFilterClear = (filterId: string) => {
    const newState = { ...filterState };
    delete newState[filterId];
    setFilterState(newState);
    
    if (handleFiltersChange) {
      handleFiltersChange(newState);
    }
  };

  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasActiveFilters = Object.keys(filterState).length > 0 || searchValue.length > 0;

  return (
    <div
      className={cn(
        "bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm transition-all duration-200 mb-6",
        className
      )}
    >
      {/* Filter Bar Header - Collapsible */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {Object.keys(filterState).length + (searchValue ? 1 : 0)} active
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Filter Content */}
      {!isCollapsed && (
        <div className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {filters.map((filter) => (
          <FilterChip
            key={filter.id}
            config={filter}
            value={filterState[filter.id]}
            onChange={(value) => handleFilterChange(filter.id, value)}
            onClear={() => handleFilterClear(filter.id)}
          />
        ))}
      </div>

      {/* Search Input */}
      {search && (
        <div className="relative flex-shrink-0 ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={search.placeholder || "Search..."}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8 h-8 w-[180px] md:w-[220px] text-sm"
            aria-label="Search"
          />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

