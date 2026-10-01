# PASS_07 — Risk Detection & Anti-Pattern Analysis Plan — hms

## Context

- Project: `hms` at `/home/midhun/works/hms` — Hostel/Property Management SaaS
- Stack: Next.js 16.3.2 + Payload 3.88.0 + Postgres — modular monolith
- PASS_01-06 done: 34 collections, 7 services, 11 hooks, Booking state machine `DRAFT→PENDING_PAYMENT_VERIFICATION→PENDING_ADMIN_REVIEW→APPROVED→COMPLETED`, Tenancy `UPCOMING→ACTIVE→COMPLETED`, idempotent Payments via `transaction_reference` unique, RBAC `isStaffOfProperty`, append-only Audit, hierarchy `Organizations→Properties→Buildings→Floors→Rooms→Beds` dual bed status
- Prior findings to verify: AuditService schema mismatch writes `entity_collection` vs `collection_slug`, student APIs unscoped/mock, advisory lock best-effort swallowed, no transactional wrapping for check-in/out/transfer, 20+ Python fix scripts, staff portals `localStorage` mocks, no CI/CD, no S3, no APM, demo OTP `123456`
- Scope PASS_07 ONLY: detect anti-patterns, security risks, data risks, deployment/observability gaps, produce `19.ANTI_PATTERN_REGISTRY`, `20.RISK_REGISTRY`, `21.CHANGE_SAFETY_REGISTRY` with `[V]/[D]/[I]` + `file:line` evidence, no hallucination, document repair paths without implementing

## Goals

1. Scan anti-patterns: duplicate logic, hidden coupling, dead code, unsafe data handling, architecture drift, temporary fixes — verify duplicate booking wizards, `localStorage` vs Payload divergence, empty `Checkbox` dir, double `StudentLayout` nesting, misnamed payments API, duplicate `beforeAll`, Python fix scripts, hardcoded values, swallowed errors, N+1 queries
2. Scan security risks: auth bypass, PII exposure, unscoped APIs, forgeable tokens, public enumeration, XSS, CSRF, injection, secrets
3. Scan data risks: missing transactions, race conditions, immutability gaps, validation gaps, index gaps
4. Scan deployment/observability gaps: no Dockerfile, no CI/CD, no health checks, no APM, no S3, error swallowing
5. Emit three registries with truth classification and `file:line` citations, then `attempt_completion`

## Non-Goals

- No code fixes in PASS_07 — only registry + repair paths
- No new features, no UI redesign, no migration scripts
- No hallucinated evidence — every row needs `file:line`

## Truth Classification — Mandatory

- `[V]` Verified — directly read in file, cite `file:line`
- `[D]` Derived — logically derived from `[V]` evidence, cite source `[V]` + reasoning
- `[I]` Inferred — plausible but not directly observed, mark as `[I]` and note missing evidence

Example: `Forgeable token [V] at [`src/app/api/students/verify-otp/route.ts`](src/app/api/students/verify-otp/route.ts:3) — [`Buffer.from()`](src/app/api/students/verify-otp/route.ts:3) base64 + [`httpOnly: false`](src/app/api/students/verify-otp/route.ts:3)`

## Registry Schemas

### 19.ANTI_PATTERN_REGISTRY

| Column      | Description                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------- |
| PATTERN     | Anti-pattern name — e.g., Duplicate Logic, Dead Code, Drift, Temp Fix, Swallowed Error, N+1       |
| LOCATION    | `file:line` list — primary + secondary                                                            |
| IMPACT      | Functional / maintainability / data integrity impact                                              |
| SEVERITY    | `CRITICAL / HIGH / MEDIUM / LOW`                                                                  |
| REPAIR PATH | Concrete steps — no code, just path — e.g., consolidate wizards, extract service, add transaction |

### 20.RISK_REGISTRY

| Column      | Description                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------- |
| RISK_ID     | `R-001` sequential                                                                                  |
| CATEGORY    | `SECURITY / DATA / DEPLOYMENT / OBSERVABILITY`                                                      |
| DESCRIPTION | One-sentence risk                                                                                   |
| EVIDENCE    | `file:line` + snippet                                                                               |
| IMPACT      | Confidentiality / Integrity / Availability / Financial                                              |
| MITIGATION  | Repair path — e.g., add `httpOnly`, scope by `tenancy.person`, add `pg_advisory_xact_lock` handling |

