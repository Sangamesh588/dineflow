# DineFlow – Multi-Tenant Restaurant SaaS Platform

DineFlow is a modern, production-grade multi-tenant SaaS platform for restaurants, cafes, and hospitality businesses. It provides digital QR & NFC contact-free ordering, live kitchen display systems (KDS), table management, role-based access control, billing with Razorpay, and a Super Admin platform management center.

---

## 🚀 Key Features

* **📱 Contactless QR & NFC Ordering**: Diners scan table QR codes to browse responsive digital menus, filter dietary preferences, and place orders directly.
* **⚡ Live Kitchen Display System (KDS)**: Real-time ticket management with visual timers and audio chimes powered by Supabase Realtime and Web Audio API.
* **🛡️ Role-Based Access Control**:
  * **Super Admin**: Tenant provisioning, subscription plan tracking, MRR analytics, owner directories, and platform controls.
  * **Restaurant Owner**: Complete operational oversight, staff invitation, table management, menu editing, and billing.
  * **Manager / Cashier / Staff**: Role-tailored dashboards and permissions.
  * **Customer**: Public responsive digital menus and live order tracking.
* **💳 Payments & Billing**: Seamless payments via Razorpay integration, automated tax/GST calculation, discount coupons, and itemized billing.
* **🔒 Production Security**: Supabase Row Level Security (RLS), cryptographic password generation, mandatory first-login password updates, and immutable audit logs.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 15 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS & shadcn/ui
* **Database & Auth**: Supabase PostgreSQL, Supabase SSR Auth, Realtime & Storage
* **Icons**: Lucide React
* **Payments**: Razorpay
* **Deployment**: Vercel

---

## 🏁 Getting Started

### 1. Prerequisites
* Node.js 18+
* Supabase project

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SECRET_KEY=your-supabase-service-role-secret-key

# Razorpay (Optional for live billing)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### 3. Database Schema
Apply SQL migrations from `supabase/migrations/` sequentially in your Supabase SQL Editor.

### 4. Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📜 License
Private & Proprietary. All rights reserved.
