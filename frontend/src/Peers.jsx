import { useState, useEffect } from 'react';

function Peers({ state, userId, refreshState, setView }) {
    const [peerEmail, setPeerEmail] = useState("");
    const [pendingRequests, setPendingRequests] = useState([]);


    // Fetch pending requests on load
    useEffect(() => {
        fetchRequests();
    }, [userId]);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`/api/peers/requests/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddPeer = async () => {
        if (!peerEmail) return;
        try {
            const res = await fetch('/api/peers/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: userId, receiverEmail: peerEmail })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Request sent!");
                setPeerEmail("");
            } else {
                alert(data.error || "Failed");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRespond = async (requestId, action) => {
        try {
            const res = await fetch('/api/peers/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, action })
            });
            if (res.ok) {
                fetchRequests();
                if (action === 'accept') refreshState();
            } else {
                alert("Failed");
            }
        } catch (e) { console.error(e); }
    };

    const handleRemovePeer = async (peerId) => {
        if (!confirm("Remove peer?")) return;
        try {
            const res = await fetch('/api/peers/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, peerId })
            });
            if (res.ok) refreshState();
        } catch (e) { console.error(e); }
    };



    if (!state) return <div>Loading...</div>;

    return (
        <section className="page active">
            <h2>Peer Insights</h2>

            {/* Add Peer Form */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3>Add Peer (by Email)</h3>
                <input
                    placeholder="Enter Peer Email (e.g. 01fe...@kletech.ac.in)"
                    value={peerEmail}
                    onChange={e => setPeerEmail(e.target.value)}
                />
                <button className="action" onClick={handleAddPeer}>Add Peer</button>
            </div>

            {/* Pending Requests */}
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3>Pending Requests</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pendingRequests.map(req => (
                            <div key={req.id} className="peer-card" style={{ border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                                <div>
                                    <strong style={{ color: 'var(--text-primary)' }}>{req.name || req.email}</strong>
                                    <div className="small" style={{ color: 'var(--text-secondary)' }}>{req.email}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="action" onClick={() => handleRespond(req.id, 'accept')}>Accept</button>
                                    <button className="action secondary" onClick={() => handleRespond(req.id, 'reject')}>Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}



            {/* Peer List */}
            <div className="card">
                <h3>My Peers</h3>
                {state.peers.length === 0 ? <div className="muted">No peers yet.</div> : (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {state.peers.map(p => (
                            <div key={p.id} className="peer-card" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, background: 'var(--border)', borderRadius: '50%' }}></div>
                                    <div>
                                        <strong>{p.name}</strong>
                                        <div className="small">{p.company || "Student"}</div>
                                    </div>
                                </div>
                                <div>
                                    <button className="action secondary" style={{ marginRight: 8 }} onClick={() => alert("Go to resources filter")}>View Recs</button>
                                    <button className="action secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRemovePeer(p.id)}>Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default Peers;