### 21.CHANGE_SAFETY_REGISTRY

| Column           | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| CHANGE_TARGET    | File or service to change — e.g., `AuditService`, `CheckInService`, `proxy` |
| AFFECTED_MODULES | Collections / hooks / APIs / UI impacted                                    |
| AFFECTED_DATA    | Tables / fields at risk                                                     |
| AFFECTED_USERS   | `student / staff / admin / system`                                          |
| REGRESSION_RISK  | `HIGH / MEDIUM / LOW` + reason                                              |
| BACKUP_REQUIRED  | `YES / NO` + what to backup                                                 |
| TEST_REQUIRED    | Invariants to run — e.g., `hms-invariants.spec.ts:33` state machine         |

## Evidence Inventory — Verified [V]

### Anti-Patterns — Duplicate Logic & Drift

- Duplicate booking wizards [V]: [`src/components/booking/BookingWizard/index.tsx`](src/components/booking/BookingWizard/index.tsx:19) 5 steps `Search/Select Bed/Your Details/Documents/Confirm` vs [`src/app/booking/page.tsx`](src/app/booking/page.tsx:7) 7 steps `Hostel/Dates/Bed/Details/Docs/Terms/Payment` — both call `availabilityApi`/`bookingsApi` but diverge on rent `650/1100` vs hardcoded hostels
- Double `StudentLayout` nesting [V]: [`src/app/student/layout.tsx`](src/app/student/layout.tsx:7) 9 navItems `Dashboard/My Profile/My Room/Bookings/Contracts/Payments/Documents/Maintenance/Notifications` vs [`src/components/layouts/StudentLayout/index.tsx`](src/components/layouts/StudentLayout/index.tsx:18) 6 navItems `Dashboard/Profile/Stay Management/Contracts/Payments/Documents/Requests` — plus [`src/app/student/requests/page.tsx`](src/app/student/requests/page.tsx:5) double nesting bug
- Empty dead code [V]: [`src/components/ui/Checkbox`](src/components/ui/Checkbox) directory exists but `list_files` returns 0 files — referenced as [I] in PASS_06
- `localStorage` vs Payload divergence [V]: [`src/app/staff/properties/page.tsx`](src/app/staff/properties/page.tsx:10) `hms_properties` + `hms_room_overrides` + `sessionStorage hms_return_room`, [`src/app/staff/students/page.tsx`](src/app/staff/students/page.tsx:20) `hms_students` + `INITIAL_STUDENTS`, [`src/app/staff/payments/page.tsx`](src/app/staff/payments/page.tsx:8) `hms_payments`, [`src/app/staff/page.tsx`](src/app/staff/page.tsx:7) reads all four — no Payload `find`/`create`
- Misnamed API [V]: [`src/lib/api/payments.ts`](src/lib/api/payments.ts:3) `paymentsApi.getStudentPayments` → `GET /students/invoices` — actually invoices, not payments
- Duplicate `beforeAll` [V]: [`src/tests/setup.ts`](src/tests/setup.ts:8) `beforeAll` wipe + [`src/tests/hms-invariants.spec.ts`](src/tests/hms-invariants.spec.ts:14) `beforeAll` create person/property/room/beds — wired via [`jest.config.js`](jest.config.js:1) `setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts']` — double execution risk [D]
- 20+ Python fix scripts [V]: root `checkboxes_beds.py`, `fix_*.py` 12 files, `update_*.py`, `student_*.py`, `make_cards.py` — indicates temp-fix tech debt, no CI to prevent drift
- Hardcoded values [V]: [`src/app/api/students/verify-otp/route.ts`](src/app/api/students/verify-otp/route.ts:3) `code !== '123456'`, [`src/app/student/page.tsx`](src/app/student/page.tsx:4) `Welcome back John` + `The Grand Residence 201/A €400`, [`src/components/booking/BookingWizard/index.tsx`](src/components/booking/BookingWizard/index.tsx:19) rent `650/1100`, [`src/app/staff/students/page.tsx`](src/app/staff/students/page.tsx:20) `John Doe/Jane Smith`
- Swallowed errors [V]: [`src/collections/Bookings/hooks/generateTenancyOnApproval.ts`](src/collections/Bookings/hooks/generateTenancyOnApproval.ts:3) `try/catch` + `payload.logger.error` + `return doc`, [`src/collections/Bookings/hooks/checkOverlappingBookings.ts`](src/collections/Bookings/hooks/checkOverlappingBookings.ts:6) `try/catch` advisory lock `payload.logger.warn` continue, [`src/services/AuditService.ts`](src/services/AuditService.ts:3) no throw handling, [`src/collections/Payments/hooks/allocatePaymentToInvoice.ts`](src/collections/Payments/hooks/allocatePaymentToInvoice.ts:3) swallowed recalc error
- N+1 / sequential queries [V]: [`src/app/api/availability/route.ts`](src/app/api/availability/route.ts:5) chain `payload.find buildings→floors→rooms ACTIVE→beds AVAILABLE+VACANT` with `limit 100/100/100/500` + `rooms.docs.map` grouping — no single join, no pagination guard [D] HIGH for large properties

