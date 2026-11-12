# Bazar

A Next.js App Router wholesale storefront with English (`en`), Arabic (`ar`), and Central Kurdish (`ckb`) routes. Arabic and Kurdish pages use right-to-left layout. Products are read from PostgreSQL through Prisma; Supabase Auth verifies retailer and admin requests.

## Free-tier setup

This starter uses Supabase Free for PostgreSQL, Auth, and product-image storage, and Vercel Hobby for hosting. Free plans have usage limits and may change; Supabase can pause inactive free projects. Vercel Hobby is intended for personal, non-commercial use. Check both providers' current terms and limits before launch. The project includes an admin workspace, product import/export, retailer order tracking, printable invoices, route grouping, custom item requests, and a PWA shell. It does not include payment processing, fulfillment, or a cart/checkout UI.

### 1. Create Supabase services

1. Create a Supabase project on its Free plan.
2. In **Project Settings → Database**, copy the transaction-pooler connection string (port `6543`) to `DATABASE_URL`. Set `DIRECT_URL` to the direct connection or session-pooler connection (port `5432`) for migrations.
3. In **Project Settings → API**, copy the project URL and publishable/anon key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. In **Storage**, create a public bucket named `products`. Upload product images there and save each public image URL in its product record. Keep the bucket public-read only; do not add a public upload policy.
5. In **Authentication → URL Configuration**, allow `http://localhost:3000/auth/callback` and your deployed site's `/auth/callback` URL. Configure email sign-in. Retailers and admins use one-time email sign-in links.

### 2. Run locally in VS Code

1. Install Node.js 22 or newer and open this project folder in VS Code.
2. In the VS Code PowerShell terminal, run `Copy-Item .env.example .env.local`, then replace the example values with your Supabase project values.
3. In the VS Code terminal, run:

   ```powershell
   npm install
   npm run db:migrate -- --name init
   npm run dev
   ```

4. Open `http://localhost:3000`. The root redirects to `/en`; `/ar` and `/ckb` show the RTL language versions.
5. Add your sign-in address to `ADMIN_EMAILS` in `.env.local`, restart the dev server, and open `/admin`. The first sign-in creates your Supabase Auth account.
6. Add products in `/admin` using the CSV template or Excel; product images can be uploaded to the `products` bucket and referenced by their public HTTPS URLs.

### Business features

- **Bulk catalog:** `/admin` imports/updates up to 5,000 products per CSV or `.xlsx` file (4 MB upload limit) and exports CSV/Excel. Download [`products-import-template.csv`](./public/products-import-template.csv). Required columns are `slug`, `priceCents`, `costPriceCents`, `stock`, `currency`, `imageUrl`, `active`, plus `name_{en,ar,ckb}` and `category_{en,ar,ckb}`. Descriptions are optional. Amounts are integer minor units (for example, 1250 = 12.50). Each import requires translations in all three languages. The import is validated before an atomic database update.
- **Orders and invoices:** Retailers open `/orders` to track Pending, Processing, Out for Delivery, and Delivered states. Admins update status and see order invoices at `/admin`; invoice pages support printing or saving to PDF from the browser. Order line prices and costs are snapshots, so future catalog changes do not rewrite historical profit.
- **Profit reporting:** Product cost is never included in public catalog, retailer order, or invoice API responses. The admin dashboard calculates gross product profit from the stored order-line snapshots (`selling price - cost price`) times quantity. It groups revenue/profit by currency and excludes delivery/other expenses.
- **Delivery routes:** Retailer city is saved with each order. Supported cities are Sayed Sadiq, Halabja Taza, Darbandikhan, and Sharazoor; the admin dashboard filters orders and item requests by city.
- **Custom item requests:** Signed-in retailers can submit requests from the storefront. Admins can filter and update their review status in `/admin`.
- **Installable PWA:** `/manifest.webmanifest`, 192/512 PNG icons, and `/sw.js` provide install metadata and an offline fallback. Private API responses are never cached. On Android use the browser's Install option; on iOS use Safari's **Add to Home Screen**. Offline mode only provides the fallback page; catalog, sign-in, and order actions require a connection.

The public catalog endpoint supports pagination: `GET /api/products?locale=en&limit=24&cursor=...`. Sign-in uses Supabase email links. `POST /api/users/me` can save a retailer city using `Authorization: Bearer <Supabase access token>` and a JSON body such as `{ "city": "HALABJA_TAZA" }`. `POST /api/orders` accepts `{ "locale": "en", "items": [{ "productId": "...", "quantity": 1 }] }` and requires an authenticated user with a saved city. It creates a pending order using database prices and costs. Payment processing, inventory reservation/decrement, and a cart/checkout UI still need to be added before accepting live orders.

### 3. Push to GitHub and deploy on Vercel

1. Create a GitHub repository, then from the VS Code terminal initialize and push this project:

   ```powershell
   git init
   git add .
   git commit -m "Create Bazar storefront"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

2. In Vercel, import the GitHub repository and select the Next.js defaults.
3. Add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ADMIN_EMAILS` under the Vercel project's **Settings → Environment Variables** for Production (and Preview if desired). `DIRECT_URL` is only needed on the machine that runs migrations. Never commit `.env.local` or expose database credentials.
4. Deploy. Vercel will build the app; subsequent pushes to `main` trigger production deployments, while other branches create previews.
5. Before deploying a schema change, run `npm run db:deploy` locally against the production database after reviewing the committed Prisma migration. Vercel builds do not run migrations automatically.

## Useful commands

- `npm run dev` — local development server
- `npm run build` — generate Prisma Client and build Next.js
- `npm run typecheck` — run TypeScript checks
- `npm run db:migrate -- --name change_name` — create/apply a local migration
- `npm run db:deploy` — apply committed migrations to the configured database
- `npm run db:studio` — inspect and edit database records

Keep credentials private, use Supabase Row Level Security for any direct client-side database access, and review free-tier quotas before importing a large catalog or launching publicly.
