import { PrismaClient, Prisma, Booking, Seat, Event } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { EventCreateInput } from '../src/generated/prisma/models';
import { TransactionClient } from '../src/generated/prisma/internal/prismaNamespace';

const logger = new Logger('SEED DATA');
const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SYSTEM_ACTOR = 'system-seed';

interface PermissionData {
  name: string;
  description: string;
}

interface RoleData {
  name: string;
  description: string;
  permissionNames: string[];
}

interface UserData {
  email: string;
  password: string;
  roleName: string;
}

// ── Helper Functions ────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

async function upsertPermission(data: PermissionData, tx: TransactionClient): Promise<{ id: string; name: string }> {
  return tx.permission.upsert({
    where: { name: data.name },
    update: {},
    create: {
      ...data,
      createdBy: SYSTEM_ACTOR,
    },
  });
}

async function upsertRole(
  data: { name: string; description: string },
  tx: TransactionClient,
): Promise<{ id: string; name: string }> {
  return tx.role.upsert({
    where: { name: data.name },
    update: {},
    create: {
      ...data,
      createdBy: SYSTEM_ACTOR,
    },
  });
}

async function assignPermissionsToRole(roleId: string, permissionIds: string[], tx: TransactionClient): Promise<void> {
  await Promise.all(
    permissionIds.map((permissionId) =>
      tx.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        update: {},
        create: {
          roleId,
          permissionId,
          createdBy: SYSTEM_ACTOR,
        },
      }),
    ),
  );
}

async function createUserWithRole(data: UserData, tx: TransactionClient): Promise<{ id: string; email: string }> {
  const passwordHash = await hashPassword(data.password);

  const user = await tx.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      passwordHash,
      isActive: true,
      createdBy: SYSTEM_ACTOR,
    },
  });

  const role = await tx.role.findUniqueOrThrow({
    where: { name: data.roleName },
  });

  await tx.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  return user;
}

async function createEvent(data: EventCreateInput, tx: TransactionClient): Promise<Event> {
  return tx.event.upsert({
    where: { id: data.id },
    update: {},
    create: {
      name: data.name,
      description: data.description,
      date: data.date,
      location: data.location,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    },
  });
}

async function createSeatsForEvent(
  eventId: string,
  tx: TransactionClient,
  count = 20,
  price = new Prisma.Decimal('850000'),
  prefix = 'A',
): Promise<Seat[]> {
  const seatsData: Prisma.SeatCreateManyInput[] = Array.from({ length: count }, (_, i) => ({
    eventId,
    number: `${prefix}${i + 1}`,
    price,
    status: 'AVAILABLE' as const,
    version: 0,
  }));

  const { count: insertedCount } = await tx.seat.createMany({
    data: seatsData,
    skipDuplicates: true,
  });

  // Ambil kembali data seats yang baru dibuat
  const seats = await tx.seat.findMany({
    where: { eventId },
    take: count,
  });

  logger.log(`Inserted ${insertedCount} seats for event ${eventId}`);

  return seats;
}

async function createSampleBooking(
  userId: string,
  seatId: string,
  tx: TransactionClient,
  expiresInMinutes = 15,
): Promise<Booking> {
  return tx.booking.create({
    data: {
      userId,
      seatId,
      status: 'PENDING' as const,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      createdBy: userId,
    },
  });
}

// ── Seeding Functions ───────────────────────────────────────────────

async function seedPermissions(tx: TransactionClient): Promise<Record<string, string>> {
  const permissionList: PermissionData[] = [
    { name: 'event:create', description: 'Membuat event baru' },
    { name: 'event:read', description: 'Melihat detail event' },
    { name: 'event:update', description: 'Mengedit event' },
    { name: 'event:delete', description: 'Menghapus event' },
    { name: 'seat:manage', description: 'Mengatur kursi event' },
    { name: 'booking:read', description: 'Melihat semua booking' },
    { name: 'booking:cancel', description: 'Membatalkan booking' },
    { name: 'user:manage', description: 'Mengelola user (admin only)' },
    { name: 'role:assign', description: 'Assign role ke user' },
  ];

  const created = await Promise.all(permissionList.map((data) => upsertPermission(data, tx)));

  return Object.fromEntries(created.map((p) => [p.name, p.id]));
}

async function seedRoles(permissionIds: Record<string, string>, tx: TransactionClient): Promise<void> {
  const roles: RoleData[] = [
    {
      name: 'ADMIN',
      description: 'Full access - pengelola sistem',
      permissionNames: [
        'event:create',
        'event:read',
        'event:update',
        'event:delete',
        'seat:manage',
        'booking:read',
        'booking:cancel',
        'user:manage',
        'role:assign',
      ],
    },
    {
      name: 'ORGANIZER',
      description: 'Penyelenggara event',
      permissionNames: ['event:create', 'event:read', 'event:update', 'event:delete', 'seat:manage', 'booking:read'],
    },
    {
      name: 'USER',
      description: 'Pengguna biasa / pembeli tiket',
      permissionNames: ['event:read', 'booking:read'],
    },
  ];

  for (const roleData of roles) {
    const role = await upsertRole(
      {
        name: roleData.name,
        description: roleData.description,
      },
      tx,
    );

    const permIds = roleData.permissionNames.map((name) => permissionIds[name]).filter((id): id is string => !!id);

    await assignPermissionsToRole(role.id, permIds, tx);
    logger.log(`Role ${role.name} seeded with ${permIds.length} permissions`);
  }
}

async function seedUsers(tx: TransactionClient): Promise<Record<string, { id: string; email: string }>> {
  const userList: UserData[] = [
    { email: 'admin@highvol.com', password: 'Admin123!', roleName: 'ADMIN' },
    { email: 'organizer1@highvol.com', password: 'Org123!', roleName: 'ORGANIZER' },
    { email: 'user1@highvol.com', password: 'User123!', roleName: 'USER' },
  ];

  const users = await Promise.all(userList.map((data) => createUserWithRole(data, tx)));

  return Object.fromEntries(users.map((u) => [u.email.split('@')[0], u]));
}

// ── Main Execution with Transaction ─────────────────────────────────

async function main() {
  logger.log('Starting modular database seeding with transaction...');

  try {
    await prisma.$transaction(
      async (tx) => {
        const permissionIds = await seedPermissions(tx);
        logger.log('Permissions seeded');

        await seedRoles(permissionIds, tx);
        logger.log('Roles seeded');

        const users = await seedUsers(tx);
        logger.log('Users seeded');

        const event = await createEvent(
          {
            id: users.organizer1.id,
            name: 'Konser Coldplay 2026',
            description: 'World Tour Jakarta 2026',
            date: new Date('2026-04-15T19:00:00+07:00'),
            location: 'Gelora Bung Karno, Jakarta',
            createdBy: users.organizer1.id,
          },
          tx,
        );

        const seats = await createSeatsForEvent(event.id, tx);
        logger.log(`Event "${event.name}" created with ${seats.length} seats`);

        const booking = await createSampleBooking(users.user1.id, seats[0].id, tx);
        logger.log(`Sample booking created: ${booking.id} (PENDING for seat ${seats[0].number})`);

        return { success: true };
      },
      {
        maxWait: 50000,
        timeout: 60000,
      },
    );

    logger.log('Seeding completed successfully!');
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  logger.error('Unexpected error during seeding:', e);
  process.exit(1);
});
