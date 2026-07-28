/**
 * TASK: SMS gateway listener
 * Parses raw inbound SMS text into a structured submission.
 * Expected format (v1): "PRICE <COMMODITY> <PRICE> <REGION>"
 * e.g. "PRICE TEFF 4500 OROMIA"
 */
function parseSmsSubmission(text) {
  const parts = text.trim().toUpperCase().split(/\s+/);

  if (parts[0] !== 'PRICE' || parts.length < 4) {
    return { valid: false, error: 'Invalid format. Use: PRICE <COMMODITY> <PRICE> <REGION>' };
  }

  const [, commodity, priceStr, region] = parts;
  const price = Number(priceStr);

  if (isNaN(price) || price <= 0) {
    return { valid: false, error: 'Invalid price' };
  }

  return {
    valid: true,
    commodityId: commodity.toLowerCase(),
    price,
    region: region.toLowerCase(),
  };
}

module.exports = { parseSmsSubmission };