### Security Risks

- Forgeable token [V]: [`src/app/api/students/verify-otp/route.ts`](src/app/api/students/verify-otp/route.ts:3) `Buffer.from(JSON.stringify({phone,role:student})).toString('base64')` + `cookie hms-student-token` `httpOnly: false` `maxAge: 86400` — client readable, no signature, no expiry check
- Auth bypass [V]: [`src/proxy.ts`](src/proxy.ts:4) `if pathname.startsWith('/student') && pathname !== '/student/login'` only `request.cookies.get('hms-student-token')?.value` existence check — comment `checking existence is sufficient` — no verification, no role check
- Unscoped student APIs [V]: [`src/app/api/students/dashboard/route.ts`](src/app/api/students/dashboard/route.ts:5) `payload.find tenancies ACTIVE limit1` random, [`src/app/api/students/invoices/route.ts`](src/app/api/students/invoices/route.ts:5) `limit 10 sort -due_date` no `where person=`, [`src/app/api/students/maintenance/route.ts`](src/app/api/students/maintenance/route.ts:5) `GET limit10` + `POST` `as any` no `tenancy/person` linking — enumeration risk [D]
- Public enumeration [V]: [`src/collections/Media/index.ts`](src/collections/Media/index.ts:5) `read: () => true` public, [`src/collections/Documents/index.ts`](src/collections/Documents/index.ts:5) `canReadSecureDocument` allows `isStaff` to read all docs — no property scoping
- PII field-level [V]: [`src/collections/People/index.ts`](src/collections/People/index.ts:4) `canReadSensitive` for `passport_number/emergency_contact/visa` but collection `read: isStaff` at [`src/access/index.ts`](src/access/index.ts:17) — staff can list all people, field filter only
- XSS [V]: [`src/app/student/login/page.tsx`](src/app/student/login/page.tsx:37) `dangerouslySetInnerHTML` for `hero-image-wrapper` style — low risk but pattern
- Secrets [V]: [`src/tests/setup.ts`](src/tests/setup.ts:8) hardcoded `DATABASE_URI postgres://postgres:postgres@127.0.0.1:5432/hms_test` + `PAYLOAD_SECRET hms-test-secret-123`, [`src/lib/api/client.ts`](src/lib/api/client.ts:13) `NEXT_PUBLIC_SERVER_URL` exposed, `.env` present but `.gitignore` ignores `.env*` [V] at [`.gitignore`](.gitignore:1)
- Missing CSRF/rate limit [D]: no `csrf` middleware, no `rateLimit` on `request-otp`/`verify-otp` — derived from absence in [`src/proxy.ts`](src/proxy.ts:4) + [`src/app/api/students/request-otp/route.ts`](src/app/api/students/request-otp/route.ts:5) mock `success:true`

### Data Risks

