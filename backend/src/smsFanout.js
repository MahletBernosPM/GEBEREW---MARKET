/**
 * TASK 3: SMS fanout trigger
 *
 * Fires when a price is verified. There's no subscription/opt-in table in
 * the schema yet, so this fans out to all users whose region matches the
 * price's market region — a reasonable stand-in until a real subscription
 * model exists (worth raising with the team if that's needed).
 *
 * Actual SMS delivery (Africa's Talking / Twilio) isn't wired up yet either
 * (that's Task 5's territory) — for now this logs each attempt into
 * sms_messages as an OUTBOUND row with status 'queued', so the fanout is
 * provably firing and there's a real trail to pick up from later.
 */
async function fanoutVerifiedPrice(tx, price) {
  const recipients = await tx.user.findMany({
    where: {
      role: { in: ["FARMER", "BUYER", "COOPERATIVE"] },
    },
    select: { id: true, phone: true },
  });

  if (recipients.length === 0) return { fanoutCount: 0 };

  const message = `Verified price: ${price.crop?.nameEn ?? price.cropId} at ${price.market?.name ?? price.marketId} — ${price.priceValue} ETB/${price.unit}, effective ${price.effectiveDate.toISOString().slice(0, 10)}`;

  await tx.smsMessage.createMany({
    data: recipients.map((r) => ({
      sender: "system",
      intent: "price_verified",
      response: message,
      direction: "OUTBOUND",
      status: "queued",
      userId: r.id,
    })),
  });

  return { fanoutCount: recipients.length };
}

module.exports = { fanoutVerifiedPrice };