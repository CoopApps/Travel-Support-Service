# Social Outings Module - React Conversion Complete

## Overview

The Social Outings module has been successfully converted from the legacy vanilla JavaScript version to React, fully integrating with the backend and database tables. The module allows staff to create and manage social outings/events with passenger bookings and driver assignments.

## ✅ Completed Components

### 1. Main Page Component
**File:** `frontend/src/components/social-outings/SocialOutingsPage.tsx`

- **Features:**
  - Lists all social outings with filtering by Upcoming/Past/All
  - Displays outing cards with comprehensive details
  - Create new outing functionality
  - Edit, delete, manage bookings, and assign drivers actions
  - Integrates with backend API for all operations

### 2. Outing Card Component
**File:** `frontend/src/components/social-outings/OutingCard.tsx`

- **Features:**
  - Visual display of outing information
  - Status badges (Open, Booking Open, Almost Full, Fully Booked, Completed)
  - Capacity indicator with progress bar
  - Shows booking count, driver assignments, wheelchair accessibility
  - Action buttons for managing bookings and driver assignments

### 3. Outing Form Modal
**File:** `frontend/src/components/social-outings/OutingFormModal.tsx`

- **Features:**
  - Create new outings
  - Edit existing outings
  - Form sections for:
    - Basic information (name, destination, description)
    - Date & time (date, departure time, return time)
    - Capacity & cost (max passengers, minimum passengers, cost per person)
    - Meeting point & contact (meeting point, contact person, contact phone)
    - Options (wheelchair accessible, weather dependent)
  - Form validation
  - Integration with backend API

### 4. Booking Management Modal
**File:** `frontend/src/components/social-outings/BookingManagementModal.tsx`

- **Features:**
  - View all bookings for an outing
  - Add new passenger bookings
  - **Availability Checking** - Automatically checks if customer is available:
    - Detects conflicts with regular scheduled services
    - Detects conflicts with customer holidays
    - Detects conflicts with existing outing bookings
  - Shows customer accessibility needs (wheelchair users)
  - Capture special requirements and dietary requirements
  - Cancel bookings with reason tracking
  - Displays wheelchair user count
  - Shows capacity status

### 5. Driver Assignment Modal
**File:** `frontend/src/components/social-outings/DriverAssignmentModal.tsx`

- **Features:**
  - Assign drivers to outings
  - **Driver Availability Checking** - Automatically checks if driver is available:
    - Detects conflicts with driver holidays
    - Detects conflicts with other outing assignments
  - **Wheelchair Accessible Vehicle Tracking:**
    - Displays which vehicles are wheelchair accessible
    - Alerts when wheelchair users are booked but insufficient accessible vehicles assigned
    - Shows vehicle information for each assigned driver
  - Passenger assignment to drivers
  - Checkbox interface for assigning passengers to specific drivers
  - Visual indicators for wheelchair users in passenger list
  - Remove driver assignments

### 6. Statistics Component
**File:** `frontend/src/components/social-outings/OutingStats.tsx`

- **Features:**
  - Total outings count
  - Upcoming outings count
  - Total bookings count
  - Wheelchair users count
  - Color-coded stat cards

### 7. Styling
**File:** `frontend/src/components/social-outings/SocialOutings.css`

- **Features:**
  - Comprehensive styling for all components
  - Responsive grid layouts
  - Card-based design matching other modules
  - Badge system for status indicators
  - Modal styling
  - Form styling with grid layouts
  - Alert styles (success, warning, error)
  - Button styles matching application theme

## 🔗 Integration Points

### Backend Routes
**File:** `backend/routes/social-outings.js` (already exists)

All backend routes are working and registered in `server.js`:

#### Outings Management
- `GET /api/tenants/:tenantId/outings` - Get all outings
- `POST /api/tenants/:tenantId/outings` - Create outing
- `PUT /api/tenants/:tenantId/outings/:outingId` - Update outing
- `DELETE /api/tenants/:tenantId/outings/:outingId` - Delete outing
- `GET /api/tenants/:tenantId/outings/stats` - Get statistics

#### Bookings Management
- `GET /api/tenants/:tenantId/outings/:outingId/bookings` - Get bookings for outing
- `POST /api/tenants/:tenantId/outings/:outingId/bookings` - Create booking
- `PUT /api/tenants/:tenantId/outings/:outingId/bookings/:bookingId/cancel` - Cancel booking

#### Driver Assignments (Rotas)
- `GET /api/tenants/:tenantId/outings/:outingId/rotas` - Get driver assignments
- `POST /api/tenants/:tenantId/outings/:outingId/rotas` - Assign driver
- `PUT /api/tenants/:tenantId/outings/:outingId/rotas/:rotaId/passengers` - Update passenger assignments
- `DELETE /api/tenants/:tenantId/outings/:outingId/rotas/:rotaId` - Remove driver

#### Availability Checking
- `GET /api/tenants/:tenantId/customers/:customerId/availability/:date` - Check customer availability
- `GET /api/tenants/:tenantId/drivers/:driverId/availability/:date` - Check driver availability

### Database Tables
The module uses the following tables (already exist):

- `tenant_social_outings` - Stores outing details
- `tenant_outing_bookings` - Stores passenger bookings
- `tenant_outing_rotas` - Stores driver assignments
- `tenant_customers` - Customer data with accessibility needs
- `tenant_drivers` - Driver data
- `tenant_vehicles` - Vehicle data including wheelchair accessibility

### API Service
**File:** `frontend/src/services/socialOutingsApi.ts` (already exists)

Complete TypeScript API service with all methods implemented.

### Type Definitions
**File:** `frontend/src/types/socialOutings.ts` (already exists)

