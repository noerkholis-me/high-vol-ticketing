import { Prisma, PrismaClient } from './generated/prisma/client.js';
import { SeatUncheckedCreateInput } from './generated/prisma/models.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const event = await prisma.event.create({
    data: {
      name: 'Coldplay music of the Spheres of jakarta',
      location: 'Gelora Bung Karno',
      date: new Date('2025-12-25'),
    },
  });

  console.log('Event created!');
  const seats: SeatUncheckedCreateInput[] = [];
  for (let i = 1; i <= 1000; i++) {
    seats.push({
      eventId: event.id,
      number: `A-${i}`,
      price: new Prisma.Decimal(1500000),
      status: 'AVAILABLE',
    });
  }

  await prisma.seat.createMany({ data: seats });
  console.log('1,000 Seats seeded successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
