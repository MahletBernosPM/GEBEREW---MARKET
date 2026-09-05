const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * TODO(auth): There is no real authentication/session system yet.
 * RLS requires app.current_user_id / app.current_role / app.current_region
 * to be set via SET LOCAL on every transaction, or Postgres blocks all rows.
 *
 * Until real auth exists, every price-submission and verification query
 * runs under a hardcoded OPERATOR context, since RLS only grants write
 * access to `prices` for OPERATOR/ADMIN (see backend/SCHEMA.md section 8).
 * Replace this with real per-request user context once auth is built.
 */
async function withOperatorContext(callback) {
  return prisma.$transaction(async (tx) => {
    // "current_role" is quoted because it's a reserved Postgres keyword
    // (it's also a built-in function, like current_user) — unquoted, the
    // SET statement fails to parse even though it's namespaced under "app."
    await tx.$executeRawUnsafe(`SET LOCAL app."current_role" = 'OPERATOR'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_region = ''`);
    return callback(tx);
  });
}

/**
 * TODO(auth): Same caveat as withOperatorContext — no real auth exists yet.
 * Since every Listing carries a `contact` phone, we use that to find-or-
 * create the owning farmer's User row and derive RLS context from it. This
 * mirrors how real phone+OTP auth will identify farmers once it's built.
 */
async function withAdminContext(callback) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app."current_role" = 'ADMIN'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_region = ''`);
    return callback(tx);
  });
}

async function getOrCreateFarmerByPhone(phone) {
  return withAdminContext(async (tx) => {
    let user = await tx.user.findUnique({ where: { phone } });
    if (!user) {
      user = await tx.user.create({ data: { phone, role: 'FARMER' } });
    }
    return user;
  });
}

async function withFarmerContext(phone, callback) {
  const farmer = await getOrCreateFarmerByPhone(phone);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${farmer.id}'`);
    await tx.$executeRawUnsafe(`SET LOCAL app."current_role" = 'FARMER'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_region = ''`);
    return callback(tx, farmer);
  });
}

module.exports = { prisma, withOperatorContext, withFarmerContext };