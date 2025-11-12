/**
 * Fuel Card Type Definitions
 */

export interface FuelCard {
  fuel_card_id: number;
  tenant_id: number;
  card_number_last_four: string;
  provider: 'Shell' | 'BP' | 'Esso' | 'Texaco' | 'Tesco' | 'Sainsburys' | 'Other';
  pin?: string;
  driver_id?: number;
  vehicle_id?: number;
  monthly_limit?: number;
  daily_limit?: number;
  status: 'active' | 'suspended';

  // Archive fields
  archived?: boolean;
  archived_at?: string;
  archived_by?: number;
  archive_reason?: string;

  // Joined driver information
  driver_name?: string;
  driver_phone?: string;
  driver_employment_type?: string;

  // Joined vehicle information
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_registration?: string;
  vehicle_ownership?: string;

  // Statistics
  monthly_transactions?: number;
  monthly_cost?: number;
  monthly_litres?: number;
  last_transaction_date?: string;
  last_station?: string;

  // Audit fields
  created_by?: number;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFuelCardDto {
  card_number_last_four: string;
  provider: string;
  pin?: string;
  driver_id?: number;
  vehicle_id?: number;
  monthly_limit?: number;
  daily_limit?: number;
  status?: 'active' | 'suspended';
}

export interface UpdateFuelCardDto extends Partial<CreateFuelCardDto> {}

export interface FuelTransaction {
  transaction_id: number;
  tenant_id: number;
  card_id: number;
  driver_id: number;
  vehicle_id: number;
  transaction_date: string;
  transaction_time?: string;
  station_name: string;
  litres: number;
  price_per_litre: number;
  total_cost: number;
  mileage?: number;
  previous_mileage?: number;
  mpg?: number;
  notes?: string;

  // Joined information
  driver_name?: string;
  driver_phone?: string;
  vehicle_registration?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  card_number_last_four?: string;
  provider?: string;

