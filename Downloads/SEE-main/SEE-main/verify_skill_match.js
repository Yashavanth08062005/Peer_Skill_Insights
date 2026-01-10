const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: () => JSON.parse(data), text: () => data }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function get(path) {
    return new Promise((resolve, reject) => {
        const req = http.get({
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: () => JSON.parse(data), text: () => data }));
        });
        req.on('error', reject);
    });
}

async function testSkillMatch() {
    console.log("Starting verification...");

    // 1. Register
    const username = `01fe${Date.now()}@kletech.ac.in`;
    const password = 'password123';
    console.log(`Step 1: Registering user ${username}...`);
    const regRes = await post('/register', { username, password });

    if (!regRes.ok) {
        console.error("Registration failed:", regRes.status, regRes.text());
        process.exit(1);
    }

    // 2. Login
    console.log("Step 2: Logging in...");
    const loginRes = await post('/login', { username, password });
    let loginData;
    try {
        loginData = loginRes.json();
    } catch (e) {
        console.error("Login JSON parse failed:", loginRes.status, loginRes.text());
        process.exit(1);
    }
    const userId = loginData.userId;
    console.log("Logged in with User ID:", userId);

    // 3. Save Skills
    console.log("Step 3: Saving skills: Python, React, RandomSkill...");
    const skills = [
        { skill: 'Python', company: '' },
        { skill: 'React', company: '' },
        { skill: 'RandomSkill', company: '' }
    ];

    const saveRes = await post('/state/save', {
        userId,
        profile: { name: 'TestUser' },
        mySkills: skills,
        peers: [],
        resources: []
    });

    if (!saveRes.ok) {
        console.error("Save failed:", saveRes.status, saveRes.text());
        process.exit(1);
    }

    // 4. Verify Match API
    console.log("Step 4: Calling Skill Match API...");
    const matchRes = await get(`/skill-match/${userId}`);
    let matchData;
    try {
        matchData = matchRes.json();
    } catch (e) {
        console.error("Match JSON parse failed:", matchRes.status, matchRes.text());
        process.exit(1);
    }

    console.log("Match Data:", JSON.stringify(matchData, null, 2));

    if (matchData.percentage !== 10) {
        console.error(`❌ FAILED: Expected 10%, got ${matchData.percentage}%`);
        process.exit(1);
    } else {
        console.log("✅ PASSED: Percentage is 10% as expected (2/20).");
    }

    if (matchData.matchedSkills.includes('Python') && matchData.matchedSkills.includes('React')) {
        console.log("✅ PASSED: Matched skills list is correct.");
    } else {
        console.error("❌ FAILED: matchedSkills missing expected values.");
        process.exit(1);
    }

    if (!matchData.matchedSkills.includes('RandomSkill')) {
        console.log("✅ PASSED: RandomSkill correctly excluded.");
    } else {
        console.error("❌ FAILED: RandomSkill included in matches.");
        process.exit(1);
    }
}

testSkillMatch().catch(e => { console.error(e); process.exit(1); });
