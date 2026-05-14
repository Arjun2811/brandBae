const express = require("express");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const { pool, generateUserId } = require("../db/pool");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "brandbae-dev-secret-change-in-prod";

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

// ── CREATOR REGISTER ──
router.post("/creator/register", async (req, res) => {
    const {
        email, password, full_name, instagram_handle,
        niche, niche_subcategories, city, state, languages,
        followers, avg_reel_views, account_age,
        audience_age_group, audience_gender, top_locations,
        reel_price, story_price, post_price, bundle_pricing, min_deal_size,
        barter, barter_note,
        content_links, past_collabs, bio,
    } = req.body;

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
        const userId = await generateUserId();

        const { rows: [user] } = await pool.query(
            `INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, 'creator') RETURNING id`,
            [userId, email.toLowerCase().trim(), password_hash]
        );

        await pool.query(
            `INSERT INTO creator_applications
             (user_id, full_name, instagram_handle,
              niche, niche_subcategories, city, state, languages,
              followers, avg_reel_views, account_age,
              audience_age_group, audience_gender, top_locations,
              reel_price, story_price, post_price, bundle_pricing, min_deal_size,
              barter, barter_note,
              content_links, past_collabs, bio)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
            [
                user.id, full_name, instagram_handle,
                niche, niche_subcategories || null, city, state || null, languages || null,
                parseInt(followers), avg_reel_views ? parseInt(avg_reel_views) : null, account_age || null,
                audience_age_group || null, audience_gender || null, top_locations || null,
                reel_price || 0, story_price || 0, post_price || 0, bundle_pricing || null,
                min_deal_size ? parseInt(min_deal_size) : null,
                barter || false, barter_note || null,
                content_links || null, past_collabs || null, bio || null,
            ]
        );

        console.log(`[NEW APPLICATION] ${full_name} (@${instagram_handle}) — ${niche} · ${city}, ${state || "India"}`);
        res.status(201).json({ success: true, message: "Application submitted. We'll review it within 48 hours." });
    } catch (err) {
        console.error("POST /auth/creator/register error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── CREATOR LOGIN ──
router.post("/creator/login", async (req, res) => {
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

        const user  = rows[0];
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

// ── ADMIN LOGIN ──
router.post("/admin/login", async (req, res) => {
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

// ── LOGOUT ──
router.post("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    res.json({ success: true });
});

// ── ME ──
router.get("/me", requireAuth, (req, res) => {
    res.json({ id: req.user.id, email: req.user.email, role: req.user.role, name: req.user.name });
});

module.exports = { router, requireAuth, requireAdmin };
