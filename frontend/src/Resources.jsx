import { useState, useMemo } from 'react';

function Resources({ state, userId, refreshState }) {
    const [filterSkill, setFilterSkill] = useState("");
    const [filterPeer, setFilterPeer] = useState("");
    const [searchQ, setSearchQ] = useState("");

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modSkill, setModSkill] = useState("");
    const [modTitle, setModTitle] = useState("");
    const [modUrl, setModUrl] = useState("");
    const [modNote, setModNote] = useState("");
    const [modPeerIndex, setModPeerIndex] = useState(""); // Index in state.peers array

    if (!state) return <div>Loading...</div>;

    // Combine resources
    // User Requirement: Only show MY resources (including explicit recommendations). 
    // Disable "Shared Network Feed" (passive pulling of peer libraries).
    const allResources = useMemo(() => {
        return (state.resources || []).map(r => ({ ...r, type: 'mine' }));
    }, [state]);

    // Filter Logic
    const filtered = allResources.filter(r => {
        // Search
        if (searchQ) {
            const q = searchQ.toLowerCase();
            const match = (r.title || "").toLowerCase().includes(q) ||
                (r.skill || "").toLowerCase().includes(q) ||
                (r.note || "").toLowerCase().includes(q) ||
                (r.author || "").toLowerCase().includes(q);
            if (!match) return false;
        }
        // Skill Filter
        if (filterSkill && r.skill !== filterSkill) return false;
        // Peer Filter (Author)
        if (filterPeer && r.author !== filterPeer) return false;

        return true;
    });

    // Unique lists for dropdowns
    const uniqueSkills = Array.from(new Set(allResources.map(r => r.skill).filter(Boolean))).sort();
    const uniqueAuthors = Array.from(new Set(allResources.map(r => r.author).filter(Boolean))).sort();

    const handleRecommend = async () => {
        if (!modPeerIndex || !modSkill || !modTitle || !modUrl) {
            alert("Please fill required fields (Peer, Skill, Title, URL)");
            return;
        }

        const peer = state.peers[modPeerIndex];
        // We need receiverId. Peer object has linkedId for linked user
        const receiverId = peer.linkedId; // wait, peer object structure?
        // In script.js/server.js: peers table has linked_user_id.
        // state.peers has { id, name, company, skills, linkedId } (if I recall correctly from server.js loadState)

        if (!receiverId) {
            alert("This peer is not fully linked (legacy entry?). Cannot recommend.");
            return;
        }

        const payload = {
            senderId: userId,
            receiverId: receiverId,
            resource: {
                skill: modSkill,
                title: modTitle,
                url: modUrl,
                note: modNote
            }
        };

        try {
            const res = await fetch('/api/resources/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                alert("Recommendation sent!");
                setShowModal(false);
                setModTitle(""); setModUrl(""); setModNote("");
                refreshState(); // Refresh UI to show the 'Sent to' copy
            } else {
                alert(data.error || "Failed");
            }
        } catch (e) { console.error(e); }
    };

    return (
        <section className="page active">
            <h2>Resource Recommendations</h2>

            {/* Controls */}
            <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                <input
                    placeholder="Search resources..."
                    style={{ flex: 1, margin: 0 }}
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                />
                <select style={{ width: 'auto', margin: 0 }} value={filterSkill} onChange={e => setFilterSkill(e.target.value)}>
                    <option value="">All Skills</option>
                    {uniqueSkills.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select style={{ width: 'auto', margin: 0 }} value={filterPeer} onChange={e => setFilterPeer(e.target.value)}>
                    <option value="">All Peers</option>
                    {uniqueAuthors.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <button className="action" onClick={() => setShowModal(true)}>Recommend to Peer</button>
            </div>

            {/* Grid */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {filtered.map((r, i) => (
                    <div key={i} className="card resource-card" style={{ padding: 20, position: 'relative' }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: 'var(--text-primary)' }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{r.skill}</span>
                            <span>By: {r.author}</span>
                        </div>
                        {r.note && <div style={{ fontSize: 13, fontStyle: 'italic', opacity: 0.8, marginBottom: 10 }}>"{r.note}"</div>}
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                            View Resource →
                        </a>
                        {r.type === 'shared' && <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%' }} title="From Peer"></div>}
                        {r.peerIndex === -1 && <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 9, padding: '2px 6px', borderRadius: 8 }}>Recommended</div>}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,30,43,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: 500, padding: 24 }}>
                        <h3>Recommend a Resource</h3>

                        <label>To (Peer)</label>
                        <select value={modPeerIndex} onChange={e => setModPeerIndex(e.target.value)}>
                            <option value="">Select Peer...</option>
                            {state.peers.map((p, i) => (
                                <option key={p.id} value={i}>{p.name}</option>
                            ))}
                        </select>

                        <label>Skill</label>
                        {/* Suggest skills based on selected peer? Or just free text/select my skills? 
                       Legacy allowed selecting from dropdown. 
                       Let's use a simple input or dropdown of unique skills.
                   */}
                        <input
                            placeholder="e.g. Python"
                            value={modSkill}
                            onChange={e => setModSkill(e.target.value)}
                            list="skillOptions"
                        />
                        <datalist id="skillOptions">
                            {uniqueSkills.map(s => <option key={s} value={s} />)}
                        </datalist>

                        <label>Title</label>
                        <input placeholder="Resource Title" value={modTitle} onChange={e => setModTitle(e.target.value)} />

                        <label>URL</label>
                        <input placeholder="https://..." value={modUrl} onChange={e => setModUrl(e.target.value)} />

                        <label>Note</label>
                        <input placeholder="Optional note" value={modNote} onChange={e => setModNote(e.target.value)} />

                        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                            <button className="action" onClick={handleRecommend}>Send</button>
                            <button className="action secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Resources;
