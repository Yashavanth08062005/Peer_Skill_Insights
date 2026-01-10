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
   GLOBAL CONSTANTS (Skill Match Feature)
   Top 20 Technical & Soft Skills for College Students
========================= */
const TOP_20_SKILLS = [
    "Python", "Java", "C++", "JavaScript", "HTML", "CSS", "React", "Node.js",
    "SQL", "MongoDB", "Git", "Docker", "AWS", "Linux",
    "Machine Learning", "Data Structures", "Algorithms",
    "Communication", "Problem Solving", "Leadership"
];

/* =========================
   SKILL MATCH ENDPOINT
   Compare User Skills with Top 20 Global Skills
========================= */
app.get('/api/skill-match/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // 1. Fetch user skills from potential sources (skills table)
        // Assumption: userId is already available in the current session/state
        const skillRes = await db.query('SELECT skill FROM skills WHERE user_id=$1', [userId]);

        // 2. Normalize User Skills (Lowercase, Trim)
        // Time Complexity: O(N) where N is number of user skills
        const userSkillsSet = new Set(
            skillRes.rows
                .filter(r => r.skill && typeof r.skill === 'string')
                .map(r => r.skill.trim().toLowerCase())
        );
        console.log("[Server] User Skill Set:", Array.from(userSkillsSet));

        // 3. Compare with Top 20 Skills
        // Time Complexity: O(M) where M is constant 20. Total = O(N)
        const matchedSkills = [];
        const missingSkills = [];
        let matchCount = 0;

        TOP_20_SKILLS.forEach(skill => {
            if (userSkillsSet.has(skill.toLowerCase())) {
                matchedSkills.push(skill);
                matchCount++;
            } else {
                missingSkills.push(skill);
            }
        });

        console.log(`[Server] Matched: ${matchedSkills.length}, Missing: ${missingSkills.length}`);

        // 4. Calculate Percentage
        const percentage = Math.round((matchCount / TOP_20_SKILLS.length) * 100);

        res.json({
            percentage,
            matchedSkills,
            missingSkills,
            totalTopSkills: TOP_20_SKILLS.length
        });

    } catch (err) {
        console.error("❌ Skill Match Error:", err.message);
        res.status(500).json({ error: "Skill comparison failed" });
    }
});

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
            // Serialize companies array if present, otherwise fallback to single company or empty
            let companyVal = "";
            if (profile.companies && Array.isArray(profile.companies)) {
                companyVal = JSON.stringify(profile.companies);
            } else {
                companyVal = profile.company || "";
            }

            await db.query(
                'UPDATE users SET name=$1, meta=$2, company=$3, avatar=$4 WHERE id=$5',
                [profile.name, profile.meta, companyVal, profile.avatar, userId]
            );
        }

        // clear old data
        await db.query('DELETE FROM skills WHERE user_id=$1', [userId]);
        // DO NOT delete peers/skills for peers here anymore. Source of truth is now server-managed for peers.
        // await db.query('DELETE FROM peers WHERE user_id=$1', [userId]);

        // save skills
        await db.query('DELETE FROM skills WHERE user_id=$1', [userId]);
        for (const s of mySkills) {
            const skillName = typeof s === 'object' ? s.skill : s;
            const skillCompany = typeof s === 'object' ? s.company : "";
            await db.query('INSERT INTO skills (user_id, skill, company) VALUES ($1,$2,$3)', [userId, skillName, skillCompany]);
        }
        console.log("[Server] Skills saved.");

        // Peers are now managed via request/accept flow. We do NOT update them from client snapshot.
        /*
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
        */

        // save resources
        await db.query('DELETE FROM resources WHERE user_id=$1', [userId]); // Clear old resources to prevent duplication
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
   RECOMMEND RESOURCE (Push to Peer)