- No transactions [V]: [`src/services/CheckInService.ts`](src/services/CheckInService.ts:3) two `payload.update` `tenancy ACTIVE` + `bed OCCUPIED` no `drizzle.transaction`, [`src/services/CheckOutService.ts`](src/services/CheckOutService.ts:3) `COMPLETED/VACANT`, [`src/services/RoomTransferService.ts`](src/services/RoomTransferService.ts:3) 3 updates + `audit create` — comment `transactional safety` but not implemented — partial failure leaves inconsistent state [D] CRITICAL
- Advisory lock best-effort [V]: [`src/collections/Bookings/hooks/checkOverlappingBookings.ts`](src/collections/Bookings/hooks/checkOverlappingBookings.ts:6) `pg_advisory_xact_lock(hash)` in `try/catch` `warn` continue — lock failure still proceeds to `find` overlapping — race window remains [D]
- Audit schema mismatch [V]: [`src/services/AuditService.ts`](src/services/AuditService.ts:3) writes `entity_collection/entity_id/action/before_state/after_state` vs [`src/collections/SystemAuditLogs/index.ts`](src/collections/SystemAuditLogs/index.ts:4) expects `collection_slug/document_id/action enum CREATE/UPDATE/DELETE + changes json` — plus [`src/services/RoomTransferService.ts`](src/services/RoomTransferService.ts:3) and [`src/services/ContractRenewalService.ts`](src/services/ContractRenewalService.ts:3) same mismatch — audit writes will fail or be dropped [D] HIGH
- Immutability gaps [V]: [`src/collections/Contracts/hooks/immutableOnceSigned.ts`](src/collections/Contracts/hooks/immutableOnceSigned.ts:4) blocks `SIGNED/ACTIVE/EXPIRED/TERMINATED` but [`src/collections/Contracts/index.ts`](src/collections/Contracts/index.ts:20) `/:id/renew` creates new version — no check for overlapping active contracts [D]
- Validation gaps [V]: [`src/app/api/students/maintenance/route.ts`](src/app/api/students/maintenance/route.ts:21) `as any` bypass, [`src/services/BookingService.ts`](src/services/BookingService.ts:3) `validateBedStatus` only checks `operational_status AVAILABLE` not `occupancy_status`
- Index gaps [D]: only [`src/collections/Payments/index.ts`](src/collections/Payments/index.ts:5) `transaction_reference` unique — no index on `tenancies.bed`, `bookings.bed+status`, `invoices.student` — derived from absence in collection configs

### Deployment / Observability Gaps

- No Dockerfile, no CI/CD, no health check, no APM [V]: [`package.json`](package.json:5) scripts `dev/build/start` only, no `Dockerfile` found via search, no `.github/workflows`, [`next.config.ts`](next.config.ts:1) `withPayload` only, no `health` route
- No S3 [V]: [`src/collections/Media/index.ts`](src/collections/Media/index.ts:5) `upload staticDir media`, [`src/collections/Documents/index.ts`](src/collections/Documents/index.ts:5) `staticDir documents` — local disk, no `S3` config, but [`src/app/staff/properties/page.tsx`](src/app/staff/properties/page.tsx:10) uses `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` for bed images — drift [D]
- Error swallowing [V]: as above plus [`src/app/api/availability/route.ts`](src/app/api/availability/route.ts:5) `console.error` not structured logging — no APM to catch

## Execution Plan — Steps

