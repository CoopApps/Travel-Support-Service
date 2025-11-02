# Schedules Module - Improvement Plan

## Priority 1: Generate Trips from Customer Schedules ⭐⭐⭐

### Problem
Currently, there's a disconnect between:
- Customer recurring schedules (stored in `tenant_customers.schedule` JSON)
- Actual trip bookings (stored in `tenant_trips` table)

The dashboard shows recurring schedules, but the Schedules page shows trip bookings. They don't sync automatically.

### Solution
Add "Generate Trips" feature that creates trip records from customer schedules.

### Implementation

#### Backend Endpoint
```typescript
POST /api/tenants/:id/trips/generate-from-schedules

Body: {
  startDate: "2025-12-03",
  endDate: "2025-12-09",
  overwrite: false // if true, delete existing and regenerate
}

Response: {
  success: true,
  generated: 45,
  skipped: 3,
  conflicts: [
    { customer: "Mary", day: "Monday", reason: "Trip already exists" }
  ]
}
```

#### Frontend Button
Add to SchedulePage.tsx header:
```tsx
<button onClick={handleGenerateTrips}>
  Generate This Week's Trips
</button>
```

---

## Priority 2: Conflict Detection ⭐⭐⭐

### Features
1. Driver time conflict checking
2. Vehicle double-booking detection
3. Customer overlap warnings
4. Holiday/leave checking
5. MOT expiry warnings

### Implementation
Add validation to trip creation/update:
```typescript
// Before saving trip
const conflicts = await validateTripConflicts({
  driverId,
  vehicleId,
  customerId,
  pickupTime,
  tripDate
});

if (conflicts.length > 0) {
  showConflictWarning(conflicts);
  // Allow override with confirmation
}
```

---

## Priority 3: Drag & Drop Assignment ⭐⭐⭐

### UI Design
```
┌──────────────────────────────────────────────────────┐
│ [Unassigned (5)]  [Tom (8)]  [Sarah (6)]  [James (4)]│
├──────────────────────────────────────────────────────┤
│ 📋 Mary Johnson  │ 08:30 → Hospital  │ 14:00 Shopping│
│ 📋 Peter Smith   │ 09:00 → Day Ctr   │ 15:30 Home   │
│ 📋 Linda Brown   │ 10:30 → Therapy   │              │
└──────────────────────────────────────────────────────┘
```

### Library
Use `react-beautiful-dnd` or `@dnd-kit/core`

### Implementation
```tsx
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="unassigned">
    {unassignedTrips.map(trip => (
      <Draggable key={trip.id} draggableId={trip.id}>
        <TripCard trip={trip} />
      </Draggable>
    ))}
  </Droppable>

  {drivers.map(driver => (
    <Droppable droppableId={driver.id}>
      {/* Driver's trips */}
    </Droppable>
  ))}
</DragDropContext>
```

---

## Priority 4: Print Driver Sheets ⭐⭐

### Features
- PDF generation per driver
- Daily schedule with all trip details
- QR code for mobile access
- Space for signatures/notes

### Implementation
Use `react-to-print` or `jsPDF`:

```tsx
import { jsPDF } from 'jspdf';

const generateDriverSheet = (driver, trips) => {
  const doc = new jsPDF();

  // Header
  doc.text(`Driver: ${driver.name}`, 20, 20);
  doc.text(`Date: ${date}`, 20, 30);
  doc.text(`Vehicle: ${driver.vehicle}`, 20, 40);

  // Trips
  trips.forEach((trip, index) => {
    const y = 60 + (index * 40);
    doc.text(`${trip.time} - ${trip.customer}`, 20, y);
    doc.text(`From: ${trip.pickup}`, 30, y + 10);
    doc.text(`To: ${trip.destination}`, 30, y + 20);
  });

  doc.save(`driver-sheet-${driver.name}-${date}.pdf`);
};
```

---

## Priority 5: Recurring Trip Creation ⭐⭐

### UI Form
```tsx
<form>
  {/* Basic trip details */}
  <input name="customer" />
  <input name="pickupTime" />
  <input name="destination" />

  {/* Recurrence options */}
  <select name="frequency">
    <option>One-time</option>
    <option>Daily</option>
    <option>Weekly</option>
    <option>Monthly</option>
  </select>

  {/* If weekly */}
  <div>
    <label>Days of week:</label>
    <checkbox name="monday" />
    <checkbox name="tuesday" />
    ...
  </div>

  <input name="startDate" type="date" />
  <input name="endDate" type="date" />

  <button type="submit">Create Recurring Trips</button>
</form>
```

### Backend Logic
```typescript
const createRecurringTrips = async (template, startDate, endDate, frequency) => {
  const trips = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    if (shouldCreateTripOnDate(currentDate, frequency, template.daysOfWeek)) {
      trips.push({
        ...template,
        tripDate: currentDate.toISOString().split('T')[0]
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Bulk insert
  await db.query('INSERT INTO tenant_trips ... VALUES ...', trips);
};
```

