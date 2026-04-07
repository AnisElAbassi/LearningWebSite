# NEXUS HQ — VR Operations Dashboard

Full-stack internal operations dashboard for a VR Team Building company.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb vr_ops

# Or via psql
psql -c "CREATE DATABASE vr_ops;"
```

### 2. Backend
```bash
cd backend
cp .env .env.local  # Edit DATABASE_URL if needed
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

### Default Login
- **Email:** admin@nexushq.io
- **Password:** admin123

## Tech Stack
- **Frontend:** React 18 + Tailwind CSS + Framer Motion + FullCalendar + Chart.js + Redux Toolkit
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL
- **Auth:** JWT with role-based permissions

## Architecture
```
backend/
  src/
    routes/          # 18 REST API route files
    middleware/       # Auth + permissions
  prisma/
    schema.prisma    # 30+ models
    seed.js          # Roles, permissions, lookups, admin user

frontend/
  src/
    components/      # Layout (Sidebar, TopBar, Modal, StatusBadge)
    pages/           # 17 full page components
    store/           # Redux (auth, UI state)
    hooks/           # useApi, useMutation, useLookup
    utils/           # Axios API client
    styles/          # Tailwind + glassmorphism + neon effects
```

## Modules
1. **Dashboard** — KPIs, today's events, hardware status, revenue charts, alerts
2. **Calendar** — FullCalendar with smart slot suggestions
3. **Events** — CRUD, conflict detection, hardware reservation, operator checklist
4. **Clients** — CRM with custom fields, deal pipeline, event history
5. **Experiences** — Library with tags, variants, hardware requirements
6. **Hardware** — Dynamic types, serialized/quantity tracking, availability checks
7. **Totems** — Registry, remote status, content management, reservations
8. **Deals** — Pipeline view, package builder, line items, invoice tracking
9. **Cost Analytics** — P&L, margin analysis, experience/client profitability
10. **Users & Roles** — Dynamic roles, custom permissions, staff rates
11. **Maintenance** — Issue tracking, resolution workflow, due alerts
12. **Settings** — Company config, lookup management, custom fields, blackout dates, CSV export
13. **Activity Log** — Full audit trail with filters
14. **Notifications** — Bell icon, real-time polling, read/unread
