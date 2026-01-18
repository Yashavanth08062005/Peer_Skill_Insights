const db = require('./db');

async function check() {
    try {
        const uid = 9; // Based on logs
        const res = await db.query('SELECT skill FROM skills WHERE user_id=$1', [uid]);
        console.log(`User ${uid} has ${res.rows.length} skills.`);
        console.log("Skills:", res.rows.map(r => r.skill));

        const TOP_20 = ["python", "java", "c++", "javascript", "html", "css", "react", "node.js", "sql", "mongodb", "git", "docker", "aws", "linux", "machine learning", "data structures", "algorithms", "communication", "problem solving", "leadership"];

        const mySkills = res.rows.map(r => r.skill.trim().toLowerCase());
        const matches = mySkills.filter(s => TOP_20.includes(s));

        console.log("Matches:", matches);
        console.log("Matches Count:", matches.length);
        console.log("Percentage:", Math.round((matches.length / 20) * 100));

    } catch (e) { console.error(e); }
}
check();
