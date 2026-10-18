/* ==========================================================
   Pintu admin.
   Catatan jujur: ini hanya "pintu depan" yang menyembunyikan jalan
   ke /admin. Karena situs ini statis, siapa pun yang membaca kodenya
   bisa melihat data kuncinya (walau berupa hash, bukan jawaban asli).
   Pengaman yang sebenarnya adalah login GitHub di halaman /admin.
   ========================================================== */
(() => {
  "use strict";

  const enc = new TextEncoder();
  const toHex = (buf) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const fromHex = (hex) =>
    new Uint8Array((hex.match(/../g) || []).map((h) => parseInt(h, 16)));

  const supported = !!(window.crypto && window.crypto.subtle);

  // Samakan cara menulis jawaban: abaikan huruf besar/kecil, aksen, tanda baca, spasi ganda.
  function normalize(mode, text) {
    const s = String(text || "");
    if (mode === "pin") return s.replace(/\D/g, "");
    return s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // PBKDF2 (SHA-256, 200 ribu putaran): sengaja lambat supaya menebak lewat komputer jadi mahal.
  async function derive(mode, text, saltHex, iterations) {
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(normalize(mode, text)),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations },
      key,
      256
    );
    return toHex(bits);
  }

  async function create(mode, question, text, iterations = 200000) {
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    return { mode, question, salt, iterations, hash: await derive(mode, text, salt, iterations) };
  }

  async function verify(cfg, text) {
    return (await derive(cfg.mode, text, cfg.salt, cfg.iterations)) === cfg.hash;
  }

  window.Gate = { supported, normalize, create, verify };

  /* ---------- Tampilan pintu (hanya di halaman utama) ---------- */
  const $ = (s) => document.querySelector(s);
  const openBtn = $("#admin-btn");
  if (!openBtn) return;

  const ADMIN_URL = "admin/";
  const dlg = $("#gate");
  const card = $(".gate-card");
  const form = $("#gate-form");
  const input = $("#gate-input");
  const pin = $("#gate-pin");
  const dots = $("#gate-dots");
  const goBtn = $("#gate-go");
  const msg = $("#gate-msg");

  let cfg = null;
  let fails = 0;
  let lockedUntil = 0;
  let busy = false;

  const go = () => { location.href = ADMIN_URL; };

  async function loadCfg() {
    if (cfg) return cfg;
    try {
      const res = await fetch("content/gate.json?v=" + Date.now());
      cfg = res.ok ? await res.json() : { mode: "off" };
    } catch (err) {
      cfg = { mode: "off" };
    }
    return cfg;
  }

  function updateDots() {
    dots.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("on", i < pin.value.length));
  }

  function openGate(c) {
    const isPin = c.mode === "pin";
    card.classList.remove("open", "shake");
    msg.textContent = supported ? "" : "Kunci butuh alamat https atau localhost.";
    input.value = "";
    pin.value = "";
    updateDots();
    $("#gate-q").textContent = c.question || (isPin ? "Masukkan passkey 6 digit." : "Jawab pertanyaan ini.");
    input.hidden = isPin;
    dots.hidden = !isPin;
    goBtn.hidden = isPin;
    dlg.showModal();
    (isPin ? pin : input).focus();
  }

  openBtn.addEventListener("click", async () => {
    let unlocked = false;
    try { unlocked = sessionStorage.getItem("admin-ok") === "1"; } catch (e) { /* abaikan */ }
    if (unlocked) return go();
    const c = await loadCfg();
    if (!c || c.mode === "off" || !c.hash) return go(); // kunci belum diatur
    openGate(c);
  });

  async function submit() {
    if (busy || !cfg) return;
    if (Date.now() < lockedUntil) {
      msg.textContent = "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
      return;
    }
    const value = cfg.mode === "pin" ? pin.value : input.value;
    if (!value.trim()) return;
    if (!supported) {
      msg.textContent = "Kunci butuh alamat https atau localhost.";
      return;
    }

    busy = true;
    goBtn.disabled = true;
    let ok = false;
    try {
      ok = await verify(cfg, value);
    } catch (err) {
      msg.textContent = "Kunci tidak bisa diperiksa di browser ini.";
      busy = false;
      goBtn.disabled = false;
      return;
    }
    busy = false;
    goBtn.disabled = false;

    if (ok) {
      msg.textContent = "";
      card.classList.add("open");
      try { sessionStorage.setItem("admin-ok", "1"); } catch (e) { /* abaikan */ }
      setTimeout(go, 550);
      return;
    }

    fails += 1;
    card.classList.remove("shake");
    void card.offsetWidth; // mulai ulang animasi goyang
    card.classList.add("shake");
    msg.textContent = cfg.mode === "pin" ? "Passkey salah." : "Jawabannya belum tepat.";
    pin.value = "";
    updateDots();
    if (fails >= 5) {
      fails = 0;
      lockedUntil = Date.now() + 30000;
      msg.textContent = "Terlalu banyak percobaan. Coba lagi 30 detik lagi.";
    }
    (cfg.mode === "pin" ? pin : input).focus();
  }

  pin.addEventListener("input", () => {
    pin.value = pin.value.replace(/\D/g, "").slice(0, 6);
    updateDots();
    if (pin.value.length === 6) submit();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit();
  });

  $(".gate-x").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
})();
