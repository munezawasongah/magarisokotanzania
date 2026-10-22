# MagariSOKO Tanzania — automotive marketplace

© 2026 Jatelo Technologies. All rights reserved.

MagariSOKO Tanzania is a multi-vendor marketplace for Tanzania, built and operated by Jatelo Technologies. Private sellers, dealerships, importers, spare-parts vendors and service providers (mechanics, inspection centres, towing, clearing agents, insurance and finance) list on it, and buyers search, compare and contact them on WhatsApp in one tap.

**Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, PostgreSQL with Prisma 7 (driver adapter, no Rust engine at runtime), PostgreSQL full-text search, NextAuth (phone SMS OTP plus email/password), Cloudinary signed uploads, and AzamPay / Selcom / DPO payments.

---

## 1. Run it locally (Windows 11 / PowerShell)

Prerequisites: **Node.js 20+** and **PostgreSQL 16**. Install PostgreSQL with the Windows installer, or run `docker compose up -d` in this folder.

```powershell
cd $HOME\Projects\garisoko
Copy-Item .env.example .env          # then set DATABASE_URL + NEXTAUTH_SECRET
npm install
npm run db:setup                     # applies migrations + seeds regions, makes, plans and the admin account
npm run dev                          # http://localhost:3000
```

Admin login (password tab): phone **0668 212 595**, password `ChangeMe!2026` (set `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_PHONE` before seeding to change them). Change the password after the first login. The admin portal is at **/admin**.

No demo or sample listings are created. Databases that were seeded with the old demo data are cleaned with `npm run db:cleanup` (removes the demo accounts and every listing, part or shop that does not belong to an approved, paid seller, and moves the admin to 0668 212 595).

With `SMS_DRIVER="console"`, OTP codes print in the terminal and show on the login screen in development. With no payment gateway configured, development uses a **mock gateway**: a payment succeeds about 4 seconds after you start it.

### Seller registration and mini-sites

