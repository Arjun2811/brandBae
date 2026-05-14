require("dotenv").config();
const { pool } = require("./db/pool");
const creators = require("./creators.json");

async function seed() {
    console.log(`Seeding ${creators.length} creators...`);

    // Clear existing seed data (only rows without a user_id — i.e. not real registered creators)
    await pool.query(`DELETE FROM creators WHERE user_id IS NULL`);

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
                c.reelPrice || 0, c.storyPrice || 0, c.postPrice || 0,
                c.verified || false, c.barter || false, c.barterNote || null,
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
