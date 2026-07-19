/* ============================================================
   BookPro — universal booking platform (standalone).
   Shared runtime: API client, auth, template catalog, and the
   manifest generator that turns wizard answers into installed
   apps for the /api/platform engine.
   Accounts are CyberCheck accounts (/api/auth), pages render at
   /p/:slug and checkouts at /book/:slug/:app on this same host.
   ============================================================ */
(function () {
    'use strict';

    var API = window.CC_API_BASE || 'https://gcr-api-clean.vercel.app';
    var TOKEN_KEY = 'cc_token'; // same token the CyberCheck dashboard uses — one account everywhere

    function token() { return localStorage.getItem(TOKEN_KEY) || ''; }
    function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); }
    function clearToken() { localStorage.removeItem(TOKEN_KEY); }

    function headers() {
        var h = { 'Content-Type': 'application/json' };
        if (token()) h['Authorization'] = 'Bearer ' + token();
        return h;
    }
    function api(path, opts) {
        opts = opts || {};
        opts.headers = Object.assign(headers(), opts.headers || {});
        if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
        return fetch(API + path, opts).then(function (r) {
            if (r.status === 401) { clearToken(); var e = new Error('Session expired — sign in again.'); e.auth = true; throw e; }
            return r.json().then(function (d) {
                if (!r.ok) throw new Error(d.error || ('Request failed (' + r.status + ')'));
                return d;
            });
        });
    }
    // /api/platform shorthand
    function plat(path, opts) { return api('/api/platform' + path, opts); }

    // ── auth ──
    function signup(email, password, businessName, phone) {
        return api('/api/auth/signup', { method: 'POST', body: { email: email, password: password, businessName: businessName, phone: phone || null } })
            .then(function (d) { setToken(d.token); return d; });
    }
    function login(email, password) {
        return api('/api/auth/login', { method: 'POST', body: { email: email, password: password } })
            .then(function (d) { setToken(d.token); return d; });
    }

    function uploadImage(file) {
        return new Promise(function (resolve, reject) {
            var rd = new FileReader();
            rd.onload = function () {
                var b64 = String(rd.result).split(',')[1];
                plat('/upload', { method: 'POST', body: { image: b64, mime: file.type || 'image/jpeg' } })
                    .then(function (d) { resolve(d.url); }).catch(reject);
            };
            rd.onerror = function () { reject(new Error('Could not read that file')); };
            rd.readAsDataURL(file);
        });
    }

    // ============================================================
    // TEMPLATE CATALOG — every business type prefills the same
    // universal builder; nothing is locked, everything is editable.
    // scheduling: slots | date | range | none
    // pricing:    tiers (per person) | services (priced options)
    //             | units (per hour / day / night) | none
    // ============================================================
    var TEMPLATES = [
        { key: 'cruise', emoji: '🐬', label: 'Cruise & Boat Tours', blurb: 'Dolphin cruises, sunset sails, sightseeing — per-seat tickets.',
          d: { cta: 'Get Tickets', schedule: 'slots', slots: ['10:00 AM', '1:00 PM', '4:00 PM', 'Sunset'], slotCap: 40, cutoff: 1,
               pricing: 'tiers', tiers: [{ label: 'Adults', price: 35 }, { label: 'Kids', price: 20 }, { label: 'Seniors', price: 30 }],
               waiver: true, payMode: 'Full payment', deposit: 0 } },
        { key: 'charter', emoji: '🎣', label: 'Fishing Charter', blurb: 'Private trips — half day, full day, deposits, waivers.',
          d: { cta: 'Book a Trip', schedule: 'slots', slots: ['6:00 AM', '12:30 PM'], slotCap: 1, cutoff: 12, maxParty: 6,
               pricing: 'services', services: [{ name: 'Half Day (4 hr)', price: 600, duration: '4 hr' }, { name: 'Full Day (8 hr)', price: 1100, duration: '8 hr' }],
               waiver: true, payMode: 'Deposit only', deposit: 25 } },
        { key: 'rental', emoji: '🚤', label: 'Boat / Jet Ski / Gear Rental', blurb: 'Rent by the hour or the day — pick a unit, pick a date.',
          d: { cta: 'Reserve a Rental', schedule: 'slots', slots: ['8:00 AM', '12:00 PM', '4:00 PM'], slotCap: 1, cutoff: 2,
               pricing: 'units', unitKey: 'fleet_items', units: [{ name: 'Pontoon 24ft', rate_hourly: 95, rate_full: 450, capacity: 10 }, { name: 'Jet Ski', rate_hourly: 75, rate_full: 320, capacity: 2 }],
               waiver: true, payMode: 'Deposit only', deposit: 25 } },
        { key: 'lodging', emoji: '🏠', label: 'Vacation Rental & Lodging', blurb: 'Nightly stays — check-in / check-out, per-night rates, min stays.',
          d: { cta: 'Book Your Stay', schedule: 'range', pricing: 'units', unitKey: 'properties',
               units: [{ name: 'Gulf View Condo 2BR', rate_night: 219, capacity: 6, min_nights: 2 }],
               waiver: false, payMode: 'Deposit only', deposit: 30 } },
        { key: 'salon', emoji: '💇', label: 'Hair Salon / Stylist / Barber', blurb: 'Appointments by time slot — services, prices, no-show deposits.',
          d: { cta: 'Book an Appointment', schedule: 'slots', slots: ['9:00 AM', '10:30 AM', '12:00 PM', '1:30 PM', '3:00 PM', '4:30 PM'], slotCap: 1, cutoff: 2,
               pricing: 'services', services: [{ name: 'Haircut', price: 45, duration: '45 min' }, { name: 'Color', price: 120, duration: '2 hr' }, { name: 'Blowout', price: 40, duration: '30 min' }],
               waiver: false, payMode: 'No payment (pay on site)', deposit: 0 } },
        { key: 'spa', emoji: '💆', label: 'Spa & Massage', blurb: 'Time-slot appointments with priced treatments.',
          d: { cta: 'Book a Session', schedule: 'slots', slots: ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM'], slotCap: 2, cutoff: 4,
               pricing: 'services', services: [{ name: 'Swedish Massage 60min', price: 90, duration: '60 min' }, { name: 'Deep Tissue 90min', price: 130, duration: '90 min' }],
               waiver: true, payMode: 'Deposit only', deposit: 20 } },
        { key: 'homeservice', emoji: '🔧', label: 'Home Services & Service Calls', blurb: 'Book a service call — flat fees or quoted work, pay on site.',
          d: { cta: 'Book a Service Call', schedule: 'date', pricing: 'services',
               services: [{ name: 'Service Call', price: 89 }, { name: 'Estimate Visit', price: 0 }],
               waiver: false, payMode: 'No payment (pay on site)', deposit: 0 } },
        { key: 'photographer', emoji: '📸', label: 'Photography Sessions', blurb: 'Session packages, golden-hour slots, booking deposits.',
          d: { cta: 'Book a Session', schedule: 'slots', slots: ['8:00 AM', '5:30 PM', 'Sunset'], slotCap: 1, cutoff: 24,
               pricing: 'services', services: [{ name: 'Mini Session (20 min)', price: 150, duration: '20 min' }, { name: 'Family Session (1 hr)', price: 350, duration: '1 hr' }],
               waiver: false, payMode: 'Deposit only', deposit: 50 } },
        { key: 'fitness', emoji: '🧘', label: 'Classes & Fitness', blurb: 'Per-seat class booking — yoga, surf lessons, workshops.',
          d: { cta: 'Reserve a Spot', schedule: 'slots', slots: ['7:00 AM', '9:00 AM', '5:30 PM'], slotCap: 12, cutoff: 1,
               pricing: 'tiers', tiers: [{ label: 'Guests', price: 25 }],
               waiver: true, payMode: 'Full payment', deposit: 0 } },
        { key: 'restaurant', emoji: '🍽️', label: 'Restaurant Reservations', blurb: 'Free table reservations by time slot and party size.',
          d: { cta: 'Reserve a Table', schedule: 'slots', slots: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'], slotCap: 30, cutoff: 0,
               pricing: 'tiers', tiers: [{ label: 'Guests', price: 0 }],
               waiver: false, payMode: 'No payment (pay on site)', deposit: 0 } },
        { key: 'events', emoji: '🎟️', label: 'Events & Attractions', blurb: 'Ticketed entry — adult / kid / senior pricing, capacity caps.',
          d: { cta: 'Buy Tickets', schedule: 'slots', slots: ['11:00 AM', '2:00 PM', '7:00 PM'], slotCap: 100, cutoff: 0,
               pricing: 'tiers', tiers: [{ label: 'Adults', price: 25 }, { label: 'Kids', price: 12 }, { label: 'Seniors', price: 18 }],
               waiver: false, payMode: 'Full payment', deposit: 0 } },
        { key: 'transport', emoji: '🚐', label: 'Shuttle & Transport', blurb: 'Per-person rides and transfers on a schedule.',
          d: { cta: 'Book a Ride', schedule: 'slots', slots: ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'], slotCap: 14, cutoff: 1,
               pricing: 'tiers', tiers: [{ label: 'Adults', price: 25 }, { label: 'Kids', price: 15 }],
               waiver: false, payMode: 'Full payment', deposit: 0 } },
        { key: 'custom', emoji: '⚙️', label: 'Something Else', blurb: 'Start blank — any schedule, any pricing model. It’s universal.',
          d: { cta: 'Book Now', schedule: 'slots', slots: ['9:00 AM', '12:00 PM', '3:00 PM'], slotCap: 1, cutoff: 0,
               pricing: 'services', services: [{ name: 'Standard Booking', price: 50 }],
               waiver: false, payMode: 'Full payment', deposit: 0 } }
    ];

    function slugKey(label, i) {
        var k = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return k || ('tier_' + (i + 1));
    }

    // ============================================================
    // MANIFEST GENERATOR — wizard answers → engine-compatible installs
    // b = { cta, schedule, slots[], slotCap, cutoff, maxParty, cancelHours,
    //       pricing, tiers[], services[], units[], unitKey,
    //       waiver, waiverText, payMode, deposit, addons:bool }
    // Returns { installed: {id: {enabled, showOnPublic, manifest, config}}, page_order: [] }
    // ============================================================
    function buildInstalls(b, bizLabel) {
        var installed = {};
        var order = [];
        function add(id, manifest, config, showOnPublic) {
            installed[id] = { enabled: true, showOnPublic: showOnPublic !== false, manifest: manifest, config: config || {} };
            if (manifest.block) order.push(id);
        }

        // ── the booking app itself ──
        var booking = { mode: b.schedule === 'none' ? 'none' : b.schedule };
        var config = { label: b.cta || 'Book Now' };
        var setup = [{ key: 'label', label: 'Button text', type: 'text', def: b.cta || 'Book Now' }];
        var fields = [
            { key: 'customer', label: 'Name', type: 'text' },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'email', label: 'Email', type: 'text' }
        ];

        if (b.schedule === 'slots') {
            booking.slots = (b.slots || []).join(', ');
            booking.slot_capacity = b.slotCap || 1;
            config.slot_times = booking.slots;
            config.slot_capacity = String(b.slotCap || 1);
            setup.push({ key: 'slot_times', label: 'Times (comma-separated)', type: 'text', def: booking.slots });
            setup.push({ key: 'slot_capacity', label: 'Capacity per time', type: 'number', def: String(b.slotCap || 1) });
            fields.push({ key: 'date', label: 'Date', type: 'date' });
            fields.push({ key: 'time', label: 'Time', type: 'text' });
        } else if (b.schedule === 'range') {
            fields.push({ key: 'date', label: 'Check-in', type: 'date' });
            fields.push({ key: 'end_date', label: 'Check-out', type: 'date' });
        } else if (b.schedule === 'date') {
            fields.push({ key: 'date', label: 'Date', type: 'date' });
        }
        if (b.cutoff != null && b.schedule !== 'none') {
            booking.cutoff_hours = parseFloat(b.cutoff) || 0;
            config.cutoff_hours = String(booking.cutoff_hours);
            setup.push({ key: 'cutoff_hours', label: 'Stop online booking X hours before start', type: 'number', def: config.cutoff_hours });
        }
        if (b.maxParty) {
            booking.max_party = parseInt(b.maxParty, 10);
            config.max_party = String(booking.max_party);
            setup.push({ key: 'max_party', label: 'Max party size', type: 'number', def: config.max_party });
        }
        if (b.cancelHours != null) {
            config.cancel_hours = String(parseFloat(b.cancelHours) || 24);
            setup.push({ key: 'cancel_hours', label: 'Free cancellation up to X hours before', type: 'number', def: config.cancel_hours });
        }

        if (b.pricing === 'tiers' && (b.tiers || []).length) {
            var tiers = b.tiers.map(function (t, i) {
                var key = slugKey(t.label, i);
                var cfgKey = 'price_' + key;
                config[cfgKey] = String(parseFloat(t.price) || 0);
                setup.push({ key: cfgKey, label: t.label + ' price ($)', type: 'number', def: config[cfgKey] });
                fields.push({ key: key, label: t.label, type: 'number' });
                return { key: key, label: t.label, cfgPrice: cfgKey, def: parseFloat(t.price) || 0 };
            });
            booking.party = { seats: true, tiers: tiers };
        } else if (b.pricing === 'services') {
            fields.push({ key: 'service', label: 'Service', type: 'text' });
            fields.push({ key: 'guests', label: 'Party size', type: 'number' });
        } else if (b.pricing === 'units') {
            booking.resource = b.unitKey || 'fleet_items';
            fields.push({ key: 'guests', label: 'Party size', type: 'number' });
        } else {
            fields.push({ key: 'guests', label: 'Party size', type: 'number' });
        }

        booking.addons = 'addons';
        fields.push({ key: 'notes', label: 'Anything we should know?', type: 'textarea' });
        fields.push({ key: 'status', label: 'Status', type: 'select', options: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'] });

        add('booker', {
            id: 'booker',
            name: bizLabel || 'Bookings',
            icon: b.emoji || '📅',
            cat: 'booking',
            desc: 'Universal booking checkout',
            block: { title: b.cta || 'Book Now', sub: b.sub || 'Instant confirmation' },
            checkout: true,
            booking: booking,
            setup: setup,
            dataKey: 'bookings',
            fields: fields
        }, config, true);

        // ── services catalog (priced options) ──
        if (b.pricing === 'services') {
            add('services', {
                id: 'services', name: 'Services & Pricing', icon: '💼', cat: 'commerce',
                desc: 'What you offer, with prices', publicData: true,
                block: { title: 'Services & Pricing', sub: 'What we offer' },
                dataKey: 'services',
                fields: [
                    { key: 'name', label: 'Service', type: 'text' },
                    { key: 'price', label: 'Price ($)', type: 'number' },
                    { key: 'duration', label: 'Duration', type: 'text' },
                    { key: 'desc', label: 'Description', type: 'textarea' }
                ]
            }, {}, true);
        }

        // ── bookable units (per hour / day / night) ──
        if (b.pricing === 'units') {
            var uk = b.unitKey || 'fleet_items';
            add(uk === 'properties' ? 'properties' : 'fleet', {
                id: uk === 'properties' ? 'properties' : 'fleet',
                name: uk === 'properties' ? 'Properties & Units' : 'Fleet & Rentals',
                icon: uk === 'properties' ? '🏠' : '🚤', cat: 'commerce',
                desc: 'Bookable units and rates', publicData: true,
                dataKey: uk,
                fields: [
                    { key: 'name', label: 'Name', type: 'text' },
                    { key: 'rate_hourly', label: 'Hourly rate ($)', type: 'number' },
                    { key: 'rate_full', label: 'Day rate ($)', type: 'number' },
                    { key: 'rate_night', label: 'Nightly rate ($)', type: 'number' },
                    { key: 'capacity', label: 'Capacity (people)', type: 'number' },
                    { key: 'min_nights', label: 'Minimum nights', type: 'number' },
                    { key: 'url', label: 'Photo', type: 'image' },
                    { key: 'desc', label: 'Description', type: 'textarea' }
                ]
            }, {}, false);
        }

        // ── add-ons / upsells ──
        add('addons', {
            id: 'addons', name: 'Add-ons & Extras', icon: '➕', cat: 'commerce',
            desc: 'Upsells offered at checkout', publicData: true,
            dataKey: 'addons',
            fields: [
                { key: 'name', label: 'Add-on', type: 'text' },
                { key: 'price', label: 'Price ($)', type: 'number' },
                { key: 'per', label: 'Charged per', type: 'select', options: ['booking', 'person', 'day'] },
                { key: 'desc', label: 'Description', type: 'text' }
            ]
        }, {}, false);

        // ── waivers ──
        if (b.waiver) {
            add('waivers', {
                id: 'waivers', name: 'Digital Waivers', icon: '✍️', cat: 'booking',
                desc: 'Liability waivers signed from the confirmation text', provides: 'waivers',
                setup: [{ key: 'text', label: 'Waiver text', type: 'textarea', def: b.waiverText || 'I acknowledge the risks involved and release the business from liability.' }],
                dataKey: 'waivers',
                fields: [
                    { key: 'customer', label: 'Customer', type: 'text' },
                    { key: 'booking', label: 'Booking / trip', type: 'text' },
                    { key: 'date', label: 'Signed date', type: 'date' },
                    { key: 'status', label: 'Status', type: 'select', options: ['sent', 'signed'] }
                ]
            }, { text: b.waiverText || '' }, false);
        }

        // ── payments ──
        add('payments', {
            id: 'payments', name: 'Payments', icon: '💳', cat: 'connect',
            desc: 'Stripe — your money goes directly to you', provides: 'payments',
            setup: [
                { key: 'mode', label: 'Collect at booking', type: 'select', options: ['Full payment', 'Deposit only', 'No payment (pay on site)'], def: b.payMode || 'Full payment' },
                { key: 'deposit', label: 'Deposit %', type: 'number', def: String(b.deposit || 0) }
            ]
        }, { mode: b.payMode || 'Full payment', deposit: String(b.deposit || 0) }, false);

        // ── coupons ──
        add('coupons', {
            id: 'coupons', name: 'Coupons & Promos', icon: '🏷️', cat: 'grow',
            desc: 'Discount codes at checkout', provides: 'promos',
            dataKey: 'coupons',
            fields: [
                { key: 'code', label: 'Code', type: 'text' },
                { key: 'off', label: 'Discount (e.g. 10% or $15)', type: 'text' },
                { key: 'until', label: 'Valid until', type: 'date' }
            ]
        }, {}, false);

        // ── gallery ──
        add('gallery', {
            id: 'gallery', name: 'Photo Gallery', icon: '🖼️', cat: 'content',
            desc: 'Photos on your page', publicData: true,
            block: { title: 'Photos', sub: 'See it for yourself' },
            dataKey: 'photos',
            fields: [{ key: 'url', label: 'Photo', type: 'image' }, { key: 'caption', label: 'Caption', type: 'text' }]
        }, {}, true);

        // ── FAQs ──
        add('faq', {
            id: 'faq', name: 'FAQ', icon: '❓', cat: 'content',
            desc: 'Common questions, answered', publicData: true,
            block: { title: 'FAQ', sub: 'Good to know before you book' },
            dataKey: 'faqs',
            fields: [{ key: 'q', label: 'Question', type: 'text' }, { key: 'a', label: 'Answer', type: 'textarea' }]
        }, {}, true);

        // ── verified reviews ──
        add('reviews', {
            id: 'reviews', name: 'Verified Reviews', icon: '⭐', cat: 'grow',
            desc: 'Reviews from real completed bookings', publicData: true,
            block: { title: 'Reviews', sub: 'From verified bookings' },
            dataKey: 'reviews',
            fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'stars', label: 'Stars', type: 'number' }, { key: 'text', label: 'Review', type: 'textarea' }]
        }, {}, true);

        // ── availability / manual blocks ──
        add('availability', {
            id: 'availability', name: 'Availability & Blocks', icon: '📆', cat: 'booking',
            desc: 'Block dates and cap daily volume',
            setup: [{ key: 'capacity', label: 'Max bookings per day (blank = unlimited)', type: 'number', def: '' }],
            dataKey: 'blocks',
            fields: [
                { key: 'date', label: 'From', type: 'date' },
                { key: 'end_date', label: 'To (optional)', type: 'date' },
                { key: 'note', label: 'Note', type: 'text' }
            ]
        }, {}, false);

        return { installed: installed, page_order: order };
    }

    window.CB = {
        API: API,
        token: token, setToken: setToken, clearToken: clearToken,
        api: api, plat: plat,
        signup: signup, login: login,
        uploadImage: uploadImage,
        TEMPLATES: TEMPLATES,
        buildInstalls: buildInstalls,
        slugKey: slugKey,
        pageUrl: function (slug) { return location.origin + '/p/' + slug; },
        bookUrl: function (slug) { return location.origin + '/book/' + slug + '/booker'; },
        money: function (n) { return '$' + (Math.round(n * 100) / 100).toLocaleString(); },
        esc: function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    };
})();
