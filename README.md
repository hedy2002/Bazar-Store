# Bazar

A Next.js App Router wholesale storefront with English (`en`), Arabic (`ar`), and Central Kurdish (`ckb`) routes. Arabic and Kurdish pages use right-to-left layout. Products are read from PostgreSQL through Prisma; Supabase Auth verifies retailer and admin requests.

## Free-tier setup

This starter uses Supabase for PostgreSQL, Auth, and product-image storage. Check provider terms and usage limits before launch. The project includes separate store-owner and shop-owner roles, an admin workspace, product management, B2B order placement and tracking, printable invoices, custom item requests, and a PWA shell. It does not include online payment processing or fulfillment.

### 1. Create Supabase services

1. Create a Supabase project on its Free plan.
2. In **Project Settings → Database**, copy the transaction-pooler connection string (port `6543`) to `DATABASE_URL`. Set `DIRECT_URL` to the direct connection or session-pooler connection (port `5432`) for migrations.
3. In **Project Settings → API**, copy the project URL and publishable/anon key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. In **Storage**, create a public bucket named `products`. Keep it public-read only; do not add a public upload policy. Set `SUPABASE_SERVICE_ROLE_KEY` on the server so only authorized store owners can upload images.
5. In **Authentication → URL Configuration**, allow `http://localhost:3000/auth/callback` and your deployed site's `/auth/callback` URL. Configure email sign-in. Retailers and admins use one-time email sign-in links.

### 2. Run locally in VS Code

1. Install Node.js 22 or newer and open this project folder in VS Code.
2. In the VS Code PowerShell terminal, run `Copy-Item .env.example .env`, then replace the example values with your Supabase project values. Use `.env` for local Prisma commands because Prisma CLI does not load Next.js-only `.env.local` files.
3. In the VS Code terminal, run:

   ```powershell
   npm install
   npm run db:migrate -- --name init
   npm run dev
   ```

4. Open `http://localhost:3000`. The root redirects to `/en`; `/ar` and `/ckb` show the RTL language versions.
5. Set `ADMIN_EMAILS="Headi.karim@gmail.com"` in `.env` and in the deployment environment, restart the dev server, and sign in with that address. The first sign-in creates the Supabase Auth account; that exact allowlisted address is assigned `STORE_OWNER`, and all other authenticated addresses are `SHOP_OWNER`.
6. Store owners can access `/admin` to add, edit, deactivate, or delete products, upload images, and manage orders. Shop owners are restricted to catalog browsing, search, B2B ordering, and their own orders.

### Business features

- **Role separation:** The server maps addresses in `ADMIN_EMAILS` to `STORE_OWNER`. Other signed-in users receive the `SHOP_OWNER` role. Permissions are defined separately from role names; admin pages, product APIs, image uploads, order administration, and item-request administration all verify permissions on the server. Client-side visibility is not the security boundary.
- **Product management:** `/admin` supports creating, editing, and deleting products, including prices, costs, stock, localized names/categories/descriptions, image upload, and flexible JSON mobile-accessory specifications (for example brand, model, connector, color, and compatibility). Products already referenced by an order cannot be deleted; deactivate them instead. Store owners can also import up to 5,000 products per CSV or `.xlsx` file (4 MB upload limit) and export CSV/Excel. Download [`products-import-template.csv`](./public/products-import-template.csv). Required columns are `slug`, `priceCents`, `costPriceCents`, `stock`, `currency`, `imageUrl`, `active`, and each `name_{en,ar,ckb}` and `category_{en,ar,ckb}`. `specifications` is an optional JSON object column; descriptions are optional. Amounts are integer minor units (for example, 1250 = 12.50). Each import requires translations in all three languages. The import is validated before an atomic database update.
- **Product images:** The protected upload endpoint accepts JPEG, PNG, and WebP images up to 5 MB and stores them in the configured Supabase Storage bucket. The bucket should remain public-read only; never expose or commit `SUPABASE_SERVICE_ROLE_KEY`.
- **B2B orders:** Shop owners can search the catalog, add items to an order, and submit their full name, phone number, delivery address/location, and delivery city. The order stores these details for the admin dashboard and invoice. Successful orders show a Fox Design Instagram link. The server verifies the shop-owner role, contact details, availability, stock, currency, and prices before creating an order.
- **Orders and invoices:** Retailers open `/orders` to track Pending, Processing, Out for Delivery, and Delivered states. Admins update status and see order invoices at `/admin`; invoice pages support printing or saving to PDF from the browser. Order line prices and costs are snapshots, so future catalog changes do not rewrite historical profit.
- **Profit reporting:** Product cost is never included in public catalog, retailer order, or invoice API responses. The admin dashboard calculates gross product profit from the stored order-line snapshots (`selling price - cost price`) times quantity. It groups revenue/profit by currency and excludes delivery/other expenses.
- **Delivery routes:** Retailer city is saved with each order. Supported cities are Sayed Sadiq, Halabja Taza, Darbandikhan, and Sharazoor; the admin dashboard filters orders and item requests by city.
- **Custom item requests:** Signed-in retailers can submit requests from the storefront. Admins can filter and update their review status in `/admin`.
- **Installable PWA:** `/manifest.webmanifest`, 192/512 PNG icons, and `/sw.js` provide install metadata and an offline fallback. Private API responses are never cached. On Android use the browser's Install option; on iOS use Safari's **Add to Home Screen**. Offline mode only provides the fallback page; catalog, sign-in, and order actions require a connection.

The public catalog endpoint supports pagination and search: `GET /api/products?locale=en&limit=24&cursor=...&q=cable`. Sign-in uses Supabase email links. `POST /api/users/me` saves a shop owner's delivery city. `POST /api/orders` accepts `{ "locale": "en", "items": [{ "productId": "...", "quantity": 1 }] }` and creates a pending order using database prices and costs. Payment processing, inventory reservation/decrement, and fulfillment still need to be added before accepting paid live orders.

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
3. Add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PRODUCT_IMAGES_BUCKET`, and `ADMIN_EMAILS` under the Vercel project's **Settings → Environment Variables** for Production (and Preview if desired). `DIRECT_URL` is only needed on the machine that runs migrations. Never commit `.env` or `.env.local`, expose database credentials, or expose the service-role key to the browser.
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
