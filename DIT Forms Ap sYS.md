Great—here’s a solid way to structure it so you can build the form creator, the student/admin panel, and the handouts + payment tracker cleanly.

## 1) Core modules
1) **Form Builder (Admin)**
- Create/edit forms (fields, labels, types, required, validations)
- Sections/pages (optional)
- Save “Form Definition” + versioning

2) **Submission Collector**
- Renders forms to students/parents
- Stores submissions (raw answers + metadata)
- Export/filter submissions

3) **Student List (Admin)**
- Student profiles (name, contact, class, status)
- Link submissions to students (if you collect student ID or email)

4) **Handouts Payment Tracker**
- Products/services you sell/charge for (handouts, fees, etc.)
- Payment records (amount, date, method, receipt/ref, payer)
- Track balance per student (and optionally per handout item)

## 2) Suggested database schema (minimal but scalable)
### Forms
- **form_definition**
  - id, name, created_at, updated_at, status
- **form_version**
  - id, form_definition_id, version_number, schema_json, created_at
- **form_field**
  - (optional if you store fully in schema_json)
- **form_submission**
  - id, form_version_id, submitted_at, student_id (nullable), submitted_email (nullable), source_ip (optional), status
- **form_answer**
  - submission_id, field_key, value_text/value_json, (keep flexible)

### Students
- **student**
  - id, full_name, email, phone, class_id (or class_name), notes, status
- **class**
  - id, name, term (optional)

### Handouts / Billing
- **handout_item**
  - id, title, description, price, active_from, active_to (optional)
- **invoice_or_fee**
  - id, student_id, handout_item_id (nullable for “bundle”), billing_period (optional), total_amount, due_date, status
- **payment**
  - id, student_id, invoice_or_fee_id (nullable), amount_paid, paid_at, method, reference, received_by
- **ledger_view (optional)**
  - you can compute balances via SQL views instead of storing

**Key idea:** don’t hardcode “handouts” into forms; treat billing as its own ledger module and optionally connect forms to it (e.g., a “Handout Order” form creates invoices).

## 3) Workflow design you can implement
- Admin creates a form (“Handout Order” / “Class Registration” / etc.)
- Student submits
- System:
  - either links submission → student automatically
  - and (optionally) creates:
    - an invoice/fee for selected handouts
    - and sets expected total
- Admin records payments in the tracker
- System shows:
  - per-student balance
  - payments history
  - outstanding items

## 4) Backend/API endpoints (practical set)
- **auth**
  - admin login, role checks
- **forms**
  - POST /forms (create)
  - GET /forms/:id
  - POST /forms/:id/versions
  - GET /forms/:id/render (returns form version schema)
- **submissions**
  - POST /forms/:id/submissions
  - GET /admin/submissions?formId=&dateFrom=&dateTo=&studentId=
- **students**
  - CRUD students, list/search
- **handouts/billing**
  - CRUD handout items
  - POST /invoices (create from admin or from form submission)
  - GET /students/:id/balance
  - POST /payments (record payment)
  - GET /payments?studentId=&from=&to=

## 5) UI screens to build first (MVP)
1) Admin: **Student List** (search + add/edit)
2) Admin: **Form Builder** (add field types, preview)
3) Public: **Form Render + Submit**
4) Admin: **Handouts + Invoices**
5) Admin: **Payment Tracker** (record payment, see balance)

## 6) Quick questions (so I can tailor the schema & flow)
1) Are forms **only for students** (logged-in), or also anonymous with email?
2) Do you want payment to be created from a form submission (e.g., “handout order”) automatically, or manually in admin?
3) Will payments be **one-time only**, or can invoices be split across multiple payments?
4) What stack are you using (or want): Node/Express, Django, Laravel, Rails, etc.?

If you answer those, I’ll propose a concrete MVP build plan (tables + endpoints + field types) that matches your use case.

If you want **TS + Django/FastAPI**, the cleanest setup is:

- **FastAPI** for your API (forms, submissions, students, billing/payments)
- **Django** only if you want its admin/UI scaffolding (otherwise skip Django)
- **Frontend (recommended): Next.js (React + TypeScript)** with a component library

### Recommended stack (practical MVP)
- **Frontend:** Next.js (React + TypeScript) + Tailwind UI / shadcn/ui
- **API:** FastAPI
- **DB:** Postgres
- **ORM:** SQLAlchemy or (if you prefer) Django ORM—but since you chose FastAPI, pick SQLAlchemy
- **Auth:** JWT (access/refresh) or session auth if you keep Django in the loop
- **Admin:** either build in Next.js for admin screens, or use Django admin if you keep Django

### My “pick one” recommendation
- **Next.js + FastAPI + Postgres**, no Django at first.

