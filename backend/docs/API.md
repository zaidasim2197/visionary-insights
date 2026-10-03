# VisionPulse Sales & Operations Dashboard — API Documentation

**Specification Reference:** Section 5 (API Contract) & Section 6 (Security Matrix)  
**Authentication:** Header `Authorization: Bearer <JWT_TOKEN>` on all protected endpoints.  
**Standard Response Attributes:** All responses include `recordCount` and `generatedAt` (ISO 8601 UTC).

---

## 1. Authentication Endpoints

### POST `/api/v1/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "admin@visionpulse.pk",
    "password": "AdminPass123!"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "data": {
      "token": "eyJhbGciOi...",
      "expiresIn": "8h",
      "user": {
        "id": "65f123...",
        "name": "Sarah Connor (Admin)",
        "email": "admin@visionpulse.pk",
        "role": "Admin"
      }
    },
    "recordCount": 1,
    "generatedAt": "2026-09-15T12:00:00.000Z"
  }
  ```

---

## 2. Section 5 API Contract Endpoints (`/api/dashboard`)

### 2.1 Sales Endpoints
| Endpoint | Method | Key Parameters | Role Access (Section 6) | Purpose |
|---|---|---|---|---|
| `/api/dashboard/kpis/sales` | `GET` | `from`, `to` | Admin, Manager, Viewer | Total Sales, Total Orders, Average Order Value, Sales Growth |
| `/api/dashboard/trends/sales` | `GET` | `from`, `to`, `granularity` | Admin, Manager, Viewer | Monthly sales series for trend chart |

### 2.2 Orders & Fulfillment Endpoints
| Endpoint | Method | Key Parameters | Role Access (Section 6) | Purpose |
|---|---|---|---|---|
| `/api/dashboard/kpis/orders` | `GET` | `from`, `to` | Admin, Manager, Viewer | Orders Pending, Delivered, Cancelled, Fulfillment Rate |
| `/api/dashboard/trends/orders` | `GET` | `from`, `to`, `granularity` | Admin, Manager, Viewer | Order status series for trend chart |
| `/api/dashboard/orders` | `GET` | `status`, `customer`, `from`, `to`, `page` | **Admin, Manager ONLY** (Viewer 403) | Paginated drill-down order list |
| `/api/dashboard/orders/{id}` | `GET` | `id` | **Admin, Manager ONLY** (Viewer 403) | Single order detail with line items |

### 2.3 Inventory Endpoints
| Endpoint | Method | Key Parameters | Role Access (Section 6) | Purpose |
|---|---|---|---|---|
| `/api/dashboard/kpis/inventory/counts` | `GET` | *none* | Admin, Manager, Viewer | Items Low on Stock, Out of Stock, Total Active Products |
| `/api/dashboard/trends/inventory` | `GET` | `from`, `to`, `granularity` | Admin, Manager, Viewer | Stock in vs stock out series for trend chart |
| `/api/dashboard/kpis/inventory/value` | `GET` | *none* | **Admin, Manager ONLY** (Viewer 403) | Total Stock Value (Live snapshot) |
| `/api/dashboard/inventory/lowstock` | `GET` | `page` | **Admin, Manager ONLY** (Viewer 403) | Drill down low stock product list |
| `/api/dashboard/inventory/outofstock` | `GET` | `page` | **Admin, Manager ONLY** (Viewer 403) | Drill down out of stock product list |

### 2.4 Receivables Endpoints
| Endpoint | Method | Key Parameters | Role Access (Section 6) | Purpose |
|---|---|---|---|---|
| `/api/dashboard/kpis/receivables` | `GET` | `from`, `to` | **Admin, Manager ONLY** (Viewer 403) | Total Outstanding, Overdue Amount/Count, Avg Days to Pay |
| `/api/dashboard/receivables/aging` | `GET` | *none* | **Admin, Manager ONLY** (Viewer 403) | Aging bucket breakdown (0-30, 31-60, 61-90, 90+) |
| `/api/dashboard/receivables/outstanding` | `GET` | `page` | **Admin, Manager ONLY** (Viewer 403) | Drill down outstanding invoices list |
| `/api/dashboard/receivables/overdue` | `GET` | `page` | **Admin, Manager ONLY** (Viewer 403) | Drill down overdue invoices list |
| `/api/dashboard/receivables/{id}` | `GET` | `id` | **Admin, Manager ONLY** (Viewer 403) | Single invoice detail |
| `/api/dashboard/trends/receivables` | `GET` | `from`, `to`, `granularity` | **Admin, Manager ONLY** (Viewer 403) | Outstanding & overdue trend series |

### 2.5 Rankings Endpoints
| Endpoint | Method | Key Parameters | Role Access (Section 6) | Purpose |
|---|---|---|---|---|
| `/api/dashboard/rankings/products` | `GET` | `from`, `to`, `limit` | **Admin, Manager ONLY** (Viewer 403) | Top 5 products by sales |
| `/api/dashboard/rankings/customers` | `GET` | `from`, `to`, `limit` | **Admin, Manager ONLY** (Viewer 403) | Top 5 customers by sales |

### 2.6 Operational KPIs Endpoints
| Endpoint | Method | Key Parameters | Role Access (Section 6) | Purpose |
|---|---|---|---|---|
| `/api/dashboard/kpis/operational` | `GET` | `from`, `to` | **Admin, Manager ONLY** (Viewer 403) | Fulfillment Time, Return Rate, Repeat Customer Rate, Inventory Turnover |
| `/api/dashboard/trends/operational` | `GET` | `from`, `to`, `granularity` | **Admin, Manager ONLY** (Viewer 403) | Operational trends series |
| `/api/dashboard/operational/fulfillment-time/drilldown` | `GET` | `from`, `to`, `page` | **Admin, Manager ONLY** (Viewer 403) | Delivered orders behind Average Fulfillment Time |
| `/api/dashboard/operational/returns/drilldown` | `GET` | `from`, `to`, `page` | **Admin, Manager ONLY** (Viewer 403) | Returned orders behind Return Rate |
| `/api/dashboard/operational/repeat-customers/drilldown` | `GET` | `from`, `to`, `page` | **Admin, Manager ONLY** (Viewer 403) | Customers behind Repeat Customer Rate |
| `/api/dashboard/operational/inventory-turnover/drilldown` | `GET` | `from`, `to`, `page` | **Admin, Manager ONLY** (Viewer 403) | Products behind Inventory Turnover |

---

## 3. Order Import Endpoint

### POST `/api/v1/import/orders`
- **Access:** Admin, Manager only (Viewer returns 403 Forbidden)
- **Request Body:** Array of CSV/JSON invoice rows:
  ```json
  [
    {
      "invoiceNumber": "INV-2026-9001",
      "customerCode": "CUST-001",
      "productCode": "PRD-101",
      "orderDate": "2026-09-10",
      "quantity": 2,
      "unitPrice": 16500000,
      "isReturn": false
    }
  ]
  ```
- **Response 200 / 207 Multi-Status:**
  ```json
  {
    "data": {
      "totalProcessed": 1,
      "acceptedCount": 1,
      "rejectedCount": 0,
      "rejectedRecords": []
    },
    "recordCount": 1,
    "generatedAt": "2026-09-15T12:00:00.000Z"
  }
  ```
