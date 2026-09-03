const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

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
 * TODO(auth): Same stand-in as withOperatorContext above — until real auth
 * exists, SMS-originated actions (creating a user on first contact, logging
 * sms_messages) need a role that RLS actually grants INSERT to. Right now
 * only ADMIN has a write policy on `users` and `sms_messages` (see
 * SCHEMA.md section 8 — admin_all_users / admin_all_sms are the only ALL
 * policies on those tables). Flagged to the team; replace once a real
 * SERVICE/SYSTEM role or per-request auth exists.
 */
async function withSystemContext(callback) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app."current_role" = 'ADMIN'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_region = ''`);
    return callback(tx);
  });
}

module.exports = { prisma, withOperatorContext, withSystemContext };
