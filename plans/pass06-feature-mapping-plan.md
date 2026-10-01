# PASS_06 — Feature Mapping & User Flows Plan — hms

## Context

- Project: `hms` at `/home/midhun/works/hms` — Hostel/Property Management SaaS
- Stack: Next.js 16.3.2 + Payload 3.88.0 + Postgres — modular monolith
- PASS_01-05 done: 34 collections, 7 services, 11 hooks, Booking state machine `DRAFT→PENDING_PAYMENT_VERIFICATION→PENDING_ADMIN_REVIEW→APPROVED→COMPLETED`, Tenancy `UPCOMING→ACTIVE→COMPLETED`, idempotent Payments, RBAC+property scoping, append-only Audit, hierarchy `Organizations→Properties→Buildings→Floors→Rooms→Beds` dual bed status
- Scope PASS_06 ONLY: inventory ALL features, map user flows, map UI registry, produce `07.FEATURE_REGISTRY`, `12.USER_FLOW_REGISTRY`, `13.UI_REGISTRY`, `16.TEST_REGISTRY` with `[V]/[D]/[I]` + `file:line` evidence, no hallucination, no improvements before reality

## Goals

1. Complete file-verified inventory of every feature slice: marketing, hostels, availability, booking, staff 8 routes, student 9 routes, `src/components/marketing/*`, `booking/*`, `portal/*`, `ui/*`, `auth/*`, `layouts/*`, `src/lib/api/*`, `src/app/api/*` 6 routes, `src/collections/*` 34, services 7, hooks 11
2. For each feature capture: `FEATURE_ID, NAME, DESCRIPTION, USER_VALUE, FILES, DATABASE, API, UI, BUSINESS_RULES, DEPENDENCIES, STATUS, SAFE_EXTENSION_POINTS`
3. Map end-to-end user flows: `Marketing discovery → Availability search → Booking wizard → Payment → Admin review → Tenancy → Check-in → Room transfer → Check-out → Contract renewal` + Student portal flows + Staff flows
4. Map UI registry: Pages, Components, Layouts, Design System, Reusable Elements, Interaction Patterns
5. Map test registry from [`hms-invariants.spec.ts`](src/tests/hms-invariants.spec.ts:1), [`jest.config.js`](jest.config.js:1), [`setup.ts`](src/tests/setup.ts:1) — coverage areas, critical paths, missing coverage, regression risks
6. Emit registries with truth classification `[V]` Verified / `[D]` Derived / `[I]` Inferred and `file:line` citations

## Inventory Completed So Far — Verified [V]

### Marketing & Public

- [`src/app/page.tsx`](src/app/page.tsx:8) — 422 lines, client, `framer-motion`, `Navbar`, 8 sections: Hero, Featured Hostels, Categories, Horizontal Scroll Amenities, Bento Box Room Types, Neighborhood Parallax, Masonry Testimonials, Cinematic CTA — links `Search Accommodation → /hostels`, `Reserve a Bed → /booking`
- [`src/app/hostels/page.tsx`](src/app/hostels/page.tsx:4) — mock 4 hostels, grid, `View Details → /hostels/${id}`
- [`src/app/hostels/[slug]/page.tsx`](src/app/hostels/[slug]/page.tsx:4) — mock detail, gallery, amenities, rules, `Reserve a Bed → /booking`
- [`src/app/availability/page.tsx`](src/app/availability/page.tsx:6) — client, property select + month, mock `availabilityData` building/floor/room/bed `available/occupied/maintenance`, `Book Room → /booking`
- [`src/app/booking/page.tsx`](src/app/booking/page.tsx:7) — client 7-step wizard `Hostel, Dates, Bed, Details, Docs, Terms, Payment`, progress bar, steps 1/4/7 implemented
- [`src/app/booking/[id]/page.tsx`](src/app/booking/[id]/page.tsx:4) — success, `Booking ID: {params.id}`, links to `/student` + WhatsApp
- [`src/components/marketing/Navbar.tsx`](src/components/marketing/Navbar.tsx:7) — announcement bar, sticky header, mobile menu, `Home/Hostels/Availability/About/Contact`, `Admin Panel → /staff`, `Student Login → /student`
- [`src/components/marketing/HeroSection/index.tsx`](src/components/marketing/HeroSection/index.tsx:18) — `HeroSectionProps` title/subtitle/imageUrl/primaryAction/secondaryAction, `motion.div` fade, `Button` secondary/ghost
- [`src/components/marketing/HostelCard/index.tsx`](src/components/marketing/HostelCard/index.tsx:19) — `HostelCardProps` id/slug/name/location/imageUrl/startingPrice, badge `Beds Available/Waitlist`, `Card` hoverable
- [`src/components/marketing/FAQSection/index.tsx`](src/components/marketing/FAQSection/index.tsx:17) — `FAQSectionProps` title/items, accordion `activeIndex`, `ChevronDown` rotate
- [`src/components/layouts/PublicLayout/index.tsx`](src/components/layouts/PublicLayout/index.tsx:6) — header `HMS` logo, nav `Accommodations/Facilities/FAQ/Contact`, `Student Login → /student`, footer

