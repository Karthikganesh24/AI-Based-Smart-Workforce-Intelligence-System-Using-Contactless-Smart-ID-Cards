/**
 * Mock Data Population Script
 * Generates realistic employees and attendance data
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'smartworkforce.db');
const db = new DatabaseSync(DB_PATH);

// Helper to generate random date within last N days
function randomDateInPast(days) {
  const now = new Date();
  const past = new Date(now - days * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime);
}

// Helper to format time
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Helper to generate UID
function generateUID() {
  return Array(4).fill(0).map(() =>
    Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0')
  ).join(':');
}

// Mock employee data
const departments = [
  { name: 'Engineering', roles: ['Software Engineer', 'Senior Engineer', 'Lead Engineer', 'Engineering Manager', 'DevOps Engineer'] },
  { name: 'Product', roles: ['Product Manager', 'Product Designer', 'UX Researcher', 'Product Analyst'] },
  { name: 'Sales', roles: ['Sales Representative', 'Account Executive', 'Sales Manager', 'Business Development'] },
  { name: 'Marketing', roles: ['Marketing Manager', 'Content Writer', 'Social Media Specialist', 'SEO Specialist'] },
  { name: 'HR', roles: ['HR Manager', 'Recruiter', 'HR Coordinator', 'Talent Acquisition'] },
  { name: 'Finance', roles: ['Financial Analyst', 'Accountant', 'Controller', 'Finance Manager'] },
  { name: 'Operations', roles: ['Operations Manager', 'Operations Coordinator', 'Logistics Specialist'] },
  { name: 'Customer Success', roles: ['Customer Success Manager', 'Support Specialist', 'Technical Support'] }
];

const firstNames = [
  'Rahul', 'Priya', 'Amit', 'Sneha', 'Arjun', 'Divya', 'Vivek', 'Anjali', 'Karthik', 'Nisha',
  'Rajesh', 'Pooja', 'Sanjay', 'Meera', 'Aditya', 'Kavya', 'Rohan', 'Ishita', 'Nikhil', 'Riya',
  'Suresh', 'Tanvi', 'Manoj', 'Shreya', 'Vikram', 'Neha', 'Akash', 'Sonia', 'Harish', 'Anita'
];

const lastNames = [
  'Kumar', 'Sharma', 'Patel', 'Singh', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Joshi', 'Mehta',
  'Das', 'Rao', 'Verma', 'Pillai', 'Menon', 'Bhat', 'Shah', 'Desai', 'Kulkarni', 'Agarwal'
];

const colors = ['#0284C7', '#059669', '#7C3AED', '#D97706', '#DC2626', '#0891B2', '#16A34A', '#9333EA'];

function generateEmployee(index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const dept = departments[Math.floor(Math.random() * departments.length)];
  const role = dept.roles[Math.floor(Math.random() * dept.roles.length)];
  const status = Math.random() > 0.6 ? 'INSIDE' : 'OUTSIDE';
  const uid = generateUID();

  let lastSeen;
  if (status === 'INSIDE') {
    const time = randomDateInPast(0);
    lastSeen = formatTime(time);
  } else {
    if (Math.random() > 0.5) {
      lastSeen = 'Not detected today';
    } else {
      lastSeen = `Yesterday ${formatTime(randomDateInPast(1))}`;
    }
  }

  return {
    id: `EMP-${(200 + index).toString().padStart(3, '0')}`,
    name: `${firstName} ${lastName}`,
    department: dept.name,
    role: role,
    uid: uid,
    status: status,
    lastSeen: lastSeen,
    avatarBg: colors[Math.floor(Math.random() * colors.length)],
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@smartworkforce.com`,
    phone: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`
  };
}

function generateAttendanceEvents(employees, daysBack = 7) {
  const events = [];
  const gates = [
    'Gate 01 - Main Entrance',
    'Gate 02 - South Wing',
    'Gate 03 - North Wing',
    'Gate 04 - Parking Entrance'
  ];

  employees.forEach(emp => {
    // Generate events for the past week
    for (let day = 0; day < daysBack; day++) {
      // 70% chance employee comes to work on any given day
      if (Math.random() > 0.3) {
        const date = new Date();
        date.setDate(date.getDate() - day);

        // Entry time between 8:00 AM and 10:00 AM
        const entryHour = 8 + Math.random() * 2;
        const entryMinute = Math.floor(Math.random() * 60);
        const entryTime = new Date(date);
        entryTime.setHours(entryHour, entryMinute, Math.floor(Math.random() * 60));

        events.push({
          id: crypto.randomUUID(),
          timestamp: entryTime.toISOString(),
          empId: emp.id,
          empName: emp.name,
          department: emp.department,
          eventType: 'ENTRY',
          gate: gates[Math.floor(Math.random() * gates.length)],
          status: 'VERIFIED'
        });

        // Exit time between 5:00 PM and 7:00 PM (if not today)
        if (day > 0 || Math.random() > 0.4) {
          const exitHour = 17 + Math.random() * 2;
          const exitMinute = Math.floor(Math.random() * 60);
          const exitTime = new Date(date);
          exitTime.setHours(exitHour, exitMinute, Math.floor(Math.random() * 60));

          events.push({
            id: crypto.randomUUID(),
            timestamp: exitTime.toISOString(),
            empId: emp.id,
            empName: emp.name,
            department: emp.department,
            eventType: 'EXIT',
            gate: gates[Math.floor(Math.random() * gates.length)],
            status: 'VERIFIED'
          });
        }
      }
    }
  });

  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Main population function
function populateMockData() {
  console.log('Starting mock data population...');

  try {
    // Check existing employee count
    const existingCount = db.prepare('SELECT COUNT(*) AS count FROM employees').get().count;
    console.log(`Existing employees: ${existingCount}`);

    // Generate new employees
    const numNewEmployees = 50;
    const newEmployees = [];

    console.log(`Generating ${numNewEmployees} new employees...`);
    for (let i = 0; i < numNewEmployees; i++) {
      newEmployees.push(generateEmployee(i));
    }

    // Insert employees
    const insertEmpStmt = db.prepare(`
      INSERT OR IGNORE INTO employees
      (id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    let empInserted = 0;

    for (const emp of newEmployees) {
      try {
        insertEmpStmt.run(
          emp.id,
          emp.name,
          emp.department,
          emp.role,
          emp.uid,
          emp.status,
          emp.lastSeen,
          emp.avatarBg,
          now,
          'COMP-DEFAULT-01',
          emp.email,
          emp.phone
        );
        empInserted++;
      } catch (e) {
        if (!e.message.includes('UNIQUE constraint')) {
          console.error(`Error inserting employee ${emp.id}:`, e.message);
        }
      }
    }

    console.log(`✓ Inserted ${empInserted} employees`);

    // Generate attendance events
    console.log('Generating attendance events...');
    const allEmployees = db.prepare('SELECT id, name, department FROM employees WHERE company_id = ?')
      .all('COMP-DEFAULT-01');

    const events = generateAttendanceEvents(allEmployees, 7);

    // Insert attendance events
    const insertEventStmt = db.prepare(`
      INSERT OR IGNORE INTO attendance_events
      (id, timestamp, emp_id, emp_name, department, event_type, gate, status, created_at, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let eventsInserted = 0;
    for (const event of events) {
      try {
        insertEventStmt.run(
          event.id,
          event.timestamp,
          event.empId,
          event.empName,
          event.department,
          event.eventType,
          event.gate,
          event.status,
          now,
          'COMP-DEFAULT-01'
        );
        eventsInserted++;
      } catch (e) {
        if (!e.message.includes('UNIQUE constraint')) {
          console.error(`Error inserting event:`, e.message);
        }
      }
    }

    console.log(`✓ Inserted ${eventsInserted} attendance events`);

    // Print summary
    const finalEmpCount = db.prepare('SELECT COUNT(*) AS count FROM employees').get().count;
    const finalEventCount = db.prepare('SELECT COUNT(*) AS count FROM attendance_events').get().count;
    const insideCount = db.prepare("SELECT COUNT(*) AS count FROM employees WHERE status = 'INSIDE'").get().count;

    console.log('\n✅ Mock data population completed!');
    console.log(`\nSummary:`);
    console.log(`  Total Employees: ${finalEmpCount}`);
    console.log(`  Currently Inside: ${insideCount}`);
    console.log(`  Total Attendance Events: ${finalEventCount}`);
    console.log(`\nYou can now view the data in your React application!`);

  } catch (error) {
    console.error('Error populating mock data:', error);
    process.exit(1);
  }
}

// Run the script
populateMockData();
