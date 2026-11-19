/* =========================================================
   HUELLITAS — Lógica de la app
   Todo se guarda en el navegador (localStorage), no hace falta servidor.
   ========================================================= */
(() => {
  'use strict';

  // ---------- Helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtTime = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (t) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'long' });

  const CATS = window.CATEGORIES;
  const PROFILES = window.PROFILES;
  const REPLIES = window.REPLIES;
  const catOf = (id) => CATS.find((c) => c.id === id) || CATS[0];
  const profileById = (id) => PROFILES.find((p) => p.id === id);

  // ---------- Almacenamiento seguro ----------
  const mem = {};
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
    set(k, v) {
      try { localStorage.setItem(k, v); return true; }
      catch (e) { mem[k] = v; if (e && e.name === 'QuotaExceededError') toast('⚠️ Almacenamiento lleno: probá con una foto más chica'); return false; }
    },
    del(k) { try { localStorage.removeItem(k); } catch {} delete mem[k]; },
  };
  const K_USERS = 'pawnder_users';
  const K_SESSION = 'pawnder_session';
  const loadUsers = () => { try { return JSON.parse(storage.get(K_USERS)) || {}; } catch { return {}; } };
  const saveUsers = (u) => storage.set(K_USERS, JSON.stringify(u));

  async function hashPassword(pw) {
    const str = 'pawnder::' + pw;
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {}
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'x' + (h >>> 0).toString(16);
  }

  // ---------- Estado ----------
  let email = null;      // email del usuario logueado
  let user = null;       // datos del usuario logueado
  let category = 'todos';
  let deck = [];
  let order = [];        // orden mezclado de perfiles para este usuario
  const cardEls = new Map();
  let history = [];      // para "deshacer"
  let busy = false;
  let currentView = 'discover';
  let activeChat = null;
  let boostTimer = null;
  const MAX_PHOTOS = 9;
  let regPhotos = [];    // fotos elegidas al crear la cuenta
  let editPhotos = [];   // fotos mientras se edita el perfil

  function saveUser() {
    if (!email || !user) return;
    const users = loadUsers();
    users[email] = user;
    saveUsers(users);
  }

  function newUserData({ owner, passHash, pet }) {
    return {
      owner, passHash, createdAt: Date.now(), pet,
      swipes: {}, matches: {}, superLikes: 5, boostUntil: 0,
      settings: { maxDistance: 50 },
    };
  }

  // Mezcla determinística por usuario (así el orden no cambia cada vez)
  function seededShuffle(arr, seedStr) {
    let seed = 0;
    for (const c of seedStr) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- Imágenes ----------
  function photoUrl(p, i) {
    const kw = catOf(p.species).kw || 'pet';
    return `https://loremflickr.com/480/640/${kw}?lock=${p.photos[i]}`;
  }
  function photosOf(p) { return p.photos.map((_, i) => photoUrl(p, i)); }
  function myPhotos() { return user.pet.photos || []; }

  // Cuentas viejas tenían una sola foto en pet.photo: la pasamos a la lista
  function migratePet(pet) {
    if (!Array.isArray(pet.photos)) pet.photos = pet.photo ? [pet.photo] : [];
    delete pet.photo;
    pet.photos = pet.photos.slice(0, MAX_PHOTOS);
    return pet;
  }

  // Guarda; si no entra en el almacenamiento, saca fotos del final hasta que entre
  function saveUsersTrimming(users, em) {
    const photos = users[em].pet.photos;
    let removed = 0;
    while (!saveUsers(users) && photos.length) { photos.pop(); removed++; }
    if (removed) toast(`⚠️ No había lugar: se guardaron ${photos.length} foto${photos.length === 1 ? '' : 's'}`);
  }

  // Contenedor con imagen + respaldo con emoji si no carga
  function petImg(src, emoji, variant = 0) {
    const w = document.createElement('div');
    w.className = 'img-wrap';
    w.dataset.emoji = emoji;
    const fallback = () => {
      w.classList.add('img-fallback');
      if (variant % 3 === 1) w.classList.add('alt');
      if (variant % 3 === 2) w.classList.add('alt2');
    };
    if (!src) { fallback(); return w; }
    const img = new Image();
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    img.onerror = () => { img.remove(); fallback(); };
    img.src = src;
    w.appendChild(img);
    return w;
  }

  function avatar(srcs, emoji, cls = '') {
    const d = document.createElement('div');
    d.className = 'avatar ' + cls;
    d.appendChild(petImg(srcs[0], emoji));
    return d;
  }
  const profileAvatar = (p, cls) => avatar(photosOf(p), catOf(p.species).emoji, cls);
  const myAvatar = (cls) => avatar(myPhotos(), catOf(user.pet.species).emoji, cls);

  // Galería con barritas (como Tinder)
  function makeGallery(srcs, emoji) {
    const el = document.createElement('div');
    el.className = 'gallery';
    const list = srcs.length ? srcs : [null];
    const wraps = list.map((s, i) => { const w = petImg(s, emoji, i); if (i) w.classList.add('off'); el.appendChild(w); return w; });
    const bars = document.createElement('div');
    bars.className = 'photo-bars';
    bars.innerHTML = list.length > 1 ? list.map((_, i) => `<span class="${i === 0 ? 'on' : ''}"></span>`).join('') : '';
    el.appendChild(bars);
    let idx = 0;
    el.go = (d) => {
      const n = idx + d;
      if (n < 0 || n >= list.length) {
        el.animate([{ transform: `translateX(${d * 8}px)` }, { transform: 'none' }], { duration: 160 });
        return;
      }
      wraps[idx].classList.add('off'); idx = n; wraps[idx].classList.remove('off');
      $$('span', bars).forEach((b, i) => b.classList.toggle('on', i === idx));
    };
    return el;
  }

  // ---------- Toast ----------
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // =========================================================
  //  AUTENTICACIÓN
  // =========================================================
  function renderSpeciesPicker(container, name, selected) {
    container.innerHTML = CATS.filter((c) => c.id !== 'todos').map((c) => `
      <label><input type="radio" name="${name}" value="${c.id}" ${c.id === selected ? 'checked' : ''}>
        <span class="e">${c.emoji}</span>${c.one}</label>`).join('');
  }

  function readImage(file, max = 640) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // Grilla de hasta 9 fotos: agregar, sacar (✕) y tocar para hacerla principal.
  // Devuelve una función que vuelve a dibujar la grilla.
  function setupPhotoGrid(grid, input, counter, getList) {
    const render = () => {
      const list = getList();
      grid.innerHTML = '';
      list.forEach((src, i) => {
        const d = document.createElement('div');
        d.className = 'pg-item' + (i === 0 ? ' main' : '');
        d.style.backgroundImage = `url("${String(src).replace(/"/g, '%22')}")`;
        d.title = i === 0 ? 'Foto principal' : 'Tocá para ponerla como principal';
        d.innerHTML = `${i === 0 ? '<span class="pg-main">Principal</span>' : ''}<button type="button" class="pg-del" aria-label="Sacar foto">✕</button>`;
        d.addEventListener('click', (e) => {
          if (e.target.closest('.pg-del')) list.splice(i, 1);
          else if (i > 0) list.unshift(...list.splice(i, 1));
          else return;
          render();
        });
        grid.appendChild(d);
      });
      if (list.length < MAX_PHOTOS) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'pg-add';
        add.innerHTML = `<span><span class="plus">+</span>${list.length ? 'Agregar' : 'Agregar fotos'}</span>`;
        add.addEventListener('click', () => input.click());
        grid.appendChild(add);
      }
      counter.textContent = `${list.length}/${MAX_PHOTOS}`;
    };
    input.addEventListener('change', async () => {
      const list = getList();
      const files = [...(input.files || [])].filter((f) => f.type.startsWith('image/'));
      input.value = '';
      if (!files.length) { toast('Elegí un archivo de imagen'); return; }
      const room = MAX_PHOTOS - list.length;
      if (files.length > room) toast(`Máximo ${MAX_PHOTOS} fotos: se agregan ${room}`);
      for (const f of files.slice(0, room)) {
        try { list.push(await readImage(f)); } catch { toast('No se pudo leer una imagen'); }
      }
      render();
    });
    render();
    return render;
  }

  function initAuth() {
    $$('.auth-tab').forEach((b) => b.addEventListener('click', () => {
      $$('.auth-tab').forEach((x) => x.classList.toggle('active', x === b));
      $('#login-form').classList.toggle('hidden', b.dataset.tab !== 'login');
      $('#register-form').classList.toggle('hidden', b.dataset.tab !== 'register');
      $('#login-error').textContent = '';
      $('#register-error').textContent = '';
    }));

    renderSpeciesPicker($('#reg-species'), 'species', 'perros');
    const renderRegPhotos = setupPhotoGrid($('#reg-photos'), $('#reg-photo'), $('#reg-photo-count'), () => regPhotos);

    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const em = f.email.value.trim().toLowerCase();
      const pw = f.password.value;
      const err = $('#login-error');
      if (!em || !pw) { err.textContent = 'Completá email y contraseña.'; return; }
      const users = loadUsers();
      const u = users[em];
      if (!u) { err.textContent = 'No existe una cuenta con ese email. ¡Creá una!'; return; }
      if (u.passHash !== await hashPassword(pw)) { err.textContent = 'Contraseña incorrecta.'; return; }
      f.reset();
      login(em);
    });

    $('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const err = $('#register-error');
      const data = {
        owner: f.owner.value.trim(),
        email: f.email.value.trim().toLowerCase(),
        password: f.password.value,
        petName: f.petName.value.trim(),
        species: (f.querySelector('input[name=species]:checked') || {}).value,
        petAge: f.petAge.value.trim(),
        petBreed: f.petBreed.value.trim(),
        petBio: f.petBio.value.trim(),
      };
      if (!data.owner) return (err.textContent = 'Poné tu nombre.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return (err.textContent = 'Ingresá un email válido.');
      if (data.password.length < 6) return (err.textContent = 'La contraseña debe tener al menos 6 caracteres.');
      if (!data.petName) return (err.textContent = 'Poné el nombre de tu mascota.');
      if (!data.species) return (err.textContent = 'Elegí qué animal es tu mascota.');
      if (!data.petAge) return (err.textContent = 'Poné la edad de tu mascota.');
      const users = loadUsers();
      if (users[data.email]) return (err.textContent = 'Ya existe una cuenta con ese email.');

      users[data.email] = newUserData({
        owner: data.owner,
        passHash: await hashPassword(data.password),
        pet: { name: data.petName, species: data.species, age: data.petAge, breed: data.petBreed, bio: data.petBio, photos: regPhotos.slice(0, MAX_PHOTOS) },
      });
      saveUsersTrimming(users, data.email);
      f.reset(); regPhotos = []; renderRegPhotos();
      renderSpeciesPicker($('#reg-species'), 'species', 'perros');
      login(data.email, true);
    });

    $('#demo-btn').addEventListener('click', async () => {
      const em = 'demo@huellitas.app';
      const users = loadUsers();
      if (!users[em]) {
        users[em] = newUserData({
          owner: 'Usuario Demo',
          passHash: await hashPassword('demo123'),
          pet: { name: 'Toby', species: 'perros', age: '4 años', breed: 'Beagle', bio: 'Olfateo todo y como más. Busco amigos para el parque 🐾', photos: [997, 998, 999].map((n) => `https://loremflickr.com/480/640/beagle?lock=${n}`) },
        });
        saveUsers(users);
      }
      login(em);
    });
  }

  function login(em, isNew = false) {
    const users = loadUsers();
    if (!users[em]) return showAuth();
    email = em;
    user = users[em];
    user.settings = user.settings || { maxDistance: 50 };
    migratePet(user.pet);
    storage.set(K_SESSION, em);
    order = seededShuffle(PROFILES, em);
    history = [];
    category = 'todos';
    $('#auth').classList.add('hidden');
    $('#app').classList.remove('hidden');
    renderChips();
    buildDeck();
    renderDeck();
    switchView('discover');
    updateBadges();
    applyBoost();
    toast(isNew ? `¡Bienvenido/a, ${user.pet.name}! 🎉` : `¡Hola de nuevo, ${user.pet.name}! 🐾`);
  }

  function logout() {
    storage.del(K_SESSION);
    email = null; user = null; activeChat = null;
    clearTimeout(boostTimer);
    cardEls.clear();
    $('#deck').innerHTML = '';
    closeAllModals();
    showAuth();
  }

  function showAuth() {
    $('#app').classList.add('hidden');
    $('#auth').classList.remove('hidden');
    $('.auth-tab[data-tab=login]').click();
  }

  // =========================================================
  //  DESCUBRIR (swipe)
  // =========================================================
  function renderChips() {
    const counts = {};
    PROFILES.forEach((p) => { if (!user.swipes[p.id]) counts[p.species] = (counts[p.species] || 0) + 1; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    $('#chips').innerHTML = CATS.map((c) => {
      const n = c.id === 'todos' ? total : (counts[c.id] || 0);
      return `<button class="chip ${c.id === category ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.label} <span class="count">${n}</span></button>`;
    }).join('');
  }

  function buildDeck() {
    const max = user.settings.maxDistance;
    deck = order.filter((p) => !user.swipes[p.id] && (category === 'todos' || p.species === category) && p.distance <= max);
  }

  function renderDeck() {
    const deckEl = $('#deck');
    $('.empty', deckEl)?.remove();
    const visible = deck.slice(0, 3);
    const ids = new Set(visible.map((p) => p.id));
    for (const [id, el] of cardEls) if (!ids.has(id)) { el.remove(); cardEls.delete(id); }
    // Se agregan de atrás hacia adelante: la primera queda arriba
    [...visible].reverse().forEach((p) => {
      let el = cardEls.get(p.id);
      if (!el) { el = createCard(p); cardEls.set(p.id, el); }
      deckEl.appendChild(el);
    });
    visible.forEach((p, i) => {
      const el = cardEls.get(p.id);
      el.classList.remove('pos-0', 'pos-1', 'pos-2', 'top');
      el.classList.add('pos-' + i);
      if (i === 0) el.classList.add('top');
      el.style.transform = '';
    });
    if (!deck.length) renderEmpty();
    $('#super-count').textContent = `⭐ ${user.superLikes}`;
  }

  function renderEmpty() {
    const cat = catOf(category);
    const e = document.createElement('div');
    e.className = 'empty';
    const r = document.createElement('div');
    r.className = 'radar';
    r.appendChild(myAvatar());
    e.appendChild(r);
    e.insertAdjacentHTML('beforeend', `
      <h3>No hay más ${category === 'todos' ? 'animales' : cat.label.toLowerCase()} cerca</h3>
      <p>Probá con otra categoría, ampliá la distancia o volvé a ver los que descartaste.</p>
      <button class="btn-primary" data-empty="reset">🔄 Volver a ver descartados</button>`);
    $('#deck').appendChild(e);
  }

  function createCard(p) {
    const cat = catOf(p.species);
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = p.id;
    const gallery = makeGallery(photosOf(p), cat.emoji);
    el.appendChild(gallery);
    el.insertAdjacentHTML('beforeend', `
      <div class="stamp stamp-like">LIKE</div>
      <div class="stamp stamp-nope">NOPE</div>
      <div class="stamp stamp-super">SUPER<br>LIKE</div>
      <div class="card-info">
        <div class="card-name"><h2>${esc(p.name)} <span>${esc(p.age)}</span></h2><span class="verified" title="Verificado">✓</span></div>
        <div class="card-meta">${cat.emoji} ${esc(p.breed)} · 📍 a ${p.distance} km</div>
        <p class="card-bio">${esc(p.bio)}</p>
        ${p.likesYou ? '<span class="likes-you-tag">💛 Te dio like</span>' : ''}
      </div>
      <button class="info-btn" aria-label="Ver perfil"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`);
    el._gallery = gallery;
    $('.info-btn', el).addEventListener('click', (e) => { e.stopPropagation(); openDetail(p); });
    attachDrag(el, p);
    return el;
  }

  function setStamps(el, dx, dy) {
    const like = Math.max(0, Math.min(1, dx / 110));
    const nope = Math.max(0, Math.min(1, -dx / 110));
    const sup = Math.abs(dx) < 80 ? Math.max(0, Math.min(1, -dy / 110)) : 0;
    $('.stamp-like', el).style.opacity = like;
    $('.stamp-nope', el).style.opacity = nope;
    $('.stamp-super', el).style.opacity = sup;
  }

  function attachDrag(el, p) {
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, moved = false, downTarget = null;
    el.addEventListener('pointerdown', (e) => {
      if (!el.classList.contains('top') || busy || e.button > 0) return;
      if (e.target.closest('.info-btn')) return;
      dragging = true; moved = false; dx = dy = 0;
      sx = e.clientX; sy = e.clientY; downTarget = e.target;
      try { el.setPointerCapture(e.pointerId); } catch {}
      el.style.transition = 'none';
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 6) moved = true;
      if (!moved) return;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.07}deg)`;
      setStamps(el, dx, dy);
      const next = $('.card.pos-1', el.parentElement);
      if (next) {
        const k = Math.min(1, Math.hypot(dx, dy) / 140);
        next.style.transition = 'none';
        next.style.transform = `scale(${0.95 + 0.05 * k}) translateY(${10 - 10 * k}px)`;
      }
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      el.style.transition = '';
      const next = $('.card.pos-1', el.parentElement);
      if (!moved) {
        // Toque: info abajo → detalle, sino cambia de foto
        if (downTarget && downTarget.closest('.card-info')) { openDetail(p); return; }
        const r = el.getBoundingClientRect();
        el._gallery.go(e.clientX - r.left < r.width / 2 ? -1 : 1);
        return;
      }
      const T = 110;
      el._dy = dy;
      if (dx > T) swipe('like');
      else if (dx < -T) swipe('nope');
      else if (dy < -T && Math.abs(dx) < 80) swipe('super');
      else {
        el.style.transform = '';
        setStamps(el, 0, 0);
        if (next) { next.style.transition = ''; next.style.transform = ''; }
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function swipe(action) {
    if (busy) return;
    const p = deck[0];
    if (!p) return;
    const el = cardEls.get(p.id);
    if (action === 'super' && user.superLikes <= 0) {
      toast('Te quedaste sin Super Likes ⭐');
      if (el) { el.style.transform = ''; setStamps(el, 0, 0); }
      return;
    }
    busy = true;
    const w = el.offsetWidth;
    const dy = el._dy || 0;
    el.style.transition = 'transform .38s ease-out';
    $$('.stamp', el).forEach((s) => (s.style.opacity = 0));
    $('.stamp-' + action, el).style.opacity = 1;
    if (action === 'like') el.style.transform = `translate(${w * 1.6}px, ${dy}px) rotate(28deg)`;
    if (action === 'nope') el.style.transform = `translate(${-w * 1.6}px, ${dy}px) rotate(-28deg)`;
    if (action === 'super') el.style.transform = `translate(0, ${-el.offsetHeight * 1.4}px)`;
    const next = $('.card.pos-1');
    if (next) { next.style.transition = ''; next.style.transform = 'scale(1)'; }

    setTimeout(() => {
      el.remove();
      cardEls.delete(p.id);
      deck.shift();
      const matched = decide(p, action);
      history.push({ id: p.id, action, matched });
      renderDeck();
      renderChips();
      busy = false;
      if (matched) showMatch(p, action === 'super');
    }, 340);
  }

  // Registra la decisión y devuelve true si hubo match
  function decide(p, action) {
    user.swipes[p.id] = action;
    let matched = false;
    if (action === 'super') user.superLikes--;
    if (action !== 'nope') {
      let chance = p.chance;
      if (action === 'super') chance += 0.35;
      if (user.boostUntil > Date.now()) chance += 0.2;
      if (p.likesYou || Math.random() < chance) {
        matched = true;
        user.matches[p.id] = { at: Date.now(), messages: [], unread: 0, super: action === 'super' };
        // A veces te escriben primero
        if (Math.random() < 0.4) scheduleReply(p.id, 3500 + Math.random() * 4000, true);
      }
    }
    saveUser();
    updateBadges();
    return matched;
  }

  function rewind() {
    if (busy) return;
    const last = history.pop();
    if (!last) { toast('No hay nada para deshacer ↩️'); return; }
    delete user.swipes[last.id];
    if (last.matched) delete user.matches[last.id];
    if (last.action === 'super') user.superLikes++;
    saveUser();
    buildDeck();
    const i = deck.findIndex((p) => p.id === last.id);
    if (i > 0) deck.unshift(...deck.splice(i, 1));
    renderDeck();
    renderChips();
    updateBadges();
    const el = cardEls.get(last.id);
    if (el && i !== -1) { el.classList.remove('rewind-in'); void el.offsetWidth; el.classList.add('rewind-in'); setStamps(el, 0, 0); }
    else toast('Deshecho (ese perfil no está en esta categoría)');
  }

  function boost() {
    if (user.boostUntil > Date.now()) {
      const min = Math.ceil((user.boostUntil - Date.now()) / 60000);
      toast(`⚡ Boost activo: te quedan ${min} min`);
      return;
    }
    user.boostUntil = Date.now() + 30 * 60000;
    saveUser();
    applyBoost();
    toast('⚡ ¡Boost activado! Más matches por 30 minutos');
  }
  function applyBoost() {
    clearTimeout(boostTimer);
    const left = (user?.boostUntil || 0) - Date.now();
    $('#app').classList.toggle('boosted', left > 0);
    if (left > 0) boostTimer = setTimeout(applyBoost, Math.min(left, 2 ** 31 - 1));
  }

  // =========================================================
  //  MATCH
  // =========================================================
  function showMatch(p, isSuper) {
    const m = $('#match-modal');
    $('#match-text').textContent = `A ${user.pet.name} y a ${p.name} se gustaron mutuamente${isSuper ? ' ⭐' : ''}.`;
    $('#match-me').innerHTML = '';
    $('#match-me').appendChild(petImg(myPhotos()[0], catOf(user.pet.species).emoji));
    $('#match-them').innerHTML = '';
    $('#match-them').appendChild(petImg(photosOf(p)[0], catOf(p.species).emoji, 1));
    $('#match-bg').innerHTML = '';
    $('#match-bg').appendChild(petImg(photosOf(p)[0], catOf(p.species).emoji));
    $('#match-input').value = '';
    m.dataset.id = p.id;
    // Confetti de emojis
    const conf = $('#match-confetti');
    conf.innerHTML = '';
    const pool = ['💖', '🐾', '✨', catOf(p.species).emoji, catOf(user.pet.species).emoji, '💕'];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('span');
      s.textContent = rand(pool);
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDuration = 2.5 + Math.random() * 2.5 + 's';
      s.style.animationDelay = Math.random() * 1.2 + 's';
      s.style.fontSize = 18 + Math.random() * 20 + 'px';
      conf.appendChild(s);
    }
    m.classList.remove('hidden');
    setTimeout(() => $('#match-input').focus({ preventScroll: true }), 400);
  }

  function closeMatch() { $('#match-modal').classList.add('hidden'); }

  // =========================================================
  //  DETALLE DE PERFIL
  // =========================================================
  let detailProfile = null;
  function openDetail(p) {
    detailProfile = p;
    const cat = catOf(p.species);
    const g = $('#detail-gallery');
    g.innerHTML = '';
    const gal = makeGallery(photosOf(p), cat.emoji);
    g.appendChild(gal);
    g.onclick = (e) => { const r = g.getBoundingClientRect(); gal.go(e.clientX - r.left < r.width / 2 ? -1 : 1); };
    $('#detail-body').innerHTML = `
      <h2>${esc(p.name)} <span>${esc(p.age)}</span></h2>
      <div class="detail-meta">
        <span>${cat.emoji} ${esc(cat.one)} · ${esc(p.breed)}</span>
        <span>📍 A ${p.distance} km de distancia</span>
        ${p.likesYou ? '<span>💛 Ya le gustás a ' + esc(p.name) + '</span>' : ''}
      </div>
      <hr>
      <h4>Sobre mí</h4>
      <p class="bio">${esc(p.bio)}</p>
      <hr>
      <h4>Intereses</h4>
      <div class="tags">${p.interests.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
    const swiped = user.swipes[p.id];
    $('#detail-actions').classList.toggle('hidden', !!swiped);
    $('#detail-modal').classList.remove('hidden');
    $('#detail-modal .sheet-inner').scrollTop = 0;
  }
  function closeDetail() { $('#detail-modal').classList.add('hidden'); detailProfile = null; }

  function detailAction(action) {
    const p = detailProfile;
    if (!p) return;
    closeDetail();
    // Si es la tarjeta de arriba del mazo, animamos el swipe
    if (currentView === 'discover' && deck[0] && deck[0].id === p.id) { swipe(action); return; }
    if (action === 'super' && user.superLikes <= 0) { toast('Te quedaste sin Super Likes ⭐'); return; }
    const matched = decide(p, action);
    history.push({ id: p.id, action, matched });
    buildDeck(); renderDeck(); renderChips();
    if (currentView === 'likes') renderLikes();
    if (matched) showMatch(p, action === 'super');
    else if (action === 'nope') toast(`Descartaste a ${p.name}`);
  }

  // =========================================================
  //  LIKES
  // =========================================================
  function pendingLikes() { return PROFILES.filter((p) => p.likesYou && !user.swipes[p.id]); }
  function renderLikes() {
    const list = pendingLikes();
    $('#likes-title').textContent = `${list.length} Like${list.length === 1 ? '' : 's'}`;
    const grid = $('#likes-grid');
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p class="empty-text" style="grid-column:1/-1">Todavía no hay likes nuevos. ¡Seguí deslizando! 🐾</p>';
      return;
    }
    list.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'like-card';
      b.appendChild(petImg(photosOf(p)[0], catOf(p.species).emoji));
      b.insertAdjacentHTML('beforeend', `<span class="lc-heart">💛</span><div class="lc-info">${esc(p.name)}, ${esc(p.age)}<small>${catOf(p.species).emoji} ${esc(p.breed)} · ${p.distance} km</small></div>`);
      b.addEventListener('click', () => openDetail(p));
      grid.appendChild(b);
    });
  }

  // =========================================================
  //  MATCHES Y CHAT
  // =========================================================
  function matchList() {
    return Object.entries(user.matches)
      .map(([id, m]) => ({ p: profileById(id), m }))
      .filter((x) => x.p);
  }

  function renderMatches() {
    const all = matchList();
    const fresh = all.filter((x) => !x.m.messages.length).sort((a, b) => b.m.at - a.m.at);
    const convs = all.filter((x) => x.m.messages.length)
      .sort((a, b) => b.m.messages[b.m.messages.length - 1].at - a.m.messages[a.m.messages.length - 1].at);

    $('#new-count').textContent = fresh.length;
    const nm = $('#new-matches');
    nm.innerHTML = '';
    if (!fresh.length) nm.innerHTML = '<p class="empty-text" style="padding:0">Cuando hagas match, van a aparecer acá 💘</p>';
    fresh.forEach(({ p, m }) => {
      const b = document.createElement('button');
      b.className = 'nm' + (m.super ? ' super' : '');
      const ph = document.createElement('div');
      ph.className = 'nm-photo';
      ph.appendChild(petImg(photosOf(p)[0], catOf(p.species).emoji));
      b.appendChild(ph);
      b.insertAdjacentHTML('beforeend', `<span>${esc(p.name)}</span>`);
      b.addEventListener('click', () => openChat(p.id));
      nm.appendChild(b);
    });

    const cl = $('#conv-list');
    cl.innerHTML = '';
    if (!convs.length) cl.innerHTML = '<p class="empty-text">Todavía no tenés conversaciones. ¡Mandá el primer mensaje!</p>';
    convs.forEach(({ p, m }) => {
      const last = m.messages[m.messages.length - 1];
      const b = document.createElement('button');
      b.className = 'conv' + (m.unread ? ' unread' : '');
      b.appendChild(profileAvatar(p));
      b.insertAdjacentHTML('beforeend', `
        <div class="conv-body"><strong>${esc(p.name)}</strong>
          <p>${last.from === 'me' ? '↩ ' : ''}${esc(last.text)}</p></div>
        ${m.unread ? '<span class="dot"></span>' : ''}`);
      b.addEventListener('click', () => openChat(p.id));
      cl.appendChild(b);
    });
  }

  function openChat(id) {
    const p = profileById(id);
    const m = user.matches[id];
    if (!p || !m) return;
    activeChat = id;
    m.unread = 0;
    saveUser();
    updateBadges();
    $('#chat-avatar').replaceWith(Object.assign(profileAvatar(p), { id: 'chat-avatar' }));
    $('#chat-avatar').addEventListener('click', () => openDetail(p));
    $('#chat-name').textContent = p.name;
    $('#chat-sub').textContent = `${catOf(p.species).emoji} ${p.breed} · a ${p.distance} km`;
    switchView('chat');
    renderMessages();
    setTimeout(() => $('#msg-input').focus({ preventScroll: true }), 50);
  }

  function renderMessages(typing = false) {
    const id = activeChat;
    const p = profileById(id);
    const m = user.matches[id];
    if (!p || !m) return;
    const box = $('#messages');
    box.innerHTML = '';
    const start = document.createElement('div');
    start.className = 'chat-start';
    start.appendChild(profileAvatar(p));
    start.insertAdjacentHTML('beforeend', `Hiciste match con <strong>${esc(p.name)}</strong> el ${fmtDate(m.at)}${m.super ? ' ⭐' : ''}`);
    box.appendChild(start);
    m.messages.forEach((msg, i) => {
      box.insertAdjacentHTML('beforeend', `<div class="msg ${msg.from}">${esc(msg.text)}</div>`);
      const nextMsg = m.messages[i + 1];
      if (!nextMsg || nextMsg.from !== msg.from || nextMsg.at - msg.at > 120000) {
        box.insertAdjacentHTML('beforeend', `<div class="msg-time ${msg.from}">${fmtTime(msg.at)}</div>`);
      }
    });
    if (typing || m.typing) box.insertAdjacentHTML('beforeend', '<div class="typing"><span></span><span></span><span></span></div>');
    box.scrollTop = box.scrollHeight;
  }

  function sendMessage(id, text) {
    const m = user.matches[id];
    if (!m || !text.trim()) return;
    m.messages.push({ from: 'me', text: text.trim(), at: Date.now() });
    saveUser();
    scheduleReply(id, 900 + Math.random() * 1200);
  }

  const pendingReplies = {};
  function scheduleReply(id, delay, opener = false) {
    if (pendingReplies[id]) return;
    const forUser = email;
    pendingReplies[id] = setTimeout(() => {
      if (email !== forUser || !user.matches[id]) { delete pendingReplies[id]; return; }
      const m = user.matches[id];
      m.typing = true;
      if (activeChat === id && currentView === 'chat') renderMessages();
      setTimeout(() => {
        delete pendingReplies[id];
        if (email !== forUser || !user.matches[id]) return;
        const p = profileById(id);
        m.typing = false;
        const pool = REPLIES[p.species] || ['🐾'];
        const lastThem = [...m.messages].reverse().find((x) => x.from === 'them');
        let text = opener ? `¡Hola ${user.pet.name}! ${rand(pool)}` : rand(pool);
        if (lastThem && lastThem.text === text && pool.length > 1) text = pool.find((t) => t !== text);
        m.messages.push({ from: 'them', text, at: Date.now() });
        const viewing = activeChat === id && currentView === 'chat';
        if (!viewing) { m.unread = (m.unread || 0) + 1; toast(`💬 ${p.name}: ${text}`); }
        saveUser();
        updateBadges();
        if (viewing) renderMessages();
        if (currentView === 'matches') renderMatches();
      }, 1100 + Math.random() * 1400);
    }, delay);
  }

  function unmatch() {
    const p = profileById(activeChat);
    if (!p) return;
    if (!confirm(`¿Deshacer el match con ${p.name}? Se borrará la conversación.`)) return;
    delete user.matches[activeChat];
    saveUser();
    activeChat = null;
    updateBadges();
    switchView('matches');
    toast(`Deshiciste el match con ${p.name}`);
  }

  // =========================================================
  //  PERFIL
  // =========================================================
  function renderProfile() {
    const pet = user.pet;
    const cat = catOf(pet.species);
    const av = $('#profile-avatar');
    av.className = 'avatar profile-avatar';
    av.innerHTML = '';
    av.appendChild(petImg(myPhotos()[0], cat.emoji));
    $('#profile-name').textContent = `${pet.name}, ${pet.age}`;
    $('#profile-sub').textContent = `${cat.emoji} ${pet.breed || cat.one} · Dueño/a: ${user.owner}`;
    $('#stat-likes').textContent = Object.values(user.swipes).filter((s) => s !== 'nope').length;
    $('#stat-matches').textContent = Object.keys(user.matches).length;
    $('#stat-super').textContent = user.superLikes;
    $('#dist-range').value = user.settings.maxDistance;
    $('#dist-val').textContent = user.settings.maxDistance + ' km';
    $('#acc-email').textContent = email;
  }

  let renderEditPhotos = () => {};

  // ---------- Modo oscuro ----------
  const K_THEME = 'huellitas_theme';
  const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $$('.theme-toggle').forEach((b) => {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
      b.title = t === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro';
    });
    $('#dark-switch').checked = t === 'dark';
  }
  function setTheme(t) { applyTheme(t); storage.set(K_THEME, t); }

  function openEdit() {
    const f = $('#edit-form');
    const pet = user.pet;
    f.owner.value = user.owner;
    f.petName.value = pet.name;
    f.petAge.value = pet.age;
    f.petBreed.value = pet.breed || '';
    f.petBio.value = pet.bio || '';
    renderSpeciesPicker($('#edit-species'), 'editSpecies', pet.species);
    editPhotos = myPhotos().slice();
    renderEditPhotos();
    $('#edit-error').textContent = '';
    $('#edit-modal').classList.remove('hidden');
  }

  function saveEdit(e) {
    e.preventDefault();
    const f = $('#edit-form');
    const err = $('#edit-error');
    const owner = f.owner.value.trim();
    const name = f.petName.value.trim();
    const age = f.petAge.value.trim();
    if (!owner || !name || !age) { err.textContent = 'Completá tu nombre, el de tu mascota y su edad.'; return; }
    const prev = JSON.stringify(user.pet);
    user.owner = owner;
    user.pet = {
      ...user.pet, name, age,
      species: (f.querySelector('input[name=editSpecies]:checked') || {}).value || user.pet.species,
      breed: f.petBreed.value.trim(),
      bio: f.petBio.value.trim(),
      photos: editPhotos.slice(0, MAX_PHOTOS),
    };
    const users = loadUsers();
    users[email] = user;
    if (!saveUsers(users)) { user.pet = JSON.parse(prev); return; }
    $('#edit-modal').classList.add('hidden');
    renderProfile();
    toast('Perfil actualizado ✅');
  }

  // =========================================================
  //  NAVEGACIÓN
  // =========================================================
  function switchView(name) {
    currentView = name;
    $$('.view').forEach((v) => v.classList.toggle('hidden', v.id !== 'view-' + name));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name || (name === 'chat' && t.dataset.view === 'matches')));
    $('#app').classList.toggle('in-chat', name === 'chat');
    if (name !== 'chat') activeChat = null;
    if (name === 'likes') renderLikes();
    if (name === 'matches') renderMatches();
    if (name === 'profile') renderProfile();
    if (name === 'discover') { buildDeck(); renderDeck(); renderChips(); }
  }

  function updateBadges() {
    if (!user) return;
    const likes = pendingLikes().length;
    const bl = $('#badge-likes');
    bl.textContent = likes;
    bl.classList.toggle('hidden', !likes);
    const all = Object.values(user.matches);
    const n = all.reduce((a, m) => a + (m.unread || 0), 0) + all.filter((m) => !m.messages.length).length;
    const bm = $('#badge-matches');
    bm.textContent = n;
    bm.classList.toggle('hidden', !n);
  }

  function closeAllModals() { $$('.modal').forEach((m) => m.classList.add('hidden')); detailProfile = null; }
  const anyModalOpen = () => $$('.modal').some((m) => !m.classList.contains('hidden'));

  function initApp() {
    // Tabs
    $$('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

    // Categorías
    $('#chips').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c || busy) return;
      category = c.dataset.cat;
      buildDeck(); renderDeck(); renderChips();
      $('.chip.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });

    // Botones de acción
    $('#actions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b) return;
      const a = b.dataset.action;
      if (a === 'rewind') return rewind();
      if (a === 'boost') return boost();
      if (!deck.length) { toast('No hay más perfiles en esta categoría'); return; }
      swipe(a);
    });

    // Mazo vacío
    $('#deck').addEventListener('click', (e) => {
      if (e.target.closest('[data-empty=reset]')) resetNopes(true);
    });

    // Detalle
    $('#detail-close').addEventListener('click', closeDetail);
    $('#detail-actions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) detailAction(b.dataset.action);
    });

    // Match
    $('#match-keep').addEventListener('click', closeMatch);
    $('#match-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#match-modal').dataset.id;
      const text = $('#match-input').value;
      closeMatch();
      if (text.trim()) { sendMessage(id, text); openChat(id); }
    });

    // Chat
    $('#chat-back').addEventListener('click', () => switchView('matches'));
    $('#chat-unmatch').addEventListener('click', unmatch);
    const input = $('#msg-input');
    input.addEventListener('input', () => { $('#msg-send').disabled = !input.value.trim(); });
    $('#composer').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input.value.trim() || !activeChat) return;
      sendMessage(activeChat, input.value);
      input.value = '';
      $('#msg-send').disabled = true;
      renderMessages();
    });

    // Perfil
    $('#edit-profile-btn').addEventListener('click', openEdit);
    $('#edit-cancel').addEventListener('click', () => $('#edit-modal').classList.add('hidden'));
    $('#edit-form').addEventListener('submit', saveEdit);
    renderEditPhotos = setupPhotoGrid($('#edit-photos'), $('#edit-photo'), $('#edit-photo-count'), () => editPhotos);

    // Modo oscuro
    $$('.theme-toggle').forEach((b) => b.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark')));
    $('#dark-switch').addEventListener('change', (e) => setTheme(e.target.checked ? 'dark' : 'light'));
    applyTheme(currentTheme());
    $('#dist-range').addEventListener('input', (e) => {
      user.settings.maxDistance = +e.target.value;
      $('#dist-val').textContent = e.target.value + ' km';
    });
    $('#dist-range').addEventListener('change', saveUser);
    $('#reset-swipes').addEventListener('click', () => resetNopes(false));
    $('#logout-btn').addEventListener('click', () => { logout(); toast('Cerraste sesión 👋'); });
    $('#delete-btn').addEventListener('click', () => {
      if (!confirm('¿Seguro que querés eliminar tu cuenta? Se borran tus matches y mensajes.')) return;
      const users = loadUsers();
      delete users[email];
      saveUsers(users);
      logout();
      toast('Cuenta eliminada');
    });

    // Teclado (en compu): ← nope, → like, ↑ super, Backspace deshacer
    document.addEventListener('keydown', (e) => {
      if (!user || anyModalOpen() || currentView !== 'discover') {
        if (e.key === 'Escape') { closeDetail(); closeMatch(); $('#edit-modal').classList.add('hidden'); }
        return;
      }
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowRight') swipe('like');
      else if (e.key === 'ArrowLeft') swipe('nope');
      else if (e.key === 'ArrowUp') { e.preventDefault(); swipe('super'); }
      else if (e.key === 'Backspace') rewind();
      else if (e.key === ' ' && deck[0]) { e.preventDefault(); cardEls.get(deck[0].id)?._gallery.go(1); }
    });
  }

  function resetNopes(onlyCategory) {
    let n = 0;
    for (const [id, s] of Object.entries(user.swipes)) {
      const p = profileById(id);
      if (s === 'nope' && p && (!onlyCategory || category === 'todos' || p.species === category)) { delete user.swipes[id]; n++; }
    }
    saveUser();
    history = history.filter((h) => user.swipes[h.id]);
    buildDeck(); renderDeck(); renderChips();
    if (currentView === 'profile') renderProfile();
    toast(n ? `🔄 Volvieron ${n} perfil${n === 1 ? '' : 'es'}` : 'No hay perfiles descartados para mostrar');
  }

  // ---------- Inicio ----------
  initAuth();
  initApp();
  const saved = storage.get(K_SESSION);
  if (saved && loadUsers()[saved]) login(saved);
  else showAuth();
})();
