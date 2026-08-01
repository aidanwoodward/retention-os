# Revenue Cohorts Page - UI/UX Consistency Template

> **Historical / legacy document.** Patterns below were captured from quarantined `/retention-ltv/revenue-cohorts` and are **not** the active MVP presentation source of truth. Current presentation composition authority: [`VISIBLE_PRODUCT_BIBLE.md`](VISIBLE_PRODUCT_BIBLE.md). Current routes / Keep-Quarantine: [`RETENTIONOS_ARCHITECTURE.md`](RETENTIONOS_ARCHITECTURE.md). Execution sequence: [`PRODUCT_RECONCILIATION_BACKLOG.md`](PRODUCT_RECONCILIATION_BACKLOG.md) §10. Body preserved for historical evidence only.

**Purpose (historical):** Master template documenting UI/UX patterns, styles, colors, spacing, and consistency rules from the legacy Revenue Cohorts page.

**Last Updated:** 2025-01-01  
**Page Reference:** `/retention-ltv/revenue-cohorts` (quarantined)

---

## 1. LAYOUT & SPACING

### 1.1 Page Container
- **Class:** `w-full min-w-0 max-w-full px-4 sm:px-6 lg:px-8 py-8`
- **Purpose:** Main page wrapper ensuring full width with responsive padding
- **Breakpoints:**
  - Mobile: `px-4` (16px)
  - Tablet: `sm:px-6` (24px)
  - Desktop: `lg:px-8` (32px)
- **Vertical Spacing:** `py-8` (32px top/bottom)

### 1.2 Section Spacing
- **Between Major Sections:** `mb-8` (32px)
- **Between Related Components:** `mb-4` (16px) or `mb-6` (24px)
- **Section Dividers:** `border-t border-gray-200 mt-6 mb-8`

### 1.3 Grid Layouts
- **KPI Cards Grid:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8`
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 4 columns
  - Gap: 16px between cards

### 1.4 Card Padding
- **Standard Cards:** `p-5` (20px all sides)
- **Chart Cards:** `p-6 pt-6` (24px all sides, explicit top)
- **Filter Bar:** `px-4 py-3` (header), `px-4 py-4` (content)

---

## 2. COLOR SYSTEM

### 2.1 Primary Colors
- **Primary Blue:** `#3b82f6` (blue-600)
  - Used for: Current period indicators, active states, primary buttons
  - Tailwind: `bg-blue-600`, `text-blue-600`
- **Primary Blue Variants:**
  - `#2563eb` (blue-600) - Darker blue for emphasis
  - `#60a5fa` (blue-400) - Lighter blue for secondary elements
  - `#93c5fd` (blue-300) - Lightest blue for backgrounds

### 2.2 Gray Scale
- **Gray-900:** `#111827` - Primary text color (`text-gray-900`)
- **Gray-700:** `#374151` - Secondary text (`text-gray-700`)
- **Gray-600:** `#4b5563` - Tertiary text (`text-gray-600`)
- **Gray-500:** `#6b7280` - Muted text (`text-gray-500`)
- **Gray-400:** `#9ca3af` - Previous period indicators (`text-gray-400`)
- **Gray-300:** `#d1d5db` - Borders (`border-gray-300`)
- **Gray-200:** `#e5e7eb` - Card borders (`border-gray-200`)
- **Gray-100:** `#f3f4f6` - Backgrounds (`bg-gray-100`)

### 2.3 Status Colors
- **Success/Positive:** `bg-green-100 text-green-700` (for positive deltas)
- **Neutral:** `bg-gray-100 text-gray-700` (for neutral states)
- **Error/Alert:** `bg-red-50 border-red-200 text-red-800` (error states)

### 2.4 Background Colors
- **Card Background:** `bg-white`
- **Page Background:** Default (light gray/white)
- **Hover States:** `hover:bg-gray-50` or `hover:bg-gray-100`
- **Gradient Backgrounds:** `bg-gradient-to-b from-gray-50/50 to-transparent`

### 2.5 Chart Colors
- **Current Period:** `#3b82f6` (blue-600)
- **Previous Period:** `#9ca3af` (gray-400)
- **Cohort Colors:** Blue scale from `#1e3a8a` (blue-900) to `#60a5fa` (blue-400), then green scale
- **Older Cohorts:** `#d4d4d4` (neutral-300)

---

## 3. TYPOGRAPHY

