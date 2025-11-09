# Dashboard Components Reference

## Component Hierarchy

```
DashboardPage
├── BudgetWithActualsCard
│   ├── Card (shadcn/ui)
│   ├── Progress (shadcn/ui)
│   ├── Separator (shadcn/ui)
│   ├── Skeleton (shadcn/ui)
│   └── AmountDisplay (custom)
│
├── PaymentMethodBreakdownEnhanced
│   ├── Card (shadcn/ui)
│   ├── Progress (shadcn/ui)
│   ├── Skeleton (shadcn/ui)
│   ├── AmountDisplay (custom)
│   ├── PaymentMethodBadge (custom)
│   └── ClientListPopup
│
├── ClientListPopup
│   ├── Dialog (shadcn/ui)
│   ├── Card (shadcn/ui)
│   ├── Input (shadcn/ui)
│   ├── Select (shadcn/ui)
│   ├── Button (shadcn/ui)
│   ├── Table (shadcn/ui)
│   ├── AmountDisplay (custom)
│   ├── PaymentMethodBadge (custom)
│   └── DeviationBadge (custom)
│
└── BudgetBreakdownSection (existing)
```

## Component Props Reference

### BudgetWithActualsCard

```typescript
interface BudgetWithActualsCardProps {
  year: number;                           // Tax year to display
  onClientListClick?: (                   // Optional callback
    type: 'standard' | 'actuals' | 'remaining'
  ) => void;
}
```

**Usage Example:**
```tsx
<BudgetWithActualsCard
  year={2026}
  onClientListClick={(type) => handleClick(type)}
/>
```

### PaymentMethodBreakdownEnhanced

```typescript
interface PaymentMethodBreakdownEnhancedProps {
  year: number;                           // Tax year to display
}
```

**Usage Example:**
```tsx
<PaymentMethodBreakdownEnhanced year={2026} />
```

### ClientListPopup

```typescript
interface ClientListPopupProps {
  open: boolean;                          // Dialog open state
  onOpenChange: (open: boolean) => void;  // Close callback
  title: string;                          // Dialog title (Hebrew)
  clients: ClientSummary[];               // Array of clients
  totalBeforeVat: number;                 // Sum before VAT
  totalWithVat: number;                   // Sum with VAT
}

interface ClientSummary {
  clientId: string;                       // Unique client ID
  clientName: string;                     // Client name (Hebrew)
  originalAmount: number;                 // Original fee amount
  expectedAmount?: number;                // Expected after discount
  actualAmount?: number;                  // What was actually paid
  paymentMethod?: PaymentMethod;          // Selected payment method
  hasDeviation?: boolean;                 // If payment differs
  deviationPercent?: number;              // Deviation percentage
}
```

**Usage Example:**
```tsx
<ClientListPopup
  open={isOpen}
  onOpenChange={setIsOpen}
  title="תקציב תקן - כל הלקוחות"
  clients={clientList}
  totalBeforeVat={1000000}
  totalWithVat={1180000}
/>
```

## Data Flow Diagram

```
User Action → Service Call → State Update → Component Render
     ↓              ↓              ↓              ↓
Select Year    getBudget      setData        Display
Click Card     getClients     setClients     Show Popup
Search         N/A            useMemo        Filter
Sort           N/A            useMemo        Reorder
```

## State Management

### DashboardPage State

```typescript
const [selectedYear, setSelectedYear] = useState(2026);
const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetByCategory | null>(null);
const [budgetPopupType, setBudgetPopupType] = useState<'standard' | 'actuals' | 'remaining' | null>(null);
const [budgetClients, setBudgetClients] = useState<ClientSummary[]>([]);
const [budgetTotals, setBudgetTotals] = useState({ beforeVat: 0, withVat: 0 });
```

### Component Local State

**BudgetWithActualsCard:**
```typescript
const [data, setData] = useState<BudgetWithActuals | null>(null);
const [loading, setLoading] = useState(true);
```