If you tell me whether you want **users to log in** (admins only, or also students), I’ll tailor auth + route structure and a clean DB schema for your form + payment tracker.

Use **Next.js + FastAPI + Postgres** with **admin-only login**.

## Recommended auth approach
- **FastAPI** handles auth.
- **JWT**:
  - `POST /auth/login` returns `{access_token, refresh_token}`
  - `Authorization: Bearer <access_token>` for all admin API calls
- Frontend stores tokens in memory (or secure storage pattern) and refreshes as needed.

## Suggested role model
- Table `user`:
  - `id`, `email` (unique), `password_hash`, `role` (default `admin`), `is_active`
- No student login; students submit forms without authentication.

## Frontend (admin UI)
- Next.js routes like:
  - `/admin/students`
  - `/admin/forms`
  - `/admin/submissions`
  - `/admin/handouts`
  - `/admin/payments`
- Protect with a simple “require admin session” check using the access token.

## Core endpoints (admin)
- Forms:
  - `GET/POST /forms`
  - `GET/POST /forms/{id}/versions`
- Submissions:
  - `GET /submissions?form_id=&student_id=&from=&to=`
  - `GET /submissions/{id}`
- Students:
  - `GET/POST /students`, `PATCH /students/{id}`
- Billing/payments:
  - `GET /students/{id}/balance`
  - `POST /invoices` (optional, or created from form)
  - `POST /payments`
  - `GET /payments?student_id=&from=&to=`

Got it. Build your system so submissions link to a student using **ID Number** (admin can edit forms anytime).

## Database pieces (key additions)
- **student**
  - `id` (PK)
  - `full_name`
  - `id_number` (unique)
  - `class_id` (or `class_name`)
  - other contact fields

- **forms**
  - `form_definition` (id, name, status)
  - `form_version` (id, form_definition_id, version_number, schema_json, created_at)
- **form_submission**
  - `id`
  - `form_version_id`
  - `submitted_at`
  - `id_number` (snapshot of the submitter’s ID Number)
  - `student_id` (nullable, FK to student resolved at submit time)
  - `answers_json` or normalized `form_answer` rows

## Submission linking rule
When a submission is submitted:
1. Admin-created form includes fields for **Name** and **ID Number** (or you store them as required base fields automatically).
2. Backend looks up `student` by `id_number`.
3. If found: set `student_id`; if not found: keep `student_id` null but still store `id_number` + `full_name` in the submission.

## “Form editable by admins”
- Admin edits create a **new form_version** (don’t overwrite old versions).
- Rendering a form uses the latest **active** `form_version` at submit time.
- Admin can still view submissions against the specific version they were submitted with.

## FastAPI form submission flow
- `POST /public/forms/{form_id}/submit`
  - validates required base fields: `full_name`, `id_number`
  - resolves `student_id`
  - stores answers
  - returns submission id
## Option A blueprint (FastAPI + MongoDB + Cloudflare R2, frontend HTML/CSS/JS)

### 1) Auth + RBAC
Roles:
- `admin`: everything
- `class_rep`: limited to assigned `programClassId + termId`

MongoDB:
- `users`
  - `email`, `passwordHash`
  - `role: "admin" | "class_rep"`
  - `assignedClassTerms: [{ programClassId, termId }]` (only for class_rep)

FastAPI guard:
- On every request: load user from JWT, then
- If `admin` → allow
- If `class_rep` → allow only if requested `programClassId/termId` (or implied by the resource) is in `assignedClassTerms`

### 2) Data model (MongoDB collections)
**Students**
- `students`
  - `programClassId`, `termId`
  - `fullName`
  - `idNumber` (string like `01240001C`)
  - Index/unique: `unique({ programClassId: 1, termId: 1, idNumber: 1 })`

**Forms (editable by admins via versions)**
- `form_definitions`
  - `programClassId`, `termId` (scope of the form)
  - `courseId` (optional)
  - `purpose` (e.g., “End of Sem IC List”)
  - `status: active/inactive`
- `form_versions`
  - `formDefinitionId`
  - `versionNumber`
  - `schema` (JSON describing fields, including which are file fields)
  - `isActive` (recommended: only one active at a time)

**Submissions**
- `form_submissions`
  - `formVersionId`
  - `programClassId`, `termId` (copied from the version definition at submit-time)
  - `idNumberSnapshot`, `fullNameSnapshot`
  - `studentId` (nullable; resolved by match on submit: `{programClassId, termId, idNumber}`)
  - `answers` (JSON; file fields store `fileIds`)
  - `submittedAt`
  - `status` (optional)

**Files (Cloudflare R2 metadata only)**
- `submission_files`
  - `submissionId`
  - `programClassId`, `termId` (copied for fast permission checks)
  - `fieldKey`
  - `originalName`, `contentType`, `sizeBytes`
  - `r2Key`
  - `uploadedAt`

