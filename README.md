# Visionary Insights

Build the complete Sales & Operations Management Dashboard for Vision71 Technologies.

This is a production-quality B2B dashboard and must be treated as a real working business intelligence product, NOT a static mockup, generic admin template, or collection of decorative charts.

I will provide:

1. Ibrahim's complete Sales & Operations dataset ZIP.

2. Haroon's finalized "Sales and Operations Dashboard - Architecture and Metric Definition" document.

IMPORTANT:

Haroon's architecture and metric-definition document is the SINGLE SOURCE OF TRUTH for:

- KPI definitions

- KPI formulas

- Data entities

- Field names

- Date behavior

- Financial calculations

- API structure

- Security/access rules

- Page structure

- Performance expectations

- Drill-down behavior

Do not invent alternative formulas or business rules.

The UI must follow the architecture and metric definitions exactly while presenting them through a much more polished, modern, premium and user-friendly visual experience.

============================================================

1. PRODUCT PURPOSE

============================================================

The purpose of this dashboard is:

BUSINESS DATA → MANAGEMENT INFORMATION → MANAGEMENT DECISIONS

A manager should be able to open the application and understand the most important business situation in approximately 10 seconds.

The dashboard should immediately answer:

- How much are we selling?

- How are sales performing?

- How many orders are being processed or delivered?

- How efficiently are orders being fulfilled?

- What is the current inventory position?

- Which products are low or out of stock?

- How much money is outstanding?

- How much is overdue?

- Which products are performing best?

- Which customers are generating the most sales?

- How efficiently is the operation performing?

- What needs management attention?

The interface must turn complex business data into simple, highly readable management information.

============================================================

2. DESIGN DIRECTION

============================================================

I am providing two modern dashboard reference images in this conversation.

Use them as visual inspiration.

Do NOT copy them literally.

Create an ORIGINAL Vision71 design inspired by:

- Premium modern SaaS dashboards

- Bento-style layouts

- Floating navigation

- Large rounded cards

- Soft neutral backgrounds

- Spacious layouts

- Strong typography

- Elegant data visualization

- Asymmetric card sizing

- Minimal visual noise

- Subtle borders

- Restrained shadows

- Clean status indicators

- Modern controls

- Smooth micro-interactions

- Excellent information hierarchy

The final UI should feel:

MODERN

PREMIUM

CALM

SPACIOUS

INTELLIGENT

FAST

PROFESSIONAL

CLIENT-READY

It should look like a premium commercial B2B analytics product that Vision71 Technologies could confidently demonstrate to a real client.

============================================================

3. VERY IMPORTANT: NO OLD-STYLE ADMIN DASHBOARD

============================================================

DO NOT create a traditional permanent left sidebar.

Do NOT create a dashboard that looks like:

- Old ERP software

- Bootstrap admin panel

- Generic React admin template

- Dense enterprise software

- Excessive tables

- Hundreds of small cards

- Tiny unreadable text

- Large navigation sidebar

Instead use:

A FLOATING HORIZONTAL NAVIGATION HEADER.

Desktop example:

[ Vision71 ]   Overview   Sales   Orders   Inventory   Receivables   Top Performers   Operations   AI Assistant

                                                        Search   Theme   Alerts   Profile

The exact arrangement may be improved visually.

On mobile, convert this into a compact modern navigation drawer/menu.

============================================================

4. FONT AND TYPOGRAPHY

============================================================

Use:

PRIMARY FONT:

Jakarta Sans

Use Jakarta Sans consistently throughout the application.

Do NOT use:

- Arial

- Inter

- Roboto

- system-default fonts

Typography should feel modern and premium.

Recommended hierarchy:

Large KPI:

Semibold / Bold

Page heading:

Semibold

Section heading:

Medium / Semibold

Body:

Regular / Medium

Supporting text:

Regular

Do not make text unnecessarily large.

Do not make text unnecessarily tiny.

Prioritize readability.

============================================================

5. SPACING IS CRITICAL

============================================================

The dashboard must feel "khula khula", relaxed and spacious.

Do not cram information together.

Use generous:

- Card padding

- Section spacing

- Grid gaps

- Header spacing

- Chart margins

- Text spacing

Every section should breathe.

Avoid visual clutter.

Do not put too many elements inside one card.

Avoid unnecessary decorative elements.

The user should never feel:

"Too much is happening here."

