"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Calendar,
  ChevronDown,
  Filter,
  RefreshCw,
  X,
  Clock,
  Users,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterValue {
  id: string;
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'date' | 'select' | 'multiselect' | 'range';
  options?: FilterValue[];
  placeholder?: string;
  autoRefresh?: boolean; // Whether this filter should trigger auto-refresh
}

export interface FilterState {
  [key: string]: string | string[] | { from: string; to: string };
}

interface EnhancedFiltersProps {
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: () => void;
  loading?: boolean;
  className?: string;
}

export function EnhancedFilters({
  filters,
  onFiltersChange,
  onApplyFilters,
  loading = false,
  className,
}: EnhancedFiltersProps) {
  const [filterState, setFilterState] = useState<FilterState>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Auto-refresh effect for filters marked with autoRefresh: true
  useEffect(() => {
    if (autoRefreshEnabled && hasChanges) {
      const autoRefreshFilters = filters.filter(f => f.autoRefresh);
      const hasAutoRefreshChanges = autoRefreshFilters.some(filter => 
        filterState[filter.id] !== undefined
      );
      
      if (hasAutoRefreshChanges) {
        const timeoutId = setTimeout(() => {
          onFiltersChange(filterState);
        }, 500); // Debounce auto-refresh
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [filterState, autoRefreshEnabled, hasChanges, filters, onFiltersChange]);

  const handleFilterChange = (filterId: string, value: string | string[] | { from: string; to: string } | undefined) => {
    const newState = { ...filterState };
    if (value === undefined) {
      delete newState[filterId];
    } else {
      newState[filterId] = value;
    }
    setFilterState(newState);
    setHasChanges(true);
    
    // Check if this filter should auto-refresh
    const filter = filters.find(f => f.id === filterId);
    if (filter?.autoRefresh && autoRefreshEnabled) {
      onFiltersChange(newState);
    }
  };

  const handleApplyFilters = () => {
    onFiltersChange(filterState);
    onApplyFilters();
    setHasChanges(false);
  };

  const handleResetFilters = () => {
    setFilterState({});
    setHasChanges(false);
    onFiltersChange({});
  };

  const getActiveFiltersCount = () => {
    return Object.values(filterState).filter(value => 
      value !== undefined && 
      value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length;
  };

  const renderFilter = (filter: FilterConfig) => {
    const currentValue = filterState[filter.id];

    switch (filter.type) {
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-between text-left font-normal",
                  !currentValue && "text-muted-foreground"
                )}
              >
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  {currentValue ? (
                    typeof currentValue === 'string' ? currentValue : 
                    `${(currentValue as { from: string; to: string }).from} - ${(currentValue as { from: string; to: string }).to}`
                  ) : (
                    filter.placeholder || "Select date range"
                  )}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
              <div className="p-4">
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">From</label>
                    <input
                      type="date"
                      value={typeof currentValue === 'object' && currentValue ? (currentValue as { from: string; to: string }).from : ''}
                      onChange={(e) => handleFilterChange(filter.id, {
                        ...(typeof currentValue === 'object' ? currentValue as { from: string; to: string } : { from: '', to: '' }),
                        from: e.target.value
                      })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To</label>
                    <input
                      type="date"
                      value={typeof currentValue === 'object' && currentValue ? (currentValue as { from: string; to: string }).to : ''}
                      onChange={(e) => handleFilterChange(filter.id, {
                        ...(typeof currentValue === 'object' ? currentValue as { from: string; to: string } : { from: '', to: '' }),
                        to: e.target.value
                      })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );

      case 'select':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-between text-left font-normal",
                  !currentValue && "text-muted-foreground"
                )}
              >
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  {currentValue ? 
                    (filter.options?.find(opt => opt.value === currentValue)?.label || String(currentValue)) :
                    (filter.placeholder || "Select option")
                  }
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg z-50">
              {filter.options?.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFilterChange(filter.id, option.value)}
                  className="bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {currentValue === option.value && (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    {option.label}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );

      case 'multiselect':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-between text-left font-normal",
                  !currentValue && "text-muted-foreground"
                )}
              >
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {Array.isArray(currentValue) && currentValue.length > 0 ? (
                    `${currentValue.length} selected`
                  ) : (
                    filter.placeholder || "Select options"
                  )}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border border-gray-200 shadow-lg z-50">
              <Command className="bg-white">
                <CommandInput 
                  placeholder="Search options..." 
                  className="h-9 bg-white border-b border-gray-100"
                />
                <CommandList className="bg-white">
                  <CommandEmpty>No options found.</CommandEmpty>
                  <CommandGroup>
                    {filter.options?.map((option) => {
                      const isSelected = Array.isArray(currentValue) && currentValue.includes(option.value);
                      return (
                        <CommandItem
                          key={option.value}
                          onSelect={() => {
                            const currentArray = Array.isArray(currentValue) ? currentValue : [];
                            const newArray = isSelected
                              ? currentArray.filter(v => v !== option.value)
                              : [...currentArray, option.value];
                            handleFilterChange(filter.id, newArray);
                          }}
                          className="group flex gap-2 items-center bg-white hover:bg-gray-50"
                        >
                          <div className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          {option.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );

      default:
        return null;
    }
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Controls Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          
          {/* Auto-refresh Toggle */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Auto-refresh:</label>
            <Button
              variant={autoRefreshEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={cn(
                "h-8 px-3",
                autoRefreshEnabled 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "border-gray-300"
              )}
            >
              {autoRefreshEnabled ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
              Unsaved changes
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            disabled={activeFiltersCount === 0}
          >
            <X className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={handleApplyFilters}
            disabled={!hasChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Filter className="h-4 w-4 mr-2" />
            )}
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filters.map((filter) => (
          <div key={filter.id} className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {filter.label}
              {filter.autoRefresh && (
                <span className="ml-1 text-xs text-green-600">(auto)</span>
              )}
            </label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filterState).map(([filterId, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            
            const filter = filters.find(f => f.id === filterId);
            if (!filter) return null;

            const getDisplayValue = (): string => {
              if (Array.isArray(value)) {
                return `${value.length} selected`;
              }
              if (typeof value === 'object' && value.from && value.to) {
                return `${value.from} - ${value.to}`;
              }
              return filter.options?.find(opt => opt.value === value)?.label || String(value);
            };

            return (
              <Badge
                key={filterId}
                variant="secondary"
                className="bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                <span className="font-medium">{filter.label}:</span>
                <span className="ml-1">{getDisplayValue()}</span>
                <button
                  onClick={() => handleFilterChange(filterId, undefined)}
                  className="ml-2 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EnhancedFilters;
