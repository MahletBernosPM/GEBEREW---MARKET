-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'BUYER', 'COOPERATIVE', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SmsDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FARMER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "name_am" TEXT NOT NULL,
    "name_om" TEXT NOT NULL,
    "name_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "location" geometry(Point, 4326),

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "grade" TEXT,
    "unit" TEXT NOT NULL,
    "price_value" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crop_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "grade" TEXT,
    "pickup_location" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "crop_id" TEXT NOT NULL,
    "market_id" TEXT,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyer_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_messages" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "intent" TEXT,
    "response" TEXT NOT NULL,
    "direction" "SmsDirection" NOT NULL,
    "cost" DECIMAL(8,4),
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS on User-Facing Tables
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;

-- 3. Listings Policies
CREATE POLICY admin_all_listings ON "listings"
FOR ALL USING (current_setting('app.current_role', true) = 'ADMIN');

CREATE POLICY farmer_own_listings ON "listings"
FOR ALL USING (
  current_setting('app.current_role', true) = 'FARMER'
  AND "farmer_id" = current_setting('app.current_user_id', true)
);

CREATE POLICY buyer_active_listings ON "listings"
FOR SELECT USING (
  current_setting('app.current_role', true) = 'BUYER'
  AND status = 'ACTIVE'
);

-- Note: Operator region policy requires an application-level context injection of their assigned region/market.
CREATE POLICY operator_region_listings ON "listings"
FOR SELECT USING (
  current_setting('app.current_role', true) = 'OPERATOR'
);

-- 4. Inquiries Policies
CREATE POLICY admin_all_inquiries ON "inquiries"
FOR ALL USING (current_setting('app.current_role', true) = 'ADMIN');

CREATE POLICY farmer_listing_inquiries ON "inquiries"
FOR SELECT USING (
  current_setting('app.current_role', true) = 'FARMER'
  AND "listing_id" IN (
      SELECT id FROM "listings" WHERE "farmer_id" = current_setting('app.current_user_id', true)
  )
);

CREATE POLICY buyer_own_inquiries ON "inquiries"
FOR ALL USING (
  current_setting('app.current_role', true) = 'BUYER'
  AND "buyer_id" = current_setting('app.current_user_id', true)
);