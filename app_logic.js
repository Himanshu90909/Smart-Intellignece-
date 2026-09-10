
// ═══════════════════════════════════════════════
// VECTOR DATABASE ENGINE
// Full TF-IDF + Cosine Similarity (No API)
// ═══════════════════════════════════════════════
class SmartVectorDB {
  constructor(products) {
    this.P = products;
    this.vocab = new Map();
    this.docVecs = [];
    this.idf = {};
    this.build();
  }

  tokenize(text) {
    return (text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !this.stopwords.has(t));
  }

  get stopwords() {
    if (!this._sw) this._sw = new Set(['a','an','the','and','or','for','in','to','of','with','is','are','was','be','by','on','at','from','it','its','this','that','high','quality','item','number','product']);
    return this._sw;
  }

  docText(p) {
    const priceTag = p.price < 500 ? 'budget affordable cheap' :
      p.price < 1500 ? 'mid-range value' :
      p.price < 4000 ? 'premium quality' : 'luxury high-end expensive';
    const ratingTag = p.rating >= 4.5 ? 'excellent top-rated bestseller' :
      p.rating >= 4 ? 'good recommended' : 'decent average';
    return [
      p.name, p.name, // weight name more
      p.brand, p.category, p.category,
      ...(p.tags || []),
      priceTag, ratingTag,
      p.description || ''
    ].join(' ');
  }

  build() {
    const docs = this.P.map(p => this.tokenize(this.docText(p)));
    const N = docs.length;

    // Build IDF
    const df = {};
    docs.forEach(d => {
      const seen = new Set(d);
      seen.forEach(t => { df[t] = (df[t] || 0) + 1; });
    });
    Object.keys(df).forEach(t => {
      this.idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1;
    });

    // Build TF-IDF vectors
    this.docVecs = docs.map(d => {
      const tf = {};
      d.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      const len = d.length || 1;
      const vec = {};
      Object.keys(tf).forEach(t => {
        vec[t] = (tf[t] / len) * (this.idf[t] || 1);
      });
      return vec;
    });
    console.log('SmartVectorDB built:', N, 'products,', Object.keys(this.idf).length, 'vocab terms');
  }

  queryVec(text) {
    const tokens = this.tokenize(text);
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const len = tokens.length || 1;
    const vec = {};
    Object.keys(tf).forEach(t => {
      vec[t] = (tf[t] / len) * (this.idf[t] || 0.3);
    });
    return vec;
  }

  cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach(k => {
      const av = a[k] || 0, bv = b[k] || 0;
      dot += av * bv; na += av * av; nb += bv * bv;
    });
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  search(query, topK = 8, filterFn = null) {
    const qv = this.queryVec(query);
    let scored = this.docVecs.map((vec, i) => ({ p: this.P[i], score: this.cosine(qv, vec) }));
    if (filterFn) scored = scored.filter(r => filterFn(r.p));
    scored = scored.filter(r => r.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  similar(id, topK = 6) {
    const idx = this.P.findIndex(p => p.id === id);
    if (idx < 0) return [];
    const tv = this.docVecs[idx];
    const scored = this.docVecs.map((v, i) => ({ p: this.P[i], score: i === idx ? -1 : this.cosine(tv, v) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

const vdb = new SmartVectorDB(P);

// State
let cart = JSON.parse(localStorage.getItem('si_cart') || '[]');
let compareList = [];
let wishList = new Set();

// Helpers
const fp = p => '₹' + Number(p).toLocaleString('en-IN', {maximumFractionDigits: 0});
const disc = (p, o) => Math.round((1 - p / o) * 100);
const stars = r => {
  const f = Math.floor(r); let s = '';
  for (let i = 0; i < 5; i++) s += i < f ? '★' : (i === f && r - f >= 0.5 ? '✩' : '☆');
  return s;
};
const BADGES = { sale: '% SALE', deal: '🔥 DEAL', new: '✦ NEW', trending: '🔵 TREND', ai: '🧠 AI PICK' };

// Render product card
function renderCard(p, score = null, highlight = false) {
  const inCart = cart.some(c => c.id === p.id);
  const inCmp = compareList.includes(p.id);
  const inWish = wishList.has(p.id);
  const d = disc(p.price, p.orig);
  const badge = p.badge && BADGES[p.badge] ? `<div class="pc-badge ${p.badge}">${BADGES[p.badge]}</div>` : '';
  const scoreOverlay = score !== null && score > 0.05 ? `<div class="ai-score">🧠 ${Math.min(99, Math.max(1, Math.round(score * 100 * 5)))}% match</div>` : '';
  return `<div class="pc${score && score > 0.1 ? ' ai-pick' : ''}" id="pc${p.id}">
    ${badge}
    <button class="pc-wish" onclick="toggleWish(${p.id},this)" title="Wishlist">${inWish ? '❤️' : '🤍'}</button>
    <div class="pc-img">
      <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=60'"/>
      ${scoreOverlay}
    </div>
    <div class="pc-body">
      <div class="pc-brand">${p.brand}</div>
      <div class="pc-name">${p.name}</div>
      <div class="pc-stars"><span class="sv">${stars(p.rating)} ${p.rating}</span><span class="rv">(${p.reviews.toLocaleString()})</span></div>
      <div class="pc-price">
        <span class="pp-main">${fp(p.price)}</span>
        <span class="pp-orig">${fp(p.orig)}</span>
        <span class="pp-off">${d}% off</span>
      </div>
      <div class="pc-del">⚡ Free Delivery</div>
      <div class="pc-actions">
        <button class="atc${inCart ? ' added' : ''}" onclick="toggleCart(${p.id},event)">${inCart ? '✓ Added' : 'Add to Cart'}</button>
        <button class="cmp-btn${inCmp ? ' act' : ''}" onclick="addCompare(${p.id})" title="Compare">⚖</button>
      </div>
    </div>
  </div>`;
}

// Render grid
function renderGrid(prods, title = '🛍️ All Products', scores = null) {
  document.getElementById('pgTitle').textContent = title;
  document.getElementById('pgCnt').textContent = prods.length + ' products';
  document.getElementById('pgrid').innerHTML = prods.map((p, i) => renderCard(p, scores ? scores[i] : null)).join('');
}

// Deals strip
function renderDeals() {
  const deals = P.filter(p => p.badge === 'deal' || p.badge === 'sale').slice(0, 14);
  document.getElementById('dealsStrip').innerHTML = deals.map(p => `
    <div class="deal-card" onclick="scrollToProduct(${p.id})">
      <div class="deal-img"><img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&q=60'"/></div>
      <div class="deal-info">
        <div class="deal-off">↓${disc(p.price,p.orig)}% off</div>
        <div class="deal-nm">${p.name.split(' ').slice(0,4).join(' ')}</div>
        <div class="deal-pr">${fp(p.price)}</div>
      </div>
    </div>`).join('');
}

// Brand tags
function renderBrandTags() {
  const brands = [...new Set(P.map(p => p.brand))].slice(0, 12);
  document.getElementById('brandTags').innerHTML = brands.map(b => `<span class="brand-tag" onclick="this.classList.toggle('act')">${b}</span>`).join('');
}

// Filter
function filterCat(cat, navBtn, chipEl) {
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('act'));
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('act'));
  if (navBtn) navBtn.classList.add('act');
  if (chipEl) chipEl.classList.add('act');
  const titles = { all: '🛍️ All Products', clothes: '👔 Clothes', electronics: '📱 Electronics', shoes: '👟 Shoes', furniture: '🪑 Furniture', beauty: '💄 Beauty', books: '📚 Books', sports: '⚽ Sports', toys: '🧸 Toys', grocery: '🥑 Grocery', automotive: '🚗 Automotive', deal: '⚡ Deals' };
  const prods = cat === 'all' ? P : cat === 'deal' ? P.filter(p => p.badge === 'deal' || p.badge === 'sale') : P.filter(p => p.category === cat);
  renderGrid(prods, titles[cat] || cat);
}

function filterRating(r) {
  renderGrid(P.filter(p => p.rating >= r), r ? `★${r}+ Rated Products` : '🛍️ All Products');
}

function filterByPrice(max) {
  renderGrid(P.filter(p => p.price <= max), '💰 Under ' + fp(max));
}

function scrollToProduct(id) {
  document.getElementById('pc' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollToAI() {
  document.getElementById('aiPanel').scrollIntoView({ behavior: 'smooth' });
}

// VECTOR SEARCH
function vsQuick(txt) {
  document.getElementById('vsInp').value = txt;
  vectorSearch();
  scrollToAI();
}

function doSearch() {
  const q = document.getElementById('sInp').value.trim();
  if (!q) return;
  const results = vdb.search(q, 30);
  renderGrid(results.map(r => r.p), `🔍 "${q}"`, results.map(r => r.score));
  document.querySelector('.main').scrollIntoView({ behavior: 'smooth' });
}

function vectorSearch() {
  const q = document.getElementById('vsInp').value.trim();
  if (!q) return;
  const results = vdb.search(q, 10);
  const el = document.getElementById('simResults');
  if (!results.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:12px 0">No matching products. Try different keywords.</p>';
    return;
  }
  const maxScore = Math.max(...results.map(r => r.score)) || 1;

  el.innerHTML = `
    <div class="sim-header">
      <span class="sim-badge">VECTOR RESULTS</span>
      <span>Top ${results.length} semantic matches for "${q}"</span>
    </div>
    <div class="sim-grid">
      ${results.map(r => {
        const pct = Math.round((r.score / maxScore) * 90) + 8;
        const inC = cart.some(c => c.id === r.p.id);
        return `<div class="sim-card">
          <div class="sim-card-img">
            <img src="${r.p.image}" alt="${r.p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&q=60'"/>
            <div class="sim-pct">${pct}%</div>
          </div>
          <div class="sim-card-body">
            <div class="sim-card-brand">${r.p.brand}</div>
            <div class="sim-card-name">${r.p.name}</div>
            <div class="sim-bar"><div class="sim-bar-fill" style="width:${pct}%"></div></div>
            <div class="sim-price">${fp(r.p.price)}</div>
            <button class="sim-atc${inC ? ' added' : ''}" onclick="toggleCart(${r.p.id},event);this.className='sim-atc added';this.textContent='✓ Added'">${inC ? '✓ Added' : 'Add to Cart'}</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  // Also update main grid
  renderGrid(results.map(r => r.p), `✨ AI: "${q}"`, results.map(r => r.score));
  scrollToAI();
}

// WISHLIST
function toggleWish(id, btn) {
  if (wishList.has(id)) { wishList.delete(id); btn.textContent = '🤍'; showToast('Removed from wishlist'); }
  else { wishList.add(id); btn.textContent = '❤️'; showToast('❤️ Added to wishlist!'); }
}

// CART
function toggleCart(id, e) {
  e && e.stopPropagation();
  const p = P.find(x => x.id === id);
  const idx = cart.findIndex(x => x.id === id);
  if (idx >= 0) { cart.splice(idx, 1); showToast('Removed from cart'); }
  else { cart.push({ ...p, qty: 1 }); showToast('✅ ' + p.name.split(' ').slice(0, 3).join(' ') + ' added!'); }
  localStorage.setItem('si_cart', JSON.stringify(cart));
  updateCartCount();
  const btn = document.querySelector(`#pc${id} .atc`);
  if (btn) { const inC = cart.some(c => c.id === id); btn.textContent = inC ? '✓ Added' : 'Add to Cart'; btn.className = 'atc' + (inC ? ' added' : ''); }
}

function changeQty(id, d) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, (item.qty || 1) + d);
  localStorage.setItem('si_cart', JSON.stringify(cart));
  renderCartPanel(); updateCartCount();
}

function rmCart(id) {
  cart = cart.filter(x => x.id !== id);
  localStorage.setItem('si_cart', JSON.stringify(cart));
  renderCartPanel(); updateCartCount();
}

function updateCartCount() {
  document.getElementById('cCnt').textContent = cart.reduce((a, x) => a + (x.qty || 1), 0);
}

function renderCartPanel() {
  const ci = document.getElementById('cartItems');
  const cf = document.getElementById('cartFoot');
  if (!cart.length) {
    ci.innerHTML = '<div class="empty-cart"><div style="font-size:56px;margin-bottom:16px">🛒</div><div style="font-weight:700;font-size:16px;margin-bottom:6px;color:var(--text)">Your cart is empty</div><div style="font-size:13px">Start shopping with AI search!</div></div>';
    cf.innerHTML = ''; return;
  }
  ci.innerHTML = cart.map(p => `<div class="ci">
    <div class="ci-img"><img src="${p.image}" onerror="this.src='https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=60'"/></div>
    <div class="ci-info">
      <div class="ci-name">${p.name}</div>
      <div class="ci-price">${fp(p.price)}</div>
      <div class="ci-qty">
        <button class="qb" onclick="changeQty(${p.id},-1)">−</button>
        <span class="qn">${p.qty || 1}</span>
        <button class="qb" onclick="changeQty(${p.id},1)">+</button>
        <span class="ci-rm" onclick="rmCart(${p.id})">Remove</span>
      </div>
    </div>
  </div>`).join('');
  const tot = cart.reduce((a, x) => a + x.price * (x.qty || 1), 0);
  const savings = cart.reduce((a, x) => a + (x.orig - x.price) * (x.qty || 1), 0);
  cf.innerHTML = `
    <div class="cart-tot"><span>Total (${cart.reduce((a,x)=>a+(x.qty||1),0)} items)</span><span style="color:var(--accent3)">${fp(tot)}</span></div>
    <div class="cart-save">🎉 You save ${fp(savings)} on this order!</div>
    <button class="chk-btn">Proceed to Checkout →</button>`;
}

function openCart() { document.getElementById('cartOv').classList.add('open'); document.getElementById('cartPanel').classList.add('open'); renderCartPanel(); }
function closeCart() { document.getElementById('cartOv').classList.remove('open'); document.getElementById('cartPanel').classList.remove('open'); }

// COMPARE
function addCompare(id) {
  if (compareList.includes(id)) { compareList = compareList.filter(x => x !== id); showToast('Removed from compare'); }
  else {
    if (compareList.length >= 4) { showToast('Max 4 products to compare'); return; }
    compareList.push(id); showToast('Added to compare ⚖️');
  }
  updateCompareBar();
  const btn = document.querySelector(`#pc${id} .cmp-btn`);
  if (btn) btn.classList.toggle('act', compareList.includes(id));
}

function updateCompareBar() {
  const bar = document.getElementById('compareBar');
  if (!compareList.length) { bar.classList.remove('show'); return; }
  bar.classList.add('show');
  document.getElementById('compareItems').innerHTML = compareList.map(id => {
    const p = P.find(x => x.id === id);
    return p ? `<div class="compare-item"><img src="${p.image}" onerror="this.src='https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&q=60'"/>${p.name.split(' ').slice(0,3).join(' ')}<button class="c-rm" onclick="addCompare(${id})">✕</button></div>` : '';
  }).join('');
}

function toggleCompareBar() { document.getElementById('compareBar').classList.toggle('show'); }
function clearCompare() { compareList = []; updateCompareBar(); renderGrid(P); }

function openCompareModal() {
  if (compareList.length < 2) { showToast('Add at least 2 products first'); return; }
  const prods = compareList.map(id => P.find(p => p.id === id)).filter(Boolean);
  const vecs = compareList.map(id => vdb.docVecs[vdb.P.findIndex(p => p.id === id)]).filter(Boolean);
  const minP = Math.min(...prods.map(p => p.price));
  const maxR = Math.max(...prods.map(p => p.rating));
  const maxD = Math.max(...prods.map(p => disc(p.price, p.orig)));
  const cols = prods.length;
  const grd = `repeat(${cols + 1}, 1fr)`;

  // Similarity
  const sims = [];
  for (let i = 0; i < vecs.length; i++)
    for (let j = i + 1; j < vecs.length; j++)
      sims.push({ a: prods[i].name.split(' ').slice(0,3).join(' '), b: prods[j].name.split(' ').slice(0,3).join(' '), s: Math.round(vdb.cosine(vecs[i], vecs[j]) * 100) });

  document.getElementById('compareContent').innerHTML = `
    <div>
      ${[
        ['Product', prods.map(p => `<div class="cmp-cell"><img src="${p.image}" onerror="this.src='https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=60'"/><div style="font-weight:700;font-size:12px">${p.name}</div><div style="font-size:11px;color:var(--dim)">${p.brand}</div></div>`)],
        ['Price', prods.map(p => `<div class="cmp-cell${p.price===minP?' winner':' best-p'}"><div style="font-size:16px;font-weight:800;color:${p.price===minP?'var(--green)':'var(--accent3)'}">${fp(p.price)}</div><div style="font-size:11px;color:var(--dim);text-decoration:line-through">${fp(p.orig)}</div>${p.price===minP?'<div style="font-size:11px;font-weight:700;color:var(--green)">🏆 Best Price</div>':''}</div>`)],
        ['Discount', prods.map(p => { const d=disc(p.price,p.orig); return `<div class="cmp-cell${d===maxD?' winner':''}"><span style="font-size:20px;font-weight:900;color:${d===maxD?'var(--green)':'var(--text)'}">${d}%</span>${d===maxD?'<div style="font-size:11px;font-weight:700;color:var(--green)">🏆 Best Deal</div>':''}</div>`; })],
        ['Rating', prods.map(p => `<div class="cmp-cell${p.rating===maxR?' winner':''}"><div style="font-size:16px;font-weight:800;color:var(--gold)">${p.rating} ${stars(p.rating)}</div><div style="font-size:11px;color:var(--dim)">(${p.reviews.toLocaleString()})</div>${p.rating===maxR?'<div style="font-size:11px;font-weight:700;color:var(--green)">🏆 Top Rated</div>':''}</div>`)],
        ['Category', prods.map(p => `<div class="cmp-cell" style="text-transform:capitalize;color:var(--accent2)">${p.category}</div>`)],
        ['Tags', prods.map(p => `<div class="cmp-cell" style="font-size:11px">${(p.tags||[]).slice(0,4).map(t=>`<span style="background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.2);color:var(--accent3);padding:2px 7px;border-radius:4px;margin:2px;display:inline-block;font-weight:600">${t}</span>`).join('')}</div>`)],
      ].map(([label, cells]) => `<div class="cmp-row" style="grid-template-columns:${grd};margin-bottom:8px"><div class="cmp-label">${label}</div>${cells.join('')}</div>`).join('')}
    </div>
    ${sims.length ? `<div style="margin-top:16px;padding:14px;background:rgba(124,58,237,.07);border:1.5px solid rgba(124,58,237,.2);border-radius:12px">
      <div style="font-size:12px;font-weight:700;color:var(--accent2);margin-bottom:10px">🧠 Vector Similarity (TF-IDF Cosine)</div>
      ${sims.map(s => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:12px">
        <span style="flex:1;color:var(--muted)">${s.a} ↔ ${s.b}</span>
        <div style="width:120px;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));width:${Math.min(100,s.s*4)}%;border-radius:3px"></div></div>
        <span style="font-weight:700;color:var(--accent2);min-width:35px">${s.s}%</span>
      </div>`).join('')}
    </div>` : ''}
    <div class="ai-verdict">
      <h3>🤖 Smart Intelligence Verdict</h3>
      <p>${(() => {
        const best = prods.reduce((a, b) => {
          const sa = (a.rating===maxR?2:0)+(a.price===minP?2:0)+disc(a.price,a.orig)/50;
          const sb = (b.rating===maxR?2:0)+(b.price===minP?2:0)+disc(b.price,b.orig)/50;
          return sb > sa ? b : a;
        });
        const reasons = [];
        if(best.rating===maxR) reasons.push(`top-rated at ${best.rating}★`);
        if(best.price===minP) reasons.push(`best price at ${fp(best.price)}`);
        if(disc(best.price,best.orig)===maxD) reasons.push(`biggest discount ${maxD}% off`);
        return `<strong>${best.name}</strong> by <strong>${best.brand}</strong> is the top pick — ${reasons.join(', ')||'best overall value'}. Backed by ${best.reviews.toLocaleString()} reviews.`;
      })()}</p>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
      ${prods.map(p => `<button onclick="toggleCart(${p.id},event)" style="flex:1;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:12px;border-radius:8px;font-size:13px;font-weight:700;min-width:120px;cursor:pointer">Add ${p.name.split(' ').slice(0,2).join(' ')}</button>`).join('')}
    </div>`;

  document.getElementById('compareModal').classList.add('show');
}

function closeCompareModal() { document.getElementById('compareModal').classList.remove('show'); }

// TOAST
let toastT;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

// INIT
renderGrid(P);
renderDeals();
renderBrandTags();
updateCartCount();
</script>
</body>
