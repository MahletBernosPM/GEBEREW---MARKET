/**
 * prisma/seed.ts
 *
 * Seeds the development database with:
 *   - 5 Ethiopian wholesale markets with real GPS coordinates (geo-points)
 *   - 5 key crops with Amharic and Afaan Oromoo names
 *   - 1 sample verified price per crop to prove the price board works
 *
 * Run with:   npx prisma db seed
 * Or:         npx tsx prisma/seed.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * Real Ethiopian wholesale markets with WGS-84 coordinates.
 * PostGIS stores these as geometry(Point, 4326) — longitude first, then latitude.
 */
const MARKETS = [
  {
    name: 'Merkato',
    region: 'Addis Ababa',
    // Addis Ababa Merkato — largest open-air market in Africa
    lng: 38.7369,
    lat: 9.0192,
  },
  {
    name: 'Bahir Dar Wholesale Market',
    region: 'Amhara',
    // Bahir Dar, capital of Amhara region
    lng: 37.3614,
    lat: 11.5742,
  },
  {
    name: 'Adama Grain Market',
    region: 'Oromia',
    // Adama (Nazret), major grain trade hub in Oromia
    lng: 39.2700,
    lat: 8.5400,
  },
  {
    name: 'Jimma Coffee Market',
    region: 'Oromia',
    // Jimma — historic center of Ethiopian coffee trade
    lng: 36.8344,
    lat: 7.6731,
  },
  {
    name: 'Hawassa Market',
    region: 'Sidama',
    // Hawassa, Sidama region
    lng: 38.4759,
    lat: 7.0621,
  },
];

/**
 * Core crops with Amharic (name_am) and Afaan Oromoo (name_om) names,
 * as required by the spec so the app works in both languages.
 */
const CROPS = [
  { nameEn: 'Teff',      nameAm: 'ጤፍ',         nameOm: 'Xaafii' },
  { nameEn: 'Maize',     nameAm: 'በቆሎ',        nameOm: 'Boqqolloo' },
  { nameEn: 'Wheat',     nameAm: 'ስንዴ',         nameOm: 'Qamadii' },
  { nameEn: 'Red Onion', nameAm: 'ቀይ ሽንኩርት',   nameOm: 'Qodaa Diimaa' },
  { nameEn: 'Coffee',    nameAm: 'ቡና',          nameOm: 'Bunaa' },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Starting seed…\n');

  // 1. Upsert crops --------------------------------------------------------
  console.log('📦 Seeding crops…');
  const cropRecords: Record<string, { id: string }> = {};

  for (const crop of CROPS) {
    const record = await prisma.crop.upsert({
      where: { id: crop.nameEn.toLowerCase().replace(/\s+/g, '_') },
      update: {},
      create: {
        id: crop.nameEn.toLowerCase().replace(/\s+/g, '_'),
        nameEn: crop.nameEn,
        nameAm: crop.nameAm,
        nameOm: crop.nameOm,
      },
    });
    cropRecords[crop.nameEn] = record;
    console.log(`  ✅ ${crop.nameEn} (${crop.nameAm} / ${crop.nameOm})`);
  }

  // 2. Upsert markets with geo-points -------------------------------------
  console.log('\n🗺️  Seeding markets with geo-points…');
  const marketRecords: Record<string, { id: string }> = {};

  for (const market of MARKETS) {
    const id = market.name.toLowerCase().replace(/\s+/g, '_');

    // Prisma doesn't support geometry types natively — use raw SQL for upsert
    await prisma.$executeRaw`
      INSERT INTO markets (id, name, region, location)
      VALUES (
        ${id},
        ${market.name},
        ${market.region},
        ST_SetSRID(ST_MakePoint(${market.lng}, ${market.lat}), 4326)
      )
      ON CONFLICT (id) DO UPDATE
        SET name     = EXCLUDED.name,
            region   = EXCLUDED.region,
            location = EXCLUDED.location;
    `;

    marketRecords[market.name] = { id };
    console.log(`  ✅ ${market.name} (${market.region}) → POINT(${market.lng} ${market.lat})`);
  }

  // 3. Seed one verified price per crop at Merkato ------------------------
  console.log('\n💰 Seeding sample verified prices at Merkato…');

  const samplePrices = [
    { crop: 'Teff',      priceValue: 8500,  unit: 'quintal', grade: 'Grade 1' },
    { crop: 'Maize',     priceValue: 3200,  unit: 'quintal', grade: 'Grade 2' },
    { crop: 'Wheat',     priceValue: 4800,  unit: 'quintal', grade: 'Grade 1' },
    { crop: 'Red Onion', priceValue: 2100,  unit: 'quintal', grade: null },
    { crop: 'Coffee',    priceValue: 95000, unit: 'quintal', grade: 'Washed Grade 1' },
  ];

  const merkatoId = 'merkato';

  for (const p of samplePrices) {
    await prisma.price.create({
      data: {
        cropId:     cropRecords[p.crop].id,
        marketId:   merkatoId,
        priceValue: p.priceValue,
        unit:       p.unit,
        grade:      p.grade,
        source:     'seed_data',
        isVerified: true,
      },
    });
    console.log(`  ✅ ${p.crop} — ETB ${p.priceValue.toLocaleString()} / ${p.unit}`);
  }

  // 4. Verify geo-point storage works ------------------------------------
  console.log('\n🧪 Verifying geo-point storage…');

  const geoCheck = await prisma.$queryRaw<
    Array<{ name: string; region: string; longitude: number; latitude: number }>
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

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