Comprehensive TypeScript types:
- `SocialOuting`
- `OutingBooking`
- `OutingRota`
- `OutingStats`
- `AvailabilityCheck`
- Form data types
- Vehicle and customer snapshots

### Navigation
- Route added to `frontend/src/App.tsx`: `/social-outings`
- Navigation link added to `frontend/src/components/layout/Layout.tsx`
- Icon: "activity" (group of people)

## 🎯 Key Features Implemented

### 1. Schedule Conflict Detection
When adding a passenger to an outing, the system checks:
- ✅ Regular scheduled services on that day
- ✅ Customer holiday periods
- ✅ Existing outing bookings

The user is warned of conflicts but can still proceed with the booking if needed.

### 2. Driver Availability Checking
When assigning a driver to an outing, the system checks:
- ✅ Driver holiday periods
- ✅ Existing outing assignments

The user is warned of conflicts but can still proceed with the assignment if needed.

### 3. Wheelchair Accessible Vehicle Management
- ✅ Tracks which bookings are for wheelchair users
- ✅ Shows which vehicles are wheelchair accessible
- ✅ Alerts when insufficient accessible vehicles are assigned
- ✅ Visual indicators throughout the interface

### 4. Passenger Assignment to Drivers
- ✅ Checkbox interface for assigning passengers to specific drivers
- ✅ Shows wheelchair users with special indicators
- ✅ Tracks which passengers are assigned to which driver
- ✅ Updates passenger assignments in real-time

### 5. Capacity Management
- ✅ Visual progress bar showing capacity utilization
- ✅ Status badges (Open, Almost Full, Fully Booked)
- ✅ Prevents overbooking
- ✅ Shows minimum passenger requirements

## 📁 File Structure

```
conversion/
└── frontend/
    └── src/
        ├── components/
        │   └── social-outings/
        │       ├── SocialOutingsPage.tsx         (Main page)
        │       ├── OutingCard.tsx                (Outing display card)
        │       ├── OutingFormModal.tsx           (Create/edit form)
        │       ├── BookingManagementModal.tsx    (Booking management)
        │       ├── DriverAssignmentModal.tsx     (Driver assignments)
        │       ├── OutingStats.tsx               (Statistics display)
        │       └── SocialOutings.css             (Styling)
        ├── services/
        │   └── socialOutingsApi.ts               (API service - existing)
        └── types/
            └── socialOutings.ts                  (Type definitions - existing)

backend/
└── routes/
    └── social-outings.js                         (Backend routes - existing)
```

## 🚀 How to Use

1. **Navigate to Social Outings**
   - Click "Social Outings" in the main navigation menu

2. **Create an Outing**
   - Click the "+ Create Outing" button
   - Fill in the outing details
   - Set date, time, capacity, and other options
   - Click "Create Outing"

3. **Manage Bookings**
   - Click "Bookings" button on any outing card
   - Click "+ Add Passenger" to add a booking
   - Select a customer (system checks availability automatically)
   - View warnings for schedule conflicts if any
   - Add special requirements and dietary needs
   - Click "Add Booking"

4. **Assign Drivers**
   - Click "Drivers" button on any outing card
   - Click "+ Assign Driver" to add a driver
   - Select a driver (system checks availability automatically)
   - View vehicle information including wheelchair accessibility
   - System alerts if wheelchair accessible vehicles are needed
   - Assign passengers to the driver using checkboxes
   - Click "Assign Driver"

5. **Edit or Delete Outings**
   - Click "Edit" to modify outing details
   - Click "Delete" to remove an outing (with confirmation)

## ✨ UI/UX Highlights

- **Responsive Design** - Works on desktop and mobile
- **Color-Coded Status** - Visual indicators for outing status
- **Real-time Feedback** - Immediate availability checking
- **Accessibility Aware** - Special handling for wheelchair users
- **Professional SaaS Design** - Matches existing modules
- **Empty States** - Helpful messages when no data
- **Loading States** - Visual feedback during operations
- **Error Handling** - Clear error messages

## 🔄 Data Flow

1. **User Action** → React Component
2. **Component** → API Service (`socialOutingsApi.ts`)
3. **API Service** → Backend Route (`/api/tenants/:tenantId/...`)
4. **Backend Route** → Database Query (PostgreSQL)
5. **Database** → Backend Response
6. **Backend** → API Service
7. **API Service** → React Component
8. **Component** → UI Update

## 🎨 Design Consistency

The module follows the same design patterns as other converted modules:
- Card-based layouts
- Modal forms
- Color-coded badges and alerts
- Consistent button styling
- Grid-based responsive layouts
- Professional SaaS aesthetic

## 📝 Notes

- All availability checking is done on the backend for accuracy
- Customer and vehicle data is stored as JSON snapshots in bookings/rotas for historical accuracy
- The module supports multi-tenant architecture with proper data isolation
- All dates/times respect the system timezone configuration
- Wheelchair accessibility is tracked at both the vehicle and booking level

## ✅ Testing Checklist

- [x] Create a new outing
- [x] Edit an existing outing
- [x] Delete an outing
- [x] Add passenger bookings with availability checking
- [x] Cancel bookings
- [x] Assign drivers with availability checking
- [x] Assign passengers to drivers
- [x] View wheelchair accessible vehicle warnings
- [x] Check statistics display
- [x] Filter by upcoming/past/all
- [x] Responsive design works on mobile
- [x] Navigation link works
- [x] All modals open and close correctly

---

**Conversion Status: ✅ COMPLETE**

The Social Outings module is now fully functional in React with complete backend integration, availability checking, wheelchair accessible vehicle tracking, and schedule conflict detection for passengers.
