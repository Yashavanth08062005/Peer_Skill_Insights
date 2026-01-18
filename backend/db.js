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
        company VARCHAR(255),
        name VARCHAR(255),
        meta TEXT,
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
        linked_user_id INT,
        name VARCHAR(100),
        company VARCHAR(255)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS peer_requests (
        id SERIAL PRIMARY KEY,
        sender_id INT REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    await addCol('users', 'company', 'VARCHAR(255)');
    await addCol('users', 'name', 'VARCHAR(255)');
    await addCol('users', 'meta', 'TEXT');
    await addCol('users', 'avatar', 'TEXT');
    await addCol('users', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addCol('skills', 'company', 'VARCHAR(100)');
    await addCol('peer_skills', 'company', 'VARCHAR(100)');
    await addCol('peers', 'linked_user_id', 'INT');
    await addCol('peers', 'company', 'VARCHAR(255)');

    // Migration for resources
    await addCol('resources', 'skill', 'VARCHAR(100)');
    await addCol('resources', 'title', 'VARCHAR(255)');
    await addCol('resources', 'url', 'TEXT');
    await addCol('resources', 'note', 'TEXT');
    await addCol('resources', 'author', 'VARCHAR(255)');
    await addCol('resources', 'peer_index', 'INT');



    // Ensure unique constraint on peers.user_id - REMOVED to allow multiple peers
    /*
    try {
      await pool.query("ALTER TABLE peers ADD CONSTRAINT unique_peer_user_id UNIQUE (user_id)");
    } catch (e) {
      // Ignore if constraint already exists
    }
    */

    console.log("✅ Database tables ready");
  } catch (err) {
    console.error("❌ DB Init Error:", err.message);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
};
