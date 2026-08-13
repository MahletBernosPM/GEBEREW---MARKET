-- AlterTable: Add assigned_region for operator role scoping
ALTER TABLE "users" ADD COLUMN "assigned_region" TEXT;

-- ============================================================
-- ROW LEVEL SECURITY — Complete Implementation
--
-- How session context works:
--   Every API request sets these Postgres session variables:
--     SET LOCAL app.current_user_id = '<uuid>';
--     SET LOCAL app.current_role    = 'FARMER' | 'BUYER' | 'COOPERATIVE' | 'OPERATOR' | 'ADMIN';
--     SET LOCAL app.current_region  = '<region-name>';  -- operators only
--
--   RLS policies read these via current_setting().
--   The 'true' second arg means "return '' if not set" (no error).
-- ============================================================


-- ============================================================
-- TABLE: users
-- ============================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Admins can do anything on any user row
CREATE POLICY admin_all_users ON "users"
FOR ALL USING (
  current_setting('app.current_role', true) = 'ADMIN'
);

-- Any authenticated user can read their own profile
CREATE POLICY user_own_profile ON "users"
FOR SELECT USING (
  "id" = current_setting('app.current_user_id', true)
);

-- Any authenticated user can update their own profile
CREATE POLICY user_update_own_profile ON "users"
FOR UPDATE USING (
  "id" = current_setting('app.current_user_id', true)
);

-- Operators can read all user profiles (needed to resolve farmer contacts on listings)
CREATE POLICY operator_read_users ON "users"
FOR SELECT USING (
  current_setting('app.current_role', true) = 'OPERATOR'
);


-- ============================================================
-- TABLE: prices
-- ============================================================
ALTER TABLE "prices" ENABLE ROW LEVEL SECURITY;

-- Admins can do anything on prices
CREATE POLICY admin_all_prices ON "prices"
FOR ALL USING (
  current_setting('app.current_role', true) = 'ADMIN'
);

-- Operators can read AND write prices (they submit and verify them)
CREATE POLICY operator_all_prices ON "prices"
FOR ALL USING (
  current_setting('app.current_role', true) = 'OPERATOR'
);

-- Farmers, buyers, and cooperatives can only READ verified prices
CREATE POLICY public_verified_prices ON "prices"
FOR SELECT USING (
  current_setting('app.current_role', true) IN ('FARMER', 'BUYER', 'COOPERATIVE')
  AND "is_verified" = true
);


-- ============================================================
-- TABLE: sms_messages
-- ============================================================
ALTER TABLE "sms_messages" ENABLE ROW LEVEL SECURITY;

-- Admins can do anything on SMS logs
CREATE POLICY admin_all_sms ON "sms_messages"
FOR ALL USING (
  current_setting('app.current_role', true) = 'ADMIN'
);

-- Operators can read all SMS messages (for support, cost tracking, and delivery health)
CREATE POLICY operator_read_sms ON "sms_messages"
FOR SELECT USING (
  current_setting('app.current_role', true) = 'OPERATOR'
);

-- Users can only see their own SMS history
CREATE POLICY user_own_sms ON "sms_messages"
FOR SELECT USING (
  "user_id" = current_setting('app.current_user_id', true)
);


-- ============================================================
-- TABLE: listings  (UPDATE existing policies)
-- ============================================================

-- Drop the placeholder operator policy and replace with region-scoped one
DROP POLICY operator_region_listings ON "listings";

-- Operators see ALL listings in their assigned region.
-- If app.current_region is empty/unset, they see nothing (safe default).
CREATE POLICY operator_region_listings ON "listings"
FOR ALL USING (
  current_setting('app.current_role', true) = 'OPERATOR'
  AND "market_id" IN (
    SELECT id FROM "markets"
    WHERE region = current_setting('app.current_region', true)
  )
);

-- Cooperatives can create and manage listings on behalf of their farmer members.
-- They are stored as the farmer_id for those listings.
CREATE POLICY cooperative_own_listings ON "listings"
FOR ALL USING (
  current_setting('app.current_role', true) = 'COOPERATIVE'
  AND "farmer_id" = current_setting('app.current_user_id', true)
);


-- ============================================================
-- TABLE: inquiries  (ADD missing policies)
-- ============================================================

-- Operators can read all inquiries in their region (via listing → market → region)
CREATE POLICY operator_region_inquiries ON "inquiries"
FOR SELECT USING (
  current_setting('app.current_role', true) = 'OPERATOR'
  AND "listing_id" IN (
    SELECT l.id FROM "listings" l
    JOIN "markets" m ON l.market_id = m.id
    WHERE m.region = current_setting('app.current_region', true)
  )
);

-- Cooperatives can manage inquiries they created as a buyer
CREATE POLICY cooperative_own_inquiries ON "inquiries"
FOR ALL USING (
  current_setting('app.current_role', true) = 'COOPERATIVE'
  AND "buyer_id" = current_setting('app.current_user_id', true)
);

-- Admins see all inquiries (already in first migration, adding here for completeness check)
-- Note: admin_all_inquiries already exists from migration 1, skipped.
