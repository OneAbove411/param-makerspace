# Supabase — Next Steps

One thing to do on your side: **push the seed challenges** so the Explorer Hub feed has real content to render.

> **Note on TypeScript types:** The earlier plan to regenerate `src/lib/database.types.ts` via the Supabase CLI was wrong. That file is hand-written ("Auto-mapped to the Supabase schema. Keep in sync with supabase-schema.sql"), not auto-generated. The real issue was that four table entries (`project_bom_line`, `project_make`, `project_comment_pin`, `project_merge_request`) were missing from the `Database.public.Tables` map while their row interfaces already existed in the same file. That has been fixed in-repo with a surgical 4-line addition. No CLI, no regeneration, no schema change on your side. `npm run build` errors dropped from 39 to 18 after the fix; the remaining 18 are unrelated pre-existing issues in edit-project, Remix, and a couple of hooks.ts spots.

---

## Push the seed challenges

### What you're getting
`supabase-seed-challenges.sql` in the repo root. It inserts **6 real blueprints** covering all three tiers and the main domains:

| # | Tier   | Domain             | Title                                           | Estimate |
|---|--------|--------------------|-------------------------------------------------|----------|
| 1 | Tier 1 | Electronics        | Blinkenlights: Your First Microcontroller       | 2 hrs    |
| 2 | Tier 1 | AI                 | Teach a Computer to See Your Hand               | 3 hrs    |
| 3 | Tier 2 | Robotics           | The Line-Follower That Thinks                   | 1 week   |
| 4 | Tier 2 | Fabrication        | CNC-Milled Mechanical Keyboard Plate            | 3 days   |
| 5 | Tier 3 | Interdisciplinary  | Indoor Air Quality Mesh for the Makerspace      | 3 weeks  |
| 6 | Tier 1 | Design             | A Typographic Specimen Poster, Printed Large    | 4 hrs    |

Each entry has a title, tier, domain, time estimate, cover image URL (Unsplash, hotlink-friendly), mystery hook, core idea, mission statement, and success criteria — matching the exact columns in your `challenge` table.

### Safety guarantees
- **Idempotent.** The file adds a unique constraint on `title` the first time it runs, then uses `ON CONFLICT DO NOTHING`. Running it twice will insert nothing the second time.
- **No DELETE, no TRUNCATE, no DROP.** Pure INSERT statements.
- **No schema changes** other than the title uniqueness constraint (which is what makes re-runs safe).
- **`created_by` is NULL** for all seeds. If you want them attributed to a specific mentor account, find that user's `app_user.id` and replace the six `NULL` values on the `created_by` lines.

### How to run
Pick whichever is less friction.

**Option A — Supabase dashboard (easiest):**
1. Open your project in the Supabase dashboard.
2. Go to **SQL Editor**.
3. Click **New query**.
4. Paste the entire contents of `supabase-seed-challenges.sql`.
5. Click **Run**.
6. Confirm with the verification query at the bottom of the file — it should return 6 rows.

**Option B — psql command line** (if you have a direct DB connection string):
```
psql "YOUR_DB_CONNECTION_STRING" -f supabase-seed-challenges.sql
```

### Verifying visually
Once the insert succeeds:
1. Refresh the Explorer Hub page (`/challenges`).
2. You should see 6 cards in the feed.
3. Try the mood presets:
   - **Quick wins** → should show entries 1, 2, 6 (Tier 1 + short time estimates)
   - **Weekend dive** → should show entries 3 and 4 (Tier 2)
   - **Laptop only** → should show entry 2 (AI domain)
   - **Workshop bay** → should show entry 4 (Fabrication domain)
   - **Go deep** → should show entry 5 (Tier 3)

If any filter produces an empty result and you expected cards, let me know which one and I'll check the filter predicate.

### Customising before you run
Before pasting, you can freely:
- Edit titles, tiers, domains, estimates, hooks, etc.
- Swap cover image URLs to your own (must be HTTPS and must allow hotlinking — ideally your Supabase Storage bucket).
- Add or remove rows.

Just keep the column list and the `ON CONFLICT (title) DO NOTHING` clause as-is so reruns stay safe.

---

## When you're done
Ping me with a screenshot of the feed after the seed and I'll verify nothing looks off.