========================= */
app.post('/api/resources/recommend', async (req, res) => {
    const { senderId, receiverId, resource } = req.body;

    try {
        if (!senderId || !receiverId || !resource)
            return res.status(400).json({ error: "Missing required fields" });

        // Get sender name for 'author' field
        const senderRes = await db.query('SELECT name, username FROM users WHERE id=$1', [senderId]);
        const senderName = senderRes.rows[0].name || senderRes.rows[0].username;

        // Insert into RECEIVER'S list
        // Note: peer_index might be irrelevant for the receiver, or we set it to null. 
        // Or we could try to find the index of the sender in the receiver's list? 
        // For simplicity, let's set peer_index to null (it's their own resource now, or recommended by someone).
        // Actually, existing logic uses peer_index for display grouping. 
        // If we want it to show up as "from Peer", the receiver needs to know which peer sent it.

        // Find sender's index in receiver's peer list?
        // Let's look up the peer entry.
        const peerRes = await db.query('SELECT id FROM peers WHERE user_id=$1 AND linked_user_id=$2', [receiverId, senderId]);
        let peerIndex = null;
        // This mapping to a simple integer index is fragile if based on array position.
        // The current 'peer_index' in DB seems to refer to the CLIENT-SIDE array index, which is very bad practice for persistent storage.
        // However, refactoring that is out of scope. We will try to rely on 'author' string for display if index is missing.

        // Insert
        await db.query(
            'INSERT INTO resources (user_id, skill, title, url, note, author, peer_index) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [receiverId, resource.skill, resource.title, resource.url, resource.note, senderName, -1]
            // Using -1 or null for peer_index to indicate "pushed" resource.
        );

        res.json({ success: true });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ error: "Resource already exists for this user." });
        }
        console.error("❌ Recommend Error:", err.message);
        res.status(500).json({ error: "Recommendation failed" });
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

        // Parse company (could be JSON array or simple string)
        let companies = [];
        let rawComp = userProfile.company || "";
        try {
            const parsed = JSON.parse(rawComp);
            if (Array.isArray(parsed)) {
                companies = parsed;
                // Legacy support: join for display or just take first
                // userProfile.company = companies.join(", "); 
            } else if (parsed) {
                companies = [parsed.toString()];
            }
        } catch (e) {
            // Not JSON, simple string
            if (rawComp.trim()) companies = [rawComp];
        }

        userProfile.companies = companies;
        // Ensure legacy 'company' field is arguably valid if client relies on it (though we updated client to use companies)
        // Let's leave userProfile.company as the raw string or updated string? 
        // Client uses state.profile.company in some places? 
        // Actually client script.js renderMySkillsProfileCard uses (state.profile.companies || [])
        // But older parts might use state.profile.company.
        // Let's set company to first item for safety?
        // userProfile.company = companies.length > 0 ? companies[0] : ""; 


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
            let skillRows = [];

            if (peer.linked_user_id) {
                // Fetch REAL skills from the linked user
                const skillRes = await db.query(
                    'SELECT skill, company FROM skills WHERE user_id=$1',
                    [peer.linked_user_id]
                );
                skillRows = skillRes.rows;
            } else {
                // Fallback to static peer_skills (if any)
                const skillRes = await db.query(
                    'SELECT skill, company FROM peer_skills WHERE peer_id=$1',
                    [peer.id]
                );
                skillRows = skillRes.rows;
            }

            if (peer.linked_user_id) {
                linkedIds.push(peer.linked_user_id);
                peerIdMap.set(peer.linked_user_id, index);
            }

            peers.push({
                id: peer.id, // Include ID for removal
                name: peer.name,
                company: peer.company,
                skills: skillRows.map(r => r.skill), // Flatten to strings
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
                company: userProfile.company || "",
                companies: userProfile.companies || [],
                avatar: userProfile.avatar || ""
            },
            mySkills: skillsRes.rows, // Returns {skill, company} objects
            peers,
            resources: myResources,
            sharedResources: sharedResources
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

/* =========================
   PEER REQUESTS
========================= */
app.post('/api/peers/request', async (req, res) => {
    const { senderId, receiverEmail } = req.body;

    try {
        if (!senderId || !receiverEmail)
            return res.status(400).json({ error: "Missing senderId or receiverEmail" });

        // Find receiver
        const userRes = await db.query(
            'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
            [receiverEmail]
        );

        if (userRes.rows.length === 0)
            return res.status(404).json({ error: "User not found" });

        const receiverId = userRes.rows[0].id;

        if (Number(senderId) === Number(receiverId))
            return res.status(400).json({ error: "Cannot add yourself" });

        // Check if already peers
        const peerCheck = await db.query(
            'SELECT id FROM peers WHERE user_id=$1 AND linked_user_id=$2',
            [senderId, receiverId]
        );
        if (peerCheck.rows.length > 0)
            return res.status(400).json({ error: "Already peers" });

        // Check if pending request exists
        const reqCheck = await db.query(
            'SELECT id, status FROM peer_requests WHERE sender_id=$1 AND receiver_id=$2 AND status=\'pending\'',
            [senderId, receiverId]
        );
        if (reqCheck.rows.length > 0)
            return res.status(400).json({ error: "Request already pending" });

        // Check if they sent US a request (could auto-accept? For now just block)
        const reverseCheck = await db.query(
            'SELECT id FROM peer_requests WHERE sender_id=$2 AND receiver_id=$1 AND status=\'pending\'',
            [senderId, receiverId]
        );
        if (reverseCheck.rows.length > 0)
            return res.status(400).json({ error: "They already sent you a request. Check your pending requests." });

        // Create Request
        await db.query(
            'INSERT INTO peer_requests (sender_id, receiver_id) VALUES ($1, $2)',
            [senderId, receiverId]
        );

        res.json({ success: true, message: "Request sent" });
    } catch (err) {
        console.error("❌ Peer Request Error:", err.message);
        res.status(500).json({ error: "Request failed" });
    }
});

app.get('/api/peers/requests/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await db.query(`
            SELECT pr.id, u.username as email, u.name, u.company 
            FROM peer_requests pr
            JOIN users u ON pr.sender_id = u.id
            WHERE pr.receiver_id = $1 AND pr.status = 'pending'
        `, [userId]);

        // Parse company just in case (though it's usually JSON string or string)
        const requests = result.rows.map(r => {
            let comps = [];
            try { comps = JSON.parse(r.company); } catch (e) { if (r.company) comps = [r.company]; }
            return { ...r, company: comps };
        });

        res.json(requests);
    } catch (err) {
        console.error("❌ Get Requests Error:", err.message);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

app.post('/api/peers/respond', async (req, res) => {
    const { requestId, action } = req.body; // action: 'accept' or 'reject'
    if (!['accept', 'reject'].includes(action))
        return res.status(400).json({ error: "Invalid action" });

    try {
        const reqRes = await db.query('SELECT * FROM peer_requests WHERE id=$1', [requestId]);
        if (reqRes.rows.length === 0)
            return res.status(404).json({ error: "Request not found" });

        const request = reqRes.rows[0];
        if (request.status !== 'pending')
            return res.status(400).json({ error: "Request already processed" });

        if (action === 'reject') {
            await db.query('UPDATE peer_requests SET status=\'rejected\' WHERE id=$1', [requestId]);
            return res.json({ success: true, message: "Request rejected" });
        }

        // AUTO ACCEPT
        await db.query('UPDATE peer_requests SET status=\'accepted\' WHERE id=$1', [requestId]);

        // Insert into PEERS (Bidirectional)
        const u1 = request.sender_id;
        const u2 = request.receiver_id;

        // Get profiles to populate initial name/company in peers table (as snapshot or ref)
        // Actually, we should pull fresh data.
        const users = await db.query('SELECT id, name, company, username FROM users WHERE id IN ($1, $2)', [u1, u2]);
        const user1 = users.rows.find(u => u.id === u1); // Sender
        const user2 = users.rows.find(u => u.id === u2); // Receiver

        // Add U1 -> U2
        await db.query(
            'INSERT INTO peers (user_id, linked_user_id, name, company) VALUES ($1, $2, $3, $4)',
            [u1, u2, user2.name || user2.username, user2.company]
        );

        // Add U2 -> U1
        await db.query(
            'INSERT INTO peers (user_id, linked_user_id, name, company) VALUES ($1, $2, $3, $4)',
            [u2, u1, user1.name || user1.username, user1.company]
        );

        // Note: We are NOT populating peer_skills here. 
        // The `loadState` logic already fetches live skills if linked_user_id exists.
        // See: const skillRes = await db.query('SELECT skill, company FROM skills WHERE user_id=$1 ...') in loadState for linked peers?
        // Wait, current loadState logic checks peer_skills table.
        // I should probably also populate peer_skills OR update loadState to fetch from real skills table if linked.
        // Let's UPDATE loadState to be smarter. 

        res.json({ success: true, message: "Request accepted" });

    } catch (err) {
        console.error("❌ Respond Request Error:", err.message);
        res.status(500).json({ error: "Action failed" });
    }
});

app.post('/api/peers/remove', async (req, res) => {
    const { userId, peerId } = req.body;
    try {
        // We need to remove the link in both directions...
        // First find who the peer is.
        // The peerId passed is the ID in the 'peers' table.
        const pRes = await db.query('SELECT linked_user_id FROM peers WHERE id=$1 AND user_id=$2', [peerId, userId]);
        if (pRes.rows.length === 0) return res.status(404).json({ error: "Peer not found" });

        const linkedId = pRes.rows[0].linked_user_id;

        // Remove my entry
        await db.query('DELETE FROM peers WHERE id=$1', [peerId]);

        // Remove their entry (if it exists)
        if (linkedId) {
            await db.query('DELETE FROM peers WHERE user_id=$1 AND linked_user_id=$2', [linkedId, userId]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Remove Peer Error:", err.message);
        res.status(500).json({ error: "Remove failed" });
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

// Trigger restart

