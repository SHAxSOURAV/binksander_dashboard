# bol. Admin Dashboard

Admin dashboard for the bol. marketplace, built with React + Vite + Tailwind + Ant Design + Redux Toolkit Query. Structure mirrors the `gps_tracking_project`.

## Stack

- React 18 + Vite
- Tailwind CSS (light theme, bol. blue `#1B17E0`)
- Ant Design (components / modals)
- Redux Toolkit Query (API layer — `src/Redux`)
- React Router v6

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run preview
```

## Structure

```
src/
  Pages/
    auth/            Login, Signup, ForgetPassword, VerifyCode, CreateNewPassword
    layout/          Dashboard shell + Sidebar + Navbar
    dashboardHome/   Stats, donut chart, recent orders, track order
    products/        Grid/list view, connect inventory, product detail
    orders/          Orders table + order detail modal
    amazonOperations/  Amazon tracking table
    rimcoOperations/   Rimco tracking table
  components/        Reusable UI (dashboard, products, orders, operations, tracking, settings, shared)
  Redux/             RTK Query services (authApis, productApis, orderApis, operationApis, ...)
  Provider/          UI context (settings modal, logout)
  Routes/            Router config
  assets/mockData.js Frontend mock data — swap for RTK Query hooks during integration
```

## Sidebar

Dashboard · Products · Orders · Amazon Operations · Rimco Operations

## Backend integration

Wired to the FastAPI **"Ball Com API"** backend (`../backend/binksanders_backend`). Routes are mounted
at the root (no `/api/v1` prefix). Set the base URL via `VITE_API_URL` (see `.env.example`); default
is `http://localhost:8000`. Auth uses a Bearer `access_token` with a one-shot refresh on 401.

**Integrated (live API):**
- **Auth** — signin, signup + email-verify (OTP auto sign-in), forgot/reset password, resend OTP,
  change password, signout, refresh. (`authApis`, `utils/session.js`)
  - Password rule enforced by backend: min 8 chars, must include a letter and a number.
  - Login redirects unverified accounts to the OTP screen automatically.
- **Products** — `GET /spreadsheet/scrape-items` (display data), connect inventory via
  `POST /spreadsheet/import-public`, resync via `POST /spreadsheet/sync-spreadsheet`. (`productApis`)
- **Publish** — Product Details → `POST /bol/drafts/from-amazon` then `POST /bol/drafts/{id}/publish`.
- **Settings → Account** — `GET /auth/me`. **Connection** — connected sheets
  (`GET /spreadsheet/connected`, `DELETE /spreadsheet/unlink`) + Bol.com API credentials
  (`GET/POST /users/bol-credentials`). (`connectionApis`, `profileApis`)

- **Amazon Operations** — live **Bol.com → Amazon.nl fulfillment** pipeline
  (`GET /fulfillment/orders`, `POST /fulfillment/sync`, approve/reject/retry). The detail modal
  maps order status to the tracking stepper and shows the Amazon review screenshot. Settings →
  Connection adds an **amazon.nl credentials** card and a **Register Bol Order Webhook** button.
  (`fulfillmentApis`, `utils/fulfillmentStatus.js`, `components/operations/FulfillmentDetailModal`)

**Still on mock data** (no backend endpoint exists yet):
- Dashboard Home stats / donut / recent orders
- Orders page
- Rimco Operations (incl. its tracking stepper)

When those endpoints are added, swap the mock imports in the respective pages for RTK Query hooks
following the same pattern as `productApis`.

## Notes

- **Products are not added manually** — they are imported from a connected Google Spreadsheet
  (see `ConnectInventoryModal` and `productApis.syncInventory`).
- **Tracking** uses a shared chevron stepper (`components/tracking/TrackingStepper.jsx`) with three
  pipelines: Bol.com (blue), Amazon (orange), Rimco (red).