1. Re-read suspicious files not yet fully verified: [`src/app/staff/maintenance/page.tsx`](src/app/staff/maintenance/page.tsx:3), [`src/app/staff/documents/page.tsx`](src/app/staff/documents/page.tsx:3), [`src/app/staff/inbox/page.tsx`](src/app/staff/inbox/page.tsx:3), [`src/app/staff/settings/page.tsx`](src/app/staff/settings/page.tsx:3), [`src/components/ui/Button/index.tsx`](src/components/ui/Button/index.tsx:10), [`src/components/ui/Select/index.tsx`](src/components/ui/Select/index.tsx:10), [`src/lib/api/availability.ts`](src/lib/api/availability.ts:4), [`src/collections/Tenancies/index.ts`](src/collections/Tenancies/index.ts:1), [`src/collections/Beds/index.ts`](src/collections/Beds/index.ts:1)
2. Classify each finding `[V]/[D]/[I]` and assign `SEVERITY` + `CATEGORY`
3. Draft `19.ANTI_PATTERN_REGISTRY` — 12-15 rows covering duplicates, dead code, drift, temp fixes, swallowed errors, N+1, hardcoded, misnamed, duplicate `beforeAll`
4. Draft `20.RISK_REGISTRY` — 12-15 rows `R-001`..`R-015` across SECURITY/DATA/DEPLOYMENT, each with `EVIDENCE file:line` + `IMPACT` + `MITIGATION`
5. Draft `21.CHANGE_SAFETY_REGISTRY` — 8-10 rows for `AuditService`, `CheckIn/Out/Transfer`, `proxy`+`verify-otp`, `availability`, `Payments`, `Contracts`, `Media/Documents`, `localStorage` migration
6. Cross-check against [`src/tests/hms-invariants.spec.ts`](src/tests/hms-invariants.spec.ts:32) invariants 1,2,4,5,8,11,12,14,15,16 for `TEST_REQUIRED`
7. Write registries to `plans/19.ANTI_PATTERN_REGISTRY.md`, `plans/20.RISK_REGISTRY.md`, `plans/21.CHANGE_SAFETY_REGISTRY.md` with markdown tables and `file:line` links
8. `attempt_completion` with summary + registry fragments

## Workflow Diagram

```mermaid
flowchart TD
    A[Evidence Gathering] --> B[Classify V D I with file line]
    B --> C[Draft 19 ANTI_PATTERN_REGISTRY]
    B --> D[Draft 20 RISK_REGISTRY]
    B --> E[Draft 21 CHANGE_SAFETY_REGISTRY]
    C --> F[Cross-check invariants]
    D --> F
    E --> F
    F --> G[Write plans 19 20 21 md]
    G --> H[attempt_completion]
```

## Registry Templates — Fragments

### 19.ANTI_PATTERN_REGISTRY — Example Rows

| PATTERN                      | LOCATION                                                                                                                                                                                                                                              | IMPACT                                                                | SEVERITY | REPAIR PATH                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate Booking Wizard     | [`src/components/booking/BookingWizard/index.tsx`](src/components/booking/BookingWizard/index.tsx:19) + [`src/app/booking/page.tsx`](src/app/booking/page.tsx:7) [V]                                                                                  | Divergent UX, double maintenance, rent drift 650 vs hardcoded hostels | HIGH     | Consolidate to single `BookingWizard` component, extract `useBookingFlow` hook, delete `src/app/booking/page.tsx` wizard, add invariant test             |
| Double StudentLayout Nesting | [`src/app/student/layout.tsx`](src/app/student/layout.tsx:7) + [`src/components/layouts/StudentLayout/index.tsx`](src/components/layouts/StudentLayout/index.tsx:18) + [`src/app/student/requests/page.tsx`](src/app/student/requests/page.tsx:5) [V] | Layout shift, nav drift 9 vs 6 items, double header                   | MEDIUM   | Keep `src/app/student/layout.tsx` as single source, delete `components/layouts/StudentLayout` or make it presentational, fix `requests` page to not nest |
| Empty Checkbox Dead Code     | [`src/components/ui/Checkbox`](src/components/ui/Checkbox) [V]                                                                                                                                                                                        | Confusion, import errors                                              | LOW      | Implement or delete dir, update `PASS_06` UI registry                                                                                                    |

### 20.RISK_REGISTRY — Example Rows