### Booking Components

- [`src/components/booking/BookingWizard/index.tsx`](src/components/booking/BookingWizard/index.tsx:19) — 5 steps `Search/Select Bed/Your Details/Documents/Confirm`, `propertiesApi.getProperties`, `availabilityApi.checkAvailability`, `bookingsApi.createBooking` with `status: PENDING_PAYMENT_VERIFICATION`, `motion` + `AnimatePresence`
- [`src/components/booking/BedSelector/index.tsx`](src/components/booking/BedSelector/index.tsx:27) — `RoomData/BedData`, filters `room.beds.length>0`, `selectedBedId`, `onSelectBed`, emptyState `No beds available`
- [`src/components/booking/DocumentUploader/index.tsx`](src/components/booking/DocumentUploader/index.tsx:13) — dragActive, `handleDrag/handleDrop/handleChange/removeFile`, `accept image/*,.pdf`, `onFilesChange`
- [`src/components/booking/PaymentSummary/index.tsx`](src/components/booking/PaymentSummary/index.tsx:10) — `rentAmount+depositAmount=total`, notice `Cash Payment Workflow: Pending Verification`

### Staff Portal — 8 Routes

- [`src/app/staff/layout.tsx`](src/app/staff/layout.tsx:7) — `AdminLayout` client, 5 navItems `Dashboard/Properties/Students/Payments/Settings`, mobile overlay, header search/bell
- [`src/app/staff/page.tsx`](src/app/staff/page.tsx:7) — `AdminDashboard` 443 lines, `localStorage hms_properties/hms_students/hms_room_overrides/hms_payments`, `useMemo` occupancy calc `totalBeds/filledBeds/occupancySnapshot/floorStats`, KPI cards, Recent Bookings, Occupancy Snapshot, Financials, Schedule, Maintenance, Quick Actions
- [`src/app/staff/bookings/page.tsx`](src/app/staff/bookings/page.tsx:6) — Arrivals/Departures panels, mock `BKG-1029/1030`, `BKG-0891`, handlers `handleProcessCheckIn/handleLogInspection/handleCompleteCheckout`, search filter
- [`src/app/staff/students/page.tsx`](src/app/staff/students/page.tsx:20) — `INITIAL_STUDENTS` 2, `localStorage`, property/floor filters, search, delete modal
- [`src/app/staff/students/[id]/page.tsx`](src/app/staff/students/[id]/page.tsx:8) — `useParams id`, `from=properties` backLink, `localStorage hms_students`, assign room flow `selectedPropId/Floor/Room/Bed → hms_room_overrides` bedStatuses/bedOccupants, `Edit → /staff/students/add?edit=`
- [`src/app/staff/students/add/page.tsx`](src/app/staff/students/add/page.tsx:8) — `editId` via `searchParams`, `formData` firstName/lastName/.../password, `Room Assignment` 4 selects, `localStorage` save + `hms_room_overrides` sync, `sessionStorage hms_return_room_edit` + `hms_new_assigned_student_id`
- [`src/app/staff/properties/page.tsx`](src/app/staff/properties/page.tsx:10) — 1535 lines, `INITIAL_PROPERTIES` empty, `roomOverrides/bedStatuses/bedOccupants/bedImages/bedDescriptions`, `localStorage/sessionStorage hms_return_room`, CRUD property, room map grid, filters, modals room details/edit/add/edit property/delete, Cloudinary upload, share bed
- [`src/app/staff/payments/page.tsx`](src/app/staff/payments/page.tsx:8) — `INITIAL_PAYMENTS []`, `localStorage hms_payments`, filters month/status/type/property/floor, KPI `totalRevenue/pendingAmount/failedAmount`, table `TRX-*`, `Record Payment` modal with property/floor/room/bed → student auto-fill, `Export CSV` placeholder
- [`src/app/staff/maintenance/page.tsx`](src/app/staff/maintenance/page.tsx:3) — stub, `Wrench` icon, `Create Ticket` button, placeholder text
- [`src/app/staff/documents/page.tsx`](src/app/staff/documents/page.tsx:3) — stub, `FileCheck` icon, placeholder `Pending document verifications`
- [`src/app/staff/inbox/page.tsx`](src/app/staff/inbox/page.tsx:3) — mock WhatsApp inbox, 3 conversations `John Doe/Sarah Williams/Michael Chang`, sidebar + chat history + input `Paperclip/Send`, `CheckCircle2` read receipt
- [`src/app/staff/settings/page.tsx`](src/app/staff/settings/page.tsx:3) — stub, `Settings` icon, placeholder `Global application settings`

