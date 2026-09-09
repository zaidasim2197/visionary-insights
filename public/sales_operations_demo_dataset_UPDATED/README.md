
# Sales & Operations Demo Dataset

Vision71 Technologies

## Dataset status

Final corrected demo dataset.

Reference date: 2026-09-01

Customers: 120
Products: 72
Orders: 3200
Order Items: 11486

## Inventory profile

- In Stock: 52
- Low Stock: 11
- Out of Stock: 7
- Inventory Discrepancy: 2

## Receivables

Outstanding receivables:
PKR 264,004,738

Overdue receivables:
PKR 91,287,110

Overdue share:
34.58%

Receivables now contain a realistic mix of:

- Paid
- Current
- Due Soon
- Overdue

All payment records reconcile exactly to the corresponding
receivable amount_paid.

## Operational KPIs

Completed deliveries:
2369

On-time deliveries:
1775

Delayed deliveries:
594

On-time delivery rate:
74.93%

Average delivery lead time:
6.98 days

## Data relationships

customers.customer_id
-> orders.customer_id

orders.order_id
-> order_items.order_id

products.product_id
-> order_items.product_id

orders.order_id
-> returns.order_id

products.product_id
-> inventory.product_id

products.product_id
-> stock_movements.product_id

orders.order_id
-> receivables.order_id

receivables.invoice_id
-> payments.invoice_id

## Important

Every KPI should be derived from the underlying transactional
tables rather than hard-coded dashboard values.
