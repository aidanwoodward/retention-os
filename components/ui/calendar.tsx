"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"

// Custom locale with 3-character month and day abbreviations for react-day-picker v9
const customLocale = {
  code: "en",
  localize: {
    month: (n: number) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return monthNames[n];
    },
    day: (n: number) => {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return dayNames[n];
    },
    ordinalNumber: () => "",
    era: () => "",
    quarter: () => "",
    dayPeriod: () => "",
  },
  formatLong: {
    date: () => "mm/dd/yyyy",
  },
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1,
  },
} as unknown as Parameters<typeof DayPicker>[0]['locale'];

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const defaultClassNames = {
  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
  month: "space-y-4",
  caption: "flex justify-center pt-1 relative items-center",
  caption_label: "sr-only", // Hide caption label when using dropdowns
  caption_dropdowns: "flex justify-center gap-1",
  dropdown: "h-8 rounded-md border border-input bg-background px-2 text-sm",
  dropdown_month: "h-8 rounded-md border border-input bg-background px-2 text-sm",
  dropdown_year: "h-8 rounded-md border border-input bg-background px-2 text-sm",
  dropdown_icon: "ml-2 h-4 w-4",
  nav: "space-x-1 flex items-center",
  nav_button: cn(
    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
  ),
  nav_button_previous: "absolute left-1",
  nav_button_next: "absolute right-1",
  table: "w-full border-collapse space-y-1",
  head_row: "flex",
  head_cell:
    "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
  row: "flex w-full mt-2",
  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
  day: cn(
    "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
  ),
  day_range_end: "day-range-end",
  day_selected:
    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
  day_today: "bg-accent text-accent-foreground",
  day_outside:
    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
  day_disabled: "text-muted-foreground opacity-50",
  day_range_middle:
    "aria-selected:bg-accent aria-selected:text-accent-foreground",
  day_hidden: "invisible",
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      locale={customLocale}
      formatters={{
        formatMonthCaption: (month) => {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return monthNames[month.getMonth()];
        },
        formatWeekdayName: (date) => {
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          return dayNames[date.getDay()];
        },
      }}
      classNames={{
        ...defaultClassNames,
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