### 3.1 Font Sizes & Weights

#### Headings
- **Page Title:** `text-lg font-bold text-gray-900`
- **Section Title:** `text-lg font-bold text-gray-900` or `text-base font-semibold text-gray-900`
- **Card Title:** `text-base font-semibold text-gray-900`
- **Subsection Title:** `text-sm font-semibold text-gray-900`

#### Body Text
- **Primary Body:** `text-sm text-gray-500` or `text-xs text-gray-500`
- **Secondary Body:** `text-xs text-gray-500`
- **Muted Text:** `text-xs text-gray-400`

#### Values & Numbers
- **Large Value:** `text-2xl font-bold text-gray-900`
- **Medium Value:** `text-base font-bold text-gray-900`
- **Small Value:** `text-sm font-semibold text-gray-900` or `text-sm font-bold text-gray-900`

#### Labels & Badges
- **Badge Text:** `text-xs font-medium`
- **Label Text:** `text-xs text-gray-500`
- **Percentage/Delta:** `text-xs font-medium`

### 3.2 Text Colors
- **Primary Text:** `text-gray-900`
- **Secondary Text:** `text-gray-700`
- **Muted Text:** `text-gray-500`
- **Very Muted:** `text-gray-400`
- **White Text:** `text-white` (on dark backgrounds)

---

## 4. COMPONENT STYLES

### 4.1 Cards

#### Standard KPI Card
```tsx
className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col h-full"
```
- **Border Radius:** `rounded-lg` (8px)
- **Shadow:** Subtle shadow with hover elevation
- **Transition:** `duration-150` for smooth hover effects
- **Height:** `h-full` for equal-height cards in grid

#### Chart Card
```tsx
className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 pt-6"
```
- **Shadow:** `shadow-sm` (lighter than KPI cards)
- **Padding:** `p-6` (24px)

### 4.2 Buttons

#### Primary Button
```tsx
className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
```

#### Secondary Button
```tsx
className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
```

#### Toggle Button (Active)
```tsx
className="px-4 py-2 text-xs font-medium rounded-md bg-blue-600 text-white"
```

#### Toggle Button (Inactive)
```tsx
className="px-4 py-2 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
```

### 4.3 Badges & Pills

#### Status Badge (Positive)
```tsx
className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700"
```

#### Status Badge (Neutral)
```tsx
className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700"
```

#### Rank Badge
```tsx
className="px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full"
```

### 4.4 Tooltips

#### Standard Tooltip
```tsx
className="bg-gray-900 text-white border-0 max-w-[200px]"
```
- **Background:** Dark gray (`bg-gray-900`)
- **Text:** White (`text-white`)
- **Border:** None (`border-0`)
- **Max Width:** `max-w-[200px]` or `max-w-[300px]` for longer content
- **Padding:** `p-3` (12px)
- **Text Size:** `text-xs`

#### Tooltip Icon
- **Size:** `w-3.5 h-3.5` or `w-4 h-4`
- **Color:** `text-gray-400 hover:text-gray-600`
- **Cursor:** `cursor-help`

### 4.5 Inputs & Form Elements

#### Search Input
```tsx
className="pl-8 h-8 w-[180px] md:w-[220px] text-sm"
```
- **Height:** `h-8` (32px)
- **Padding:** `pl-8` (left padding for icon)
- **Width:** Responsive `w-[180px] md:w-[220px]`

#### Filter Bar Container
```tsx
className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm transition-all duration-200 mb-6"
```
- **Background:** Semi-transparent white with blur
- **Border Radius:** `rounded-xl` (12px)
- **Shadow:** `shadow-sm`

### 4.6 Progress Bars & Indicators

#### Segmented Bar
```tsx
className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex"
```
- **Height:** `h-2` (8px)
- **Background:** `bg-gray-200`
- **Border Radius:** `rounded-full`

#### Mini Progress Bar (in leaderboard)
```tsx
className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"
```
- **Height:** `h-1.5` (6px)

### 4.7 Dividers & Separators

#### Section Divider
```tsx
className="border-t border-gray-200 mt-6 mb-8"
```

#### Inline Separator
```tsx
className="w-px h-4 bg-gray-300"
```
or
```tsx
className="text-gray-400 mx-1.5"
```
- **Character:** `|` (pipe)

---

## 5. ICONS