### Student Portal — 9 Routes + Layout

- [`src/app/student/layout.tsx`](src/app/student/layout.tsx:7) — `StudentLayout` client, 9 navItems `Dashboard/My Profile/My Room/Bookings/Contracts/Payments/Documents/Maintenance/Notifications`, floating WhatsApp
- [`src/app/student/page.tsx`](src/app/student/page.tsx:4) — `Welcome back John`, `Current Stay` card, `Next Payment €400 → /student/payments`, `Action Required Student ID → /student/documents`, Quick Actions 3
- [`src/app/student/login/page.tsx`](src/app/student/login/page.tsx:6) — split `OTPLoginForm` left, cinematic `Image` right
- [`src/components/auth/OTPLoginForm/index.tsx`](src/components/auth/OTPLoginForm/index.tsx:14) — `Step PHONE|OTP`, phone validation, `authApi.requestOTP/verifyOTP`, 6-digit inputs, countdown 60s, `cookie hms-student-token` base64, `callbackUrl`
- [`src/app/student/payments/page.tsx`](src/app/student/payments/page.tsx:3) — mock 3 `INV-1002/1001/1000`, `Outstanding €400`, Payment History
- [`src/app/student/maintenance/page.tsx`](src/app/student/maintenance/page.tsx:3) — `New Request` button, `No active requests`
- [`src/app/student/room/page.tsx`](src/app/student/room/page.tsx:3) — `Room Layout Bed A/B/C`, Roommates, Digital Key
- [`src/app/student/contracts/page.tsx`](src/app/student/contracts/page.tsx:3) — `Tenancy Agreement 2026-2027 Active`
- [`src/app/student/documents/page.tsx`](src/app/student/documents/page.tsx:3) — 3 docs `Passport/Student ID/Offer Letter` `Verified/Pending`
- [`src/app/student/bookings/page.tsx`](src/app/student/bookings/page.tsx:3) — `No past or future bookings`
- [`src/app/student/profile/page.tsx`](src/app/student/profile/page.tsx:3) — Personal/Contact/Emergency editable
- [`src/app/student/notifications/page.tsx`](src/app/student/notifications/page.tsx:3) — `You're all caught up`
- [`src/app/student/requests/page.tsx`](src/app/student/requests/page.tsx:5) — `StudentLayout + Card No active requests` — double nesting bug [V] at line 7
- [`src/components/layouts/StudentLayout/index.tsx`](src/components/layouts/StudentLayout/index.tsx:18) — `NAV_ITEMS` 6 items `Dashboard/Profile/Stay Management/Contracts/Payments/Documents/Requests`, `usePathname` active, header `Student Name` avatar — divergent from `src/app/student/layout.tsx` 9 items [D]

