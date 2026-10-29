# RuangTugas — Next.js, MySQL Aiven, dan Vercel

RuangTugas adalah aplikasi pengelolaan tugas berbahasa Indonesia. Aplikasi ini
menyediakan CRUD tugas dan kategori, status, prioritas, pencarian, serta tenggat
waktu. Next.js menangani antarmuka dan API; data disimpan di MySQL Aiven.

## Fitur

- Buat, lihat, edit, dan hapus tugas.
- Kelola kategori dengan warna; kategori terhubung ke tugas melalui foreign key.
- Atur status (belum dikerjakan, sedang dikerjakan, selesai), prioritas, dan tenggat.
- Cari tugas dan filter berdasarkan status atau kategori.
- Tata letak responsif untuk desktop dan ponsel.

## Struktur data

- `task_categories` menyimpan nama dan warna kategori.
- `tasks` menyimpan tugas dan memiliki `category_id` yang mengacu ke
  `task_categories.id`. Relasi menggunakan `ON DELETE SET NULL`, jadi menghapus
  kategori tidak menghapus tugas.
- Definisi tabel dan kategori awal ada di [`schema.sql`](./schema.sql).
- Jika database yang sudah ada masih memakai tabel `categories` versi lama,
  jalankan [`migrate_existing_database.sql`](./migrate_existing_database.sql)
  satu kali sebagai gantinya. Migrasi ini menyalin kategori lama, menambahkan
  prioritas, dan memperbarui relasi kategori pada tugas.

## Menyiapkan database Aiven

1. Buat layanan MySQL di [Aiven](https://aiven.io) dan tunggu sampai statusnya
   **Running**.
2. Dari halaman layanan, catat host, port, user, password, dan nama database.
   Unduh CA certificate jika layanan mewajibkan TLS.
3. Jika ini database baru, jalankan `schema.sql` pada database Aiven
   menggunakan Aiven Query Editor atau klien MySQL. Untuk database lama yang
   sudah mempunyai `tasks` dengan foreign key ke `categories`, jalankan
   `migrate_existing_database.sql` satu kali sebagai gantinya:

   ```sh
   mysql --host=<HOST> --port=<PORT> --user=<USER> --password \
     --database=<DBNAME> < schema.sql
   ```

   Gunakan mode TLS yang diwajibkan konfigurasi layanan Aiven saat memakai klien
   MySQL.    Skrip skema membuat tabel baru dengan `CREATE TABLE IF NOT EXISTS`.
   Migrasi database lama adalah migrasi satu kali dan tidak untuk dijalankan
   ulang.

## Menjalankan secara lokal

1. Pasang dependensi: `npm install`.
2. Salin `.env.local.example` menjadi `.env.local`, lalu isi kredensial database.
3. Jika Aiven menyediakan CA certificate, encode isi `ca.pem` sebagai satu
   baris Base64 dan masukkan sebagai `DB_CA_CERT`:

   ```sh
   base64 -i ca.pem
   ```

4. Jalankan `npm run dev`, lalu buka <http://localhost:3000>.

Variabel yang dibutuhkan:

```text
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_CA_CERT=
```

`.env.local` hanya untuk lokal dan tidak boleh dimasukkan ke Git.

## Deploy ke Vercel

1. Push repository ke GitHub dan impor repository tersebut dari dashboard Vercel.
2. Pada **Project Settings → Environment Variables**, tambahkan keenam variabel
   database di atas untuk environment yang akan digunakan.
3. Pastikan host/database Aiven mengizinkan koneksi dari deployment Vercel dan
   konfigurasi TLS/CA certificate sesuai pengaturan layanan.
4. Deploy. Jalankan `schema.sql` pada Aiven satu kali sebelum menggunakan
   aplikasi. API berjalan sebagai Next.js Route Handlers di Vercel dan memakai
   koneksi database server-side.

Jangan pernah menaruh kredensial database di variabel `NEXT_PUBLIC_*` atau
mengunggah `.env.local`/sertifikat privat ke repository.

## API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET, POST | `/api/tasks` | Daftar dan membuat tugas |
| GET, PUT, DELETE | `/api/tasks/:id` | Detail, mengubah, dan menghapus tugas |
| GET, POST | `/api/categories` | Daftar dan membuat kategori |
| PUT, DELETE | `/api/categories/:id` | Mengubah dan menghapus kategori |

> **Catatan akses:** aplikasi ini belum memiliki login atau pembatasan pengguna.
> Siapa pun yang dapat mengakses URL deployment dapat mengubah data melalui UI
> maupun API. Tambahkan autentikasi/otorisasi sebelum memakai URL publik untuk
> data yang tidak boleh diubah oleh pengunjung lain.
