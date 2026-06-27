---
name: dit-forms-assistant
description: Expert assistant for the DIT Forms web application — a FastAPI + MongoDB + Cloudflare R2 system for managing editable forms, student submissions, HandOuts Tracker billing, and RBAC-controlled file access. Use when building, extending, debugging, or designing any part of the DIT Forms project: form engine, submission service, billing/invoice logic, RBAC, R2 file upload/download, MongoDB schema, FastAPI endpoints, or the HTML/CSS/JS frontend.
---

# DIT Forms Project Skill

## What This Skill Covers

This skill provides deep context for the **DIT Forms Application** — a purpose-built web platform for:

- Admin-managed, version-controlled editable forms
- Anonymous student form submissions (no student login required)
- HandOuts Tracker auto-invoice generation
- Cloudflare R2 file storage with RBAC-protected access
- Admin + Class Rep role-based access control via JWT

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + JavaScript (plain pages, no framework) |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| File Storage | Cloudflare R2 |
| Authentication | JWT (access + refresh tokens) |

---

## MongoDB Collections (Canonical Schema)

### users
- `_id`, `email` (unique), `passwordHash`, `role` (admin | class_rep)
- `assignedClassTerms`: `[{ programClassId, termId }]` — class rep scope
- `status` (active | disabled)

### students
- `_id`, `programClassId`, `termId`, `fullName`, `idNumber`
- `createdAt`, `updatedAt`
- **Unique index:** `{ programClassId: 1, termId: 1, idNumber: 1 }`

### form_definitions
- `_id`, `name`, `programClassId`, `termId`, `purpose`, `courseId` (optional)
- `status` (active | inactive), `createdAt`, `updatedAt`

### form_versions
- `_id`, `formDefinitionId`, `versionNumber`, `schema` (JSON field definitions)
- `isActive`, `createdAt`
- Schema defines: base fields (fullName, idNumber required), dynamic fields (text, select, date, textarea, number, file), required flags, file field keys

### form_submissions
- `_id`, `formVersionId`, `formDefinitionId`, `programClassId`, `termId`
- `submittedAt`, `status` (submitted | processing | closed)
- `studentMatch`: `{ matchedStudentId (nullable), idNumberSnapshot, fullNameSnapshot }`
- `answers` (JSON; file fields stored as `fileIds` or `r2ObjectKeys`)

### submission_files (metadata only)
- `_id`, `submissionId`, `fieldKey`, `programClassId`, `termId`
- `fileName`, `contentType`, `sizeBytes`, `r2Key`, `uploadedAt`

### handout_orders (one per HandOuts Tracker submission)
- `_id`, `formSubmissionId` (unique), `programClassId`, `termId`
- `student`: `{ matchedStudentId (nullable), fullNameSnapshot, idNumberSnapshot }`
- `givenOutAt`
- `invoice`: `{ invoiceStatus (unpaid | paid | partially_paid), currency (optional), totalAmount }`
- `lines`: `[{ courseId, handoutItemId, qty, unitPrice, lineTotal }]`
- `createdAt`

### payments
- `_id`, `handoutOrderId`, `amount`, `currency` (optional)
- `method` (cash | bank | etc.), `reference` (optional), `paidAt`, `receivedByUserId` (optional)

---

## RBAC Rules

| Role | Access |
|------|--------|
| Admin | Full access: students, forms, submissions, invoices, payments, all file downloads |
| Class Rep | Submissions + file downloads scoped to their assigned `{ programClassId, termId }` |

Apply RBAC enforcement on **every** admin/class-rep endpoint and all file download endpoints.

---

## FastAPI Endpoints (MVP)

### Auth
- `POST /auth/login` → returns `{ access_token, refresh_token }`
- `GET /auth/me`

### Admin + Class Rep (RBAC-protected)
- `GET /students?programClassId=&termId=&q=`
- `GET /submissions?programClassId=&termId=&formId=&studentId=&from=&to=`
- `GET /submissions/{submissionId}`
- `GET /files/{fileId}/download` — returns presigned R2 URL or streams

