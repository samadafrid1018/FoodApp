-- FoodApp database schema (Supabase / PostgreSQL)
-- Run the whole file in the Supabase SQL Editor of a new project.
-- Note: reconstructed from the SQL used while building the app.
-- Test it once on a fresh Supabase project before relying on it.

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'customer',
  created_at timestamptz default now()
);

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  rating numeric default 0,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null,
  price numeric not null,
  description text,
  image_url text,
  created_at timestamptz default now()
);

-- user_id is stored as text, so policies compare auth.uid()::text = user_id
create table if not exists orders (
  id bigint generated always as identity primary key,
  user_id text not null,
  customer_name text,
  delivery_address text,
  items jsonb not null,
  total numeric not null,
  status text not null default 'Pending',
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  order_id bigint references orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reviewer_name text,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now(),
  unique (order_id)
);

create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  token text not null,
  created_at timestamptz default now(),
  unique (user_id, token)
);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- Every new user gets a profile with the 'customer' role
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recalculate the restaurant's average rating after every new review
create or replace function public.update_restaurant_rating()
returns trigger as $$
begin
  update restaurants
  set rating = (
    select round(avg(rating)::numeric, 1)
    from reviews
    where restaurant_id = new.restaurant_id
  )
  where id = new.restaurant_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_added on reviews;
create trigger on_review_added
  after insert on reviews
  for each row execute function public.update_restaurant_rating();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table profiles enable row level security;
alter table restaurants enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table reviews enable row level security;
alter table device_tokens enable row level security;

-- profiles: users can read only their own row. There is NO update policy,
-- so nobody can change their own role from the app.
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
on profiles for select to authenticated
using (auth.uid() = id);

-- restaurants
drop policy if exists "Logged in users can read restaurants" on restaurants;
create policy "Logged in users can read restaurants"
on restaurants for select to authenticated using (true);

drop policy if exists "Admins can insert restaurants" on restaurants;
create policy "Admins can insert restaurants"
on restaurants for insert to authenticated
with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can delete restaurants" on restaurants;
create policy "Admins can delete restaurants"
on restaurants for delete to authenticated
using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- menu_items
drop policy if exists "Logged in users can read menu items" on menu_items;
create policy "Logged in users can read menu items"
on menu_items for select to authenticated using (true);

drop policy if exists "Admins can insert menu items" on menu_items;
create policy "Admins can insert menu items"
on menu_items for insert to authenticated
with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can delete menu items" on menu_items;
create policy "Admins can delete menu items"
on menu_items for delete to authenticated
using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- orders
drop policy if exists "Users can insert own orders" on orders;
create policy "Users can insert own orders"
on orders for insert to authenticated
with check (auth.uid()::text = user_id);

drop policy if exists "Users can view own orders" on orders;
create policy "Users can view own orders"
on orders for select to authenticated
using (auth.uid()::text = user_id);

drop policy if exists "Admins can view all orders" on orders;
create policy "Admins can view all orders"
on orders for select to authenticated
using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update orders" on orders;
create policy "Admins can update orders"
on orders for update to authenticated
using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- reviews
drop policy if exists "Users can insert own review" on reviews;
create policy "Users can insert own review"
on reviews for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Everyone can read reviews" on reviews;
create policy "Everyone can read reviews"
on reviews for select to authenticated using (true);

-- device_tokens
-- The update policy is intentionally open on "using" because one phone can be
-- used by several accounts (same FCM token). "with check" still forces the
-- row to belong to the logged-in user.
drop policy if exists "Users can insert own token" on device_tokens;
create policy "Users can insert own token"
on device_tokens for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view own token" on device_tokens;
create policy "Users can view own token"
on device_tokens for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update own token" on device_tokens;
create policy "Users can update own token"
on device_tokens for update to authenticated
using (true)
with check (auth.uid() = user_id);

-- =========================================================
-- STORAGE (restaurant and menu photos)
-- =========================================================

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "Admins can upload images" on storage.objects;
create policy "Admins can upload images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'images' and
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Anyone can view images" on storage.objects;
create policy "Anyone can view images"
on storage.objects for select to public
using (bucket_id = 'images');

-- =========================================================
-- FIRST ADMIN
-- =========================================================
-- Sign up in the app first, then run (with your own email):
-- update profiles set role = 'admin' where email = 'you@example.com';
