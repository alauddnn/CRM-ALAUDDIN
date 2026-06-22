# CRM-ALAUDDIN

Technical Test Fullstack - Solusi Klik

## Tech Stack

Frontend:
- Next.js
- Tailwind CSS

Backend:
- NestJS
- Prisma ORM

Database:
- PostgreSQL

## Installation

### Backend

cd nest-backend

npm install

Buat file .env

DATABASE_URL="postgresql://postgres:password@localhost:5432/sinergi_crm_db"

Jalankan migrasi:

npx prisma db push

Start backend:

npm run start:dev

Backend berjalan di:
http://localhost:3333

### Frontend

cd next-frontend

npm install

npm run dev

Frontend berjalan di:
http://localhost:3000

## Fitur Selesai

- Authentication & Role Management
- CRUD Lead
- Search Lead
- Filter Status
- Pagination
- Convert Lead ke SPK
- Approval/Rejection SPK oleh Finance
- Activity Log / Riwayat Status
- Backend Role Authorization

## Role

Admin
- Manage Users
- Manage Leads
- Manage SPK

Sales
- Create/Edit Lead
- Convert Lead ke SPK
- Kirim SPK ke Finance

Finance
- Approve / Reject SPK
- Memberikan Catatan Verifikasi

## Repository

https://github.com/alauddnn/CRM-ALAUDDIN
"# CRM-alauddin1" 