Instead the feeling should be:

"I can understand this immediately."

============================================================

6. ONE-SCREEN PAGE PRINCIPLE

============================================================

Follow Haroon's layout rule strictly.

Each page should contain:

3 to 4 KPI cards

PLUS

3 to 4 supporting charts/lists.

Nothing more should be unnecessarily added.

Each page should fit into one screen at its intended desktop viewport.

Avoid excessive vertical scrolling.

Avoid unnecessary horizontal scrolling.

The entire page should be understandable without scrolling through a long analytics report.

On smaller screens, responsive reflow is allowed and necessary.

Do NOT sacrifice readability simply to force everything into one screen on mobile.

============================================================

7. APPLICATION STRUCTURE

============================================================

Create these primary areas:

1. Sales Performance

2. Orders & Fulfillment

3. Inventory

4. Receivables

5. Top Performers

6. Operational KPIs

7. AI Assistant

Use a modern floating top navigation to access them.

The Overview/default landing experience should be the Sales Performance page.

============================================================

8. GLOBAL DATE FILTER

============================================================

Every dashboard page must have a modern date-range control at the top.

Supported presets:

- Today

- This Week

- This Month

- This Quarter

- This Year

- Custom Range

The selected range must affect every relevant KPI and chart on that page.

The date range is:

INCLUSIVE of the start date

through the END date.

If no range is selected:

DEFAULT:

Current month.

Use Pakistan Standard Time for displayed dates.

Dates/timestamps follow the architecture document's UTC storage and PKT display rules.

IMPORTANT:

Do not apply the date filter to metrics explicitly defined as live snapshots.

For example:

Total Stock Value = LIVE SNAPSHOT

Total Outstanding = LIVE SNAPSHOT

These must remain unaffected by the date filter.

============================================================

9. KPI ACCURACY

============================================================

This is CRITICAL.

Every number shown in the application must originate from the real dataset / backend API.

NEVER:

- Hard-code KPI values

- Hard-code chart values

- Fake growth percentages

- Invent rankings

- Generate placeholder business numbers

- Randomize chart data

- Use fictional customers/products

- Use numbers simply to make the UI look populated

Haroon's formulas are authoritative.

The UI is responsible for DISPLAYING the backend results, not creating alternative business definitions.

The same calculation logic used by an API must correspond to the drill-down records behind that number.

============================================================

10. SALES PERFORMANCE PAGE

============================================================

Create the Sales Performance page.

KPI cards:

1. Total Sales

2. Total Orders

3. Average Order Value

4. Sales Growth

Definitions and formulas MUST follow Haroon's document exactly.

Total Sales:

Sum quantity × unit price across every order line for orders that are not cancelled and whose order date falls in the selected range.

Total Orders:

Count of orders that are not cancelled within the selected range.

Average Order Value:

Total Sales / Total Orders.

Sales Growth:

Current period sales compared against the previous period of equal length.

Do not invent growth percentages.

If a previous-period comparison cannot be calculated, clearly show an appropriate no-comparison state.

Supporting visualizations:

1. Monthly Sales Trend

2. Sales by Category

3. Growth vs Previous Period

4. Order Value Distribution

Use modern visualizations.

Do NOT simply create four basic bar/line charts.

Recommended visual language:

- Smooth area chart

- Elegant category visualization

- Comparison visualization

- Distribution visualization

- Small supporting sparklines where useful

Charts must be easy to understand without requiring a legend-heavy explanation.

============================================================

11. ORDERS & FULFILLMENT PAGE

============================================================

KPI cards:

1. Orders Pending

2. Orders Delivered

3. Orders Cancelled

4. Fulfillment Rate

Follow Haroon's exact definitions.

Orders Pending:

Pending + Processing orders in selected range.

Orders Delivered:

Delivered orders in selected range.

Orders Cancelled:

Cancelled orders in selected range.

Fulfillment Rate:

Orders Delivered / Total Orders × 100.

Supporting visualizations:

1. Order Status Breakdown

2. Orders Over Time

3. Status Distribution / Processing Overview

4. Fulfillment Rate Trend

Use modern donut/radial/area/progress visualizations where appropriate.

Make status colors intuitive and restrained.

Clicking relevant KPI cards should open the appropriate filtered order drill-down where the user's role allows it.

============================================================

12. INVENTORY PAGE

============================================================

KPI cards:

1. Total Stock Value

