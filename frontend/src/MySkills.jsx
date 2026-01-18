import { useState, useEffect } from 'react';

const normalizeSkill = (s) => s.trim().toLowerCase();

function MySkills({ state, refreshState, userId }) {
    const [skillInput, setSkillInput] = useState("");
    const [companyInput, setCompanyInput] = useState("");
    const [matchData, setMatchData] = useState(null);

    useEffect(() => {
        if (userId) {
            fetch(`/api/skill-match/${userId}`)
                .then(res => res.json())
                .then(data => setMatchData(data))
                .catch(e => console.error(e));
        }
    }, [userId, state ? state.mySkills : null]);

    if (!state) return <div>Loading...</div>;

    const handleUpdate = async () => {
        // Logic to update state and save to backend
        // Similar to legacy handleUpdateDetails
        const newSkills = [...(state.mySkills || [])];
        const newProfile = { ...state.profile };
        let changed = false;

        // 1. Company
        if (companyInput.trim()) {
            if (!newProfile.companies) newProfile.companies = [];
            // simple dedup
            const exists = newProfile.companies.some(c => c.toLowerCase() === companyInput.trim().toLowerCase());
            if (!exists) {
                newProfile.companies.push(companyInput.trim());
                changed = true;
            }
            setCompanyInput("");
        }

        // 2. Skills
        if (skillInput.trim()) {
            const parts = skillInput.split(',').map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
                const exists = newSkills.some(s => {
                    const name = typeof s === 'object' ? s.skill : s;
                    return name.toLowerCase() === p.toLowerCase();
                });
                if (!exists) {
                    newSkills.push({ skill: p, company: companyInput.trim() }); // associated current input company
                    changed = true;
                }
            });
            setSkillInput("");
        }

        if (changed) {
            // Optimistic update
            // We need to call backend save logic
            // But here we might just want to call a parent handler or context
            // For now, let's implement validation save here
            try {
                await fetch('/api/state/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        mySkills: newSkills,
                        profile: newProfile
                    })
                });
                // Refresh
                refreshState();
            } catch (e) {
                console.error(e);
                alert("Failed to save");
            }
        }
    };

    const removeSkill = async (index) => {
        const newSkills = [...state.mySkills];
        newSkills.splice(index, 1);
        try {
            await fetch('/api/state/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    mySkills: newSkills,
                    profile: state.profile
                })
            });
            refreshState();
        } catch (e) {
            console.error(e);
        }
    };

    const removeCompany = async (compName) => {
        if (!confirm(`Remove ${compName}?`)) return;
        const newProfile = { ...state.profile };
        newProfile.companies = newProfile.companies.filter(c => c !== compName);

        const newSkills = state.mySkills.filter(s => {
            const sc = typeof s === 'object' ? s.company : "";
            return sc !== compName;
        });

        try {
            await fetch('/api/state/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    mySkills: newSkills,
                    profile: newProfile
                })
            });
            refreshState();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="page active">
            <h2>My Skills</h2>
            <div className="split">
                {/* Top 20 Skills Match Card */}
                {/* Top 20 Skills Match Card */}
                {matchData && (
                    <div className="card" style={{ marginBottom: 20, gridColumn: 'span 2', background: 'var(--card)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                        {/* decorative accent background */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--accent)', opacity: 0.05, pointerEvents: 'none' }}></div>

                        <h3 style={{ color: 'var(--accent)', marginBottom: 16 }}>Top 20 Skills Match</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', zIndex: 1 }}>
                            <div style={{ textAlign: 'center', minWidth: 80 }}>
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{matchData.percentage}%</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Match Rate</div>
                            </div>

                            <div style={{ flex: 1 }}>
                                {/* Progress Bar */}
                                <div style={{ height: 8, width: '100%', background: 'var(--border)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${matchData.percentage}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.5s' }}></div>
                                </div>

                                {/* Matched Skills */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {matchData.matchedSkills.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Add reliable skills like Python, Java, React...</span>}
                                    {matchData.matchedSkills.slice(0, 10).map(s => (
                                        <span key={s} style={{ padding: '4px 10px', borderRadius: 12, background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, border: '1px solid var(--border)' }}>
                                            {s}
                                        </span>
                                    ))}
                                    {matchData.matchedSkills.length > 10 && (
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>+{matchData.matchedSkills.length - 10} more</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* Add Skills */}
                <div className="card">
                    <h3>Add / Remove Skills</h3>
                    <div style={{ marginBottom: 10 }}>
                        <label>Company</label>
                        <input
                            placeholder="e.g. Google"
                            value={companyInput}
                            onChange={e => setCompanyInput(e.target.value)}
                        />
                        <label>Skills (comma separated)</label>
                        <input
                            placeholder="e.g. Python, React"
                            value={skillInput}
                            onChange={e => setSkillInput(e.target.value)}
                        />
                        <button className="action" onClick={handleUpdate}>Update Details</button>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <h4>Your Company</h4>
                        <div className="tag-list">
                            {(state.profile.companies || []).map(c => (
                                <span key={c} style={{
                                    background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)',
                                    padding: '4px 8px', borderRadius: 12, marginRight: 5,
                                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12
                                }}>
                                    {c}
                                    <span style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => removeCompany(c)}>×</span>
                                </span>
                            ))}
                        </div>

                        <h4 style={{ marginTop: 16 }}>Your Skills</h4>
                        <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(state.mySkills || []).map((s, i) => {
                                const name = typeof s === 'object' ? s.skill : s;
                                const comp = typeof s === 'object' ? s.company : "";
                                return (
                                    <span key={i} style={{
                                        background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)',
                                        padding: '4px 10px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6,
                                        fontSize: 12
                                    }}>
                                        {name} {comp && <small style={{ opacity: 0.8, color: 'var(--text-secondary)' }}>({comp})</small>}
                                        <span style={{ cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => removeSkill(i)}>×</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MySkills;
