-- ============================================================
-- Atelier Angélique – Supabase Schema (safe to re-run)
-- ============================================================

-- Helper function: check if current user is admin (avoids repeating subquery)
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 1. Products
create table if not exists public.products (
  id             text primary key,
  name           text not null,
  category       text not null,
  price          numeric(10,2) not null,
  original_price numeric(10,2),
  image          text not null default '',
  images         jsonb not null default '[]',
  badge          text,
  description    text not null default '',
  stock          int  not null default 0,
  created_at     timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "public read products" on public.products;
drop policy if exists "admin write products" on public.products;
create policy "public read products" on public.products for select using (true);
create policy "admin write products" on public.products for all
  using  (public.is_admin())
  with check (public.is_admin());

-- 2. Profiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  phone         text not null default '',
  role          text not null default 'user' check (role in ('user','admin')),
  saved_items   jsonb not null default '[]',
  cart_snapshot jsonb not null default '[]',
  joined_at     timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "users read own profile"   on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "admins read all profiles" on public.profiles;
drop policy if exists "service insert profile"   on public.profiles;
-- Users can read/update their own profile; admins can read all
create policy "users read own profile"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "service insert profile"   on public.profiles for insert with check (auth.uid() = id);

-- 3. Orders
create table if not exists public.orders (
  id                text primary key,
  user_id           uuid not null references auth.users(id),
  user_name         text not null,
  user_email        text not null,
  items             jsonb not null default '[]',
  total             numeric(10,2) not null,
  delivery_location text not null,
  placed_at         timestamptz not null default now(),
  status            text not null default 'pending',
  tracking_history  jsonb not null default '[]'
);
alter table public.orders enable row level security;
drop policy if exists "users read own orders"   on public.orders;
drop policy if exists "users insert own orders" on public.orders;
drop policy if exists "admins manage orders"    on public.orders;
create policy "users read own orders"   on public.orders for select using (auth.uid() = user_id or public.is_admin());
create policy "users insert own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "admins manage orders"    on public.orders for update using (public.is_admin());
create policy "admins delete orders"    on public.orders for delete using (public.is_admin());

-- 4. Notifications
create table if not exists public.notifications (
  id      text primary key,
  type    text not null check (type in ('purchase','signup')),
  message text not null,
  at      timestamptz not null default now(),
  read    boolean not null default false,
  user_id uuid references auth.users(id)
);
alter table public.notifications enable row level security;
drop policy if exists "admins manage notifications" on public.notifications;
drop policy if exists "users insert notifications"  on public.notifications;
create policy "admins manage notifications" on public.notifications for all using (public.is_admin());
-- Allow authenticated users to insert (for signup/purchase notifications)
create policy "users insert notifications" on public.notifications for insert with check (auth.uid() is not null);

-- 5. Site settings (single row)
create table if not exists public.site_settings (
  id                int primary key default 1 check (id = 1),
  announcement      text not null default '',
  hero_title        text not null default '',
  hero_subtitle     text not null default '',
  hero_cta          text not null default '',
  nav_links         jsonb not null default '[]',
  categories        jsonb not null default '[]',
  footer_tagline    text not null default '',
  footer_email      text not null default '',
  footer_phone      text not null default '',
  footer_address    text not null default '',
  footer_copyright  text not null default '',
  promo_label       text not null default '',
  promo_title       text not null default '',
  promo_highlight   text not null default '',
  promo_subtitle    text not null default '',
  promo_cta         text not null default '',
  currency_code     text not null default 'USD',
  currency_symbol   text not null default '$',
  currency_position text not null default 'before'
);
alter table public.site_settings enable row level security;
drop policy if exists "public read settings" on public.site_settings;
drop policy if exists "admin write settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (true);
create policy "admin write settings" on public.site_settings for all
  using  (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Seed: site settings (upsert so re-runs update existing row)
-- ============================================================
insert into public.site_settings (
  id, announcement, hero_title, hero_subtitle, hero_cta,
  nav_links, categories,
  footer_tagline, footer_email, footer_phone, footer_address, footer_copyright,
  promo_label, promo_title, promo_highlight, promo_subtitle, promo_cta,
  currency_code, currency_symbol, currency_position
) values (
  1,
  'Fait Main, Fait Avec Amour · Free shipping over $99',
  'Handcrafted' || chr(10) || 'With Love',
  'Discover unique crochet wear & accessories made by hand, for you.',
  'Shop Collection',
  '["Home","Shop","Crochet Wear","Accessories","Sale"]',
  '[
    {"id":"c1","name":"Crochet Wear","desc":"Handmade Elegance","image":"https://images.unsplash.com/photo-1533659828870-95ee305cee3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"},
    {"id":"c2","name":"Accessories","desc":"Finishing Touches","image":"https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"},
    {"id":"c3","name":"New In","desc":"Latest Drops","image":"https://images.unsplash.com/photo-1555529771-835f59fc5efe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"},
    {"id":"c4","name":"Sale","desc":"Special Offers","image":"https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"}
  ]',
  'Handcrafted crochet wear & accessories made with love, one stitch at a time.',
  'hello@atelier-angelique.com',
  '+1 (555) 123-4567',
  'Paris, France',
  '© 2024 Atelier Angélique. All rights reserved.',
  'Limited Time', 'Seasonal Sale', '30% Off',
  'Each piece is unique — don''t miss your favourite while it lasts.',
  'Shop Sale',
  'USD', '$', 'before'
)
on conflict (id) do update set
  announcement      = excluded.announcement,
  hero_title        = excluded.hero_title,
  hero_subtitle     = excluded.hero_subtitle,
  hero_cta          = excluded.hero_cta,
  nav_links         = excluded.nav_links,
  categories        = excluded.categories,
  footer_tagline    = excluded.footer_tagline,
  footer_email      = excluded.footer_email,
  footer_phone      = excluded.footer_phone,
  footer_address    = excluded.footer_address,
  footer_copyright  = excluded.footer_copyright,
  promo_label       = excluded.promo_label,
  promo_title       = excluded.promo_title,
  promo_highlight   = excluded.promo_highlight,
  promo_subtitle    = excluded.promo_subtitle,
  promo_cta         = excluded.promo_cta,
  currency_code     = excluded.currency_code,
  currency_symbol   = excluded.currency_symbol,
  currency_position = excluded.currency_position;

-- ============================================================
-- Seed: sample products (skip if already exist)
-- ============================================================
insert into public.products (id, name, category, price, original_price, image, images, badge, description, stock) values
('p-001','Crochet Summer Dress','Crochet Wear',89.00,120.00,'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','Sale','A beautiful handmade crochet summer dress, perfect for warm days. Each stitch is crafted with love.',8),
('p-002','Boho Crochet Top','Crochet Wear',55.00,null,'https://images.unsplash.com/photo-1509631179647-0177331693ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1509631179647-0177331693ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','New','Lightweight boho crochet top with an open-weave design. Handmade and one of a kind.',12),
('p-003','Crochet Cardigan','Crochet Wear',75.00,95.00,'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','Sale','Cosy handcrafted crochet cardigan with button detail. Perfect layering piece for any season.',6),
('p-004','Handmade Crochet Bag','Accessories',45.00,null,'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]',null,'Artisan crochet tote bag with woven handles. Spacious, stylish and entirely handmade.',15),
('p-005','Crochet Sun Hat','Accessories',35.00,null,'https://images.unsplash.com/photo-1521369909029-2afed882baee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1521369909029-2afed882baee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','New','Wide-brim crochet sun hat, handwoven in natural cotton. Lightweight and chic.',10),
('p-006','Crochet Bucket Hat','Accessories',30.00,40.00,'https://images.unsplash.com/photo-1534215754734-18e55d13e346?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1534215754734-18e55d13e346?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','Sale','Trendy crochet bucket hat in soft pastel yarn. A handmade statement piece.',9),
('p-007','Lace Crochet Blouse','New In',65.00,null,'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1523381210434-271e8be1f52b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','New','Delicate lace-style crochet blouse, new to the collection. Feminine and elegant.',7),
('p-008','Crochet Mini Skirt','New In',50.00,null,'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1571513722275-4b41940f54b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','New','Flirty handmade crochet mini skirt, just dropped. Available in limited quantities.',5),
('p-009','Crochet Beach Cover-Up','Sale',40.00,70.00,'https://images.unsplash.com/photo-1560243563-062bfc001d68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1560243563-062bfc001d68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','Sale','Open-weave crochet beach cover-up. Lightweight, breezy and perfect for summer.',11),
('p-010','Crochet Halter Top','Sale',38.00,55.00,'https://images.unsplash.com/photo-1617922001439-4a2e6562f328?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600','["https://images.unsplash.com/photo-1617922001439-4a2e6562f328?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"]','Sale','Strappy crochet halter top on sale. Handmade in soft cotton yarn.',14)
on conflict (id) do nothing;

-- ============================================================
-- Admin user setup
-- Run AFTER creating admin@angelique.com in Auth → Users
-- ============================================================
update public.profiles
set role = 'admin',
    name = 'Angélique'
where id = (select id from auth.users where email = 'admin@angelique.com');
