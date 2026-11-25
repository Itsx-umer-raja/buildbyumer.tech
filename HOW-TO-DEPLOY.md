# How to deploy PDF World on Vercel (from GitHub)

These are the owner's steps. No credentials are stored anywhere in this
repository, and nothing here needs an API key.

## Before you start

- The code is in a GitHub repository (for example `Itsx-umer-raja/buildbyumer.tech`
  or whichever repository you use for this site — use the repository you actually
  pushed this project to).
- You have a free Vercel account (sign up at vercel.com with your GitHub
  account if you do not have one yet).
- The project builds locally: run `npm install` then `npm run build` and fix
  any errors before deploying.

## Steps

1. **Push the code to GitHub.**
   From the project folder:
   ```bash
   git add .
   git commit -m "Deploy PDF World"
   git push origin main
   ```
   (Use your repository's actual default branch name if it is not `main`.)
   Do not push `node_modules/` or `.next/` — both are ignored by `.gitignore`.

2. **Go to Vercel and import the project.**
   - Open the Vercel dashboard and click **Add New → Project**.
   - Choose **Import** next to the GitHub repository containing this project.
   - If Vercel asks for permission to access your GitHub repositories, grant
     access to that repository only (or all repositories, if you prefer).

3. **Set the framework preset.**
   - Vercel should detect **Next.js** automatically. If it does not, set
     **Framework Preset** to **Next.js**.
   - Leave the **Build Command** as `npm run build` (or `next build`) and the
     **Install Command** as `npm install`. Leave **Output Directory** empty —
     Next.js handles it.
   - Set one environment variable before deploying:
     - **Name:** `NEXT_PUBLIC_SITE_URL`
     - **Value:** your site's real public address, with no trailing slash —
       for example `https://buildbyumer.vercel.app` (the `*.vercel.app` address
       Vercel gives you) or your own domain such as `https://example.com`.
     - This is the address used in the sitemap, `robots.txt` and the
       homepage's structured data. If you skip it, the site falls back to a
       clearly-labelled placeholder (`https://buildbyumer.vercel.app`) in
       `lib/site.ts` — update that file or, better, set the variable so the
       placeholder is never used in production.

4. **Deploy.**
   - Click **Deploy**. Vercel builds the site and gives you a `*.vercel.app`
     address when it finishes.
   - Open that address and check: the homepage loads, a tool page opens
     (for example `/tools/merge-pdf`), and the resume builder opens at
     `/resume`.

5. **Every future update deploys automatically.**
   - Push to the repository's default branch and Vercel rebuilds and
     redeploys on its own. Pull requests get their own preview address.

## Optional: use your own domain

- In the Vercel dashboard, open the project → **Settings → Domains** → add
  your domain and follow Vercel's DNS instructions for it.
- After adding a custom domain, update **Settings → Environment Variables →
  `NEXT_PUBLIC_SITE_URL`** to that domain (for example
  `https://example.com`, no trailing slash) and redeploy. The sitemap,
  `robots.txt` and homepage structured data all read that one variable, so
  there is nothing else to edit. Never use the old site's domain for this
  site — it belongs to a different project.

## Troubleshooting

- **Build fails on Vercel but works locally:** make sure `package-lock.json`
  is committed, then check the build log in the Vercel dashboard — the first
  error line is usually the cause.
- **A page shows 404:** check the route exists under `app/` (for example
  `app/tools/[slug]/page.tsx` generates one page per tool in
  `lib/tools.ts`).
- **The PDF worker fails to load:** `public/pdf.worker.min.mjs` must be
  present in the repository; it is the pdf.js worker the tools use.
