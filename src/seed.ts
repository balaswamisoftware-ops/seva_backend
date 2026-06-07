import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './config/db';
import { Employee } from './modules/employees/employee.model';
import { Event } from './modules/events/event.model';
import { Seva } from './modules/sevas/seva.model';
import { OrgSettings } from './modules/org/orgSettings.model';
import { DonationPurpose } from './modules/donationPurposes/donationPurpose.model';
import {
  nextEmployeeCode, nextEventCode, nextSevaCode, nextDonationPurposeCode, Counter,
} from './utils/counters';
import { pinLookupHash } from './utils/pin';

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Reset counters (dev only)
  await Counter.deleteMany({});

  // Org settings
  let org = await OrgSettings.findOne();
  if (!org) {
    org = await OrgSettings.create({
      orgName: 'Sri Krishna Spiritual Foundation',
      address: '12, Temple Road, Bengaluru, Karnataka 560001',
      contactNumber: '+91 98765 43210',
      email: 'info@krishnafoundation.org',
      gstNumber: '29ABCDE1234F1Z5',
      receiptHeader: 'Hari Om Tat Sat',
      receiptFooter: 'May the Lord bless you with peace and prosperity',
      spiritualQuote: 'Sarvam Krishnarpanam Astu',
      thankYouMessage: '🙏 Thank you for your seva 🙏',
      printerWidth: 58,
      fontSize: 'normal',
      textAlignment: 'center',
      printLogo: true,
      printQrCode: true,
    });
    console.log('  ✅ Organization settings created');
  }

  // Super Admin
  if (!(await Employee.findOne({ employeeId: 'EMP001' }))) {
    const code = await nextEmployeeCode();
    const pin = '123456';
    await Employee.create({
      employeeId: code,
      firstName: 'Super',
      lastName: 'Admin',
      mobileNumber: '9999999999',
      email: 'admin@krishnafoundation.org',
      pinHash: await bcrypt.hash(pin, 10),
      pinLookup: pinLookupHash(pin),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    });
    console.log(`  ✅ Super Admin created (${code} / PIN ${pin})`);
  }

  // Sample staff
  if (!(await Employee.findOne({ mobileNumber: '9000000001' }))) {
    const code = await nextEmployeeCode();
    const pin = '100001';
    await Employee.create({
      employeeId: code,
      firstName: 'Ravi',
      lastName: 'Kumar',
      mobileNumber: '9000000001',
      email: 'ravi@krishnafoundation.org',
      pinHash: await bcrypt.hash(pin, 10),
      pinLookup: pinLookupHash(pin),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    console.log(`  ✅ Admin staff created (${code} / PIN ${pin})`);
  }

  // Sample event
  let event = await Event.findOne({ eventName: 'Krishna Janmashtami Mahotsav' });
  if (!event) {
    const eventId = await nextEventCode();
    const now = new Date();
    event = await Event.create({
      eventId,
      eventName: 'Krishna Janmashtami Mahotsav',
      description: '3-day grand celebration with abhishekam, bhajans, and prasadam',
      startDate: new Date(now.getTime() - 86400e3),
      endDate: new Date(now.getTime() + 2 * 86400e3),
      location: 'Main Temple Hall',
      status: 'ONGOING',
    });
    console.log(`  ✅ Sample event created (${eventId})`);
  }

  // Sample sevas
  const sampleSevas = [
    { sevaName: 'Abhishekam',           price: 251,  maxTickets: 100 },
    { sevaName: 'Archana',              price: 51,   maxTickets: 0   },
    { sevaName: 'Annadanam Sponsorship',price: 1001, maxTickets: 50  },
    { sevaName: 'Aarti Sponsorship',    price: 501,  maxTickets: 30  },
    { sevaName: 'Maha Prasadam',        price: 101,  maxTickets: 0   },
  ];
  for (const s of sampleSevas) {
    if (!(await Seva.findOne({ eventId: event._id, sevaName: s.sevaName }))) {
      const sevaId = await nextSevaCode();
      await Seva.create({
        sevaId,
        eventId: event._id,
        sevaName: s.sevaName,
        price: s.price,
        maxTickets: s.maxTickets,
        availableTickets: s.maxTickets,
        sevaDate: event.startDate,
        sevaTime: '18:00',
        status: 'ACTIVE',
      });
    }
  }
  console.log('  ✅ Sample sevas created');

  // Donation purposes
  const defaultPurposes = [
    'General Donation',
    'Temple Construction',
    'Annadanam (Food Service)',
    'Cow Care (Gau Seva)',
    'Education',
    'Festival Sponsorship',
    'Maintenance',
  ];
  for (const name of defaultPurposes) {
    if (!(await DonationPurpose.findOne({ purposeName: name }))) {
      const purposeId = await nextDonationPurposeCode();
      await DonationPurpose.create({ purposeId, purposeName: name, status: 'ACTIVE' });
    }
  }
  console.log('  ✅ Donation purposes seeded');

  console.log('\n✨ Seed complete!');
  console.log('   Login PIN: 123456 (Super Admin)');
  console.log('              100001 (Staff)');
  await disconnectDB();
}

seed().catch(async (e) => { console.error(e); await disconnectDB(); process.exit(1); });
