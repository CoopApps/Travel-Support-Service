import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { getDbClient } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Demo Data Templates
 * 150 customers and 30 drivers with realistic UK names, addresses, and schedules
 */

const DEMO_CUSTOMERS = [
  // Elderly customers with various mobility needs and paying organizations
  { first_name: 'Margaret', last_name: 'Thompson', phone: '07700 900001', email: 'margaret.thompson@example.com', address: '12 High Street, Sheffield', postcode: 'S1 2GE', mobility_needs: 'Wheelchair user', medical_notes: 'Requires ground floor pickup', paying_org: 'Sheffield City Council' },
  { first_name: 'Arthur', last_name: 'Davies', phone: '07700 900002', email: 'arthur.davies@example.com', address: '45 Church Lane, Rotherham', postcode: 'S60 2BX', mobility_needs: 'Walking frame', medical_notes: 'Needs assistance to vehicle', paying_org: 'Age UK Sheffield' },
  { first_name: 'Dorothy', last_name: 'Evans', phone: '07700 900003', email: 'dorothy.evans@example.com', address: '78 Park Road, Doncaster', postcode: 'DN1 3JQ', mobility_needs: 'Wheelchair user', medical_notes: 'Electric wheelchair', paying_org: 'NHS South Yorkshire ICB' },
  { first_name: 'George', last_name: 'Wilson', phone: '07700 900004', email: 'george.wilson@example.com', address: '23 Station Road, Barnsley', postcode: 'S70 2AB', mobility_needs: 'Walking stick', medical_notes: 'Slow walker', paying_org: 'Self-Pay' },
  { first_name: 'Betty', last_name: 'Roberts', phone: '07700 900005', email: 'betty.roberts@example.com', address: '56 Oak Avenue, Chesterfield', postcode: 'S40 1TY', mobility_needs: 'Wheelchair user', medical_notes: 'Manual wheelchair', paying_org: 'British Red Cross' },
  { first_name: 'William', last_name: 'Jones', phone: '07700 900006', email: 'william.jones@example.com', address: '89 Victoria Street, Sheffield', postcode: 'S3 7QL', mobility_needs: 'Walking frame', medical_notes: 'Requires extra time', paying_org: 'Rotherham Borough Council' },
  { first_name: 'Joyce', last_name: 'Brown', phone: '07700 900007', email: 'joyce.brown@example.com', address: '34 Meadow Lane, Rotherham', postcode: 'S61 4RB', mobility_needs: 'None', medical_notes: 'Independent', paying_org: 'Self-Pay' },
  { first_name: 'Albert', last_name: 'Taylor', phone: '07700 900008', email: 'albert.taylor@example.com', address: '67 Bridge Street, Doncaster', postcode: 'DN2 5FB', mobility_needs: 'Walking stick', medical_notes: 'Arthritis', paying_org: 'Macmillan Cancer Support' },
  { first_name: 'Doris', last_name: 'White', phone: '07700 900009', email: 'doris.white@example.com', address: '90 Castle Road, Barnsley', postcode: 'S71 3HP', mobility_needs: 'Wheelchair user', medical_notes: 'Requires ramp', paying_org: 'Barnsley Metropolitan Council' },
  { first_name: 'Frederick', last_name: 'Martin', phone: '07700 900010', email: 'frederick.martin@example.com', address: '12 Queen Street, Chesterfield', postcode: 'S41 8NG', mobility_needs: 'Walking frame', medical_notes: 'Balance issues', paying_org: 'Sheffield Carers Centre' },
  // Continue with varied names and locations (total 150)
  { first_name: 'Vera', last_name: 'Jackson', phone: '07700 900011', email: 'vera.jackson@example.com', address: '45 King Street, Sheffield', postcode: 'S1 3BR', mobility_needs: 'None', medical_notes: 'Good mobility', paying_org: 'Alzheimer\'s Society' },
  { first_name: 'Harold', last_name: 'Lewis', phone: '07700 900012', email: 'harold.lewis@example.com', address: '78 Mill Lane, Rotherham', postcode: 'S60 3TB', mobility_needs: 'Walking stick', medical_notes: 'Hearing aid user', paying_org: 'Scope Disability Charity' },
  { first_name: 'Ethel', last_name: 'Walker', phone: '07700 900013', email: 'ethel.walker@example.com', address: '23 School Road, Doncaster', postcode: 'DN3 2PQ', mobility_needs: 'Wheelchair user', medical_notes: 'Oxygen user', paying_org: 'Marie Curie' },
  { first_name: 'Norman', last_name: 'Hall', phone: '07700 900014', email: 'norman.hall@example.com', address: '56 Church Street, Barnsley', postcode: 'S72 8QW', mobility_needs: 'Walking frame', medical_notes: 'Recent hip surgery', paying_org: 'Independent Age' },
  { first_name: 'Gladys', last_name: 'Allen', phone: '07700 900015', email: 'gladys.allen@example.com', address: '89 Market Place, Chesterfield', postcode: 'S43 1DB', mobility_needs: 'None', medical_notes: 'Visually impaired', paying_org: 'Contact the Elderly' },
  // Add more customers with varied profiles (continuing to 150)
];

// Define paying organizations - realistic UK charities, councils, and healthcare providers
const PAYING_ORGS = [
  'Self-Pay',
  'Sheffield City Council',
  'Rotherham Borough Council',
  'Doncaster Council',
  'Barnsley Metropolitan Council',
  'Age UK Sheffield',
  'British Red Cross',
  'NHS South Yorkshire ICB',
  'Macmillan Cancer Support',
  'Sheffield Carers Centre',
  'Alzheimer\'s Society',
  'Scope Disability Charity',
  'Marie Curie',
  'Independent Age',
  'Contact the Elderly',
  'Royal Voluntary Service'
];