**PaymentMethodBreakdownEnhanced:**
```typescript
const [data, setData] = useState<PaymentMethodGroup[]>([]);
const [loading, setLoading] = useState(true);
const [selectedMethod, setSelectedMethod] = useState<PaymentMethodGroup | null>(null);
const [popupOpen, setPopupOpen] = useState(false);
```

**ClientListPopup:**
```typescript
const [search, setSearch] = useState('');
const [sortBy, setSortBy] = useState<'name' | 'amount'>('amount');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
```

## Service Methods

### dashboardService.getBudgetWithActuals()

```typescript
async getBudgetWithActuals(year: number): Promise<ServiceResponse<{
  budgetStandard: { beforeVat: number; withVat: number };
  actualPayments: { beforeVat: number; withVat: number };
  remaining: { beforeVat: number; withVat: number };
  completionRate: number;
}>>
```

**SQL Queries:**
1. Sum all `fee_calculations` for year (budget standard)
2. Sum all `actual_payments` for year (actual payments)
3. Calculate remaining and completion rate

### dashboardService.getPaymentMethodBreakdownWithClients()

```typescript
async getPaymentMethodBreakdownWithClients(year: number): Promise<ServiceResponse<
  Array<{
    method: string;
    count: number;
    clients: Array<{
      clientId: string;
      clientName: string;
      originalAmount: number;
      expectedAmount: number;
      actualAmount: number;
    }>;
    totalBeforeVat: number;
    totalWithVat: number;
  }>
>>
```

**SQL Queries:**
1. Join `actual_payments` with `clients` and `fee_calculations`
2. Group by `payment_method`
3. Aggregate totals and collect client details

## Styling Reference

### RTL Layout Classes
```css
/* All containers */
dir="rtl"

/* All text */
rtl:text-right ltr:text-left

/* Button groups */
rtl:space-x-reverse

/* Flex containers */
justify-end     /* For RTL alignment */
items-end       /* For RTL vertical alignment */
```

### Color Scheme
```css
/* Primary colors */
text-gray-900   /* Main text */
text-gray-500   /* Secondary text */
text-gray-400   /* Muted text */

/* Status colors */
text-blue-600   /* With VAT amounts */
text-green-600  /* Success/Paid */
text-red-600    /* Alerts/Overdue */
text-yellow-600 /* Warnings */

/* Interactive states */
hover:bg-muted/50
transition-colors
```

### Size Classes
```css
/* Typography */
text-3xl font-bold    /* Page title */
text-2xl font-bold    /* Section headers */
text-lg font-semibold /* Large amounts */
text-base             /* Regular amounts */
text-sm               /* Labels */
text-xs               /* Helper text */

/* Spacing */
space-y-6   /* Vertical spacing between cards */
gap-2       /* Small gaps */
gap-4       /* Medium gaps */
gap-6       /* Large gaps */

/* Padding */
p-4         /* Card padding */
p-6         /* Section padding */
```

## Icons Reference

### Emoji Icons Used
```
📈 תקציב תקן - Budget Standard
💰 גביה בפועל - Actual Payments
🎯 יתרה לגביה - Remaining

🏦 העברה בנקאית - Bank Transfer
💳 כרטיס אשראי - Credit Card
📝 המחאות - Checks

ℹ️ Info level deviation
⚠️ Warning level deviation
🚨 Critical level deviation
```

## Animation Reference

### Hover Effects
```css
/* Cards */
group cursor-pointer hover:bg-muted/50 transition-colors

/* Icons */
text-muted-foreground group-hover:text-foreground
```

### Loading States
```tsx
{loading ? (
  <Skeleton className="h-10 w-48" />
) : (
  <ActualContent />
)}
```

## Responsive Design

### Breakpoints
```css
/* Mobile first */
flex flex-col    /* Stack on mobile */

/* Tablet and up */
sm:flex-row      /* Side by side on tablet+ */
sm:items-center  /* Align center on tablet+ */
```