### 5.1 Icon Sizes
- **Small:** `w-3.5 h-3.5` (14px) - Tooltips, inline indicators
- **Medium:** `w-4 h-4` (16px) - Standard icons
- **Large:** `w-16 h-16` (64px) - Error states, empty states

### 5.2 Icon Colors
- **Default:** `text-gray-400`
- **Hover:** `hover:text-gray-600`
- **Active:** `text-gray-600` or `text-blue-600`
- **Error:** `text-red-400`

### 5.3 Common Icons
- **Info:** `Info` from lucide-react - `w-3.5 h-3.5 text-gray-400`
- **Alert:** `AlertTriangle` - `w-16 h-16 text-red-400` (error states)
- **Download:** `Download` - `w-4 h-4`
- **Chevron:** `ChevronDown` / `ChevronUp` - `w-4 h-4 text-gray-600`

---

## 6. CHARTS & DATA VISUALIZATION

### 6.1 Chart Container
```tsx
className="relative bg-gradient-to-b from-gray-50/50 to-transparent rounded-lg border border-gray-200 p-4 overflow-x-auto min-w-0"
```
- **Background:** Subtle gradient
- **Padding:** `p-4` (16px)
- **Overflow:** `overflow-x-auto` for horizontal scrolling

### 6.2 Chart Colors
- **Current Period Line:** `#3b82f6` (blue-600), stroke width `2`
- **Previous Period Line:** `#9ca3af` (gray-400), stroke width `1.5`, dashed
- **Area Fill Opacity:** `0.2` for both periods
- **Grid Lines:** `#e5e7eb` (gray-200), `strokeDasharray="2 2"`, `opacity-60`

### 6.3 Chart Labels
- **X-Axis Labels:** `text-xs text-gray-500`, `fontWeight: 600`
- **Y-Axis Labels:** `text-xs`, `fill: #9ca3af`
- **Value Labels:** `fontSize: 11`, `fontWeight: 600`, `fill: #374151`

### 6.4 Chart Tooltips
- **Background:** White with border
- **Border:** `border border-gray-200`
- **Shadow:** `shadow-lg`
- **Padding:** `p-3`
- **Text:** `text-sm font-semibold text-gray-900` (values), `text-xs text-gray-600` (labels)

---

## 7. INTERACTIVE STATES

### 7.1 Hover States
- **Cards:** Shadow elevation change (`hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`)
- **Buttons:** Background color change (`hover:bg-gray-50`, `hover:bg-blue-700`)
- **Interactive Elements:** `hover:bg-gray-100` for list items
- **Transitions:** `transition-colors` or `transition-shadow duration-150`

### 7.2 Active States
- **Toggle Buttons:** `bg-blue-600 text-white` when active
- **Selected Items:** Blue background or border

### 7.3 Focus States
- **Inputs:** Ring focus (default Tailwind focus ring)
- **Buttons:** Standard focus ring

### 7.4 Loading States
```tsx
className="animate-pulse space-y-6"
```
- **Skeleton:** `bg-gray-200` or `bg-gray-300`
- **Animation:** `animate-pulse`

### 7.5 Error States
```tsx
className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center"
```
- **Background:** `bg-red-50`
- **Border:** `border-red-200`
- **Text:** `text-red-800` (heading), `text-red-600` (body)

---

## 8. SPACING PATTERNS

### 8.1 Internal Card Spacing
- **Header Section:** `mb-2` (8px) or `mb-3` (12px)
- **Between Elements:** `gap-1.5` (6px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px)
- **Vertical Stack:** `space-y-1.5`, `space-y-2`, `space-y-3`

### 8.2 Flex Layouts
- **Flex Container:** `flex items-center gap-2` or `flex items-center gap-3`
- **Justify:** `justify-between` (space between), `justify-start` (left align)
- **Align:** `items-center` (vertical center), `items-start` (top align)

### 8.3 Grid Gaps
- **Tight Grid:** `gap-2` (8px)
- **Standard Grid:** `gap-4` (16px)
- **Loose Grid:** `gap-6` (24px)

---

## 9. BORDER RADIUS

- **Small:** `rounded` (4px) or `rounded-sm` (2px)
- **Medium:** `rounded-md` (6px) or `rounded-lg` (8px)
- **Large:** `rounded-xl` (12px) or `rounded-2xl` (16px)
- **Full:** `rounded-full` (pill shape)
- **Charts:** `rounded-lg` (8px)

---

## 10. SHADOWS

