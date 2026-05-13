const express = require("express");
const path    = require("path");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const { Pool } = require("pg");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "brandbae-dev-secret-change-in-prod";

const app  = express();
const PORT = process.env.PORT || 3000;

// ── DATABASE ──
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err.message);
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
            id         SERIAL PRIMARY KEY,
            name       TEXT NOT NULL,
            phone      TEXT NOT NULL,
            city       TEXT NOT NULL,
            source     TEXT DEFAULT 'marketplace_unlock',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS creators (
            id             SERIAL PRIMARY KEY,
            niche          TEXT NOT NULL,
            followers      INTEGER NOT NULL,
            engagement     NUMERIC(4,1) NOT NULL,
            city           TEXT NOT NULL,
            avg_likes      INTEGER NOT NULL,
            avg_comments   INTEGER NOT NULL,
            avg_reel_views INTEGER NOT NULL,
            age_range      TEXT NOT NULL,
            female_p       INTEGER NOT NULL,
            male_p         INTEGER NOT NULL,
            locations      TEXT[] NOT NULL,
            reel_price     INTEGER NOT NULL DEFAULT 0,
            story_price    INTEGER NOT NULL DEFAULT 0,
            post_price     INTEGER NOT NULL DEFAULT 0,
            verified       BOOLEAN NOT NULL DEFAULT false,
            barter         BOOLEAN NOT NULL DEFAULT false,
            barter_note    TEXT,
            created_at     TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL CHECK (role IN ('brand', 'creator', 'admin')),
            created_at    TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_applications (
            id               SERIAL PRIMARY KEY,
            user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
            full_name        TEXT NOT NULL,
            instagram_handle TEXT NOT NULL,
            niche            TEXT NOT NULL,
            city             TEXT NOT NULL,
            followers        INTEGER NOT NULL,
            reel_price       INTEGER,
            story_price      INTEGER,
            post_price       INTEGER,
            barter           BOOLEAN NOT NULL DEFAULT false,
            barter_note      TEXT,
            bio              TEXT,
            status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            reviewed_at      TIMESTAMPTZ,
            created_at       TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log("Database ready.");
}

// ── MIDDLEWARE ──
app.use(express.json());
app.use(express.static(__dirname));

// JWT auth middleware
function requireAuth(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
        next();
    });
}

// Parse cookies without a dependency
app.use((req, _res, next) => {
    req.cookies = {};
    const raw = req.headers.cookie || "";
    raw.split(";").forEach((pair) => {
        const [k, ...v] = pair.trim().split("=");
        if (k) req.cookies[k.trim()] = decodeURIComponent(v.join("="));
    });
    next();
});

