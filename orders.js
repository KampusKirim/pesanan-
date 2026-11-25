'use strict';

const KampusOrders = (() => {
  const admins = [
    { number: '6281264176866', label: '+62 812-6417-6866' },
    { number: '6281260716634', label: '+62 812-6071-6634' },
    { number: '6282160851111', label: '+62 821-6085-1111' },
    { number: '6282277817288', label: '+62 822-7781-7288' },
    { number: '6283834600353', label: '+62 838-3460-0353' },
  ];

  const services = {
    makanan: {
      name: 'Antar Makanan',
      icon: 'food',
      color: 'orange',
      description: 'Pesan dari kantin, warung, atau kedai favoritmu di sekitar kampus.',
      example: 'Contoh: nasi bungkus, kopi, camilan.',
    },
    jastip: {
      name: 'Jastip',
      icon: 'bag',
      color: 'green',
      description: 'Titip beli kebutuhan dari toko sekitar, dari alat tulis sampai kebutuhan kos.',
      example: 'Contoh: sabun, buku catatan, minuman.',
    },
    barang: {
      name: 'Antar Barang',
      icon: 'box',
      color: 'blue',
      description: 'Kirim dokumen, buku, dan paket ringan ke kampus atau kos tujuan.',
      example: 'Contoh: berkas, buku, alat tulis.',
    },
  };

  const field = (name, label, options = {}) => ({ name, label, ...options });
  const required = (name, label, placeholder, options = {}) =>
    field(name, label, { placeholder, required: true, ...options });

  function sections(service) {
    const isParcel = service === 'barang';
    const isErrand = service === 'jastip';
    const customer = {
      title: isParcel ? 'Data pengirim' : 'Data pemesan',
      fields: [
        required('customer', 'Nama lengkap', 'Contoh: Rani Putri', { min: 2, autocomplete: 'name' }),
        required('phone', 'Nomor HP', 'Contoh: 081234567890', { type: 'tel', autocomplete: 'tel' }),
      ],
    };
    const location = isParcel ? {
      title: 'Lokasi pengambilan',
      fields: [
        required('pickup', 'Detail pengambilan di titik jemput', 'Contoh: tunggu di pos satpam', { type: 'textarea', min: 5 }),
        field('pickupContact', 'Nama kontak di lokasi', { placeholder: 'Contoh: Dimas' }),
      ],
    } : {
      title: isErrand ? 'Toko tujuan' : 'Lokasi pembelian',
      fields: [
        required('seller', isErrand ? 'Nama toko atau tempat pembelian' : 'Nama warung, restoran, atau kantin', isErrand ? 'Contoh: toko alat tulis dekat kos' : 'Contoh: Kantin Fakultas Teknik', { wide: true }),
        required('pickup', 'Alamat atau patokan', 'Contoh: samping gerbang fakultas', { type: 'textarea', min: 5 }),
      ],
    };
    const destination = {
      title: 'Peta titik jemput dan antar',
      map: true,
      fields: [
        required('destination', 'Alamat tujuan', 'Contoh: Kos Melati, Jl. Pancing No. 12', { type: 'textarea', min: 5 }),
        required('landmark', 'Patokan lokasi tujuan', 'Contoh: Gedung B, ruang 204, atau Kos Melati', { wide: true }),
        ...(isParcel ? [
          required('recipient', 'Nama penerima', 'Contoh: Nisa'),
          field('recipientPhone', 'Nomor WhatsApp penerima', { type: 'tel', placeholder: 'Jika berbeda dari pengirim' }),
        ] : []),
      ],
    };
    const extras = {
      title: 'Waktu dan catatan',
      fields: [
        field('time', isParcel ? 'Waktu pengambilan yang diinginkan' : 'Waktu antar yang diinginkan', { type: 'datetime-local' }),
        field('note', 'Catatan untuk kurir', {
          type: 'textarea', placeholder: isParcel ? 'Contoh: simpan dokumen dalam posisi datar' : 'Contoh: hubungi saat tiba',
        }),
      ],
    };
    const details = isParcel ? {
      title: 'Detail barang',
      hint: 'Layanan ini untuk barang ringan. Admin akan memeriksa jenis dan ukuran barang.',
      fields: [
        required('parcel', 'Deskripsi barang', 'Contoh: dokumen dan buku', { type: 'textarea' }),
        required('quantity', 'Jumlah koli', '1', { type: 'number' }),
        field('size', 'Perkiraan ukuran', { options: ['Kecil', 'Sedang', 'Besar'] }),
      ],
    } : { title: isErrand ? 'Daftar barang' : 'Detail menu', items: true };
    const budget = {
      title: 'Batas pembelian',
      fields: [
        field('budget', 'Batas anggaran total (Rp)', {
          type: 'number', placeholder: 'Contoh: 50000', hint: 'Batas harga barang, di luar biaya jasa dan ongkos antar.',
        }),
        field('replace', 'Boleh diganti barang serupa jika stok kosong', { type: 'checkbox' }),
      ],
    };
    if (isParcel) return [customer, details, location, destination, extras];
    return [customer, location, details, ...(isErrand ? [budget] : []), destination, extras];
  }

  function itemFields(service) {
    return [
      required('name', service === 'makanan' ? 'Nama makanan atau minuman' : 'Nama barang', service === 'makanan' ? 'Contoh: nasi ayam' : 'Contoh: buku tulis', { wide: true }),
      required('quantity', 'Jumlah', '1', { type: 'number' }),
      field('variant', 'Varian atau catatan item', { placeholder: service === 'makanan' ? 'Contoh: sambal dipisah' : 'Contoh: A5, sampul biru' }),
    ];
  }

  function normalizePhone(value) {
    if (!/^\+?[\d\s()-]+$/.test(value)) return '';
    const digits = value.replace(/\D/g, '');
    const normalized = digits.startsWith('08') ? '62' + digits.slice(1) : digits;
    return /^628\d{7,11}$/.test(normalized) ? normalized : '';
  }

  function fieldError(spec, value) {
    if (spec.type === 'checkbox') return '';
    const input = String(value ?? '').trim();
    if (!input && spec.required) return 'Isi ' + spec.label.toLowerCase() + '.';
    if (!input) return '';
    if (spec.type === 'tel' && !normalizePhone(input)) return 'Gunakan nomor WhatsApp aktif yang diawali 08 atau +62.';
    if (spec.type === 'number' && (!/^\d+$/.test(input) || !Number.isSafeInteger(Number(input)) || Number(input) < 1)) {
      return spec.name === 'budget' ? 'Masukkan anggaran dalam rupiah, minimal Rp1.' : 'Jumlah harus bilangan bulat, minimal 1.';
    }
    if (spec.min && input.length < spec.min) {
      return spec.min === 2 ? 'Nama lengkap minimal 2 karakter.' : 'Tambahkan nama jalan, gedung, atau patokan lokasi.';
    }
    if (spec.type === 'datetime-local' && Number.isNaN(new Date(input).getTime())) return 'Periksa kembali tanggal dan waktu.';
    return '';
  }

  function validate(order) {
    const errors = {};
    for (const section of sections(order.service)) {
      for (const spec of section.fields ?? []) {
        const error = fieldError(spec, order.values[spec.name]);
        if (error) errors[spec.name] = error;
      }
    }
    if (order.service !== 'barang') {
      if (!order.items.length) errors.items = 'Masukkan minimal satu item.';
      order.items.forEach((item, index) => {
        for (const spec of itemFields(order.service)) {
          const error = fieldError(spec, item[spec.name]);
          if (error) errors[`item-${index}-${spec.name}`] = error;
        }
      });
    }
    return errors;
  }

  const dates = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const kilometers = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 });
  const formatMoney = value => money.format(value);
  const formatDistance = meters => kilometers.format(meters / 1000) + ' km';
  const formatDate = value => Number.isNaN(new Date(value).getTime()) || !value ? '' : dates.format(new Date(value));
  const displayPhone = value => normalizePhone(value) ? '+' + normalizePhone(value) : value;
  const mapsLink = point => `https://www.google.com/maps?q=${point.lat},${point.lng}`;
  const localCode = order => 'KK-' + order.id.slice(0, 8).toUpperCase();
  const orderStatus = {
    draft: 'Draft',
    opened: 'WhatsApp dibuka',
    sent: 'Saya menandai sudah dikirim',
  };

  function summary(order, quote) {
    const { service, values: v, items } = order;
    const { origin, point } = order.delivery ?? {};
    const isParcel = service === 'barang';
    const isErrand = service === 'jastip';
    return [
      { title: isParcel ? 'Pengirim' : 'Pemesan', icon: 'user', rows: [
        ['Nama lengkap', v.customer], ['Nomor HP', displayPhone(v.phone)],
      ] },
      { title: 'Detail layanan', icon: services[service].icon, rows: [
        ['Layanan', services[service].name],
        ...(isParcel ? [['Deskripsi barang', v.parcel], ['Jumlah koli', v.quantity], ['Perkiraan ukuran', v.size]]
          : items.map((item, index) => [`${isErrand ? 'Barang' : 'Menu'} ${index + 1}`,
            [item.name, item.quantity && item.quantity + ' buah', item.variant].filter(Boolean).join(' · ')])),
        ...(isErrand ? [['Batas anggaran barang', v.budget ? money.format(Number(v.budget)) : ''],
          ['Barang pengganti', v.replace ? 'Boleh diganti dengan barang serupa' : 'Hubungi pemesan untuk persetujuan']] : []),
      ] },
      { title: 'Lokasi pengambilan', icon: 'pin', rows: [
        ...(!isParcel ? [[isErrand ? 'Nama toko' : 'Nama penjual', v.seller]] : []),
        [isParcel && point ? 'Detail pengambilan' : 'Alamat atau patokan', v.pickup],
        ...(origin ? [['Link titik jemput', mapsLink(origin)]] : []),
        ...(isParcel ? [['Nama kontak di lokasi', v.pickupContact]] : []),
      ] },
      { title: 'Lokasi tujuan', icon: 'pin', rows: [
        ['Alamat tujuan', v.destination],
        ['Patokan lokasi', v.landmark],
        ...(point ? [['Link lokasi', mapsLink(point)]] : []),
        ...(isParcel ? [['Nama penerima', v.recipient], ['Nomor WhatsApp penerima', displayPhone(v.recipientPhone)]] : []),
      ] },
      ...(quote ? [{ title: 'Ringkasan ongkir', icon: 'pin', rows: [
        ['Titik jemput', quote.pickupName],
        ['Jarak jalan', formatDistance(quote.distanceMeters)],
        ['Ongkir', formatMoney(quote.fee)],
      ] }] : []),
      { title: 'Waktu dan catatan', icon: 'clock', rows: [
        [isParcel ? 'Waktu pengambilan' : 'Waktu antar', formatDate(v.time)],
        ['Catatan untuk kurir', v.note || (quote ? '—' : '')],
      ] },
    ];
  }

  function message(order, quote) {
    const parts = [
      `Halo Admin KampusKirim, saya ingin memesan layanan ${services[order.service].name}.`,
      'Referensi lokal: ' + localCode(order),
    ];
    for (const group of summary(order, quote)) {
      const rows = group.rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
      if (rows.length) parts.push(['*' + group.title + '*', ...rows].join('\n'));
    }
    parts.push('Mohon konfirmasi ketersediaan, harga barang, pembayaran, dan estimasi waktu. Terima kasih.');
    return parts.join('\n\n');
  }

  function chatUrl(admin, body = '') {
    return 'https://wa.me/' + admin.number + (body ? '?text=' + encodeURIComponent(body.toWellFormed()) : '');
  }

  const storageKey = 'kampuskirim.orders.v1';
  let memory = [];
  let memoryOnly = false;

  function list() {
    if (memoryOnly) return memory;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) memory = saved;
    } catch {
      memoryOnly = true;
    }
    return memory;
  }

  function write(orders) {
    memory = orders;
    if (memoryOnly) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(orders));
      return true;
    } catch {
      memoryOnly = true;
      return false;
    }
  }

  function save(order) {
    return write([order, ...list().filter(saved => saved.id !== order.id)]);
  }

  const get = id => list().find(order => order.id === id);
  const remove = id => write(list().filter(order => order.id !== id));

  function draft(service) {
    return {
      id: Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, '0')).join(''),
      service, status: 'draft', createdAt: new Date().toISOString(), values: {},
      items: service === 'barang' ? [] : [{ name: '', quantity: '1', variant: '' }],
    };
  }

  return { admins, services, sections, itemFields, fieldError, validate, summary, message, chatUrl,
    formatDate, formatMoney, formatDistance, localCode, orderStatus, list, save, get, remove, draft,
    usingMemory: () => memoryOnly };
})();
