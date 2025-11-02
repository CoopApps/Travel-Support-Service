// ============================================
// Cost Center Types
// ============================================

export type CostCenterCategory =
  | 'operational'
  | 'administrative'
  | 'fleet'
  | 'compliance'
  | 'marketing'
  | 'it'
  | 'facilities'
  | 'other';

export interface CostCenter {
  id: number;
  tenant_id: number;

  // Cost Center Details
  code: string;
  name: string;
  description?: string;
  category: CostCenterCategory;

  // Budget Information
  budget_annual?: number;
  budget_monthly?: number;

  // Responsible Person
  owner_id?: number;

  // Status
  is_active: boolean;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface CreateCostCenterDto {
  code: string;
  name: string;
  description?: string;
  category: CostCenterCategory;
  budget_annual?: number;
  budget_monthly?: number;
  owner_id?: number;
  is_active?: boolean;
}

export interface UpdateCostCenterDto {
  code?: string;
  name?: string;
  description?: string;
  category?: CostCenterCategory;
  budget_annual?: number;
  budget_monthly?: number;
  owner_id?: number;
  is_active?: boolean;
}

export interface CostCenterExpense {
  id: number;
  tenant_id: number;
  cost_center_id: number;

  // Expense Details
  expense_date: string; // ISO date
  description: string;
  amount: number;
  category?: string;

  // Reference
  reference_number?: string;
  invoice_number?: string;

  // Payment
  payment_method?: string;
  paid_date?: string; // ISO date

  // Who logged it
  logged_by?: number;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface CreateCostCenterExpenseDto {
  cost_center_id: number;
  expense_date: string; // ISO date
  description: string;
  amount: number;
  category?: string;
  reference_number?: string;
  invoice_number?: string;
  payment_method?: string;
  paid_date?: string; // ISO date
  logged_by?: number;
}

export interface UpdateCostCenterExpenseDto {
  cost_center_id?: number;
  expense_date?: string; // ISO date
  description?: string;
  amount?: number;
  category?: string;
  reference_number?: string;
  invoice_number?: string;
  payment_method?: string;
  paid_date?: string; // ISO date
}

export interface CostCenterUtilization {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  category: CostCenterCategory;
  budget_annual?: number;
  budget_monthly?: number;
  total_spent_ytd: number;
  total_spent_this_month: number;
  remaining_annual?: number;
  remaining_monthly?: number;
}

export interface CostCenterSummary {
  total_cost_centers: number;
  active_cost_centers: number;
  total_budget_annual: number;
  total_spent_ytd: number;
  total_spent_this_month: number;
  by_category: Array<{
    category: CostCenterCategory;
    count: number;
    budget: number;
    spent: number;
  }>;
}
