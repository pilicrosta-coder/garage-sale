import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SALE_CONFIG;
const configured = cfg && cfg.supabaseUrl.startsWith('https://') && !cfg.supabaseAnonKey.startsWith('PEGAR_');
const sb = configured ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const money = n => new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS', maximumFractionDigits: 0}).format(n);

let items = [];
let chosen = null;
let demoLive = null;
const MINE_KEY = 'piluki-garage-reservations';
const TABS = ['como-funciona', 'muebles', 'chiquitaje', 'mis-reservas', 'cargar'];
const phoneKey = value => String(value ?? '').replace(/\D/g, '');

const demo = [
  {id: 1, category: 'muebles', title: 'Mesa de petiribí macizo', description: '6 años de uso. Madera maciza de petiribí.', medidas: '140 × 80 × 75 cm', fotos: 'images/IMG_6761.jpeg', price: 790000, image: 'images/IMG_6760.jpeg', stock_available: 1, stock_reserved: 0, stock_sold: 0},
  {id: 2, category: 'muebles', title: 'Juego de 6 sillas', description: 'Estructura metálica y tapizado gris · Usadas', price: 450000, image: 'images/IMG_6762.jpeg', stock_available: 1, stock_reserved: 0, stock_sold: 0},
  {id: 3, category: 'chiquitaje', title: 'Aspiradora', description: 'Precio de ejemplo · hay dos iguales', price: 85000, image: '', stock_available: 2, stock_reserved: 0, stock_sold: 0},
  {id: 4, category: 'chiquitaje', title: 'Lámpara', description: 'Precio de ejemplo · esta unidad ya está reservada', price: 35000, image: '', stock_available: 0, stock_reserved: 1, stock_sold: 0},
  {id: 5, category: 'chiquitaje', title: 'Microondas', description: 'Precio de ejemplo · había 3 y ya se vendió 1', price: 70000, image: '', stock_available: 2, stock_reserved: 0, stock_sold: 1}
];

function units(p) {
  return {
    available: Number(p.stock_available) || 0,
    reserved: Number(p.stock_reserved) || 0,
    sold: Number(p.stock_sold) || 0
  };
}

function phase(p) {
  const u = units(p);
  if (u.available > 0) return 'available';
  if (u.reserved > 0) return 'reserved';
  return 'sold';
}

function card(p) {
  const u = units(p);
  const state = phase(p);
  const badge = state === 'available' ? 'Disponible' : state === 'reserved' ? 'Reservado' : 'Vendido';
  const label = state === 'available' ? '¡Lo quiero! Reservar' : state === 'reserved' ? 'Ya reservado' : 'Vendido';
  const photo = p.image
    ? photoTag(p.image, p.title)
    : `<div class="placeholder">${esc(p.title)}</div>`;
  return `<article class="product is-${state}" data-id="${p.id}">
    <div class="photo">${photo}<span class="status ${state === 'available' ? '' : state}">${badge}</span></div>
    <div class="product-top"><h3>${esc(p.title)}</h3><div class="price">${money(p.price)}</div></div>
    <ul class="stock">
      <li><span>Stock</span><strong>${u.available}</strong></li>
      <li class="${u.reserved > 0 ? 'reserved-count' : ''}"><span>Reservados</span><strong>${u.reserved}</strong></li>
      <li><span>Vendidos</span><strong>${u.sold}</strong></li>
    </ul>
    <div class="card-actions">
      <button type="button" class="pill pill-ghost" data-open="${p.id}">Ver</button>
      <button type="button" class="pill" data-reserve="${p.id}" ${u.available < 1 ? 'disabled' : ''}>${label}</button>
    </div>
  </article>`;
}

let photoOpenedAt = 0;
function openPhoto(src, alt) {
  if (!src) return;
  const img = $('photoFull');
  img.src = src;
  img.alt = alt || '';
  const dialog = $('photoDialog');
  photoOpenedAt = Date.now();
  if (!dialog.open) dialog.showModal();
}

