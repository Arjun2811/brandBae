require("dotenv").config();
const { pool, generateUserId } = require("./db/pool");
const bcrypt = require("bcrypt");

async function seedAdmin() {
    const email    = "adminbrandbae@gmail.com";
    const password = "brandbae";

    const hash = await bcrypt.hash(password, 12);

    // Check if admin already exists
    const { rows } = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [email]
    );

    if (rows.length) {
        // Update password and ensure role is admin
        await pool.query(
            `UPDATE users SET password_hash = $1, role = 'admin' WHERE email = $2`,
            [hash, email]
        );
        console.log(`Admin user updated: ${email}`);
    } else {
        const userId = await generateUserId();
        await pool.query(
            `INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
            [userId, email, hash]
        );
        console.log(`Admin user created: ${email} (id: ${userId})`);
    }

    await pool.end();
}

seedAdmin().catch((err) => {
    console.error("seed-admin failed:", err.message);
    process.exit(1);
});
