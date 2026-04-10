-- ═══════════════════════════════════════════════════════════════════
-- Param Makerspace — Explorer Hub seed challenges
-- ═══════════════════════════════════════════════════════════════════
--
-- 6 real, buildable blueprints covering all three tiers and the main
-- domains so the Explorer Hub feed has enough variety to exercise
-- every card variant (medium / spotlight / quote) and every mood
-- preset (Quick wins / Weekend dive / Laptop only / Workshop bay / etc).
--
-- What this file assumes:
--   • The `challenge` table exists with the schema in supabase-schema.sql
--     (id, title, tier, domain, time_estimate, cover_image_url,
--     mystery, core_idea, mission, success_criteria, status, created_by,
--     created_at, updated_at).
--   • You are running this as a database owner / service role in the
--     Supabase SQL Editor. RLS policies on `challenge` require a
--     mentor/admin role for inserts, which the SQL Editor bypasses.
--   • `created_by` is nullable in your schema. If you want these seeds
--     attributed to a specific mentor, replace NULL below with that
--     user's app_user.id.
--
-- Safety:
--   • ON CONFLICT DO NOTHING by title — re-running this file is idempotent
--     as long as you don't rename the seeds.
--   • No DELETE statements, no TRUNCATE, no schema changes. Pure INSERT.
--   • Cover images point to Unsplash CDN URLs that are hotlink-friendly.
--
-- Tier meaning (as used by Explorer Hub):
--   Tier 1 = Explorer  — Fundamentals, beginner-friendly
--   Tier 2 = Solver    — Integration, weekend-scope
--   Tier 3 = Architect — Systems, multi-week
-- ═══════════════════════════════════════════════════════════════════

-- Add a unique constraint on title if one doesn't already exist. This is
-- what makes ON CONFLICT work. The constraint is idempotent — if it
-- already exists the statement is a no-op.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'challenge_title_unique'
    ) THEN
        ALTER TABLE challenge ADD CONSTRAINT challenge_title_unique UNIQUE (title);
    END IF;
END $$;

