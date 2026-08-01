/* =========================================================
   REVENANT LAB — front-end behaviour
   No dependencies. Cart persists to localStorage.
   Compliance rule: purity is shown only when a batch value
   is provided (product.purity) — never assumed.
   ========================================================= */

'use strict';

/* ---------------- Catalogue data ---------------- */
const CATEGORIES = [
  { id: 'all',        label: 'All' },
  { id: 'incretin',   label: 'GLP-1 / Incretin' },
  { id: 'repair',     label: 'Tissue Repair' },
  { id: 'longevity',  label: 'Longevity & Cellular' },
  { id: 'copper',     label: 'Copper & Skin' },
  { id: 'cognitive',  label: 'Cognitive & Neuro' },
  { id: 'solvent',    label: 'Reconstitution' },
];

/* Prices in AUD. `purity` intentionally omitted unless batch-verified. */
const PRODUCTS = [
  { id: 'reta-10',   name: 'Retatrutide', dose: '10 MG',  price: 129, cat: 'incretin',
    desc: 'Triple-agonist research peptide studied in metabolic and incretin-signalling assays.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'tirz-10',   name: 'Tirzepatide', dose: '10 MG',  price: 109, cat: 'incretin',
    desc: 'Dual GIP/GLP-1 receptor research peptide for in-vitro metabolic study.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'sema-5',    name: 'Semaglutide', dose: '5 MG',   price: 89,  cat: 'incretin',
    desc: 'GLP-1 receptor research peptide widely referenced in incretin literature.',
    tags: ['Lyophilised', 'COA per batch'] },

  { id: 'bpc-10',    name: 'BPC-157', dose: '10 MG',      price: 65,  cat: 'repair',
    desc: 'Pentadecapeptide studied in tissue-repair and angiogenesis research models.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'tb500-10',  name: 'TB-500', dose: '10 MG',       price: 72,  cat: 'repair',
    desc: 'Thymosin beta-4 fragment referenced in cell-migration research.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'kpv-10',    name: 'KPV', dose: '10 MG',          price: 58,  cat: 'repair',
    desc: 'Tripeptide fragment studied for its role in inflammatory-pathway research.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'klow',      name: 'KLOW Blend', dose: 'BLEND',   price: 149, cat: 'repair',
    desc: 'Composite research blend (GHK-Cu, BPC-157, TB-500, KPV) for combination assays.',
    tags: ['Blend', 'COA per batch'] },

  { id: 'nad-500',   name: 'NAD+', dose: '500 MG',        price: 95,  cat: 'longevity',
    desc: 'Nicotinamide adenine dinucleotide referenced in cellular-energy research.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'epi-10',    name: 'Epithalon', dose: '10 MG',    price: 55,  cat: 'longevity',
    desc: 'Tetrapeptide studied in telomere and circadian research models.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'mots-10',   name: 'MOTS-c', dose: '10 MG',       price: 79,  cat: 'longevity',
    desc: 'Mitochondrial-derived peptide referenced in metabolic-signalling study.',
    tags: ['Lyophilised', 'COA per batch'] },

  { id: 'ghk-50',    name: 'GHK-Cu', dose: '50 MG',       price: 62,  cat: 'copper',
    desc: 'Copper-binding tripeptide complex studied in skin and matrix research.',
    tags: ['Lyophilised', 'COA per batch'] },

  { id: 'semax-10',  name: 'Semax', dose: '10 MG',        price: 68,  cat: 'cognitive',
    desc: 'Heptapeptide referenced in neurotrophic and cognitive research.',
    tags: ['Lyophilised', 'COA per batch'] },
  { id: 'selank-10', name: 'Selank', dose: '10 MG',       price: 64,  cat: 'cognitive',
    desc: 'Synthetic peptide studied in anxiolytic-pathway research models.',
    tags: ['Lyophilised', 'COA per batch'] },

  { id: 'bac-3',     name: 'Bacteriostatic Water', dose: '3 ML',  price: 12, cat: 'solvent',
    desc: 'Laboratory reconstitution solvent for lyophilised reference materials.',
    tags: ['Solvent', 'Research use'] },
  { id: 'bac-10',    name: 'Bacteriostatic Water', dose: '10 ML', price: 18, cat: 'solvent',
    desc: 'Larger-volume laboratory reconstitution solvent for research handling.',
    tags: ['Solvent', 'Research use'] },
];

/* ---------------- Small helpers ---------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const money = (n) => 'A$' + n.toFixed(2);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- Cart (localStorage) ---------------- */
const CART_KEY = 'revenant_cart_v1';

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}
function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private mode */ }
}
let cart = loadCart();

function cartCount() {
  return Object.values(cart).reduce((n, qty) => n + qty, 0);
}
function cartSubtotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return p ? sum + p.price * qty : sum;
  }, 0);
}
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  saveCart(cart);
  syncCartUI();
}
function setQty(id, qty) {
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
  syncCartUI();
  renderDrawer();
}

/* ---------------- Render catalogue ---------------- */
function catLabel(id) {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? c.label : id;
}

function productCard(p) {
  return `
    <article class="product reveal" data-cat="${p.cat}">
      <div class="product__face">
        <div class="product__brand">
          <span class="n">REVENANT</span>
          <span class="l">LAB</span>
        </div>
        <div class="product__name">${escapeHtml(p.name)}</div>
        <span class="product__dose">${escapeHtml(p.dose)}</span>
        <div class="product__foot">LABORATORY RESEARCH ONLY</div>
      </div>
      <div class="product__body">
        <span class="product__cat">${escapeHtml(catLabel(p.cat))}</span>
        <p class="product__desc">${escapeHtml(p.desc)}</p>
        <div class="product__tags">
          ${p.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}
          ${p.purity ? `<span>${escapeHtml(p.purity)}</span>` : ''}
        </div>
        <div class="product__buy">
          <span class="product__price">${money(p.price)} <small>AUD</small></span>
          <button class="add" type="button" data-add="${p.id}">Add</button>
        </div>
      </div>
    </article>`;
}

