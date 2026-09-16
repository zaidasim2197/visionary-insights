# VisionPulse Sales & Operations Dashboard — API Documentation

**Base URL:** `/api/v1`  
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

## 2. Sales Endpoints

### GET `/api/v1/sales/summary`
- **Access:** Admin, Manager, Viewer
- **Query Parameters:**
  - `preset`: `today` | `week` | `month` (default) | `quarter` | `year` | `custom`
  - `from`: `YYYY-MM-DD` (optional, for custom preset)
  - `to`: `YYYY-MM-DD` (optional, for custom preset)
- **Response 200 OK:**
  ```json
  {
    "data": {
      "period": { "preset": "month", "fromDate": "2026-03-01T...", "toDate": "2026-03-31T..." },
      "current": { "totalSales": 125000000, "totalOrders": 34, "averageOrderValue": 3676471 },
      "previous": { "totalSales": 110000000, "totalOrders": 30, "averageOrderValue": 3666667 },
      "growth": { "salesGrowthPercent": 13.64, "ordersGrowthPercent": 13.33 }
    },
    "recordCount": 1,
    "generatedAt": "2026-09-15T12:00:00.000Z"
  }
  ```

### GET `/api/v1/sales/drilldown`
- **Access:** Admin, Manager, Viewer *(Viewer has `customerName` redacted)*
- **Query Parameters:** `preset`, `from`, `to`, `page` (default 1), `limit` (default 25), `search`
- **Response 200 OK:** Paginated list of matching non-cancelled orders.

---

## 3. Orders & Fulfillment Endpoints

### GET `/api/v1/orders/summary`
- **Access:** Admin, Manager, Viewer
- **Response 200 OK:**
  ```json
  {
    "data": {
      "totalOrders": 45,
      "statusCounts": {
        "Pending": 4,
        "Processing": 3,
        "Shipped": 5,
        "Delivered": 30,
        "Cancelled": 2,
        "Returned": 1
      },
      "fulfillmentRate": 69.77,
      "avgFulfillmentHours": 34.5
    },
    "recordCount": 1,
    "generatedAt": "2026-09-15T12:00:00.000Z"
  }
  ```

### GET `/api/v1/orders/drilldown`
- **Access:** Admin, Manager, Viewer
- **Query Parameters:** `preset`, `status` (`ALL`, `Pending`, `Delivered`, etc.), `page`, `limit`, `search`

---

## 4. Inventory Endpoints

### GET `/api/v1/inventory/summary`
- **Access:** Admin, Manager, Viewer
- **Response 200 OK:**
  ```json
  {
    "data": {
      "snapshotTime": "2026-09-15T12:00:00.000Z",
      "liveSnapshot": {
        "totalStockValue": 450000000,
        "totalActiveProducts": 12,
        "lowStockCount": 1,
        "outOfStockCount": 1
      },
      "periodTurnover": {
        "period": { "preset": "month", "fromDate": "...", "toDate": "..." },
        "cogs": 85000000,
        "inventoryTurnoverRate": 0.19
      }
    },
    "recordCount": 1,
    "generatedAt": "2026-09-15T12:00:00.000Z"
  }
  ```

### GET `/api/v1/inventory/drilldown`
- **Access:** Admin, Manager, Viewer *(Viewer has `unitCost` omitted)*
- **Query Parameters:** `status` (`ALL`, `In Stock`, `Low Stock`, `Out of Stock`), `category`, `page`, `limit`, `search`

---

## 5. Receivables Endpoints

### GET `/api/v1/receivables/summary`
- **Access:** Admin, Manager, Viewer
- **Response 200 OK:**
  ```json
  {
    "data": {
      "snapshotTime": "2026-09-15T12:00:00.000Z",
      "liveSnapshot": {
        "totalOutstanding": 18500000,
        "overdueAmount": 6500000,
        "overdueInvoicesCount": 3
      },
      "periodPaidMetrics": {
        "period": { "preset": "month", "fromDate": "...", "toDate": "..." },
        "paidInvoicesCount": 28,
        "avgDaysToPay": 14.2
      }
    },
    "recordCount": 1,
    "generatedAt": "2026-09-15T12:00:00.000Z"
  }
  ```

### GET `/api/v1/receivables/drilldown`
- **Access:** Admin, Manager, Viewer
- **Query Parameters:** `status` (`ALL`, `Unpaid`, `Partially Paid`, `Paid`, `OVERDUE`), `page`, `limit`, `search`

---

## 6. Analytics & Operational Endpoints

### GET `/api/v1/analytics/summary`
- **Access:** Admin, Manager, Viewer
- **Response 200 OK:**
  - `topProducts`: Top 5 products by sales volume & revenue.
  - `topCustomers`: Top 5 customers by total spend.
  - `regionalSales`: Revenue breakdown grouped by customer region.
  - `operational`: Return Rate (%) and Repeat Customer Rate (%).

---

## 7. Import Endpoints

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
