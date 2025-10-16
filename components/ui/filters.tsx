import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarPlus,
  CalendarSync,
  Check,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDotDashed,
  CircleEllipsis,
  CircleX,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Tag,
  UserCircle,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Star,
} from "lucide-react";
import { Dispatch, SetStateAction, useRef, useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        // We only have one entry, so we can use entries[0].
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        // Cleanup the observer when the component is unmounted
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <motion.div
      className={cn(className, "overflow-hidden")}
      style={{ height }}
      animate={{ height }}
      transition={{ duration: 0.1, dampping: 0.2, ease: "easeIn" }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

// RetentionOS-specific filter types
export enum FilterType {
  DATE_RANGE = "Date Range",
  CUSTOMER_TYPE = "Customer Type",
  RETENTION_STATUS = "Retention Status",
  REVENUE_TIER = "Revenue Tier",
  ACTIVITY_LEVEL = "Activity Level",
  COHORT_PERIOD = "Cohort Period",
  ORDER_FREQUENCY = "Order Frequency",
  LAST_PURCHASE = "Last Purchase",
}

export enum FilterOperator {
  IS = "is",
  IS_NOT = "is not",
  IS_ANY_OF = "is any of",
  INCLUDE = "include",
  DO_NOT_INCLUDE = "do not include",
  INCLUDE_ALL_OF = "include all of",
  INCLUDE_ANY_OF = "include any of",
  EXCLUDE_ALL_OF = "exclude all of",
  EXCLUDE_IF_ANY_OF = "exclude if any of",
  BEFORE = "before",
  AFTER = "after",
  BETWEEN = "between",
}

export enum CustomerType {
  NEW_CUSTOMER = "New Customer",
  REPEAT_CUSTOMER = "Repeat Customer",
  ONE_TIME_BUYER = "One-Time Buyer",
  LOYAL_CUSTOMER = "Loyal Customer",
  VIP_CUSTOMER = "VIP Customer",
}

export enum RetentionStatus {
  ACTIVE = "Active",
  AT_RISK = "At Risk",
  DORMANT = "Dormant",
  CHURNED = "Churned",
  REACTIVATED = "Reactivated",
}

export enum RevenueTier {
  HIGH_VALUE = "High Value ($500+)",
  MEDIUM_VALUE = "Medium Value ($100-500)",
  LOW_VALUE = "Low Value ($0-100)",
  PREMIUM = "Premium ($1000+)",
}

export enum ActivityLevel {
  VERY_ACTIVE = "Very Active",
  ACTIVE = "Active",
  MODERATE = "Moderate",
  LOW = "Low",
  INACTIVE = "Inactive",
}

export enum CohortPeriod {
  LAST_30_DAYS = "Last 30 days",
  LAST_90_DAYS = "Last 90 days",
  LAST_6_MONTHS = "Last 6 months",
  LAST_YEAR = "Last year",
  ALL_TIME = "All time",
}

export enum OrderFrequency {
  FREQUENT = "Frequent (5+ orders)",
  REGULAR = "Regular (2-4 orders)",
  OCCASIONAL = "Occasional (1-2 orders)",
  ONE_TIME = "One-time buyer",
}

export enum LastPurchase {
  LAST_7_DAYS = "Last 7 days",
  LAST_30_DAYS = "Last 30 days",
  LAST_90_DAYS = "Last 90 days",
  LAST_6_MONTHS = "Last 6 months",
  OVER_6_MONTHS = "Over 6 months ago",
}

export type FilterOption = {
  name: FilterType | CustomerType | RetentionStatus | RevenueTier | ActivityLevel | CohortPeriod | OrderFrequency | LastPurchase;
  icon: React.ReactNode | undefined;
  label?: string;
};

export type Filter = {
  id: string;
  type: FilterType;
  operator: FilterOperator;
  value: string[];
};

const FilterIcon = ({
  type,
}: {
  type: FilterType | CustomerType | RetentionStatus | RevenueTier | ActivityLevel | CohortPeriod | OrderFrequency | LastPurchase;
}) => {
  switch (type) {
    case FilterType.DATE_RANGE:
      return <Calendar className="size-3.5" />;
    case FilterType.CUSTOMER_TYPE:
      return <Users className="size-3.5" />;
    case FilterType.RETENTION_STATUS:
      return <TrendingUp className="size-3.5" />;
    case FilterType.REVENUE_TIER:
      return <DollarSign className="size-3.5" />;
    case FilterType.ACTIVITY_LEVEL:
      return <Clock className="size-3.5" />;
    case FilterType.COHORT_PERIOD:
      return <CalendarPlus className="size-3.5" />;
    case FilterType.ORDER_FREQUENCY:
      return <TrendingUp className="size-3.5" />;
    case FilterType.LAST_PURCHASE:
      return <CalendarSync className="size-3.5" />;
    
    // Customer Types
    case CustomerType.NEW_CUSTOMER:
      return <Circle className="size-3.5 text-green-500" />;
    case CustomerType.REPEAT_CUSTOMER:
      return <CircleCheck className="size-3.5 text-blue-500" />;
    case CustomerType.ONE_TIME_BUYER:
      return <CircleDashed className="size-3.5 text-yellow-500" />;
    case CustomerType.LOYAL_CUSTOMER:
      return <Star className="size-3.5 text-purple-500" />;
    case CustomerType.VIP_CUSTOMER:
      return <CircleAlert className="size-3.5 text-orange-500" />;
    
    // Retention Status
    case RetentionStatus.ACTIVE:
      return <CircleCheck className="size-3.5 text-green-500" />;
    case RetentionStatus.AT_RISK:
      return <CircleAlert className="size-3.5 text-yellow-500" />;
    case RetentionStatus.DORMANT:
      return <CircleDashed className="size-3.5 text-gray-500" />;
    case RetentionStatus.CHURNED:
      return <CircleX className="size-3.5 text-red-500" />;
    case RetentionStatus.REACTIVATED:
      return <CircleEllipsis className="size-3.5 text-blue-500" />;
    
    // Revenue Tiers
    case RevenueTier.HIGH_VALUE:
      return <DollarSign className="size-3.5 text-green-500" />;
    case RevenueTier.MEDIUM_VALUE:
      return <DollarSign className="size-3.5 text-blue-500" />;
    case RevenueTier.LOW_VALUE:
      return <DollarSign className="size-3.5 text-gray-500" />;
    case RevenueTier.PREMIUM:
      return <DollarSign className="size-3.5 text-purple-500" />;
    
    // Activity Levels
    case ActivityLevel.VERY_ACTIVE:
      return <SignalHigh className="size-3.5 text-green-500" />;
    case ActivityLevel.ACTIVE:
      return <SignalMedium className="size-3.5 text-blue-500" />;
    case ActivityLevel.MODERATE:
      return <SignalMedium className="size-3.5 text-yellow-500" />;
    case ActivityLevel.LOW:
      return <SignalLow className="size-3.5 text-orange-500" />;
    case ActivityLevel.INACTIVE:
      return <SignalLow className="size-3.5 text-red-500" />;
    
    // Order Frequency
    case OrderFrequency.FREQUENT:
      return <TrendingUp className="size-3.5 text-green-500" />;
    case OrderFrequency.REGULAR:
      return <TrendingUp className="size-3.5 text-blue-500" />;
    case OrderFrequency.OCCASIONAL:
      return <TrendingUp className="size-3.5 text-yellow-500" />;
    case OrderFrequency.ONE_TIME:
      return <TrendingDown className="size-3.5 text-gray-500" />;
    
    default:
      return <Tag className="size-3.5" />;
  }
};

export const filterViewOptions: FilterOption[][] = [
  [
    {
      name: FilterType.DATE_RANGE,
      icon: <FilterIcon type={FilterType.DATE_RANGE} />,
    },
    {
      name: FilterType.CUSTOMER_TYPE,
      icon: <FilterIcon type={FilterType.CUSTOMER_TYPE} />,
    },
    {
      name: FilterType.RETENTION_STATUS,
      icon: <FilterIcon type={FilterType.RETENTION_STATUS} />,
    },
    {
      name: FilterType.REVENUE_TIER,
      icon: <FilterIcon type={FilterType.REVENUE_TIER} />,
    },
  ],
  [
    {
      name: FilterType.ACTIVITY_LEVEL,
      icon: <FilterIcon type={FilterType.ACTIVITY_LEVEL} />,
    },
    {
      name: FilterType.COHORT_PERIOD,
      icon: <FilterIcon type={FilterType.COHORT_PERIOD} />,
    },
    {
      name: FilterType.ORDER_FREQUENCY,
      icon: <FilterIcon type={FilterType.ORDER_FREQUENCY} />,
    },
    {
      name: FilterType.LAST_PURCHASE,
      icon: <FilterIcon type={FilterType.LAST_PURCHASE} />,
    },
  ],
];

export const customerTypeFilterOptions: FilterOption[] = Object.values(CustomerType).map(
  (type) => ({
    name: type,
    icon: <FilterIcon type={type} />,
  })
);

export const retentionStatusFilterOptions: FilterOption[] = Object.values(RetentionStatus).map(
  (status) => ({
    name: status,
    icon: <FilterIcon type={status} />,
  })
);

export const revenueTierFilterOptions: FilterOption[] = Object.values(RevenueTier).map(
  (tier) => ({
    name: tier,
    icon: <FilterIcon type={tier} />,
  })
);

export const activityLevelFilterOptions: FilterOption[] = Object.values(ActivityLevel).map(
  (level) => ({
    name: level,
    icon: <FilterIcon type={level} />,
  })
);

export const cohortPeriodFilterOptions: FilterOption[] = Object.values(CohortPeriod).map(
  (period) => ({
    name: period,
    icon: <FilterIcon type={period} />,
  })
);

export const orderFrequencyFilterOptions: FilterOption[] = Object.values(OrderFrequency).map(
  (frequency) => ({
    name: frequency,
    icon: <FilterIcon type={frequency} />,
  })
);

export const lastPurchaseFilterOptions: FilterOption[] = Object.values(LastPurchase).map(
  (purchase) => ({
    name: purchase,
    icon: <FilterIcon type={purchase} />,
  })
);

export const filterViewToFilterOptions: Record<FilterType, FilterOption[]> = {
  [FilterType.DATE_RANGE]: cohortPeriodFilterOptions,
  [FilterType.CUSTOMER_TYPE]: customerTypeFilterOptions,
  [FilterType.RETENTION_STATUS]: retentionStatusFilterOptions,
  [FilterType.REVENUE_TIER]: revenueTierFilterOptions,
  [FilterType.ACTIVITY_LEVEL]: activityLevelFilterOptions,
  [FilterType.COHORT_PERIOD]: cohortPeriodFilterOptions,
  [FilterType.ORDER_FREQUENCY]: orderFrequencyFilterOptions,
  [FilterType.LAST_PURCHASE]: lastPurchaseFilterOptions,
};

const filterOperators = ({
  filterType,
  filterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
}) => {
  switch (filterType) {
    case FilterType.DATE_RANGE:
    case FilterType.COHORT_PERIOD:
    case FilterType.LAST_PURCHASE:
      return [FilterOperator.IS, FilterOperator.IS_NOT, FilterOperator.BETWEEN];
    case FilterType.CUSTOMER_TYPE:
    case FilterType.RETENTION_STATUS:
    case FilterType.REVENUE_TIER:
    case FilterType.ACTIVITY_LEVEL:
    case FilterType.ORDER_FREQUENCY:
      if (Array.isArray(filterValues) && filterValues.length > 1) {
        return [FilterOperator.IS_ANY_OF, FilterOperator.IS_NOT];
      } else {
        return [FilterOperator.IS, FilterOperator.IS_NOT];
      }
    default:
      return [FilterOperator.IS, FilterOperator.IS_NOT];
  }
};

const FilterOperatorDropdown = ({
  filterType,
  operator,
  filterValues,
  setOperator,
}: {
  filterType: FilterType;
  operator: FilterOperator;
  filterValues: string[];
  setOperator: (operator: FilterOperator) => void;
}) => {
  const operators = filterOperators({ filterType, filterValues });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-muted hover:bg-muted/50 px-1.5 py-1 text-muted-foreground hover:text-primary transition shrink-0">
        {operator}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((operator) => (
          <DropdownMenuItem
            key={operator}
            onClick={() => setOperator(operator)}
          >
            {operator}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FilterValueCombobox = ({
  filterType,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  const nonSelectedFilterValues = filterViewToFilterOptions[filterType]?.filter(
    (filter) => !filterValues.includes(filter.name)
  );
  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => {
            setCommandInput("");
          }, 200);
        }
      }}
    >
      <PopoverTrigger
        className="rounded-none px-1.5 py-1 bg-muted hover:bg-muted/50 transition
  text-muted-foreground hover:text-primary shrink-0"
      >
        <div className="flex gap-1.5 items-center">
          {filterType !== FilterType.REVENUE_TIER && (
            <div
              className={cn(
                "flex items-center flex-row",
                filterType === FilterType.CUSTOMER_TYPE ? "-space-x-1" : "-space-x-1.5"
              )}
            >
              <AnimatePresence mode="popLayout">
                {filterValues?.slice(0, 3).map((value) => (
                  <motion.div
                    key={value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FilterIcon type={value as FilterType} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {filterValues?.length === 1
            ? filterValues?.[0]
            : `${filterValues?.length} selected`}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder={filterType}
              className="h-9"
              value={commandInput}
              onInputCapture={(e) => {
                setCommandInput(e.currentTarget.value);
              }}
              ref={commandInputRef}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filterValues.map((value) => (
                  <CommandItem
                    key={value}
                    className="group flex gap-2 items-center"
                    onSelect={() => {
                      setFilterValues(filterValues.filter((v) => v !== value));
                      setTimeout(() => {
                        setCommandInput("");
                      }, 200);
                      setOpen(false);
                    }}
                  >
                    <Checkbox checked={true} />
                    <FilterIcon type={value as FilterType} />
                    {value}
                  </CommandItem>
                ))}
              </CommandGroup>
              {nonSelectedFilterValues?.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {nonSelectedFilterValues.map((filter: FilterOption) => (
                      <CommandItem
                        className="group flex gap-2 items-center"
                        key={filter.name}
                        value={filter.name}
                        onSelect={(currentValue: string) => {
                          setFilterValues([...filterValues, currentValue]);
                          setTimeout(() => {
                            setCommandInput("");
                          }, 200);
                          setOpen(false);
                        }}
                      >
                        <Checkbox
                          checked={false}
                          className="opacity-0 group-data-[selected=true]:opacity-100"
                        />
                        {filter.icon}
                        <span className="text-accent-foreground">
                          {filter.name}
                        </span>
                        {filter.label && (
                          <span className="text-muted-foreground text-xs ml-auto">
                            {filter.label}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

const FilterValueDateCombobox = ({
  filterType,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => {
            setCommandInput("");
          }, 200);
        }
      }}
    >
      <PopoverTrigger
        className="rounded-none px-1.5 py-1 bg-muted hover:bg-muted/50 transition
  text-muted-foreground hover:text-primary shrink-0"
      >
        {filterValues?.[0]}
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder={filterType}
              className="h-9"
              value={commandInput}
              onInputCapture={(e) => {
                setCommandInput(e.currentTarget.value);
              }}
              ref={commandInputRef}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filterViewToFilterOptions[filterType].map(
                  (filter: FilterOption) => (
                    <CommandItem
                      className="group flex gap-2 items-center"
                      key={filter.name}
                      value={filter.name}
                      onSelect={(currentValue: string) => {
                        setFilterValues([currentValue]);
                        setTimeout(() => {
                          setCommandInput("");
                        }, 200);
                        setOpen(false);
                      }}
                    >
                      <span className="text-accent-foreground">
                        {filter.name}
                      </span>
                      <Check
                        className={cn(
                          "ml-auto",
                          filterValues.includes(filter.name)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  )
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

export default function Filters({
  filters,
  setFilters,
}: {
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
}) {
  return (
    <div className="flex gap-2">
      {filters
        .filter((filter) => filter.value?.length > 0)
        .map((filter) => (
          <div key={filter.id} className="flex gap-[1px] items-center text-xs">
            <div className="flex gap-1.5 shrink-0 rounded-l bg-muted px-1.5 py-1 items-center">
              <FilterIcon type={filter.type} />
              {filter.type}
            </div>
            <FilterOperatorDropdown
              filterType={filter.type}
              operator={filter.operator}
              filterValues={filter.value}
              setOperator={(operator) => {
                setFilters((prev) =>
                  prev.map((f) => (f.id === filter.id ? { ...f, operator } : f))
                );
              }}
            />
            {filter.type === FilterType.DATE_RANGE ||
            filter.type === FilterType.COHORT_PERIOD ||
            filter.type === FilterType.LAST_PURCHASE ? (
              <FilterValueDateCombobox
                filterType={filter.type}
                filterValues={filter.value}
                setFilterValues={(filterValues) => {
                  setFilters((prev) =>
                    prev.map((f) =>
                      f.id === filter.id ? { ...f, value: filterValues } : f
                    )
                  );
                }}
              />
            ) : (
              <FilterValueCombobox
                filterType={filter.type}
                filterValues={filter.value}
                setFilterValues={(filterValues) => {
                  setFilters((prev) =>
                    prev.map((f) =>
                      f.id === filter.id ? { ...f, value: filterValues } : f
                    )
                  );
                }}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFilters((prev) => prev.filter((f) => f.id !== filter.id));
              }}
              className="bg-muted rounded-l-none rounded-r-sm h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted/50 transition shrink-0"
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
    </div>
  );
}