  created_at: string;
}

export interface CreateFuelTransactionDto {
  card_id: number;
  driver_id: number;
  vehicle_id: number;
  transaction_date: string;
  transaction_time?: string;
  station_name: string;
  litres: number;
  price_per_litre: number;
  total_cost: number;
  mileage?: number;
  previous_mileage?: number;
  notes?: string;
}

export interface FuelCardStats {
  activeCards: number;
  totalCards: number;
  monthTotal: number;
  monthLitres: number;
  avgMPG: number;
  transactionsThisMonth: number;
}

export interface FuelCardStatsResponse {
  stats: FuelCardStats;
  monthlyData?: Array<{
    month: string;
    total: number;
    litres: number;
  }>;
  timestamp: string;
}

export interface FuelAlert {
  type: 'overlimit' | 'highcost' | 'lowefficiency';
  severity: 'danger' | 'warning' | 'info';
  message: string;
  cardId?: number;
  transactionId?: number;
}

export interface TransactionPagination {
  total: number;
  has_more: boolean;
  offset?: number;
  limit?: number;
}

export interface FuelTransactionsResponse {
  transactions: FuelTransaction[];
  pagination: TransactionPagination;
}

// ============================================================================
// ENHANCED FEATURES - November 2025
// ============================================================================

// Archive Management
export interface ArchiveFuelCardRequest {
  reason: string;
}

export interface ArchiveFuelCardResponse {
  message: string;
  fuelCard: FuelCard;
}

// Enhanced Bulk Import
export interface BulkImportTransaction {
  card_id: number;
  transaction_date: string;
  transaction_time?: string;
  station_name: string;
  litres: number;
  total_cost: number;
  price_per_litre?: number;
  receipt_number?: string;
  driver_id?: number;
  vehicle_id?: number;
  mileage?: number;
  mpg?: number;
  notes?: string;
}

export interface BulkImportRequest {
  provider_name?: string;
  validate_only: boolean;
  transactions: BulkImportTransaction[];
}

export interface BulkImportValidationResult {
  row: number;
  valid: boolean;
  errors?: string[];
  data: BulkImportTransaction;
}

export interface BulkImportResponse {
  validation_mode?: boolean;
  total: number;
  imported?: number;
  failed?: number;
  valid?: number;
  invalid?: number;
  imported_transactions?: Array<{
    row: number;
    success: boolean;
    transaction: FuelTransaction;
  }>;
  failed_transactions?: Array<{
    row: number;
    success: boolean;
    error?: string;
    data: BulkImportTransaction;
  }>;
  results?: BulkImportValidationResult[];
}

// Reconciliation Dashboard
export interface UnmatchedTransaction {
  transaction_id: number;
  transaction_date: string;
  total_cost: number;
  litres: number;
  card_number_last_four: string;
  provider: string;
  issue_type: string;
}

export interface CardExceedingLimit {
  fuel_card_id: number;
  card_number_last_four: string;
  provider: string;
  monthly_limit: number;
  daily_limit?: number;
  driver_name?: string;
  monthly_total: number;
  transaction_count: number;
  status: string;
}

export interface UnusualTransaction {
  transaction_id: number;
  transaction_date: string;
  transaction_time?: string;
  total_cost: number;
  litres: number;
  price_per_litre: number;
  card_number_last_four: string;
  driver_name?: string;
  vehicle_registration?: string;
  issue_type: string;
}

export interface SuspiciousTransaction {
  transaction_id: number;
  transaction_date: string;
  transaction_time?: string;
  total_cost: number;
  card_number_last_four: string;
  driver_name?: string;
  similar_count: number;
}

export interface ReconciliationSummary {
  unmatched_transactions: number;
  cards_exceeding_limits: number;
  unusual_transactions: number;
  suspicious_transactions: number;
  total_issues: number;
}

export interface ReconciliationResponse {
  summary: ReconciliationSummary;
  issues: {
    unmatched_transactions: UnmatchedTransaction[];
    cards_exceeding_limits: CardExceedingLimit[];
    unusual_transactions: UnusualTransaction[];
    suspicious_transactions: SuspiciousTransaction[];
  };
}

// Advanced Analytics
export interface MonthlyTrend {
  month: string;
  transaction_count: number;
  total_cost: number;
  total_litres: number;
  avg_price_per_litre: number;
  avg_mpg: number;
}

export interface DriverRanking {
  driver_id: number;
  driver_name: string;
  employment_type: string;
  transaction_count: number;
  total_spent: number;
  total_litres: number;
  avg_mpg: number;
  avg_cost_per_transaction: number;
}

export interface VehicleEfficiency {
  vehicle_id: number;
  make: string;
  model: string;
  registration: string;
  transaction_count: number;
  total_cost: number;
  total_litres: number;
  avg_mpg: number;
  cost_per_litre: number;
}

export interface StationComparison {
  station_name: string;
  transaction_count: number;
  avg_price_per_litre: number;
  total_spent: number;
}

export interface UsagePattern {
  day_of_week: number;
  day_name: string;
  transaction_count: number;
  total_cost: number;
}

export interface AnalyticsResponse {
  monthly_trends: MonthlyTrend[];
  driver_rankings: DriverRanking[];
  vehicle_efficiency: VehicleEfficiency[];
  station_comparison: StationComparison[];
  usage_patterns: UsagePattern[];
  generated_at: string;
}

// Spending Analysis
export interface MonthSummary {
  transactions: number;
  total_cost: number;
  total_litres: number;
  avg_per_transaction: number;
}

export interface MonthChanges {
  cost_change_percent: string;
  litres_change_percent: string;
  cost_change_amount: string;
}

export interface ProjectedSpending {
  monthly_total: string;
  days_elapsed: number;
  days_in_month: number;
  daily_average: string;
}

export interface BudgetStatusCard {
  fuel_card_id: number;
  card_number_last_four: string;
  provider: string;
  monthly_limit: number | null;
  driver_name: string | null;
  current_spending: number;
  transaction_count: number;
  budget_used_percentage: number | null;
  status: string;
}

export interface SpendingAnalysisResponse {
  month_comparison: {
    current_month: MonthSummary;
    previous_month: MonthSummary;
    changes: MonthChanges;
  };
  projected: ProjectedSpending;
  budget_status: BudgetStatusCard[];
  alerts: BudgetStatusCard[];
}
