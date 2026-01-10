// refresh everything
function refreshAll() {
    // Priority: New Feature
    fetchAndRenderSkillMatch();

    try { renderProfile(); } catch (e) { console.error("Render Profile Error", e); }
    try { renderMySkills(); } catch (e) { console.error("Render MySkills Error", e); }
    try { renderMySkillsProfileCard(); } catch (e) { console.error("Render Card Error", e); }
    try { renderPeerList(); } catch (e) { console.error("Render PeerList Error", e); }
    try { renderGap(); } catch (e) { console.error("Render Gap Error", e); }
    try { refreshCharts(); } catch (e) { console.error("Refresh Charts Error", e); }
    try { renderResources(); } catch (e) { console.error("Render Resources Error", e); }
}

// New Feature: Top 20 Skills Match
async function fetchAndRenderSkillMatch() {
    console.log("[DEBUG] fetchAndRenderSkillMatch called");
    if (!skillMatchPercentage) {
        console.error("[DEBUG] Element #skillMatchPercentage missing");
        return;
    }
    if (!currentUserId) {
        console.error("[DEBUG] No currentUserId");
        // User might not be fully logged in yet, or logged out.
        return;
    }

    try {
        console.log(`[DEBUG] Fetching Skill Match for UserID: ${currentUserId}`);
        // Cache bust to prevent 304 Not Modified if server changed logic
        const res = await fetch(`/api/skill-match/${currentUserId}?t=${Date.now()}`);
        console.log(`[DEBUG] Response Status: ${res.status}`);

        if (!res.ok) {
            console.error("[DEBUG] Skill Match API Failed:", res.status, res.statusText);
            skillMatchPercentage.textContent = "Error";
            return;
        }

        const data = await res.json();
        console.log("[DEBUG] Skill Match Data:", data);

        const { percentage, missingSkills } = data;

        if (percentage === 0) {
            skillMatchPercentage.innerHTML = `0% <div style='font-size:11px; color:#ef4444; margin-top:4px'>ID: ${currentUserId}</div>`;
        } else {
            skillMatchPercentage.textContent = percentage + "%";
        }

        // Update Bar Width
        if (skillMatchBar) skillMatchBar.style.width = percentage + "%";

        // Render Missing Skills Chips
        if (skillMatchMissing) {
            skillMatchMissing.innerHTML = "";
            if (missingSkills && missingSkills.length > 0) {
                missingSkills.slice(0, 8).forEach(skill => {
                    const chip = document.createElement("span");
                    chip.style.cssText = "background:#f3f4f6; padding:4px 8px; border-radius:12px; font-size:11px; color:#374151; border:1px solid #e5e7eb; display:inline-block;";
                    chip.textContent = skill;
                    skillMatchMissing.appendChild(chip);
                });
                if (missingSkills.length > 8) {
                    const more = document.createElement("span");
                    more.style.cssText = "font-size:11px; color:#6b7280; padding:4px;";
                    more.textContent = `+${missingSkills.length - 8} more`;
                    skillMatchMissing.appendChild(more);
                }
            } else {
                skillMatchMissing.innerHTML = `<span style="color:#059669; font-size:12px; font-weight:600;">🎉 All Top 20 skills matched!</span>`;
            }
        }

    } catch (e) {
        console.error("Skill Match Render Error:", e);
        skillMatchPercentage.textContent = "JS Error";
    }
}
