import { useMemo } from 'react';

const normalizeSkill = (s) => s.trim().toLowerCase();

function SkillGap({ state }) {
    if (!state) return <div>Loading...</div>;

    const gapData = useMemo(() => {
        // 1. My Skills Set
        const mySkillsSet = new Set();
        (state.mySkills || []).forEach(s => {
            const name = typeof s === 'object' ? s.skill : s;
            if (name) mySkillsSet.add(normalizeSkill(name));
        });

        // 2. Peer Skills
        const peerSkillCounts = {};
        const allPeerSkills = new Set();

        (state.peers || []).forEach(p => {
            if (p.skills && Array.isArray(p.skills)) {
                p.skills.forEach(s => {
                    const n = normalizeSkill(s);
                    if (!n) return;
                    allPeerSkills.add(n);
                    peerSkillCounts[n] = (peerSkillCounts[n] || 0) + 1;
                });
            }
        });

        // 3. Find Missing
        const missing = [];
        allPeerSkills.forEach(s => {
            if (!mySkillsSet.has(s)) {
                missing.push({ name: s, count: peerSkillCounts[s] });
            }
        });

        missing.sort((a, b) => b.count - a.count);

        // 4. Detailed Comparison (All unique skills in ecosystem)
        const allSkills = new Set([...mySkillsSet, ...allPeerSkills]);
        const comparison = Array.from(allSkills).map(s => {
            return {
                name: s,
                peerCount: (peerSkillCounts[s] || 0) + (mySkillsSet.has(s) ? 1 : 0),
                haveIt: mySkillsSet.has(s)
            };
        });

        comparison.sort((a, b) => b.peerCount - a.peerCount);

        return { missing, comparison };
    }, [state]);

    const { missing, comparison } = gapData;

    return (
        <section className="page active">
            <h2>Skill Gap Analysis</h2>

            <div className="card" style={{ marginBottom: 24 }}>
                <h3>Skills your peers have that you don't</h3>
                <div className="gap-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {missing.length === 0 ? (
                        <div className="muted">{state.peers.length === 0 ? "Add peers to see gaps!" : "No gaps found! You are up to date."}</div>
                    ) : (
                        missing.map(m => (
                            <span key={m.name} style={{
                                padding: '6px 12px', borderRadius: 20,
                                background: m.count > 1 ? 'var(--danger-bg)' : 'var(--bg)',
                                color: m.count > 1 ? 'var(--danger)' : 'var(--text-primary)',
                                border: '1px solid',
                                borderColor: m.count > 1 ? 'var(--danger-border)' : 'var(--border)',
                                fontSize: 13, fontWeight: 500
                            }}>
                                {m.name} <span style={{ opacity: 0.6, fontSize: 11 }}>({m.count})</span>
                            </span>
                        ))
                    )}
                </div>
            </div>

            <div className="card">
                <h3>Detailed Comparison</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Skill</th>
                            <th>Peer Count</th>
                            <th>You have it?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comparison.map(row => (
                            <tr key={row.name}>
                                <td style={{ textTransform: 'capitalize' }}>{row.name}</td>
                                <td>{row.peerCount}</td>
                                <td>
                                    {row.haveIt ? (
                                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓ Yes</span>
                                    ) : (
                                        <span style={{ color: 'var(--danger)' }}>No</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default SkillGap;