### Portal & UI Primitives

- [`src/components/portal/StatCard/index.tsx`](src/components/portal/StatCard/index.tsx:12) — `StatCardProps` title/value/subtitle/icon/trend, `Card` flex column
- [`src/components/portal/PaymentRow/index.tsx`](src/components/portal/PaymentRow/index.tsx:13) — `PaymentRowProps` id/description/amount/date/status `PAID/PENDING/OVERDUE`, grid `2fr 1fr 1fr 1fr auto`, `Download Invoice` disabled if not PAID
- [`src/components/portal/MaintenanceTicket/index.tsx`](src/components/portal/MaintenanceTicket/index.tsx:13) — `MaintenanceTicketProps` id/title/status `PENDING/IN_PROGRESS/RESOLVED`/date/priority, `Card` flex, `CheckCircle2/Clock/AlertCircle`
- [`src/components/ui/Card/index.tsx`](src/components/ui/Card/index.tsx:10) — `CardProps` shadow `none/sm/md/lg` hoverable glass, `CardHeader/Title/Description/Content/Footer` forwardRef
- [`src/components/ui/Input/index.tsx`](src/components/ui/Input/index.tsx:10) — `InputProps` label/error/fullWidth, `useId` generatedId, `errorMessage`
- [`src/components/ui/Skeleton/index.tsx`](src/components/ui/Skeleton/index.tsx:10) — `SkeletonProps` width/height/borderRadius, `styles.skeleton`
- [`src/components/ui/Button`](src/components/ui/Button) — referenced but not yet read [I] — need to verify variants `primary/secondary/outline/ghost` and sizes `sm/md/lg`
- [`src/components/ui/Select`](src/components/ui/Select) — referenced in `BookingWizard` [I] — need to verify
- [`src/components/ui/Checkbox`](src/components/ui/Checkbox) — referenced [I]

### API Layer

