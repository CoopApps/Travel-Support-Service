import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const TENANT_ID = 1; // Demo Transport Company

// ==================== DATA ARRAYS ====================

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna',
  'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Alexander', 'Rachel', 'Patrick', 'Catherine', 'Frank', 'Carolyn', 'Jack', 'Janet',
  'Dennis', 'Ruth', 'Jerry', 'Maria', 'Tyler', 'Heather', 'Aaron', 'Diane',
  'Jose', 'Virginia', 'Adam', 'Julie', 'Henry', 'Joyce', 'Nathan', 'Victoria',
  'Douglas', 'Olivia', 'Zachary', 'Kelly', 'Peter', 'Christina', 'Kyle', 'Lauren',
  'Walter', 'Joan', 'Ethan', 'Evelyn', 'Jeremy', 'Judith', 'Harold', 'Megan',
  'Keith', 'Cheryl', 'Christian', 'Andrea', 'Roger', 'Hannah', 'Noah', 'Martha',
  'Gerald', 'Jacqueline', 'Carl', 'Frances', 'Terry', 'Gloria', 'Sean', 'Ann',
  'Austin', 'Teresa', 'Arthur', 'Kathryn', 'Lawrence', 'Sara', 'Jesse', 'Janice'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell'
];

const STREET_NAMES = [
  'Oak Street', 'Maple Avenue', 'Cedar Lane', 'Pine Road', 'Elm Drive',
  'Birch Close', 'Willow Way', 'Ash Grove', 'Holly Court', 'Ivy Gardens',
  'Rose Terrace', 'Daisy Crescent', 'Lily Path', 'Jasmine Walk', 'Violet Square',
  'Meadow Lane', 'Hill View', 'Valley Road', 'Riverside Drive', 'Lakeside Avenue',
  'Park Street', 'Garden Way', 'Forest Road', 'Woodland Path', 'Green Lane',
  'High Street', 'Church Road', 'School Lane', 'Station Road', 'Bridge Street'
];

const ACCESSIBILITY_NEEDS = [
  { type: 'Wheelchair User', weight: 30 },
  { type: 'Walking Frame', weight: 25 },
  { type: 'Mobility Scooter', weight: 20 },
  { type: 'Ambulatory', weight: 15 },
  { type: 'Walking Stick', weight: 10 }
];

const DRIVER_NAMES = [
  'Alex Turner', 'Ben Clarke', 'Chris Davies', 'David Foster', 'Emma Harris',
  'Fiona Jenkins', 'Gary Lewis', 'Hannah Moore', 'Ian Phillips', 'Jane Roberts',
  'Kevin Smith', 'Laura Taylor', 'Mike Wilson', 'Nina Anderson', 'Oliver Brown',
  'Paula Cooper', 'Quinn Edwards', 'Rachel Green', 'Sam Hughes', 'Tina King',
  'Uma Mitchell', 'Victor Nelson', 'Wendy Parker', 'Xavier Reed', 'Yara Scott',
  'Zach Thompson', 'Amy Wallace', 'Brian White', 'Claire Young', 'Derek Adams'
];

// ==================== GEOGRAPHIC CLUSTERS ====================

const NEIGHBORHOODS = [
  { name: 'Oakwood Estate', postcode_prefix: 'DC1 1', count: 15 },
  { name: 'Riverside', postcode_prefix: 'DC1 2', count: 15 },
  { name: 'Meadowlands', postcode_prefix: 'DC2 1', count: 15 },
  { name: 'Parkview', postcode_prefix: 'DC2 2', count: 15 },
  { name: 'Hillside', postcode_prefix: 'DC3 1', count: 15 },
  { name: 'Valley Gardens', postcode_prefix: 'DC3 2', count: 15 },
  { name: 'Lakeside', postcode_prefix: 'DC4 1', count: 15 },
  { name: 'Greenfield', postcode_prefix: 'DC4 2', count: 15 },
  { name: 'City Center', postcode_prefix: 'DC5 1', count: 10 },
  { name: 'Market Quarter', postcode_prefix: 'DC5 2', count: 10 },
  { name: 'Woodland Edge', postcode_prefix: 'DC6 1', count: 10 }
];

