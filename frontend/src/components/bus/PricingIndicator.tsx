import React from 'react';
import { TrendingDown, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface PricingIndicatorProps {
  currentPrice: number;
  isMember: boolean;
  currentBookings: number;
  minimumPassengersNeeded: number;
  totalCapacity: number;
  effectiveCost: number;
  minimumFloor: number;
  floorReached: boolean;
}

const PricingIndicator: React.FC<PricingIndicatorProps> = ({
  currentPrice,
  isMember,
  currentBookings,
  minimumPassengersNeeded,
  totalCapacity,
  effectiveCost,
  minimumFloor,
  floorReached
}) => {
  // Calculate what price would be with more bookings
  const priceWithOneMore = currentBookings + 1 > 0
    ? Math.max(effectiveCost / (currentBookings + 1), minimumFloor)
    : currentPrice;

  const priceWithFiveMore = currentBookings + 5 > 0 && currentBookings + 5 <= totalCapacity
    ? Math.max(effectiveCost / (currentBookings + 5), minimumFloor)
    : null;

  const savings = currentPrice - priceWithOneMore;
  const memberPrice = currentPrice;
  const nonMemberPrice = currentPrice * 1.20;

  const isViable = currentBookings >= minimumPassengersNeeded;
  const passengersNeeded = Math.max(0, minimumPassengersNeeded - currentBookings);

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-6 space-y-4">
        {/* Current Price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Your Price</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-blue-600">
                £{(isMember ? memberPrice : nonMemberPrice).toFixed(2)}
              </span>
              {!isMember && (
                <Badge variant="outline" className="text-xs">
                  +20% non-member
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Bookings</p>
            <div className="text-2xl font-bold">{currentBookings}</div>
            <p className="text-xs text-gray-500">of {totalCapacity} seats</p>
          </div>
        </div>

        {/* Viability Status */}
        {!isViable && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                {passengersNeeded} more {passengersNeeded === 1 ? 'passenger' : 'passengers'} needed
              </p>
              <p className="text-sm text-amber-700">
                Service runs when {minimumPassengersNeeded} passengers book
              </p>
            </div>
          </div>
        )}

        {isViable && !floorReached && (
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Users className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Service Confirmed!</p>
              <p className="text-sm text-green-700">
                Enough passengers booked - price continues to drop as more join
              </p>
            </div>
          </div>
        )}

        {floorReached && (
          <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <TrendingDown className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-purple-900">Minimum Price Reached!</p>
              <p className="text-sm text-purple-700">
                Additional passengers generate surplus for the cooperative
              </p>
            </div>
          </div>
        )}

        {/* Price Drop Preview */}
        {!floorReached && currentBookings < totalCapacity && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              Price drops as more people book:
            </p>

            {savings > 0.01 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Next passenger joins:</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-gray-400">
                    £{(isMember ? memberPrice : nonMemberPrice).toFixed(2)}
                  </span>
                  <span className="font-semibold text-green-600">
                    £{(isMember ? priceWithOneMore : priceWithOneMore * 1.20).toFixed(2)}
                  </span>
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    -£{(isMember ? savings : savings * 1.20).toFixed(2)}
                  </Badge>
                </div>
              </div>
            )}

            {priceWithFiveMore && priceWithFiveMore < currentPrice - 0.5 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">If 5 more join:</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-gray-400">
                    £{(isMember ? memberPrice : nonMemberPrice).toFixed(2)}
                  </span>
                  <span className="font-semibold text-blue-600">
                    £{(isMember ? priceWithFiveMore : priceWithFiveMore * 1.20).toFixed(2)}
                  </span>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    -£{(isMember ? (currentPrice - priceWithFiveMore) : (currentPrice - priceWithFiveMore) * 1.20).toFixed(2)}
                  </Badge>
                </div>
              </div>
            )}

            {!floorReached && (
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-gray-600">Floor price:</span>
                <span className="font-semibold text-gray-900">
                  £{(isMember ? minimumFloor : minimumFloor * 1.20).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Member vs Non-Member Comparison */}
        {!isMember && (
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600 mb-2">💡 Member Pricing:</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Members pay:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-600">
                  £{memberPrice.toFixed(2)}
                </span>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  Save £{(nonMemberPrice - memberPrice).toFixed(2)}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Join the cooperative to avoid the 20% surcharge
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingIndicator;
