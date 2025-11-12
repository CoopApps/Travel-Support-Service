# Route Optimization Phase 2 - Implementation Guide

## ✅ Completed (Backend & Core Components)

### Backend
- ✅ `/api/tenants/:tenantId/routes/optimize` - Single driver optimization
- ✅ `/api/tenants/:tenantId/routes/optimization-scores` - Batch score calculation
- ✅ Score calculation algorithm (Google Maps + Haversine fallback)
- ✅ TypeScript compiled

### Frontend Components
- ✅ `RouteOptimizationPanel.tsx` - Slide-out optimization panel
- ✅ SVG icons replacing emojis in RouteOptimizer

## 📋 Remaining Work

### 1. Integration into ScheduledAppointmentsView & AdHocJourneysView

**File:** `frontend/src/components/schedules/ScheduledAppointmentsView.tsx`

**Changes Needed:**

```typescript
// Add imports
import RouteOptimizationPanel from './RouteOptimizationPanel';
import { useAuthStore } from '../../store/authStore';

// Add state
const [optimizationPanelOpen, setOptimizationPanelOpen] = useState(false);
const [selectedDriverForOptimization, setSelectedDriverForOptimization] = useState<{
  driverId: number;
  driverName: string;
  date: string;
} | null>(null);
const [optimizationScores, setOptimizationScores] = useState<any[]>([]);

// Add useEffect to fetch scores
useEffect(() => {
  if (customStartDate && customEndDate) {
    fetchOptimizationScores();
  }
}, [customStartDate, customEndDate, trips]);

// Add fetch function
const fetchOptimizationScores = async () => {
  try {
    const response = await fetch(
      `/api/tenants/${tenantId}/routes/optimization-scores?startDate=${customStartDate}&endDate=${customEndDate}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    setOptimizationScores(data.scores);
  } catch (err) {
    console.error('Error fetching optimization scores:', err);
  }
};

// Add handler
const handleOptimizeDriver = (driverId: number, date: string) => {
  const driver = drivers.find(d => d.driver_id === driverId);
  if (driver) {
    setSelectedDriverForOptimization({
      driverId,
      driverName: driver.name || `${driver.first_name} ${driver.last_name}`,
      date
    });
    setOptimizationPanelOpen(true);
  }
};

// Add to render (before closing div)
{optimizationPanelOpen && selectedDriverForOptimization && (
  <RouteOptimizationPanel
    tenantId={tenantId}
    driverId={selectedDriverForOptimization.driverId}
    driverName={selectedDriverForOptimization.driverName}
    date={selectedDriverForOptimization.date}
    onClose={() => {
      setOptimizationPanelOpen(false);
      setSelectedDriverForOptimization(null);
    }}
    onOptimized={() => {
      fetchData();
      fetchOptimizationScores();
    }}
  />
)}
```

### 2. Update ScheduledTripsGrid Component

**File:** `frontend/src/components/schedules/ScheduledTripsGrid.tsx`

**Changes Needed:**

```typescript
// Update interface
interface ScheduledTripsGridProps {
  // ... existing props ...
  optimizationScores?: any[];
  onOptimizeDriver?: (driverId: number, date: string) => void;
}

// Add helper function
const getOptimizationScore = (driverId: number, date: string) => {
  if (!optimizationScores) return null;
  return optimizationScores.find(
    s => s.driverId === driverId && s.date === date
  );
};

const getScoreColor = (score: number) => {
  if (score >= 90) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // yellow
  return '#ef4444'; // red
};

const getScoreIndicator = (score: number) => {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  return '🔴';
};

// In driver column render (line 669), update to:
<div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
  {driver.name}
  {/* Show aggregate score for driver across week */}
  {optimizationScores && (() => {
    const driverScores = weekDays
      .map(date => getOptimizationScore(driver.driver_id, date))
      .filter(s => s !== null);
    if (driverScores.length > 0) {
      const avgScore = driverScores.reduce((sum, s) => sum + s.score, 0) / driverScores.length;
      return (
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getScoreColor(avgScore),
          display: 'inline-block'
        }} title={`Avg optimization: ${avgScore.toFixed(0)}%`} />
      );
    }
    return null;
  })()}
