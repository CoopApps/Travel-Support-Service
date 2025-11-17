import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { LightBulbIcon } from '../icons/BusIcons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import PricingIndicator from './PricingIndicator';
import { Calendar, MapPin, Clock, User, Mail, Phone, CheckCircle } from 'lucide-react';

interface Route {
  route_id: number;
  route_number: string;
  route_name: string;
  origin_point: string;
  destination_point: string;
}

interface Timetable {
  timetable_id: number;
  route_id: number;
  service_name: string;
  departure_time: string;
  total_seats: number;
  route_number: string;
  origin_point: string;
  destination_point: string;
}

interface Stop {
  stop_id: number;
  stop_name: string;
  stop_sequence: number;
}

interface PricingDetails {
  service_info: any;
  cost_breakdown: any;
  booking_info: any;
  pricing: any;
  surplus_info?: any;
  message: string;
  customer_price?: number;
  is_member?: boolean;
}

const QuickBookPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [searchParams] = useSearchParams();
  const routeIdParam = searchParams.get('route_id');

  const [routes, setRoutes] = useState<Route[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [pricingDetails, setPricingDetails] = useState<PricingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routeIdParam || '');
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [boardingStopId, setBoardingStopId] = useState('');
  const [alightingStopId, setAlightingStopId] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);

  // Fetch routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/bus/routes`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch routes');
        const data = await response.json();
        setRoutes(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchRoutes();
  }, [tenantId]);

  // Fetch timetables when route selected
  useEffect(() => {
    if (!selectedRouteId) return;

    const fetchTimetables = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/bus/timetables?route_id=${selectedRouteId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch timetables');
        const data = await response.json();
        setTimetables(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchTimetables();
  }, [tenantId, selectedRouteId]);

  // Fetch stops when route selected
  useEffect(() => {
    if (!selectedRouteId) return;

    const fetchStops = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/bus/routes/${selectedRouteId}/stops`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch stops');
        const data = await response.json();
        setStops(data.sort((a, b) => a.stop_sequence - b.stop_sequence));
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchStops();
  }, [tenantId, selectedRouteId]);

  // Fetch current pricing when timetable selected
  useEffect(() => {
    if (!selectedTimetableId || !serviceDate) return;

    const fetchPricing = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        const url = new URL(
          `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/bus/services/${selectedTimetableId}/current-price`
        );
        url.searchParams.append('service_date', serviceDate);
        if (customerId) {
          url.searchParams.append('customer_id', customerId.toString());
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch pricing');
        const data = await response.json();
        setPricingDetails(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [tenantId, selectedTimetableId, serviceDate, customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTimetableId || !passengerName || !passengerEmail || !boardingStopId || !alightingStopId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/bus/bookings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timetable_id: parseInt(selectedTimetableId),
            customer_id: customerId,
            passenger_name: passengerName,
            passenger_email: passengerEmail,
            passenger_phone: passengerPhone,
            boarding_stop_id: parseInt(boardingStopId),
            alighting_stop_id: parseInt(alightingStopId),
            service_date: serviceDate,
            payment_method: 'account',
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const booking = await response.json();
      setSuccess(true);

      // Reset form
      setTimeout(() => {
        setPassengerName('');
        setPassengerEmail('');
        setPassengerPhone('');
        setBoardingStopId('');
        setAlightingStopId('');
        setSuccess(false);
        // Refresh pricing
        setPricingDetails(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoute = routes.find(r => r.route_id === parseInt(selectedRouteId));
  const selectedTimetable = timetables.find(t => t.timetable_id === parseInt(selectedTimetableId));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Book a Bus Service</h1>
        <p className="text-gray-600 mt-2">
          Dynamic pricing - price drops as more people book!
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Booking confirmed! Price locked at {pricingDetails?.customer_price ? `£${pricingDetails.customer_price.toFixed(2)}` : 'current rate'}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Select Your Journey</CardTitle>
            <CardDescription>Choose route, service time, and boarding points</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Route Selection */}
              <div className="space-y-2">
                <Label htmlFor="route" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Route
                </Label>
                <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.route_id} value={route.route_id.toString()}>
                        {route.route_number} - {route.route_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRoute && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-semibold">{selectedRoute.origin_point} → {selectedRoute.destination_point}</p>
                </div>
              )}

              {/* Service Time Selection */}
              {selectedRouteId && (
                <div className="space-y-2">
                  <Label htmlFor="timetable" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Service Time
                  </Label>
                  <Select value={selectedTimetableId} onValueChange={setSelectedTimetableId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select departure time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timetables.map((tt) => (
                        <SelectItem key={tt.timetable_id} value={tt.timetable_id.toString()}>
                          {tt.departure_time} - {tt.service_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Service Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Service Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Stops */}
              {selectedRouteId && stops.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="boarding">Boarding Stop</Label>
                    <Select value={boardingStopId} onValueChange={setBoardingStopId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Where are you getting on?" />
                      </SelectTrigger>
                      <SelectContent>
                        {stops.map((stop) => (
                          <SelectItem key={stop.stop_id} value={stop.stop_id.toString()}>
                            {stop.stop_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alighting">Alighting Stop</Label>
                    <Select value={alightingStopId} onValueChange={setAlightingStopId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Where are you getting off?" />
                      </SelectTrigger>
                      <SelectContent>
                        {stops.map((stop) => (
                          <SelectItem key={stop.stop_id} value={stop.stop_id.toString()}>
                            {stop.stop_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Passenger Details */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Passenger Details
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={passengerEmail}
                      onChange={(e) => setPassengerEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="07XXX XXXXXX"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !pricingDetails}
              >
                {loading ? 'Processing...' : `Book Now - ${pricingDetails?.customer_price ? `£${pricingDetails.customer_price.toFixed(2)}` : 'Calculate Price'}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pricing Display */}
        <div className="space-y-6">
          {pricingDetails && (
            <PricingIndicator
              currentPrice={pricingDetails.customer_price || pricingDetails.pricing.member_price}
              isMember={pricingDetails.is_member || false}
              currentBookings={pricingDetails.booking_info.current_bookings}
              minimumPassengersNeeded={pricingDetails.booking_info.minimum_with_subsidy}
              totalCapacity={pricingDetails.booking_info.total_capacity}
              effectiveCost={pricingDetails.cost_breakdown.effective_cost}
              minimumFloor={1.00}
              floorReached={pricingDetails.pricing.floor_reached}
            />
          )}

          {pricingDetails && pricingDetails.surplus_info && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Surplus Smoothing Applied</CardTitle>
                <CardDescription>How the cooperative helps make this service viable</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Raw Service Cost:</span>
                  <span className="font-semibold">£{pricingDetails.cost_breakdown.total_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Subsidy from Surplus Pool:</span>
                  <span className="font-semibold">-£{pricingDetails.cost_breakdown.subsidy_applied.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold">Effective Cost:</span>
                  <span className="font-bold">£{pricingDetails.cost_breakdown.effective_cost.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-blue-900" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LightBulbIcon size={16} color="#1e3a8a" />
                    Surplus saved <strong>{pricingDetails.surplus_info.passengers_saved}</strong> passenger{pricingDetails.surplus_info.passengers_saved !== 1 ? 's' : ''} worth of threshold!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!pricingDetails && selectedTimetableId && (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <p>Calculating current price...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickBookPage;