- [`src/lib/api/client.ts`](src/lib/api/client.ts:13) — `apiClient.fetch/get/post/patch/delete`, `API_URL NEXT_PUBLIC_SERVER_URL||localhost:3000`, `fetch /api${endpoint}`
- [`src/lib/api/auth.ts`](src/lib/api/auth.ts:3) — `authApi.requestOTP/verifyOTP/getCurrentStudent` → `/students/request-otp`, `/students/verify-otp`
- [`src/lib/api/availability.ts`](src/lib/api/availability.ts:4) — `availabilityApi.checkAvailability(propertyId)` → `GET /availability?propertyId=`
- [`src/lib/api/bookings.ts`](src/lib/api/bookings.ts:3) — `BookingPayload` property/bed/check_in_date/check_out_date/guest, `bookingsApi.createBooking/getBooking` → `POST /bookings`
- [`src/lib/api/studentPortal.ts`](src/lib/api/studentPortal.ts:4) — `studentPortalApi.getDashboardData` → `GET /students/dashboard`
- [`src/lib/api/properties.ts`](src/lib/api/properties.ts:20) — `Property` interface, `propertiesApi.getProperties` → `GET /properties?where[public_visibility][equals]=true`, `getPropertyById`
- [`src/lib/api/payments.ts`](src/lib/api/payments.ts:3) — `paymentsApi.getStudentPayments` → `GET /students/invoices` [D] misnamed — actually invoices
- [`src/lib/api/maintenance.ts`](src/lib/api/maintenance.ts:3) — `maintenanceApi.getTickets/createTicket` → `GET/POST /students/maintenance`
- [`src/lib/api/server.ts`](src/lib/api/server.ts:9) — `getServerPayload` via `getPayloadHMR` + `configPromise`, server-only
- [`src/app/api/availability/route.ts`](src/app/api/availability/route.ts:5) — `GET propertyId required`, chain `payload.find buildings→floors→rooms ACTIVE→beds AVAILABLE+VACANT`, group by room, filter `beds>0`
- [`src/app/api/students/request-otp/route.ts`](src/app/api/students/request-otp/route.ts:5) — `POST phone required`, mock `success:true`
- [`src/app/api/students/verify-otp/route.ts`](src/app/api/students/verify-otp/route.ts:3) — `POST phone+code`, `code !==123456` fails, `Buffer.from(JSON.stringify({phone,role:student})).toString(base64)` token, `cookie hms-student-token`
- [`src/app/api/students/dashboard/route.ts`](src/app/api/students/dashboard/route.ts:5) — `GET tenancies ACTIVE limit1, notices ALL_TENANTS limit5, maintenance_requests not CLOSED`
- [`src/app/api/students/invoices/route.ts`](src/app/api/students/invoices/route.ts:5) — `GET invoices limit10 sort -due_date`
- [`src/app/api/students/maintenance/route.ts`](src/app/api/students/maintenance/route.ts:5) — `GET limit10 sort -createdAt`, `POST create maintenance_requests title/description/priority MEDIUM status OPEN`

### Backend Config

- [`payload.config.ts`](payload.config.ts:45) — `buildConfig` 34 collections listed, `postgresAdapter`, `lexicalEditor`, `secret PAYLOAD_SECRET`, `typescript outputFile payload-types.ts`
- [`src/collections/Bookings/index.ts`](src/collections/Bookings/index.ts:9) — `slug bookings`, `access isStaffOfProperty`, `hooks beforeChange validateStateMachine/checkStayDuration/checkOverlappingBookings afterChange generateTenancyOnApproval/auditBookingTransitions`, fields `person→people, property, building, floor, room, bed required, start_date/end_date, status DRAFT/PENDING_PAYMENT_VERIFICATION/PENDING_ADMIN_REVIEW/APPROVED/REJECTED/CANCELLED/EXPIRED/COMPLETED, price/deposit/payment_frequency/discount/notes`

### Tests

- [`src/tests/hms-invariants.spec.ts`](src/tests/hms-invariants.spec.ts:32) — 6 tests: state machine valid/invalid, double booking concurrency, maintenance bed, check-in tenancy+bed, payment idempotency, financial partial/overpayment, contract immutability/renewal
- [`jest.config.js`](jest.config.js:1) — `preset ts-jest, testEnvironment node, testMatch **/*.spec.ts, moduleNameMapper @/, setupFilesAfterEnv src/tests/setup.ts`
- [`src/tests/setup.ts`](src/tests/setup.ts:8) — `DATABASE_URI postgres://postgres:postgres@127.0.0.1:5432/hms_test, PAYLOAD_SECRET, beforeAll wipe collections except users`

## Remaining Inventory — To Verify [V] Before Registry Compilation

### Backend — Collections 34

- Read each `src/collections/*/index.ts` for `slug, admin, access, hooks, fields, relationships, status enums, indexes`
- Priority order: `Organizations, Properties, Buildings, Floors, Rooms, Beds, Tenancies, Contracts, Invoices, Payments, Receipts, People, Students, Users, StaffProfiles, MaintenanceRequests, Documents, Media, Assets, AccessLogs, SystemAuditLogs, IntegrationLogs, Shifts, Tasks, Notices, Messages, Feedback, Visitors, NotificationLogs, Incidents, Events, EventRSVPs, Reports`
- For each capture `DATABASE` tables/fields, `API` auto-generated `/api/<slug>` + custom, `BUSINESS_RULES` from hooks, `DEPENDENCIES` hierarchy

