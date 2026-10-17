(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const ALL = "Semua";

  let works = [];
  let settings = {};
  let activeCat = ALL;
  let visible = []; // karya yang sedang tampil (setelah filter)
  let current = 0;  // indeks di viewer

  // Path gambar dari CMS diawali "/", dibuat relatif supaya jalan juga di subfolder.
  const src = (p) => String(p || "").replace(/^\/+/, "");

  async function getJSON(url) {
    const res = await fetch(url + "?v=" + Date.now());
    if (!res.ok) throw new Error(url + " gagal dimuat (" + res.status + ")");
    return res.json();
  }

  async function init() {
    try {
      const [w, s] = await Promise.all([
        getJSON("content/works.json"),
        getJSON("content/settings.json"),
      ]);
      works = (w.works || []).filter((x) => x && x.image);
      settings = s || {};
    } catch (err) {
      console.error(err);
    }
    renderSettings();
    renderFilters();
    renderGallery();
  }

  function renderSettings() {
    const name = settings.name || "Portofolio";
    document.title = name + " | Portofolio";
    $("#site-name").textContent = name;
    $("#brand").textContent = name;
    $("#site-tagline").textContent = settings.tagline || "";
    $("#site-about").textContent = settings.about || "";
    $("#site-about").hidden = !settings.about;

    const mail = $("#contact-email");
    if (settings.email) {
      mail.href = "mailto:" + settings.email;
      mail.textContent = settings.email;
    } else {
      mail.hidden = true;
    }

    const ig = $("#contact-ig");
    if (settings.instagram) {
      ig.href = settings.instagram;
      ig.textContent = "Instagram";
    } else {
      ig.hidden = true;
    }
  }

  // Filter berbentuk segmented control: "thumb" kaca bergeser ke kategori aktif.
  function moveThumb() {
    const box = $("#filters");
    const thumb = box.querySelector(".seg-thumb");
    const on = box.querySelector('.chip[aria-pressed="true"]');
    if (!thumb || !on) return;
    thumb.style.width = on.offsetWidth + "px";
    thumb.style.transform = "translateX(" + on.offsetLeft + "px)";
  }

  function renderFilters() {
    const box = $("#filters");
    box.textContent = "";
    box.classList.remove("ready");
    const cats = [...new Set(works.map((w) => (w.category || "").trim()).filter(Boolean))];
    if (cats.length < 2) {
      box.hidden = true;
      return;
    }
    box.hidden = false;

    const thumb = document.createElement("span");
    thumb.className = "seg-thumb";
    thumb.setAttribute("aria-hidden", "true");
    box.appendChild(thumb);

    [ALL, ...cats].forEach((cat) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = cat;
      b.setAttribute("aria-pressed", String(cat === activeCat));
      b.addEventListener("click", () => {
        if (cat === activeCat) return;
        activeCat = cat;
        box.querySelectorAll(".chip").forEach((c) =>
          c.setAttribute("aria-pressed", String(c === b))
        );
        moveThumb();
        b.scrollIntoView({ block: "nearest", inline: "nearest" });
        renderGallery();
      });
      box.appendChild(b);
    });

    // Posisikan thumb dulu tanpa animasi, baru aktifkan transisi.
    requestAnimationFrame(() => {
      moveThumb();
      requestAnimationFrame(() => box.classList.add("ready"));
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveThumb);
  }

  // Jumlah kolom mengikuti lebar layar. Karya dibagi bergiliran antar kolom
  // supaya urutan terbaca kiri ke kanan, sesuai urutan di CMS.
  const colCount = () => (window.innerWidth <= 560 ? 1 : window.innerWidth <= 900 ? 2 : 3);
  let lastCols = colCount();

  window.addEventListener("resize", () => {
    moveThumb();
    const n = colCount();
    if (n !== lastCols) {
      lastCols = n;
      renderGallery();
    }
  });

  function renderGallery() {
    const box = $("#gallery");
    box.textContent = "";
    visible = works.filter((w) => activeCat === ALL || (w.category || "").trim() === activeCat);
    $("#empty").hidden = visible.length > 0;

    const cols = Array.from({ length: colCount() }, () => {
      const c = document.createElement("div");
      c.className = "col";
      box.appendChild(c);
      return c;
    });

    visible.forEach((w, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.addEventListener("click", () => openViewer(i));

      const img = document.createElement("img");
      img.src = src(w.image);
      img.alt = w.title || "Karya desain";
      img.loading = "lazy";
      card.appendChild(img);

      const cap = document.createElement("div");
      cap.className = "cap";
      const t = document.createElement("strong");
      t.textContent = w.title || "";
      const m = document.createElement("span");
      m.textContent = [w.category, w.year].filter(Boolean).join(", ");
      cap.append(t, m);
      card.appendChild(cap);

      cols[i % cols.length].appendChild(card);
    });
  }

  /* ---------- Viewer ---------- */
  const viewer = $("#viewer");

  function showInViewer(i) {
    const n = visible.length;
    current = (i + n) % n;
    const w = visible[current];
    $("#v-img").src = src(w.image);
    $("#v-img").alt = w.title || "";
    $("#v-title").textContent = w.title || "";
    $("#v-meta").textContent = [w.category, w.year].filter(Boolean).join(", ");
    $("#v-desc").textContent = w.description || "";
    $("#v-desc").hidden = !w.description;
  }

  function openViewer(i) {
    showInViewer(i);
    if (!viewer.open) viewer.showModal();
  }

  $(".v-close").addEventListener("click", () => viewer.close());
  // Klik di area kosong (di luar gambar dan tombol) juga menutup viewer.
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) viewer.close();
  });
  $(".v-prev").addEventListener("click", () => showInViewer(current - 1));
  $(".v-next").addEventListener("click", () => showInViewer(current + 1));
  viewer.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showInViewer(current - 1);
    if (e.key === "ArrowRight") showInViewer(current + 1);
  });

  /* ---------- PDF ---------- */
  const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (window.jspdf) return resolve();
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Library PDF gagal dimuat. Cek koneksi internet."));
      document.head.appendChild(s);
    });
  }

  // jsPDF bawaan hanya mendukung karakter Latin-1, jadi tanda baca "pintar" diganti.
  const clean = (t) =>
    String(t || "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...");

  // Muat gambar, kecilkan ke maks 2000px, jadikan JPEG supaya ukuran PDF tetap wajar.
  function prepareImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const max = 2000;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: canvas.toDataURL("image/jpeg", 0.88), w, h });
      };
      img.onerror = () => reject(new Error("Gambar gagal dimuat: " + url));
      img.src = url;
    });
  }

  async function downloadPDF() {
    const btn = $("#pdf-btn");
    const lab = btn.querySelector(".btn-label");
    const label = lab.textContent;
    btn.disabled = true;

    try {
      lab.textContent = "Menyiapkan PDF...";
      await loadScript(JSPDF_URL);
      const { jsPDF } = window.jspdf;

      // A4 landscape, satuan mm
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const M = 14;

      // Halaman sampul
      doc.setFont("helvetica", "bold");
      doc.setFontSize(44);
      doc.text(clean(settings.name || "Portofolio"), M, PH / 2 - 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      if (settings.tagline) {
        doc.text(doc.splitTextToSize(clean(settings.tagline), PW - M * 2), M, PH / 2 + 6);
      }
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(String(new Date().getFullYear()), M, PH - M);
      doc.setTextColor(0);

      // Satu karya per halaman
      for (let i = 0; i < works.length; i++) {
        const w = works[i];
        lab.textContent = "Menyiapkan PDF... " + (i + 1) + "/" + works.length;

        let img;
        try {
          img = await prepareImage(src(w.image));
        } catch (e) {
          console.warn(e);
          continue; // lewati gambar yang gagal dimuat
        }

        doc.addPage();
        const capH = 26;
        const boxW = PW - M * 2;
        const boxH = PH - M * 2 - capH;
        const ratio = Math.min(boxW / img.w, boxH / img.h);
        const dw = img.w * ratio;
        const dh = img.h * ratio;
        doc.addImage(img.data, "JPEG", M + (boxW - dw) / 2, M + (boxH - dh) / 2, dw, dh);

        const y = PH - M - capH + 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(clean(w.title), M, y);

        const meta = clean([w.category, w.year].filter(Boolean).join(", "));
        if (meta) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(110);
          doc.text(meta, PW - M, y, { align: "right" });
          doc.setTextColor(0);
        }

        if (w.description) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(clean(w.description), boxW).slice(0, 2);
          doc.text(lines, M, y + 7);
        }
      }

      // Halaman kontak
      if (settings.email || settings.instagram) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.text("Kontak", M, PH / 2 - 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        let cy = PH / 2 + 4;
        if (settings.email) { doc.text(clean(settings.email), M, cy); cy += 9; }
        if (settings.instagram) doc.text(clean(settings.instagram), M, cy);
      }

      const slug = clean(settings.name || "portofolio")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      doc.save("portofolio-" + (slug || "desain") + ".pdf");
    } catch (err) {
      console.error(err);
      alert("PDF gagal dibuat: " + err.message);
    } finally {
      lab.textContent = label;
      btn.disabled = false;
    }
  }

  $("#pdf-btn").addEventListener("click", downloadPDF);

  init();
})();