// ── PAGE ROUTES ──
app.get("/",                (_req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/marketplace",     (_req, res) => res.sendFile(path.join(__dirname, "marketplace.html")));
app.get("/join",                (_req, res) => res.sendFile(path.join(__dirname, "join.html")));
app.get("/login/creator",       (_req, res) => res.sendFile(path.join(__dirname, "login-creator.html")));
app.get("/creator/dashboard",   (_req, res) => res.sendFile(path.join(__dirname, "creator-dashboard.html")));
app.get("/admin",               (_req, res) => res.sendFile(path.join(__dirname, "admin.html")));

// ── CREATOR — own profile ──
app.get("/api/creator/me", requireAuth, async (req, res) => {
    if (req.user.role !== "creator") return res.status(403).json({ error: "Forbidden" });
    try {
        const { rows: [profile] } = await pool.query(
            `SELECT ca.*, u.email
             FROM creator_applications ca
             JOIN users u ON u.id = ca.user_id
             WHERE ca.user_id = $1`,
            [req.user.id]
        );
        if (!profile) return res.status(404).json({ error: "Profile not found" });
        res.json(profile);
    } catch (err) {
        console.error("GET /api/creator/me error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── AUTH — CREATOR REGISTER (application) ──
app.post("/auth/creator/register", async (req, res) => {
    const { email, password, full_name, instagram_handle, niche, city,
            followers, reel_price, story_price, post_price, barter, barter_note, bio } = req.body;

    if (!email || !password || !full_name || !instagram_handle || !niche || !city || !followers) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
        if (existing.rows.length) return res.status(409).json({ error: "An account with this email already exists." });

        const handleTaken = await pool.query(
            "SELECT id FROM creator_applications WHERE LOWER(instagram_handle) = LOWER($1)",
            [instagram_handle.trim()]
        );
        if (handleTaken.rows.length) return res.status(409).json({ error: "This Instagram handle is already registered on Brandbae." });

        const password_hash = await bcrypt.hash(password, 12);

        const { rows: [user] } = await pool.query(
            `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'creator') RETURNING id`,
            [email.toLowerCase().trim(), password_hash]
        );

        await pool.query(
            `INSERT INTO creator_applications
             (user_id, full_name, instagram_handle, niche, city, followers,
              reel_price, story_price, post_price, barter, barter_note, bio)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [user.id, full_name, instagram_handle, niche, city, parseInt(followers),
             reel_price || 0, story_price || 0, post_price || 0,
             barter || false, barter_note || null, bio || null]
        );

        console.log(`[NEW APPLICATION] ${full_name} (${instagram_handle}) — ${niche} · ${city}`);
        res.status(201).json({ success: true, message: "Application submitted. We'll review it within 48 hours." });
    } catch (err) {
        console.error("POST /auth/creator/register error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── AUTH — CREATOR LOGIN ──
app.post("/auth/creator/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password_hash, u.role, ca.status, ca.full_name
             FROM users u
             LEFT JOIN creator_applications ca ON ca.user_id = u.id
             WHERE u.email = $1 AND u.role = 'creator'`,
            [email.toLowerCase().trim()]
        );

        if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: "Invalid email or password" });

        if (user.status === "pending") {
            return res.status(403).json({ error: "Your application is still under review. We'll notify you once approved." });
        }
        if (user.status === "rejected") {
            return res.status(403).json({ error: "Your application was not approved. Contact support for more details." });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: "creator", name: user.full_name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
        res.json({ success: true, name: user.full_name });
    } catch (err) {
        console.error("POST /auth/creator/login error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── AUTH — ADMIN LOGIN ──
app.post("/auth/admin/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    try {
        const { rows } = await pool.query(
            `SELECT id, email, password_hash, role FROM users WHERE email = $1 AND role = 'admin'`,
            [email.toLowerCase().trim()]
        );

        if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });

        const user  = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: "Invalid email or password" });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: "admin" },
            JWT_SECRET,
            { expiresIn: "12h" }
        );

        res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax`);
        res.json({ success: true });
    } catch (err) {
        console.error("POST /auth/admin/login error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── AUTH — LOGOUT ──
app.post("/auth/logout", (_req, res) => {
    res.setHeader("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    res.json({ success: true });
});

// ── AUTH — ME ──
app.get("/auth/me", requireAuth, (req, res) => {
    res.json({ id: req.user.id, email: req.user.email, role: req.user.role, name: req.user.name });
});

// ── ADMIN — list applications ──
app.get("/api/admin/applications", requireAdmin, async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ca.*, u.email
            FROM creator_applications ca
            JOIN users u ON u.id = ca.user_id
            ORDER BY ca.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/admin/applications error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── ADMIN — approve or reject ──
app.patch("/api/admin/applications/:id", requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Update application status
        const { rows: [app] } = await client.query(
            `UPDATE creator_applications SET status = $1, reviewed_at = NOW()
             WHERE id = $2 RETURNING *`,
            [status, req.params.id]
        );
        if (!app) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Application not found" });
        }

        if (status === "approved") {
            // Insert into creators table so they appear in the marketplace
            await client.query(
                `INSERT INTO creators
                    (niche, followers, engagement, city,
                     avg_likes, avg_comments, avg_reel_views,
                     age_range, female_p, male_p, locations,
                     reel_price, story_price, post_price,
                     verified, barter, barter_note)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                 ON CONFLICT DO NOTHING`,
                [
                    app.niche,
                    app.followers,
                    0,                       // engagement — updated later by admin
                    app.city,
                    0,                       // avg_likes
                    0,                       // avg_comments
                    0,                       // avg_reel_views
                    "18-35",                 // age_range default
                    50,                      // female_p default
                    50,                      // male_p default
                    [app.city],              // locations default to their city
                    app.reel_price  || 0,
                    app.story_price || 0,
                    app.post_price  || 0,
                    true,                    // verified = true since we approved them
                    app.barter,
                    app.barter_note || null,
                ]
            );
        }

        await client.query("COMMIT");
        console.log(`[ADMIN] Application #${app.id} (@${app.instagram_handle}) → ${status}`);
        res.json({ success: true, application: app });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("PATCH /api/admin/applications error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

// ── POST /api/leads ──
app.post("/api/leads", async (req, res) => {
    try {
        const { name, phone, city } = req.body;
        if (!name || !phone || !city) {
            return res.status(400).json({ error: "name, phone, and city are required" });
        }
        if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
            return res.status(400).json({ error: "Invalid phone number" });
        }
        const formattedPhone = "+91" + phone.trim().replace(/\s/g, "");
        const { rows } = await pool.query(
            `INSERT INTO leads (name, phone, city) VALUES ($1, $2, $3) RETURNING *`,
            [name.trim(), formattedPhone, city.trim()]
        );
        const lead = rows[0];
        console.log(`[${lead.created_at}] New lead: ${lead.name} | ${lead.phone} | ${lead.city}`);
        res.status(201).json({ success: true, lead });
    } catch (err) {
        console.error("POST /api/leads error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── GET /api/creators ──
app.get("/api/creators", async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, niche, followers, engagement, city,
                avg_likes      AS "avgLikes",
                avg_comments   AS "avgComments",
                avg_reel_views AS "avgReelViews",
                age_range      AS "ageRange",
                female_p       AS "femaleP",
                male_p         AS "maleP",
                locations,
                reel_price     AS "reelPrice",
                story_price    AS "storyPrice",
                post_price     AS "postPrice",
                verified, barter,
                barter_note    AS "barterNote"
            FROM creators ORDER BY id
        `);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/creators error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── GET /api/leads ──
app.get("/api/leads", async (_req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM leads ORDER BY created_at DESC`);
        res.json({ total: rows.length, leads: rows });
    } catch (err) {
        console.error("GET /api/leads error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── GET /api/leads/export ──
app.get("/api/leads/export", async (_req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM leads ORDER BY created_at DESC`);
        const csv = [
            "ID,Name,Phone,City,Timestamp,Source",
            ...rows.map((l) => `${l.id},"${l.name}",${l.phone},"${l.city}",${l.created_at},${l.source}`),
        ].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="brandbae_leads.csv"');
        res.send(csv);
    } catch (err) {
        console.error("GET /api/leads/export error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── START ──
initDB()
    .then(() => {
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`\n Brandbae server running at http://localhost:${PORT}`);
            console.log(`   Join page:    http://localhost:${PORT}/join`);
            console.log(`   Admin panel:  http://localhost:${PORT}/admin`);
            console.log(`   Applications: http://localhost:${PORT}/api/admin/applications\n`);
        });
    })
    .catch((err) => {
        console.error("Failed to connect to database:", err.message);
        process.exit(1);
    });

process.on("unhandledRejection", (err) => { console.error("Unhandled rejection:", err.message); });
process.on("uncaughtException",  (err) => { console.error("Uncaught exception:", err.message); });
