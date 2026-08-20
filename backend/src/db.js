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

module.exports = { prisma, withOperatorContext };