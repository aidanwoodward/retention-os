"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type QuickSelectOption = 'all' | 'ltm' | 'ytd' | 'last3years';

interface DateRangePickerProps {
  value?: { from: string; to: string }; // ISO date strings (YYYY-MM-DD)
  onChange: (value: { from: string; to: string } | undefined) => void;
  onClose?: () => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  tooltip?: string;
  showQuickSelects?: boolean; // Default true, can be disabled for specific use cases
}

type CustomDateRange = {
  from?: Date;
  to?: Date;
};

const QUICK_SELECT_OPTIONS: Array<{ label: string; value: QuickSelectOption }> = [
  { label: 'All data', value: 'all' },
  { label: 'LTM', value: 'ltm' },
  { label: 'YTD', value: 'ytd' },
  { label: 'Last 3 years', value: 'last3years' },
];

const getQuickSelectRange = (option: QuickSelectOption): { from: Date; to: Date } | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (option) {
    case 'all':
      return null; // Clear filter
    case 'ltm':
      // Last Twelve Months
      const ltmFrom = new Date(today);
      ltmFrom.setFullYear(ltmFrom.getFullYear() - 1);
      ltmFrom.setDate(ltmFrom.getDate() + 1); // Start of next day
      return { from: ltmFrom, to: today };
    case 'ytd':
      // Year to Date
      const ytdFrom = new Date(today.getFullYear(), 0, 1);
      return { from: ytdFrom, to: today };
    case 'last3years':
      // Last 3 completed calendar years (e.g., Jan 1, 2023 to Dec 31, 2025 if today is in 2026)
      const currentYear = today.getFullYear();
      const lastCompletedYear = currentYear - 1; // Last completed year
      const last3YearsFrom = new Date(lastCompletedYear - 2, 0, 1); // January 1st, 3 completed years ago
      const last3YearsTo = new Date(lastCompletedYear, 11, 31); // December 31st of last completed year
      return { from: last3YearsFrom, to: last3YearsTo };
    default:
      return null;
  }
};

const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const formatDateRangeDisplay = (from: string, to: string): string => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return `${formatDateForDisplay(fromDate)} – ${formatDateForDisplay(toDate)}`;
};

// Helper to safely convert ISO date string to Date object
const parseDateString = (dateStr: string | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  const parsed = new Date(dateStr);
  // Check if date is valid
  if (isNaN(parsed.getTime())) return undefined;
  return parsed;
};

