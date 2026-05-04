/**
 * Page-level filter configurations
 */

import { FilterConfig } from './types';

/**
 * Revenue Cohorts filter configuration
 */
const geographyFilter: FilterConfig = {
  id: 'geography',
  title: 'Geography',
  type: 'checkbox',
  options: [
    { label: 'UK', value: 'uk' },
    { label: 'Germany', value: 'germany' },
    { label: 'France', value: 'france' },
    { label: 'Spain', value: 'spain' },
    { label: 'EMEA', value: 'emea' },
    { label: 'AMER', value: 'amer' },
    { label: 'APAC', value: 'apac' },
  ],
  formatter: (v) => {
    if (Array.isArray(v) && v.length > 0) {
      const labels = v.map(val => {
        const option = geographyFilter.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      if (labels.length > 2) {
        return `${labels[0]} and ${labels.length - 1} more`;
      }
      return labels.join(', ');
    }
    return '';
  },
};

const cohortTypeFilter: FilterConfig = {
  id: 'cohortType',
  title: 'Cohort Type',
  type: 'select',
  options: [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Annual', value: 'annual' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = cohortTypeFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

const customerSegmentFilter: FilterConfig = {
  id: 'customerSegment',
  title: 'Customer Segment',
  type: 'checkbox',
  options: [
    { label: 'VIP', value: 'vip' },
    { label: 'High Value', value: 'high-value' },
    { label: 'Medium Value', value: 'medium-value' },
    { label: 'Low Value', value: 'low-value' },
    { label: 'New Customers', value: 'new' },
    { label: 'Returning Customers', value: 'returning' },
  ],
  formatter: (v) => {
    if (Array.isArray(v) && v.length > 0) {
      const labels = v.map(val => {
        const option = customerSegmentFilter.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      if (labels.length > 2) {
        return `${labels[0]} and ${labels.length - 1} more`;
      }
      return labels.join(', ');
    }
    return '';
  },
};

const productCategoryFilter: FilterConfig = {
  id: 'productCategory',
  title: 'Product Category',
  type: 'checkbox',
  options: [
    { label: 'Electronics', value: 'electronics' },
    { label: 'Apparel', value: 'apparel' },
    { label: 'Home Goods', value: 'home' },
    { label: 'Beauty', value: 'beauty' },
    { label: 'Sports', value: 'sports' },
  ],
  formatter: (v) => {
    if (Array.isArray(v) && v.length > 0) {
      const labels = v.map(val => {
        const option = productCategoryFilter.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      if (labels.length > 2) {
        return `${labels[0]} and ${labels.length - 1} more`;
      }
      return labels.join(', ');
    }
    return '';
  },
};

const customerTypeFilter: FilterConfig = {
  id: 'customerType',
  title: 'Customer Type',
  type: 'checkbox',
  options: [
    { label: 'New', value: 'new' },
    { label: 'Returning', value: 'returning' },
    { label: 'VIP', value: 'vip' },
    { label: 'At-Risk', value: 'at-risk' },
  ],
  formatter: (v) => {
    if (Array.isArray(v) && v.length > 0) {
      const labels = v.map(val => {
        const option = customerTypeFilter.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      if (labels.length > 2) {
        return `${labels[0]} and ${labels.length - 1} more`;
      }
      return labels.join(', ');
    }
    return '';
  },
};

const dateRangeFilter: FilterConfig = {
  id: 'dateRange',
  title: 'Date Range',
  type: 'date-range',
  tooltip: 'Filters cohorts by customer start date',
  formatter: (v) => {
    if (typeof v === 'object' && v !== null && 'from' in v) {
      const dateRange = v as { from: string; to: string };
      if (dateRange.from && dateRange.to) {
        const fromDate = new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const toDate = new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${fromDate} - ${toDate}`;
      } else if (dateRange.from) {
        const fromDate = new Date(dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `From ${fromDate}`;
      } else if (dateRange.to) {
        const toDate = new Date(dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `Until ${toDate}`;
      }
    }
    return '';
  },
};

// Country filter (countries only, no regions)
const countryFilter: FilterConfig = {
  id: 'country',
  title: 'Country',
  type: 'checkbox',
  options: [
    { label: 'UK', value: 'uk' },
    { label: 'Germany', value: 'germany' },
    { label: 'France', value: 'france' },
    { label: 'Spain', value: 'spain' },
  ],
  formatter: (v) => {
    if (Array.isArray(v) && v.length > 0) {
      const labels = v.map(val => {
        const option = countryFilter.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      if (labels.length > 2) {
        return `${labels[0]} and ${labels.length - 1} more`;
      }
      return labels.join(', ');
    }
    return '';
  },
};

export const revenueCohortsFilters: FilterConfig[] = [
  cohortTypeFilter,
  dateRangeFilter,
  countryFilter,
];

export const revenueCohortsSearch = {
  placeholder: 'Search by owner…',
  param: 'q',
};

/**
 * Customers List filter configuration
 */
const timePeriodFilter: FilterConfig = {
  id: 'timePeriod',
  title: 'Time Period',
  type: 'select',
  options: [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'Last year', value: '1y' },
    { label: 'All time', value: 'all' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = timePeriodFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

const valueSegmentFilter: FilterConfig = {
  id: 'valueSegment',
  title: 'Value Segment',
  type: 'select',
  options: [
    { label: 'All Value Segments', value: 'all' },
    { label: 'VIP', value: 'vip' },
    { label: 'High Value', value: 'high' },
    { label: 'Medium Value', value: 'medium' },
    { label: 'Low Value', value: 'low' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = valueSegmentFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

export const customersListFilters: FilterConfig[] = [
  customerTypeFilter,
  valueSegmentFilter,
  timePeriodFilter,
];

export const customersListSearch = {
  placeholder: 'Search customers…',
  param: 'q',
};

/**
 * Customer Segments filter configuration
 */
const segmentTypeFilter: FilterConfig = {
  id: 'segmentType',
  title: 'Segment Type',
  type: 'checkbox',
  options: [
    { label: 'Value Segments', value: 'value' },
    { label: 'Activity Segments', value: 'activity' },
    { label: 'Frequency Segments', value: 'frequency' },
    { label: 'AOV Segments', value: 'aov' },
  ],
  formatter: (v) => {
    if (Array.isArray(v) && v.length > 0) {
      const labels = v.map(val => {
        const option = segmentTypeFilter.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      if (labels.length > 2) {
        return `${labels[0]} and ${labels.length - 1} more`;
      }
      return labels.join(', ');
    }
    return '';
  },
};

const performanceLevelFilter: FilterConfig = {
  id: 'performance',
  title: 'Performance Level',
  type: 'select',
  options: [
    { label: 'All Performance Levels', value: 'all' },
    { label: 'High Performance (>80% retention)', value: 'high' },
    { label: 'Medium Performance (50-80% retention)', value: 'medium' },
    { label: 'Low Performance (<50% retention)', value: 'low' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = performanceLevelFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

export const customerSegmentsFilters: FilterConfig[] = [
  segmentTypeFilter,
  performanceLevelFilter,
  timePeriodFilter,
];

export const customerSegmentsSearch = {
  placeholder: 'Search segments…',
  param: 'q',
};

/**
 * Products Cross-sell filter configuration
 */
const crossSellRateFilter: FilterConfig = {
  id: 'crossSellRate',
  title: 'Cross-sell Rate',
  type: 'select',
  options: [
    { label: 'All Cross-sell Rates', value: 'all' },
    { label: 'High (>20%)', value: 'high' },
    { label: 'Medium (10-20%)', value: 'medium' },
    { label: 'Low (<10%)', value: 'low' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = crossSellRateFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

export const productsCrossSellFilters: FilterConfig[] = [
  productCategoryFilter,
  crossSellRateFilter,
  timePeriodFilter,
];

export const productsCrossSellSearch = {
  placeholder: 'Search products…',
  param: 'q',
};

/**
 * Products Performance filter configuration
 */
const productPerformanceLevelFilter: FilterConfig = {
  id: 'performance',
  title: 'Performance Level',
  type: 'select',
  options: [
    { label: 'All Performance Levels', value: 'all' },
    { label: 'High Performance (>$10k revenue)', value: 'high' },
    { label: 'Medium Performance ($1k-$10k revenue)', value: 'medium' },
    { label: 'Low Performance (<$1k revenue)', value: 'low' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = productPerformanceLevelFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

export const productsPerformanceFilters: FilterConfig[] = [
  productCategoryFilter,
  productPerformanceLevelFilter,
  timePeriodFilter,
];

export const productsPerformanceSearch = {
  placeholder: 'Search products…',
  param: 'q',
};

/**
 * Products Replenishment filter configuration
 */
const riskLevelFilter: FilterConfig = {
  id: 'riskLevel',
  title: 'Risk Level',
  type: 'select',
  options: [
    { label: 'All Risk Levels', value: 'all' },
    { label: 'High Risk (>80%)', value: 'high' },
    { label: 'Medium Risk (40-80%)', value: 'medium' },
    { label: 'Low Risk (<40%)', value: 'low' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = riskLevelFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

export const productsReplenishmentFilters: FilterConfig[] = [
  productCategoryFilter,
  riskLevelFilter,
  timePeriodFilter,
];

export const productsReplenishmentSearch = {
  placeholder: 'Search products…',
  param: 'q',
};

/**
 * Retention Curves filter configuration
 */
const retentionLevelFilter: FilterConfig = {
  id: 'retentionLevel',
  title: 'Retention Level',
  type: 'select',
  options: [
    { label: 'All Retention Levels', value: 'all' },
    { label: 'High Retention (>70%)', value: 'high' },
    { label: 'Medium Retention (40-70%)', value: 'medium' },
    { label: 'Low Retention (<40%)', value: 'low' },
  ],
  formatter: (v) => {
    if (typeof v === 'string' && v) {
      const option = retentionLevelFilter.options?.find(opt => opt.value === v);
      return option?.label || v;
    }
    return '';
  },
};

export const retentionCurvesFilters: FilterConfig[] = [
  cohortTypeFilter, // Use same cohortType filter as Revenue Cohorts (monthly/quarterly/annual)
  dateRangeFilter,
  countryFilter, // Countries only, no regions (replaces geographyFilter)
];

export const retentionCurvesSearch = {
  placeholder: 'Search cohorts…',
  param: 'q',
};

/**
 * Repeat Purchase Rates filter configuration (V1)
 * Only includes filters that are fully supported end-to-end:
 * - Date range (filters first_order_at)
 * - Customer type (new/returning only - VIP/at-risk are outputs, not filters)
 */
const repeatRatesCustomerTypeFilter: FilterConfig = {
  id: 'customerType',
  title: 'Customer Type',
  type: 'checkbox',
  options: [
    { label: 'New', value: 'new' },
    { label: 'Returning', value: 'returning' },
  ],
  formatter: (v) => {
    if (Array.isArray(v) && v.length > 0) {
      const labels = v.map(val => {
        const option = repeatRatesCustomerTypeFilter.options?.find(opt => opt.value === val);
        return option?.label || val;
      });
      if (labels.length > 2) {
        return `${labels[0]} and ${labels.length - 1} more`;
      }
      return labels.join(', ');
    }
    return '';
  },
};

export const repeatRatesFilters: FilterConfig[] = [
  dateRangeFilter,
  repeatRatesCustomerTypeFilter,
];

export const repeatRatesSearch = {
  placeholder: 'Search…',
  param: 'q',
};