### Table Responsiveness
```css
overflow-y-auto max-h-[400px]    /* Scrollable tables */
max-w-4xl                         /* Max dialog width */
```

## Performance Optimizations

### Memoization
```tsx
const filteredClients = useMemo(() => {
  // Expensive filtering/sorting
  return filtered;
}, [clients, search, sortBy, sortDir]);
```

### Loading Skeletons
```tsx
if (loading) {
  return <Skeleton className="h-24" />;
}
```

### Conditional Rendering
```tsx
{hasExpectedAmount && <TableHead>...</TableHead>}
{client.paymentMethod && <PaymentMethodBadge />}
```

## Accessibility Features

### ARIA Labels
```tsx
<Button aria-label="Sort direction">
  <ArrowUp />
</Button>
```

### Keyboard Navigation
- Dialog closes on Escape
- Tab navigation through form elements
- Enter to submit search

### Screen Reader Support
- Proper heading hierarchy (h1 → h2 → h3)
- Descriptive button labels
- Table headers with scope

## Common Patterns

### Empty States
```tsx
{data.length === 0 && (
  <div className="text-center text-muted-foreground py-8">
    אין נתונים להצגה
  </div>
)}
```

### Error Handling
```tsx
try {
  const { data, error } = await service.getData();
  if (error) {
    console.error('Error:', error);
    return;
  }
  setData(data);
} catch (error) {
  console.error('Exception:', error);
}
```

### Loading Pattern
```tsx
const loadData = async () => {
  setLoading(true);
  try {
    // Fetch data
  } finally {
    setLoading(false);
  }
};
```

## Testing Scenarios

### User Flows
1. **View Budget Breakdown**
   - Select year → See budget card → View completion rate

2. **Drill Down to Clients**
   - Click budget section → See client list popup → Search/sort → Close

3. **View Payment Methods**
   - Scroll to payment methods → Click method card → See clients → Close

### Edge Cases
- Empty client list
- Zero amounts
- Missing payment method
- No actual payments yet
- Large client lists (700+)
- Search with no results

## Debugging Tips

### Check Data Flow
```typescript
console.log('Year selected:', year);
console.log('Budget data:', data);
console.log('Client list:', clients);
console.log('Filtered clients:', filteredClients);
```

### Verify Service Responses
```typescript
const { data, error } = await service.getData();
console.log('Service response:', { data, error });
```

### Check Render Performance
```typescript
console.time('render');
// Component render
console.timeEnd('render');
```

## Best Practices

### Do's ✅
- Always use `text-right` for Hebrew text
- Always use `dir="rtl"` on containers
- Always provide loading states
- Always handle empty states
- Always memoize expensive calculations
- Always use TypeScript types

### Don'ts ❌
- Don't hardcode colors (use Tailwind classes)
- Don't forget RTL layout
- Don't skip error handling
- Don't use inline styles
- Don't nest ternaries deeply
- Don't use `any` type

## Quick Reference

### Import Statements
```typescript
// UI Components
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

// Custom Components
import { AmountDisplay } from '@/components/payments/AmountDisplay';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { DeviationBadge } from '@/components/payments/DeviationBadge';

// Services
import { dashboardService } from '@/services/dashboard.service';

// Utils
import { formatILS } from '@/lib/payment-utils';

// Types
import type { PaymentMethod } from '@/types/collection.types';
```

### Common Snippets

**Clickable Card:**
```tsx
<div
  className="group cursor-pointer hover:bg-muted/50 p-4 rounded-lg transition-colors"
  onClick={handleClick}
>
  {/* Content */}
</div>
```

**Amount Display:**
```tsx
<AmountDisplay
  beforeVat={amount}
  withVat={amountWithVat}
  size="lg"
/>
```

**Progress Bar:**
```tsx
<Progress value={percentage} className="h-2" />
```
