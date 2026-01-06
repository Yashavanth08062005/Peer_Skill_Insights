const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from public folder
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(express.json());

// init database
db.initDb();

/* =========================
   REGISTER
========================= */
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({ error: "Username & password required" });

        // college email validation
        const emailRegex = /^01fe.*@kletech\.ac\.in$/i;
        if (!emailRegex.test(username)) {
            return res.status(400).json({
                error: "Email must start with 01fe and end with @kletech.ac.in",
            });
        }

        // check existing user
        const existing = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, hashedPassword]
        );

        console.log("✅ Registered:", username);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Register Error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

/* =========================
   LOGIN
========================= */
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await db.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (result.rows.length === 0)
            return res.status(401).json({ error: "Invalid credentials" });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match)
            return res.status(401).json({ error: "Invalid credentials" });

        res.json({
            success: true,
            userId: user.id,
            username: user.username,
        });
    } catch (err) {
        console.error("❌ Login Error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

/* =========================
   SAVE STATE
========================= */
app.post('/api/state/save', async (req, res) => {
    const { userId, mySkills, peers, profile, resources } = req.body;

    try {
        console.log(`[Server] Save request for ${userId}. Resources count: ${resources ? resources.length : 'undefined'}`);
        if (resources && resources.length > 0) console.log("[Server] First resource sample:", resources[0]);

        if (!userId) return res.status(400).json({ error: "Missing userId" });

        // Update profile in users table
        if (profile) {
            await db.query(
                'UPDATE users SET name=$1, meta=$2, company=$3, avatar=$4 WHERE id=$5',
                [profile.name, profile.meta, JSON.stringify(profile.companies || []), profile.avatar, userId]
            );
        }

        // clear old data
        await db.query('DELETE FROM skills WHERE user_id=$1', [userId]);
        await db.query('DELETE FROM peers WHERE user_id=$1', [userId]);
        await db.query('DELETE FROM resources WHERE user_id=$1', [userId]);

        // save skills
        for (const s of mySkills) {
            const skillName = typeof s === 'object' ? s.skill : s;
            const skillCompany = typeof s === 'object' ? s.company : "";
            await db.query('INSERT INTO skills (user_id, skill, company) VALUES ($1,$2,$3)', [userId, skillName, skillCompany]);
        }
        console.log("[Server] Skills saved.");

        // save peers
        for (const peer of peers) {
            const peerRes = await db.query(
                'INSERT INTO peers (user_id, name, company, linked_user_id) VALUES ($1,$2,$3,$4) RETURNING id',
                [userId, peer.name, peer.company, peer.linkedId || null]
            );
            const peerId = peerRes.rows[0].id;

            for (const s of (peer.skills || [])) {
                const skillName = typeof s === 'object' ? s.skill : s;
                const skillCompany = typeof s === 'object' ? s.company : "";
                await db.query('INSERT INTO peer_skills (peer_id, skill, company) VALUES ($1,$2,$3)', [peerId, skillName, skillCompany]);
            }
        }
        console.log("[Server] Peers saved.");

        // save resources
        if (resources && Array.isArray(resources)) {
            console.log(`[Server] Saving ${resources.length} resources...`);
            for (const r of resources) {
                const sName = (r.skill && typeof r.skill === 'object') ? r.skill.skill : r.skill;
                await db.query(
                    'INSERT INTO resources (user_id, skill, title, url, note, author, peer_index) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [userId, sName, r.title, r.url, r.note, r.author, r.peerIndex]
                );
            }
            console.log("[Server] Resources saved.");
        } else {
            console.log("[Server] No resources to save (or not array).");
        }

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Save Error:", err.message);
        res.status(500).json({ error: "Save failed" });
    }
});

/* =========================
   LOAD STATE
========================= */
app.get('/api/state/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Fetch profile
        const userRes = await db.query('SELECT name, meta, company, avatar FROM users WHERE id=$1', [userId]);
        const userProfile = userRes.rows[0] || {};

        const skillsRes = await db.query(
            'SELECT skill, company FROM skills WHERE user_id=$1',
            [userId]
        );

        const peersRes = await db.query(
            'SELECT * FROM peers WHERE user_id=$1 ORDER BY id ASC',
            [userId]
        );

        const resourcesRes = await db.query(
            'SELECT skill, title, url, note, author, peer_index FROM resources WHERE user_id=$1',
            [userId]
        );

        const peers = [];
        const linkedIds = [];
        const peerIdMap = new Map(); // Map linked_user_id -> peer array index

        for (const [index, peer] of peersRes.rows.entries()) {
            const skillRes = await db.query(
                'SELECT skill, company FROM peer_skills WHERE peer_id=$1',
                [peer.id]
            );

            if (peer.linked_user_id) {
                linkedIds.push(peer.linked_user_id);
                peerIdMap.set(peer.linked_user_id, index);
            }

            peers.push({
                name: peer.name,
                company: peer.company,
                skills: skillRes.rows, // object {skill, company}
                linkedId: peer.linked_user_id
            });
        }

        // Fetch resources from linked peers (MUTUAL ONLY)
        let sharedResources = [];
        if (linkedIds.length > 0) {
            // Find which of these linkedIds ALSO have the current userId in their peer list
            // i.e. Reciprocal connection: I follow them, AND they follow me.
            const mutualRes = await db.query(
                `SELECT user_id FROM peers WHERE user_id = ANY($1::int[]) AND linked_user_id = $2`,
                [linkedIds, userId] // Check if peers (linkedIds) have ME (userId) as a linked friend
            );

            const mutualIds = mutualRes.rows.map(r => r.user_id);

            if (mutualIds.length > 0) {
                const sharedRes = await db.query(
                    'SELECT user_id, skill, title, url, note, author FROM resources WHERE user_id = ANY($1::int[])',
                    [mutualIds]
                );
                sharedResources = sharedRes.rows.map(r => ({
                    skill: r.skill,
                    title: r.title,
                    url: r.url,
                    note: r.note,
                    author: r.author, // Keep original author name
                    peerIndex: peerIdMap.get(r.user_id) // Map to local peer index
                }));
            }
        }

        const myResources = resourcesRes.rows.map(r => ({
            skill: r.skill,
            title: r.title,
            url: r.url,
            note: r.note,
            author: r.author,
            peerIndex: r.peer_index
        }));

        res.json({
            profile: {
                name: userProfile.name || "",
                meta: userProfile.meta || "",
                // Try parse JSON, else fallback to string array or empty
                companies: (() => {
                    try { return JSON.parse(userProfile.company); }
                    catch (e) { return userProfile.company ? [userProfile.company] : []; }
                })(),
                avatar: userProfile.avatar || ""
            },
            mySkills: skillsRes.rows, // Returns {skill, company} objects
            peers,
            resources: [...myResources, ...sharedResources]
        });
    } catch (err) {
        console.error("❌ Load Error:", err.message);
        res.status(500).json({ error: "Load failed" });
    }
});

/* =========================
   SEARCH USERS (for Peers)
========================= */
app.get('/api/users/search', async (req, res) => {
    const { q } = req.query; // email/username
    if (!q) return res.json(null);

    try {
        const userRes = await db.query(
            'SELECT id, username, name, company FROM users WHERE LOWER(username) = LOWER($1)',
            [q]
        );

        if (userRes.rows.length === 0) return res.json(null);

        const user = userRes.rows[0];
        // Get skills {skill, company}
        const skillsRes = await db.query('SELECT skill, company FROM skills WHERE user_id=$1', [user.id]);

        let companies = [];
        try { companies = JSON.parse(user.company); } catch (e) { if (user.company) companies = [user.company]; }

        res.json({
            id: user.id, // Return ID for linking
            name: user.name || user.username,
            company: companies, // Return array
            skills: skillsRes.rows // Return objects
        });
    } catch (err) {
        console.error("❌ Search Error:", err.message);
        res.status(500).json({ error: "Search failed" });
    }
});

app.get('/api/debug/users', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users');
        res.json({ count: result.rows.length, rows: result.rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* =========================
   SERVER
========================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
