"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FilterConfig, FilterValue, NumberCondition, NumberFilterValue, DateRangeFilterValue } from "@/lib/filters/types";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

interface FilterChipProps {
  config: FilterConfig;
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  onClear: () => void;
}

// Inline Date Range Picker component using Calendar with range mode
interface InlineDateRangePickerProps {
  value?: { from: Date; to: Date };
  onValueChange?: (range: { from: Date; to: Date } | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  onRangeChange?: (range: DateRange | undefined) => void;
}

const InlineDateRangePicker = React.forwardRef<
  { getRange: () => DateRange | undefined },
  InlineDateRangePickerProps
>(({ 
  value, 
  onValueChange: _onValueChange, 
  minDate = new Date(2010, 0, 1),
  maxDate = new Date(2030, 11, 31),
  placeholder = "Select date range",
  onRangeChange
}, ref) => {
  const [range, setRange] = useState<DateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined
  );

  useEffect(() => {
    if (value) {
      setRange({ from: value.from, to: value.to });
    } else {
      setRange(undefined);
    }
  }, [value]);

  // Expose getRange method via ref
  React.useImperativeHandle(ref, () => ({
    getRange: () => range
  }));

  const formatDateDisplay = () => {
    if (range?.from && range?.to) {
      return `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()}`;
    }
    if (range?.from) {
      return `${range.from.toLocaleDateString()} – Select end date`;
    }
    return placeholder;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Date Display Input */}
      <input
        readOnly
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        value={formatDateDisplay()}
        placeholder={placeholder}
      />

      {/* Calendar with Range Mode */}
      <Calendar
        mode="range"
        selected={range}
        onSelect={(next) => {
          setRange(next);
          onRangeChange?.(next);
          // Don't call onValueChange here - only on Apply button
        }}
        numberOfMonths={2}
        disabled={(date) => {
          return date < minDate || date > maxDate;
        }}
        className="rounded-lg"
      />
    </div>
  );
});

InlineDateRangePicker.displayName = "InlineDateRangePicker";