const VENUES = [
  { name: 'Demo City Hospital', postcode: 'DC10 1AA', type: 'medical' },
  { name: 'North Medical Centre', postcode: 'DC11 1AA', type: 'medical' },
  { name: 'South Health Clinic', postcode: 'DC12 1AA', type: 'medical' },
  { name: 'Central Day Center', postcode: 'DC10 2AA', type: 'day_center' },
  { name: 'Community Hub', postcode: 'DC11 2AA', type: 'day_center' },
  { name: 'Senior Center', postcode: 'DC12 2AA', type: 'day_center' },
  { name: 'Shopping Center', postcode: 'DC10 3AA', type: 'shopping' },
  { name: 'Social Services Office', postcode: 'DC10 4AA', type: 'services' }
];

// ==================== HELPER FUNCTIONS ====================

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone(): string {
  return `07${randomInt(100, 999)}${randomInt(100000, 999999)}`;
}

function generatePostcode(prefix: string): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return `${prefix}${letters[randomInt(0, letters.length - 1)]}${letters[randomInt(0, letters.length - 1)]}`;
}

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    if (random < item.weight) return item;
    random -= item.weight;
  }

  return items[items.length - 1];
}

// ==================== MAIN GENERATION FUNCTIONS ====================

async function clearExistingData() {
  console.log('\n🗑️  Clearing existing demo data...');

  try {
    // Delete in correct order to respect foreign key constraints
    await pool.query('DELETE FROM tenant_trips WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM tenant_schedules WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM tenant_users WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM tenant_customers WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM tenant_drivers WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM tenant_providers WHERE tenant_id = $1', [TENANT_ID]);

    console.log('✅ Existing data cleared');
  } catch (error: any) {
    console.error('❌ Error clearing data:', error.message);
    throw error;
  }
}

async function generateProviders() {
  console.log('\n📋 Generating 8 providers...');

  const providers = [
    { name: 'Social Services Department', type: 'social_services', contact: 'contact@socialservices.demo', phone: '01234567890' },
    { name: 'NHS Transport Services', type: 'nhs', contact: 'transport@nhs.demo', phone: '01234567891' },
    { name: 'Local Authority Transport', type: 'local_authority', contact: 'transport@authority.demo', phone: '01234567892' },
    { name: 'Education Transport', type: 'education', contact: 'schools@education.demo', phone: '01234567893' },
    { name: 'Self-Pay Customers', type: 'self_pay', contact: 'selfpay@demo.local', phone: '01234567894' },
    { name: 'Private Healthcare Provider', type: 'private_healthcare', contact: 'bookings@healthcare.demo', phone: '01234567895' },
    { name: 'Day Center Services', type: 'day_center', contact: 'admin@daycenters.demo', phone: '01234567896' },
    { name: 'Charity Transport Fund', type: 'charity', contact: 'help@charity.demo', phone: '01234567897' }
  ];

  const createdProviders = [];

  for (const provider of providers) {
    try {
      const result = await pool.query(`
        INSERT INTO tenant_providers (tenant_id, name, type, contact_name, contact_phone, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        RETURNING provider_id, name
      `, [TENANT_ID, provider.name, provider.type, provider.contact, provider.phone]);

      createdProviders.push(result.rows[0]);
      console.log(`✅ Created: ${provider.name}`);
    } catch (error: any) {
      console.error(`❌ Error creating provider ${provider.name}:`, error.message);
    }
  }

  return createdProviders;
}

