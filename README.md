# PressGuard — Publishing House CEO CRM (English + हिंदी)

**PressGuard** is a credit-gated, bilingual (**English + Hindi / हिंदी**), multi-department CRM engineered specifically for publishing houses dealing with multi-channel orders (WhatsApp, Email, Phone, Direct), trade credit abuse, the "7-days, 7-days, 7-days" telecaller stall loop, unauthorized production dispatches to defaulting buyers, and slow legal escalation.

## Live Online Links (GitHub Pages)

Click any link below to open PressGuard immediately with zero installation (runs in your browser with automatic local persistence):

- **CEO Command Center (English):** https://buzzingacommerce-stack.github.io/pressguard-crm/
- **CEO Command Center (हिंदी):** https://buzzingacommerce-stack.github.io/pressguard-crm/?lang=hi
- **Production & Dispatch (हिंदी):** https://buzzingacommerce-stack.github.io/pressguard-crm/?role=PRODUCTION&lang=hi
- **Sales / Order Desk (English):** https://buzzingacommerce-stack.github.io/pressguard-crm/?role=SALES
- **Telecalling & Collections (हिंदी):** https://buzzingacommerce-stack.github.io/pressguard-crm/?role=TELECALLING&lang=hi
- **Finance & Accounts:** https://buzzingacommerce-stack.github.io/pressguard-crm/?role=FINANCE
- **Legal Counsel:** https://buzzingacommerce-stack.github.io/pressguard-crm/?role=LEGAL

> Note: On GitHub Pages, edits are saved locally inside each user's browser (`localStorage`), making it ideal for instant sharing, reviews, and demos. For a **shared live multi-user SQLite database** across your entire team, run the included Node.js server locally on office Wi-Fi or deploy this repo to Render.com using the included `render.yaml`.

## Run Locally or on Office Wi-Fi (Shared SQLite Database)

Requires **Node.js 22.5+** (uses built-in `node:sqlite` — zero external `npm` packages to install):

```bash
node server.js
```

Open **http://127.0.0.1:3456** on your computer, or share your office Wi-Fi address shown inside the **CEO Access · Share** button at the top right.

## Deploy Permanent Multi-User Server (Render.com)

This repository includes [`render.yaml`](./render.yaml) — connect this GitHub repo to [Render.com](https://render.com) as a Web Service (`node server.js`) for permanent 24/7 cloud hosting with a single shared database for all departments.

## Key Capabilities

1. **Dual Credit Gate (Intake Gate 1 + Pre-Dispatch Gate 2)**: Auto-checks total exposure (`Unpaid Invoices + In-Production + New Order`), overdue days, bounced cheques, and broken payment promises at order intake **and again live before warehouse dispatch**.
2. **Omnichannel Order Intake**: Paste raw WhatsApp/Email/SMS messages to auto-extract buyer, quantity, and rate while saving the original message as legal proof.
3. **Production Red Quarantine Wall & Gate Passes**: Blocks printing/loading for defaulting accounts and prints verifiable Gate Pass slips for cleared jobs.
4. **Anti-"7-Day Loop" Collections**: Hard-locks telecallers from granting casual extensions once broken promise strikes hit your policy limit (default: 2), with 1-click WhatsApp/Email reminders and instant Cheque Bounce → Legal Hold triggers.
5. **Legal Escalation Desk & Auto Evidence Dossier**: Auto-compiles GSTIN/KYC, unpaid invoices, WhatsApp/Email trails, dispatch challans, and bounced cheque proofs into a printable **Formal Legal Demand Notice**.
6. **Bilingual English + हिंदी + Layman Accessibility**: Instant `EN | हिंदी` toggle, global `Ctrl+K` quick search, contextual 3-step Help Guide on every screen, interactive SVG charts, and Tally/Excel CSV import & export.