function photosOf(p) {
  const extra = String(p.fotos || '').split(/\n|,/).map(s => s.trim()).filter(Boolean);
  const all = [];
  if (p.image) all.push(p.image);
  for (const src of extra) if (!all.includes(src)) all.push(src);
  return all;
}

function openPublication(id) {
  const product = items.find(p => String(p.id) === String(id));
  if (!product) {
    showTab('muebles');
    return;
  }
  const u = units(product);
  const photos = photosOf(product);
  const main = photos[0]
    ? photoTag(photos[0], product.title, 'pubMain')
    : `<div class="placeholder">${esc(product.title)}</div>`;
  const thumbs = photos.length > 1
    ? `<div class="pub-thumbs">${photos.map((src, i) => `<button type="button" class="${i === 0 ? 'is-on' : ''}" data-photo="${esc(src)}">${photoTag(src, '')}</button>`).join('')}</div>`
    : '';
  $('pubPhotos').innerHTML = `<div class="pub-main">${main}</div>${thumbs}`;
  $('pubTitle').textContent = product.title;
  $('pubPrice').textContent = money(product.price);
  $('pubStock').innerHTML = `<li><span>Stock</span><strong>${u.available}</strong></li><li class="${u.reserved > 0 ? 'reserved-count' : ''}"><span>Reservados</span><strong>${u.reserved}</strong></li><li><span>Vendidos</span><strong>${u.sold}</strong></li>`;
  $('pubMedidas').hidden = !product.medidas;
  $('pubMedidas').innerHTML = product.medidas ? `<h3>Medidas</h3><p>${esc(product.medidas)}</p>` : '';
  $('pubDescription').hidden = !product.description;
  $('pubDescription').innerHTML = product.description ? `<h3>Descripción</h3><p>${esc(product.description)}</p>` : '';
  const reserve = $('pubReserve');
  reserve.disabled = u.available < 1;
  reserve.textContent = u.available > 0 ? '¡Lo quiero! Reservar' : (u.reserved > 0 ? 'Ya reservado' : 'Vendido');
  reserve.dataset.reserve = product.id;
  $('pubPhotos').querySelectorAll('[data-photo]').forEach(button => {
    button.onclick = async () => {
      const shown = button.querySelector('img');
      const ready = shown && shown.naturalWidth > 0 && !isHeicUrl(shown.currentSrc || shown.src);
      const url = ready ? (shown.currentSrc || shown.src) : await jpegUrl(button.dataset.photo);
      button.dataset.photo = url;
      $('pubMain').src = url;
      $('pubPhotos').querySelectorAll('[data-photo]').forEach(other => other.classList.toggle('is-on', other === button));
    };
  });
  revealHeic($('pubPhotos'));
  const mainPhoto = $('pubMain');
  if (mainPhoto) {
    mainPhoto.classList.add('can-zoom');
    mainPhoto.onclick = () => openPhoto(mainPhoto.currentSrc || mainPhoto.src, mainPhoto.alt);
  }
  $('pubBack').dataset.tab = product.category;
  $('pubBack').textContent = product.category === 'chiquitaje' ? 'Volver a chiquitaje' : 'Volver a muebles';
  document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== 'publicacion'; });
  document.querySelectorAll('nav [data-tab]').forEach(link => link.classList.toggle('is-on', link.dataset.tab === product.category));
  const next = '#publicacion-' + product.id;
  if (location.hash !== next) history.pushState(null, '', next);
  window.scrollTo(0, 0);
}

function byStockThenPrice(a, b) {
  const stock = (units(b).available > 0) - (units(a).available > 0);
  if (stock) return stock;
  return Number(b.price) - Number(a.price);
}