### Backend — Services 7

- [`src/services/BookingService.ts`](src/services/BookingService.ts:1) — state machine transitions, validation
- [`src/services/PaymentService.ts`](src/services/PaymentService.ts:1) — idempotency via `transaction_reference`, allocation
- [`src/services/CheckInService.ts`](src/services/CheckInService.ts:1) — tenancy `UPCOMING→ACTIVE`, bed `VACANT→OCCUPIED`
- [`src/services/CheckOutService.ts`](src/services/CheckOutService.ts:1) — tenancy `ACTIVE→COMPLETED`, bed release, invoice settlement
- [`src/services/RoomTransferService.ts`](src/services/RoomTransferService.ts:1) — bed swap, occupancy update, audit
- [`src/services/ContractRenewalService.ts`](src/services/ContractRenewalService.ts:1) — renewal, immutability once signed
- [`src/services/AuditService.ts`](src/services/AuditService.ts:1) — append-only, `SystemAuditLogs`

### Backend — Hooks 11

- `Bookings: validateStateMachine, checkOverlappingBookings, checkStayDuration, generateTenancyOnApproval, auditBookingTransitions`
- `Payments: allocatePaymentToInvoice`
- `Contracts: immutableOnceSigned`
- `Shifts: checkOverlappingShifts`
- `AccessLogs/IntegrationLogs/SystemAuditLogs: immutableLog`

### Access & Middleware

- [`src/access/index.ts`](src/access/index.ts:1) — `isStaffOfProperty, isAdminOrSelf, isAdmin, isStudent` etc — RBAC + property scoping
- [`src/proxy.ts`](src/proxy.ts:1) — Next.js proxy/middleware, auth guard for `/staff/*` and `/student/*`, token `hms-student-token`
- [`src/app/globals.css`](src/app/globals.css:1) — design tokens `--color-gold, --bg-primary, --text-primary, --border-light, --radius-md`, `font-display`, `backdrop-blur`
- [`src/app/layout.tsx`](src/app/layout.tsx:1) — root layout, providers, `payload` init

### UI — Remaining Components

- [`src/components/ui/Button`](src/components/ui/Button) — variants, sizes, loading, disabled
- [`src/components/ui/Select`](src/components/ui/Select) — props, options, placeholder
- [`src/components/ui/Checkbox`](src/components/ui/Checkbox) — label, checked, onChange
- [`src/components/ui/Card/Card.module.css`](src/components/ui/Card/Card.module.css:1) — shadow, hoverable, glass tokens
- Verify `src/app/about/page.tsx`, `contact`, `facilities`, `faq`, `gallery`, `privacy`, `terms` — marketing completeness

## Registry Schemas

### 07.FEATURE_REGISTRY — Per Feature

```
FEATURE_ID | NAME | DESCRIPTION | USER_VALUE | FILES file:line | DATABASE collection:field | API endpoint:method | UI page/component | BUSINESS_RULES hook/service | DEPENDENCIES | STATUS [V]/[D]/[I] | SAFE_EXTENSION_POINTS
```

- Example: `F-BOOK-01 | Booking Wizard | 5-step Search→Confirm | Student books bed | src/components/booking/BookingWizard/index.tsx:19, src/lib/api/bookings.ts:20 | bookings.status, beds.operational_status | POST /api/bookings, GET /api/availability | BookingWizard, BedSelector, DocumentUploader, PaymentSummary | validateStateMachine, checkOverlappingBookings | Properties→Beds | [V] | Add payment gateway without touching state machine`

### 12.USER_FLOW_REGISTRY — Per Flow

```
FLOW_ID | USER_JOURNEY | ENTRY_POINT file:line | ACTIONS step list | SYSTEM_RESPONSE service/hook | DATA_CHANGES collection.field | FAILURE_PATHS | STATUS
```

