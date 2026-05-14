const express = require("express");
const { pool } = require("../db/pool");
const { requireAuth } = require("./auth");

const router = express.Router();

// ── GET /api/creators ──
router.get("/", async (_req, res) => {
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

// ── GET /api/creator/me ──
router.get("/me", requireAuth, async (req, res) => {
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

// ── PATCH /api/creator/me ──
router.patch("/me", requireAuth, async (req, res) => {
    if (req.user.role !== "creator") return res.status(403).json({ error: "Forbidden" });

    const {
        city, languages, bio, past_collabs, content_links,
        barter, barter_note, reel_price, story_price, post_price,
        bundle_pricing, min_deal_size, requested_followers,
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Update creator_applications (source of truth)
        const { rows: [app] } = await client.query(
            `UPDATE creator_applications SET
                city             = COALESCE($1,  city),
                languages        = COALESCE($2,  languages),
                bio              = COALESCE($3,  bio),
                past_collabs     = COALESCE($4,  past_collabs),
                content_links    = COALESCE($5,  content_links),
                barter           = COALESCE($6,  barter),
                barter_note      = COALESCE($7,  barter_note),
                reel_price       = COALESCE($8,  reel_price),
                story_price      = COALESCE($9,  story_price),
                post_price       = COALESCE($10, post_price),
                bundle_pricing   = COALESCE($11, bundle_pricing),
                min_deal_size    = COALESCE($12, min_deal_size),
                pending_followers = COALESCE($13, pending_followers)
             WHERE user_id = $14 RETURNING *`,
            [
                city        || null,
                languages   || null,
                bio         ?? null,
                past_collabs   ?? null,
                content_links  ?? null,
                barter      !== undefined ? barter : null,
                barter_note ?? null,
                reel_price  || null,
                story_price || null,
                post_price  || null,
                bundle_pricing  ?? null,
                min_deal_size   || null,
                requested_followers || null,
                req.user.id,
            ]
        );

        if (!app) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Profile not found" });
        }

        // If approved, sync visible fields to the marketplace creators table
        if (app.status === "approved") {
            await client.query(
                `UPDATE creators c
                 SET city        = COALESCE($1, c.city),
                     barter      = COALESCE($2, c.barter),
                     barter_note = COALESCE($3, c.barter_note),
                     reel_price  = COALESCE($4, c.reel_price),
                     story_price = COALESCE($5, c.story_price),
                     post_price  = COALESCE($6, c.post_price),
                     user_id     = $7
                 FROM creator_applications ca
                 WHERE ca.user_id = $7
                   AND (c.user_id = $7 OR (c.user_id IS NULL AND c.niche = ca.niche AND c.city = ca.city))`,
                [
                    city        || null,
                    barter      !== undefined ? barter : null,
                    barter_note ?? null,
                    reel_price  || null,
                    story_price || null,
                    post_price  || null,
                    req.user.id,
                ]
            );
        }

        await client.query("COMMIT");

        const pendingFollowers = !!requested_followers;
        console.log(`[PROFILE UPDATE] user #${req.user.id}${pendingFollowers ? " — follower update pending review" : ""}`);
        res.json({ success: true, followerUpdatePending: pendingFollowers });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("PATCH /api/creator/me error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

module.exports = router;
