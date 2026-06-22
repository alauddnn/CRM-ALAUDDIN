# Panduan Instalasi Lokal - Sinergi CRM (Next.js + NestJS + PostgreSQL)

Selamat! Project **Sinergi CRM** Anda telah dikonfigurasi menggunakan standar arsitektur modern berskala enterprise. Aplikasi ini dibuat khusus untuk memisahkan logika front-end dan back-end secara rapi.

Berikut adalah panduan lengkap langkah-demi-langkah (dari nol) untuk menjalankan seluruh kode ini di komputer pribadi Anda (localhost) menggunakan **Visual Studio Code**.

---

## 🏗️ Struktur Folder Utama
Setelah mengunduh file `.zip` dan mengekstraknya, Anda akan melihat struktur folder utama sebagai berikut:
* **`/next-frontend`**: Project Frontend berbasis **Next.js (App Router)** dan **Tailwind CSS**.
* **`/nest-backend`**: Project Backend berbasis **NestJS** dengan integrasi **Prisma ORM** & **PostgreSQL**.

---

## 🛠️ Langkah-Langkah Persiapan (Prerequisites)

Sebelum mulai, pastikan komputer Anda telah menginstal 3 software utama berikut:
1. **Node.js** (Rekomendasi versi LTS 18 atau 20) -> [Download Node.js](https://nodejs.org/)
2. **PostgreSQL** -> [Download PostgreSQL](https://www.postgresql.org/download/)
   * Saat instalasi PostgreSQL, Anda akan diminta membuat password untuk user bawaan `postgres`. **Catat password ini baik-baik!**
3. **Visual Studio Code (VS Code)** -> [Download VS Code](https://code.visualstudio.com/)

---

## 🚀 Langkah 1: Setup Database PostgreSQL Lokal

1. Buka aplikasi **pgAdmin** (aplikasi database bawaan setelah menginstal PostgreSQL) atau gunakan terminal psql.
2. Hubungkan ke server PostgreSQL lokal Anda.
3. Klik kanan di bagian **Databases** -> Pilih **Create** -> **Database...**
4. Isi nama database baru Anda dengan: `sinergi_crm_db`
5. Klik **Save**. Database kosong Anda sekarang sudah aktif dan siap digunakan.

---

## 🚀 Langkah 2: Membuka Project di VS Code

1. Ekstrak file `.zip` project yang Anda unduh dari AI Studio.
2. Buka aplikasi **VS Code**.
3. Klik **File** -> **Open Folder...** -> Pilih folder utama hasil ekstrak tadi (folder yang berisi `next-frontend` dan `nest-backend`).
4. Buka terminal baru di VS Code melalui menu **Terminal** -> **New Terminal**.

---

## 🚀 Langkah 3: Setup & Jalankan NestJS Backend `/nest-backend`

Kita perlu menyalakan backend terlebih dahulu agar database terbuat dan siap melayani permintaan API dari Frontend.

> [!CAUTION]
> ### ⚠️ PENTING: PERSYARATAN FILE `.env` (HARUS DI DALAM FOLDER NEST-BACKEND!)
> * **Kesalahan Umum:** Meletakkan file `.env` di folder root utama (`sinergi-crm/`). Ini akan mengakibatkan error **"Environment variable not found: DATABASE_URL"** saat menjalankan perintah Prisma.
> * **Solusinya:** File `.env` **WAJIB** berada langsung di dalam folder **`nest-backend/`** (satu level dengan `package.json` backend).
> 
> *Struktur letak file `.env` yang benar:*
> ```text
> 📁 sinergi-crm (root folder)
>   📁 next-frontend
>   📁 nest-backend
>     📄 .env  <--- (LETAKKAN DI SINI!)
>     📄 package.json
>     📁 prisma
>     📁 src
> ```

> [!TIP]
> ### 💡 TSCONFIG & NEST-CLI TELAH DIPERBAIKI (SIAP JALAN!)
> Kami telah menyertakan konfigurasi typescript penting berikut di dalam project:
> * `tsconfig.json` di dalam `/nest-backend`
> * `tsconfig.build.json` di dalam `/nest-backend`
> * `nest-cli.json` di dalam `/nest-backend`
>
> Jadi Anda **tinggal menjalankan** perintah build atau dev di bawah tanpa khawatir menemukan error typescript config file lagi!

1. **Masuk ke folder backend** di terminal VS Code:
   ```bash
   cd nest-backend
   ```

2. **Instal seluruh dependencies (library) backend**:
   ```bash
   npm install
   ```

3. **Buat file konfigurasi `.env`** di dalam folder `nest-backend` dengan format berikut:
   ```env
   DATABASE_URL="postgresql://postgres:PASSWORD_POSTGRES_ANDA@localhost:5432/sinergi_crm_db?schema=public"
   PORT=3333
   ```
   * *Catatan:* Gantilah `PASSWORD_POSTGRES_ANDA` dengan password PostgreSQL yang bapak buat saat menginstal PostgreSQL pertama kali.
   * *Catatan Port:* Port SQL default untuk PostgreSQL adalah `5432`. Sesuaikan port `5432` jika instalasi database PostgreSQL lokal bapak menggunakan port custom lainnya (misalnya `5433`).

4. **Lakukan Migrasi Database dengan Prisma**:
   Prisma akan otomatis membaca skema table (`schema.prisma`) dan membuat struktur tabel yang diperlukan langsung ke dalam PostgreSQL Anda secara otomatis! Berjalanlah perintah berikut:
   ```bash
   npx prisma db push
   ```
   *(Perintah ini akan membuat tabel `users`, `leads`, `spks`, dan `activity_logs` beserta relasinya secara instan di PostgreSQL lokal Anda tanpa perlu coding SQL manual).*

5. **Jalankan Seed Data** (Opsional - untuk mengisi data dummy awal):
   Anda bisa menggunakan Prisma Studio untuk melihat data atau mengisi data awal langsung dengan menjalankan:
   ```bash
   npx prisma studio
   ```
   *(Prisma Studio akan terbuka di browser Anda pada alamat `http://localhost:5555`, di sini Anda dapat menambahkan user Admin, Sales, atau Finance pertama Anda dengan aman!).*

6. **Nyalakan Server NestJS**:
   ```bash
   npm run start:dev
   ```
   *Backend NestJS Anda sekarang aktif & mendengarkan di port `3333` (`http://localhost:3333`).*

---

## 🚀 Langkah 4: Setup & Jalankan Next.js Frontend `/next-frontend`

Setelah backend siap, sekarang saatnya kita menyalakan halaman antarmuka (portal user).

1. **Buka terminal baru di VS Code** (klik tombol `+` pada panel terminal VS Code Anda).
2. **Masuk ke folder frontend**:
   ```bash
   cd next-frontend
   ```

3. **Instal seluruh dependencies (library) frontend**:
   ```bash
   npm install
   ```

4. **Nyalakan Server Next.js**:
   ```bash
   npm run dev
   ```
   *Frontend Next.js Anda kini telah berjalan sempurna!*

5. **Buka Browser Anda** dan akses alamat berikut:
   ```text
   http://localhost:3000
   ```

---

## 💡 Tips untuk Memukau Validator / Tester Anda saat Menguji Aplikasi:
* **Workflow Sempurna:** Tunjukkan skenario di mana divisi **Sales** mendaftarkan Leads Baru, lalu menerbitkannya menjadi **Surat Perintah Kerja (SPK)**. Tunjukkan juga bahwa SPK tersebut masuk ke antrean persetujuan divisi **Finance** dan statusnya berubah menjadi **WON** setelah disetujui, dan terekam di **PostgreSQL Audit Trail Log**.
* **Clean Code:** Struktur file sudah dipisah ke dalam folder `/src/app` (Next.js UI) dan backend NestJS controllers.
* **Integrasi Database:** Integrasi menggunakan Prisma ORM membuktikan Anda dapat membuat pola arsitektur backend TypeScript yang bersih dan modern.

Semoga berhasil dalam proses rekrutmen ini! Kami yakin Anda pasti bisa mengesankan validator dengan hasil setup profesional ini!
"# CRM-ALAUDDIN" 
"# CRM-ALAUDDIN" 
