# DIT Tracker

A full-stack student handout tracking and financial management platform built for educational institutions. Features mobile-first PWA, automated invoicing, group-based operations, and AI-powered document validation.

**Live Site:** [https://dit-tracker.vercel.app](https://dit-tracker.vercel.app)
**API Docs:** [https://dit-l200-api.onrender.com/docs](https://dit-l200-api.onrender.com/docs)

---

## Monorepo Structure

This repository uses a single-repo architecture containing both backend and frontend code. All application logic lives inside the `dit-forms/` directory.

```text
dit-tracker/
├── dit-forms/                # MAIN APPLICATION CODE
│   ├── app/                  # FastAPI Backend (Python 3.11)
│   │   ├── models/           # Beanie ODM Models (Student, Group, HandoutOrder)
│   │   ├── routers/          # API Endpoints (Auth, Forms, Payments, Groups)
│   │   ├── services/         # Business Logic (Cloudinary, Email, Invoicing)
│   │   └── scripts/          # Migration & E2E Test Scripts
│   ├── frontend/             # Vanilla HTML/CSS/JS Frontend
│   │   ├── admin/            # Admin Dashboard Pages
│   │   ├── public/           # Public Form Submission
│   │   └── assets/           # CSS, JS (API client, Auth, Utils)
│   ├── frontend-react/       # React + Vite Frontend (Bun)
│   │   ├── src/              # Components, Pages, Zustand Stores
│   │   ├── public/           # PWA Manifest, Icons, SW
│   │   └── vite.config.ts    # Build Config + Sentry Plugin
│   ├── Dockerfile            # Backend Multi-stage Build
│   └── docker-compose.yml    # Local Dev Stack
├── docs/                     # User Guides & Ops Runbooks
└── vercel.json               # Vercel Deployment Config
```

> **Important:** The root directory contains only configuration files. **Do not place application code outside `dit-forms/`.** Sensitive data files (Excel lists, PDFs) must NEVER be committed here.

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+ & Bun 1.0+
- MongoDB Atlas URI (or local MongoDB)
- Cloudinary Account (Free Tier)

### 1. Backend Setup
```bash
cd dit-forms
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create .env from template
cp .env.production.example .env
# Edit .env with your MONGO_URI, JWT_SECRET, CLOUDINARY_* keys

# Start Server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (Vanilla)
```bash
cd dit-forms/frontend
python -m http.server 3000
# Open http://localhost:3000
```

### 3. Frontend Setup (React)
```bash
cd dit-forms/frontend-react
bun install

# Create .env.local
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# Start Dev Server
bun run dev
```

---

## Deployment Architecture

| Component | Platform | Trigger | Notes |
|-----------|----------|---------|-------|
| **Frontend** | Vercel | Push to `master` | Static files from `dit-forms/frontend` |
| **Backend** | Render | Push to `master` | Docker build from `dit-forms/Dockerfile` |
| **Database** | MongoDB Atlas | Manual | Production cluster with daily backups |
| **File Storage** | Cloudinary | Runtime | Auto-crop + AI validation for IC cards |
| **Monitoring** | Sentry | Runtime | Real-time error tracking + session replay |

### Environment Variables
All secrets are managed via platform dashboards. **Never commit `.env` files.**

- **Vercel:** `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`
- **Render:** `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `SENTRY_DSN`, `SMTP_*`
- **GitHub Actions:** `PROD_SSH_KEY`, `GHCR_PAT`, `SENTRY_AUTH_TOKEN`

---

## Key Features

- **Group Operations:** Tag-based student grouping with bulk assignment & filtering
- **Auto-Invoicing:** Sequential invoice numbers (INV-{term}-{seq}) + PDF generation
- **AI Document Validation:** Cloudinary face detection + smart cropping for ID cards
- **Mobile PWA:** Offline-capable, haptic feedback, standalone mode
- **RBAC Security:** Admin vs Class Rep scopes enforced on every endpoint
- **Proactive Monitoring:** Automated usage alerts for Cloudinary free tier limits

---

## Documentation

- [Class Rep Quick Start Guide](docs/class-rep-quick-start.md)
- [Admin Troubleshooting Runbook](docs/admin-troubleshooting-runbook.md)
- [Launch Announcement](docs/launch-announcement.md)
- [Sentry Setup Guide](docs/sentry-setup.md)
- [API Reference](https://dit-l200-api.onrender.com/docs)

---

## Security & Compliance

- **Data Privacy:** Student IC documents stored with signed URLs (1hr expiry)
- **Audit Trail:** All payments record user ID; all form publishes record timestamp
- **Secret Management:** Zero hardcoded credentials; all injected via env vars
- **Backup Strategy:** Daily MongoDB dumps retained for 7 days

---

## Contributing

1. Create feature branch from `master`
2. Make changes in `dit-forms/` subfolder
3. Run E2E tests locally before pushing
4. Submit PR -> CI runs automatically -> Merge to `master` triggers deploy

For questions, contact info@joyadevu.link or open an Issue.