// Generate additional 135 customers programmatically
for (let i = 16; i <= 150; i++) {
  const firstNames = ['Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const streets = ['High Street', 'Main Road', 'Park Lane', 'Church Road', 'Station Street', 'Victoria Avenue', 'Albert Road', 'Queens Drive', 'King Street', 'Mill Lane'];
  const cities = ['Sheffield', 'Rotherham', 'Doncaster', 'Barnsley', 'Chesterfield'];
  const postcodes = ['S1 1AB', 'S60 2CD', 'DN1 3EF', 'S70 4GH', 'S40 5IJ'];
  const mobilityOptions = ['None', 'Walking stick', 'Walking frame', 'Wheelchair user', 'Mobility scooter'];
  const medicalOptions = ['Independent', 'Requires assistance', 'Oxygen user', 'Hearing aid user', 'Visually impaired', 'Diabetic', 'Heart condition'];

  DEMO_CUSTOMERS.push({
    first_name: firstNames[i % firstNames.length],
    last_name: lastNames[i % lastNames.length],
    phone: `07700 ${900000 + i}`,
    email: `customer${i}@example.com`,
    address: `${i} ${streets[i % streets.length]}, ${cities[i % cities.length]}`,
    postcode: postcodes[i % postcodes.length],
    mobility_needs: mobilityOptions[i % mobilityOptions.length],
    medical_notes: medicalOptions[i % medicalOptions.length],
    paying_org: PAYING_ORGS[i % PAYING_ORGS.length]
  });
}

const DEMO_DRIVERS = [
  { first_name: 'James', last_name: 'Anderson', phone: '07800 900001', email: 'james.anderson@demotransport.com', license_number: 'ANDER801234JA9AB', license_expiry: '2026-12-31', dbs_check_date: '2025-01-15', vehicle_type: '8-seater minibus' },
  { first_name: 'Sarah', last_name: 'Mitchell', phone: '07800 900002', email: 'sarah.mitchell@demotransport.com', license_number: 'MITCH802345SM9CD', license_expiry: '2027-03-15', dbs_check_date: '2025-02-10', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'David', last_name: 'Cooper', phone: '07800 900003', email: 'david.cooper@demotransport.com', license_number: 'COOPE803456DC9EF', license_expiry: '2026-08-20', dbs_check_date: '2024-11-20', vehicle_type: '8-seater minibus' },
  { first_name: 'Emma', last_name: 'Harrison', phone: '07800 900004', email: 'emma.harrison@demotransport.com', license_number: 'HARRI804567EH9GH', license_expiry: '2027-06-10', dbs_check_date: '2025-03-05', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Michael', last_name: 'Bennett', phone: '07800 900005', email: 'michael.bennett@demotransport.com', license_number: 'BENNE805678MB9IJ', license_expiry: '2026-11-25', dbs_check_date: '2024-12-15', vehicle_type: '8-seater minibus' },
  { first_name: 'Lisa', last_name: 'Campbell', phone: '07800 900006', email: 'lisa.campbell@demotransport.com', license_number: 'CAMPB806789LC9KL', license_expiry: '2027-04-18', dbs_check_date: '2025-01-20', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Andrew', last_name: 'Foster', phone: '07800 900007', email: 'andrew.foster@demotransport.com', license_number: 'FOSTE807890AF9MN', license_expiry: '2026-09-30', dbs_check_date: '2024-10-25', vehicle_type: '8-seater minibus' },
  { first_name: 'Rachel', last_name: 'Hughes', phone: '07800 900008', email: 'rachel.hughes@demotransport.com', license_number: 'HUGHE808901RH9OP', license_expiry: '2027-02-14', dbs_check_date: '2025-02-28', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Paul', last_name: 'Richardson', phone: '07800 900009', email: 'paul.richardson@demotransport.com', license_number: 'RICHA809012PR9QR', license_expiry: '2026-07-22', dbs_check_date: '2024-09-10', vehicle_type: '8-seater minibus' },
  { first_name: 'Helen', last_name: 'Baker', phone: '07800 900010', email: 'helen.baker@demotransport.com', license_number: 'BAKER810123HB9ST', license_expiry: '2027-05-05', dbs_check_date: '2025-04-01', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Tom', last_name: 'Turner', phone: '07800 900011', email: 'tom.turner@demotransport.com', license_number: 'TURNE811234TT9UV', license_expiry: '2026-06-15', dbs_check_date: '2025-01-10', vehicle_type: '8-seater minibus' },
  { first_name: 'Sophie', last_name: 'Phillips', phone: '07800 900012', email: 'sophie.phillips@demotransport.com', license_number: 'PHILL812345SP9WX', license_expiry: '2027-08-20', dbs_check_date: '2025-03-15', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Mark', last_name: 'Morgan', phone: '07800 900013', email: 'mark.morgan@demotransport.com', license_number: 'MORGA813456MM9YZ', license_expiry: '2026-10-12', dbs_check_date: '2024-12-05', vehicle_type: '16-seater minibus' },
  { first_name: 'Laura', last_name: 'Rogers', phone: '07800 900014', email: 'laura.rogers@demotransport.com', license_number: 'ROGER814567LR9AB', license_expiry: '2027-04-25', dbs_check_date: '2025-02-20', vehicle_type: '8-seater minibus' },
  { first_name: 'Simon', last_name: 'Bell', phone: '07800 900015', email: 'simon.bell@demotransport.com', license_number: 'BELLS815678SB9CD', license_expiry: '2026-11-30', dbs_check_date: '2024-11-15', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Kate', last_name: 'Murphy', phone: '07800 900016', email: 'kate.murphy@demotransport.com', license_number: 'MURPH816789KM9EF', license_expiry: '2027-01-18', dbs_check_date: '2025-04-10', vehicle_type: '8-seater minibus' },
  { first_name: 'Ben', last_name: 'Cook', phone: '07800 900017', email: 'ben.cook@demotransport.com', license_number: 'COOKB817890BC9GH', license_expiry: '2026-05-22', dbs_check_date: '2024-10-30', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Amy', last_name: 'Ward', phone: '07800 900018', email: 'amy.ward@demotransport.com', license_number: 'WARDA818901AW9IJ', license_expiry: '2027-09-08', dbs_check_date: '2025-01-25', vehicle_type: '16-seater minibus' },
  { first_name: 'Chris', last_name: 'Hill', phone: '07800 900019', email: 'chris.hill@demotransport.com', license_number: 'HILLC819012CH9KL', license_expiry: '2026-07-14', dbs_check_date: '2024-12-20', vehicle_type: '8-seater minibus' },
  { first_name: 'Hannah', last_name: 'Shaw', phone: '07800 900020', email: 'hannah.shaw@demotransport.com', license_number: 'SHAWH820123HS9MN', license_expiry: '2027-03-30', dbs_check_date: '2025-02-15', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Oliver', last_name: 'Green', phone: '07800 900021', email: 'oliver.green@demotransport.com', license_number: 'GREEN821234OG9OP', license_expiry: '2026-12-05', dbs_check_date: '2025-03-01', vehicle_type: '8-seater minibus' },
  { first_name: 'Emily', last_name: 'Wood', phone: '07800 900022', email: 'emily.wood@demotransport.com', license_number: 'WOODE822345EW9QR', license_expiry: '2027-06-18', dbs_check_date: '2025-01-05', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Daniel', last_name: 'Price', phone: '07800 900023', email: 'daniel.price@demotransport.com', license_number: 'PRICE823456DP9ST', license_expiry: '2026-08-28', dbs_check_date: '2024-11-10', vehicle_type: '16-seater minibus' },
  { first_name: 'Grace', last_name: 'Parker', phone: '07800 900024', email: 'grace.parker@demotransport.com', license_number: 'PARKE824567GP9UV', license_expiry: '2027-02-12', dbs_check_date: '2025-04-05', vehicle_type: '8-seater minibus' },
  { first_name: 'Jack', last_name: 'Scott', phone: '07800 900025', email: 'jack.scott@demotransport.com', license_number: 'SCOTT825678JS9WX', license_expiry: '2026-10-20', dbs_check_date: '2024-12-28', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Olivia', last_name: 'Young', phone: '07800 900026', email: 'olivia.young@demotransport.com', license_number: 'YOUNG826789OY9YZ', license_expiry: '2027-05-15', dbs_check_date: '2025-02-08', vehicle_type: '8-seater minibus' },
  { first_name: 'Thomas', last_name: 'King', phone: '07800 900027', email: 'thomas.king@demotransport.com', license_number: 'KINGT827890TK9AB', license_expiry: '2026-09-22', dbs_check_date: '2024-10-18', vehicle_type: 'Wheelchair accessible van' },
  { first_name: 'Jessica', last_name: 'Wright', phone: '07800 900028', email: 'jessica.wright@demotransport.com', license_number: 'WRIGH828901JW9CD', license_expiry: '2027-07-30', dbs_check_date: '2025-03-20', vehicle_type: '16-seater minibus' },
  { first_name: 'George', last_name: 'Lewis', phone: '07800 900029', email: 'george.lewis@demotransport.com', license_number: 'LEWIS829012GL9EF', license_expiry: '2026-04-08', dbs_check_date: '2025-01-12', vehicle_type: '8-seater minibus' },
  { first_name: 'Amelia', last_name: 'Roberts', phone: '07800 900030', email: 'amelia.roberts@demotransport.com', license_number: 'ROBER830123AR9GH', license_expiry: '2027-11-16', dbs_check_date: '2025-04-18', vehicle_type: 'Wheelchair accessible van' },
];

// Vehicle data - 40 vehicles with mixed ownership types
const DEMO_VEHICLES = [
  // Personal cars (driver-owned) - 20 vehicles
  { registration: 'AB12CDE', make: 'Ford', model: 'Focus', year: 2019, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 0 },
  { registration: 'CD34EFG', make: 'Vauxhall', model: 'Corsa', year: 2020, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 1 },
  { registration: 'EF56GHI', make: 'Toyota', model: 'Yaris', year: 2018, vehicle_type: 'Car', seats: 5, fuel_type: 'Hybrid', ownership: 'personal', wheelchair_accessible: false, driver_index: 2 },
  { registration: 'GH78IJK', make: 'Honda', model: 'Civic', year: 2021, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 3 },
  { registration: 'IJ90KLM', make: 'Nissan', model: 'Qashqai', year: 2019, vehicle_type: 'SUV', seats: 5, fuel_type: 'Diesel', ownership: 'personal', wheelchair_accessible: false, driver_index: 4 },
  { registration: 'KL12MNO', make: 'Volkswagen', model: 'Golf', year: 2020, vehicle_type: 'Car', seats: 5, fuel_type: 'Diesel', ownership: 'personal', wheelchair_accessible: false, driver_index: 5 },
  { registration: 'MN34OPQ', make: 'Peugeot', model: '208', year: 2019, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 6 },
  { registration: 'OP56QRS', make: 'Renault', model: 'Clio', year: 2021, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 7 },
  { registration: 'QR78STU', make: 'Mazda', model: 'CX-5', year: 2020, vehicle_type: 'SUV', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 8 },
  { registration: 'ST90UVW', make: 'Hyundai', model: 'i30', year: 2019, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 9 },
  { registration: 'UV12WXY', make: 'Kia', model: 'Sportage', year: 2021, vehicle_type: 'SUV', seats: 5, fuel_type: 'Diesel', ownership: 'personal', wheelchair_accessible: false, driver_index: 10 },
  { registration: 'WX34YZA', make: 'Seat', model: 'Ibiza', year: 2018, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 11 },
  { registration: 'YZ56ABC', make: 'Skoda', model: 'Octavia', year: 2020, vehicle_type: 'Car', seats: 5, fuel_type: 'Diesel', ownership: 'personal', wheelchair_accessible: false, driver_index: 12 },
  { registration: 'AB78CDE', make: 'Mini', model: 'Cooper', year: 2019, vehicle_type: 'Car', seats: 4, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 13 },
  { registration: 'CD90EFG', make: 'Fiat', model: '500', year: 2021, vehicle_type: 'Car', seats: 4, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 14 },
  { registration: 'EF12GHI', make: 'Citroen', model: 'C3', year: 2020, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 15 },
  { registration: 'GH34IJK', make: 'Dacia', model: 'Sandero', year: 2019, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 16 },
  { registration: 'IJ56KLM', make: 'Suzuki', model: 'Swift', year: 2020, vehicle_type: 'Car', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 17 },
  { registration: 'KL78MNO', make: 'Mitsubishi', model: 'ASX', year: 2018, vehicle_type: 'SUV', seats: 5, fuel_type: 'Petrol', ownership: 'personal', wheelchair_accessible: false, driver_index: 18 },
  { registration: 'MN90OPQ', make: 'Volvo', model: 'XC40', year: 2021, vehicle_type: 'SUV', seats: 5, fuel_type: 'Hybrid', ownership: 'personal', wheelchair_accessible: false, driver_index: 19 },

  // Company-owned vehicles (8-seater minibuses) - 13 vehicles
  { registration: 'OP12QRS', make: 'Ford', model: 'Transit', year: 2020, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 20, insurance_monthly: 250, mot_date: '2026-03-15' },
  { registration: 'QR34STU', make: 'Peugeot', model: 'Boxer', year: 2019, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 21, insurance_monthly: 250, mot_date: '2026-05-20' },
  { registration: 'ST56UVW', make: 'Mercedes', model: 'Sprinter', year: 2021, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 22, insurance_monthly: 280, mot_date: '2027-01-10' },
  { registration: 'UV78WXY', make: 'Volkswagen', model: 'Transporter', year: 2020, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 23, insurance_monthly: 265, mot_date: '2026-07-08' },
  { registration: 'WX90YZA', make: 'Renault', model: 'Master', year: 2019, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 24, insurance_monthly: 240, mot_date: '2026-02-25' },
  { registration: 'YZ12ABC', make: 'Iveco', model: 'Daily', year: 2020, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 25, insurance_monthly: 255, mot_date: '2026-09-12' },
  { registration: 'AB34CDE', make: 'Citroen', model: 'Relay', year: 2021, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 26, insurance_monthly: 260, mot_date: '2027-04-18' },
  { registration: 'CD56EFG', make: 'Fiat', model: 'Ducato', year: 2019, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: 27, insurance_monthly: 245, mot_date: '2026-06-30' },
  { registration: 'EF78GHI', make: 'Nissan', model: 'NV400', year: 2020, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: null, insurance_monthly: 250, mot_date: '2026-11-05' },
  { registration: 'GH90IJK', make: 'LDV', model: 'V80', year: 2021, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: null, insurance_monthly: 235, mot_date: '2027-02-14' },
  { registration: 'IJ12KLM', make: 'Toyota', model: 'Hiace', year: 2019, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: null, insurance_monthly: 245, mot_date: '2026-08-22' },
  { registration: 'KL34MNO', make: 'Maxus', model: 'Deliver 9', year: 2020, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Electric', ownership: 'owned', wheelchair_accessible: false, driver_index: null, insurance_monthly: 290, mot_date: '2026-10-18' },
  { registration: 'MN56OPQ', make: 'Ford', model: 'Transit Custom', year: 2021, vehicle_type: 'Minibus', seats: 8, fuel_type: 'Diesel', ownership: 'owned', wheelchair_accessible: false, driver_index: null, insurance_monthly: 255, mot_date: '2027-03-25' },

  // Wheelchair accessible vehicles (leased by company) - 7 vehicles
  { registration: 'OP78QRS', make: 'Peugeot', model: 'Boxer WAV', year: 2021, vehicle_type: 'WAV', seats: 6, fuel_type: 'Diesel', ownership: 'leased', wheelchair_accessible: true, driver_index: 28, lease_monthly: 450, insurance_monthly: 320, mot_date: '2027-01-08', last_service: '2025-11-15' },
  { registration: 'QR90STU', make: 'Fiat', model: 'Ducato WAV', year: 2020, vehicle_type: 'WAV', seats: 6, fuel_type: 'Diesel', ownership: 'leased', wheelchair_accessible: true, driver_index: 29, lease_monthly: 420, insurance_monthly: 310, mot_date: '2026-09-20', last_service: '2025-10-22' },
  { registration: 'ST12UVW', make: 'Ford', model: 'Transit WAV', year: 2021, vehicle_type: 'WAV', seats: 6, fuel_type: 'Diesel', ownership: 'leased', wheelchair_accessible: true, driver_index: null, lease_monthly: 465, insurance_monthly: 330, mot_date: '2027-02-14', last_service: '2025-12-05' },
  { registration: 'UV34WXY', make: 'Volkswagen', model: 'Caravelle WAV', year: 2020, vehicle_type: 'WAV', seats: 7, fuel_type: 'Diesel', ownership: 'leased', wheelchair_accessible: true, driver_index: null, lease_monthly: 510, insurance_monthly: 340, mot_date: '2026-11-18', last_service: '2025-09-30' },
  { registration: 'WX56YZA', make: 'Mercedes', model: 'Sprinter WAV', year: 2021, vehicle_type: 'WAV', seats: 6, fuel_type: 'Diesel', ownership: 'leased', wheelchair_accessible: true, driver_index: null, lease_monthly: 540, insurance_monthly: 360, mot_date: '2027-04-22', last_service: '2025-11-28' },
  { registration: 'YZ78ABC', make: 'Renault', model: 'Master WAV', year: 2020, vehicle_type: 'WAV', seats: 6, fuel_type: 'Diesel', ownership: 'leased', wheelchair_accessible: true, driver_index: null, lease_monthly: 430, insurance_monthly: 315, mot_date: '2026-08-10', last_service: '2025-10-12' },
  { registration: 'AB90CDE', make: 'Citroen', model: 'Relay WAV', year: 2021, vehicle_type: 'WAV', seats: 6, fuel_type: 'Diesel', ownership: 'leased', wheelchair_accessible: true, driver_index: null, lease_monthly: 445, insurance_monthly: 325, mot_date: '2027-05-15', last_service: '2025-12-01' },
];

// Fuel cards - Only for contracted employees (24 out of 30 drivers)
// Drivers 0-23 are contracted and get fuel cards
// Drivers 24-29 are self-employed and must submit fuel receipts
const DEMO_FUEL_CARDS = [
  // Fuel cards for contracted drivers 0-19 (standard vehicles)
  { card_last_four: '4500', provider: 'Shell', driver_index: 0, vehicle_index: 0, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4501', provider: 'BP', driver_index: 1, vehicle_index: 1, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4502', provider: 'Esso', driver_index: 2, vehicle_index: 2, monthly_limit: 550, daily_limit: 100 },
  { card_last_four: '4503', provider: 'Shell', driver_index: 3, vehicle_index: 3, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4504', provider: 'Texaco', driver_index: 4, vehicle_index: 4, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4505', provider: 'BP', driver_index: 5, vehicle_index: 5, monthly_limit: 550, daily_limit: 100 },
  { card_last_four: '4506', provider: 'Shell', driver_index: 6, vehicle_index: 6, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4507', provider: 'Esso', driver_index: 7, vehicle_index: 7, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4508', provider: 'BP', driver_index: 8, vehicle_index: 8, monthly_limit: 550, daily_limit: 100 },
  { card_last_four: '4509', provider: 'Shell', driver_index: 9, vehicle_index: 9, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4510', provider: 'Texaco', driver_index: 10, vehicle_index: 10, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4511', provider: 'BP', driver_index: 11, vehicle_index: 11, monthly_limit: 550, daily_limit: 100 },
  { card_last_four: '4512', provider: 'Shell', driver_index: 12, vehicle_index: 12, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4513', provider: 'Esso', driver_index: 13, vehicle_index: 13, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4514', provider: 'BP', driver_index: 14, vehicle_index: 14, monthly_limit: 550, daily_limit: 100 },
  { card_last_four: '4515', provider: 'Shell', driver_index: 15, vehicle_index: 15, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4516', provider: 'Texaco', driver_index: 16, vehicle_index: 16, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4517', provider: 'BP', driver_index: 17, vehicle_index: 17, monthly_limit: 550, daily_limit: 100 },
  { card_last_four: '4518', provider: 'Shell', driver_index: 18, vehicle_index: 18, monthly_limit: 600, daily_limit: 100 },
  { card_last_four: '4519', provider: 'Esso', driver_index: 19, vehicle_index: 19, monthly_limit: 600, daily_limit: 100 },

  // Fuel cards for contracted minibus drivers (drivers 20-23)
  { card_last_four: '4520', provider: 'Shell', driver_index: 20, vehicle_index: 20, monthly_limit: 650, daily_limit: 100 },
  { card_last_four: '4521', provider: 'BP', driver_index: 21, vehicle_index: 21, monthly_limit: 650, daily_limit: 100 },
  { card_last_four: '4522', provider: 'Esso', driver_index: 22, vehicle_index: 22, monthly_limit: 650, daily_limit: 100 },
  { card_last_four: '4523', provider: 'Shell', driver_index: 23, vehicle_index: 23, monthly_limit: 650, daily_limit: 100 },
];

/**
 * POST /api/tenants/:tenantId/demo-data/import
 * Import demo customers, drivers, vehicles, and fuel cards
 */
router.post(
  '/tenants/:tenantId/demo-data/import',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const client = await getDbClient();

    let customersImported = 0;
    let driversImported = 0;
    let vehiclesImported = 0;
    let fuelCardsImported = 0;

    try {
      await client.query('BEGIN');

      // Check if demo data already exists
      const checkCustomersQuery = `
        SELECT COUNT(*) as count FROM tenant_customers
        WHERE tenant_id = $1 AND email LIKE '%@example.com'
      `;
      const checkFuelCardsQuery = `
        SELECT COUNT(*) as count FROM tenant_fuelcards
        WHERE tenant_id = $1 AND card_number_last_four BETWEEN '4500' AND '4523'
      `;

      const [customersCheck, fuelCardsCheck] = await Promise.all([
        client.query(checkCustomersQuery, [tenantId]),
        client.query(checkFuelCardsQuery, [tenantId])
      ]);

      if (parseInt(customersCheck.rows[0].count) > 0 || parseInt(fuelCardsCheck.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          error: 'Demo data already imported. Please remove existing demo data first.',
          details: `Found ${customersCheck.rows[0].count} customers and ${fuelCardsCheck.rows[0].count} fuel cards`
        });
      }

      // Import customers
      for (const customer of DEMO_CUSTOMERS) {
        const customerName = `${customer.first_name} ${customer.last_name}`;
        const customerQuery = `
          INSERT INTO tenant_customers (
            tenant_id, name, phone, email,
            address, address_line_2, city, county, postcode,
            paying_org, has_split_payment, provider_split, payment_split,
            schedule, emergency_contact_name, emergency_contact_phone,
            mobility_requirements, medical_notes, medication_notes, driver_notes,
            is_active, section_19_eligible, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, true, true, NOW(), NOW()
          )
        `;

        await client.query(customerQuery, [
          tenantId,
          customerName,
          customer.phone,
          customer.email,
          customer.address,
          '', // address_line_2
          '', // city (could extract from address)
          '', // county
          customer.postcode,
          customer.paying_org || 'Self-Pay', // paying_org
          false, // has_split_payment
          JSON.stringify({}), // provider_split
          JSON.stringify({}), // payment_split
          JSON.stringify({}), // schedule
          '', // emergency_contact_name
          '', // emergency_contact_phone
          customer.mobility_needs, // mobility_requirements
          customer.medical_notes,
          '', // medication_notes
          '' // driver_notes
        ]);
        customersImported++;
      }

      // Import drivers (24 contracted, 6 self-employed)
      for (let i = 0; i < DEMO_DRIVERS.length; i++) {
        const driver = DEMO_DRIVERS[i];
        const driverName = `${driver.first_name} ${driver.last_name}`;

        // First 24 drivers are contracted, last 6 are self-employed
        const isContracted = i < 24;
        const employmentType = isContracted ? 'contracted' : 'self-employed';
        const salaryStructure = isContracted
          ? JSON.stringify({ type: 'hourly', rate: 12.50 })
          : JSON.stringify({ type: 'self-employed', rate: 15.00 });

        const driverQuery = `
          INSERT INTO tenant_drivers (
            tenant_id, name, phone, email,
            license_number, license_expiry, license_class,
            vehicle_type, weekly_wage, weekly_lease, vehicle_id, assigned_vehicle,
            dbs_check_date, dbs_expiry_date,
            section19_permit, section19_expiry,
            section19_driver_auth, section19_driver_expiry,
            section22_driver_auth, section22_driver_expiry,
            mot_date, mot_expiry_date,
            employment_type, employment_status, salary_structure,
            start_date, contract_end_date,
            driver_roles, holidays, availability_restrictions, qualifications,
            emergency_contact, emergency_phone, preferred_hours, notes,
            is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
            $28, $29, $30, $31, $32, $33, $34, $35, true, NOW(), NOW()
          )
        `;

        await client.query(driverQuery, [
          tenantId,
          driverName,
          driver.phone,
          driver.email,
          driver.license_number,
          driver.license_expiry,
          'D', // license_class (standard car license)
          driver.vehicle_type || 'own', // vehicle_type
          0, // weekly_wage (default)
          0, // weekly_lease (default)
          null, // vehicle_id
          null, // assigned_vehicle
          driver.dbs_check_date,
          null, // dbs_expiry_date
          false, // section19_permit
          null, // section19_expiry
          false, // section19_driver_auth
          null, // section19_driver_expiry
          false, // section22_driver_auth
          null, // section22_driver_expiry
          null, // mot_date
          null, // mot_expiry_date
          employmentType, // employment_type (contracted or self-employed)
          'active', // employment_status
          salaryStructure, // salary_structure (JSON object)
          new Date().toISOString().split('T')[0], // start_date (today)
          null, // contract_end_date
          null, // driver_roles (can be null)
          null, // holidays (can be null)
          null, // availability_restrictions (can be null)
          null, // qualifications (can be null)
          '', // emergency_contact
          '', // emergency_phone
          '', // preferred_hours
          '' // notes
        ]);
        driversImported++;
      }

      // Get driver IDs for vehicle assignment
      const driversQuery = `
        SELECT driver_id, email FROM tenant_drivers
        WHERE tenant_id = $1 AND email LIKE '%@demotransport.com'
        ORDER BY driver_id ASC
      `;
      const driversResult = await client.query(driversQuery, [tenantId]);
      const driverIds = driversResult.rows.map(row => row.driver_id);

      // Import vehicles
      for (const vehicle of DEMO_VEHICLES) {
        const driverId = vehicle.driver_index !== null && vehicle.driver_index < driverIds.length
          ? driverIds[vehicle.driver_index]
          : null;

        const vehicleQuery = `
          INSERT INTO tenant_vehicles (
            tenant_id, registration, make, model, year, vehicle_type, seats, fuel_type,
            ownership, wheelchair_accessible, driver_id,
            mot_date, insurance_expiry, last_service_date, service_interval_months,
            lease_monthly_cost, insurance_monthly_cost, mileage,
            is_basic_record, is_active, archived, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true, false, NOW(), NOW()
          )
        `;

        // Calculate insurance expiry (1 year from now)
        const insuranceExpiry = new Date();
        insuranceExpiry.setFullYear(insuranceExpiry.getFullYear() + 1);

        await client.query(vehicleQuery, [
          tenantId,
          vehicle.registration,
          vehicle.make,
          vehicle.model,
          vehicle.year,
          vehicle.vehicle_type,
          vehicle.seats,
          vehicle.fuel_type,
          vehicle.ownership,
          vehicle.wheelchair_accessible,
          driverId,
          vehicle.mot_date || null,
          insuranceExpiry.toISOString().split('T')[0],
          vehicle.last_service || null,
          6, // service_interval_months
          vehicle.lease_monthly || 0,
          vehicle.insurance_monthly || 0,
          Math.floor(Math.random() * 50000) + 10000, // random mileage between 10k-60k
          false // is_basic_record
        ]);
        vehiclesImported++;
      }

      // Update some customers to be wheelchair users (matching the 7 wheelchair accessible vehicles)
      const wheelchairCustomerIndexes = [0, 2, 4, 8, 12, 23, 29]; // Select specific customers to need wheelchair access
      const customerQuery = `
        SELECT customer_id FROM tenant_customers
        WHERE tenant_id = $1 AND email LIKE '%@example.com'
        ORDER BY customer_id ASC
      `;
      const customersResult = await client.query(customerQuery, [tenantId]);

      for (const index of wheelchairCustomerIndexes) {
        if (index < customersResult.rows.length) {
          const customerId = customersResult.rows[index].customer_id;
          await client.query(`
            UPDATE tenant_customers
            SET mobility_requirements = 'Wheelchair user - requires wheelchair accessible vehicle',
                medical_notes = 'Must use wheelchair accessible transport'
            WHERE tenant_id = $1 AND customer_id = $2
          `, [tenantId, customerId]);
        }
      }

      // Get vehicle IDs for fuel card assignment
      const vehiclesQuery = `
        SELECT vehicle_id FROM tenant_vehicles
        WHERE tenant_id = $1
        ORDER BY vehicle_id ASC
      `;
      const vehiclesResult = await client.query(vehiclesQuery, [tenantId]);
      const vehicleIds = vehiclesResult.rows.map(row => row.vehicle_id);

      // Delete any existing fuel cards with the same card numbers before importing
      // This prevents duplicate key constraint violations
      await client.query(`
        DELETE FROM tenant_fuelcards
        WHERE tenant_id = $1 AND card_number_last_four BETWEEN '4500' AND '4523'
      `, [tenantId]);

      // Import fuel cards (only for company-owned/leased vehicles)
      for (const fuelCard of DEMO_FUEL_CARDS) {
        const driverId = fuelCard.driver_index !== null && fuelCard.driver_index < driverIds.length
          ? driverIds[fuelCard.driver_index]
          : null;

        const vehicleId = fuelCard.vehicle_index !== null && fuelCard.vehicle_index < vehicleIds.length
          ? vehicleIds[fuelCard.vehicle_index]
          : null;

        const fuelCardQuery = `
          INSERT INTO tenant_fuelcards (
            tenant_id, card_number_last_four, provider, pin,
            driver_id, vehicle_id, monthly_limit, daily_limit,
            status, is_active, archived, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, NOW(), NOW()
          )
        `;

        await client.query(fuelCardQuery, [
          tenantId,
          fuelCard.card_last_four,
          fuelCard.provider,
          null, // pin (not stored for security)
          driverId,
          vehicleId,
          fuelCard.monthly_limit,
          fuelCard.daily_limit,
          'active' // status
        ]);
        fuelCardsImported++;
      }

      await client.query('COMMIT');
      client.release();

      logger.info('Demo data imported successfully', {
        tenantId,
        customersImported,
        driversImported,
        vehiclesImported,
        fuelCardsImported
      });

      return res.json({
        success: true,
        message: 'Demo data imported successfully',
        customersImported,
        driversImported,
        vehiclesImported,
        fuelCardsImported
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      client.release();
      logger.error('Error importing demo data', {
        error: error.message,
        stack: error.stack,
        tenantId,
        customersImported,
        driversImported,
        vehiclesImported
      });
      return res.status(500).json({
        error: 'Failed to import demo data',
        message: error.message,
        details: error.toString(),
        position: vehiclesImported > 0
          ? `Failed after importing ${customersImported} customers, ${driversImported} drivers, ${vehiclesImported} vehicles`
          : driversImported > 0
            ? `Failed after importing ${customersImported} customers, ${driversImported} drivers`
            : customersImported > 0
              ? `Failed after importing ${customersImported} customers`
              : 'Failed during customer import'
      });
    }
  })
);

/**
 * DELETE /api/tenants/:tenantId/demo-data/remove
 * Remove all demo customers and drivers
 */
router.delete(
  '/tenants/:tenantId/demo-data/remove',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const client = await getDbClient();

    try {
      await client.query('BEGIN');

      // Delete fuel cards first (they reference drivers and vehicles)
      // Delete all fuel cards with card_number_last_four between 4500-4523 (24 demo cards)
      const deleteFuelCardsQuery = `
        DELETE FROM tenant_fuelcards
        WHERE tenant_id = $1 AND card_number_last_four BETWEEN '4500' AND '4523'
      `;
      const fuelCardsResult = await client.query(deleteFuelCardsQuery, [tenantId]);

      // Delete demo vehicles (to avoid foreign key constraints)
      const deleteVehiclesQuery = `
        DELETE FROM tenant_vehicles
        WHERE tenant_id = $1 AND registration IN (
          SELECT unnest(ARRAY['AB12CDE', 'CD34EFG', 'EF56GHI', 'GH78IJK', 'IJ90KLM', 'KL12MNO',
          'MN34OPQ', 'OP56QRS', 'QR78STU', 'ST90UVW', 'UV12WXY', 'WX34YZA', 'YZ56ABC', 'AB78CDE',
          'CD90EFG', 'EF12GHI', 'GH34IJK', 'IJ56KLM', 'KL78MNO', 'MN90OPQ', 'OP12QRS', 'QR34STU',
          'ST56UVW', 'UV78WXY', 'WX90YZA', 'YZ12ABC', 'AB34CDE', 'CD56EFG', 'EF78GHI', 'GH90IJK',
          'IJ12KLM', 'KL34MNO', 'MN56OPQ', 'OP78QRS', 'QR90STU', 'ST12UVW', 'UV34WXY', 'WX56YZA',
          'YZ78ABC', 'AB90CDE'])
        )
      `;
      const vehiclesResult = await client.query(deleteVehiclesQuery, [tenantId]);

      // Delete demo customers (those with @example.com emails)
      const deleteCustomersQuery = `
        DELETE FROM tenant_customers
        WHERE tenant_id = $1 AND email LIKE '%@example.com'
      `;
      const customersResult = await client.query(deleteCustomersQuery, [tenantId]);

      // Delete demo drivers (those with @demotransport.com emails)
      const deleteDriversQuery = `
        DELETE FROM tenant_drivers
        WHERE tenant_id = $1 AND email LIKE '%@demotransport.com'
      `;
      const driversResult = await client.query(deleteDriversQuery, [tenantId]);

      await client.query('COMMIT');
      client.release();

      const customersRemoved = customersResult.rowCount || 0;
      const driversRemoved = driversResult.rowCount || 0;
      const vehiclesRemoved = vehiclesResult.rowCount || 0;
      const fuelCardsRemoved = fuelCardsResult.rowCount || 0;

      logger.info('Demo data removed successfully', {
        tenantId,
        customersRemoved,
        driversRemoved,
        vehiclesRemoved,
        fuelCardsRemoved
      });

      return res.json({
        success: true,
        message: 'Demo data removed successfully',
        customersRemoved,
        driversRemoved,
        vehiclesRemoved,
        fuelCardsRemoved
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      client.release();
      logger.error('Error removing demo data', { error, tenantId });
      return res.status(500).json({
        error: 'Failed to remove demo data',
        details: error.message
      });
    }
  })
);

/**
 * GET /api/tenants/:tenantId/demo-data/status
 * Check if demo data is currently imported
 */
router.get(
  '/tenants/:tenantId/demo-data/status',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const client = await getDbClient();

    try {
      const customersQuery = `
        SELECT COUNT(*) as count FROM tenant_customers
        WHERE tenant_id = $1 AND email LIKE '%@example.com'
      `;
      const driversQuery = `
        SELECT COUNT(*) as count FROM tenant_drivers
        WHERE tenant_id = $1 AND email LIKE '%@demotransport.com'
      `;
      const vehiclesQuery = `
        SELECT COUNT(*) as count FROM tenant_vehicles
        WHERE tenant_id = $1 AND registration IN (
          SELECT unnest(ARRAY['AB12CDE', 'CD34EFG', 'EF56GHI', 'GH78IJK', 'IJ90KLM', 'KL12MNO',
          'MN34OPQ', 'OP56QRS', 'QR78STU', 'ST90UVW', 'UV12WXY', 'WX34YZA', 'YZ56ABC', 'AB78CDE',
          'CD90EFG', 'EF12GHI', 'GH34IJK', 'IJ56KLM', 'KL78MNO', 'MN90OPQ', 'OP12QRS', 'QR34STU',
          'ST56UVW', 'UV78WXY', 'WX90YZA', 'YZ12ABC', 'AB34CDE', 'CD56EFG', 'EF78GHI', 'GH90IJK',
          'IJ12KLM', 'KL34MNO', 'MN56OPQ', 'OP78QRS', 'QR90STU', 'ST12UVW', 'UV34WXY', 'WX56YZA',
          'YZ78ABC', 'AB90CDE'])
        )
      `;

      const [customersResult, driversResult, vehiclesResult] = await Promise.all([
        client.query(customersQuery, [tenantId]),
        client.query(driversQuery, [tenantId]),
        client.query(vehiclesQuery, [tenantId])
      ]);

      client.release();

      const customerCount = parseInt(customersResult.rows[0].count);
      const driverCount = parseInt(driversResult.rows[0].count);
      const vehicleCount = parseInt(vehiclesResult.rows[0].count);
      const isImported = customerCount > 0 || driverCount > 0 || vehicleCount > 0;

      return res.json({
        success: true,
        isImported,
        customerCount,
        driverCount,
        vehicleCount
      });
    } catch (error: any) {
      client.release();
      logger.error('Error checking demo data status', { error, tenantId });
      return res.status(500).json({
        error: 'Failed to check demo data status',
        details: error.message
      });
    }
  })
);

export default router;