export function FilterChip({ config, value, onChange, onClear }: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<FilterValue>(value);
  const chipRef = useRef<HTMLButtonElement>(null);

  const isActive = value !== undefined && 
    (Array.isArray(value) ? value.length > 0 : 
     typeof value === 'object' && value !== null ? 
       ('condition' in value && (value as NumberFilterValue).value?.[0] !== undefined) ||
       ('from' in value && ((value as DateRangeFilterValue).from !== '' || (value as DateRangeFilterValue).to !== '')) :
       value !== '');

  // Reset pending value when popover opens
  useEffect(() => {
    if (open) {
      setPendingValue(value);
    }
  }, [open, value]);

  // For date-range, we need to get the current range from the picker
  const dateRangeRef = useRef<{ getRange: () => DateRange | undefined } | null>(null);

  const handleApply = () => {
    if (config.type === 'date-range' && dateRangeRef.current) {
      const range = dateRangeRef.current.getRange();
      if (range?.from && range?.to) {
        setPendingValue({
          from: range.from.toISOString().split('T')[0],
          to: range.to.toISOString().split('T')[0],
        });
        onChange({
          from: range.from.toISOString().split('T')[0],
          to: range.to.toISOString().split('T')[0],
        });
      } else {
        setPendingValue({ from: '', to: '' });
        onChange(undefined);
      }
    } else {
      onChange(pendingValue);
    }
    setOpen(false);
  };

  const handleReset = () => {
    setPendingValue(undefined);
    onChange(undefined);
    setOpen(false);
  };

  // Handle ESC key to close popover
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && config.type === 'date-range') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, config.type]);

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  };

  const getPreviewText = (): string => {
    if (!isActive) return config.title;
    
    if (config.formatter) {
      const formatted = config.formatter(value);
      if (formatted) {
        return `${config.title}: ${formatted}`;
      }
    }

    if (Array.isArray(value) && value.length > 0) {
      if (value.length > 2) {
        const labels = value.slice(0, 2).map(val => {
          const option = config.options?.find(opt => opt.value === val);
          return option?.label || val;
        });
        return `${config.title}: ${labels.join(', ')} and ${value.length - 2} more`;
      }
      const labels = value.map(val => {
        const option = config.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      return `${config.title}: ${labels.join(', ')}`;
    }

    if (typeof value === 'string' && value) {
      const option = config.options?.find(opt => opt.value === value);
      return `${config.title}: ${option?.label || value}`;
    }

    if (typeof value === 'object' && value !== null && 'from' in value) {
      const dateRange = value as DateRangeFilterValue;
      if (dateRange.from && dateRange.to) {
        const fromDate = new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const toDate = new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${config.title}: ${fromDate} - ${toDate}`;
      } else if (dateRange.from) {
        const fromDate = new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${config.title}: From ${fromDate}`;
      } else if (dateRange.to) {
        const toDate = new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${config.title}: Until ${toDate}`;
      }
    }

    return config.title;
  };

  const renderFilterContent = () => {
    switch (config.type) {
      case 'select':
        return (
          <div className="space-y-1">
            {config.options?.map((option) => {
              const isSelected = pendingValue === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    const newValue = isSelected ? undefined : option.value;
                    setPendingValue(newValue);
                    onChange(newValue);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );

      case 'checkbox':
        const currentArray = Array.isArray(pendingValue) ? pendingValue : [];
        const allOptions = config.options || [];
        const allSelected = allOptions.length > 0 && allOptions.every(opt => currentArray.includes(opt.value));
        const someSelected = currentArray.length > 0 && !allSelected;
        
        return (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {/* Select All option */}
            <div className="flex items-center space-x-2 px-2 py-1.5 border-b pb-2 mb-1">
              <Checkbox
                id={`${config.id}-select-all`}
                checked={allSelected}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Select all options
                    setPendingValue(allOptions.map(opt => opt.value));
                  } else {
                    // Deselect all
                    setPendingValue(undefined);
                  }
                }}
                className={someSelected ? "data-[state=checked]:bg-primary data-[state=checked]:border-primary" : ""}
                ref={(el) => {
                  if (el && 'indeterminate' in el) {
                    (el as HTMLInputElement).indeterminate = someSelected;
                  }
                }}
              />
              <Label
                htmlFor={`${config.id}-select-all`}
                className="text-sm font-medium cursor-pointer flex-1"
              >
                Select all
              </Label>
            </div>
            
            {/* Individual options */}
            {allOptions.map((option) => {
              const isChecked = currentArray.includes(option.value);
              return (
                <div key={option.value} className="flex items-center space-x-2 px-2 py-1.5">
                  <Checkbox
                    id={`${config.id}-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const newArray = checked
                        ? [...currentArray, option.value]
                        : currentArray.filter(v => v !== option.value);
                      setPendingValue(newArray.length > 0 ? newArray : undefined);
                    }}
                  />
                  <Label
                    htmlFor={`${config.id}-${option.value}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        );

      case 'number':
        const numValue = (pendingValue && typeof pendingValue === 'object' && 'condition' in pendingValue && 'value' in pendingValue
          ? pendingValue as NumberFilterValue
          : {
              condition: 'equals' as NumberCondition,
              value: [0, 0] as [number, number],
            });
        const isBetween = numValue.condition === 'is-between';

        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Condition</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {config.numberOptions?.find(opt => opt.value === numValue.condition)?.label || 'Equals'}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {config.numberOptions?.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        setPendingValue({
                          condition: option.value as NumberCondition,
                          value: numValue.value,
                        });
                      }}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${config.id}-value1`} className="text-sm font-medium">
                {isBetween ? 'From' : 'Value'}
              </Label>
              <Input
                id={`${config.id}-value1`}
                type="number"
                value={numValue.value[0] || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setPendingValue({
                    condition: numValue.condition,
                    value: isBetween ? [val, numValue.value[1] || 0] : [val, val],
                  });
                }}
                placeholder="0"
              />
            </div>

            {isBetween && (
              <div className="space-y-2">
                <Label htmlFor={`${config.id}-value2`} className="text-sm font-medium">
                  To
                </Label>
                <Input
                  id={`${config.id}-value2`}
                  type="number"
                  value={numValue.value[1] || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPendingValue({
                      condition: numValue.condition,
                      value: [numValue.value[0] || 0, val],
                    });
                  }}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        );

      case 'date-range':
        const dateRangeValue = (pendingValue && typeof pendingValue === 'object' && 'from' in pendingValue
          ? pendingValue as DateRangeFilterValue
          : { from: '', to: '' });

        return (
          <InlineDateRangePicker
            ref={dateRangeRef}
            value={dateRangeValue.from && dateRangeValue.to ? {
              from: new Date(dateRangeValue.from),
              to: new Date(dateRangeValue.to),
            } : undefined}
            minDate={new Date(2010, 0, 1)}
            maxDate={new Date(2030, 11, 31)}
            placeholder="Select date range"
          />
        );

      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={config.type === 'date-range'}>
      <PopoverTrigger asChild>
        <button
          ref={chipRef}
          onClick={(e) => {
            // If clicking the clear area when active, clear instead of opening
            if (isActive && (e.target as HTMLElement).closest('[data-clear-area]')) {
              e.preventDefault();
              handleClearClick(e);
              return;
            }
          }}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-normal transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            isActive
              ? "border border-solid bg-background text-foreground shadow-xs"
              : "border border-dashed border-muted-foreground/40 text-muted-foreground bg-transparent hover:border-muted-foreground/60 hover:text-foreground/80"
          )}
          aria-expanded={open}
          aria-controls={`filter-chip-${config.id}`}
        >
          <span className="flex-1 text-left whitespace-nowrap">{getPreviewText()}</span>
          {isActive ? (
            <span
              data-clear-area
              className="flex-shrink-0 ml-1 hover:opacity-70 transition-opacity"
              onClick={handleClearClick}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
          )}
        </button>
      </PopoverTrigger>
      {config.type === 'date-range' && open && (
        <PopoverPrimitive.Portal>
          <div 
            className="fixed inset-0 bg-black/10 z-[40] pointer-events-auto"
            onClick={(e) => {
              // Only close if clicking directly on scrim, not on calendar
              if (e.target === e.currentTarget) {
                setOpen(false);
              }
            }}
            aria-hidden="true"
          />
        </PopoverPrimitive.Portal>
      )}
      <PopoverContent
        id={`filter-chip-${config.id}`}
        className={cn(
          config.type === 'date-range' 
            ? "w-auto p-4 bg-white shadow-lg border border-gray-200 rounded-xl z-[50] pointer-events-auto" 
            : "w-80 p-4"
        )}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={config.type === 'date-range' ? { 
          backgroundColor: 'white', 
          opacity: 1,
          backdropFilter: 'none',
          zIndex: 50,
          pointerEvents: 'auto'
        } : undefined}
      >
        {config.type === 'date-range' ? (
          <div className="flex flex-col bg-white rounded-xl max-h-[80vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-sm font-semibold mb-4">Filter by {config.title}</h3>
            </div>
            <div className="px-4 pb-2 border-b border-gray-200">
              {renderFilterContent()}
            </div>
            <div className="flex items-center justify-end gap-2 px-4 pt-4 pb-4 border-t border-gray-200 mt-auto">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Filter by {config.title}</h3>
            </div>
            <div>{renderFilterContent()}</div>
            {config.type !== 'select' && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

