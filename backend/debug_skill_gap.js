const db = require('./db');

const fs = require('fs');

async function debug() {
    let output = "";
    const log = (msg) => { output += msg + "\n"; console.log(msg); };

    try {
        await db.initDb();
        log("Connected to DB");

        // 1. Get all users
        const users = await db.query("SELECT id, username, name FROM users");
        log(`Found ${users.rows.length} users.`);

        for (const user of users.rows) {
            log(`\n--- User: ${user.username} (ID: ${user.id}) ---`);

            // 2. Get My Skills
            const skills = await db.query("SELECT skill FROM skills WHERE user_id=$1", [user.id]);
            const skillList = skills.rows.map(r => r.skill);
            log(`My Skills: ${JSON.stringify(skillList)}`);

            // 3. Get Peers
            const peers = await db.query("SELECT * FROM peers WHERE user_id=$1", [user.id]);
            log(`Peers Count: ${peers.rows.length}`);

            for (const peer of peers.rows) {
                log(`  > Peer: ${peer.name} (LinkedID: ${peer.linked_user_id})`);

                let peerSkills = [];
                if (peer.linked_user_id) {
                    const ps = await db.query("SELECT skill FROM skills WHERE user_id=$1", [peer.linked_user_id]);
                    peerSkills = ps.rows.map(r => r.skill);
                    log(`    Linked Skills: ${JSON.stringify(peerSkills)}`);
                } else {
                    const ps = await db.query("SELECT skill FROM peer_skills WHERE peer_id=$1", [peer.id]);
                    peerSkills = ps.rows.map(r => r.skill);
                    log(`    Static Skills: ${JSON.stringify(peerSkills)}`);
                }
            }
        }

        fs.writeFileSync('debug_gap_output.txt', output);
        console.log("Output written to debug_gap_output.txt");

    } catch (e) {
        console.error(e);
    }
}

debug();
