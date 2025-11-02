# Payroll Management Component

## Overview

The PayrollPage component is a comprehensive payroll processing system for managing employee payroll, tracking payments, and handling HMRC submissions. It provides a complete interface for processing both contracted employees and freelance workers.

## Features

### 1. Statistics Dashboard
- **Active Employees**: Total count of active employees
- **This Month Gross/Net**: Current month payroll totals
- **HMRC Due**: Total tax and NI to be remitted
- **YTD Figures**: Year-to-date gross, net, tax, and NI totals

### 2. Payroll Periods Management
- Create new payroll periods (weekly/monthly)
- View all periods with summary totals
- Period status tracking (draft, processed, paid, submitted)
- Delete draft periods
- View detailed period information

### 3. Period Details - Contracted Employees Tab
- View all contracted/employed staff for the period
- Display hours worked, rates, or salaries
- Show gross pay, deductions (tax, NI, pension, other), and net pay
- Payment status tracking (pending, paid, failed)
- Edit individual payroll records
- Mark payments as paid
- Color-coded payment status badges

### 4. Period Details - Freelance Submissions Tab
- View freelance worker submissions
- Invoice details (number, date)
- Amounts and tax/NI already paid
- Payment status and dates
- Self-assessment tax tracking

### 5. Period Details - Joiners & Leavers Tab
- List of new employees who joined during the period
- List of employees who left during the period
- Employment type and dates
- Leaving reasons (for leavers)

### 6. Period Details - Summary Tab
- Period information (dates, type, status)
- Employee count breakdown (contracted, freelance, joiners, leavers)
- Period totals (gross, tax, NI, pension, net)
- HMRC payment details
- Submission status and date

### 7. Actions & Operations
- **Auto-Generate Payroll**: Automatically generate payroll records for all active contracted employees
- **Edit Records**: Modify individual payroll records (hours, rates, deductions)
- **Mark as Paid**: Update payment status for individual records
- **Export CSV**: Download payroll data as CSV file
- **HMRC Submission**: Track submission to HMRC (future feature)

## Component Structure

```
payroll/
├── PayrollPage.tsx          # Main component
├── Payroll.css              # Styling
└── README.md                # This file
```

## Component Hierarchy

```
PayrollPage
├── StatCard (x6)            # Stats overview cards
├── Periods List View
│   └── Periods Table        # All payroll periods
└── Period Details View
    ├── Tabs
    │   ├── ContractedEmployeesTab
    │   ├── FreelanceSubmissionsTab
    │   ├── JoinersLeaversTab
    │   └── SummaryTab
    └── Modals
        ├── CreatePeriodModal
        └── EditRecordModal
```

## API Integration

The component uses the `payrollApi` from `services/api.ts` with the following endpoints:

### Stats
- `getStats(tenantId)` - Fetch payroll statistics

### Periods
- `getPeriods(tenantId, params?)` - Fetch all periods
- `createPeriod(tenantId, data)` - Create new period
- `getPeriod(tenantId, periodId)` - Get single period
- `updatePeriod(tenantId, periodId, data)` - Update period
- `deletePeriod(tenantId, periodId)` - Delete period

### Records
- `getRecords(tenantId, periodId)` - Fetch period records
- `createRecord(tenantId, periodId, data)` - Create record
- `updateRecord(tenantId, recordId, data)` - Update record
- `deleteRecord(tenantId, recordId)` - Delete record
- `generateRecords(tenantId, periodId)` - Auto-generate records

### Freelance
- `getFreelanceSubmissions(tenantId, periodId)` - Fetch submissions
- `createFreelanceSubmission(tenantId, periodId, data)` - Create submission
- `updateFreelanceSubmission(tenantId, submissionId, data)` - Update submission
- `deleteFreelanceSubmission(tenantId, submissionId)` - Delete submission

### Summary
- `getPeriodSummary(tenantId, periodId)` - Get period summary with joiners/leavers

## Data Types

### PayrollStats
```typescript
interface PayrollStats {
  activeEmployees: number;
  thisMonthGross: number;
  thisMonthNet: number;
  hmrcDue: number;
  ytdGross: number;
  ytdNet: number;
  ytdTax: number;
  ytdNI: number;
}
```