async function generateCustomers(providers: any[]) {
  console.log('\n👥 Generating 150 customers with geographic clustering...');

  const createdCustomers = [];
  let customerCount = 0;

  for (const neighborhood of NEIGHBORHOODS) {
    console.log(`\n📍 Generating ${neighborhood.count} customers in ${neighborhood.name}...`);

    for (let i = 0; i < neighborhood.count; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const postcode = generatePostcode(neighborhood.postcode_prefix);
      const streetNumber = randomInt(1, 150);
      const streetName = randomElement(STREET_NAMES);
      const address = `${streetNumber} ${streetName}, ${neighborhood.name}`;

      // Determine payment structure
      const paymentRand = Math.random();
      let primaryProvider, paymentStructure;

      if (paymentRand < 0.60) {
        // 60% provider-funded
        primaryProvider = randomElement(providers.filter(p => p.name !== 'Self-Pay Customers'));
        paymentStructure = 'provider';
      } else if (paymentRand < 0.85) {
        // 25% self-pay
        primaryProvider = providers.find(p => p.name === 'Self-Pay Customers');
        paymentStructure = 'self_pay';
      } else {
        // 15% mixed (primary provider with some self-pay)
        primaryProvider = randomElement(providers.filter(p => p.name !== 'Self-Pay Customers'));
        paymentStructure = 'mixed';
      }

      // Determine accessibility needs
      const accessibilityNeed = weightedRandom(ACCESSIBILITY_NEEDS);
      const wheelchairUser = accessibilityNeed.type === 'Wheelchair User';

      try {
        const result = await pool.query(`
          INSERT INTO tenant_customers (
            tenant_id, name, email, phone, address, postcode,
            mobility_requirements, accessibility_needs,
            paying_org, has_split_payment,
            customer_status, is_active, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', true, NOW())
          RETURNING customer_id, name, postcode
        `, [
          TENANT_ID,
          name,
          `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.local`,
          randomPhone(),
          address,
          postcode,
          accessibilityNeed.type,
          wheelchairUser ? 'Wheelchair accessible vehicle required' : null,
          primaryProvider.provider_id,
          paymentStructure === 'mixed'
        ]);

        createdCustomers.push({
          ...result.rows[0],
          neighborhood: neighborhood.name,
          postcode_prefix: neighborhood.postcode_prefix
        });

        customerCount++;
        if (customerCount % 25 === 0) {
          console.log(`   Generated ${customerCount}/150 customers...`);
        }
      } catch (error: any) {
        console.error(`❌ Error creating customer ${name}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Created ${createdCustomers.length} customers across ${NEIGHBORHOODS.length} neighborhoods`);
  return createdCustomers;
}

async function generateDrivers() {
  console.log('\n🚗 Generating 30 drivers...');

  const createdDrivers = [];
  const employmentTypes = ['employed', 'employed', 'employed', 'self_employed', 'part_time']; // Weighted distribution

  for (let i = 0; i < 30; i++) {
    const name = DRIVER_NAMES[i];
    const employmentType = randomElement(employmentTypes);
    const email = `${name.toLowerCase().replace(' ', '.')}@demo.local`;

    try {
      const result = await pool.query(`
        INSERT INTO tenant_drivers (
          tenant_id, name, email, phone, employment_type,
          license_number, license_expiry, dbs_check_date,
          is_active, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
        RETURNING driver_id, name
      `, [
        TENANT_ID,
        name,
        email,
        randomPhone(),
        employmentType,
        `DL${randomInt(100000, 999999)}`,
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 90 days ago
      ]);

      createdDrivers.push(result.rows[0]);

      if ((i + 1) % 10 === 0) {
        console.log(`   Generated ${i + 1}/30 drivers...`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating driver ${name}:`, error.message);
    }
  }

  console.log(`✅ Created ${createdDrivers.length} drivers`);
  return createdDrivers;
}

async function generateCarpoolingSchedules(customers: any[], drivers: any[]) {
  console.log('\n📅 Generating weekly recurring schedules with carpooling opportunities...');

  let scheduleCount = 0;

  // Get start of current week (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const weekStarting = new Date(today);
  weekStarting.setDate(today.getDate() + daysToMonday);
  const weekStartingStr = weekStarting.toISOString().split('T')[0];

  // SCENARIO 1: Hospital Runs (North District → Hospital) - Mon/Wed/Fri
  const northCustomers = customers.filter(c => c.postcode_prefix && c.postcode_prefix.startsWith('DC1'));
  const hospitalVenue = VENUES.find(v => v.name === 'Demo City Hospital')!;

  console.log('\n🏥 Scenario 1: Hospital Runs (Mon/Wed/Fri Carpooling)');
  const hospitalGroup = northCustomers.slice(0, 5);
  const hospitalDriver = drivers[0];

  for (const customer of hospitalGroup) {
    try {
      await pool.query(`
        INSERT INTO tenant_schedules (
          tenant_id, week_starting, customer_id, driver_id,
          monday_destination, monday_price,
          wednesday_destination, wednesday_price,
          friday_destination, friday_price,
          notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        TENANT_ID,
        weekStartingStr,
        customer.customer_id,
        hospitalDriver?.driver_id || null,
        hospitalVenue.name,
        25.00,
        hospitalVenue.name,
        25.00,
        hospitalVenue.name,
        25.00,
        'Regular hospital appointments - carpooling with neighbors'
      ]);

      scheduleCount++;
    } catch (error: any) {
      console.error(`❌ Error creating schedule:`, error.message);
    }
  }
  console.log(`   ✅ Created ${hospitalGroup.length} weekly hospital schedules (Mon/Wed/Fri = CARPOOL!)`);

  // SCENARIO 2: Day Center Run (East District → Day Center) - Tue/Thu
  const eastCustomers = customers.filter(c => c.postcode_prefix && c.postcode_prefix.startsWith('DC2'));
  const dayCenterVenue = VENUES.find(v => v.name === 'Central Day Center')!;

  console.log('\n🏢 Scenario 2: Day Center Runs (Tue/Thu Carpooling)');
  const dayCenterGroup = eastCustomers.slice(0, 6);
  const dayCenterDriver = drivers[1];

  for (const customer of dayCenterGroup) {
    try {
      await pool.query(`
        INSERT INTO tenant_schedules (
          tenant_id, week_starting, customer_id, driver_id,
          tuesday_destination, tuesday_price,
          thursday_destination, thursday_price,
          notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        TENANT_ID,
        weekStartingStr,
        customer.customer_id,
        dayCenterDriver?.driver_id || null,
        dayCenterVenue.name,
        20.00,
        dayCenterVenue.name,
        20.00,
        'Day center activities - shared rides'
      ]);

      scheduleCount++;
    } catch (error: any) {
      console.error(`❌ Error creating schedule:`, error.message);
    }
  }
  console.log(`   ✅ Created ${dayCenterGroup.length} weekly day center schedules (Tue/Thu = 3 vehicles instead of 6!)`);

  // SCENARIO 3: Shopping Trip (South District → Shopping) - Saturday
  const southCustomers = customers.filter(c => c.postcode_prefix && c.postcode_prefix.startsWith('DC3'));
  const shoppingVenue = VENUES.find(v => v.name === 'Shopping Center')!;

  console.log('\n🛒 Scenario 3: Weekly Shopping Trips (Saturday Carpooling)');
  const shoppingGroup = southCustomers.slice(0, 4);
  const shoppingDriver = drivers[2];

  for (const customer of shoppingGroup) {
    try {
      await pool.query(`
        INSERT INTO tenant_schedules (
          tenant_id, week_starting, customer_id, driver_id,
          saturday_destination, saturday_price,
          notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        TENANT_ID,
        weekStartingStr,
        customer.customer_id,
        shoppingDriver?.driver_id || null,
        shoppingVenue.name,
        15.00,
        'Weekly shopping trip - local neighborhood'
      ]);

      scheduleCount++;
    } catch (error: any) {
      console.error(`❌ Error creating schedule:`, error.message);
    }
  }
  console.log(`   ✅ Created ${shoppingGroup.length} weekly shopping schedules (Same neighborhood = 1 vehicle!)`);

  // SCENARIO 4: Distribute remaining customers with varied weekly patterns
  console.log('\n📍 Creating varied weekly schedules for remaining customers...');
  const remainingCustomers = customers.slice(15);

  for (let i = 0; i < Math.min(remainingCustomers.length, 70); i++) {
    const customer = remainingCustomers[i];
    const driver = drivers[i % drivers.length];

    // Randomly assign 2-4 days per week
    const daysPerWeek = randomInt(2, 4);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const selectedDays: string[] = [];

    for (let d = 0; d < daysPerWeek; d++) {
      const day = days[randomInt(0, days.length - 1)];
      if (!selectedDays.includes(day)) {
        selectedDays.push(day);
      }
    }

    const venue = randomElement(VENUES);
    const price = randomInt(15, 35);

    const columns = ['tenant_id', 'week_starting', 'customer_id', 'driver_id'];
    const placeholders = ['$1', '$2', '$3', '$4'];
    const values: any[] = [TENANT_ID, weekStartingStr, customer.customer_id, driver?.driver_id || null];
    let paramIndex = 5;

    for (const day of selectedDays) {
      columns.push(`${day}_destination`, `${day}_price`);
      placeholders.push(`$${paramIndex++}`, `$${paramIndex++}`);
      values.push(venue.name, price);
    }

    columns.push('created_at');
    placeholders.push('NOW()');

    try {
      await pool.query(`
        INSERT INTO tenant_schedules (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `, values);

      scheduleCount++;

      if (scheduleCount % 20 === 0) {
        console.log(`   Generated ${scheduleCount} schedules...`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating schedule:`, error.message);
    }
  }

  console.log(`\n✅ Created ${scheduleCount} total weekly recurring schedules with carpooling opportunities`);
}

async function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DEMO DATA GENERATION SUMMARY');
  console.log('='.repeat(80));

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM tenant_providers WHERE tenant_id = $1) as providers,
      (SELECT COUNT(*) FROM tenant_customers WHERE tenant_id = $1) as customers,
      (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = $1) as drivers,
      (SELECT COUNT(*) FROM tenant_schedules WHERE tenant_id = $1) as schedules
  `, [TENANT_ID]);

  const stats = counts.rows[0];

  console.log(`\n✅ Providers:  ${stats.providers}`);
  console.log(`✅ Customers:  ${stats.customers}`);
  console.log(`✅ Drivers:    ${stats.drivers}`);
  console.log(`✅ Schedules:  ${stats.schedules}`);

  console.log('\n🗺️  GEOGRAPHIC DISTRIBUTION:');
  console.log('─'.repeat(80));

  for (const neighborhood of NEIGHBORHOODS) {
    const count = await pool.query(`
      SELECT COUNT(*) as count
      FROM tenant_customers
      WHERE tenant_id = $1 AND postcode LIKE $2
    `, [TENANT_ID, `${neighborhood.postcode_prefix}%`]);

    console.log(`   ${neighborhood.name.padEnd(20)} (${neighborhood.postcode_prefix}): ${count.rows[0].count} customers`);
  }

  console.log('\n🚗 CARPOOLING OPPORTUNITIES:');
  console.log('─'.repeat(80));
  console.log('   ✅ Scenario 1: 5 customers from North District → Hospital (Same time)');
  console.log('   ✅ Scenario 2: 6 customers from East District → Day Center (Same time)');
  console.log('   ✅ Scenario 3: 4 customers from South District → Shopping (Same time)');
  console.log('   💡 Route optimization can reduce vehicles needed by 50-70%!');

  console.log('\n🎯 VENUES:');
  console.log('─'.repeat(80));
  for (const venue of VENUES) {
    console.log(`   📍 ${venue.name.padEnd(30)} ${venue.postcode}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ DEMO DATA GENERATION COMPLETE!');
  console.log('='.repeat(80));
  console.log('\nYou can now:');
  console.log('  1. Login to Demo Transport Company (subdomain: demo)');
  console.log('  2. View 150 customers across 11 neighborhoods');
  console.log('  3. Test carpooling recommendations');
  console.log('  4. Analyze route optimization scenarios');
  console.log('\n');
}

// ==================== MAIN EXECUTION ====================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 DEMO DATA GENERATOR - Geographic Clustering for Carpooling');
  console.log('='.repeat(80));
  console.log('\nTarget: Demo Transport Company (Tenant ID: 1)');
  console.log('Goal: 150 customers, 30 drivers, 8 providers with carpooling scenarios\n');

  try {
    await clearExistingData();
    const providers = await generateProviders();
    const customers = await generateCustomers(providers);
    const drivers = await generateDrivers();
    await generateCarpoolingSchedules(customers, drivers);
    await printSummary();
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

main();
