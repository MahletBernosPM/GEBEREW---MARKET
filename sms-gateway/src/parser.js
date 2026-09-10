/**
 * sms-gateway/src/parser.js
 *
 * Case-insensitive, multi-language SMS command parser for:
 *   - English
 *   - Amharic (አማርኛ)
 *   - Afaan Oromoo
 *
 * Supported Intents:
 *   1. QUERY_PRICE  (e.g., "PRICE TEFF", "ዋጋ ጤፍ", "GATI XAAFII")
 *   2. SUBMIT_LISTING (e.g., "SELL TEFF 8500 10 ADAMA", "ሽያጭ ጤፍ 8500 10 አዳማ", "GURGURTAA XAAFII 8500 10 ADAMA")
 */

// Multilingual crop mapping to standard commodity database IDs
const CROP_MAP = {
  // Teff
  teff: "teff",
  ጤፍ: "teff",
  xaafii: "teff",
  xafii: "teff",

  // Maize
  maize: "maize",
  corn: "maize",
  በቆሎ: "maize",
  boqqolloo: "maize",
  boqollo: "maize",

  // Wheat
  wheat: "wheat",
  ስንዴ: "wheat",
  qamadii: "wheat",
  qamadi: "wheat",

  // Red Onion
  "red-onion": "red-onion",
  "red onion": "red-onion",
  onion: "red-onion",
  redonion: "red-onion",
  "ቀይ ሽንኩርት": "red-onion",
  ቀይሽንኩርት: "red-onion",
  ሽንኩርት: "red-onion",
  "qullubbii diimaa": "red-onion",
  qullubbiidiimaa: "red-onion",
  qullubbii: "red-onion",
  "qullubbii diima": "red-onion",

  // Coffee
  coffee: "coffee",
  ቡና: "coffee",
  buna: "coffee",
};

// Command Action Keywords
const PRICE_KEYWORDS = new Set([
  "PRICE",
  "QUERY",
  "CHECK",
  "ዋጋ",
  "GATI",
  "GATII",
]);
const SELL_KEYWORDS = new Set([
  "SELL",
  "LIST",
  "OFFER",
  "ሽያጭ",
  "እሸጣለሁ",
  "GURGURTAA",
  "GURGURU",
]);

/**
 * Normalizes input text into standardized tokens
 */
function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text.trim().toLowerCase().split(/\s+/);
}

/**
 * Resolves a crop token or multi-word phrase to a canonical crop ID
 */
function resolveCropId(tokens, startIndex) {
  // First check 2-word combinations (e.g., "red onion", "ቀይ ሽንኩርት" or "qullubbii diimaa")
  if (startIndex + 1 < tokens.length) {
    const twoWordCandidate = `${tokens[startIndex]} ${tokens[startIndex + 1]}`;
    if (CROP_MAP[twoWordCandidate]) {
      return { cropId: CROP_MAP[twoWordCandidate], consumedTokens: 2 };
    }
  }

  // Then check single token
  const singleToken = tokens[startIndex];
  if (singleToken && CROP_MAP[singleToken]) {
    return { cropId: CROP_MAP[singleToken], consumedTokens: 1 };
  }

  return { cropId: null, consumedTokens: 0 };
}

/**
 * Parses raw SMS text into a structured intent payload
 */
function parseSmsCommand(rawText) {
  if (!rawText || !rawText.trim()) {
    return {
      valid: false,
      intent: "UNKNOWN",
      error: "Empty SMS text received.",
      helpText:
        'Send "PRICE TEFF" or "SELL TEFF 8500 10 ADAMA" / "ዋጋ ጤፍ" / "GATI XAAFII"',
    };
  }

  const tokens = tokenize(rawText);
  const action = tokens[0].toUpperCase();

  // 1. PRICE QUERY INTENT
  if (PRICE_KEYWORDS.has(action)) {
    if (tokens.length < 2) {
      return {
        valid: false,
        intent: "QUERY_PRICE",
        error: "Missing crop name for price query.",
        helpText:
          "Use format: PRICE <CROP> (e.g. PRICE TEFF, ዋጋ ጤፍ, GATI XAAFII)",
      };
    }

    const { cropId } = resolveCropId(tokens, 1);
    if (!cropId) {
      return {
        valid: false,
        intent: "QUERY_PRICE",
        error: `Unrecognized crop: "${tokens.slice(1).join(" ")}"`,
        helpText:
          "Supported crops: Teff (ጤፍ/Xaafii), Maize (በቆሎ/Boqqolloo), Wheat (ስንዴ/Qamadii), Red Onion (ቀይ ሽንኩርት/Qullubbii), Coffee (ቡና/Buna).",
      };
    }

    return {
      valid: true,
      intent: "QUERY_PRICE",
      cropId,
    };
  }

  // 2. SUBMIT LISTING INTENT
  if (SELL_KEYWORDS.has(action)) {
    // Expected format: SELL <CROP> <PRICE> [QUANTITY] <LOCATION>
    if (tokens.length < 3) {
      return {
        valid: false,
        intent: "SUBMIT_LISTING",
        error: "Incomplete listing command.",
        helpText:
          "Use format: SELL <CROP> <PRICE> [QUANTITY] <LOCATION> (e.g. SELL TEFF 8500 10 ADAMA)",
      };
    }

    const { cropId, consumedTokens } = resolveCropId(tokens, 1);
    if (!cropId) {
      return {
        valid: false,
        intent: "SUBMIT_LISTING",
        error: `Unrecognized crop: "${tokens[1]}"`,
        helpText: "Supported crops: Teff, Maize, Wheat, Red Onion, Coffee.",
      };
    }

    const priceIndex = 1 + consumedTokens;
    if (priceIndex >= tokens.length) {
      return {
        valid: false,
        intent: "SUBMIT_LISTING",
        error: "Missing price amount.",
        helpText: "Use format: SELL <CROP> <PRICE> [QUANTITY] <LOCATION>",
      };
    }

    const price = Number(tokens[priceIndex]);
    if (isNaN(price) || price <= 0) {
      return {
        valid: false,
        intent: "SUBMIT_LISTING",
        error: `Invalid price amount: "${tokens[priceIndex]}"`,
      };
    }

    // Next token after price
    const nextIndex = priceIndex + 1;
    let quantity = 1;
    let locationIndex = nextIndex;

    if (nextIndex < tokens.length) {
      const maybeQuantity = Number(tokens[nextIndex]);
      if (!isNaN(maybeQuantity) && maybeQuantity > 0) {
        quantity = maybeQuantity;
        locationIndex = nextIndex + 1;
      }
    }

    const location =
      tokens.slice(locationIndex).join(" ").toUpperCase() || "GENERAL";

    return {
      valid: true,
      intent: "SUBMIT_LISTING",
      cropId,
      price,
      quantity,
      pickupLocation: location,
    };
  }

  // 3. FALLBACK: Direct Crop Query (e.g. user just texts "TEFF" or "ጤፍ")
  const directCrop = resolveCropId(tokens, 0);
  if (directCrop.cropId) {
    return {
      valid: true,
      intent: "QUERY_PRICE",
      cropId: directCrop.cropId,
    };
  }

  // UNKNOWN INTENT
  return {
    valid: false,
    intent: "UNKNOWN",
    error: `Unknown command "${tokens[0]}".`,
    helpText:
      "Available commands: PRICE <CROP> (e.g. PRICE TEFF / ዋጋ ጤፍ / GATI XAAFII) or SELL <CROP> <PRICE> <QTY> <LOCATION>.",
  };
}

module.exports = { parseSmsCommand, CROP_MAP };
