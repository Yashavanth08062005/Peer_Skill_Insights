const db = require('./db');

async function debugSkills() {
    try {
        console.log("=== USERS ===");
        const users = await db.query('SELECT id, username FROM users');
        console.table(users.rows);

        console.log("\n=== SKILLS TABLE DUMP ===");
        const skills = await db.query('SELECT user_id, skill, company FROM skills');
        console.table(skills.rows);

        console.log("\n=== TOP 20 CHECK ===");
        // Re-simulate server logic locally
        const TOP_20 = [
            "Python", "Java", "C++", "JavaScript", "HTML", "CSS", "React", "Node.js",
            "SQL", "MongoDB", "Git", "Docker", "AWS", "Linux",
            "Machine Learning", "Data Structures", "Algorithms",
            "Communication", "Problem Solving", "Leadership"
        ];

        // Group by user
        const userMap = {};
        skills.rows.forEach(r => {
            if (!userMap[r.user_id]) userMap[r.user_id] = [];
            userMap[r.user_id].push(r.skill);
        });

        for (const [uid, uSkills] of Object.entries(userMap)) {
            const normalized = uSkills.map(s => s ? s.trim().toLowerCase() : "");
            const matches = TOP_20.filter(t => normalized.includes(t.toLowerCase()));
            const pct = Math.round((matches.length / 20) * 100);

            console.log(`User ${uid}: ${pct}% (Matches: ${matches.length})`);

            if (uSkills.some(s => s.toLowerCase().includes('react'))) {
                console.log(`   User ${uid} has 'react'? YES`);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

debugSkills();
