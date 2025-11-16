import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TrendingUp, TrendingDown, PiggyBank, Users, BarChart3, Activity } from 'lucide-react';

interface SurplusPool {
  pool_id: number;
  route_id: number;
  accumulated_surplus: number;
  available_for_subsidy: number;
  reserved_for_reserves: number;
  reserved_for_business: number;
  total_distributed_dividends: number;
  lifetime_total_revenue: number;
  lifetime_total_costs: number;
  lifetime_gross_surplus: number;
  total_services_run: number;
  total_profitable_services: number;
  total_subsidized_services: number;
}

interface SurplusStatistics {
  pool_id: number;
  accumulated_surplus: number;
  available_for_subsidy: number;
  reserved_for_reserves: number;
  reserved_for_business: number;
  total_distributed_dividends: number;
  total_services_run: number;
  total_profitable_services: number;
  total_subsidized_services: number;
  profitability_rate: number;
  lifetime_total_revenue: number;
  lifetime_total_costs: number;
  lifetime_gross_surplus: number;
}

interface SurplusTransaction {
  transaction_id: number;
  transaction_type: string;
  amount: number;
  pool_balance_before: number;
  pool_balance_after: number;
  service_date: string;
  departure_time: string;
  route_number: string;
  description: string;
  passenger_count?: number;
  service_revenue?: number;
  service_cost?: number;
  created_at: string;
}

const SurplusPoolDashboard: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<SurplusStatistics | null>(null);
  const [transactions, setTransactions] = useState<SurplusTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch routes with surplus smoothing enabled
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/bus/routes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch routes');

        const data = await response.json();
        const smoothingRoutes = data.filter((r: any) => r.use_surplus_smoothing);
        setRoutes(smoothingRoutes);

        if (smoothingRoutes.length > 0 && !selectedRouteId) {
          setSelectedRouteId(smoothingRoutes[0].route_id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [tenantId]);

  // Fetch statistics and transactions for selected route
  useEffect(() => {
    if (!selectedRouteId) return;

    const fetchSurplusData = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        // Fetch statistics
        const statsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/routes/${selectedRouteId}/surplus-statistics`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStatistics(statsData);
        }

        // Fetch transactions
        const transResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/routes/${selectedRouteId}/surplus-transactions?limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (transResponse.ok) {
          const transData = await transResponse.json();
          setTransactions(transData.transactions || []);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchSurplusData();
  }, [tenantId, selectedRouteId]);

  const formatCurrency = (amount: number | string) => {
    return `£${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'surplus_added':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'subsidy_applied':
        return <TrendingDown className="h-4 w-4 text-blue-600" />;
      case 'dividend_paid':
        return <Users className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case 'surplus_added':
        return 'bg-green-100 text-green-800';
      case 'subsidy_applied':
        return 'bg-blue-100 text-blue-800';
      case 'dividend_paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            No routes with surplus smoothing enabled. Enable surplus smoothing on a route to see the pool dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Surplus Pool Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Track how profitable trips subsidize less profitable ones
        </p>
      </div>

      {/* Route Selector */}
      <div className="flex gap-2 flex-wrap">
        {routes.map((route) => (
          <button
            key={route.route_id}
            onClick={() => setSelectedRouteId(route.route_id)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedRouteId === route.route_id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Route {route.route_number}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {statistics && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available for Subsidy</CardTitle>
                <PiggyBank className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(statistics.available_for_subsidy)}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Can subsidize {Math.floor(parseFloat(statistics.available_for_subsidy.toString()) / 10)} services at £10 each
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accumulated Surplus</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(statistics.accumulated_surplus)}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Total surplus generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profitability Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.profitability_rate}%</div>
                <p className="text-xs text-gray-600 mt-1">
                  {statistics.total_profitable_services} of {statistics.total_services_run} services profitable
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services Helped</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_subsidized_services}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Services subsidized from pool
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Surplus Allocation</CardTitle>
                <CardDescription>How surplus is distributed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reserved for Reserves</span>
                  <span className="font-semibold">{formatCurrency(statistics.reserved_for_reserves)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reserved for Business</span>
                  <span className="font-semibold">{formatCurrency(statistics.reserved_for_business)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Distributed as Dividends</span>
                  <span className="font-semibold">{formatCurrency(statistics.total_distributed_dividends)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available for Subsidy</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(statistics.available_for_subsidy)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifetime Totals</CardTitle>
                <CardDescription>All-time revenue and costs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Revenue</span>
                  <span className="font-semibold text-green-600">{formatCurrency(statistics.lifetime_total_revenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Costs</span>
                  <span className="font-semibold text-red-600">{formatCurrency(statistics.lifetime_total_costs)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gross Surplus</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(statistics.lifetime_gross_surplus)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Services Run</span>
                  <span className="font-semibold">{statistics.total_services_run}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Surplus generation and subsidy applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No transactions yet</p>
                ) : (
                  transactions.map((trans) => (
                    <div
                      key={trans.transaction_id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="mt-1">{getTransactionIcon(trans.transaction_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge className={getTransactionBadgeColor(trans.transaction_type)}>
                              {trans.transaction_type.replace('_', ' ')}
                            </Badge>
                            <p className="text-sm mt-2">{trans.description}</p>
                            {trans.service_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Service: {new Date(trans.service_date).toLocaleDateString()} at {trans.departure_time}
                                {trans.passenger_count && ` • ${trans.passenger_count} passengers`}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-semibold ${
                              trans.transaction_type === 'surplus_added' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {trans.transaction_type === 'surplus_added' ? '+' : '-'}{formatCurrency(trans.amount)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Balance: {formatCurrency(trans.pool_balance_after)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SurplusPoolDashboard;