| RISK_ID | CATEGORY | DESCRIPTION                                                                     | EVIDENCE                                                                                                                                                                        | IMPACT                                 | MITIGATION                                                                                                                            |
| ------- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| R-001   | SECURITY | Forgeable student token — base64 JSON no signature, httpOnly false              | [`src/app/api/students/verify-otp/route.ts`](src/app/api/students/verify-otp/route.ts:3) `Buffer.from(JSON.stringify({phone,role})).toString('base64')` + `httpOnly: false` [V] | Auth bypass, PII leak                  | Use `jose` JWT signed with `PAYLOAD_SECRET`, `httpOnly:true secure:true sameSite:strict`, add `proxy` verification via `payload.auth` |
| R-002   | SECURITY | Unscoped student dashboard — returns random ACTIVE tenancy                      | [`src/app/api/students/dashboard/route.ts`](src/app/api/students/dashboard/route.ts:5) `payload.find tenancies ACTIVE limit1` [V]                                               | Data leak across students              | Scope by `req.user` or `hms-student-token` → `person` → `tenancies where person=`, add `isStudentSelf` access                         |
| R-007   | DATA     | No transaction in CheckIn — partial update leaves tenancy ACTIVE but bed VACANT | [`src/services/CheckInService.ts`](src/services/CheckInService.ts:3) two `payload.update` no transaction [V]                                                                    | Inconsistent occupancy, double booking | Wrap in `payload.db.drizzle.transaction`, add compensating rollback, test invariant 8                                                 |

### 21.CHANGE_SAFETY_REGISTRY — Example Rows

| CHANGE_TARGET                  | AFFECTED_MODULES                                                                              | AFFECTED_DATA                               | AFFECTED_USERS         | REGRESSION_RISK                                | BACKUP_REQUIRED                   | TEST_REQUIRED                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------- | ---------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| `AuditService` schema fix      | `SystemAuditLogs`, `RoomTransferService`, `ContractRenewalService`, `auditBookingTransitions` | `system_audit_logs`                         | admin, system          | HIGH — audit writes currently failing silently | YES — dump `system_audit_logs`    | `hms-invariants.spec.ts:32` + manual audit create  |
| `CheckInService` transactional | `Tenancies`, `Beds`, `Bookings`                                                               | `tenancies.status`, `beds.occupancy_status` | student, staff, warden | HIGH — occupancy integrity                     | YES — snapshot `tenancies`+`beds` | Invariant 8 `Check-in transitions tenancy and bed` |

## Change Safety Notes

- `AuditService` fix is breaking — must migrate `entity_collection→collection_slug` etc, backfill or drop old logs, coordinate with `immutableLog` hook at [`src/collections/SystemAuditLogs/hooks/immutableLog.ts`](src/collections/SystemAuditLogs/hooks/immutableLog.ts:1)
- `CheckIn/Out/Transfer` transactional wrapping needs `payload.db.drizzle` access — verify Payload 3.88.0 transaction API, add integration test for concurrent check-in
- `proxy` + `verify-otp` auth fix touches all `src/app/student/*` 9 routes + `src/app/api/students/*` 4 routes — high blast radius, need `hms-invariants` + manual OTP flow test
- `localStorage` migration to Payload is largest — `hms_properties`, `hms_students`, `hms_payments`, `hms_room_overrides` — requires data import script, dual-write period, then cutover

## Deliverables & Acceptance

- `plans/19.ANTI_PATTERN_REGISTRY.md` — 12-15 rows, each with `PATTERN, LOCATION file:line, IMPACT, SEVERITY, REPAIR PATH`, truth tags
- `plans/20.RISK_REGISTRY.md` — 12-15 rows `R-001..`, `CATEGORY, DESCRIPTION, EVIDENCE file:line, IMPACT, MITIGATION`, truth tags
- `plans/21.CHANGE_SAFETY_REGISTRY.md` — 8-10 rows `CHANGE_TARGET, AFFECTED_MODULES, AFFECTED_DATA, AFFECTED_USERS, REGRESSION_RISK, BACKUP_REQUIRED, TEST_REQUIRED`
- All registries use clickable `file:line` links per markdown rules
- `attempt_completion` summary includes counts, top 3 critical risks, and registry fragments

## Open Questions for Review

- Severity threshold: should `localStorage` divergence be `CRITICAL` given it bypasses all Payload access control, or `HIGH`?
- Python fix scripts: include each as separate anti-pattern row or single `Temp Fix Scripts` aggregate?
- Output location: `plans/` vs root — current plan uses `plans/` to match PASS_06