INSERT INTO challenge (
    title,
    tier,
    domain,
    time_estimate,
    cover_image_url,
    mystery,
    core_idea,
    mission,
    success_criteria,
    status,
    created_by
) VALUES
-- ──────────────────────────────────────────────────────────────────
-- 1. Tier 1 · Electronics · Quick win
-- ──────────────────────────────────────────────────────────────────
(
    'Blinkenlights: Your First Microcontroller',
    'Tier 1',
    'Electronics',
    '2 hrs',
    'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=1200&q=80',
    'What if a tiny chip smaller than your fingernail could listen to the world and talk back to it?',
    'Wire an Arduino Uno to a breadboard, blink an LED, read a button, and react to a potentiometer. The "hello world" of hardware — but you will actually understand every wire.',
    'Build a reaction-timer game: an LED turns on at a random moment, and the player must press the button as fast as possible. The potentiometer sets the difficulty by shrinking the reaction window.',
    'Game runs for 10 rounds, logs reaction times in the serial monitor, and shows fastest/slowest/average at the end.',
    'published',
    NULL
),
-- ──────────────────────────────────────────────────────────────────
-- 2. Tier 1 · AI · Laptop only
-- ──────────────────────────────────────────────────────────────────
(
    'Teach a Computer to See Your Hand',
    'Tier 1',
    'AI',
    '3 hrs',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
    'Your laptop has a camera. What if it could count how many fingers you are holding up, just by looking?',
    'Use MediaPipe Hands in a Python notebook to detect hand landmarks in your webcam feed. No training data, no GPU, no machine learning background required.',
    'Write a 50-line Python script that opens your webcam and prints the number of raised fingers in real time. Bonus: make the terminal print a thumbs-up emoji when you give a thumbs-up.',
    'Runs at >15 FPS on a normal laptop. Correctly counts 0–5 fingers in at least 3 different hand orientations.',
    'published',
    NULL
),
-- ──────────────────────────────────────────────────────────────────
-- 3. Tier 2 · Robotics · Weekend dive
-- ──────────────────────────────────────────────────────────────────
(
    'The Line-Follower That Thinks',
    'Tier 2',
    'Robotics',
    '1 week',
    'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1200&q=80',
    'A line-follower is a beginner project. A line-follower that *learns* where it is on the track — that is the real game.',
    'Build a two-wheeled robot with IR line sensors and an ESP32. Layer a simple PID controller on top of raw sensor readings so the bot takes curves smoothly instead of zig-zagging. Then log sensor traces to Serial so you can tune it scientifically, not by vibes.',
    'Design a figure-8 track on paper. Your bot completes a full lap in under 45 seconds without losing the line. Bonus: add a buzzer that beeps when the bot enters a curve, so you can hear the control loop thinking.',
    'Clean lap on figure-8. PID constants chosen via logged data (not trial and error). Code is on GitHub with a README showing your tuning process.',
    'published',
    NULL
),
-- ──────────────────────────────────────────────────────────────────
-- 4. Tier 2 · Fabrication · Workshop bay
-- ──────────────────────────────────────────────────────────────────
(
    'CNC-Milled Mechanical Keyboard Plate',
    'Tier 2',
    'Fabrication',
    '3 days',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&q=80',
    'Every mechanical keyboard has a metal plate you never see. What if you made yours — and it was better than the one that came in the box?',
    'Model a 60% keyboard switch plate in Fusion 360, generate G-code with a CAM workflow, and mill it from 1.5mm aluminium on the workshop CNC. Learn speeds & feeds, climb vs conventional milling, and why your first plate will have burrs.',
    'Produce a plate that accepts Cherry MX switches with a snug press-fit and mounts to a standard 60% PCB without shims. Post-process the edges so nothing snags a cable.',
    'Plate passes the "drop-test" — switches stay seated when the plate is flipped upside down. Tolerances within ±0.1mm. Surface finish is at least Ra 3.2.',
    'published',
    NULL
),
-- ──────────────────────────────────────────────────────────────────
-- 5. Tier 3 · Interdisciplinary · Architect-level
-- ──────────────────────────────────────────────────────────────────
(
    'Indoor Air Quality Mesh for the Makerspace',
    'Tier 3',
    'Interdisciplinary',
    '3 weeks',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&q=80',
    'A soldering station puts fine particulates in the air. A laser cutter puts acrolein in the air. If no one is measuring, no one is breathing safely.',
    'Design a mesh of 5 battery-powered air quality sensor nodes (CO2, PM2.5, VOC) that report to a central Raspberry Pi running InfluxDB + Grafana. Build it to survive a real workshop — heat, dust, the occasional coffee spill — and produce a dashboard that shows 24h air quality trends per bay.',
    'Deliver a working 5-node mesh installed across the electronics lab, the woodshop, and the chemistry bench. Nodes communicate via LoRa or ESP-NOW (not Wi-Fi — it goes down). Dashboard is read-only and accessible from any device on the local network.',
    'Nodes report at least once per minute with <5% packet loss over 7 consecutive days. Dashboard shows a clear alert when PM2.5 exceeds 35 µg/m³. Physical enclosures are tool-free serviceable (no screws, only clips).',
    'published',
    NULL
),
-- ──────────────────────────────────────────────────────────────────
-- 6. Tier 1 · Design · Quick win with a twist
-- ──────────────────────────────────────────────────────────────────
(
    'A Typographic Specimen Poster, Printed Large',
    'Tier 1',
    'Design',
    '4 hrs',
    'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=1200&q=80',
    'Typography is not decoration — it is the voice of a document. What does your favorite font actually sound like at A2 size?',
    'Pick one typeface (free, open-source — something from Google Fonts or SIL). Use Figma or Affinity to build a single-page specimen poster that shows the full character set, weights, and three sample paragraphs at three different sizes. Print it on the makerspace plotter at A2.',
    'Your poster must communicate the personality of the font without using any colour other than black on cream. The hierarchy should guide the eye through: headline → character grid → sample text → footnote credit. Print one copy and pin it to the wall.',
    'Printed A2 poster physically exists. Design file is shared as a Figma link. At least 3 people in the makerspace can correctly guess the personality of the font (serious / playful / academic) from the poster alone.',
    'published',
    NULL
)
ON CONFLICT (title) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- How to verify after running
-- ═══════════════════════════════════════════════════════════════════
-- SELECT id, title, tier, domain, time_estimate, status
-- FROM challenge
-- WHERE title IN (
--     'Blinkenlights: Your First Microcontroller',
--     'Teach a Computer to See Your Hand',
--     'The Line-Follower That Thinks',
--     'CNC-Milled Mechanical Keyboard Plate',
--     'Indoor Air Quality Mesh for the Makerspace',
--     'A Typographic Specimen Poster, Printed Large'
-- )
-- ORDER BY tier, title;
-- ═══════════════════════════════════════════════════════════════════
