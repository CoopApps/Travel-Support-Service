const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function addScheduleTimes() {
  try {
    console.log('\n⏰ Adding time columns to tenant_schedules table...\n');

    // Add pickup time columns for each day
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      try {
        await pool.query(`
          ALTER TABLE tenant_schedules
          ADD COLUMN IF NOT EXISTS ${day}_pickup_time TIME
        `);
        console.log(`✓ Added ${day}_pickup_time column`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ${day}_pickup_time already exists`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n⏰ Populating schedule times...\n');

    // Get all schedules for demo tenant
    const schedules = await pool.query(
      'SELECT * FROM tenant_schedules WHERE tenant_id = 1'
    );

    console.log(`Found ${schedules.rows.length} schedules to update\n`);

    // Common pickup time slots for different types of trips
    const morningSlots = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];
    const afternoonSlots = ['13:00', '13:30', '14:00', '14:30', '15:00'];
    const eveningSlots = ['17:00', '17:30', '18:00'];

    let updateCount = 0;

    for (const schedule of schedules.rows) {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Determine time category based on destination
      let timeSlots = morningSlots;
      if (schedule.monday_destination?.includes('Shopping') ||
          schedule.monday_destination?.includes('Community')) {
        timeSlots = afternoonSlots;
      } else if (schedule.monday_destination?.includes('Social') ||
                 schedule.monday_destination?.includes('Club')) {
        timeSlots = eveningSlots;
      }

      // For each day that has a destination, add a pickup time
      for (const day of days) {
        const destCol = `${day}_destination`;
        if (schedule[destCol]) {
          const timeCol = `${day}_pickup_time`;
          // Pick a random time from the appropriate slot
          const pickupTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          updates.push(`${timeCol} = $${paramIndex}`);
          values.push(pickupTime);
          paramIndex++;
        }
      }

      if (updates.length > 0) {
        values.push(schedule.schedule_id);
        await pool.query(`
          UPDATE tenant_schedules
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE schedule_id = $${paramIndex}
        `, values);

        updateCount++;
        if (updateCount % 10 === 0) {
          console.log(`  Updated ${updateCount}/${schedules.rows.length} schedules...`);
        }
      }
    }

    console.log(`\n✅ Successfully updated ${updateCount} schedules with pickup times`);

    // Show sample schedule with times
    const sample = await pool.query(`
      SELECT schedule_id, customer_id,
             monday_destination, monday_pickup_time, monday_price,
             tuesday_destination, tuesday_pickup_time, tuesday_price,
             wednesday_destination, wednesday_pickup_time, wednesday_price
      FROM tenant_schedules
      WHERE tenant_id = 1
      AND monday_destination IS NOT NULL
      LIMIT 1
    `);

    if (sample.rows.length > 0) {
      console.log('\n📋 Sample Schedule with Times:\n');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addScheduleTimes();
