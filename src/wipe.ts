/**
 * One-shot data wipe for local development.
 *
 * Clears: Events, Sevas, Tickets, Donations, DonationPurposes, and the
 * matching auto-increment counters (EVT, SEV, TKT, DP, RCP-*, BK-*).
 *
 * Leaves alone: Employees, OrgSettings, RefreshTokens, EMP counter.
 *
 * Refuses to run unless CONFIRM_WIPE=yes is set, to avoid accidents.
 *
 *   CONFIRM_WIPE=yes npx tsx src/wipe.ts
 */
import { connectDB, disconnectDB } from './config/db';
import { Event } from './modules/events/event.model';
import { Seva } from './modules/sevas/seva.model';
import { Ticket } from './modules/tickets/ticket.model';
import { Donation } from './modules/donations/donation.model';
import { DonationPurpose } from './modules/donationPurposes/donationPurpose.model';
import { Counter } from './utils/counters';

async function main() {
  if (process.env.CONFIRM_WIPE !== 'yes') {
    console.error('Refusing to wipe — set CONFIRM_WIPE=yes to confirm.');
    process.exit(1);
  }

  await connectDB();

  const eventsDeleted    = (await Event.deleteMany({})).deletedCount;
  const sevasDeleted     = (await Seva.deleteMany({})).deletedCount;
  const ticketsDeleted   = (await Ticket.deleteMany({})).deletedCount;
  const donationsDeleted = (await Donation.deleteMany({})).deletedCount;
  const purposesDeleted  = (await DonationPurpose.deleteMany({})).deletedCount;

  const countersDeleted = (
    await Counter.deleteMany({
      $or: [
        { _id: 'EVT' },
        { _id: 'SEV' },
        { _id: 'TKT' },
        { _id: 'DP' },
        { _id: { $regex: '^RCP-' } },
        { _id: { $regex: '^BK-' } },
      ],
    })
  ).deletedCount;

  console.log('Wiped:');
  console.log(`  events:            ${eventsDeleted}`);
  console.log(`  sevas:             ${sevasDeleted}`);
  console.log(`  tickets:           ${ticketsDeleted}`);
  console.log(`  donations:         ${donationsDeleted}`);
  console.log(`  donation purposes: ${purposesDeleted}`);
  console.log(`  counters:          ${countersDeleted}`);

  await disconnectDB();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Wipe failed:', err);
    process.exit(1);
  });
