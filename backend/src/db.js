async function withBuyerContext(callback) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app."current_role" = 'BUYER'`
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_region = ''`
    );

    return callback(tx);
  });
}

module.exports = {
  prisma,
  withOperatorContext,
  withSystemContext,
  withAdminContext,
  getOrCreateFarmerByPhone,
  withFarmerContext,
  withBuyerContext,
};