2. Items Low on Stock

3. Items Out of Stock

4. Total Active Products

IMPORTANT:

Total Stock Value is a LIVE SNAPSHOT and is NOT affected by the date filter.

Formula:

Sum quantity on hand × unit cost across all active products.

Items Low on Stock:

quantity on hand > 0

AND

quantity on hand <= reorder threshold

Items Out of Stock:

quantity on hand = 0

Total Active Products:

Count of products marked active.

Supporting visualizations:

1. Low Stock Items

2. Stock Value by Category

3. Stock Health / Stock Status

4. Fastest Moving Products

Use modern charts such as:

- Radial/gauge

- Horizontal ranking

- Area/sparkline

- Segmented status visualization

- Category visualization

Do not use basic charts everywhere.

Clicking Low Stock should open the low-stock drill-down.

============================================================

13. RECEIVABLES PAGE

============================================================

KPI cards:

1. Total Outstanding

2. Overdue Amount

3. Overdue Invoices

4. Average Days to Pay

IMPORTANT:

Total Outstanding is a LIVE SNAPSHOT and is NOT affected by the date filter.

Total Outstanding:

Sum invoice amount minus paid amount for invoices whose status is not Paid.

Overdue Amount:

Sum invoice amount minus paid amount where due date is before today and status is not Paid.

Overdue Invoices:

Count invoices where due date is before today and status is not Paid.

Average Days to Pay:

Average payment date minus invoice date across invoices marked Paid within selected range.

Supporting visualizations:

1. Aging Buckets

2. Outstanding Over Time

3. Top Overdue Customers

4. Payment Status Split

Use modern:

- Aging visualization

- Smooth trend chart

- Horizontal ranking

- Donut/radial chart

Financial information must follow Haroon's security matrix.

============================================================

14. TOP PERFORMERS PAGE

============================================================

KPI/summary area:

1. Top Product

2. Top Customer

3. Top 5 Products

4. Top 5 Customers

Top Products by Sales:

Rank products by sum of quantity × unit price across their order lines in selected range, excluding cancelled orders.

Top Customers by Sales:

Rank customers by their order totals in selected range, excluding cancelled orders.

Supporting visualizations:

1. Top 5 Products by Sales

2. Top 5 Customers by Sales

3. Sales by Category

4. Other meaningful dataset-supported comparison

Do not invent unsupported metrics.

Use elegant horizontal ranking visualizations rather than conventional tables where possible.

Make the top performer visually obvious.

============================================================

15. OPERATIONAL KPIs PAGE

============================================================

KPI cards:

1. Average Fulfillment Time

2. Return Rate

3. Repeat Customer Rate

4. Inventory Turnover

Follow Haroon's formulas exactly.

Average Fulfillment Time:

Average delivered date minus order date across Delivered orders in selected range.

Return Rate:

Returned orders / Total Orders × 100.

Repeat Customer Rate:

Customers with more than one order in selected range / total unique customers in selected range × 100.

Inventory Turnover:

Cost of goods sold in selected range / average inventory value in same range.

Supporting visualizations:

1. Fulfillment Time Trend

2. Return Rate Trend

3. Repeat vs New Customers

4. Inventory Turnover Trend

Use modern visualization techniques.

============================================================

16. INFORMATION [i] ICONS

============================================================

Every KPI card and every important chart/metric must have a small elegant:

[i]

information icon.

Do NOT use large distracting help icons.

On click/hover, show a concise explanation in simple business language.

Example:

TOTAL SALES

"Total value of sales during the selected period, excluding cancelled orders."

Then optionally:

Formula:

Quantity × Unit Price

Source:

Order Lines + Orders

Keep the explanation simple.

Do not overwhelm the user with database terminology.

The user should understand:

What is this?

How is it calculated?

What does it include/exclude?

The information UI should be modern, compact and polished.

============================================================

17. DRILL-DOWN

============================================================

Every KPI that supports drill-down must be clickable.

When clicked, open the matching filtered records.

The drill-down must use the SAME logic as the KPI.

Examples:

Total Sales

→ Sales/order records contributing to the value

Total Orders

→ Matching orders

Orders Cancelled

→ Cancelled orders

Low Stock

→ Low-stock products

Out of Stock

→ Out-of-stock products

Overdue Invoices

→ Overdue receivables

Top Product

→ Product-related sales

Top Customer

→ Customer-related sales

