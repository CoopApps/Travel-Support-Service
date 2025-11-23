import React, { useEffect, useRef } from 'react';
import { RouteStop } from '../../services/busApi';
import './RouteMapView.css';

// Leaflet imports - dynamically loaded to allow fallback
let L: typeof import('leaflet') | null = null;
let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Polyline: any = null;
let Popup: any = null;

// Try to load Leaflet
try {
  L = require('leaflet');
  const RL = require('react-leaflet');
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  Marker = RL.Marker;
  Polyline = RL.Polyline;
  Popup = RL.Popup;

  // Fix default marker icons
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
} catch (e) {
  console.warn('Leaflet not available, using fallback view');
}

interface RouteMapViewProps {
  stops: RouteStop[];
  showMap?: boolean;
  height?: string;
  onStopClick?: (stop: RouteStop) => void;
}

/**
 * RouteMapView Component
 *
 * Displays route stops either on an interactive Leaflet map (if coordinates available)
 * or as a linear diagram fallback.
 */
export default function RouteMapView({
  stops,
  showMap = true,
  height = '300px',
  onStopClick
}: RouteMapViewProps) {
  const sortedStops = [...stops].sort((a, b) => a.stop_sequence - b.stop_sequence);

  // Check if we have coordinates for the map
  const stopsWithCoords = sortedStops.filter(s => s.latitude && s.longitude);
  const hasCoordinates = stopsWithCoords.length >= 2;
  const canShowMap = showMap && hasCoordinates && MapContainer !== null;

  // Calculate map bounds
  const getBounds = () => {
    if (!hasCoordinates || !L) return null;
    const lats = stopsWithCoords.map(s => s.latitude!);
    const lngs = stopsWithCoords.map(s => s.longitude!);
    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  };

  // Get route line coordinates
  const getRouteCoords = (): [number, number][] => {
    return stopsWithCoords.map(s => [s.latitude!, s.longitude!] as [number, number]);
  };

  // Get center point
  const getCenter = (): [number, number] => {
    if (!hasCoordinates) return [51.5074, -0.1278]; // Default to London
    const lats = stopsWithCoords.map(s => s.latitude!);
    const lngs = stopsWithCoords.map(s => s.longitude!);
    return [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2
    ];
  };

  // If no stops, show empty state
  if (sortedStops.length === 0) {
    return (
      <div className="route-map-empty">
        <p>No stops defined for this route</p>
      </div>
    );
  }

  // Linear diagram fallback
  if (!canShowMap) {
    return (
      <div className="route-linear-view">
        <div className="linear-route">
          {sortedStops.map((stop, index) => (
            <div
              key={stop.stop_id}
              className={`linear-stop ${onStopClick ? 'clickable' : ''}`}
              onClick={() => onStopClick?.(stop)}
            >
              <div className="stop-marker">
                <div className={`stop-dot ${index === 0 ? 'first' : ''} ${index === sortedStops.length - 1 ? 'last' : ''}`}>
                  {stop.stop_sequence}
                </div>
                {index < sortedStops.length - 1 && <div className="stop-line" />}
              </div>
              <div className="stop-info">
                <div className="stop-name">{stop.stop_name}</div>
                {stop.arrival_offset_minutes !== undefined && stop.arrival_offset_minutes > 0 && (
                  <div className="stop-time">+{stop.arrival_offset_minutes} min</div>
                )}
                <div className="stop-badges">
                  {stop.is_timing_point && <span className="badge timing">Timing</span>}
                  {stop.is_pickup_point && <span className="badge pickup">Pickup</span>}
                  {stop.is_setdown_point && <span className="badge setdown">Set-down</span>}
                </div>
                {!stop.latitude && (
                  <div className="no-coords">No coordinates</div>
                )}
              </div>
            </div>
          ))}
        </div>
        {!hasCoordinates && showMap && (
          <div className="map-hint">
            Add coordinates to stops to enable map view
          </div>
        )}
      </div>
    );
  }

  // Leaflet map view
  return (
    <div className="route-map-view" style={{ height }}>
      <MapContainer
        bounds={getBounds()}
        center={getCenter()}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route line */}
        <Polyline
          positions={getRouteCoords()}
          color="#3b82f6"
          weight={4}
          opacity={0.8}
        />

        {/* Stop markers */}
        {stopsWithCoords.map((stop, index) => (
          <Marker
            key={stop.stop_id}
            position={[stop.latitude!, stop.longitude!]}
            eventHandlers={{
              click: () => onStopClick?.(stop)
            }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{stop.stop_sequence}. {stop.stop_name}</strong>
                {stop.stop_address && <p>{stop.stop_address}</p>}
                {stop.arrival_offset_minutes !== undefined && stop.arrival_offset_minutes > 0 && (
                  <p>+{stop.arrival_offset_minutes} min from start</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        <span className="legend-item">
          <span className="legend-dot start"></span> Start
        </span>
        <span className="legend-item">
          <span className="legend-dot end"></span> End
        </span>
        <span className="legend-item">
          <span className="legend-line"></span> Route
        </span>
      </div>
    </div>
  );
}

/**
 * Geocode an address using OpenStreetMap Nominatim
 * Free service, no API key needed (but has rate limits)
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: {
          'User-Agent': 'TravelSupportApp/1.0'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
