/**
 * prisma/seed.ts
 *
 * Seeds the development database with:
 *   - 5 Ethiopian wholesale markets with geo-points
 *   - 5 crops loaded from docs/commodities.json
 *   - 1 sample verified price per crop at Merkato
 *
 * Run with:
 *   npm run seed
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ---------------------------------------------------------------------------
// Prisma 7 database connection
// ---------------------------------------------------------------------------

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

// ---------------------------------------------------------------------------
// Commodity data
// ---------------------------------------------------------------------------

type Commodity = {
  id: string;
  englishName: string;
  amharicName: string;
  oromoName: string;
  unit: string;
};

/**
 * Load Task 2 commodity data from:
 *
 * GEBEREW---MARKET/docs/commodities.json
 *
 * The seed file is located at:
 *
 * GEBEREW---MARKET/backend/prisma/seed.ts
 */
const commoditiesPath = resolve(
  process.cwd(),
  '../docs/commodities.json'
);

const COMMODITIES: Commodity[] = JSON.parse(
  readFileSync(commoditiesPath, 'utf-8')
);

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------

const MARKETS = [
  {
    name: 'Merkato',
    region: 'Addis Ababa',
    lng: 38.7369,
    lat: 9.0192,
  },
  {
    name: 'Bahir Dar Wholesale Market',
    region: 'Amhara',
    lng: 37.3614,
    lat: 11.5742,
  },
  {
    name: 'Adama Grain Market',
    region: 'Oromia',
    lng: 39.27,
    lat: 8.54,
  },
  {
    name: 'Jimma Coffee Market',
    region: 'Oromia',
    lng: 36.8344,
    lat: 7.6731,
  },
  {
    name: 'Hawassa Market',
    region: 'Sidama',
    lng: 38.4759,
    lat: 7.0621,
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Starting seed…\n');

  // -------------------------------------------------------------------------
  // 1. Seed crops from docs/commodities.json
  // -------------------------------------------------------------------------

  console.log('📦 Seeding crops from docs/commodities.json…');

  const cropRecords: Record<string, { id: string }> = {};

  for (const commodity of COMMODITIES) {
    const record = await prisma.crop.upsert({
      where: {
        id: commodity.id,
      },

      update: {
        nameEn: commodity.englishName,
        nameAm: commodity.amharicName,
        nameOm: commodity.oromoName,
      },

      create: {
        id: commodity.id,
        nameEn: commodity.englishName,
        nameAm: commodity.amharicName,
        nameOm: commodity.oromoName,
      },
    });

    cropRecords[commodity.id] = {
      id: record.id,
    };

    console.log(
      `  ✅ ${commodity.englishName} (${commodity.amharicName} / ${commodity.oromoName})`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Seed markets with geo-points
  // -------------------------------------------------------------------------

  console.log('\n🗺️  Seeding markets with geo-points…');

  const marketRecords: Record<string, { id: string }> = {};

  for (const market of MARKETS) {
    const id = market.name.toLowerCase().replace(/\s+/g, '_');

    await prisma.$executeRaw`
      INSERT INTO markets (id, name, region, location)
      VALUES (
        ${id},
        ${market.name},
        ${market.region},
        ST_SetSRID(
          ST_MakePoint(${market.lng}, ${market.lat}),
          4326
        )
      )
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            region = EXCLUDED.region,
            location = EXCLUDED.location;
    `;

    marketRecords[market.name] = { id };

    console.log(
      `  ✅ ${market.name} (${market.region}) → POINT(${market.lng} ${market.lat})`
    );
  }

  // -------------------------------------------------------------------------
  // 3. Seed sample verified prices
  // -------------------------------------------------------------------------

  console.log('\n💰 Seeding sample verified prices at Merkato…');

  const samplePrices = [
    {
      commodityId: 'teff',
      priceValue: 8500,
      unit: 'quintal',
      grade: 'Grade 1',
    },
    {
      commodityId: 'maize',
      priceValue: 3200,
      unit: 'quintal',
      grade: 'Grade 2',
    },
    {
      commodityId: 'wheat',
      priceValue: 4800,
      unit: 'quintal',
      grade: 'Grade 1',
    },
    {
      commodityId: 'red-onion',
      priceValue: 2100,
      unit: 'quintal',
      grade: null,
    },
    {
      commodityId: 'coffee',
      priceValue: 95000,
      unit: 'quintal',
      grade: 'Washed Grade 1',
    },
  ];

  const merkatoId = 'merkato';

  for (const price of samplePrices) {
    const crop = cropRecords[price.commodityId];

    if (!crop) {
      throw new Error(
        `Crop "${price.commodityId}" was not found in commodities.json`
      );
    }

    await prisma.price.create({
      data: {
        cropId: crop.id,
        marketId: merkatoId,
        priceValue: price.priceValue,
        unit: price.unit,
        grade: price.grade,
        source: 'seed_data',
        isVerified: true,
      },
    });

    console.log(
      `  ✅ ${price.commodityId} — ETB ${price.priceValue.toLocaleString()} / ${price.unit}`
    );
  }

  // -------------------------------------------------------------------------
  // 4. Verify geo-point storage
  // -------------------------------------------------------------------------

  console.log('\n🧪 Verifying geo-point storage…');

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

  console.log('\n  Market geo-points in database:');
  console.table(geoCheck);

  console.log('\n✅ Seed complete. Database is ready for development.\n');
}

// ---------------------------------------------------------------------------
// Run seed
// ---------------------------------------------------------------------------

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });