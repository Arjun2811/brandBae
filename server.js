const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

require("dotenv").config();

// ── DATABASE ──
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Handle unexpected pool errors (prevents process crash)
pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err.message);
});

// Create tables if they don't exist
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
    console.log("Database ready.");
}

// ── MIDDLEWARE ──
app.use(express.json());
app.use(express.static(__dirname));

// ── POST /api/leads  — save a new lead ──
app.post("/api/leads", async (req, res) => {
    try {
        const { name, phone, city } = req.body;

        if (!name || !phone || !city) {
            return res
                .status(400)
                .json({ error: "name, phone, and city are required" });
        }
        if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
            return res.status(400).json({ error: "Invalid phone number" });
        }

        const formattedPhone = "+91" + phone.trim().replace(/\s/g, "");

        const { rows } = await pool.query(
            `INSERT INTO leads (name, phone, city)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name.trim(), formattedPhone, city.trim()],
        );

        const lead = rows[0];
        console.log(
            `[${lead.created_at}] New lead: ${lead.name} | ${lead.phone} | ${lead.city}`,
        );
        res.status(201).json({ success: true, lead });
    } catch (err) {
        console.error("POST /api/leads error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── GET /api/creators  — list all creators ──
app.get("/api/creators", async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                id, niche, followers, engagement, city,
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
            FROM creators
            ORDER BY id
        `);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/creators error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── GET /api/leads  — view all leads (simple admin) ──
app.get("/api/leads", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM leads ORDER BY created_at DESC`,
        );
        res.json({ total: rows.length, leads: rows });
    } catch (err) {
        console.error("GET /api/leads error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── GET /api/leads/export  — download as CSV ──
app.get("/api/leads/export", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM leads ORDER BY created_at DESC`,
        );
        const csv = [
            "ID,Name,Phone,City,Timestamp,Source",
            ...rows.map(
                (l) =>
                    `${l.id},"${l.name}",${l.phone},"${l.city}",${l.created_at},${l.source}`,
            ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="brandbae_leads.csv"',
        );
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
            console.log(
                `\n🚀 Brandbae server running at http://localhost:${PORT}`,
            );
            console.log(`📋 View leads:   http://localhost:${PORT}/api/leads`);
            console.log(
                `📥 Export CSV:   http://localhost:${PORT}/api/leads/export\n`,
            );
        });
    })
    .catch((err) => {
        console.error("Failed to connect to database:", err.message);
        process.exit(1);
    });

process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err.message);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err.message);
});
