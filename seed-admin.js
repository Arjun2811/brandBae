require("dotenv").config();
const { Pool } = require("pg");
const bcrypt   = require("bcrypt");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function seedAdmin() {
    const email    = "adminbrandbae@gmail.com";
    const password = "brandbae";

    const hash = await bcrypt.hash(password, 12);

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
        INSERT INTO users (email, password_hash, role)
        VALUES ($1, $2, 'admin')
        ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                role          = 'admin'
    `, [email, hash]);

    console.log(`Admin user ready: ${email}`);
    await pool.end();
}

seedAdmin().catch((err) => {
    console.error("seed-admin failed:", err.message);
    process.exit(1);
});