function render() {
  for (const [category, id] of [['muebles', 'products-muebles'], ['chiquitaje', 'products-chiquitaje']]) {
    const html = items.filter(p => p.category === category).sort(byStockThenPrice).map(card).join('');
    $(id).innerHTML = html || '<p class="empty">Todavía no hay artículos en esta sección.</p>';
  }
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openPublication(b.dataset.open)));
  document.querySelectorAll('.product').forEach(article => article.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    openPublication(article.dataset.id);
  }));
  document.querySelectorAll('[data-reserve]').forEach(b => b.addEventListener('click', () => openReserve(b.dataset.reserve)));
  revealHeic($('products-muebles'));
  revealHeic($('products-chiquitaje'));
}

async function load() {
  if (!sb) {
    if (!demoLive) demoLive = demo.map(p => ({...p}));
    items = demoLive;
    render();
    return;
  }
  const columns = 'id,title,description,medidas,fotos,price,image,category,stock_available,stock_reserved,stock_sold';
  let {data, error} = await sb.from('products').select(columns).order('id');
  if (error) {
    const again = await sb.from('products').select('id,title,description,price,image,category,stock_available,stock_reserved,stock_sold').order('id');
    data = again.data;
    error = again.error;
  }
  if (error) {
    $('notice').hidden = false;
    $('notice').textContent = 'No se pudo cargar el catálogo: ' + error.message;
    return;
  }
  items = data;
  render();
}

function openReserve(id) {
  chosen = items.find(p => String(p.id) === String(id));
  if (!chosen || units(chosen).available < 1) return;
  const left = units(chosen).available;
  $('reserveTitle').textContent = chosen.title;
  $('reserveHint').textContent = left > 1
    ? `Reservás 1 de ${left} unidades. El resto sigue disponible para otra persona.`
    : 'Al confirmar, esta unidad queda reservada a tu nombre. Después coordinamos la compra.';
  $('reserveMessage').textContent = '';
  $('reserveForm').reset();
  $('reserveDialog').showModal();
}

$('reserveForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!chosen || units(chosen).available < 1) return;
  const btn = $('reserveSubmit');
  const name = $('buyerName').value.trim();
  const phone = $('buyerPhone').value.trim();
  btn.disabled = true;
  btn.textContent = 'Reservando…';
  if (!sb) {
    chosen.stock_available -= 1;
    chosen.stock_reserved += 1;
    rememberMine({title: chosen.title, price: chosen.price, phone, name});
    btn.disabled = false;
    btn.textContent = 'Confirmar reserva';
    $('reserveMessage').textContent = '¡Reservado! Lo vas a ver en Mis reservas con este WhatsApp.';
    render();
    setTimeout(() => { if ($('reserveDialog').open) $('reserveDialog').close(); }, 1600);
    return;
  }
  const {error} = await sb.rpc('reserve_product', {p_product_id: chosen.id, p_buyer_name: name, p_buyer_phone: phone});
  btn.disabled = false;
  btn.textContent = 'Confirmar reserva';
  if (error) {
    $('reserveMessage').textContent = error.message.includes('already reserved')
      ? 'Alguien acaba de reservar la última unidad.'
      : `No se pudo reservar: ${error.message}`;
    await load();
    return;
  }
  $('reserveMessage').textContent = '¡Reservado! Tu lugar quedó registrado. Te contactaremos para coordinar la compra.';
  await load();
  setTimeout(() => { if ($('reserveDialog').open) $('reserveDialog').close(); }, 2200);
});

document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
$('pubReserve').addEventListener('click', () => openReserve($('pubReserve').dataset.reserve));

function rememberMine(entry) {
  const mine = JSON.parse(localStorage.getItem(MINE_KEY) || '[]');
  mine.push({...entry, at: new Date().toISOString()});
  localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  $('minePhone').value = entry.phone;
}

function renderMine(rows) {
  if (!rows.length) {
    $('myList').innerHTML = '<p class="empty">Con ese WhatsApp no hay reservas.</p>';
    return;
  }
  $('myList').innerHTML = rows.map(row => `<article class="mine-item"><div><strong>${esc(row.title)}</strong><div>${money(row.price)}</div></div><em>Reservado</em></article>`).join('');
}

