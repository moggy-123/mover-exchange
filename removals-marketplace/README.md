# Mover-Exchange — Setup Guide

## What's in this build
- Company signup with trading-card profile (fleet, staff, years trading, memberships)
- Browse members page (the "top trumps" cards)
- Listings: post a request or offer for staff/vehicle, browse open ones, respond
- Login/logout, protected pages

Not yet built: document upload/verification UI, accept/decline response flow, messaging, ratings UI, storage & load listings. These are phase 1.5/2 — say the word and we build them next.

## Setup steps

### 1. Run the database schema
In your Supabase project → **SQL Editor** → New Query → paste the entire contents of `supabase/schema.sql` → Run.

This creates all 7 tables, the security rules (RLS), and the rating trigger.

### 2. Create the GitHub repo
1. Go to github.com → New repository → name it `removals-marketplace` → Create
2. Use the GitHub web interface to upload all the files in this project (drag and drop, or "Add file → Upload files"), keeping the folder structure intact

### 3. Connect to Vercel
1. Go to vercel.com → New Project → Import your `removals-marketplace` GitHub repo
2. Before deploying, add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
3. Deploy

### 4. Test it
Once live, sign up as your own company, then open an incognito window and sign up as a second "test company" so you can see the listings/response flow from both sides.

## Your workflow going forward
Same as your other two apps — edit files in the GitHub web editor, commit, Vercel auto-deploys. Come back here any time you want the next feature built (document upload, storage listings, load-share, messaging, accept/decline flow) and I'll write the code the same way.
