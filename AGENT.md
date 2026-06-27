# DIT Forms — Agent Instructions

This file tells the coding agent how to work within the **DIT Forms** project. Read it before making any changes.

---

## Project Overview

DIT Forms is a web application for managing:
- Admin-created, version-controlled **editable forms**
- **Anonymous student submissions** (no student login)
- **HandOuts Tracker** with automatic invoice generation
- **RBAC-controlled file storage** via Cloudflare R2

**Stack:** FastAPI (Python) · MongoDB (`motor`) · Cloudflare R2 · HTML/CSS/JS frontend · JWT auth

---

## Repository Layout (Target Structure)

```
dit-forms/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Settings (env vars via pydantic-settings)
│   ├── database.py              # Motor MongoDB client
│   ├── auth/
│   │   ├── router.py            # POST /auth/login, GET /auth/me
│   │   ├── dependencies.py      # get_current_user, require_admin, require_admin_or_rep
│   │   └── jwt.py               # Token create / verify helpers
│   ├── students/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   └── service.py
│   ├── forms/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   └── service.py
│   ├── submissions/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   └── service.py
│   ├── files/
│   │   ├── router.py
│   │   └── r2.py                # boto3 R2 helpers (presign upload/download)
│   ├── handouts/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   └── service.py           # auto-creates handout_orders on submit
│   ├── payments/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   └── service.py
│   └── tests/
│       └── ...
├── frontend/
│   ├── login.html
│   ├── admin/
│   │   ├── dashboard.html
│   │   ├── students.html
│   │   ├── forms.html
│   │   ├── form-builder.html
│   │   ├── submissions.html
│   │   ├── submission-detail.html
│   │   ├── handout-orders.html
│   │   └── payments.html
│   └── public/
│       └── submit-form.html
├── .env.example
├── requirements.txt
├── AGENT.md                     # ← you are here
└── SKILL.md
```

---

## Rules the Agent Must Follow

### 1. Never Break Immutable Form Versions
Editing a form **always** creates a new `form_version` document. Never overwrite an existing version's `schema` field. Submissions must always reference the exact `formVersionId` they were submitted against.

### 2. RBAC is Mandatory on Every Protected Endpoint
- Use FastAPI `Depends(require_admin)` or `Depends(require_admin_or_rep)` on every non-public route.
- Class-rep scope enforcement (checking `{ programClassId, termId }` against their `assignedClassTerms`) must happen **inside the dependency or service layer**, not in the router handler.
- Never skip RBAC on file download endpoints.

### 3. HandOuts Tracker Auto-Invoice on Submit
When a HandOuts Tracker form is submitted:
1. Run duplicate check per `(studentId, termId, courseId)` — reject if duplicate within same term.
2. Create exactly one `handout_orders` document with embedded `invoice` and `lines`.
3. Do **not** create a separate invoices collection — invoice data lives inside `handout_orders`.

### 4. Student Match is Best-Effort
On every submission:
- Always snapshot `fullNameSnapshot` and `idNumberSnapshot`.
- Attempt to resolve `matchedStudentId`; set to `null` if not found.
- Never reject a submission solely because the student wasn't found.

### 5. Secrets Must Come from Environment Variables
Never hardcode secrets. All sensitive config (MongoDB URI, JWT secret, R2 credentials) must be read from environment variables via `pydantic-settings` in `config.py`.

### 6. File Uploads Go to R2 via Presigned URLs
The backend never receives the raw file bytes for uploads — it returns a presigned URL and the browser uploads directly. After upload, the client confirms to the backend which then stores metadata in `submission_files`.

---

## MongoDB Conventions

- Use `motor.motor_asyncio.AsyncIOMotorClient`
- Collection names (snake_case): `users`, `students`, `form_definitions`, `form_versions`, `form_submissions`, `submission_files`, `handout_orders`, `payments`
- Always use `_id` as ObjectId; convert to/from string at the schema boundary
- Index requirements:
  - `students`: unique on `{ programClassId, termId, idNumber }`
  - `handout_orders`: unique on `formSubmissionId`
  - `form_submissions`: index on `{ programClassId, termId, formDefinitionId }`

---

## FastAPI Conventions

- Use `pydantic` v2 (`model_config = ConfigDict(...)`) for all schemas
- Use `APIRouter` with prefix + tags for each module
- Async everywhere (`async def` for all route handlers and service functions)
- Return `HTTPException` with appropriate status codes:
  - `401` — unauthenticated
  - `403` — forbidden (RBAC)
  - `404` — not found
  - `409` — duplicate / conflict (e.g., duplicate handout per term)
  - `422` — validation error (Pydantic handles automatically)
- Use `Annotated` + `Depends` pattern for dependencies

---

## Frontend Conventions

- Plain HTML/CSS/JS — no build step, no npm
- Use `fetch()` for all API calls with `Authorization: Bearer <token>` header
- Store access token in `sessionStorage` (not `localStorage`)
- Admin pages check for a valid token on load; redirect to `login.html` if missing
- `public/submit-form.html` renders form schema JSON dynamically and submits without any auth header

---

## Environment Variables Required

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=dit_forms
JWT_SECRET=...
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRE_DAYS=7
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
```

---

## MVP Build Order (Reference)

| Step | Module | Status |
|------|--------|--------|
| 1 | Auth + JWT + RBAC middleware | — |
| 2 | Students CRUD + CSV import | — |
| 3 | Form builder (definitions + versions) | — |
| 4 | Public submission + admin listing/detail | — |
| 5 | R2 presigned upload + RBAC download | — |
| 6 | HandOuts Tracker + `handout_orders` auto-create | — |
| 7 | Payments + invoice status update | — |
| 8 | Duplicate handout enforcement (per-term) | — |

Update the Status column as modules are completed.

---

## Testing Guidance

- Use `pytest` + `pytest-asyncio` + `httpx.AsyncClient` for API tests
- Mock the MongoDB client and R2 client in unit tests
- Test RBAC by calling protected routes with: no token, an admin token, a class-rep token (in-scope), and a class-rep token (out-of-scope)
- Test the duplicate handout enforcement path explicitly

---

## Key Reference Documents

- `DIT Forms Ap.md` — full project spec, schema definitions, endpoint list, frontend page map
- `DIT Forms Ap sYS.md` — system architecture notes, Option A blueprint, MongoDB collection details, auto-invoice flow
- `DIT Forms.pdf` — original source document