---

## Priority 6: Driver Day View ⭐⭐⭐

### Timeline View
```
Driver: Tom Wilson | Vehicle: AB12 CDE | Date: Monday, 3rd December

08:00 ━━━━━ 09:00  Mary Johnson
              123 High St → City Hospital

09:30 ━━━━━ 10:30  Peter Smith
              456 Oak Ave → Day Center

11:00 ━━━━━ 12:00  [FREE SLOT]

14:00 ━━━━━ 15:00  Linda Brown
              789 Park Rd → Shopping Center

Total: 4 trips | 6 hours | ~45 miles
```

### Implementation
Use timeline library or custom CSS Grid:

```tsx
<div className="driver-timeline">
  {hours.map(hour => (
    <div className="timeline-hour" key={hour}>
      <div className="hour-label">{hour}:00</div>
      {getTripsForHour(hour, trips).map(trip => (
        <TripBlock
          trip={trip}
          startTime={trip.pickupTime}
          duration={trip.estimatedDuration}
        />
      ))}
    </div>
  ))}
</div>
```

---

## Quick Wins (Low Effort, High Value)

### 1. Add "Copy to Next Week" Button
```tsx
const copyWeekToNext = async () => {
  const thisWeekTrips = await getTrips(currentWeekStart, currentWeekEnd);

  const nextWeekTrips = thisWeekTrips.map(trip => ({
    ...trip,
    tripDate: addDays(trip.tripDate, 7)
  }));

  await bulkCreateTrips(nextWeekTrips);
};
```

### 2. Add "Quick Assign" Context Menu
Right-click trip → Assign to: [Driver List]

### 3. Add Keyboard Shortcuts
- `N`: New trip
- `D`: Assign driver
- `E`: Edit selected trip
- `Delete`: Remove trip
- `←/→`: Navigate weeks

### 4. Add Trip Status Badges
- 🟢 Confirmed
- 🟡 Pending
- 🔴 Cancelled
- ⚪ Completed

### 5. Add Search/Filter Bar
```tsx
<input
  placeholder="Search trips by customer, destination, driver..."
  onChange={handleSearch}
/>
```

---

## Database Schema Enhancements

### Add Trip Status Field
```sql
ALTER TABLE tenant_trips
ADD COLUMN status VARCHAR(20) DEFAULT 'scheduled';
-- Values: scheduled, confirmed, in_progress, completed, cancelled, no_show
```

### Add Recurring Trip Reference
```sql
ALTER TABLE tenant_trips
ADD COLUMN recurring_group_id UUID,
ADD COLUMN recurrence_pattern JSONB;
-- Allows grouping recurring trips together
```

### Add Conflict Log
```sql
CREATE TABLE tenant_trip_conflicts (
  conflict_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  trip_id INTEGER,
  conflict_type VARCHAR(50), -- 'driver_overlap', 'vehicle_double_book', etc.
  conflict_details JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Testing Checklist

- [ ] Generate trips from customer schedules
- [ ] Detect time conflicts when creating trip
- [ ] Drag & drop trip assignment
- [ ] Print driver sheet as PDF
- [ ] Create recurring trips (weekly pattern)
- [ ] Copy this week to next week
- [ ] Search trips by keyword
- [ ] Filter by status
- [ ] Edit trip and update database
- [ ] Delete trip with confirmation
- [ ] Auto-assign to available driver
- [ ] Show conflicts in UI
- [ ] Export schedule as CSV
- [ ] View driver day timeline

---

## Estimated Implementation Time

| Feature | Complexity | Time | Priority |
|---------|-----------|------|----------|
| Generate from schedules | Medium | 4-6 hours | ⭐⭐⭐ |
| Conflict detection | Medium | 3-4 hours | ⭐⭐⭐ |
| Drag & drop | Medium | 4-5 hours | ⭐⭐⭐ |
| Print driver sheets | Low | 2-3 hours | ⭐⭐ |
| Recurring trips | Medium | 5-6 hours | ⭐⭐ |
| Driver day view | Medium | 3-4 hours | ⭐⭐⭐ |
| Copy week | Low | 1-2 hours | ⭐⭐ |
| Quick assign menu | Low | 1-2 hours | ⭐⭐ |
| Search/filter | Low | 2-3 hours | ⭐⭐ |
| Status badges | Low | 1 hour | ⭐ |

**Total: ~30-40 hours for all features**

---

## Immediate Next Steps

1. ✅ Add "Generate Trips from Schedules" button and endpoint
2. ✅ Implement conflict detection before saving trips
3. ✅ Add trip status field to database
4. ✅ Show warning badges for conflicts
5. ✅ Add "Copy to Next Week" quick action