</div>

// Add optimize button in button section (after line 702):
{onOptimizeDriver && (
  <button
    className="btn btn-sm"
    onClick={() => {
      // Find first date with trips for this driver
      const driverTripsDate = trips.find(t => t.driver_id === driver.driver_id)?.trip_date.split('T')[0];
      if (driverTripsDate) {
        onOptimizeDriver(driver.driver_id, driverTripsDate);
      } else {
        // Default to first day of week
        onOptimizeDriver(driver.driver_id, weekDays[0]);
      }
    }}
    style={{
      fontSize: '10px',
      padding: '4px 8px',
      background: '#6366f1',
      color: 'white',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}
    title="Optimize routes"
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
    Optimize
  </button>
)}

// In day columns (line 728), add score indicator for each cell:
{/* Add this before or after the period divs */}
{optimizationScores && (() => {
  const score = getOptimizationScore(driver.driver_id, date);
  if (score && score.tripCount >= 2) {
    return (
      <div style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: getScoreColor(score.score),
        cursor: 'help'
      }} title={`Optimization: ${score.score}% (${score.savingsPotential.toFixed(1)} mi savings)`} />
    );
  }
  return null;
})()}
```

### 3. Add "Optimize All Routes" Button (Bulk Feature)

**File:** `frontend/src/components/schedules/ScheduledAppointmentsView.tsx`

**Add to toolbar (after filter buttons):**

```typescript
<button
  onClick={() => setShowBulkOptimizationModal(true)}
  style={{
    padding: '8px 16px',
    backgroundColor: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
  Optimize All Routes
</button>
```

### 4. Create BulkOptimizationModal Component

**New File:** `frontend/src/components/schedules/BulkOptimizationModal.tsx`

```typescript
interface BulkOptimizationModalProps {
  tenantId: number;
  drivers: Driver[];
  weekDays: string[];
  optimizationScores: any[];
  onClose: () => void;
  onOptimized: () => void;
}

function BulkOptimizationModal({ ... }: BulkOptimizationModalProps) {
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Show checklist of drivers with poor scores
  // Allow select all / deselect all
  // "Optimize Selected (X drivers)" button
  // Progress bar during optimization
  // Results summary

  return (
    <div style={{ /* modal styles */ }}>
      {/* Driver selection checklist */}
      {/* Optimize button */}
      {/* Results display */}
    </div>
  );
}
```

## Implementation Order

1. ✅ Backend endpoints - DONE
2. ✅ RouteOptimizationPanel component - DONE
3. ⏳ Integrate into ScheduledAppointmentsView (state + panel render)
4. ⏳ Update ScheduledTripsGrid (optimize button + score indicators)
5. ⏳ Repeat #3-4 for AdHocJourneysView
6. ⏳ Create BulkOptimizationModal
7. ⏳ Testing & refinement

## Testing Checklist

- [ ] Click "Optimize" button on driver row → Panel opens
- [ ] Panel shows all trips for that driver on that date (scheduled + adhoc)
- [ ] Optimization calculates correctly
- [ ] Apply changes updates trip times
- [ ] Score indicators appear and update after optimization
- [ ] Color coding reflects optimization level (green/yellow/red)
- [ ] "Optimize All Routes" opens bulk modal
- [ ] Bulk optimization processes multiple drivers
- [ ] Works in both Scheduled and Adhoc tabs

## Notes

- Uses hybrid approach: Individual optimize buttons per driver + bulk "Optimize All"
- Score indicators show as colored dots (🔴🟡🟢)
- Panel slides in from right side
- Respects existing trip structure (doesn't reassign customers between drivers)
- Phase 3 will add cross-driver reassignment suggestions