export function DateRangePicker({
  value,
  onChange,
  onClose,
  minDate = new Date(2010, 0, 1),
  maxDate, // Will default to today if not provided
  placeholder = "Select date range",
  tooltip,
  showQuickSelects = true,
}: DateRangePickerProps) {
  // Get today's date (end of day) for max date restriction
  const today = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  }, []);

  // Use today as maxDate if not provided (prevent future dates)
  const _effectiveMaxDate = maxDate || today;

  // Normalize incoming value (ISO strings) to Date objects
  const normalizedValue = React.useMemo(() => {
    const fromDate = parseDateString(value?.from);
    const toDate = parseDateString(value?.to);
    if (fromDate && toDate) {
      return { from: fromDate, to: toDate };
    }
    return undefined;
  }, [value]);

  // Track which quick select is active (if any)
  const [activeQuickSelect, setActiveQuickSelect] = useState<QuickSelectOption | null>(null);
  
  // Track custom range selection (draft state - not applied until both dates selected)
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>(
    normalizedValue
      ? { from: normalizedValue.from, to: normalizedValue.to }
      : undefined
  );

  // Track displayed months for each calendar (for navigation)
  const [startCalendarMonth, setStartCalendarMonth] = useState<Date>(() => {
    const fromDate = parseDateString(value?.from);
    if (fromDate) {
      return new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    }
    return new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  });

  const [endCalendarMonth, setEndCalendarMonth] = useState<Date>(() => {
    const fromDate = parseDateString(value?.from);
    if (fromDate) {
      const startMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      return new Date(startMonth.getFullYear(), startMonth.getMonth() + 1, 1);
    }
    const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return new Date(startMonth.getFullYear(), startMonth.getMonth() + 1, 1);
  });

  // Determine active quick select from current value
  useEffect(() => {
    if (!normalizedValue?.from || !normalizedValue?.to) {
      setActiveQuickSelect(value?.from || value?.to ? null : 'all');
      setCustomRange(undefined);
      return;
    }

    // Check if current value matches any quick select
    let matchedQuickSelect: QuickSelectOption | null = null;
    for (const option of QUICK_SELECT_OPTIONS) {
      if (option.value === 'all') continue;
      const quickRange = getQuickSelectRange(option.value);
      if (quickRange && 
          quickRange.from.toISOString().split('T')[0] === value?.from &&
          quickRange.to.toISOString().split('T')[0] === value?.to) {
        matchedQuickSelect = option.value;
        break;
      }
    }

    if (matchedQuickSelect) {
      setActiveQuickSelect(matchedQuickSelect);
      setCustomRange(undefined);
    } else {
      // Custom range
      setActiveQuickSelect(null);
      setCustomRange({
        from: normalizedValue.from,
        to: normalizedValue.to,
      });
    }
  }, [value, normalizedValue]);

  // Handle quick select click
  const handleQuickSelect = useCallback((option: QuickSelectOption) => {
    const range = getQuickSelectRange(option);
    
    if (range === null) {
      // Clear filter
      onChange(undefined);
      setActiveQuickSelect('all');
      setCustomRange(undefined);
    } else {
      const newValue = {
        from: range.from.toISOString().split('T')[0],
        to: range.to.toISOString().split('T')[0],
      };
      onChange(newValue);
      setActiveQuickSelect(option);
      setCustomRange(undefined);
    }
    
    // Close popover after applying
    onClose?.();
  }, [onChange, onClose]);

  // Handle start date selection (top calendar)
  const handleStartDateSelect = useCallback((date: Date | undefined) => {
    if (!date) {
      // Clear start date
      setCustomRange(prev => prev?.to ? { to: prev.to } : undefined);
      setActiveQuickSelect(null);
      return;
    }
    
    // Update start date, clear end date if new start date is after current end date
    const newFrom = date;
    const currentTo = customRange?.to;
    
    if (currentTo && newFrom > currentTo) {
      // New start date is after end date - clear end date
      setCustomRange({ from: newFrom });
    } else {
      // Update start date, keep end date if valid
      setCustomRange(prev => ({
        from: newFrom,
        to: prev?.to,
      }));
    }
    
    setActiveQuickSelect(null);
    // Don't apply yet - wait for end date
  }, [customRange]);

  // Handle end date selection (bottom calendar)
  const handleEndDateSelect = useCallback((date: Date | undefined) => {
    if (!date) {
      // Clear end date only
      setCustomRange(prev => prev?.from ? { from: prev.from } : undefined);
      setActiveQuickSelect(null);
      return;
    }
    
    if (!customRange?.from) {
      // No start date - ignore (should be disabled anyway)
      return;
    }
    
    const newTo = date;
    const currentFrom = customRange.from;
    
    // Validate: end date must be >= start date
    if (newTo < currentFrom) {
      return; // Invalid - ignore
    }
    
    // Update end date
    setCustomRange({
      from: currentFrom,
      to: newTo,
    });
    setActiveQuickSelect(null);
    
    // Apply immediately since both dates are now selected
    if (currentFrom <= today && newTo <= today) {
      const newValue = {
        from: currentFrom.toISOString().split('T')[0],
        to: newTo.toISOString().split('T')[0],
      };
      onChange(newValue);
      onClose?.();
    }
  }, [customRange, today, onChange, onClose]);

  // Get disabled dates for start calendar (top)
  const getStartCalendarDisabled = useCallback((date: Date) => {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    
    // Prevent future dates and dates before minDate
    if (checkDate > todayDate || checkDate < minDateOnly) {
      return true;
    }
    
    // If end date is set, disable dates after end date
    if (customRange?.to) {
      const endDateOnly = new Date(
        customRange.to.getFullYear(),
        customRange.to.getMonth(),
        customRange.to.getDate()
      );
      if (checkDate > endDateOnly) {
        return true;
      }
    }
    
    return false;
  }, [customRange, today, minDate]);

  // Get disabled dates for end calendar (bottom)
  const getEndCalendarDisabled = useCallback((date: Date) => {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    
    // Prevent future dates and dates before minDate
    if (checkDate > todayDate || checkDate < minDateOnly) {
      return true;
    }
    
    // If no start date, disable all dates
    if (!customRange?.from) {
      return true;
    }
    
    // Disable dates before start date
    const startDateOnly = new Date(
      customRange.from.getFullYear(),
      customRange.from.getMonth(),
      customRange.from.getDate()
    );
    if (checkDate < startDateOnly) {
      return true;
    }
    
    return false;
  }, [customRange, today, minDate]);

  // Update calendar months when dates are selected
  useEffect(() => {
    if (customRange?.from) {
      const newStartMonth = new Date(customRange.from.getFullYear(), customRange.from.getMonth(), 1);
      setStartCalendarMonth(newStartMonth);
      setEndCalendarMonth(new Date(newStartMonth.getFullYear(), newStartMonth.getMonth() + 1, 1));
    }
  }, [customRange?.from]);

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!value?.from || !value?.to) {
      // No value selected - show "All data" if that's explicitly selected, otherwise placeholder
      if (activeQuickSelect === 'all') {
        return 'All data';
      }
      return placeholder;
    }
    
    // Check if current value matches a quick select
    let matchedQuickSelect: QuickSelectOption | null = null;
    for (const option of QUICK_SELECT_OPTIONS) {
      if (option.value === 'all') continue;
      const quickRange = getQuickSelectRange(option.value);
      if (quickRange && 
          quickRange.from.toISOString().split('T')[0] === value.from &&
          quickRange.to.toISOString().split('T')[0] === value.to) {
        matchedQuickSelect = option.value;
        break;
      }
    }
    
    if (matchedQuickSelect) {
      // Show quick select label
      const option = QUICK_SELECT_OPTIONS.find(opt => opt.value === matchedQuickSelect);
      return option?.label || formatDateRangeDisplay(value.from, value.to);
    }
    
    // Custom range - show formatted dates
    return formatDateRangeDisplay(value.from, value.to);
  }, [value, placeholder, activeQuickSelect]);

  // Format draft display value (shows partial selection while user is choosing)
  const draftDisplayValue = React.useMemo(() => {
    if (customRange?.from && customRange?.to) {
      return formatDateRangeDisplay(
        customRange.from.toISOString().split('T')[0],
        customRange.to.toISOString().split('T')[0]
      );
    }
    if (customRange?.from) {
      return `${formatDateForDisplay(customRange.from)} – Select end date`;
    }
    return null;
  }, [customRange]);

  // Use draft value if user is selecting custom range, otherwise use committed value
  const inputDisplayValue = React.useMemo(() => {
    // If user is actively selecting a custom range (has draft), show draft
    if (customRange && (customRange.from || customRange.to)) {
      return draftDisplayValue || displayValue;
    }
    return displayValue;
  }, [customRange, draftDisplayValue, displayValue]);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Read-only input showing selected range */}
      <div className="relative">
        <input
          readOnly
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white pr-8"
          value={inputDisplayValue}
          placeholder={placeholder}
        />
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white border-0 max-w-[250px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Quick-select buttons */}
      {showQuickSelects && (
        <div className="space-y-0.5">
          <Label className="text-xs font-medium text-gray-700">Quick Select</Label>
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_SELECT_OPTIONS.map((option) => {
                // Calculate selected state from actual value (more reliable than state)
                let isSelected = false;
                if (option.value === 'all') {
                  isSelected = !value?.from || !value?.to;
                } else {
                  const quickRange = getQuickSelectRange(option.value);
                  if (quickRange && value?.from && value?.to) {
                    isSelected = 
                      quickRange.from.toISOString().split('T')[0] === value.from &&
                      quickRange.to.toISOString().split('T')[0] === value.to;
                  }
                }
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleQuickSelect(option.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors border",
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Custom range picker - Two vertical calendars */}
      <div className={showQuickSelects ? "border-t pt-1.5" : ""}>
        <Label className="text-xs font-medium text-gray-700 mb-1 block">Custom range</Label>
        <div>
          <style dangerouslySetInnerHTML={{__html: `
            .date-range-calendar-wrapper .start-calendar .rdp-month::before {
              content: 'Start date';
              display: block;
              font-size: 0.75rem;
              color: rgb(75 85 99);
              font-weight: 500;
              margin-bottom: 0.25rem;
            }
            .date-range-calendar-wrapper .end-calendar .rdp-month::before {
              content: 'End date';
              display: block;
              font-size: 0.75rem;
              color: rgb(75 85 99);
              font-weight: 500;
              margin-bottom: 0.25rem;
              margin-top: 0.375rem;
            }
            .date-range-calendar-wrapper .rdp-day_selected {
              font-weight: normal !important;
            }
          `}} />
          <div className="date-range-calendar-wrapper flex flex-col gap-1.5">
            {/* Start Date Calendar (Top) */}
            <div className="relative start-calendar">
              <Calendar
                mode="single"
                selected={customRange?.from}
                onSelect={handleStartDateSelect}
                fromYear={minDate.getFullYear()}
                toYear={today.getFullYear()}
                month={startCalendarMonth}
                onMonthChange={setStartCalendarMonth}
                toMonth={today}
                captionLayout="dropdown"
                disabled={getStartCalendarDisabled}
                classNames={{
                  nav: "hidden",
                  nav_button: "hidden",
                  nav_button_previous: "hidden",
                  nav_button_next: "hidden",
                  month: "space-y-1",
                  caption: "mb-0.5",
                  day: "font-normal",
                  day_selected: "bg-gray-200 text-gray-900 hover:bg-gray-200 hover:text-gray-900 font-normal !font-normal",
                }}
                className="rounded-lg p-1"
              />
            </div>
            
            {/* End Date Calendar (Bottom) */}
            <div className="relative end-calendar">
              <Calendar
                mode="single"
                selected={customRange?.to}
                onSelect={handleEndDateSelect}
                fromYear={minDate.getFullYear()}
                toYear={today.getFullYear()}
                month={endCalendarMonth}
                onMonthChange={setEndCalendarMonth}
                toMonth={today}
                captionLayout="dropdown"
                disabled={getEndCalendarDisabled}
                classNames={{
                  nav: "hidden",
                  nav_button: "hidden",
                  nav_button_previous: "hidden",
                  nav_button_next: "hidden",
                  month: "space-y-1",
                  caption: "mb-0.5",
                  day: "font-normal",
                  day_selected: "bg-gray-300 text-gray-900 hover:bg-gray-300 hover:text-gray-900 font-normal !font-normal",
                }}
                className="rounded-lg p-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