- **None:** No shadow class
- **Small:** `shadow-sm` - Subtle shadow for cards
- **Standard:** `shadow-[0_1px_3px_rgba(0,0,0,0.06)]` - KPI cards
- **Hover:** `shadow-[0_4px_12px_rgba(0,0,0,0.08)]` - Elevated on hover
- **Large:** `shadow-lg` - Tooltips, modals

---

## 11. ANIMATIONS & TRANSITIONS

### 11.1 Transitions
- **Color Changes:** `transition-colors`
- **Shadow Changes:** `transition-shadow duration-150`
- **All Properties:** `transition-all duration-200`

### 11.2 Animations
- **Pulse:** `animate-pulse` (loading states)
- **Fade In:** `animate-in fade-in-0` (tooltips)
- **Zoom:** `zoom-in-95` (tooltips)

---

## 12. RESPONSIVE BREAKPOINTS

### 12.1 Tailwind Breakpoints
- **sm:** 640px (tablet)
- **md:** 768px (tablet landscape)
- **lg:** 1024px (desktop)
- **xl:** 1280px (large desktop)

### 12.2 Common Responsive Patterns
- **Grid Columns:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Padding:** `px-4 sm:px-6 lg:px-8`
- **Text Size:** Responsive text sizes where needed
- **Width:** `w-[180px] md:w-[220px]` (search input)

---

## 13. ACCESSIBILITY

### 13.1 ARIA Labels
- **Buttons:** `aria-label` for icon-only buttons
- **Collapsible:** `aria-expanded` for expand/collapse
- **Search:** `aria-label="Search"`

### 13.2 Keyboard Navigation
- **Search Shortcut:** "/" key focuses search input
- **Focus States:** Visible focus rings on interactive elements

### 13.3 Color Contrast
- **Text on White:** `text-gray-900` (high contrast)
- **Text on Dark:** `text-white` (tooltips)
- **Muted Text:** `text-gray-500` (sufficient contrast)

---

## 14. DATA FORMATTING

### 14.1 Currency Formatting
- **Large Values:** `$30.5m` (millions), `$25.6k` (thousands)
- **Small Values:** `$1,234` (with commas)
- **Format Function:** Abbreviates at 1M+ and 1K+

### 14.2 Number Formatting
- **Large Numbers:** `14.2k` (thousands), `1.2m` (millions)
- **Small Numbers:** `1,234` (with commas)
- **Decimals:** `toFixed(1)` for percentages, `toFixed(0)` for whole numbers

### 14.3 Percentage Formatting
- **Format:** `+X.X%` or `-X.X%` with sign
- **Delta Format:** `+X.X% (Δ $Y)` or `+X.X% (Δ Y)`

### 14.4 Date Formatting
- **Annual:** `2024`, `2025`
- **Quarterly:** `Q1 24`, `Q2 24`
- **Monthly:** `Jan 24`, `Feb 24`
- **YTD:** `2024 YTD`

---

## 15. COMPONENT PATTERNS

### 15.1 KPI Card Structure
```
Card Container
├── Header (flex justify-between)
│   ├── Title + Info Icon (flex items-center gap-1.5)
│   └── Badge (delta percentage)
├── Subtitle (text-xs text-gray-500)
├── Summary Values (flex gap-4)
│   ├── Current Period (with color indicator)
│   └── Previous Period (with color indicator)
└── Chart (EnhancedTrendChart)
```

### 15.2 Filter Bar Structure
```
Filter Bar Container
├── Header (collapsible)
│   ├── Title + Active Count Badge
│   └── Collapse Toggle
└── Content (when expanded)
    ├── Filter Chips (flex-wrap gap-3)
    └── Search Input (ml-auto)
```

### 15.3 Chart Card Structure
```
Chart Card Container
├── Header (flex justify-between)
│   ├── Title + Description
│   └── Actions (CAGR badge, Export button)
├── Controls (toggle buttons, filters)
├── Legend (cohort colors)
└── Chart (with gradient background)
```

### 15.4 Leaderboard Structure
```
Leaderboard Container
├── Header (title + count)
├── Description
└── List (space-y-2)
    └── Item (flex gap-3)
        ├── Rank Badge
        ├── Label
        ├── Progress Bar
        └── Value + Percentage
```

---

## 16. CONSISTENCY RULES