### PayrollPeriod
```typescript
interface PayrollPeriod {
  period_id: number;
  start_date: string;
  end_date: string;
  period_type: 'weekly' | 'monthly';
  status: 'draft' | 'processed' | 'paid' | 'submitted';
  total_gross: number;
  total_net: number;
  total_tax: number;
  total_ni: number;
  total_pension: number;
  hmrc_due: number;
  created_at: string;
}
```

### PayrollRecord
```typescript
interface PayrollRecord {
  record_id: number;
  driver_id: number;
  driver_name: string;
  employment_type: 'contracted' | 'employed' | 'freelance';
  hours_worked?: number;
  hourly_rate?: number;
  salary?: number;
  gross_pay: number;
  tax_deducted: number;
  ni_deducted: number;
  pension_deducted: number;
  other_deductions: number;
  net_pay: number;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_date?: string;
  payment_method?: string;
  notes?: string;
}
```

### FreelanceSubmission
```typescript
interface FreelanceSubmission {
  submission_id: number;
  driver_id: number;
  driver_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  tax_paid: number;
  ni_paid: number;
  net_amount: number;
  payment_status: 'pending' | 'paid';
  payment_date?: string;
}
```

## Usage Example

```tsx
import PayrollPage from './components/payroll/PayrollPage';

function App() {
  return <PayrollPage />;
}
```

## Styling

The component uses a comprehensive CSS file (`Payroll.css`) that follows the application's design system:

- **Stats Cards**: Color-coded cards (blue, green, orange, purple, teal, indigo)
- **Status Badges**: Visual indicators for payment and period status
- **Tables**: Responsive tables with hover effects
- **Modals**: Full-featured modal dialogs for forms
- **Buttons**: Primary, success, danger, and outline variants
- **Responsive**: Mobile-friendly with breakpoints at 768px and 968px

## Color Coding

### Status Badges
- **Draft**: Gray (#F5F5F5)
- **Processed**: Blue (#E3F2FD)
- **Paid**: Green (#E8F5E9)
- **Submitted**: Indigo (#E8EAF6)
- **Pending**: Orange (#FFF3E0)
- **Failed**: Red (#FFEBEE)

### Employment Types
- **Contracted**: Green
- **Employed**: Blue
- **Freelance**: Orange

## Key Features

### Auto-Generation
The "Auto-Generate Payroll" feature creates payroll records for all active contracted employees based on:
- Employee type (hourly vs salaried)
- Hours worked (for hourly)
- Salary amount (for salaried)
- Automatic tax, NI, and pension calculations

### CSV Export
Exports payroll data with columns:
- Driver Name
- Employment Type
- Hours/Rate/Salary
- Gross Pay
- Tax Deducted
- NI Deducted
- Pension Deducted
- Other Deductions
- Net Pay
- Payment Status

### Editing Records
Individual payroll records can be edited to adjust:
- Hours worked and rates
- Gross pay
- All deduction amounts
- Notes
- Net pay is automatically recalculated

## Error Handling

The component includes comprehensive error handling:
- Loading states for async operations
- Error messages for failed API calls
- Confirmation dialogs for destructive actions (delete)
- Form validation in modals
- Graceful handling of missing data

## Accessibility

- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support (Escape to close modals)
- Clear visual indicators for interactive elements
- High contrast color schemes

## Future Enhancements

Potential additions:
1. HMRC RTI submission integration
2. PDF payslip generation
3. Bulk payment processing
4. Email payslips to employees
5. Integration with accounting software
6. Pension auto-enrollment tracking
7. Holiday pay calculations
8. Statutory payments (SSP, SMP, etc.)
9. Tax code management
10. Student loan deductions

## Browser Compatibility

Tested and supported on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- TenantContext (for multi-tenancy)
- payrollApi (API service layer)
- Modal component (common/Modal)

## Performance Considerations

- Lazy loading of period details (only loaded when period is selected)
- Optimized re-renders with proper state management
- Efficient table rendering for large datasets
- Debounced search/filter operations (if implemented)

## Testing Recommendations

### Unit Tests
- StatCard rendering
- Currency formatting
- Date formatting
- Status badge mapping
- CSV generation logic

### Integration Tests
- Period creation flow
- Record editing flow
- Auto-generation flow
- Payment status updates

### E2E Tests
- Complete payroll processing workflow
- Period lifecycle (create → process → pay → submit)
- Error scenarios and recovery