function showTab(id) {
  const tab = TABS.includes(id) ? id : 'como-funciona';
  document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== tab; });
  document.querySelectorAll('nav [data-tab]').forEach(link => {
    const on = link.dataset.tab === tab;
    link.classList.toggle('is-on', on);
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  event.preventDefault();
  showTab(tab.dataset.tab);
});

$('mineForm').addEventListener('submit', async event => {
  event.preventDefault();
  const phone = $('minePhone').value.trim();
  if (phoneKey(phone).length < 6) {
    $('myList').innerHTML = '<p class="empty">Poné un WhatsApp completo.</p>';
    return;
  }
  if (!sb) {
    const mine = JSON.parse(localStorage.getItem(MINE_KEY) || '[]');
    renderMine(mine.filter(row => phoneKey(row.phone) === phoneKey(phone)));
    return;
  }
  const {data, error} = await sb.rpc('my_reservations', {p_phone: phone});
  if (error) {
    $('myList').innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    return;
  }
  renderMine(data || []);
});

function route() {
  const hash = (location.hash || '#como-funciona').slice(1);
  if (hash.startsWith('publicacion-')) {
    openPublication(hash.slice('publicacion-'.length));
    return;
  }
  showTab(hash);
  if (hash === 'cargar') refreshCargar();
}

async function refreshCargar() {
  if (!sb) {
    $('cargarLoginMsg').textContent = 'Primero tiene que estar conectada la base.';
    return;
  }
  const {data: {user}} = await sb.auth.getUser();
  const ok = user && user.email?.toLowerCase() === cfg.adminEmail.toLowerCase();
  $('cargarLogin').hidden = !!ok;
  $('cargarForm').hidden = !ok;
}

$('cargarLoginBtn').addEventListener('click', async () => {
  sessionStorage.setItem('piluki-after-login', 'cargar');
  const {error} = await sb.auth.signInWithOtp({
    email: cfg.adminEmail,
    options: {emailRedirectTo: location.origin + location.pathname}
  });
  $('cargarLoginMsg').textContent = error ? error.message : 'Revisá pilicrosta@gmail.com y abrí el enlace.';
});

const looksHeic = file => /\.hei[cf]$/i.test(file.name) || /^image\/hei[cf]/i.test(file.type);
const isHeicUrl = url => /\.hei[cf](?:$|\?)/i.test(String(url || ''));
function localJpeg(url) {
  const name = decodeURIComponent(String(url || '').split('/').pop() || '').replace(/\.hei[cf]$/i, '.jpg');
  return name ? 'images/' + name : '';
}
function photoTag(src, alt, id) {
  const idAttr = id ? ` id="${id}"` : '';
  if (isHeicUrl(src)) return `<img src="${esc(localJpeg(src))}" data-heic="${esc(src)}" alt="${esc(alt)}"${idAttr}>`;
  return `<img src="${esc(src)}" alt="${esc(alt)}"${idAttr}>`;
}
let heicTo;
const jpegUrls = new Map();
async function jpegUrl(url) {
  if (!isHeicUrl(url)) return url;
  if (!jpegUrls.has(url)) {
    jpegUrls.set(url, (async () => {
      if (!heicTo) ({heicTo} = await import('https://cdn.jsdelivr.net/npm/heic-to@1.6.6/dist/heic-to.js'));
      const response = await fetch(url);
      if (!response.ok) throw new Error('foto');
      const jpeg = await heicTo({blob: await response.blob(), type: 'image/jpeg', quality: 0.85});
      return URL.createObjectURL(jpeg);
    })());
  }
  return jpegUrls.get(url);
}
async function revealHeic(root) {
  if (!root) return;
  const images = [...root.querySelectorAll('img[data-heic]')];
  await Promise.all(images.map(img => new Promise(resolve => {
    const keep = () => {
      const button = img.closest('[data-photo]');
      if (button && img.naturalWidth > 0) button.dataset.photo = img.currentSrc || img.src;
      img.removeAttribute('data-heic');
      resolve();
    };
    const useRemote = async () => {
      try {
        img.src = await jpegUrl(img.dataset.heic);
        keep();
      } catch {
        img.alt = 'No se pudo mostrar la foto';
        resolve();
      }
    };
    if (img.complete && img.naturalWidth > 0) return keep();
    if (img.complete && img.naturalWidth === 0) return useRemote();
    img.addEventListener('load', keep, {once: true});
    img.addEventListener('error', () => useRemote(), {once: true});
  })));
}
async function jpegFile(file) {
  if (!looksHeic(file)) return file;
  try {
    if (!heicTo) ({heicTo} = await import('https://cdn.jsdelivr.net/npm/heic-to@1.6.6/dist/heic-to.js'));
    const blob = await heicTo({blob: file, type: 'image/jpeg', quality: 0.85});
    return new File([blob], file.name.replace(/\.hei[cf]$/i, '') + '.jpg', {type: 'image/jpeg'});
  } catch {
    throw new Error('No pude pasar ' + file.name + ' a JPEG.');
  }
}

