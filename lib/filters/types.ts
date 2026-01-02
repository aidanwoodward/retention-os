/**
 * Shared types for FilterBar component system
 */

import type { Table } from '@tanstack/react-table';

export type FilterOption = {
  label: string;
  value: string;
};

export type NumberCondition = 'equals' | 'greater-than' | 'less-than' | 'is-between';

export type FilterType = 'select' | 'checkbox' | 'number' | 'date-range';

export type NumberFilterValue = {
  condition: NumberCondition;
  value: [string | number, string | number];
};

export type DateRangeFilterValue = {
  from: string; // ISO date string or empty string
  to: string; // ISO date string or empty string
};

export type FilterValue = string | string[] | NumberFilterValue | DateRangeFilterValue | undefined;

export interface FilterConfig {
  id: string; // maps to TanStack column id / accessor
  title: string; // chip label e.g., "Status"
  type: FilterType;
  options?: FilterOption[]; // for select/checkbox
  numberOptions?: FilterOption[]; // for number condition select (if custom labels needed)
  formatter?: (v: FilterValue) => string; // for chip preview text
  param?: string; // custom query key, default = id
  defaultValue?: FilterValue;
}

export interface FilterBarProps<TData = unknown> {
  filters: FilterConfig[];
  search?: {
    placeholder?: string;
    param?: string; // default 'q'
  };
  searchConfig?: {
    placeholder?: string;
    param?: string;
  };
  table?: Table<TData>; // TanStack Table instance (optional)
  className?: string;
  onFiltersChange?: (filters: Record<string, FilterValue>) => void;
  onSearchChange?: (search: string) => void;
}

export interface FilterState {
  [filterId: string]: FilterValue;
}