The card and drill-down must never disagree.

============================================================

18. API-FIRST INTEGRATION

============================================================

Haroon's API contract is the source of truth.

Build the frontend so each screen connects to the corresponding API endpoint.

Expected endpoints include:

GET /api/dashboard/kpis/sales

GET /api/dashboard/trends/sales

GET /api/dashboard/kpis/orders

GET /api/dashboard/orders

GET /api/dashboard/orders/{id}

GET /api/dashboard/kpis/inventory/counts

GET /api/dashboard/kpis/inventory/value

GET /api/dashboard/inventory/lowstock

GET /api/dashboard/kpis/receivables

GET /api/dashboard/receivables/aging

GET /api/dashboard/receivables/{id}

GET /api/dashboard/rankings/products

GET /api/dashboard/rankings/customers

GET /api/dashboard/kpis/operational

Use the exact parameters and response structure defined by Haroon's document.

Every endpoint includes:

recordCount

generatedAt

Use these where appropriate in the UI to support traceability.

DO NOT create a second competing calculation system in the frontend.

============================================================

19. DATASET DEVELOPMENT MODE

============================================================

The supplied ZIP dataset is the real development dataset.

If the backend APIs are not yet connected, create a clean temporary data-access adapter so the real dataset can power the interface during development.

However:

DO NOT hard-code the dataset values into UI components.

Keep the architecture replaceable:

Dataset/API

↓

Service layer

↓

Typed response

↓

UI

When the backend API becomes available, the service implementation should be replaceable without rebuilding the visual layer.

The frontend must remain API-ready.

============================================================

20. SECURITY / ROLE-BASED UI

============================================================

Follow Haroon's security matrix exactly.

Roles:

ADMIN

MANAGER

VIEWER

Admin:

Full access.

Manager:

Full access.

Viewer:

Aggregate counts and totals only.

Viewer MUST NOT see:

- Customer names

- Unit cost

- Receivable detail

- Order/invoice drill-down records

- Other restricted financial information

Do not merely hide these visually while still requesting restricted data.

The frontend must respect the backend's role-based access.

The backend/server remains the authority for permissions.

Never trust a role supplied by the frontend.

============================================================

21. AI ASSISTANT

============================================================

Create a dedicated:

AI ASSISTANT

page in the same modern design language.

This should NOT look like a basic chatbot.

It should feel like an embedded business intelligence assistant.

Suggested experience:

AI Business Assistant

"Ask a question about your business data."

[ What would you like to know?                         ]

                          Send

Suggested questions:

- What were our total sales this month?

- Which product generated the most sales?

- Which customers generated the most revenue?

- How much is currently outstanding?

- How much is overdue?

- Which products are low on stock?

- What is our fulfillment rate?

- What is our return rate?

- Which month had the highest sales?

Keep the interface clean and spacious.

============================================================

22. AI ASSISTANT DATA SAFETY

============================================================

CRITICAL:

The AI must answer ONLY from the Sales & Operations data.

It must NEVER hallucinate numbers.

Recommended architecture:

User Question

↓

Intent / Query Detection

↓

Deterministic Data Query / Calculation

↓

Verified Result

↓

Gemini

↓

Concise Natural Language Answer

Gemini must NOT independently invent or calculate authoritative business figures.

The deterministic data layer is the source of truth.

If the system cannot derive the requested answer from the available dataset:

Respond:

"I can't help with that. I can only answer questions about the available Sales & Operations data."

Do not allow Gemini to guess.

============================================================

23. AI RESPONSE STYLE

============================================================

AI answers must be:

SHORT

CONCISE

DIRECT

ACCURATE

Normally:

1 to 4 short sentences

or

a few concise bullets.

Example:

"Total sales this month are PKR 284.6M, with 186 qualifying orders."

Do not produce long essays.

Do not provide unnecessary explanations.

If the user asks for a specific number, put that number first.

Use PKR for financial values.

============================================================

24. AI DATE CONTEXT

============================================================

The AI should understand the selected dashboard date range when relevant.

For example:

Dashboard filter:

1 Aug 2026 - 31 Aug 2026

User:

"What were our sales?"

The assistant should answer for that selected period.

It should also support explicit date questions where the dataset supports them.

============================================================

25. GEMINI SECURITY

============================================================

I will provide a Gemini API key later.

NEVER expose the Gemini API key in client-side code.