- Flows: `UF-MKT-01 Marketing discovery`, `UF-AVAIL-01 Availability search`, `UF-BOOK-01 Booking wizard`, `UF-PAY-01 Payment`, `UF-ADMIN-01 Admin review`, `UF-TEN-01 Tenancy`, `UF-CHECKIN-01 Check-in`, `UF-TRANSFER-01 Room transfer`, `UF-CHECKOUT-01 Check-out`, `UF-RENEWAL-01 Contract renewal`, `UF-STUDENT-01 OTP login`, `UF-STUDENT-02 Dashboard`, `UF-STUDENT-03 Payments`, `UF-STUDENT-04 Maintenance`, `UF-STAFF-01 Bookings`, `UF-STAFF-02 Students`, `UF-STAFF-03 Payments`, `UF-STAFF-04 Maintenance`, `UF-STAFF-05 Properties`

### 13.UI_REGISTRY — Sections

- Pages: `src/app/page.tsx`, `hostels/*`, `booking/*`, `availability/*`, `staff/*` 8, `student/*` 9 — with layout, auth guard, data source `localStorage vs Payload`
- Components: `marketing/*` 4, `booking/*` 4, `portal/*` 3, `ui/*` 5, `auth/*` 1, `layouts/*` 2 — props, variants, usage
- Layouts: `PublicLayout`, `StudentLayout` vs `src/app/student/layout.tsx` divergence, `AdminLayout`
- Design System: tokens from `globals.css`, `tailwind.config.ts`, `Card.module.css`, `Button` variants, `Skeleton`, `Input`, `Select`, `Checkbox`, `framer-motion` patterns, `lucide-react` icons, `rounded-2xl/3xl`, `backdrop-blur-xl`
- Reusable Elements: `StatCard`, `PaymentRow`, `MaintenanceTicket`, `HostelCard`, `BedSelector`, `DocumentUploader`, `PaymentSummary`
- Interaction Patterns: `AnimatePresence mode=wait`, `motion.div initial/animate`, `useMemo` occupancy, `localStorage` persistence, `sessionStorage` return room, `OTP 6-digit + countdown`, `dragActive` uploader, `hoverable Card`

### 16.TEST_REGISTRY — Sections

- Tests: `hms-invariants.spec.ts` 6 tests with `file:line` and invariant IDs `1&2,4,5,8,11,12&14,15&16`
- Coverage Areas: Booking state machine, double booking, maintenance bed, check-in, payment idempotency, financial integrity, contract immutability
- Critical Paths: `DRAFT→COMPLETED` happy path, `PENDING_PAYMENT_VERIFICATION→APPROVED` tenancy generation, `CheckInService` bed occupancy, `PaymentService` idempotency
- Missing Coverage: `RoomTransferService`, `CheckOutService`, `ContractRenewalService`, `AuditService` append-only, RBAC property scoping, `proxy.ts` auth guard, `availability` API, `OTP` flow, `staff/students` CRUD, `payments` allocation, `maintenance` lifecycle, UI interaction, `localStorage` vs `Payload` divergence
- Regression Risks: `localStorage` mock vs real DB, `StudentLayout` double nesting, `paymentsApi` misnamed, `hms_room_overrides` sync, `transaction_reference` uniqueness, `bed dual status` drift

## Execution Steps — Todo List

- [x] Inventory marketing & public pages
- [x] Inventory staff portal core
- [x] Inventory student portal core
- [x] Inventory components and lib/api + app/api
- [-] Inventory backend 34 collections, 7 services, 11 hooks, access, proxy, globals
- [ ] Map user flows with Entry Point, Actions, System Response, Data Changes, Failure Paths
- [ ] Map UI registry with Pages, Components, Layouts, Design System, Reusable Elements, Interaction Patterns
- [ ] Map test registry with Tests, Coverage Areas, Critical Paths, Missing Coverage, Regression Risks
- [ ] Compile registries 07, 12, 13, 16 with [V]/[D]/[I] + file:line, no hallucination, attempt_completion