### Admin-Only
- `POST /students/import` (CSV/XLSX)
- `POST /students`, `PATCH /students/{id}`
- `POST /forms`, `GET /forms`
- `POST /forms/{formId}/versions`, `GET /forms/{formId}`
- `GET /handout-orders?programClassId=&termId=&studentId=`
- `POST /payments`
- `GET /students/{studentId}/balance`

### Public (No Auth)
- `POST /public/forms/{formId}/submit`
- `POST /submissions/{submissionId}/files/presign`

---

## Form Engine Design

- Admin creates a **form definition**, then adds **form versions** (never overwrite old versions)
- Active form version is used at render/submit time
- Each submission stores its exact `formVersionId` for historical integrity
- Admin can always view a submission against the version it was collected with

---

## HandOuts Tracker Rules

1. **One invoice per submission** — each HandOuts Tracker submission auto-creates exactly one `handout_orders` document
2. **Track delivery** — store `givenOutAt` from the submission field
3. **Duplicate enforcement (per-term)** — a student may only purchase one handout per `courseId` within the same `{ programClassId, termId }` scope

### Submit-Time Validation Logic
```
For each line in submission:
  Extract courseId, handoutItemId, qty
  Resolve studentId from idNumber using { programClassId, termId }
  Query handout_orders where { studentId, termId, "lines.courseId": courseId }
  If match exists → reject submission or reject that line item
```

---

## File Upload / Download Flow

### Upload
1. Client requests a presigned upload URL from `POST /submissions/{submissionId}/files/presign`
2. Browser uploads directly to Cloudflare R2
3. FastAPI stores metadata in `submission_files` after confirmation

### Download
1. Check RBAC (admin → always allowed; class_rep → must match `{ programClassId, termId }`)
2. Return a presigned R2 download URL or stream the file

---

## Frontend Pages

| Path | Purpose |
|------|---------|
| `login.html` | Admin + class rep login |
| `admin/dashboard.html` | Overview |
| `admin/students.html` | Student list + import UI |
| `admin/forms.html` | Form list |
| `admin/form-builder.html` | Create/edit form versions |
| `admin/submissions.html` | Submission list with filters |
| `admin/submission-detail.html` | Answers + file download links |
| `admin/handout-orders.html` | HandOuts Tracker view |
| `admin/payments.html` | Payment recording |
| `admin/balance.html` | Per-student balance (optional) |
| `public/submit-form.html` | Public form render + submit |

---

## MVP Build Order

1. Auth (admin + class_rep) + JWT + RBAC middleware
2. Students import + CRUD
3. Form builder v1 (schema JSON + versioning)
4. Public submission create + listing/detail
5. R2 presigned upload + RBAC file download
6. HandOuts Tracker extraction + `handout_orders` auto-create + invoice totals
7. Payments entry + invoice paid status update
8. Enforce one-handout-per-course-per-student-per-term rule

---

## Key Design Decisions (Already Confirmed)

- **No student login** — students submit anonymously; admin/class_rep are the only authenticated users
- **Option A stack** — FastAPI + MongoDB + Cloudflare R2 + plain HTML/CSS/JS frontend
- **Per-term enforcement** — duplicate handout check is scoped to `{ programClassId, termId }` only, allowing re-purchase in a different term
- **Immutable form versions** — editing a form always creates a new version; old submissions are never orphaned
- **Student match is best-effort** — `matchedStudentId` may be null if the ID number isn't in the students collection; snapshots are always stored

---

## Code Style & Conventions

- Use `motor` (async MongoDB driver) with FastAPI
- Use `pydantic` v2 models for all request/response schemas
- Use `python-jose` or `PyJWT` for JWT handling
- Store R2 credentials in environment variables; never hardcode secrets
- Use `boto3` with a custom endpoint URL for Cloudflare R2 operations
- RBAC middleware should be a FastAPI dependency, not inline logic
