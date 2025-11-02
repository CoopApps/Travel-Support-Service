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