## Mermaid Diagrams

### Booking & Tenancy Lifecycle

```mermaid
flowchart TD
    A[Marketing Discovery] --> B[Availability Search]
    B --> C[Booking Wizard]
    C --> D[Payment Pending Verification]
    D --> E[Admin Review]
    E --> F[Approved]
    F --> G[Tenancy Upcoming]
    G --> H[Check In]
    H --> I[Tenancy Active]
    I --> J[Room Transfer]
    I --> K[Check Out]
    K --> L[Tenancy Completed]
    L --> M[Contract Renewal]
    E --> N[Rejected]
    D --> O[Expired]
    F --> P[Cancelled]
```

### Staff vs Student Flows

```mermaid
flowchart LR
    subgraph Student
        S1[OTP Login] --> S2[Dashboard]
        S2 --> S3[Payments]
        S2 --> S4[Maintenance]
        S2 --> S5[Room]
        S2 --> S6[Contracts]
        S2 --> S7[Documents]
    end
    subgraph Staff
        T1[Dashboard] --> T2[Properties]
        T1 --> T3[Students]
        T1 --> T4[Bookings]
        T1 --> T5[Payments]
        T1 --> T6[Maintenance]
        T1 --> T7[Inbox]
    end
    S1 -.-> T4
    T4 -.-> S2
```

### UI Registry Structure

```mermaid
flowchart TD
    Pages --> Marketing
    Pages --> Booking
    Pages --> Student
    Pages --> Staff
    Components --> MarketingComp
    Components --> BookingComp
    Components --> PortalComp
    Components --> UIPrimitives
    Layouts --> PublicLayout
    Layouts --> StudentLayout
    Layouts --> AdminLayout
    DesignSystem --> Tokens
    DesignSystem --> Motion
    DesignSystem --> Icons
```

## Evidence & Truth Classification Rules

- `[V]` Verified — directly read `file:line`, e.g., `src/app/staff/payments/page.tsx:6 INITIAL_PAYMENTS []`
- `[D]` Derived — logically derived from verified files, e.g., `StudentLayout` divergence between `src/components/layouts/StudentLayout/index.tsx:8` 6 items vs `src/app/student/layout.tsx:9` 9 items
- `[I]` Inferred — plausible but not yet verified, e.g., `Button` variants — must be verified before registry finalization
- Every registry row must have at least one `file:line` citation; no hallucination; `localStorage` mock vs `Payload` real must be explicitly flagged

## Risks & Dependencies

- `localStorage` mock persistence in `staff/*` vs `Payload` collections — divergence risk for `07.FEATURE_REGISTRY` STATUS
- `StudentLayout` double nesting in `src/app/student/requests/page.tsx:7` — UI registry must flag
- `paymentsApi` misnamed `getStudentPayments → /students/invoices` — API registry must note
- `hms_room_overrides` sync across `properties`, `students/add`, `students/[id]` — consistency risk
- `proxy.ts` auth guard not yet verified — blocks `12.USER_FLOW_REGISTRY` failure paths
- `34 collections` + `7 services` + `11 hooks` — largest remaining work, requires sequential `read_file` to avoid hallucination

## Outputs

- `07.FEATURE_REGISTRY.md` — complete inventory table with `FEATURE_ID` etc + `SAFE_EXTENSION_POINTS`
- `12.USER_FLOW_REGISTRY.md` — flow tables with `User Journey, Entry Point, Actions, System Response, Data Changes, Failure Paths`
- `13.UI_REGISTRY.md` — pages/components/layouts/design system/reusable elements/interaction patterns with `file:line`
- `16.TEST_REGISTRY.md` — tests/coverage/critical paths/missing coverage/regression risks from `hms-invariants.spec.ts:32`

## Approval Request

Plan ready for review. Confirm if registry schemas, file lists, and mermaid flows match expected scope, or request changes before switching to `code` mode for implementation.