$('cargarForm').addEventListener('submit', async event => {
  event.preventDefault();
  const msg = $('cargarMsg');
  const button = event.target.querySelector('button');
  button.disabled = true;
  msg.textContent = 'Subiendo…';
  try {
    const upload = async file => {
      const path = `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '-')}`;
      const {error} = await sb.storage.from('productos').upload(path, file, {contentType: file.type || 'image/jpeg'});
      if (error) throw error;
      return sb.storage.from('productos').getPublicUrl(path).data.publicUrl;
    };
    const coverSource = $('cargarFoto').files[0];
    const extraSources = [...$('cargarFotos').files];
    if ([coverSource, ...extraSources].some(looksHeic)) msg.textContent = 'Pasando las fotos a JPEG…';
    const coverJpeg = await jpegFile(coverSource);
    const extraJpegs = [];
    for (const file of extraSources) extraJpegs.push(await jpegFile(file));
    msg.textContent = 'Subiendo…';
    const cover = await upload(coverJpeg);
    const extras = [];
    for (const file of extraJpegs) extras.push(await upload(file));
    const {error} = await sb.from('products').insert({
      title: $('cargarTitulo').value.trim(),
      category: $('cargarCategoria').value,
      price: Number($('cargarPrecio').value),
      stock_available: Number($('cargarStock').value),
      stock_reserved: 0,
      stock_sold: 0,
      medidas: $('cargarMedidas').value.trim(),
      description: $('cargarDescripcion').value.trim(),
      image: cover,
      fotos: extras.join('\n')
    });
    if (error) throw error;
    event.target.reset();
    msg.textContent = 'Listo. Ya está en el catálogo.';
    await load();
  } catch (error) {
    msg.textContent = error.message || 'No se pudo guardar. Si dice que el bucket no existe, corré el SQL de fotos en Supabase.';
  }
  button.disabled = false;
});

if (sb) {
  sb.channel('sale-updates').on('postgres_changes', {event: '*', schema: 'public', table: 'products'}, () => load()).subscribe();
  sb.auth.onAuthStateChange(() => {
    if (sessionStorage.getItem('piluki-after-login') === 'cargar') {
      sessionStorage.removeItem('piluki-after-login');
      showTab('cargar');
    }
    if (location.hash === '#cargar') refreshCargar();
  });
}
$('photoDialog').addEventListener('click', event => {
  if (Date.now() - photoOpenedAt < 400) return;
  if (event.target === $('photoDialog') || event.target.closest('[data-close-photo]')) $('photoDialog').close();
});
window.addEventListener('hashchange', route);
load().then(route);