### 16.1 Spacing Consistency
- ✅ Always use `mb-8` between major page sections
- ✅ Use `gap-4` for card grids
- ✅ Use `gap-2` or `gap-3` for flex items within cards
- ✅ Use `space-y-2` or `space-y-3` for vertical lists

### 16.2 Color Consistency
- ✅ Always use `#3b82f6` (blue-600) for current period
- ✅ Always use `#9ca3af` (gray-400) for previous period
- ✅ Always use `text-gray-900` for primary text
- ✅ Always use `text-gray-500` for secondary/muted text
- ✅ Always use `bg-white` for card backgrounds
- ✅ Always use `border-gray-200` for card borders

### 16.3 Typography Consistency
- ✅ Card titles: `text-base font-semibold text-gray-900`
- ✅ Values: `text-base font-bold text-gray-900` or `text-2xl font-bold`
- ✅ Labels: `text-xs text-gray-500`
- ✅ Badges: `text-xs font-medium`

### 16.4 Component Consistency
- ✅ All cards use same shadow pattern
- ✅ All tooltips use dark background (`bg-gray-900`)
- ✅ All buttons use consistent padding (`px-3 py-1.5` or `px-4 py-2`)
- ✅ All icons use consistent sizing (`w-3.5 h-3.5` or `w-4 h-4`)

### 16.5 Interaction Consistency
- ✅ All hoverable cards have shadow elevation
- ✅ All buttons have `transition-colors`
- ✅ All interactive elements have hover states
- ✅ Loading states use `animate-pulse`

---

## 17. COMMON PATTERNS TO REPLICATE

### 17.1 Info Icon with Tooltip
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
  </TooltipTrigger>
  <TooltipContent className="bg-gray-900 text-white border-0 max-w-[200px]">
    <p className="text-xs">Tooltip content here</p>
  </TooltipContent>
</Tooltip>
```

### 17.2 Delta Badge
```tsx
<span className={`px-2 py-0.5 text-xs font-medium rounded ${
  value >= previousValue 
    ? 'bg-green-100 text-green-700' 
    : 'bg-gray-100 text-gray-700'
}`}>
  {deltaText}
</span>
```

### 17.3 Color Indicator Dot
```tsx
<div className="w-2.5 h-2.5 rounded-sm bg-blue-600 flex-shrink-0"></div>
```

### 17.4 Period Comparison Display
```tsx
<div className="flex items-center gap-4">
  <div>
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <div className="w-2.5 h-2.5 rounded-sm bg-blue-600 flex-shrink-0"></div>
      <span>Current period</span>
    </div>
    <div className="text-base font-bold text-gray-900">{value}</div>
  </div>
  <div>
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 flex-shrink-0"></div>
      <span>Previous period</span>
    </div>
    <div className="text-base font-bold text-gray-900">{previousValue}</div>
  </div>
</div>
```

---

## 18. CHECKLIST FOR NEW PAGES

When creating a new page, ensure:

- [ ] Page container uses `w-full min-w-0 max-w-full px-4 sm:px-6 lg:px-8 py-8`
- [ ] Major sections have `mb-8` spacing
- [ ] Cards use `bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- [ ] Cards have hover shadow: `hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`
- [ ] Primary text uses `text-gray-900`
- [ ] Secondary text uses `text-gray-500`
- [ ] Current period uses `#3b82f6` (blue-600)
- [ ] Previous period uses `#9ca3af` (gray-400)
- [ ] Tooltips use `bg-gray-900 text-white border-0`
- [ ] Buttons have consistent padding and transitions
- [ ] Icons use consistent sizing (`w-3.5 h-3.5` or `w-4 h-4`)
- [ ] Loading states use `animate-pulse`
- [ ] Error states use red color scheme
- [ ] Responsive breakpoints are consistent
- [ ] ARIA labels are present for accessibility

---

## 19. NOTES & EXCEPTIONS

### 19.1 Special Cases
- **Chart Cards:** Use `shadow-sm` instead of standard shadow (lighter)
- **Filter Bar:** Uses `bg-white/95 backdrop-blur-sm` (semi-transparent)
- **Large Charts:** May use `rounded-lg` instead of `rounded-xl`

### 19.2 Future Considerations
- Dark mode support (colors defined in `globals.css` but not yet implemented)
- Custom color scales for different metric types
- Animation preferences for user settings

---

**End of Template**

Use this document as the single source of truth for UI/UX consistency across all pages. When in doubt, refer to the Revenue Cohorts page implementation and this template.