**Handouts + Payments**
- `handout_items`
  - `programClassId`/`termId` (or global + scope fields if needed)
  - `name`, `description`, `price` (optional)
- `invoices` (handout tracker view)
  - `studentId` (nullable)
  - `programClassId`, `termId`
  - `lineItems: [{ handoutItemId, qty, unitPrice }]`
  - `total`, `status`
- `payments`
  - `studentId` (nullable)
  - `programClassId`, `termId`
  - `invoiceId` (nullable if you allow payments without invoice)
  - `amount`, `method`, `reference`, `paidAt`

### 3) Cloudflare R2 upload + admin-only download
Use **signed URLs**.

**Upload (public for submitting users; admin-only viewing enforced later)**
1. Frontend gets a presigned upload target from FastAPI:
   - `POST /submissions/{submissionId}/files/presign`
   - input: `{ fieldKey, contentType, sizeBytes, originalName }`
   - FastAPI creates `submission_files` metadata row in “pending” state (optional) and returns:
     - `uploadUrl` (R2 signed PUT)
     - `r2Key` (so frontend stores it)
2. Frontend uploads directly to R2.
3. Frontend calls:
   - `POST /submissions/{submissionId}/files/confirm` (or FastAPI marks file complete)

**Admin/class_rep download**
- `GET /files/{fileId}/download`
  - permission check using file’s `programClassId/termId`
  - if allowed: return R2 signed download URL or stream

### 4) FastAPI endpoint set (MVP)
**Auth**
- `POST /auth/login` → JWT
- `GET /auth/me`

**Students (admin + maybe class_rep read-only)**
- `GET /admin/students?programClassId=&termId=&q=`
- `POST /admin/students/import` (CSV/XLSX)
- `GET /admin/students/{id}`

**Forms**
- `GET /admin/forms?programClassId=&termId=`
- `POST /admin/forms` (creates definition)
- `POST /admin/forms/{formId}/versions` (creates a new version)
- `GET /public/forms/{formId}` (returns active version + schema) *(even if “public”; still no file access)*

**Submissions**
- `POST /public/forms/{formId}/submit`
- `GET /admin/submissions?programClassId=&termId=&formId=&studentId=&from=&to=`
- `GET /admin/submissions/{submissionId}`

**Files**
- `POST /submissions/{submissionId}/files/presign`
- `GET /files/{fileId}/download` *(RBAC enforced; admin-only unless you decide class_rep can view)*

**Billing**
- `GET /admin/students/{studentId}/balance`
- `POST /admin/invoices`
- `POST /admin/payments`
- `GET /admin/payments?programClassId=&termId=&studentId=&from=&to=`

### 5) Frontend (HTML/CSS/JS) page map
- `login.html`
- `admin/dashboard.html`
- `admin/students.html` (search + import CSV/XLSX)
- `admin/forms.html` (list definitions)
- `admin/form-builder.html` (create/edit fields; save version)
- `admin/submissions.html` (filters + list)
- `admin/submission-detail.html` (answers + “files” section with download links)
- `admin/handouts.html` (handout items)
- `admin/payments.html` (invoices + payment tracker)
- `public/submit-form.html` (render schema + submit; upload via presign endpoints)

### 6) Next decisions (so I can lock the exact schema + logic)
1) Can `class_rep` **view submission text** only, or also **download/view files**? (you previously said they can—so confirm: view/download yes)
2) For uploads, do you want **one file per file-field** or **multiple** (per fieldKey)?
3) Handout tracker: does it directly create an invoice with line items, or is it just a record until admin finalizes invoices?

Then treat “HandOuts Tracker” submissions as the source of truth for invoicing and issuing.

## MongoDB collections (adjusted)
- `handout_records` (each handout given/recorded)
  - `programClassId`, `termId`
  - `studentId` (nullable), `idNumberSnapshot`, `fullNameSnapshot`
  - `handoutItemId`
  - `qty`
  - `givenOutAt` (timestamp)
  - `receivedBackAt` (optional)
  - `status` (`given_out`, `returned`, etc.)
  - `submissionId` (optional link)
- `invoices` (auto-created per student per invoice rule)
  - `programClassId`, `termId`
  - `studentId` (nullable), snapshots
  - `invoicePeriod` or `invoiceType` (e.g., “Handouts”, term-based)
  - `createdAt`
  - `status` (`unpaid`, `partially_paid`, `paid`)
  - `totals`
- `invoice_lines`
  - `invoiceId`
  - `handoutRecordId` (so you can trace what was invoiced)
  - `handoutItemId`
  - `qty`, `unitPrice`, `lineTotal`
- `payments`
  - `invoiceId` (or also allow unlinked payments)
  - `amount`, `method`, `reference`, `paidAt`