function renderProducts(filter = 'all') {
  const grid = $('#productGrid');
  const list = filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.cat === filter);
  grid.innerHTML = list.map(productCard).join('');
  observeReveals();
}

function renderFilters() {
  const wrap = $('#filters');
  wrap.innerHTML = CATEGORIES.map((c, i) =>
    `<button class="chip ${i === 0 ? 'is-active' : ''}" role="tab" data-filter="${c.id}">${escapeHtml(c.label)}</button>`
  ).join('');

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    $$('.chip', wrap).forEach((c) => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    renderProducts(btn.dataset.filter);
  });
}

/* ---------------- Cart UI sync ---------------- */
function syncCartUI() {
  const count = cartCount();
  const badge = $('#cartCount');
  badge.textContent = count;
  badge.dataset.empty = count === 0 ? 'true' : 'false';
  if (count > 0) {
    badge.style.transform = 'scale(1.25)';
    setTimeout(() => (badge.style.transform = ''), 180);
  }
}

function renderDrawer() {
  const wrap = $('#drawerItems');
  const ids = Object.keys(cart);
  if (ids.length === 0) {
    wrap.innerHTML = `<p class="drawer__empty">Your order is empty.<br />Add reference materials from the catalogue.</p>`;
  } else {
    wrap.innerHTML = ids.map((id) => {
      const p = PRODUCTS.find((x) => x.id === id);
      if (!p) return '';
      const qty = cart[id];
      return `
        <div class="line">
          <div>
            <div class="line__name">${escapeHtml(p.name)}</div>
            <div class="line__dose">${escapeHtml(p.dose)} · ${money(p.price)}</div>
            <div class="line__qty">
              <button type="button" data-dec="${id}" aria-label="Decrease quantity">−</button>
              <span>${qty}</span>
              <button type="button" data-inc="${id}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="line__price">${money(p.price * qty)}</div>
          <button class="line__remove" type="button" data-remove="${id}">Remove</button>
        </div>`;
    }).join('');
  }
  $('#drawerSubtotal').textContent = money(cartSubtotal());
}

/* ---------------- Drawer open/close ---------------- */
function openDrawer() {
  const d = $('#drawer');
  renderDrawer();
  d.hidden = false;
  requestAnimationFrame(() => d.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  const d = $('#drawer');
  d.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => (d.hidden = true), 320);
}

/* ---------------- Research-use gate ---------------- */
const GATE_KEY = 'revenant_ack_v1';
function maybeShowGate() {
  let acked = false;
  try { acked = localStorage.getItem(GATE_KEY) === '1'; } catch { /* ignore */ }
  if (acked) return;
  const gate = $('#gate');
  gate.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#gateAccept').addEventListener('click', () => {
    try { localStorage.setItem(GATE_KEY, '1'); } catch { /* ignore */ }
    gate.hidden = true;
    document.body.style.overflow = '';
  });
}

/* ---------------- Scroll reveal ---------------- */
let revealObserver;
function observeReveals() {
  if (!('IntersectionObserver' in window)) {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
  }
  $$('.reveal:not(.is-visible)').forEach((el) => revealObserver.observe(el));
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Year
  const y = $('#year');
  if (y) y.textContent = String(new Date().getFullYear());

  // Catalogue
  renderFilters();
  renderProducts('all');
  syncCartUI();

  // Mark section blocks for reveal
  $$('.card, .steps li, .about__copy, .contact__form, .sticker').forEach((el) => el.classList.add('reveal'));
  observeReveals();

  // Add to cart (delegated)
  $('#productGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    addToCart(btn.dataset.add);
    btn.textContent = 'Added ✓';
    btn.classList.add('is-added');
    setTimeout(() => { btn.textContent = 'Add'; btn.classList.remove('is-added'); }, 1100);
  });

  // Drawer controls
  $('#cartBtn').addEventListener('click', openDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerScrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  // Drawer qty (delegated)
  $('#drawerItems').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rem = e.target.closest('[data-remove]');
    if (inc) setQty(inc.dataset.inc, (cart[inc.dataset.inc] || 0) + 1);
    else if (dec) setQty(dec.dataset.dec, (cart[dec.dataset.dec] || 0) - 1);
    else if (rem) setQty(rem.dataset.remove, 0);
  });

  // Checkout stub
  $('#checkoutBtn').addEventListener('click', () => {
    if (cartCount() === 0) return;
    const btn = $('#checkoutBtn');
    btn.textContent = 'Demo checkout — payments not connected';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Proceed to checkout'; btn.disabled = false; }, 2200);
  });

  // Mobile nav
  const toggle = $('#navToggle');
  const links = $('#navLinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Nav shadow on scroll
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Contact form (demo)
  const form = $('#contactForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = $('#contactStatus');
    if (!form.checkValidity()) {
      status.textContent = 'Please complete all fields and confirm research use.';
      status.style.color = '#e08080';
      return;
    }
    status.textContent = 'Thanks — your enquiry has been noted. We\'ll reply by email.';
    status.style.color = '';
    form.reset();
  });

  // Gate last so it sits on top
  maybeShowGate();
});