Do NOT use a VITE_GEMINI_API_KEY that becomes part of the browser bundle.

Use a secure server-side or edge-function integration.

Store the API key as a secure server/edge secret.

Handle:

- Missing key

- Invalid key

- API failure

- Timeout

- Rate limit

- Empty response

gracefully.

Never expose secrets to users.

============================================================

26. AI UI

============================================================

The AI Assistant should include:

- Clean conversation area

- Suggested questions

- Modern input

- Send button

- Loading indicator

- Copy response

- Clear conversation

- Responsive layout

- Empty state

- Error state

- "Based on Sales & Operations data" indicator

Avoid excessive chat bubbles.

Avoid childish AI styling.

Avoid excessive gradients.

Avoid unnecessary animations.

It should feel like a professional management tool.

============================================================

27. THEME TOGGLE

============================================================

Provide:

Light

Dark

System

Theme toggle must actually work.

Dark mode must be intentionally designed rather than simply inverted.

Ensure:

- Charts remain readable

- Text contrast remains strong

- Status indicators remain understandable

- Cards retain hierarchy

- Tooltips remain readable

- Borders remain subtle

Persist the selected preference.

============================================================

28. SEARCH

============================================================

Provide a modern global search.

Search should support relevant entities such as:

- Customers

- Products

- Orders

- Invoices

Use a modern command/search interaction.

Keyboard shortcut such as:

Cmd/Ctrl + K

is preferred.

Search results should navigate to the appropriate detail/filter view according to user permissions.

============================================================

29. NAVIGATION

============================================================

Navigation must be functional.

Every nav item must lead somewhere meaningful.

Primary navigation:

Overview / Sales

Orders

Inventory

Receivables

Top Performers

Operations

AI Assistant

Use a floating top navigation.

On mobile:

Use a clean navigation drawer/sheet.

No permanent left sidebar.

============================================================

30. NOTIFICATIONS / ACTION CENTER

============================================================

Include a lightweight management attention area.

It may highlight actual dataset-supported issues such as:

- Low stock

- Out of stock

- Overdue invoices

- Cancelled orders

- Operational issues

Do not invent alerts.

Do not overload the dashboard.

Keep the Action Center concise.

Example:

NEEDS ATTENTION

11 products are low on stock

→ Review inventory

PKR XX overdue

→ Review receivables

Keep the language simple.

============================================================

31. SETTINGS

============================================================

Create a lightweight settings interface.

Include:

- Theme

- Appearance

- AI Assistant configuration/status

- User/session information where available

Do not create a giant settings panel.

============================================================

32. MODERN CHART REQUIREMENTS

============================================================

Charts must look premium.

Do NOT use only generic:

- Basic bar charts

- Basic line charts

- Default donut charts

Use a carefully selected combination of:

- Smooth area charts

- Radial charts

- Gauge charts

- Radial progress

- Horizontal ranking bars

- Donut charts

- Stacked visualizations

- Sparklines

- Trend indicators

- Comparison visualizations

However:

DO NOT use complicated charts simply to appear modern.

Every visualization must make the underlying business information easier to understand.

============================================================

33. CHART DESIGN

============================================================

Charts should have:

- Clean typography

- Minimal grid lines

- Generous internal spacing

- Clear tooltips

- Short labels

- Appropriate number formatting

- Responsive dimensions

- Accessible contrast

- Smooth hover states

- No unnecessary legends

Currency should be formatted clearly.

Avoid showing too many decimal places.

Use appropriate compact formatting:

PKR 4.28B

PKR 264M

PKR 91.3M

where appropriate.

The exact underlying values must remain accurate.

============================================================

34. RESPONSIVE DESIGN

============================================================

The entire application must be fully responsive.

Desktop

Laptop

Tablet

Mobile

Desktop:

Use sophisticated Bento grid layouts.

Tablet:

Reflow cards intelligently.

Mobile:

Use a clean single-column/stacked layout.

Do NOT simply shrink desktop content.

Mobile navigation must be usable.

Charts must remain readable.

Cards must have comfortable padding.

No accidental horizontal page overflow.

============================================================

35. PERFORMANCE

============================================================

The application must feel:

FAST

SMOOTH

RESPONSIVE

Follow Haroon's performance architecture.

Backend/API responses should support the documented caching strategy.

Frontend should avoid unnecessary recalculation and rendering.

Use where appropriate:

- Memoization

- Efficient state management

- Lazy loading

- Code splitting

- Debounced search

- Pagination

- Cached API responses

- Optimized charts

Drill-down lists should support pagination.

Default page size:

25 records.

Do not load thousands of records unnecessarily.

============================================================

36. LOADING STATES

============================================================

Every major page and component must have polished loading states.

Use:

- Skeleton cards

- Skeleton charts

- Skeleton lists

Do NOT show fake numbers while loading.

============================================================

37. NO-DATA STATES

============================================================

If the selected date range has no data:

Show:

"No data available for this period."

Do not fabricate values.

Do not show misleading zero values unless the calculated result is genuinely zero.

============================================================

38. ERROR STATES

============================================================

Handle API/data failures gracefully.

Example:

"Unable to load sales data."

[ Retry ]

Do not expose technical stack traces to normal users.

============================================================

39. TOOLTIP / INFORMATION LANGUAGE

============================================================

Use simple business language.

Bad:

"Aggregation over CustomerOrder entity using indexed query."

Good:

"Total orders placed during the selected period, excluding cancelled orders."

Keep explanations concise.

============================================================

40. VISUAL INFORMATION HIERARCHY

============================================================

Every page should have:

1. Clear page title

2. Short supporting sentence

3. Date filter

4. 3-4 major KPIs

5. 3-4 supporting visuals

6. Clear drill-down actions

The user should understand the page within seconds.

Do not force users to read paragraphs.

============================================================

41. DATA FRESHNESS

============================================================

Where appropriate, display a subtle data freshness indicator.

For example:

"Updated just now"

or:

"Data through Aug 31, 2026"

Use the actual generatedAt timestamp from API responses where available.

Do not invent timestamps.

============================================================

42. ACCESSIBILITY

============================================================

Ensure:

- Good contrast

- Keyboard navigation

- Focus states

- Accessible buttons

- Accessible dropdowns

- Accessible dialogs

- Accessible charts where possible

- Clear labels

- Screen-reader friendly controls

Do not rely only on color for status.

============================================================

43. CODE QUALITY

============================================================

Use:

React

TypeScript

Tailwind CSS

Modern component architecture

Jakarta Sans

Modern icon library such as Lucide

Create reusable components.

Examples:

KpiCard

ChartCard

DateRangePicker

InfoButton

InfoPopover

StatusBadge

MetricTrend

BentoCard

DataTable

EmptyState

ErrorState

LoadingSkeleton

DrillDownDrawer

SearchCommand

Keep components modular.

Do not duplicate business logic.

============================================================

44. DATA LAYER

============================================================

Maintain a clean architecture:

API / DATASET

      ↓

SERVICE LAYER

      ↓

TYPED DATA

      ↓

PAGE DATA

      ↓

REUSABLE COMPONENTS

      ↓

UI

The UI should not contain duplicated business calculations.

The frontend should consume backend KPI results according to Haroon's API contract.

============================================================

45. IMPORTANT SOURCE DATA ENTITIES

============================================================

The architecture document defines these source entities:

Customer

Product

CustomerOrder

OrderLine

InventoryMovement

InventoryPosition

Receivable

Use these relationships correctly.

Do not create alternative entities unless technically necessary.

============================================================

46. FINANCIAL / DATE HANDLING

============================================================

Follow Haroon's architecture exactly.

Money values are stored in the smallest currency unit.

Rounding is for display only.

Do not round values during calculations.

Dates/timestamps are stored in UTC and shown in Pakistan Standard Time.

Date ranges are inclusive.

Use order date for:

- Sales

- Orders

- Top Performers

Use invoice/due dates for:

- Receivables

Do not silently change these rules.

============================================================

47. SECURITY

============================================================

Financial access must follow Haroon's security matrix.

Admin:

Full access.

Manager:

Full access.

Viewer:

Aggregate counts/totals only.

Viewer cannot access:

- Customer names

- Unit cost

- Receivable details

- Order drill-down records

- Invoice details

- Restricted financial information

The backend is the final authority for access.

Do not bypass permissions in the UI.

============================================================

48. TRACEABILITY

============================================================

Every important number must be traceable.

Use API metadata such as:

recordCount

generatedAt

where appropriate.

KPI → filtered records.

Chart → underlying API result.

Drill-down → same query/filter logic.

Do not create a separate frontend interpretation of the metric.