## Auto-invoice rules (recommendation)
On each **HandOuts Tracker submission**:
1) Create `handout_records` including `givenOutAt`.
2) Resolve `studentId` using `{programClassId, termId, idNumber}`.
3) Create an invoice automatically:
   - simplest: **one invoice per student per term** (or per day/week if you prefer)
4) Add invoice lines for each new handout record.
5) Set invoice totals.

## What “track when it’s given out” means in data
- Store `givenOutAt` on each `handout_record`.
- In admin UI, invoice view can show:
  - issued date(s) from linked `handout_records`
  - which handouts were issued and when

## FastAPI changes
- `POST /public/forms/{formId}/submit`
  - if the submitted form is the HandOuts Tracker type:
    - backend creates `handout_records`
    - then auto-creates/updates the student’s invoice and invoice lines
- Admin endpoints remain:
  - `GET /admin/invoices?...`
  - `GET /admin/handout-records?...`
  - `POST /admin/payments`

Perfect—then each HandOuts Tracker submission creates exactly **one invoice**.

## Collections (what changes)
- `handout_records`
  - `programClassId`, `termId`
  - `studentId` (nullable), snapshots
  - `handoutItemId`
  - `qty`
  - `givenOutAt`
  - `submissionId` (link to the form submission)
- `invoices`
  - `programClassId`, `termId`
  - `studentId` (nullable), snapshots
  - `submissionId` (unique per invoice)
  - `createdAt`
  - `status` (`unpaid/paid/partially_paid`)
  - `total`
- `invoice_lines`
  - `invoiceId`
  - `handoutRecordId`
  - `handoutItemId`
  - `qty`, `unitPrice`, `lineTotal`
- `payments`
  - `invoiceId`
  - `amount`, `method`, `reference`, `paidAt`

## Auto-invoice flow on submit (HandOuts Tracker)
1) Resolve student by `{programClassId, termId, idNumber}` and store `studentId` (or keep null).
2) Create one `invoices` document with `submissionId = <newSubmissionId>`.
3) For each handout line in the submission:
   - create a `handout_records` row (store `givenOutAt`)
   - create an `invoice_lines` row linked to the invoice + handout_record
4) Compute `invoice.total`.

## RBAC/file access
No changes: file metadata stays in `submission_files`, and download is allowed only per your permission checks.

Great—model the HandOuts Tracker submission’s handouts as an array, then generate invoice lines from it.

## Submission answers (HandOuts Tracker)
Store something like:
```json
{
  "fullName": "…",
  "idNumber": "01240001C",
  "handouts": [
    { "handoutItemId": "HND-001", "qty": 2 },
    { "handoutItemId": "HND-010", "qty": 1 }
  ],
  "givenOutAt": "2026-06-26T10:00:00Z",
  "notes": "…"
}
```

## MongoDB inserts generated on submit
1) Create `form_submission` (your existing collection)
2) For each entry in `handouts[]`:
- insert `handout_records` with:
  - `handoutItemId`, `qty`, `givenOutAt`, and `submissionId`
- insert `invoice_lines` with:
  - `invoiceId`, `handoutRecordId`, `handoutItemId`, `qty`, `unitPrice`, `lineTotal`
3) Create one `invoices` document with:
- `submissionId` (unique)
- `studentId` (resolved via `{programClassId, termId, idNumber}`)
- `total` = sum of `lineTotal`s

Got it—enforce a constraint: per **student + course** there can be at most one handout per course per HandOuts Tracker submission scope.

## Data model changes
### handout_items
- `courseId` (or course key)
- `programClassId`, `termId` (optional if items are tied to a class/term)
- `price`

### invoices/invoice_lines
You’ll generate **at most one invoice line per (student, courseId)** from a submission.

### Validation rule on submission (HandOuts Tracker)
When a HandOuts Tracker submission arrives:
- For each selected `handoutItemId`, derive `courseId`
- Check existing `handout_records` (or `invoice_lines`) for the same:
  - `studentId` (resolved by `{programClassId, termId, idNumber}`)
  - `courseId`
  - within the invoice scope you care about (usually the same `programClassId + termId`)
- If found, reject that entry (or ignore duplicates), and allow the rest.

## MongoDB enforcement (recommended)
1) **Application-level validation** (fast MVP)
- Reject submission with a clear error like “Entrepreneurship already issued for Ama Doe in this term”.

2) **Optional DB-level uniqueness** (strong)
- Use a unique index on `handout_records` for the dimension you want to prevent duplicates across term:
  - `{ programClassId: 1, termId: 1, studentId: 1, courseId: 1 }`
This requires `courseId` be stored directly in `handout_records` (store it at issuance time).

## Quick schema tweak
Add these fields:
- `handout_records`: `courseId`
- `invoice_lines`: `courseId` (derived from `handoutItemId`)

