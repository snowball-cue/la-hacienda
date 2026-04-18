# La Hacienda Inventory Management System
# Standard Operating Procedures (SOP)

**Document Version:** 1.2 *(v1.2: added Task Board references in roles, weekly/monthly routines)*  
**Effective Date:** April 2026  
**Prepared for:** La Hacienda Mexican Grocery Store, Austin, Texas  
**Audience:** Store Owner, Managers, and Staff

---

> **How to use this document:** Read Section 1 first to understand how the new
> system compares to the old one. Then find the section that matches your role
> and daily tasks. If something goes wrong, go straight to Section 7.

---

## Table of Contents

1. [Current Manual Processes](#1-current-manual-processes)
2. [New Digital Workflow](#2-new-digital-workflow)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Daily and Weekly Routines](#4-daily-and-weekly-routines)
5. [Data Entry Guidelines](#5-data-entry-guidelines)
6. [Troubleshooting Common Issues](#6-troubleshooting-common-issues)
7. [Security and Backup](#7-security-and-backup)

---

## 1. Current Manual Processes

This section describes how inventory is managed today. Understanding these
processes helps explain why the new system was built and what problems it solves.

### 1.1 Receiving Orders
**Current process:**
- Delivery arrives; staff counts items against the paper invoice.
- Quantities are written on the invoice by hand.
- The invoice is filed in a folder or drawer.
- Stock is placed on shelves. No central record of what was received.

**Problems this causes:**
- Easy to lose or misplace invoices.
- No way to check later how much of a product was received on a given date.
- Discrepancies between ordered and received quantities are not always recorded.

### 1.2 Stock Counting
**Current process:**
- Owner or manager walks the store and visually estimates stock levels.
- No systematic count schedule; counts happen when a problem is noticed.
- Mental notes or paper lists are used to identify what needs to be reordered.

**Problems this causes:**
- Items go out of stock before anyone notices.
- Time-consuming; pulls owner/manager away from other tasks.
- No historical data to identify patterns (e.g., items that sell out every weekend).

### 1.3 Reordering
**Current process:**
- Owner contacts suppliers by phone or text based on memory or visual check.
- No formal reorder list or minimum quantity threshold recorded anywhere.
- Duplicate orders or missed items are common.

**Problems this causes:**
- Overstock of slow-moving items; stockouts of fast-moving items.
- No record of what was ordered, from whom, and at what price.

### 1.4 Handling Perishables
**Current process:**
- Staff checks expiration dates informally when stocking shelves.
- Spoiled or expired items are discarded without recording the loss.

**Problems this causes:**
- No visibility into spoilage costs.
- Cannot identify which perishables have the highest waste to adjust ordering.

### 1.5 Reporting
**Current process:**
- No formal inventory reports. Owner relies on gut feel and bank account balance.

---

## 2. New Digital Workflow

The new system replaces paper-based tracking with a secure, web-based dashboard
accessible from any phone, tablet, or computer.

### 2.1 Receiving an Order (Goods In)
1. Log in to the dashboard at the store URL.
2. Go to **Inventory → Receive Goods**.
3. Select the product from the list (search by name or SKU).
4. Enter the quantity received.
5. Optionally enter the unit cost from the invoice.
6. Press **Save**. The system records the receipt with your name and the date/time.
7. File the paper invoice as usual (keep physical invoices for tax purposes).

**Result:** The product's stock level increases immediately. The receipt is logged
permanently with a timestamp and your name. No paper needed to track what came in.

### 2.2 Updating Stock (Manual Adjustment)
Use this when you need to correct stock for reasons other than a delivery:

1. Go to **Inventory → Adjust Stock**.
2. Select the product.
3. Enter the change quantity (positive to add, negative to remove).
4. Select a reason from the list:
   - **Received** — goods arrived from supplier
   - **Spoilage** — product expired or was damaged
   - **Theft/Shrinkage** — unexplained loss
   - **Return** — product returned to supplier
   - **Count Correction** — physical count doesn't match the system
5. Add a note if needed (optional but encouraged).
6. Press **Save**.

### 2.3 Low-Stock Alerts
- The dashboard home page shows a **Low Stock** counter.
- A product appears on the low-stock list when its quantity reaches or drops below its **Reorder Point**.
- The owner receives a daily email listing all low-stock items.
- To reorder: use the low-stock list to call or email your supplier.
- Optionally, create a **Purchase Order** in the system to track what was ordered.
- **[v1.1]** A separate **Soon to Expire** counter appears on the dashboard home page. It shows products whose recorded expiration date is within the next 7 days. Check this counter every morning alongside the Low Stock counter and act accordingly (discount, donate, or discard per store policy).

### 2.4 Physical Stock Count (Cycle Count)
Recommended weekly for perishables, monthly for dry goods:
1. Count items on shelves for the chosen category.
2. If the counted quantity differs from the system, go to **Adjust Stock** and enter a **Count Correction** adjustment.
3. Note the discrepancy reason if known (spoilage, theft, miscounting).

### 2.5 Viewing Reports
1. Go to **Reports** in the dashboard.
2. Available reports:
   - **Low-Stock Report** — see all products near or below reorder point.
   - **Stock Movement History** — see all changes to a product's stock over time.
   - **Inventory Snapshot** — current stock and estimated value for all products.
3. To export: press **Download CSV** on any report. Open in Excel or Google Sheets.

---

## 3. User Roles and Permissions

There are three roles in the system. Each person is assigned one role by the owner.

### 3.1 Owner
- Full access to all features.
- Can create, edit, and archive (remove) products.
- Can add, edit, or remove user accounts.
- Can view all reports and export data.
- Receives daily low-stock email alerts.

### 3.2 Manager
- Can add and edit products but cannot archive (permanently remove) them.
- Can receive goods and make stock adjustments.
- Can view reports but cannot export data (configurable).
- Cannot manage user accounts.
- **[v1.2]** Can view and update the **Task Board** (`/dashboard/tasks`) — create tasks, update status, add comments.

### 3.3 Staff
- Can receive goods and make stock adjustments only.
- Cannot add, edit, or remove products.
- Cannot view reports.
- Cannot manage user accounts.

> **Important:** Every action in the system is logged with the name of the user
> who performed it and the date/time. This is not about surveillance — it is
> about being able to trace errors back to their source so they can be corrected.

---

## 4. Daily and Weekly Routines

### 4.1 Daily Routine (All Staff)

| Time | Task | Who |
|------|------|-----|
| Opening | Check the dashboard for any low-stock alerts | Manager |
| When delivery arrives | Log received goods using "Receive Goods" form | Staff / Manager |
| When discarding expired items | Record spoilage in "Adjust Stock" | Staff / Manager |
| Closing | Note any product shortages observed during the day | Staff → tells Manager |

### 4.2 Weekly Routine (Manager/Owner)

| Day | Task |
|-----|------|
| Monday | Review Low-Stock Report; contact suppliers as needed |
| Wednesday | Spot-check stock levels for produce and dairy (high-turnover) |
| Friday | Review Stock Movement History for past week; investigate anomalies |
| Any day | Run Inventory Snapshot report; compare estimated value to expectations |
| Any day | **[v1.2]** Check the **Task Board** (`/dashboard/tasks`) — update task statuses, close completed items, add notes on blockers |

### 4.3 Monthly Routine (Owner)

| Task | Notes |
|------|-------|
| Full physical stock count | Count all products; enter Count Correction adjustments for discrepancies |
| Supplier review | Identify any suppliers with frequent delivery errors |
| Reorder point review | Adjust reorder quantities based on actual usage observed |
| Staff access review | Confirm all active accounts are still needed; deactivate former staff |
| **[v1.2]** Task Board review | Archive completed tasks; add new operational tasks for the coming month (e.g., "Schedule physical count week of 2026-05-04") |

---

## 5. Data Entry Guidelines

Good data in = good information out. Following these guidelines ensures the
reports and alerts are accurate.

### 5.1 SKU (Stock Keeping Unit) Numbers
- Every product must have a unique SKU.
- Use this format: `[CATEGORY]-[NUMBER]` (e.g., `DAIRY-001`, `PRODUCE-042`, `DRY-103`).
- If a product has a barcode (UPC), use the barcode number as the SKU.
- Never reuse a SKU for a different product, even if the first product is archived.
- Do not use spaces or special characters in SKUs.

### 5.2 Product Names
- Enter names in English in the main **Name** field.
- Enter the Spanish name in the **Nombre (Spanish)** field.
- Be consistent: decide on one spelling and stick with it (e.g., "Queso Fresco" not "queso fresco" or "Queso fresco").

### 5.3 Units of Measure
Use these standard units:
- **each** — for individual items (cans, bottles, packages)
- **lb** — for items sold by the pound (produce, meat)
- **kg** — for items measured in kilograms
- **case** — for items received and tracked by the case

### 5.4 Reorder Points and Quantities
- **Reorder Point:** The minimum quantity at which you want to be alerted to reorder.
  Example: If you always want at least 2 cases of tortillas on hand, set reorder point to 2.
- **Reorder Quantity:** How much you typically order at a time. Used to pre-fill purchase orders.
- Review these numbers monthly as you learn how fast products sell.

### 5.5 Expiration Dates / Perishables
- When receiving perishable goods, always check expiration dates before accepting delivery.
- Refuse or note any products with expiration dates less than the standard minimum (ask owner for policy).
- When discarding expired items, always log them under **Adjust Stock → Spoilage** with the quantity and a note like "expired 2026-04-10."
- This creates a record that helps identify high-spoilage products.
- **[v1.1]** The system includes an **Expiration Date** field on each product (optional). When editing or receiving a perishable product, managers should enter the nearest expiration date for the batch currently on hand. The dashboard will automatically show a **Soon to Expire** alert for any product expiring within 7 days — check this alert every morning alongside the Low Stock counter.

### 5.6 Reasons for Stock Adjustments
Always select the most accurate reason:

| Reason | When to use |
|--------|-------------|
| Received | Goods arrived from a supplier |
| Spoilage | Product expired, damaged, or went bad |
| Theft/Shrinkage | Unexplained loss discovered during count |
| Return | Product sent back to supplier |
| Count Correction | Physical count differs from system; no specific reason known |

### 5.7 [v1.1] Bulk Product Import (CSV Upload)

For initial setup or large catalog updates, the owner or manager can upload a CSV
file to add or update many products at once — avoiding the need to enter 300–600
products one by one.

**How to use:**
1. Go to **Inventory → Import Products**.
2. Download the **CSV Template** using the button on that page.
3. Fill in the template using Excel or Google Sheets:
   - **Required columns:** SKU, Name (English), Name (Spanish), Category, Unit, Cost Price, Sell Price, Reorder Point, Reorder Quantity.
   - **Optional columns:** Supplier Name, Expiration Date (YYYY-MM-DD format), Shelf Life Days, Initial Stock Quantity.
4. Save the file as `.csv` and upload it.
5. Review the preview — any errors (duplicate SKUs, missing required fields, unknown category names) are listed before anything is saved.
6. Confirm the import. Products are added; if an Initial Stock Quantity is provided, a stock ledger entry with reason "Received" is created automatically.

**Important rules:**
- Never reuse a SKU that already exists in the system.
- Leave the Initial Stock Quantity column blank if you are updating product information only (not adding stock).
- Dates must be in YYYY-MM-DD format (e.g., `2026-09-15`).
- Contact the developer if the import fails with an unexpected error.

---

## 6. Troubleshooting Common Issues

### 6.1 "I can't log in"
1. Check that you are using the correct email address.
2. Try the **Forgot Password** link on the login page.
3. If you still cannot log in, contact the store owner to reset your account.

### 6.2 "The stock number looks wrong"
1. Go to **Inventory → Stock Movement History** for that product.
2. Review all recent entries to find where the discrepancy started.
3. If you find an error, enter a **Count Correction** adjustment to fix the quantity.
4. If you cannot identify the cause, note the product name, current system quantity, and actual counted quantity, and report to the owner/manager.

### 6.3 "A product is missing from the list"
1. Check the search — try searching by SKU or part of the name.
2. The product may be **archived** (inactive). Ask the owner to restore it if needed.
3. If the product has never been entered, add it using **Inventory → Add Product**.

### 6.4 "The dashboard won't load"
1. Check your internet connection.
2. Refresh the page (press F5 or pull down on mobile).
3. Try a different browser (Chrome, Safari, Edge).
4. If the problem persists for more than 10 minutes, contact the developer (see contact info provided separately).

### 6.5 "I accidentally entered the wrong quantity"
1. Do **not** try to delete the entry — you cannot, and this is intentional.
2. Enter a new **Adjust Stock** entry with the opposite quantity to cancel out the error.
   Example: You entered +50 when it should have been +5. Enter -45 with reason "Count Correction" and a note: "Correcting data entry error from [date]."
3. The history will show both entries, which is correct — it shows what happened.

### 6.6 Escalation Procedure
| Level | Contact | When |
|-------|---------|------|
| Tier 1 | Any Manager | Login issues, data entry questions, minor errors |
| Tier 2 | Store Owner | Account management, missing products, policy questions |
| Tier 3 | System Developer | System not loading, data loss, security concerns |

---

## 7. Security and Backup

### 7.1 Password Security
- Use a unique password for your system account — do not reuse passwords from other services.
- Passwords must be at least 8 characters.
- Do not share your password with anyone, including the owner. The owner has their own account.
- If you think someone knows your password, change it immediately from **Settings → Change Password** or contact the owner.

### 7.2 Logging Out
- Always log out when using a shared computer or tablet.
- On mobile devices used only by you, staying logged in is acceptable.
- The system will automatically log you out after 7 days of inactivity.

### 7.3 Data Backup
- All data is stored in Supabase cloud servers, not on any local computer.
- Supabase performs **daily automatic backups**. No action is required from staff.
- In the event of data loss, the owner should contact the developer immediately. Data can be restored from the previous day's backup.

### 7.4 Who Can See What
- All actions are logged and visible to the owner.
- Staff cannot see other users' personal information.
- Financial data (cost prices, supplier pricing) is visible to owner and managers only.

### 7.5 Reporting Security Concerns
If you notice anything unusual — such as stock records that seem to have been changed without explanation, an account you don't recognize, or suspicious activity — report it to the owner immediately. Do not try to fix it yourself.

---

## Document Control

| Field | Value |
|-------|-------|
| Document Owner | Store Owner |
| Review Frequency | Every 6 months or after major system update |
| Next Review Date | October 2026 |
| Questions/Updates | Contact system developer |

---

*End of SOP Document*
