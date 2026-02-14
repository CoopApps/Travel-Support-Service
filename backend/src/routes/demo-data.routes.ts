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
  // Elderly customers with various mobility needs
  { first_name: 'Margaret', last_name: 'Thompson', phone: '07700 900001', email: 'margaret.thompson@example.com', address: '12 High Street, Sheffield', postcode: 'S1 2GE', mobility_needs: 'Wheelchair user', medical_notes: 'Requires ground floor pickup' },
  { first_name: 'Arthur', last_name: 'Davies', phone: '07700 900002', email: 'arthur.davies@example.com', address: '45 Church Lane, Rotherham', postcode: 'S60 2BX', mobility_needs: 'Walking frame', medical_notes: 'Needs assistance to vehicle' },
  { first_name: 'Dorothy', last_name: 'Evans', phone: '07700 900003', email: 'dorothy.evans@example.com', address: '78 Park Road, Doncaster', postcode: 'DN1 3JQ', mobility_needs: 'Wheelchair user', medical_notes: 'Electric wheelchair' },
  { first_name: 'George', last_name: 'Wilson', phone: '07700 900004', email: 'george.wilson@example.com', address: '23 Station Road, Barnsley', postcode: 'S70 2AB', mobility_needs: 'Walking stick', medical_notes: 'Slow walker' },
  { first_name: 'Betty', last_name: 'Roberts', phone: '07700 900005', email: 'betty.roberts@example.com', address: '56 Oak Avenue, Chesterfield', postcode: 'S40 1TY', mobility_needs: 'Wheelchair user', medical_notes: 'Manual wheelchair' },
  { first_name: 'William', last_name: 'Jones', phone: '07700 900006', email: 'william.jones@example.com', address: '89 Victoria Street, Sheffield', postcode: 'S3 7QL', mobility_needs: 'Walking frame', medical_notes: 'Requires extra time' },
  { first_name: 'Joyce', last_name: 'Brown', phone: '07700 900007', email: 'joyce.brown@example.com', address: '34 Meadow Lane, Rotherham', postcode: 'S61 4RB', mobility_needs: 'None', medical_notes: 'Independent' },
  { first_name: 'Albert', last_name: 'Taylor', phone: '07700 900008', email: 'albert.taylor@example.com', address: '67 Bridge Street, Doncaster', postcode: 'DN2 5FB', mobility_needs: 'Walking stick', medical_notes: 'Arthritis' },
  { first_name: 'Doris', last_name: 'White', phone: '07700 900009', email: 'doris.white@example.com', address: '90 Castle Road, Barnsley', postcode: 'S71 3HP', mobility_needs: 'Wheelchair user', medical_notes: 'Requires ramp' },
  { first_name: 'Frederick', last_name: 'Martin', phone: '07700 900010', email: 'frederick.martin@example.com', address: '12 Queen Street, Chesterfield', postcode: 'S41 8NG', mobility_needs: 'Walking frame', medical_notes: 'Balance issues' },
  // Continue with varied names and locations (total 150)
  { first_name: 'Vera', last_name: 'Jackson', phone: '07700 900011', email: 'vera.jackson@example.com', address: '45 King Street, Sheffield', postcode: 'S1 3BR', mobility_needs: 'None', medical_notes: 'Good mobility' },
  { first_name: 'Harold', last_name: 'Lewis', phone: '07700 900012', email: 'harold.lewis@example.com', address: '78 Mill Lane, Rotherham', postcode: 'S60 3TB', mobility_needs: 'Walking stick', medical_needs: 'Hearing aid user' },
  { first_name: 'Ethel', last_name: 'Walker', phone: '07700 900013', email: 'ethel.walker@example.com', address: '23 School Road, Doncaster', postcode: 'DN3 2PQ', mobility_needs: 'Wheelchair user', medical_notes: 'Oxygen user' },
  { first_name: 'Norman', last_name: 'Hall', phone: '07700 900014', email: 'norman.hall@example.com', address: '56 Church Street, Barnsley', postcode: 'S72 8QW', mobility_needs: 'Walking frame', medical_notes: 'Recent hip surgery' },
  { first_name: 'Gladys', last_name: 'Allen', phone: '07700 900015', email: 'gladys.allen@example.com', address: '89 Market Place, Chesterfield', postcode: 'S43 1DB', mobility_needs: 'None', medical_notes: 'Visually impaired' },
  // Add more customers with varied profiles (continuing to 150)
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
    medical_notes: medicalOptions[i % medicalOptions.length]
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

/**
 * POST /api/tenants/:tenantId/demo-data/import
 * Import demo customers and drivers
 */
router.post(
  '/tenants/:tenantId/demo-data/import',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const client = await getDbClient();

    let customersImported = 0;
    let driversImported = 0;

    try {
      await client.query('BEGIN');

      // Check if demo data already exists
      const checkQuery = `
        SELECT COUNT(*) as count FROM tenant_customers
        WHERE tenant_id = $1 AND email LIKE '%@example.com'
      `;
      const checkResult = await client.query(checkQuery, [tenantId]);

      if (parseInt(checkResult.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          error: 'Demo data already imported. Please remove existing demo data first.'
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
            user_id, is_login_enabled, archived, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NULL, false, false, true, NOW(), NOW()
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
          'Self-Pay', // paying_org
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

      // Import drivers
      for (const driver of DEMO_DRIVERS) {
        const driverName = `${driver.first_name} ${driver.last_name}`;
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
          'contracted', // employment_type
          'active', // employment_status
          JSON.stringify({ type: 'hourly', rate: 12.50 }), // salary_structure (JSON object)
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

      await client.query('COMMIT');
      client.release();

      logger.info('Demo data imported successfully', {
        tenantId,
        customersImported,
        driversImported
      });

      return res.json({
        success: true,
        message: 'Demo data imported successfully',
        customersImported,
        driversImported
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      client.release();
      logger.error('Error importing demo data', {
        error: error.message,
        stack: error.stack,
        tenantId,
        customersImported,
        driversImported
      });
      return res.status(500).json({
        error: 'Failed to import demo data',
        message: error.message,
        details: error.toString(),
        position: customersImported > 0 ? `Failed after importing ${customersImported} customers` : 'Failed during customer import'
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

      logger.info('Demo data removed successfully', {
        tenantId,
        customersRemoved,
        driversRemoved
      });

      return res.json({
        success: true,
        message: 'Demo data removed successfully',
        customersRemoved,
        driversRemoved
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

      const [customersResult, driversResult] = await Promise.all([
        client.query(customersQuery, [tenantId]),
        client.query(driversQuery, [tenantId])
      ]);

      client.release();

      const customerCount = parseInt(customersResult.rows[0].count);
      const driverCount = parseInt(driversResult.rows[0].count);
      const isImported = customerCount > 0 || driverCount > 0;

      return res.json({
        success: true,
        isImported,
        customerCount,
        driverCount
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
