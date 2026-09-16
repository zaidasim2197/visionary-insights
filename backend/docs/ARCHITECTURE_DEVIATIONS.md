# Architecture Deviations & MongoDB Modeling Decisions

This document records all deliberate technical modeling decisions and architecture translations from the relational specification (`Sales_and_Operations_Dashboard_-_Architecture_and_Metric_Definition_-_Haroon.pdf`) to the MongoDB / Express implementation.

---

## 1. Relational ERD to MongoDB Document Model

### Deviation / Modeling Decision:
The architecture specification describes a relational ERD with foreign keys and joins (`Customer`, `Product`, `CustomerOrder`, `OrderLine`, `InventoryMovement`, `InventoryPosition`, `Receivable`).

### Approach Adopted:
We modeled these entities as **separate standalone MongoDB collections** with Mongoose references (`ObjectId`) rather than deeply nested embedded sub-documents.

### Technical Rationale:
1. **"No Number Stored Twice" Principle (Section 2.3):**  
   Keeping `OrderLine` and `InventoryMovement` as independent collections ensures that both summary KPI aggregations and drill-down table queries evaluate the exact same atomic source records.
2. **Independent Lifecycle & Append-Only Auditing:**  
   `InventoryMovement` and `Receivable` have independent lifecycles from orders (e.g., partial payments, warehouse adjustments, stock replenishments).
3. **Compensating Referential Controls:**  
   Since MongoDB lacks native foreign key constraints, referential integrity is strictly enforced at the application and repository layer via [ImportValidator.js](file:///backend/src/validators/importValidator.js) and Mongoose pre-save validations.

---

## 2. Integer Currency Subunit Representation

### Deviation / Modeling Decision:
All currency and price fields are stored strictly as **integers representing currency subunits (paisas / cents)** rather than floating-point numbers.

### Technical Rationale:
1. Prevents standard IEEE-754 floating-point rounding errors during MongoDB aggregation `$sum`, `$multiply`, and `$avg` stages.
2. Mongoose schemas enforce `Number.isInteger` validation.
3. Display string formatting (`formatMoney`) is executed only at the API response serialization boundary, never in database storage.

---

## 3. Inventory Position Atomic Synchronization

### Deviation / Modeling Decision:
`InventoryPosition` is maintained as a real-time live snapshot collection updated atomically alongside each `InventoryMovement` write via `InventoryTransactionService.recordMovement()`.

### Technical Rationale:
1. Provides $O(1)$ live stock valuation queries for dashboard cards without requiring full table scans over millions of historical movement records.
2. An on-demand recalculation pipeline (`recalculatePosition`) is provided to verify and re-synchronize snapshot balances if needed.

---

## 4. Single-Pipeline Reuse for Summary & Drill-Downs

### Deviation / Modeling Decision:
Every KPI service utilizes a single exported query builder from its respective repository.

### Technical Rationale:
Guarantees the core architectural requirement that summary cards and drill-down tables can never diverge or present conflicting numbers.

---

## 5. In-Memory Response Caching & Invalidation Contract

### Deviation / Modeling Decision:
Implemented an in-memory 60-second TTL cache keyed by `method + path + query + userRole`.

### Technical Rationale:
1. Minimizes unnecessary database load for high-traffic dashboard views.
2. The cache is explicitly invalidated (`invalidateCache()`) immediately after `seed` or batch `import` operations, ensuring tests and fresh imports never encounter stale data.

---

## 6. Server-Side Viewer Data Redaction

### Deviation / Modeling Decision:
Role-based access control enforces data privacy server-side. When `req.user.role === 'Viewer'`, customer names, emails, and cost figures (`unitCost`, `unitCostAtSale`) are sanitized/omitted prior to response transmission.
