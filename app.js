'use strict';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDPPL4h9XctQYKsT-S61r5HyP1M9-mg1Kw';
const GOOGLE_MAPS_MAP_ID = 'DEMO_MAP_ID';
const PICKUP_LOCATION = { lat: 3.608163, lng: 98.712238 };
const PICKUP_NAME = 'Gerbang 1 UNIMED';
const DELIVERY_RATE_PER_KM = 2000;
const MINIMUM_DELIVERY_FEE = 2000;
const DELIVERY_ROUNDING = 500;

(() => {
  const {
    admins, services, sections, itemFields, fieldError, validate, summary, message, chatUrl,
    formatDate, formatMoney, formatDistance, localCode, orderStatus, list, save, get, remove, draft, usingMemory,
  } = KampusOrders;

  const paths = {
    home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8m-4-4h8"/>',
    list: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3m6 1V3m-6 7h6m-6 4h6m-6 4h4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.5a2.7 2.7 0 1 1 4.6 1.9c-1.5 1-1.9 1.2-1.9 2.6m0 3h.01"/>',
    chat: '<path d="M21 11.5a8.8 8.8 0 0 1-8.8 8.8 9 9 0 0 1-4-.9L3 21l1.6-5a8.8 8.8 0 1 1 16.4-4.5Z"/><path d="M8 11.5h.01m4 0h.01m4 0h.01"/>',
    pin: '<path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.25"/>',
    food: '<path d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8Zm6 8v2h6v-2M8 7c1-1 1-2 0-3m4 3c1-1 1-2 0-3m4 3c1-1 1-2 0-3"/>',
    bag: '<path d="M5 8h14l1.5 12H3.5L5 8Z"/><path d="M9 10V6a3 3 0 1 1 6 0v4"/>',
    box: '<path d="m12 3 8 4v10l-8 4-8-4V7l8-4Z"/><path d="m4 7 8 4 8-4m-8 4v10M8 5l8 4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>',
    whatsapp: '<path d="M20.7 11.8a8.7 8.7 0 0 1-8.7 8.7 8.7 8.7 0 0 1-3.8-.9L3 21l1.4-5.1a8.7 8.7 0 1 1 16.3-4.1Z"/><path d="M8.7 7.3c-.5.2-.8.9-.8 1.6.1 2.9 3.3 6.1 6.3 6.4.9.1 1.5-.3 1.8-.9l.3-1-2.5-1.3-1 1.1a6.4 6.4 0 0 1-2.8-2.8l.8-.9-1-2.4z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    spark: '<path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10C16 12 12 8 12 2Z" fill="currentColor" stroke="none"/>',
  };

  function icon(name) {
    return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);

  const element = id => document.getElementById(id);
  const page = element('konten');
  const sidebar = element('sidebar');
  const workspace = element('workspace');
  const menu = element('open-menu');
  const backdrop = element('backdrop');
  const mobile = matchMedia('(max-width: 767px)');
  const navigation = [
    ['beranda', 'home', 'Beranda'],
    ['pesan', 'plus', 'Buat Pesanan'],
    ['riwayat', 'list', 'Pesanan Saya'],
    ['bantuan', 'help', 'Bantuan'],
  ];
  const mapPoints = {
    pickup: { label: 'Titik jemput', glyph: 'J', color: '#167553', border: '#104c38' },
    destination: { label: 'Titik antar', glyph: 'A', color: '#b42335', border: '#7c1625' },
  };
  let filter = 'all';
  let toastTimer;
  let drawerOpen = false;
  let warnedAboutStorage = false;
  let mapsPromise;
  let mapsAuthFailed = false;
  let directionsUnavailable = false;

  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
  menu.innerHTML = icon('menu');
  element('close-menu').innerHTML = icon('close');

  function go(route) {
    if (location.hash === '#' + route) render();
    else location.hash = route;
  }

  function showToast(text) {
    const toast = element('toast');
    clearTimeout(toastTimer);
    toast.hidden = false;
    toast.textContent = text;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5500);
  }

  function persist(order) {
    if (!save(order) && !warnedAboutStorage) {
      warnedAboutStorage = true;
      showToast('Penyimpanan browser tidak tersedia. Data hanya tersimpan selama halaman ini terbuka.');
    }
  }

  function samePoint(first, second) {
    return first?.lat === second?.lat && first?.lng === second?.lng;
  }

  function deliveryQuote(order) {
    const { point, origin, distanceMeters, fee, pickupName } = order.delivery ?? {};
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng) ||
        !Number.isFinite(origin?.lat) || !Number.isFinite(origin?.lng) ||
        !Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
    if (order.status !== 'draft' && Number.isFinite(fee)) return { distanceMeters, fee, pickupName };
    const price = distanceMeters / 1000 * DELIVERY_RATE_PER_KM;
    const rounded = Math.round(price / DELIVERY_ROUNDING) * DELIVERY_ROUNDING;
    const minimum = Math.ceil(MINIMUM_DELIVERY_FEE / DELIVERY_ROUNDING) * DELIVERY_ROUNDING;
    const pickup = samePoint(origin, PICKUP_LOCATION) ? PICKUP_NAME : `${origin.lat.toFixed(6)}, ${origin.lng.toFixed(6)}`;
    return { distanceMeters, fee: Math.max(minimum, rounded), pickupName: pickup };
  }

  function loadGoogleMaps() {
    if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Peta belum dikonfigurasi oleh pengelola KampusKirim.'));
    if (mapsAuthFailed) return Promise.reject(new Error('Google Maps menolak akses. Hubungi admin KampusKirim.'));
    if (!mapsPromise) {
      mapsPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const params = new URLSearchParams({
          key: GOOGLE_MAPS_API_KEY, v: 'weekly', language: 'id', region: 'ID',
          loading: 'async', callback: 'kampusMapsReady',
        });
        window.kampusMapsReady = () => {
          delete window.kampusMapsReady;
          resolve(window.google.maps);
        };
        window.gm_authFailure = () => {
          mapsAuthFailed = true;
          reject(new Error('Google Maps menolak akses. Hubungi admin KampusKirim.'));
          element('destination-map')?.dispatchEvent(new Event('maps-auth-error'));
        };
        script.onerror = () => {
          delete window.kampusMapsReady;
          script.remove();
          mapsPromise = undefined;
          reject(new Error('Peta gagal dimuat. Periksa koneksi lalu muat ulang halaman.'));
        };
        script.async = true;
        script.src = 'https://maps.googleapis.com/maps/api/js?' + params;
        document.head.append(script);
      });
    }
    return mapsPromise;
  }

  async function roadDistance(maps, origin, destination) {
    const { DirectionsService, Route } = await maps.importLibrary('routes');
    const request = { origin, destination, travelMode: 'DRIVING' };
    if (DirectionsService && !directionsUnavailable) {
      try {
        const directions = await new DirectionsService().route(request);
        return directions.routes?.[0]?.legs?.[0]?.distance?.value;
      } catch (error) {
        const reason = `${error?.code ?? ''} ${error?.message ?? error}`;
        if (!/REQUEST_DENIED|PERMISSION_DENIED|LEGACY_API_NOT_ACTIVATED|LegacyApiNotActivatedMapError/i.test(reason)) throw error;
        // New Cloud projects use Routes API when Directions API (Legacy) is unavailable.
        directionsUnavailable = true;
      }
    }
    const { routes } = await Route.computeRoutes({ ...request, fields: ['distanceMeters'] });
    return routes?.[0]?.distanceMeters;
  }

  function destinationMap() {
    return `<div class="destination-picker">
      <div class="map-point-options" role="group" aria-label="Pilih titik yang akan diubah">
        ${Object.entries(mapPoints).map(([type, point]) => `
          <button class="button map-point-option" id="map-point-${type}" type="button"
            aria-controls="destination-map" aria-pressed="${type === 'destination'}" style="--point-color:${point.color}" disabled>
            <span class="map-point-symbol" aria-hidden="true">${point.glyph}</span>
            <span>${point.label}</span>
          </button>`).join('')}
      </div>
      <p class="map-instructions" id="map-instructions" aria-live="polite">Ketuk peta untuk memilih titik antar. Penanda J dan A juga bisa digeser.</p>
      <div class="destination-map" id="destination-map" role="region" aria-label="Peta titik jemput dan antar" aria-describedby="map-instructions"></div>
      <div class="map-actions">
        <button class="button button-outline" type="button" id="use-location" disabled>${icon('pin')} <span id="use-location-label">Gunakan lokasi saya untuk titik antar</span></button>
        <button class="text-button" type="button" id="retry-route" hidden>Hitung ulang rute</button>
      </div>
      <p class="map-status" id="location-status" role="status" hidden></p>
      <p class="map-status" id="route-status" role="status">Memuat peta…</p>
      <p class="map-status" id="address-status" role="status" hidden></p>
    </div>`;
  }

  async function setupDestinationMap(order, form, saveDraft, updateQuote) {
    const canvas = element('destination-map');
    const pointButtons = Object.keys(mapPoints).map(type => [type, element('map-point-' + type)]);
    const instructions = element('map-instructions');
    const locationButton = element('use-location');
    const locationLabel = element('use-location-label');
    const retryButton = element('retry-route');
    const address = element('field-destination');
    const routeStatus = element('route-status');
    const locationStatus = element('location-status');
    const addressStatus = element('address-status');
    let routeRevision = 0;
    let destinationRevision = 0;
    let locationRevision = 0;
    let activePoint = 'destination';
    let dragging = false;
    let mapAvailable = false;
    const isMapActive = () => form.isConnected && mapAvailable;

    function status(node, text, error = false) {
      node.textContent = text;
      node.hidden = !text;
      node.classList.toggle('map-error', error);
    }

    function clearLocationRequest() {
      locationRevision++;
      locationButton.disabled = !isMapActive();
      status(locationStatus, '');
    }

    function setActivePoint(type) {
      activePoint = type;
      const label = mapPoints[type].label.toLowerCase();
      for (const [point, button] of pointButtons) button.setAttribute('aria-pressed', String(point === type));
      instructions.textContent = `Ketuk peta untuk memilih ${label}. Penanda J dan A juga bisa digeser.`;
      locationLabel.textContent = 'Gunakan lokasi saya untuk ' + label;
      clearLocationRequest();
    }

    function mapError(text) {
      mapAvailable = false;
      for (const [, button] of pointButtons) button.disabled = true;
      retryButton.hidden = true;
      status(addressStatus, '');
      clearLocationRequest();
      status(routeStatus, text, true);
    }

    canvas.addEventListener('maps-auth-error', () => mapError('Google Maps menolak akses. Hubungi admin KampusKirim.'));

    try {
      const maps = await loadGoogleMaps();
      const [{ Map }, { AdvancedMarkerElement, PinElement }, { Geocoder }] = await Promise.all([
        maps.importLibrary('maps'), maps.importLibrary('marker'), maps.importLibrary('geocoding'),
      ]);
      if (!form.isConnected || mapsAuthFailed) return;

      const savedOrigin = order.delivery?.origin ?? PICKUP_LOCATION;
      const map = new Map(canvas, {
        center: order.delivery?.point ?? savedOrigin, zoom: 15, mapId: GOOGLE_MAPS_MAP_ID,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      const geocoder = new Geocoder();
      const markers = Object.fromEntries(Object.entries(mapPoints).map(([type, point]) => {
        const pin = new AdvancedMarkerElement({ title: point.glyph + ' · ' + point.label, gmpDraggable: true });
        pin.append(new PinElement({ background: point.color, borderColor: point.border, glyphText: point.glyph, glyphColor: '#fff' }));
        return [type, pin];
      }));
      const pickup = markers.pickup;
      pickup.position = savedOrigin;
      pickup.map = map;
      mapAvailable = !mapsAuthFailed;
      if (!mapAvailable) return;
      for (const [type, button] of pointButtons) {
        button.disabled = false;
        button.addEventListener('click', () => {
          if (isMapActive() && !dragging && activePoint !== type) setActivePoint(type);
        });
      }
      setActivePoint(activePoint);

      async function lookupAddress(point, id) {
        status(addressStatus, 'Mencari alamat…');
        try {
          const { results } = await geocoder.geocode({ location: point });
          if (!isMapActive() || id !== destinationRevision) return;
          const found = results[0]?.formatted_address;
          if (!found) throw new Error('Alamat tidak ditemukan');
          if (!address.value.trim()) {
            address.value = found;
            address.dispatchEvent(new Event('input', { bubbles: true }));
          }
          status(addressStatus, address.value.trim() === found
            ? 'Periksa alamat tujuan dan sesuaikan bila perlu.'
            : 'Alamat dari Google Maps: ' + found);
        } catch {
          if (isMapActive() && id === destinationRevision) {
            status(addressStatus, 'Alamat otomatis tidak tersedia. Isi alamat tujuan secara manual.', true);
          }
        }
      }

      async function calculateRoute() {
        const { point, origin = PICKUP_LOCATION } = order.delivery ?? {};
        const id = ++routeRevision;
        retryButton.hidden = true;
        if (!point) {
          status(routeStatus, 'Ongkir tersedia setelah titik antar dipilih.');
          return;
        }
        status(routeStatus, 'Menghitung jarak jalan dan ongkir…');
        try {
          const distanceMeters = await roadDistance(maps, origin, point);
          if (!isMapActive() || id !== routeRevision) return;
          if (!Number.isFinite(distanceMeters) || distanceMeters < 0) throw new Error('Rute tidak ditemukan');
          order.delivery = { point, origin, distanceMeters };
          saveDraft();
          updateQuote();
          status(routeStatus, 'Rute kendaraan ditemukan.');
        } catch {
          if (!isMapActive() || id !== routeRevision) return;
          status(routeStatus, 'Rute kendaraan tidak tersedia. Geser penanda atau hitung ulang.', true);
          retryButton.hidden = false;
        }
      }

      function showMarker(point) {
        markers.destination.position = point;
        markers.destination.map = map;
      }

      function selectDestination(point) {
        const id = ++destinationRevision;
        showMarker(point);
        const previousPoint = order.delivery?.point;
        order.delivery = { point, origin: order.delivery?.origin ?? PICKUP_LOCATION };
        if (previousPoint && !samePoint(previousPoint, point)) address.value = '';
        address.dispatchEvent(new Event('input', { bubbles: true }));
        updateQuote();
        void lookupAddress(point, id);
        void calculateRoute();
      }

      function selectPickup(origin) {
        pickup.position = origin;
        order.delivery = { origin, point: order.delivery?.point };
        saveDraft();
        updateQuote();
        void calculateRoute();
      }

      const selectPoint = { pickup: selectPickup, destination: selectDestination };
      for (const [type, pin] of Object.entries(markers)) {
        const isDestination = type === 'destination';
        pin.addEventListener('gmp-dragstart', () => {
          if (!isMapActive()) return;
          dragging = true;
          setActivePoint(type);
          routeRevision++;
          if (isDestination) {
            destinationRevision++;
            status(addressStatus, '');
          }
          const { point, origin = PICKUP_LOCATION } = order.delivery ?? {};
          order.delivery = { point, origin };
          saveDraft();
          updateQuote();
          status(routeStatus, 'Geser penanda ke ' + mapPoints[type].label.toLowerCase() + '.');
          retryButton.hidden = true;
        });
        pin.addEventListener('gmp-dragend', () => {
          dragging = false;
          if (!isMapActive() || !pin.position) return;
          const { lat, lng } = pin.position.toJSON?.() ?? pin.position;
          selectPoint[type]({ lat, lng });
        });
      }

      map.addListener('click', event => {
        if (!isMapActive() || dragging || !event.latLng) return;
        clearLocationRequest();
        selectPoint[activePoint](event.latLng.toJSON());
      });
      retryButton.addEventListener('click', () => {
        if (isMapActive() && !dragging && order.delivery?.point) void calculateRoute();
      });
      locationButton.addEventListener('click', () => {
        if (!isMapActive() || dragging) return;
        if (!navigator.geolocation || !window.isSecureContext) {
          status(locationStatus, 'Lokasi perangkat memerlukan browser yang mendukung dan halaman HTTPS atau localhost. Pilih titik di peta.', true);
          return;
        }
        const id = ++locationRevision;
        locationButton.disabled = true;
        status(locationStatus, 'Mencari lokasi perangkat…');
        navigator.geolocation.getCurrentPosition(({ coords }) => {
          if (!isMapActive() || id !== locationRevision) return;
          clearLocationRequest();
          const point = { lat: coords.latitude, lng: coords.longitude };
          selectPoint[activePoint](point);
          map.panTo(point);
        }, error => {
          if (!isMapActive() || id !== locationRevision) return;
          locationButton.disabled = false;
          const text = error.code === 1
            ? 'Izin lokasi ditolak. Izinkan akses lokasi di browser atau pilih titik di peta.'
            : 'Lokasi perangkat tidak ditemukan. Coba lagi atau pilih titik di peta.';
          status(locationStatus, text, true);
        }, { enableHighAccuracy: true, timeout: 10000 });
      });

      const point = order.delivery?.point;
      if (point) {
        showMarker(point);
        if (!address.value.trim()) void lookupAddress(point, destinationRevision);
      }
      if (deliveryQuote(order)) status(routeStatus, 'Titik jemput dan tujuan tersimpan.');
      else void calculateRoute();
    } catch (error) {
      if (form.isConnected) mapError(error.message && !GOOGLE_MAPS_API_KEY
        ? error.message
        : mapsAuthFailed ? 'Google Maps menolak akses. Hubungi admin KampusKirim.'
          : 'Peta gagal dimuat. Periksa koneksi lalu muat ulang halaman.');
    }
  }

  function setDrawer(open, restoreFocus = true) {
    drawerOpen = mobile.matches && open;
    sidebar.classList.toggle('is-open', drawerOpen);
    sidebar.inert = mobile.matches && !drawerOpen;
    sidebar.setAttribute('role', drawerOpen ? 'dialog' : 'complementary');
    if (drawerOpen) sidebar.setAttribute('aria-modal', 'true');
    else sidebar.removeAttribute('aria-modal');
    workspace.inert = drawerOpen;
    menu.setAttribute('aria-expanded', String(drawerOpen));
    backdrop.hidden = !drawerOpen;
    document.body.classList.toggle('drawer-open', drawerOpen);
    if (drawerOpen) element('close-menu').focus();
    else if (restoreFocus && mobile.matches) menu.focus();
  }

  menu.addEventListener('click', () => setDrawer(true));
  element('close-menu').addEventListener('click', () => setDrawer(false));
  backdrop.addEventListener('click', () => setDrawer(false));
  mobile.addEventListener('change', () => setDrawer(false, false));
  document.addEventListener('keydown', event => {
    if (!drawerOpen || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') setDrawer(false);
    if (event.key !== 'Tab') return;
    const focusable = Array.from(sidebar.querySelectorAll('a[href], button:not([disabled])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    page.focus();
  });

  const contact = element('contact-dialog');
  element('admin-list').innerHTML = admins.map((admin, index) => `
    <a class="admin-option" href="${chatUrl(admin)}" target="_blank" rel="noopener noreferrer">
      <span class="icon-tile green">${icon('whatsapp')}</span>
      <span>Admin ${index + 1}<small>${admin.label}</small></span>
    </a>`).join('');

  document.addEventListener('click', event => {
    if (event.target.closest('[data-contact]')) contact.showModal();
    const menuLink = event.target.closest('.sidebar a[href^="#"]');
    if (drawerOpen && menuLink) setDrawer(false, menuLink.hash === location.hash);
  });

  const heading = (title, description = '') => `
    <div class="page-heading">
      <h1 tabindex="-1">${title}</h1>
      ${description ? `<p>${description}</p>` : ''}
    </div>`;

  const notice = (text, glyph = 'info', color = 'blue') => `
    <div class="notice ${color}">${icon(glyph)}<p>${text}</p></div>`;

  function cards(showExamples) {
    return `<div class="service-grid">${Object.entries(services).map(([key, service]) => `
      <article class="service-card">
        <span class="icon-tile ${service.color}">${icon(service.icon)}</span>
        <h3>${service.name}</h3>
        <p>${service.description}</p>
        ${showExamples ? `<p class="service-example">${service.example}</p>` : ''}
        <a class="service-link" href="#form/${key}" aria-label="Pilih ${service.name}">${showExamples ? 'Pilih ' + service.name : 'Pilih layanan'}</a>
      </article>`).join('')}</div>`;
  }

  function home() {
    const steps = [
      ['Pilih layanan', 'Sesuaikan kebutuhanmu.'],
      ['Isi detail', 'Tambahkan barang dan lokasi.'],
      ['Periksa pesanan', 'Pastikan datanya sudah benar.'],
      ['Kirim di WhatsApp', 'Lanjutkan ke chat admin.'],
    ];
    return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <h1 id="hero-title" tabindex="-1">Butuh sesuatu?<br><span>Biar kami bantu antar.</span></h1>
          <p>Antar makanan, jastip, dan barang ringan di sekitar kampus UNIMED dan kos.</p>
          <a class="button button-primary hero-button" href="#pesan">${icon('plus')} Pesan Sekarang</a>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="hero-orbit"></div>
          <div class="art-shadow"></div>
          <span class="art-pin">${icon('pin')}</span>
          <span class="art-spark spark-main">${icon('spark')}</span>
          <span class="art-spark spark-small">${icon('spark')}</span>
          <img src="kurir.png" alt="" width="1536" height="1024" fetchpriority="high">
        </div>
      </section>
      <section class="home-section" aria-labelledby="services-title">
        <div class="section-heading"><h2 id="services-title">Pilih kebutuhanmu</h2></div>
        ${cards(false)}
      </section>
      <section class="home-section how-section" aria-labelledby="steps-title">
        <div class="section-heading"><h2 id="steps-title">Cara kerja</h2></div>
        <ol class="step-grid">${steps.map(([title, detail], index) => `
          <li><span class="step-index" aria-hidden="true">${index + 1}</span><div><strong>${title}</strong><p>${detail}</p></div></li>`).join('')}</ol>
      </section>
      <section class="home-section area-panel">
        <span class="icon-tile green">${icon('pin')}</span>
          <div><h2>Area layanan</h2><p>Kampus utama UNIMED dan kos sekitarnya. Pilih tujuan di peta untuk melihat estimasi ongkir.</p></div>
        <a class="button button-outline" href="#bantuan">Lihat Bantuan</a>
      </section>`;
  }

  function servicePicker() {
    return heading('Layanan apa yang kamu butuhkan?', 'Pilih satu layanan untuk mulai mengisi detail pesanan.') +
      `<section class="picker" aria-label="Pilihan layanan">${cards(true)}</section>` +
      notice('Harga barang dan pembayaran dikonfirmasi lewat WhatsApp. <a href="#bantuan">Lihat pertanyaan umum.</a>');
  }

  function progress(current) {
    return `<ol class="progress" aria-label="Langkah pemesanan">
      <li class="${current === 1 ? 'current' : 'complete'}" ${current === 1 ? 'aria-current="step"' : ''}><span>${current === 1 ? '1' : icon('check')}</span> Isi detail</li>
      <li class="${current === 2 ? 'current' : ''}" ${current === 2 ? 'aria-current="step"' : ''}><span>2</span> Periksa pesanan</li>
    </ol>`;
  }

  function field(spec, value) {
    const id = 'field-' + spec.name;
    const label = `${escape(spec.label)} ${spec.required ? '<span class="required" aria-hidden="true">*</span>' : '<span class="optional">(opsional)</span>'}`;
    if (spec.type === 'checkbox') return `
      <label class="checkbox-line field-wide"><input type="checkbox" name="${spec.name}" ${value ? 'checked' : ''}><span>${escape(spec.label)}</span></label>`;

    const encoded = escape(value);
    const placeholder = spec.placeholder ? `placeholder="${escape(spec.placeholder)}"` : '';
    const described = `aria-describedby="${id}-error${spec.hint ? ' ' + id + '-hint' : ''}"`;
    const shared = `name="${spec.name}" id="${id}" ${described} ${spec.required ? 'required' : ''}`;
    let control;
    if (spec.options) {
      control = `<select ${shared}><option value="">Pilih ukuran</option>${spec.options.map(option => `<option ${value === option ? 'selected' : ''}>${option}</option>`).join('')}</select>`;
    } else if (spec.type === 'textarea') {
      control = `<textarea ${shared} ${placeholder} rows="3">${encoded}</textarea>`;
    } else {
      control = `<input ${shared} ${placeholder} type="${spec.type || 'text'}" value="${encoded}" ${spec.type === 'number' ? 'min="1" step="1" inputmode="numeric"' : ''} ${spec.autocomplete ? `autocomplete="${spec.autocomplete}"` : ''}>`;
    }
    return `<div class="field ${spec.wide || spec.type === 'textarea' ? 'field-wide' : ''}">
      <label for="${id}">${label}</label>${control}
      ${spec.hint ? `<small class="field-hint" id="${id}-hint">${escape(spec.hint)}</small>` : ''}
      <small class="field-error" id="${id}-error" hidden></small>
    </div>`;
  }

  function renderItems(order) {
    return order.items.map((item, index) => `<div class="item-fields">
      <div class="item-header"><h3>Item ${index + 1}</h3>
        ${order.items.length > 1 ? `<button class="text-button" type="button" data-remove-item="${index}" aria-label="Hapus item ${index + 1}">Hapus</button>` : ''}
      </div>
      <div class="field-grid">${itemFields(order.service).map(spec =>
        field({ ...spec, name: `item-${index}-${spec.name}` }, item[spec.name])).join('')}</div>
    </div>`).join('');
  }

  function costDetails(quote) {
    return `<dl class="cost-details">
      <div><dt>Jarak jalan</dt><dd>${quote ? formatDistance(quote.distanceMeters) : '—'}</dd></div>
      <div><dt>Ongkir</dt><dd>${quote ? formatMoney(quote.fee) : '—'}</dd></div>
    </dl>`;
  }

  function formView(order) {
    const layout = sections(order.service);
    page.innerHTML = heading('Form ' + services[order.service].name, 'Kolom bertanda * wajib diisi.') + progress(1) +
      `<div class="order-layout">
        <form class="order-form" id="order-form" novalidate>
          ${layout.map(section => `<section class="surface form-section">
            <h2>${section.title}</h2>${section.hint ? `<p class="section-hint">${section.hint}</p>` : ''}
            ${section.map ? destinationMap() : ''}
            ${section.items ? `<div id="items">${renderItems(order)}</div>
              <button class="button button-outline add-item" type="button" id="add-item">${icon('plus')} Tambah item</button>` :
              `<div class="field-grid">${section.fields.map(spec => field(spec, order.values[spec.name])).join('')}</div>`}
            ${section.map ? `<div id="form-cost" aria-live="polite">${costDetails(deliveryQuote(order))}</div>` : ''}
          </section>`).join('')}
          <p class="form-alert" id="form-alert" role="alert" hidden></p>
          <div class="actions">
            <a class="button button-outline" href="#pesan">Kembali</a>
            <button class="button button-primary" type="submit">Periksa Pesanan</button>
          </div>
        </form>
        <aside class="surface order-aside">
          <span class="icon-tile ${services[order.service].color}">${icon(services[order.service].icon)}</span>
          <h2>${services[order.service].name}</h2>
          <p>${services[order.service].description}</p>
          <p class="muted">Harga barang dan pembayaran dikonfirmasi lewat WhatsApp.</p>
          <p class="aside-note">Draf tersimpan di browser ini saat kamu mengisi formulir.</p>
        </aside>
      </div>`;

    const form = element('order-form');
    const alert = element('form-alert');
    const costs = element('form-cost');
    function updateQuote() {
      const quote = deliveryQuote(order);
      costs.innerHTML = costDetails(quote);
      if (quote && alert.dataset.routeError) {
        alert.hidden = true;
        delete alert.dataset.routeError;
      }
    }

    function readForm() {
      const data = new FormData(form);
      for (const section of layout) {
        for (const spec of section.fields ?? []) {
          order.values[spec.name] = spec.type === 'checkbox' ? data.has(spec.name) : String(data.get(spec.name)).trim();
        }
      }
      if (order.service !== 'barang') {
        order.items = order.items.map((_, index) => Object.fromEntries(itemFields(order.service).map(spec =>
          [spec.name, String(data.get(`item-${index}-${spec.name}`)).trim()])));
      }
    }
    function saveDraft() {
      persist(order);
      const route = `#form/${order.service}/${order.id}`;
      if (location.hash !== route) history.replaceState(null, '', route);
    }
    function displayError(name, error) {
      const input = form.elements.namedItem(name);
      const label = element('field-' + name + '-error');
      if (!input || !label) return;
      input.setAttribute('aria-invalid', String(Boolean(error)));
      label.textContent = error;
      label.hidden = !error;
    }
    function validateInput(input) {
      let spec = layout.flatMap(section => section.fields ?? []).find(item => item.name === input.name);
      if (input.name?.startsWith('item-')) spec = itemFields(order.service).find(item => item.name === input.name.split('-')[2]);
      if (spec) displayError(input.name, input.validity.badInput ? 'Periksa kembali angka, tanggal, atau waktu.' : fieldError(spec, input.value));
    }
    form.addEventListener('input', event => {
      readForm();
      saveDraft();
      if (event.target.getAttribute('aria-invalid') === 'true') validateInput(event.target);
    });
    form.addEventListener('focusout', event => validateInput(event.target));

    if (order.service !== 'barang') {
      const items = element('items');
      element('add-item').addEventListener('click', () => {
        readForm();
        order.items.push({ name: '', quantity: '1', variant: '' });
        items.innerHTML = renderItems(order);
        saveDraft();
        element(`field-item-${order.items.length - 1}-name`).focus();
      });
      items.addEventListener('click', event => {
        const button = event.target.closest('[data-remove-item]');
        if (!button || order.items.length <= 1) return;
        const index = Number(button.dataset.removeItem);
        readForm();
        order.items.splice(index, 1);
        items.innerHTML = renderItems(order);
        saveDraft();
        element(`field-item-${Math.min(index, order.items.length - 1)}-name`).focus();
      });
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      readForm();
      const errors = validate(order);
      for (const input of form.elements) {
        if (input.validity?.badInput) errors[input.name] = 'Periksa kembali angka, tanggal, atau waktu.';
        if (input.name) displayError(input.name, errors[input.name] ?? '');
      }
      const firstError = form.querySelector('[aria-invalid="true"]');
      delete alert.dataset.routeError;
      if (Object.keys(errors).length) {
        alert.hidden = false;
        alert.textContent = 'Periksa kolom yang ditandai sebelum melanjutkan.';
        (firstError || element('add-item'))?.focus();
        return;
      }
      if (!deliveryQuote(order)) {
        alert.hidden = false;
        alert.dataset.routeError = 'true';
        alert.textContent = 'Pilih titik antar dan tunggu sampai ongkir tersedia.';
        element('destination-map').scrollIntoView({ block: 'center' });
        return;
      }
      saveDraft();
      go('review/' + order.id);
    });
    void setupDestinationMap(order, form, saveDraft, updateQuote);
  }

  function summaryCards(order, quote) {
    return `<div class="summary-grid">${summary(order, quote).map(group => `
      <section class="surface summary-card">
        <h2>${icon(group.icon)} ${group.title}</h2>
        <dl>${group.rows.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value || '—')}</dd></div>`).join('')}</dl>
      </section>`).join('')}</div>`;
  }

  function reviewView(order) {
    const firstChoice = admins.find(admin => admin.number === order.admin) || admins[0];
    const quote = deliveryQuote(order);
    const canOrder = Boolean(quote) && !Object.keys(validate(order)).length;
    page.innerHTML = heading('Periksa pesananmu', 'Cek detail dan pilih admin yang akan kamu hubungi.') + progress(2) +
      `<div class="order-layout review-layout">
        ${summaryCards(order)}
        <form class="surface order-aside review-actions" id="review-form">
          <h2>Ringkasan ongkir</h2>
          ${costDetails(quote)}
          <p>Harga barang dan pembayaran dikonfirmasi lewat WhatsApp.</p>
          ${canOrder ? '' : '<p>Lengkapi detail dan pilih tujuan lewat tombol Ubah pesanan.</p>'}
          <label class="field-label" for="admin">Admin tujuan</label>
          <select name="admin" id="admin">${admins.map(admin => `<option value="${admin.number}" ${admin === firstChoice ? 'selected' : ''}>${admin.label}</option>`).join('')}</select>
          <label class="checkbox-line"><input type="checkbox" required id="review-confirm" ${canOrder ? '' : 'disabled'}><span>Saya sudah memeriksa detail pesanan.</span></label>
          <button class="button button-primary" id="launch-chat" type="submit" disabled>${icon('whatsapp')} Pesan via WhatsApp</button>
          <a class="button button-outline" href="#form/${order.service}/${order.id}">Ubah pesanan</a>
        </form>
      </div>`;
    const confirm = element('review-confirm');
    const launch = element('launch-chat');
    const adminSelect = element('admin');
    adminSelect.addEventListener('change', () => {
      if (order.status === 'draft') {
        order.admin = adminSelect.value;
        persist(order);
      }
    });
    confirm.addEventListener('change', () => { launch.disabled = !canOrder || !confirm.checked; });
    element('review-form').addEventListener('submit', event => {
      event.preventDefault();
      const admin = admins.find(item => item.number === adminSelect.value);
      if (!admin || !confirm.checked || !canOrder) return;
      const markedSent = order.status === 'sent' && order.admin === admin.number;
      const prepared = {
        ...order,
        status: markedSent ? 'sent' : 'opened',
        admin: admin.number,
        delivery: { ...order.delivery, fee: quote.fee, pickupName: quote.pickupName },
        message: order.message || message(order, quote),
        templateVersion: order.message ? order.templateVersion : 3,
        openedAt: new Date().toISOString(),
        markedSentAt: markedSent ? order.markedSentAt : undefined,
      };
      persist(prepared);
      window.open(chatUrl(admin, prepared.message), '_blank', 'noopener,noreferrer');
      go('whatsapp/' + order.id);
    });
  }

  async function copyMessage(body) {
    try {
      await navigator.clipboard.writeText(body);
      showToast('Pesan disalin.');
    } catch {
      const dialog = element('copy-dialog');
      const text = element('manual-message');
      text.value = body;
      dialog.showModal();
      text.focus();
      text.select();
    }
  }

  function handoffView(order) {
    const admin = admins.find(item => item.number === order.admin) || admins[0];
    page.innerHTML = `<div class="handoff surface">
      <span class="icon-tile green large">${icon('whatsapp')}</span>
      ${heading('Pesananmu sudah disiapkan.', 'Lanjutkan ke chat WhatsApp admin ' + admin.label + '.')}
      <ol class="handoff-steps">
        <li>Buka chat Admin KampusKirim.</li>
        <li>Periksa isi pesan yang sudah terisi.</li>
        <li>Tekan <strong>Kirim</strong> di WhatsApp dan tunggu balasan admin.</li>
      </ol>
      <div class="actions">
        <a class="button button-primary" href="${escape(chatUrl(admin, order.message))}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Buka WhatsApp</a>
        <button class="button button-outline" type="button" id="copy-order">${icon('copy')} Salin template pesan</button>
      </div>
      <p class="muted">Jika WhatsApp tidak terbuka, salin pesannya dan buka chat admin secara manual.</p>
      ${notice(order.status === 'sent' ? 'Kamu sudah menandai pesan ini sebagai dikirim di perangkat ini.'
        : 'Setelah menekan Kirim, kamu bisa menandainya di riwayat perangkat ini.', order.status === 'sent' ? 'check' : 'info', 'green')}
      <div class="handoff-footer">
        ${order.status === 'sent' ? '<a class="text-button" href="#riwayat">Lihat Pesanan Saya</a>' : '<button class="text-button" type="button" id="mark-sent">Saya sudah menekan Kirim</button>'}
        <a class="text-button" href="#review/${order.id}">Kembali ke ringkasan</a>
      </div>
    </div>`;
    element('copy-order').addEventListener('click', () => copyMessage(order.message));
    element('mark-sent')?.addEventListener('click', () => {
      persist({ ...order, status: 'sent', markedSentAt: new Date().toISOString() });
      handoffView({ ...order, status: 'sent' });
      page.querySelector('.handoff-footer a').focus();
      showToast('Pesan ditandai sebagai dikirim di perangkat ini.');
    });
  }

  function badge(order) {
    return `<span class="status status-${order.status}">${orderStatus[order.status]}</span>`;
  }

  function historyView() {
    const orders = list().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const filtered = orders.filter(order => filter === 'all' || order.status === filter);
    page.innerHTML = heading('Pesanan Saya', 'Riwayat tersimpan di browser ini. Konfirmasi dan pembaruan pesanan diberikan admin lewat WhatsApp.') +
      `<div class="history-tools"><label for="history-filter">Status lokal</label>
        <select id="history-filter">
          ${Object.entries({ all: 'Semua', ...orderStatus }).map(([key, label]) => `<option value="${key}" ${key === filter ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      ${usingMemory() ? notice('Browser ini tidak dapat menyimpan riwayat. Data yang tampil hanya tersedia selama halaman terbuka.') : ''}
      ${filtered.length ? `<div class="history-grid">${filtered.map(order => {
        const service = services[order.service];
        const items = order.values.parcel || order.items.map(item => item.name).filter(Boolean).join(', ');
        return `<article class="surface history-card">
          <div class="history-card-top"><span class="icon-tile ${service.color}">${icon(service.icon)}</span>${badge(order)}</div>
          <p class="history-meta">${localCode(order)} · ${formatDate(order.createdAt)}</p>
          <h2>${service.name}</h2>
          <p class="history-items">${escape(items || 'Detail barang belum diisi')}</p>
          <p class="history-destination">${icon('pin')} <span>${escape(order.values.destination || 'Tujuan belum diisi')}</span></p>
          <div class="history-actions">
            <a class="button button-outline" href="#riwayat/${order.id}">Lihat detail</a>
            ${order.message ? `<button class="text-button" data-copy="${order.id}" type="button">Salin pesan</button>` : ''}
            <button class="text-button text-danger" data-delete="${order.id}" type="button">Hapus</button>
          </div>
        </article>`;
      }).join('')}</div>` : `<div class="surface empty">
        <span class="icon-tile green large">${icon('box')}</span>
        <h2>${orders.length ? 'Belum ada pesanan dengan status ini.' : 'Belum ada pesanan.'}</h2>
        <p>${orders.length ? 'Pilih status lain untuk melihat pesananmu.' : 'Mulai dengan memilih layanan yang kamu butuhkan.'}</p>
        ${orders.length ? '' : '<a class="button button-primary" href="#pesan">Buat Pesanan</a>'}
      </div>`}
      <p class="history-footnote">Riwayat dapat hilang jika data browser dihapus. Gunakan chat WhatsApp untuk melihat balasan admin.</p>`;

    element('history-filter').addEventListener('change', event => {
      filter = event.target.value;
      historyView();
      element('history-filter').focus();
    });
  }

  function historyDetail(order) {
    page.innerHTML = heading('Detail pesanan', localCode(order) + ' · ' + formatDate(order.createdAt)) +
      `<div class="detail-status">${badge(order)}</div>
      ${summaryCards(order, deliveryQuote(order))}
      ${order.message ? `<details class="surface message-details"><summary>Template pesan WhatsApp</summary>
        <pre>${escape(order.message)}</pre></details>` : ''}
      <div class="actions detail-actions">
        <a class="button button-outline" href="#riwayat">Kembali ke riwayat</a>
        ${order.status === 'draft'
          ? `<a class="button button-primary" href="#form/${order.service}/${order.id}">Lanjutkan draf</a>`
          : `<a class="button button-primary" href="#whatsapp/${order.id}">Lihat panduan WhatsApp</a>
            <button class="button button-outline" data-copy="${order.id}" type="button">Salin pesan</button>
            <button class="text-button" data-contact type="button">Hubungi Admin</button>`}
        <button class="text-button text-danger" data-delete="${order.id}" type="button">Hapus pesanan</button>
      </div>`;
  }

  const questions = [
    ['Bagaimana cara memesan?', 'Pilih layanan, isi detail, dan periksa pesanan. Buka WhatsApp dari halaman ringkasan, lalu tekan Kirim di chat admin.'],
    ['Kapan pesanan dikonfirmasi?', 'Setelah pesan diterima, admin akan memeriksa dan membalas lewat WhatsApp.'],
    ['Berapa ongkirnya?', `Ongkir dihitung dari jarak jalan antara titik jemput dan tujuan yang dipilih di peta dengan tarif ${formatMoney(DELIVERY_RATE_PER_KM)} per km. Harga barang dan pembayaran dikonfirmasi lewat WhatsApp.`],
    ['Area mana yang dilayani?', 'Kampus utama UNIMED dan kos di sekitarnya. Tanyakan ke admin apakah titik pengambilan dan tujuanmu terjangkau.'],
    ['Barang apa saja yang dapat diantar?', 'Layanan berfokus pada barang ringan, seperti dokumen, buku, dan alat tulis. Tanyakan dahulu untuk barang besar, rapuh, bernilai tinggi, atau yang perlu penanganan khusus.'],
    ['Bagaimana jika barang jastip habis?', 'Admin akan menghubungimu untuk meminta persetujuan, kecuali kamu sudah mengizinkan penggantian dengan barang serupa di formulir.'],
    ['Bagaimana cara membatalkan pesanan?', 'Hubungi admin melalui chat pesananmu. Admin akan menjelaskan pilihan berdasarkan kondisi pesanan.'],
    ['Kapan admin menerima pesanan?', 'Hubungi admin untuk menanyakan jam layanan dan ketersediaan.'],
  ];

  function help(area) {
    return heading('Pusat Bantuan', 'Temukan jawaban tentang pemesanan, jangkauan, dan layanan KampusKirim.') +
      `<div class="help-layout">
        <section class="surface faq" aria-label="Pertanyaan umum">
          <h2>Pertanyaan umum</h2>
          ${questions.map(([question, answer], index) => `<details ${area && index === 3 ? 'open' : ''}><summary>${question} ${icon('chevron')}</summary><p>${answer}</p></details>`).join('')}
        </section>
        <aside class="surface order-aside help-aside">
          <span class="icon-tile green">${icon('whatsapp')}</span>
          <h2>Butuh bantuan lain?</h2>
          <p>Tanya langsung ke Admin KampusKirim melalui WhatsApp.</p>
          <button class="button button-primary" type="button" data-contact>Hubungi Admin</button>
        </aside>
      </div>
      ${notice('Formulir menyimpan draf dan riwayat di browser ini. Saat kamu mengirim pesan di WhatsApp, detail pesanan dibagikan ke admin pilihanmu.', 'info')}`;
  }

  function missing() {
    page.innerHTML = heading('Pesanan tidak ditemukan', 'Buka riwayat untuk melihat pesanan yang tersimpan di browser ini.') +
      '<a class="button button-primary" href="#riwayat">Lihat Pesanan Saya</a>';
  }

  function render(moveFocus = true) {
    const [route, key, id] = location.hash.slice(1).split('/');
    const section = route === 'riwayat' || route === 'bantuan' ? route :
      ['pesan', 'form', 'review', 'whatsapp'].includes(route) ? 'pesan' : 'beranda';
    const title = navigation.find(entry => entry[0] === section)[2];
    element('page-label').textContent = title;
    document.title = title + ' | KampusKirim';
    element('navigation').innerHTML = navigation.map(([link, glyph, label]) =>
      `<a href="#${link}" ${link === section ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></a>`).join('');
    if (drawerOpen) setDrawer(false, false);

    if (route === 'form' && Object.hasOwn(services, key)) {
      const existing = id ? get(id) : list().find(order => order.service === key && order.status === 'draft');
      if (id && existing?.service !== key) missing();
      else if (existing && existing.status !== 'draft') {
        formView({ ...draft(key), values: { ...existing.values }, items: existing.items.map(item => ({ ...item })), delivery: existing.delivery });
      } else formView(existing || draft(key));
    } else if (route === 'review') {
      const order = get(key);
      if (!order) missing();
      else if (order.status === 'draft' && (Object.keys(validate(order)).length || !deliveryQuote(order))) {
        location.replace('#form/' + order.service + '/' + order.id);
        return;
      } else reviewView(order);
    } else if (route === 'whatsapp') {
      const order = get(key);
      if (order?.message) handoffView(order);
      else missing();
    } else if (route === 'riwayat') {
      if (!key) historyView();
      else if (get(key)) historyDetail(get(key));
      else missing();
    } else if (route === 'bantuan') page.innerHTML = help(key === 'area');
    else if (section === 'pesan') page.innerHTML = servicePicker();
    else page.innerHTML = home();

    if (moveFocus) {
      window.scrollTo(0, 0);
      page.querySelector('h1')?.focus({ preventScroll: true });
    }
  }

  const deleteDialog = element('delete-dialog');
  let deleteId = '';
  page.addEventListener('click', event => {
    const copy = event.target.closest('[data-copy]');
    const deleteButton = event.target.closest('[data-delete]');
    if (copy) {
      const order = get(copy.dataset.copy);
      if (order?.message) copyMessage(order.message);
    }
    if (deleteButton) {
      deleteId = deleteButton.dataset.delete;
      deleteDialog.returnValue = '';
      deleteDialog.showModal();
    }
  });
  deleteDialog.addEventListener('close', () => {
    if (deleteDialog.returnValue === 'delete' && deleteId) {
      remove(deleteId);
      go('riwayat');
      showToast('Pesanan dihapus dari perangkat ini.');
    }
    deleteId = '';
  });

  window.addEventListener('hashchange', () => render());
  window.addEventListener('storage', event => {
    if ((event.key === 'kampuskirim.orders.v1' || event.key === null) && location.hash === '#riwayat') render(false);
  });
  setDrawer(false, false);
  render(false);
})();
