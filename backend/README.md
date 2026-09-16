# VisionPulse — Sales & Operations Dashboard Backend

Production-grade Node.js / Express + MongoDB backend implementing the complete architecture and metric calculation engine for the Sales & Operations Dashboard.

---

## 🛠 Features & Architecture Highlights

- **MongoDB via Mongoose:** Strict schema validation with integer currency sub-units (forbidding float rounding errors).
- **Core KPI Engine:** Real-time aggregation pipelines covering:
  - **Sales Performance:** Total Sales, Orders, AOV, Period-over-Period Growth.
  - **Orders & Fulfillment:** Status Distribution, Fulfillment Rate, Avg Fulfillment Time.
  - **Inventory Snapshot & Turnover:** Real-time Stock Value, Low/Out-of-Stock alerts, Period COGS & Turnover.
  - **Receivables & Collections:** Total Outstanding, Overdue Aging, Avg Days to Pay.
  - **Analytics & Top Performers:** Top Products, Top Customers, Regional Sales, Return Rate, Repeat Customer Rate.
- **Single-Pipeline Reuse:** Summary KPI cards and drill-down tables share identical aggregation filters ("card and list can never disagree").
- **Strict Role-Based Access Control (RBAC):** `Admin`, `Manager`, and `Viewer` with automatic server-side privacy redaction for Viewers.
- **Section 2.6 Import Engine:** Batch CSV/JSON validator with referential checks, sequence validation, and partial acceptance reporting.
- **In-Memory Caching:** 60-second TTL cache with explicit invalidation hooks on seed/import.
- **Reproducible Seed Generator:** Deterministic RNG (`seedrandom`) covering all Section 10.2 edge cases.

---

## 🚀 Getting Started

### 1. Installation
```bash
cd backend
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure your MongoDB URI:
```bash
cp .env.example .env
```

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/sales_dashboard
PORT=4000
NODE_ENV=development
JWT_SECRET=your_secret_jwt_key_here
```

### 3. Seed Database
Run the deterministic seed generator:
```bash
# Demo dataset (with all guaranteed edge cases)
npm run seed

# Large dataset (stress-testing and performance validation)
npm run seed:large
```

### 4. Run Development Server
```bash
npm run dev
```

The API will be live at `http://localhost:4000`. Test the health endpoint at `http://localhost:4000/health`.

---

## 🧪 Automated Testing

Run the test suite mapped to Section 11 of the specification:
```bash
# Run all unit and integration tests
npm test

# Run unit tests only
npm run test:unit
```

---

## ☁️ Vercel Serverless Deployment

This backend is pre-configured for deployment as a serverless microservice on **Vercel**:

1. **Serverless Entrypoint:** Automatically routes all `/api/v1/*` requests through `api/index.js` via `vercel.json` rewrites.
2. **Connection Pooling & Caching:** Uses cached connection checking in `src/config/db.js` with `bufferCommands: false` to ensure zero connection leaks across serverless function invocations.
3. **Build Verification Gate:** `npm run build` runs static syntax and entrypoint validation before deploying.

### Required Vercel Environment Variables:
- `MONGODB_URI`: Connection string to MongoDB Atlas.
- `JWT_SECRET`: Secret key used for signing session tokens.
- `NODE_ENV`: `production`
- `DEFAULT_CURRENCY_CODE`: `PKR`
- `DEFAULT_TIMEZONE`: `Asia/Karachi`

---

## 🔑 Default Staff Credentials (after seeding)

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@visionpulse.pk` | `AdminPass123!` | Full Read/Write & User Management |
| **Manager** | `manager@visionpulse.pk` | `ManagerPass123!` | Read & Batch Import |
| **Viewer** | `viewer@visionpulse.pk` | `ViewerPass123!` | Read-Only (Sanitized Customer & Cost fields) |

