require("dotenv").config();
const { Pool } = require("pg");
const creators = require("./creators.json");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function seed() {
    console.log(`Seeding ${creators.length} creators...`);

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

    // Clear existing data so seed is idempotent
    await pool.query(`TRUNCATE TABLE creators RESTART IDENTITY`);

    for (const c of creators) {
        await pool.query(
            `INSERT INTO creators
                (niche, followers, engagement, city, avg_likes, avg_comments,
                 avg_reel_views, age_range, female_p, male_p, locations,
                 reel_price, story_price, post_price, verified, barter, barter_note)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [
                c.niche, c.followers, c.engagement, c.city,
                c.avgLikes, c.avgComments, c.avgReelViews, c.ageRange,
                c.femaleP, c.maleP, c.locations,
                c.reelPrice, c.storyPrice, c.postPrice,
                c.verified, c.barter, c.barterNote || null,
            ]
        );
    }

    console.log(`Done. ${creators.length} creators inserted.`);
    await pool.end();
}

seed().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});