1. Anyone can sign up as a buyer. To sell, a user opens **Dashboard → Register as a seller** (`/dashboard/registration`) and chooses: private seller, car dealership, car yard, importer, spare-parts shop or garage / service provider.
2. They fill in their mini-site details: name, phone, WhatsApp, email, region, district, physical address, a map pin (shop, dealership, garage — or where a private seller's car can be seen), opening hours, logo, cover photo and — for service providers — each service with its price.
3. They pay the **TSh 30,000** registration fee online (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, AzamPesa, card) or to your Lipa Namba, then enter the transaction code. Set `NEXT_PUBLIC_LIPA_NAMBA`, `NEXT_PUBLIC_LIPA_NAME` and `NEXT_PUBLIC_LIPA_NETWORK` in `.env` to offer the Lipa Namba option.
4. The admin checks the payment in **Admin → Registrations** and approves or rejects it. Online payments can only be approved once the gateway has confirmed them; Lipa Namba codes are matched by hand against the statement, and a code can only be used once.
5. On approval the registration is marked successful, the seller role is granted, the mini-site is created at `/shop/<name>` and the seller gets an SMS with the link. Only then can they post cars, parts or services.

Every car, part and service must have a price — the forms require it, the server rejects a missing price, and the database refuses a price of zero. The search box in the header and on the home page (`/search`) looks across cars, spare parts, services and shops at once, and every result shows its price and the seller's phone and WhatsApp.

### Buyer and seller tools

| Feature | Where | How it works |
|---|---|---|
| Forgot password | `/forgot-password` (link on the login page) | 6-digit code by SMS to the account's phone, or by email for email-only accounts. Same answer whether or not an account exists. The owner is told by SMS/email when the password changes. |
| Edit a car | Dashboard → Inventory → Edit | Price, mileage, description, features, contacts. Every save is re-checked by the fraud engine; a cut of 50 %+ or a new phone number sends a live car back for review. |
| Renew a listing | Dashboard → Inventory → Renew 60 days | Free. Sellers get an SMS + email 3 days before a listing expires, with a one-tap renew link. |
| Spare parts management | Dashboard → My parts | Edit everything, change the stock count, "Sold out" / "Back in stock", remove. Stock 0 hides the part from search. |
| Saved searches & alerts | "Save search & get alerts" on `/cars`; Dashboard → Search alerts | SMS + email when a newly published car matches (at most one alert per search every 2 hours). |
| Price-drop alerts | Automatic for saved cars (♥) | SMS + email when the seller lowers the price by 2 % or TSh 200,000+. |
| Pre-purchase inspection | Car page → Book a pre-purchase inspection; Dashboard → Inspections | Lists registered garages that offer "Pre-purchase inspection" with their price, nearest first. The garage confirms a date and uploads the report; buyer and seller are notified at each step. |
| Compare cars | "Compare" on any car, then the tray at the bottom → `/compare` | Up to 3 cars side by side: price, year, make, model, mileage, fuel, gearbox, condition, seller type, landed cost, monthly estimate; the best value in each row is marked. |
| Loan estimate | Car page | "From about TSh X / month" under the price (30 % deposit, 17 %, 36 months), the calculator, and registered finance/insurance providers with a WhatsApp message about that exact car. |
| Reviews & ratings | Mini-site → Reviews; Admin → Reviews | Only buyers who contacted the seller (inquiry) or booked them (inspection) can review, once per seller. Phone numbers and links are removed from reviews. Owners can reply; admins can hide and restore. Ratings show on mini-sites, search results and the dealers page. |
| Revenue | Admin → Revenue | Revenue per day/month, by stream and by payment method, registration funnel, latest payments, CSV download for Excel. Counts gateway-confirmed payments plus Lipa Namba fees you approved. |

### Email

Set `EMAIL_DRIVER` in `.env`: `console` (development — emails print in the terminal), `smtp` (any mailbox: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) or `resend` (`RESEND_API_KEY`). Emails go out for payment receipts, registration approval/rejection, new leads, listing approval/rejection, expiry reminders, saved-search and price-drop alerts, inspection bookings and reviews — always alongside the SMS, to whoever has an email address on their account or mini-site.

### Tests

```powershell
cd $HOME\projects\garisoko
npm test                  # everything (needs PostgreSQL running)
npm run test:unit         # business rules only, no database
```

The integration test creates its own database, `garisoko_test`, applies every migration and runs the money flow end to end: registration → TSh 30,000 payment (and duplicate callbacks) → admin approval → mini-site → listing (price and mileage enforced, zero price refused by the database) → publish → saved-search alert → price-drop alert (sent once even when triggered twice at the same moment) → expiry reminder and renew → spare parts → inspection booking → reviews → password reset → revenue report. Your real database is never touched. Run `npm test` before every deployment.

### Changing the schema

Use `npm run db:migrate:dev -- --name your_change`, **not** plain `prisma migrate dev`. Prisma can't model the full-text-search columns and GIN indexes, so plain `migrate dev` would try to drop them. The wrapper strips those statements before it applies the migration.

### Legal pages and consent

- `/terms`, `/privacy` and `/safety` are written for Tanzanian law, in English and Kiswahili. The text lives in `src/content/legal.ts`.
- Sign-up requires ticking the Terms + Privacy checkbox, and the SMS-code login states that continuing means accepting them. The acceptance time and document version are stored on the user (`termsAcceptedAt`, `termsVersion`) as consent evidence under the Personal Data Protection Act, 2022.
- Sellers must confirm they own or are authorised to sell each vehicle before submitting it.
- When you change the legal text, update `legalUpdated` in `src/config/site.ts`.
- Have a Tanzanian advocate review the text before launch, and set the real support, privacy and safety email addresses and phone number in `src/config/site.ts`.

### Fraud prevention

Every new or edited listing, and every buyer message, is screened by `src/server/fraud/engine.ts`. Scores and weights are in `src/config/fraud.ts`: under 30 is low risk, 30–59 is held for review, and 60 or more is high risk.

| Signal | What it catches |
|---|---|
| Price vs market | Price under 65% / 50% of the median for the same model and years (needs 4+ comparable listings) |
| Photo fingerprints | The same photo (resized or recompressed) already on an earlier listing by another account |
| Scam wording (EN + SW) | Deposits, booking fees, "pay first", "I'm abroad", "car at the port", overpayment, Western Union and more |
| Off-platform contact | Phone numbers, emails, links or till/account numbers written in the description |
| Shared numbers and devices | A contact number or device used by other accounts, or by a banned account |
| Chassis | Invalid format, or already listed earlier by another account |
| Account | New account listing a high-value car; private seller without a mobile-money-verified wallet |
| Reports | 2+ different people report a listing as a scam → it is taken down for review automatically |
| Edits | A live listing whose price is cut 50%+ or whose contact number changes goes back to review |
| Blocklist | Banned phones, emails, devices, chassis numbers, photos and keywords |

Trust lowers the score: verified businesses, mobile-money-verified wallets (set automatically after an M-Pesa / Mixx / Airtel / HaloPesa payment) and established sellers. Low-risk listings from verified businesses and trusted sellers (30+ days old, verified wallet, earlier approved listing) publish instantly. Everyone else goes through moderation.

In **Admin → Fraud** moderators see each flagged listing with the reasons and any linked accounts. They can publish, reject, **ban** or **shadow-ban** the seller. A ban blocklists every phone, email, device, chassis number and photo the scammer used, except identifiers that belong to other genuine accounts (scammers often copy real sellers' numbers and photos). Held buyer messages can be reviewed and released. **Admin → Blocklist** manages entries by hand, including banned keywords.

---

## 2. Project structure

```
prisma/
  schema.prisma                 Users/Roles, Locations, Business (dealers, importers, parts, services),
                                Listings, SpareParts + Fitment, Inquiries, Payments, Plans, Promotions, Ads
  migrations/                   init + full-text-search (generated tsvector + GIN/trigram indexes)
  seed.ts                       31 regions / 183 districts, 27 makes / 194 models, plans, demo data
prisma.config.ts                Prisma 7 config (datasource URL, seed command)
scripts/migrate-dev.mjs         drift-safe `migrate dev` wrapper
src/
  app/
    page.tsx                    home: tabbed hero search (Cars | Spare Parts), featured, latest, regions
    cars/page.tsx               advanced search — URL-synced filters, facets, SEO titles
    cars/[slug]/page.tsx        listing detail — gallery, specs, landed cost, finance calc, WhatsApp, JSON-LD
    parts/…                     spare-parts store with make/model/year fitment filtering
    services/ dealers/ pricing/ directory, showroom pages, public price list
    sell/                       4-step listing wizard
    dashboard/…                 seller/dealer: overview analytics, inventory, leads inbox, promote, plans, parts
    admin/…                     moderation queue, business verification, import-tax & FX settings, reports
    api/…                       REST endpoints (see §3) for web + future mobile apps
    sitemap.ts robots.ts        SEO
  components/
    search/HeroSearch.tsx       tabbed hero search bar
    listing/VehicleCard.tsx     responsive card — plate-style TZS price, location tag, WhatsApp button
    listing/…                   gallery, contact buttons, inquiry form, finance calculator, tracking
    parts/ dashboard/ forms/ layout/ ui/
  server/                       business logic (server-only): listings, parts, inquiries, payments, admin
    payments/                   azampay.ts · selcom.ts · dpo.ts · index.ts (routing, fulfilment, idempotency)
    actions/                    server actions used by forms
  lib/                          prisma client, auth, OTP, SMS, phone (+255), money (TZS), FX, import cost, zod schemas
  config/                       regions & districts, makes & models, plans & promotion prices, import-tax defaults
  i18n/                         English + Swahili dictionaries, server/client helpers
  middleware.ts                 auth guard for /dashboard, /sell, /admin
```

---

## 3. API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/listings?make=toyota&model=harrier&priceMax=60m&region=dar-es-salaam&body=SUV&fourWd=1&sort=price_asc&page=2` | Filtered search with facet counts |
| POST | `/api/listings` | Create a vehicle listing (auth) |
| GET/PATCH/DELETE | `/api/listings/:id` | Read / update price, status (sold, archived) / archive |
| POST | `/api/listings/:id/events` | `VIEW`, `WHATSAPP_CLICK`, `CALL_CLICK` analytics beacon |
| GET/POST | `/api/parts` | Parts search (`q`, `category`, `make`, `model`, `year`) / create part with fitment |
| POST | `/api/inquiries` | Buyer → seller lead (rate-limited, honeypot, SMS to seller) |
| GET | `/api/inquiries` | Seller's leads inbox |
| PATCH/POST | `/api/inquiries/:id` | Change lead status / reply (SMS to buyer) |
| POST | `/api/auth/otp` | Send SMS login code |
| POST | `/api/auth/register` | Email/phone + password sign-up |
| POST | `/api/payments` | Start mobile-money push or card checkout (price resolved server-side) |
| GET | `/api/payments/:id` | Poll payment status |
| POST | `/api/payments/callback/{azampay,selcom,dpo}` | Gateway webhooks (verified before fulfilment) |
| POST | `/api/import-estimate` | Landed-cost calculator (duty, excise, VAT, levies, clearing) |
| GET | `/api/taxonomy`, `/api/fx` | Makes/models/regions; USD→TZS rate |
| POST | `/api/uploads/sign` | Cloudinary signed-upload parameters |
| POST | `/api/businesses`, `/api/favorites`, `/api/reports` | Business profile, saved items, scam reports |
| GET | `/api/cron/maintenance` | Hourly: expire promotions, listings, subscriptions (Bearer `CRON_SECRET`) |

Phone numbers in any format (`0712…`, `712…`, `255712…`, `+255 712…`) are normalised to E.164 `+2557XXXXXXXX`. Prices accept `45000000`, `45,000,000` or `45m`.

---

## 4. Payments

| Wallet / method | Default gateway | Fallback |
|---|---|---|
| Vodacom M-Pesa, Mixx by Yas (Tigo Pesa), Airtel Money, HaloPesa, AzamPesa | **AzamPay** MNO checkout (USSD push) | Selcom wallet push |
| Visa / Mastercard | **DPO Pay** hosted checkout | Selcom hosted checkout |

To force a gateway, set `PAYMENTS_MNO_GATEWAY=selcom` or `PAYMENTS_CARD_GATEWAY=selcom`. The client never sends an amount: prices come from the `PromotionProduct` and `Plan` tables. Fulfilment is idempotent, rejects underpayment, and re-verifies with Selcom and DPO before it delivers. AzamPay doesn't sign its callbacks, so set `AZAMPAY_CALLBACK_TOKEN`, which is appended to the callback URL and checked on every callback. Register `https://your-domain/api/payments/callback/azampay?token=YOUR_TOKEN` in the AzamPay portal.

## 5. Import landed-cost estimate

The rates live in `src/config/import-tax.ts`, and admins can edit them at **/admin/settings**:

- Import duty 25%
- Engine-capacity excise: 0% up to 1000 cc, 5% up to 2000 cc, 10% above
- Finance Act 2026 age excise: 18% for 8–10 years, 35% for 10–20 years, 40% over 20 years
- VAT 18%, Railway Development Levy 1.5%, customs processing fee 0.6%
- Port, clearing and registration as flat TZS amounts

**Check these against current TRA figures before launch.** The page labels the result as an estimate.

## 6. Production checklist

1. Hosting: Vercel, or a VPS with `npm run build && npm start`. Database: a managed PostgreSQL such as Neon, Supabase or RDS (`af-south-1` is the closest AWS region).
2. Set every value in `.env.example`, including a long random `NEXTAUTH_SECRET` and `NEXT_PUBLIC_SITE_URL`.
3. Run `npm test`, then `npm run db:migrate` on deploy. Seed once with `npm run db:seed`.
4. SMS: `SMS_DRIVER=beem` (register a sender ID with Beem Africa) or `africastalking`. Email: `EMAIL_DRIVER=smtp` or `resend` (see Email above).
5. Cloudinary: add the cloud name and API key/secret. Local disk uploads are disabled in production.
6. Schedule `/api/cron/maintenance` hourly, with header `Authorization: Bearer $CRON_SECRET`.
7. Register the payment callback URLs with AzamPay, Selcom and DPO, then set `PAYMENTS_MODE=production`.
8. Rate limiting is in-memory per instance. If you run more than one instance, back `src/lib/rate-limit.ts` with Redis (Upstash).