============================================================

49. DO NOT ADD UNNECESSARY FEATURES

============================================================

This is a focused B2B management dashboard.

Do not add:

- CRM functionality

- Payroll

- HR

- Accounting system

- Full ERP modules

- Complex workflow builders

- Unrelated widgets

- Excessive notifications

- Decorative analytics

Only add functionality that supports:

Sales

Orders

Inventory

Receivables

Top Performers

Operations

AI Business Analysis

============================================================

50. FINAL VISUAL QUALITY BAR

============================================================

The final application should NOT look like a prototype.

It should look like a premium product ready for a client presentation.

Think:

Premium B2B SaaS

+

Modern Bento dashboard

+

Business intelligence

+

Minimal enterprise software

+

Excellent typography

+

Spacious layout

+

Intelligent data visualization

The dashboard should feel:

CALM

NOT BUSY.

INFORMATIVE

NOT OVERLOADED.

MODERN

NOT TRENDY FOR THE SAKE OF IT.

PREMIUM

NOT DECORATIVE.

============================================================

51. FINAL ACCEPTANCE CHECKLIST

============================================================

Before considering the implementation complete, verify:

DATA

- All supplied datasets are correctly used.

- No fake numbers.

- No hard-coded KPI values.

- No fabricated chart data.

- No fabricated rankings.

- Source relationships are respected.

KPIs

- Every KPI follows Haroon's exact formula.

- Sales calculations are correct.

- Order calculations are correct.

- Inventory calculations are correct.

- Receivable calculations are correct.

- Top product/customer rankings are correct.

- Operational KPIs are correct.

FILTERS

- Today works.

- This Week works.

- This Month works.

- This Quarter works.

- This Year works.

- Custom Range works.

- Date ranges are inclusive.

- Live snapshot KPIs remain unaffected by date filtering.

- Previous-period comparison is accurate.

UI

- No permanent left sidebar.

- Floating top navigation.

- Jakarta Sans throughout.

- Modern icons.

- Modern dropdowns.

- Spacious layout.

- No clutter.

- Clear hierarchy.

- No unnecessarily tiny text.

- No excessive scrolling.

- Responsive Bento layout.

- Light/Dark/System theme works.

- Smooth interactions.

- Modern charts.

DRILL-DOWN

- KPI cards are clickable where applicable.

- Drill-down filters match KPI logic.

- Records match displayed numbers.

- Pagination works.

SECURITY

- Admin access works.

- Manager access works.

- Viewer restrictions are respected.

- Restricted data is not exposed to Viewer.

AI

- AI Assistant works.

- Gemini integration is secure.

- API key is never exposed client-side.

- AI answers only from available data.

- AI does not hallucinate numbers.

- Deterministic data layer is authoritative.

- Answers are concise.

- Out-of-scope questions are refused clearly.

- AI respects relevant date context.

RESPONSIVENESS

- Desktop

- Laptop

- Tablet

- Mobile

PERFORMANCE

- Fast initial load.

- Smooth navigation.

- Efficient API/data handling.

- Paginated drill-downs.

- No unnecessary repeated calculations.

- No console errors.

- No broken routes.

- No horizontal overflow.

============================================================

52. MOST IMPORTANT INSTRUCTION

============================================================

Do NOT treat this as "make a pretty dashboard."

Treat it as:

BUILD A REAL, ACCURATE, PREMIUM B2B MANAGEMENT PRODUCT.

The final product must achieve all three:

BEAUTIFUL

+

FAST

+

CORRECT

The manager should be able to open the application and understand the most important business situation in seconds.

Every number must have a reliable source.

Every KPI must follow Haroon's documented definition.

Every relevant KPI must be traceable.

Every important interaction must work.

Every page must remain calm, spacious and easy to skim.

Do not sacrifice functionality for visual design.

Do not sacrifice accuracy for visual design.

Do not sacrifice usability for visual design.

Build the complete experience accordingly.

This project is a comprehensive **VisionPulse Sales & Operations Intelligence Dashboard** for real-time business analytics and decision-making.

## Development & Deployment

This project is built with modern React and Node.js technologies. Continue developing by pushing to `main` on GitHub.

### Quick Start:
- **Ship faster**: develop features locally and deploy seamlessly
- **Stay in sync**: all changes are committed and tracked in your repository
- **Full ownership**: complete control over your business intelligence platform

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
