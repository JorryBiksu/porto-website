# Website Portofolio Desain

Galeri dinamis dengan halaman admin (`/admin`) untuk upload karya dan mengatur urutan, plus tombol **Unduh PDF**. Gratis di GitHub + Netlify.

## Isi project

- `index.html`, `style.css`, `app.js`: website publik
- `content/works.json`: daftar karya (diedit lewat admin)
- `content/settings.json`: nama, tagline, tentang, kontak (diedit lewat admin)
- `images/uploads/`: tempat gambar yang kamu upload
- `admin/`: halaman CMS (Decap CMS)

## Setup (sekali saja, sekitar 15 menit)

### 1. Taruh di GitHub
1. Buat akun di github.com, lalu buat repository baru (misalnya `portofolio`), public atau private.
2. Upload semua isi folder ini ke repository (tombol *Add file > Upload files*).
3. Buka `admin/config.yml`, ganti `USERNAME/NAMA-REPO` dengan repo kamu (contoh: `budi/portofolio`). Pastikan nama branch sesuai (`main`).

### 2. Deploy di Netlify
1. Daftar di netlify.com dengan akun GitHub.
2. *Add new site > Import an existing project > GitHub*, pilih repo kamu.
3. Build command dikosongkan, publish directory diisi `.` (titik). Klik Deploy.
4. Kamu akan dapat alamat seperti `nama-kamu.netlify.app`. Nama bisa diganti di *Site configuration > Change site name*.

### 3. Aktifkan login admin (GitHub OAuth)
1. Di GitHub: *Settings > Developer settings > OAuth Apps > New OAuth App*.
   - Homepage URL: alamat website Netlify kamu
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Setelah dibuat, salin **Client ID** dan buat **Client Secret**.
3. Di Netlify: *Site configuration > Access & security > OAuth > Install provider > GitHub*, lalu tempel Client ID dan Client Secret.

### 4. Pakai
1. Buka `alamat-websitemu.netlify.app/admin/` dan login dengan GitHub.
2. Menu **Konten Website > Karya**: tambah karya, upload gambar, isi judul, kategori, tahun, deskripsi. **Geser item di daftar untuk mengatur urutan galeri.**
3. Klik **Publish**. Website ter-update otomatis dalam sekitar 1 menit.
4. Tombol **Unduh PDF** di website membuat PDF dari semua karya yang ada saat itu (sampul, satu karya per halaman, halaman kontak).

## Tips

- Ukuran gambar: sebaiknya di bawah 2 MB per file, lebar 1600-2400 px. PDF otomatis memperkecil gambar ke maksimal 2000 px.
- Tulis kategori persis sama (huruf besar/kecil) supaya filter di galeri mengelompokkan dengan benar.
- Mau pakai domain sendiri? Bisa diatur di Netlify (*Domain management*), domain-nya berbayar, tapi alamat `.netlify.app` tetap gratis.

## Coba di komputer sendiri (opsional)

```
npx decap-server        # terminal 1
npx serve .             # terminal 2, lalu buka /admin/
```
