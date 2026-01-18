import { useState, useEffect } from 'react';

function Profile({ state, userId, refreshState }) {
    const [name, setName] = useState("");
    const [meta, setMeta] = useState("");
    const [avatar, setAvatar] = useState("");

    useEffect(() => {
        if (state && state.profile) {
            setName(state.profile.name || "");
            setMeta(state.profile.meta || "");
            setAvatar(state.profile.avatar || "");
        }
    }, [state]);

    const handleSave = async () => {
        const newProfile = {
            ...state.profile,
            name,
            meta,
            avatar
        };

        try {
            await fetch('/api/state/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    mySkills: state.mySkills,
                    profile: newProfile
                    // resources: undefined -> preserve server data
                })
            });
            refreshState();
            alert("Profile saved!");
        } catch (e) {
            console.error(e);
            alert("Failed to save");
        }
    };

    if (!state) return <div>Loading...</div>;

    return (
        <section className="page active">
            <h2>Edit Profile</h2>
            <div className="card" style={{ maxWidth: 500 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <img
                        src={avatar || "https://via.placeholder.com/100"}
                        style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
                    />
                </div>

                <label>Display Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />

                <label>Headline / Meta</label>
                <input value={meta} onChange={e => setMeta(e.target.value)} placeholder="e.g. CS Student @ KLE Tech" />

                <label>Avatar URL</label>
                <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />

                <button className="action" style={{ marginTop: 16 }} onClick={handleSave}>Save Changes</button>
            </div>
        </section>
    );
}

export default Profile;
