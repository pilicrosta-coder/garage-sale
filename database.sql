-- Ejecutar en Supabase SQL Editor. La administración queda solo para pilicrosta@gmail.com.
create table if not exists public.products (
 id bigint generated always as identity primary key,
 title text not null, description text not null default '', price integer not null check(price>=0),
 image text not null default '',
 medidas text not null default '',
 fotos text not null default '',
 category text not null check(category in ('muebles','chiquitaje')),
 stock_available integer not null default 1 check(stock_available >= 0),
 stock_reserved integer not null default 0 check(stock_reserved >= 0),
 stock_sold integer not null default 0 check(stock_sold >= 0),
 created_at timestamptz not null default now(),
 constraint stock_cap check (stock_available + stock_reserved + stock_sold between 1 and 3)
);
create table if not exists public.reservations (
 id bigint generated always as identity primary key,
 product_id bigint not null references public.products(id), buyer_name text not null,
 buyer_phone text not null, created_at timestamptz not null default now()
);
create index if not exists reservations_by_product on public.reservations(product_id);
create or replace function public.is_sale_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select lower(coalesce((select auth.jwt()->>'email'),'')) = 'pilicrosta@gmail.com'
$$;
revoke all on function public.is_sale_admin() from public;
grant execute on function public.is_sale_admin() to authenticated;
alter table public.products enable row level security;
alter table public.reservations enable row level security;
create policy "Everyone can view product catalog" on public.products for select to anon, authenticated using(true);
create policy "Only admin can manage products" on public.products for all to authenticated using(public.is_sale_admin()) with check(public.is_sale_admin());
create policy "Only admin can see reservations" on public.reservations for select to authenticated using(public.is_sale_admin());
create or replace view public.admin_reservations with (security_invoker=true) as
 select p.id, p.title, p.price, p.category, p.stock_available, p.stock_reserved, p.stock_sold,
        r.id as reservation_id, r.buyer_name, r.buyer_phone, r.created_at as reserved_at
 from public.products p left join public.reservations r on r.product_id = p.id;
grant select on public.admin_reservations to authenticated;
create or replace function public.reserve_product(p_product_id bigint, p_buyer_name text, p_buyer_phone text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if length(trim(p_buyer_name)) not between 2 and 80 or length(trim(p_buyer_phone)) not between 6 and 40 then
  raise exception 'Invalid buyer details';
 end if;
 update public.products
  set stock_available = stock_available - 1, stock_reserved = stock_reserved + 1
  where id = p_product_id and stock_available > 0;
 if not found then raise exception 'Product already reserved'; end if;
 insert into public.reservations(product_id, buyer_name, buyer_phone)
 values(p_product_id, trim(p_buyer_name), trim(p_buyer_phone));
 return true;
end;$$;
revoke all on function public.reserve_product(bigint, text, text) from public;
grant execute on function public.reserve_product(bigint, text, text) to anon, authenticated;
drop function if exists public.admin_set_status(bigint, text);
create or replace function public.admin_set_status(p_reservation_id bigint, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
 v_product bigint;
begin
 if not public.is_sale_admin() then raise exception 'Not authorized'; end if;
 select product_id into v_product from public.reservations where id = p_reservation_id;
 if not found then raise exception 'Reservation not found'; end if;
 if p_status = 'sold' then
  update public.products set stock_reserved = stock_reserved - 1, stock_sold = stock_sold + 1
   where id = v_product and stock_reserved > 0;
 elsif p_status = 'available' then
  update public.products set stock_reserved = stock_reserved - 1, stock_available = stock_available + 1
   where id = v_product and stock_reserved > 0;
 else
  raise exception 'Invalid status';
 end if;
 if not found then raise exception 'No reserved stock'; end if;
 delete from public.reservations where id = p_reservation_id;
 return true;
end;$$;
revoke all on function public.admin_set_status(bigint, text) from public;
grant execute on function public.admin_set_status(bigint, text) to authenticated;
insert into public.products(title, description, price, image, category, stock_available, stock_reserved, stock_sold) values
 ('Mesa de petiribí macizo', '140 × 80 × 75 cm · 6 años de uso · Madera maciza', 790000, 'images/IMG_6760.jpeg', 'muebles', 1, 0, 0),
 ('Juego de 6 sillas', 'Estructura metálica y tapizado gris · Usadas', 450000, 'images/IMG_6762.jpeg', 'muebles', 1, 0, 0),
 ('Aspiradora', 'Precio de ejemplo · hay dos iguales', 85000, '', 'chiquitaje', 2, 0, 0),
 ('Lámpara', 'Precio de ejemplo · esta unidad ya está reservada', 35000, '', 'chiquitaje', 0, 1, 0),
 ('Microondas', 'Precio de ejemplo · había 3 y ya se vendió 1', 70000, '', 'chiquitaje', 2, 0, 1);
insert into public.reservations(product_id, buyer_name, buyer_phone)
 select id, 'Reserva de ejemplo', '+54 9 11 0000-0000' from public.products where title = 'Lámpara';
create or replace function public.my_reservations(p_phone text)
returns table (title text, price integer, category text, reserved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.title, p.price, p.category, r.created_at
  from public.reservations r
  join public.products p on p.id = r.product_id
  where length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 6
    and regexp_replace(r.buyer_phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
$$;
revoke all on function public.my_reservations(text) from public;
grant execute on function public.my_reservations(text) to anon, authenticated;
-- Si la tabla ya existe, correr solo esto. medidas es texto libre. fotos: una ruta o URL por línea.
alter table public.products add column if not exists medidas text not null default '';
alter table public.products add column if not exists fotos text not null default '';
update public.products
 set medidas = '140 × 80 × 75 cm',
     fotos = 'images/IMG_6761.jpeg'
 where id = 1 and medidas = '';
-- Fotos de productos. Correr una vez en SQL Editor.
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;
create policy "Public reads product photos" on storage.objects
for select to public using (bucket_id = 'productos');
create policy "Admin uploads product photos" on storage.objects
for insert to authenticated with check (bucket_id = 'productos' and public.is_sale_admin());
-- Para actualizaciones en tiempo real, activar Realtime para public.products en Supabase.
