-- Run this AFTER `drizzle-kit generate` + `drizzle-kit migrate` have created the tables.
-- Kept in drizzle/manual/ rather than drizzle/ so drizzle-kit's generated migrations
-- cannot collide with it and so `drizzle-kit migrate` never tries to sequence it.
-- Non-negotiable per project rules: RLS enabled on every table, no exceptions.
--
-- Reference data (ingredients, ingredient_risk_tags, skin_type_sensitivity, products,
-- product_ingredients) is readable by any authenticated user and writable only by the
-- service role (i.e. your own seed scripts / admin tooling) — end users never write to
-- these tables directly. User-owned tables (skin_profiles, history, feedback) get
-- per-user policies once those tables exist in Phase 2/3 — add them there, not here.

alter table ingredients enable row level security;
alter table ingredient_risk_tags enable row level security;
alter table skin_type_sensitivity enable row level security;
alter table products enable row level security;
alter table product_ingredients enable row level security;

create policy "ingredients readable by authenticated users"
  on ingredients for select
  to authenticated
  using (true);

create policy "ingredient_risk_tags readable by authenticated users"
  on ingredient_risk_tags for select
  to authenticated
  using (true);

create policy "skin_type_sensitivity readable by authenticated users"
  on skin_type_sensitivity for select
  to authenticated
  using (true);

create policy "products readable by authenticated users"
  on products for select
  to authenticated
  using (true);

create policy "product_ingredients readable by authenticated users"
  on product_ingredients for select
  to authenticated
  using (true);

-- No insert/update/delete policies for the `authenticated` role on any of these tables —
-- writes only happen via the service role key (seed scripts), which bypasses RLS by design.
-- This is intentional: users can read the reference dataset but cannot modify it.
