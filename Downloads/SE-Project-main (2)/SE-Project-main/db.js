const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const initDb = async () => {
  try {
    console.log("🔗 Connected to DB:", process.env.DB_NAME);

    // Users table with profile fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        meta VARCHAR(255),
        company VARCHAR(255),
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        skill VARCHAR(100),
        company VARCHAR(100)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS peers (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100),
        company TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS peer_skills (
        id SERIAL PRIMARY KEY,
        peer_id INT REFERENCES peers(id) ON DELETE CASCADE,
        skill VARCHAR(100),
        company VARCHAR(100)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        skill VARCHAR(100),
        title VARCHAR(255),
        url TEXT,
        note TEXT,
        author VARCHAR(255),
        peer_index INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration helper: Add columns if they don't exist (for existing tables)
    const addCol = async (tbl, col, type) => {
      try {
        await pool.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      } catch (e) { console.log(`Migration note: ${e.message}`); }
    };

    await addCol('users', 'name', 'VARCHAR(255)');
    await addCol('users', 'meta', 'VARCHAR(255)');
    await addCol('users', 'company', 'VARCHAR(255)');
    await addCol('users', 'avatar', 'TEXT');
    await addCol('users', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addCol('skills', 'company', 'VARCHAR(100)');
    await addCol('peer_skills', 'company', 'VARCHAR(100)');

    // Migration for resources
    await addCol('resources', 'skill', 'VARCHAR(100)');
    await addCol('resources', 'title', 'VARCHAR(255)');
    await addCol('resources', 'url', 'TEXT');
    await addCol('resources', 'note', 'TEXT');
    await addCol('resources', 'author', 'VARCHAR(255)');
    await addCol('resources', 'peer_index', 'INT');

    // Fix peers company type to TEXT (for JSON)
    try { await pool.query("ALTER TABLE peers ALTER COLUMN company TYPE TEXT"); } catch (e) { }

    console.log("✅ Database tables ready");
  } catch (err) {
    console.error("❌ DB Init Error:", err.message);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
};
