-- Removals Marketplace — Phase 1 Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query → paste → Run)

-- ========== TABLES ==========

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text[] default '{}',
  years_trading int,
  fleet_size int default 0,
  fleet_detail jsonb default '{}',
  staff_count int default 0,
  warehouse_sqft int,
  memberships text[] default '{}',
  git_limit numeric,
  pli_limit numeric,
  insurance_expiry date,
  verified boolean default false,
  rating_avg numeric default 0,
  rating_count int default 0,
  created_at timestamptz default now()
);

create table company_users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  role text default 'owner' check (role in ('owner', 'admin', 'dispatcher')),
  name text,
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type text check (type in ('goods_in_transit', 'public_liability', 'membership')),
  file_url text,
  expiry_date date,
  verified boolean default false,
  uploaded_at timestamptz default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type text check (type in ('staff', 'vehicle')),
  direction text check (direction in ('request', 'offer')),
  date_from date not null,
  date_to date,
  location text,
  detail jsonb default '{}',
  rate numeric,
  status text default 'open' check (status in ('open', 'matched', 'closed')),
  created_at timestamptz default now()
);

create table listing_responses (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  responding_company_id uuid references companies(id) on delete cascade,
  message text,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  rater_company_id uuid references companies(id) on delete cascade,
  rated_company_id uuid references companies(id) on delete cascade,
  score int check (score between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  sender_company_id uuid references companies(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- ========== ROW LEVEL SECURITY ==========

alter table companies enable row level security;
alter table company_users enable row level security;
alter table documents enable row level security;
alter table listings enable row level security;
alter table listing_responses enable row level security;
alter table reviews enable row level security;
alter table messages enable row level security;

-- companies: anyone logged in can read public profile fields (all columns for now —
-- we keep sensitive stuff like git_limit/pli_limit out of the UI rather than the DB
-- at phase 1 to keep this simple; documents table below IS properly locked down)
create policy "companies readable by authenticated" on companies
  for select using (auth.role() = 'authenticated');

create policy "companies updatable by own members" on companies
  for update using (id = (select company_id from company_users where id = auth.uid()));

create policy "companies insertable by authenticated" on companies
  for insert with check (auth.role() = 'authenticated');

-- company_users: can read your own company's users, manage your own row
create policy "company_users readable by same company" on company_users
  for select using (company_id = (select company_id from company_users where id = auth.uid()));

create policy "company_users self insert" on company_users
  for insert with check (id = auth.uid());

create policy "company_users self update" on company_users
  for update using (id = auth.uid());

-- documents: ONLY the owning company can read. This is the trust gate.
create policy "documents owner only" on documents
  for select using (company_id = (select company_id from company_users where id = auth.uid()));

create policy "documents owner insert" on documents
  for insert with check (company_id = (select company_id from company_users where id = auth.uid()));

-- listings: open listings readable by anyone authenticated; own listings always readable
create policy "listings readable" on listings
  for select using (
    status = 'open'
    or company_id = (select company_id from company_users where id = auth.uid())
  );

create policy "listings insert own" on listings
  for insert with check (company_id = (select company_id from company_users where id = auth.uid()));

create policy "listings update own" on listings
  for update using (company_id = (select company_id from company_users where id = auth.uid()));

-- listing_responses: poster sees all responses to their listing; responder sees only their own
create policy "responses readable" on listing_responses
  for select using (
    responding_company_id = (select company_id from company_users where id = auth.uid())
    or listing_id in (select id from listings where company_id = (select company_id from company_users where id = auth.uid()))
  );

create policy "responses insert own" on listing_responses
  for insert with check (responding_company_id = (select company_id from company_users where id = auth.uid()));

create policy "responses update by poster" on listing_responses
  for update using (
    listing_id in (select id from listings where company_id = (select company_id from company_users where id = auth.uid()))
  );

-- reviews: readable by anyone authenticated (they inform trading card scores)
create policy "reviews readable" on reviews
  for select using (auth.role() = 'authenticated');

create policy "reviews insert own" on reviews
  for insert with check (rater_company_id = (select company_id from company_users where id = auth.uid()));

-- messages: only readable by the two companies involved in the listing
create policy "messages readable by involved parties" on messages
  for select using (
    sender_company_id = (select company_id from company_users where id = auth.uid())
    or listing_id in (select id from listings where company_id = (select company_id from company_users where id = auth.uid()))
    or listing_id in (
      select listing_id from listing_responses
      where responding_company_id = (select company_id from company_users where id = auth.uid())
      and status = 'accepted'
    )
  );

create policy "messages insert own" on messages
  for insert with check (sender_company_id = (select company_id from company_users where id = auth.uid()));

-- ========== RATING TRIGGER ==========
-- Keeps companies.rating_avg / rating_count up to date automatically

create or replace function update_company_rating()
returns trigger as $$
begin
  update companies
  set
    rating_count = (select count(*) from reviews where rated_company_id = new.rated_company_id),
    rating_avg = (select round(avg(score)::numeric, 1) from reviews where rated_company_id = new.rated_company_id)
  where id = new.rated_company_id;
  return new;
end;
$$ language plpgsql;

create trigger on_review_insert
after insert on reviews
for each row execute function update_company_rating();
