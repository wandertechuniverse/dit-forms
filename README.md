# DIT Tracker

Full-stack student handout tracking platform with AI document validation, group operations, and financial management.

**Live Site:** [https://dit-tracker.vercel.app](https://dit-tracker.vercel.app)
**API Docs:** [https://dit-forms-api.onrender.com/docs](https://dit-forms-api.onrender.com/docs)

---

## Monorepo Structure

```text
dit-forms/
├── app/                  # FastAPI Backend (Python 3.11)
│   ├── models/           # Beanie ODM Models
│   ├── routers/          # API Endpoints
│   ├── services/         # Business Logic (Cloudinary, Groups, Invoicing)
│   └── scripts/          # E2E Tests, Migrations, Seeders
├── frontend-react/       # React + Vite Frontend (Bun)
│   ├── src/              # Components, Pages, Zustand Stores
│   ├── public/           # PWA Manifest, Icons
│   └── vite.config.ts    # Build Config + Sentry Plugin
├── tests/                # Parity Test Suites (Upload, Schema, Payment)
├── .github/workflows/    # CI/CD Pipelines
├── vercel.json           # Vercel Deployment Config
└── requirements.txt      # Python Dependencies
```

---

## Local Development

### Backend
```bash
cd dit-forms
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd dit-forms/frontend-react
bun install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
bun run dev
```

---

## Validation Parity

29 tests across 4 domains ensure frontend/backend error messages match:
- **File Uploads:** 9 tests (type, size, UUID validation)
- **Form Schemas:** 9 tests (labels, keys, field counts, types)
- **Payments:** 11 tests (amount, currency, method, overpayment)

CI blocks merges if parity drifts. Run locally:
```bash
pytest tests/ -v --tb=short
```

---

## Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| Frontend | Vercel | Push to `master` |
| Backend | Render | Push to `master` |
| Database | MongoDB Atlas | Manual |
| File Storage | Cloudinary | Runtime |

---

## Security

- Student IC documents stored with signed URLs (1hr expiry)
- Validation enforced client-side (Zod) AND server-side (Pydantic)
- Zero hardcoded credentials; secrets via environment variables
- RBAC scopes enforced on every endpoint
