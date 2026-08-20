/**
 * prisma/seed.ts
 *
 * Seeds the development database with:
 *   - 5 Ethiopian wholesale markets with real GPS coordinates
 *   - 5 key crops with Amharic and Afaan Oromoo names
 *   - 1 sample verified price per crop
 *
 * Run with:
 *   npx prisma db seed
 *
 * Or:
 *   npx tsx prisma/seed.ts
 */

import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment.");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * Real Ethiopian wholesale markets with WGS-84 coordinates.
 *
 * PostGIS uses:
 *   longitude first
 *   latitude second
 */
const MARKETS = [
  {
    name: "Merkato",
    region: "Addis Ababa",
    lng: 38.7369,
    lat: 9.0192,
  },
  {
    name: "Bahir Dar Wholesale Market",
    region: "Amhara",
    lng: 37.3614,
    lat: 11.5742,
  },
  {
    name: "Adama Grain Market",
    region: "Oromia",
    lng: 39.27,
    lat: 8.54,
  },
  {
    name: "Jimma Coffee Market",
    region: "Oromia",
    lng: 36.8344,
    lat: 7.6731,
  },
  {
    name: "Hawassa Market",
    region: "Sidama",
    lng: 38.4759,
    lat: 7.0621,
  },
];

const CROPS = [
  {
    nameEn: "Teff",
    nameAm: "ጤፍ",
    nameOm: "Xaafii",
  },
  {
    nameEn: "Maize",
    nameAm: "በቆሎ",
    nameOm: "Boqqolloo",
  },
  {
    nameEn: "Wheat",
    nameAm: "ስንዴ",
    nameOm: "Qamadii",
  },
  {
    nameEn: "Red Onion",
    nameAm: "ቀይ ሽንኩርት",
    nameOm: "Qodaa Diimaa",
  },
  {
    nameEn: "Coffee",
    nameAm: "ቡና",
    nameOm: "Bunaa",
  },
];

const SAMPLE_PRICES = [
  {
    crop: "Teff",
    priceValue: 8500,
    unit: "quintal",
    grade: "Grade 1",
  },
  {
    crop: "Maize",
    priceValue: 3200,
    unit: "quintal",
    grade: "Grade 2",
  },
  {
    crop: "Wheat",
    priceValue: 4800,
    unit: "quintal",
    grade: "Grade 1",
  },
  {
    crop: "Red Onion",
    priceValue: 2100,
    unit: "quintal",
    grade: null,
  },
  {
    crop: "Coffee",
    priceValue: 95000,
    unit: "quintal",
    grade: "Washed Grade 1",
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Starting seed...\n");

  // -------------------------------------------------------------------------
  // 1. Seed crops
  // -------------------------------------------------------------------------

  console.log("📦 Seeding crops...");

  const cropRecords: Record<string, { id: string }> = {};

  for (const crop of CROPS) {
    const id = crop.nameEn.toLowerCase().replace(/\s+/g, "_");

    const record = await prisma.crop.upsert({
      where: {
        id,
      },
      update: {
        nameEn: crop.nameEn,
        nameAm: crop.nameAm,
        nameOm: crop.nameOm,
      },
      create: {
        id,
        nameEn: crop.nameEn,
        nameAm: crop.nameAm,
        nameOm: crop.nameOm,
      },
    });

    cropRecords[crop.nameEn] = record;

    console.log(
      `  ✅ ${crop.nameEn} (${crop.nameAm} / ${crop.nameOm})`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Seed markets with PostGIS geo-points
  // -------------------------------------------------------------------------

  console.log("\n🗺️ Seeding markets with geo-points...");

  const marketRecords: Record<string, { id: string }> = {};

  for (const market of MARKETS) {
    const id = market.name.toLowerCase().replace(/\s+/g, "_");

    await prisma.$executeRaw`
      INSERT INTO markets (
        id,
        name,
        region,
        location
      )
      VALUES (
        ${id},
        ${market.name},
        ${market.region},
        ST_SetSRID(
          ST_MakePoint(
            ${market.lng},
            ${market.lat}
          ),
          4326
        )
      )
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        region = EXCLUDED.region,
        location = EXCLUDED.location;
    `;

    marketRecords[market.name] = { id };

    console.log(
      `  ✅ ${market.name} (${market.region}) → POINT(${market.lng} ${market.lat})`
    );
  }

  // -------------------------------------------------------------------------
  // 3. Remove previous seed prices
  // -------------------------------------------------------------------------

  console.log("\n🧹 Removing previous seed prices...");

  await prisma.price.deleteMany({
    where: {
      source: "seed_data",
    },
  });

  // -------------------------------------------------------------------------
  // 4. Seed verified prices at Merkato
  // -------------------------------------------------------------------------

  console.log("\n💰 Seeding sample verified prices at Merkato...");

  const merkatoId = marketRecords["Merkato"].id;

  for (const price of SAMPLE_PRICES) {
    const crop = cropRecords[price.crop];

    if (!crop) {
      throw new Error(`Crop not found: ${price.crop}`);
    }

    await prisma.price.create({
      data: {
        cropId: crop.id,
        marketId: merkatoId,
        priceValue: price.priceValue,
        unit: price.unit,
        grade: price.grade,
        source: "seed_data",
        isVerified: true,
      },
    });

    console.log(
      `  ✅ ${price.crop} — ETB ${price.priceValue.toLocaleString()} / ${price.unit}`
    );
  }

  // -------------------------------------------------------------------------
  // 5. Verify geo-point storage
  // -------------------------------------------------------------------------

  console.log("\n🧪 Verifying geo-point storage...");

  const geoCheck = await prisma.$queryRaw<
    Array<{
      name: string;
      region: string;
      longitude: number;
      latitude: number;
    }>
  >`
    SELECT
      name,
      region,
      ST_X(location::geometry) AS longitude,
      ST_Y(location::geometry) AS latitude
    FROM markets
    ORDER BY name;
  `;

  console.log("\n📍 Market geo-points in database:");
  console.table(geoCheck);

  console.log("\n✅ Seed complete. Database is ready for development.\n");
}

// ---------------------------------------------------------------------------
// Run seed
// ---------------------------------------------------------------------------

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });