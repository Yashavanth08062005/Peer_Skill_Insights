// IIFE to avoid polluting global scope
(function () {
  const BASE_URL = "http://localhost:3001/api";

  // Elements
  const app = document.getElementById("app");
  const navItems = document.querySelectorAll(".nav-btn");
  const pages = document.querySelectorAll(".page");

  // Auth logic is handled at the end, initializing app state.

  let state = {
    profile: { name: "", meta: "", avatar: "", companies: [] },
    mySkills: [],
    peers: [],
    resources: []
  };

  // State Management
  async function loadState() {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/state/${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        // Ensure mySkills is valid
        if (!data.mySkills) data.mySkills = [];
        // Normalizing mySkills to be array of objects {skill, company}
        // Legacy support: if strings, convert.
        data.mySkills = data.mySkills.map(s => {
          if (typeof s === 'string') return { skill: s, company: "" };
          return s;
        });

        // Ensure companies is array
        if (!data.profile.companies) {
          // Legacy: if string "company", migrate to array?
          // Actually existing code relied on state.profile.company being a string in some places?
          // Let's support data.profile.companies as the source of truth.
          // If backend sends 'company' string, push to array if empty.
          data.profile.companies = data.profile.companies || [];
          if (data.profile.company && data.profile.companies.length === 0) {
            data.profile.companies.push(data.profile.company);
          }
        }

        state = data;
        renderAll();
      }
    } catch (e) {
      console.error("Load state error", e);
    }
  }

  async function saveState() {
    if (!currentUserId) return;
    try {
      await fetch('/api/state/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, ...state })
      });
    } catch (e) {
      console.error("Save state error", e);
    }
  }

  // Navigation
  navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.page;
      showPage(target);
    });
  });

  function showPage(id) {
    pages.forEach(p => p.classList.remove("active"));
    navItems.forEach(b => b.classList.remove("active"));

    const p = document.getElementById(id);
    const b = document.querySelector(`.nav-btn[data-page="${id}"]`);

    if (p) p.classList.add("active");
    if (b) b.classList.add("active");

    // special handling
    if (id === "dashboard") refreshCharts();
    if (id === "myskills") {
      renderMySkills();
      fetchAndRenderSkillMatch();
    }
    if (id === "peers") {
      renderPeerList();
      renderRequests();
    }
    if (id === "skillgap") renderGap();

    // hash
    window.location.hash = id;
  }

  // Dashboard Charts
  let trendingChart, companyChart, domainChart;

  function initCharts() {
    const trendEl = document.getElementById("trendingChart"); // Fixed ID
    const compEl = document.getElementById("companyChart");
    const domainEl = document.getElementById("domainChart");

    // Trending
    if (trendEl) {
      const trendCtx = trendEl.getContext("2d");
      if (trendingChart) trendingChart.destroy();
      trendingChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Skill Frequency',
            data: [],
            backgroundColor: '#00ED64', // MongoDB Green
            borderRadius: 4,
            barPercentage: 0.6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#E8EDEB' }
            },
            x: {
              grid: { display: false }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    // Company
    if (compEl) {
      const compCtx = compEl.getContext("2d");
      if (companyChart) companyChart.destroy();
      companyChart = new Chart(compCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Skill Count by Company',
            data: [],
            backgroundColor: '#0ea5e9'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

    }

    // Domain Chart
    if (domainEl) {
      const domainCtx = domainEl.getContext("2d");
      if (domainChart) domainChart.destroy();
      domainChart = new Chart(domainCtx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: ['#f43f5e', '#8b5cf6', '#10b981', '#f59e0b']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }

  function refreshCharts() {
    if (!state.mySkills) return;

    // aggregation
    const compMap = {};
    (state.mySkills || []).forEach(s => {
      const c = typeof s === 'object' ? s.company : "";
      if (c) {
        compMap[c] = (compMap[c] || 0) + 1;
      }
    });

    if (companyChart) {
      companyChart.data.labels = Object.keys(compMap);
      companyChart.data.datasets[0].data = Object.values(compMap);
      companyChart.update();
    }

    // domain dummy
    if (domainChart) {
      domainChart.data.labels = ["Frontend", "Backend", "DevOps", "Soft Skills"];
      // simple hash logic or random for demo
      domainChart.data.datasets[0].data = [
        state.mySkills.length > 2 ? state.mySkills.length - 2 : 1,
        2, 1, 1
      ];
      domainChart.update();
    }

    // Trending Skills (Aggregated from Me + Peers)
    if (trendingChart) {
      const skillCounts = {};

      // Count my skills
      (state.mySkills || []).forEach(s => {
        const name = typeof s === 'object' ? s.skill : s;
        if (name) {
          const n = normalizeSkill(name);
          skillCounts[n] = (skillCounts[n] || 0) + 1;
        }
      });

      // Count peer skills
      (state.peers || []).forEach(p => {
        if (p.skills && Array.isArray(p.skills)) {
          p.skills.forEach(s => {
            const n = normalizeSkill(s);
            skillCounts[n] = (skillCounts[n] || 0) + 1;
          });
        }
      });

      // Sort by count desc
      const sorted = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8

      trendingChart.data.labels = sorted.map(i => i[0]);
      trendingChart.data.datasets[0].data = sorted.map(i => i[1]);
      trendingChart.data.datasets[0].label = 'Skill Frequency (Network)';
      trendingChart.update();
    }
  }

  // Profile Edit
  const pName = document.getElementById("nameInput"); // Mapped to nameInput
  const pMeta = document.getElementById("metaInput"); // Mapped to metaInput
  const pSave = document.getElementById("saveProfileBtn");
  const userName = document.getElementById("userName"); // May be null
  const userMeta = document.getElementById("userMeta"); // May be null
  const brandAvatar = document.getElementById("brandAvatar"); // Fixed selector
  const profileAvatar = document.getElementById("profileAvatar"); // May be null

  const avatarInput = document.getElementById("avatarInput");
  const changeAvatarBtn = document.getElementById("changeAvatarBtn");
  const removeAvatarBtn = document.getElementById("removeAvatarBtn");


  // Avatar Logic for Profile Page
  changeAvatarBtn.addEventListener("click", () => avatarInput.click());
  avatarInput.addEventListener("change", () => {
    if (avatarInput.files && avatarInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.profile.avatar = e.target.result;
        renderProfile();
        saveState();
      };
      reader.readAsDataURL(avatarInput.files[0]);
    }
  });
  removeAvatarBtn.addEventListener("click", () => {
    state.profile.avatar = null;
    renderProfile();
    saveState();
  });


  pSave.addEventListener("click", () => {
    state.profile.name = pName.value;
    state.profile.meta = pMeta.value;
    saveState();
    renderProfile();
    alert("Profile saved!");
  });

  function renderProfile() {
    if (pName) pName.value = state.profile.name || "";
    if (pMeta) pMeta.value = state.profile.meta || "";
    if (userName) userName.textContent = state.profile.name || "Your Name";
    if (userMeta) userMeta.textContent = state.profile.meta || "Student / Developer";

    const def = "https://via.placeholder.com/40";
    const bigDef = "https://via.placeholder.com/80";

    if (state.profile.avatar) {
      if (brandAvatar) brandAvatar.src = state.profile.avatar;
      if (profileAvatar) profileAvatar.src = state.profile.avatar;
    } else {
      if (brandAvatar) brandAvatar.src = def;
      if (profileAvatar) profileAvatar.src = bigDef;
    }
  }

  // My Skills Profile Card (Sync with Profile Page)
  const mySkillsPhoto = document.getElementById("mySkillsPhoto");
  const mySkillsName = document.getElementById("mySkillsName");
  const mySkillsMeta = document.getElementById("mySkillsMeta"); // Displays Companies
  const mySkillsChangePhoto = document.getElementById("mySkillsChangePhoto");
  const mySkillsRemovePhoto = document.getElementById("mySkillsRemovePhoto");
  const mySkillsPhotoInput = document.getElementById("mySkillsPhotoInput");

  // Skill Match Refs
  const skillMatchPercentage = document.getElementById("skillMatchPercentage");
  const skillMatchBar = document.getElementById("skillMatchBar");
  const skillMatchMissing = document.getElementById("skillMatchMissing");

  // skills
  const skillInput = document.getElementById("skillInput");
  const companyInput = document.getElementById("myCompanyInput"); // Mapped to myCompanyInput
  const saveCompanyBtn = document.getElementById("saveCompanyBtn");
  const addSkillBtn = document.getElementById("addSkillBtn");
  const mySkillsList = document.getElementById("mySkillsList");
  const myCompanyTags = document.getElementById("myCompanyList");

  // Avatar Logic for My Skills Card
  mySkillsChangePhoto.addEventListener("click", () => mySkillsPhotoInput.click());
  mySkillsPhotoInput.addEventListener("change", () => {
    if (mySkillsPhotoInput.files && mySkillsPhotoInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.profile.avatar = e.target.result;
        renderProfile(); // update header/profile page
        renderMySkillsProfileCard(); // update this card
        saveState();
      };
      reader.readAsDataURL(mySkillsPhotoInput.files[0]);
    }
  });
  mySkillsRemovePhoto.addEventListener("click", () => {
    state.profile.avatar = null;
    renderProfile();
    renderMySkillsProfileCard();
    saveState();
  });

  function renderMySkillsProfileCard() {
    // 1. Avatar
    const bigDef = "https://via.placeholder.com/80";
    if (state.profile.avatar) {
      mySkillsPhoto.src = state.profile.avatar;
    } else {
      mySkillsPhoto.src = bigDef;
    }

    // 2. Name
    mySkillsName.textContent = state.profile.name || "Your Name";

    // 3. Meta (Companies) - Join with comma
    // If we have companies array, display it.
    if (state.profile.companies && state.profile.companies.length > 0) {
      mySkillsMeta.textContent = state.profile.companies.join(", ");
    } else {
      mySkillsMeta.textContent = "No company added";
    }
  }

  // Add Metadata (Company & Skills)
  function handleUpdateDetails() {
    const raw = skillInput ? skillInput.value : "";
    const companyVal = companyInput ? companyInput.value.trim() : "";

    // 1. Handle Company
    if (companyVal) {
      if (!state.profile.companies) state.profile.companies = [];
      // Prevent duplicates
      const exists = state.profile.companies.some(c => c.toLowerCase() === companyVal.toLowerCase());
      if (!exists) {
        state.profile.companies.push(companyVal);
      }
      if (companyInput) companyInput.value = "";
    }

    // 2. Handle Skills
    if (raw.trim()) {
      const skillsToAdd = raw.split(",").map(s => normalizeSkill(s)).filter(Boolean);
      let addedCount = 0;

      skillsToAdd.forEach(sk => {
        // Check duplicate in MySkills
        // mySkills is array of {skill, company}
        const exists = state.mySkills.some(existing => {
          const eName = typeof existing === 'string' ? existing : existing.skill;
          return eName.toLowerCase() === sk.toLowerCase();
        });

        if (!exists) {
          state.mySkills.push({ skill: sk, company: companyVal });
          addedCount++;
        }
      });

      if (addedCount > 0 || companyVal) {
        saveState();
        renderMySkills();
        renderMySkillsProfileCard();
        refreshCharts();
        fetchAndRenderSkillMatch();
      }
      if (skillInput) skillInput.value = "";
    } else if (companyVal) {
      // Only company added
      saveState();
      renderMySkillsProfileCard();
      renderMySkills(); // to update company tags area
    }
  }

  if (updateDetailsBtn) updateDetailsBtn.addEventListener("click", handleUpdateDetails);



  // Render "Your Company" tags and "Your skills" list
  function renderMySkills() {
    // A. Render Company Tags
    if (myCompanyTags) {
      myCompanyTags.innerHTML = "";
      if (state.profile.companies && state.profile.companies.length > 0) {
        state.profile.companies.forEach(comp => {
          const tag = document.createElement("span");
          tag.className = "skill-tag"; // reuse skill-tag style or create new
          tag.style.cssText = "background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd; padding:4px 8px; border-radius:12px; margin-right:5px; margin-bottom:5px; display:inline-block; font-size:12px; cursor:default;";
          tag.textContent = comp;

          // Remove 'x'
          // If user clicks tag, maybe remove company?
          // Let's add 'x' for removing company
          const x = document.createElement("span");
          x.textContent = " ×";
          x.style.cursor = "pointer";
          x.style.marginLeft = "4px";
          x.onclick = () => removeCompany(comp);
          tag.appendChild(x);

          myCompanyTags.appendChild(tag);
        });
      } else {
        myCompanyTags.innerHTML = "<span style='color:#9ca3af; font-size:12px; font-style:italic;'>No company linked</span>";
      }
    }


    // B. Render Skills List
    mySkillsList.innerHTML = "";
    (state.mySkills || []).forEach((s, idx) => {
      const li = document.createElement("li");
      const name = typeof s === 'object' ? s.skill : s;
      const comp = typeof s === 'object' ? s.company : "";

      li.innerHTML = `<span>${escapeHtml(name)}</span>${comp ? `<small style='margin-left:6px;opacity:0.6'>(${escapeHtml(comp)})</small>` : ''}`;

      const btn = document.createElement("button");
      btn.textContent = "×";
      btn.onclick = () => {
        state.mySkills.splice(idx, 1);
        saveState();
        renderMySkills();
        refreshCharts();
        fetchAndRenderSkillMatch();
      };

      li.appendChild(btn);
      mySkillsList.appendChild(li);
    });
  }

  function removeCompany(compName) {
    if (!confirm(`Remove company "${compName}" and all associated skills?`)) return;

    // 1. Remove company from profile.companies
    state.profile.companies = state.profile.companies.filter(c => c !== compName);

    // 2. Remove skills associated with this company
    state.mySkills = state.mySkills.filter(s => {
      const sComp = typeof s === 'object' ? s.company : "";
      return sComp !== compName;
    });

    saveState();
    renderMySkills();
    renderMySkillsProfileCard();
    refreshCharts();
    fetchAndRenderSkillMatch();
  }


  // Peers Setup
  const peerSearch = document.getElementById("peerSearch");
  const peerList = document.getElementById("peerList");
  const peerListGlobal = document.getElementById("peerListGlobal");
  const peerSearchGlobal = document.getElementById("peerSearchGlobal");

  // In "Peers" page, we have My Network (peers) and maybe Search Global?
  // Current HTML has "My Network" and "Find Peers"

  function renderPeerList() {
    // 1. My Network
    peerList.innerHTML = "";
    if (state.peers.length === 0) {
      peerList.innerHTML = "<div class='muted'>No peers added yet.</div>";
    } else {
      state.peers.forEach((p, idx) => {
        const div = document.createElement("div");
        div.className = "peer-card";
        div.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;background:#ddd;border-radius:50%"></div>
            <div>
              <strong>${escapeHtml(p.name)}</strong>
              <div class="small">${escapeHtml(p.meta || "Student")}</div>
            </div>
          </div>
          <div>
            <button class="small-btn danger removePeerBtn">Remove</button>
            <button class="small-btn primary viewRecBtn" style="margin-left:5px">View Recs</button>
          </div>
        `;
        div.querySelector(".removePeerBtn").addEventListener("click", () => {
          if (confirm("Remove this peer?")) {
            state.peers.splice(idx, 1);
            saveState();
            renderPeerList();
          }
        });

        // View Recommendations Button
        div.querySelector(".viewRecBtn").addEventListener("click", () => {
          // Go to Resources page
          showPage("resources");
          // Set Filter to this peer
          // We need to find the option in the dropdown that matches this peer index
          // The dropdown is reset on renderResources -> but we can set value after?
          // Actually, renderResources calls populateFilters.
          // Let's set the global filterPeer.value logic. 
          // But filterPeer uses Peer Name. If names duplicate, might be issue.
          // Better: pass a URL param or set a global flag? 
          // For simplicity: set the select box value.
          setTimeout(() => {
            const filterPeer = document.getElementById("filterPeer");
            if (filterPeer) {
              filterPeer.value = p.name;
              // trigger change
              filterPeer.dispatchEvent(new Event('change'));
            }
          }, 100);
        });

        peerList.appendChild(div);
      });
    }
  }

  // Global Search
  let searchDebounce;
  if (peerSearchGlobal) {
    peerSearchGlobal.addEventListener("input", (e) => {
      clearTimeout(searchDebounce);
      const q = e.target.value.trim();
      if (!q) {
        if (peerListGlobal) peerListGlobal.innerHTML = "";
        return;
      }
      searchDebounce = setTimeout(async () => {
        // API call to search users in DB
        try {
          const res = await fetch(`/api/peers/search?q=${encodeURIComponent(q)}`);
          const users = await res.json();
          renderGlobalPeers(users);
        } catch (err) {
          console.error(err);
        }
      }, 400);
    });
  }

  function renderGlobalPeers(users) {
    if (!peerListGlobal) return;
    peerListGlobal.innerHTML = "";
    if (users.length === 0) {
      peerListGlobal.innerHTML = "<div class='muted'>No users found.</div>";
      return;
    }
    users.forEach(u => {
      // Don't show self
      if (u.id == currentUserId) return;
      // Check if already in peers
      const isPeer = state.peers.some(p => p.linkedId == u.id);

      const div = document.createElement("div");
      div.className = "peer-card";
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
           <div style="width:32px;height:32px;background:#ccc;border-radius:50%"></div>
           <div>
             <strong>${escapeHtml(u.username)}</strong>
             <div class="small">User ID: ${u.id}</div> 
           </div>
        </div>
        ${isPeer ? '<span class="small" style="color:green">Connected</span>' : '<button class="small-btn reqBtn">Request</button>'}
      `;

      const btn = div.querySelector(".reqBtn");
      if (btn) {
        btn.addEventListener("click", () => requestPeer(u));
      }
      peerListGlobal.appendChild(div);
    });
  }

  async function requestPeer(user) {
    try {
      // Server expects receiverEmail, but user object has name/username. Username is email.
      const res = await fetch('/api/peers/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, receiverEmail: user.username })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Request sent!");
      } else {
        alert(data.error || "Failed to send request.");
      }
    } catch (e) { console.error(e); }
  }

  // Add Peer Manually (by Email) - Fix for User Request
  const addPeerBtn = document.getElementById("addPeerBtn");
  if (addPeerBtn) {
    addPeerBtn.addEventListener("click", async () => {
      const input = document.getElementById("peerEmailInput");
      const email = input.value.trim();
      if (!email) {
        alert("Please enter a peer email");
        return;
      }

      try {
        // 1. Search for user first to verify existence (optional but updates UI state if we wanted)
        // Actually direct request handles verification too.

        // 2. Send Request
        const res = await fetch('/api/peers/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: currentUserId, receiverEmail: email })
        });
        const data = await res.json();

        if (data.error) {
          alert(data.error);
        } else {
          alert("Peer request sent successfully! They will appear in your list once they accept.");
          input.value = "";
        }
      } catch (err) {
        console.error(err);
        alert("Failed to send request");
      }
    });
  }

  // Peer Requests Logic
  const pendingRequestsList = document.getElementById("pendingRequestsList");

  async function renderRequests() {
    if (!pendingRequestsList) return;
    pendingRequestsList.innerHTML = "<div class='muted'>Loading...</div>";

    try {
      const res = await fetch(`/api/peers/requests/${currentUserId}`);
      const requests = await res.json();

      pendingRequestsList.innerHTML = "";
      if (requests.length === 0) {
        pendingRequestsList.innerHTML = "<div class='muted'>No pending requests.</div>";
        return;
      }

      requests.forEach(req => {
        const div = document.createElement("div");
        div.className = "peer-card";
        div.style.borderLeft = "4px solid #FFB000"; // Highlight pending

        let compDisplay = "No company";
        if (req.company && Array.isArray(req.company)) compDisplay = req.company.join(", ");
        else if (req.company) compDisplay = req.company;

        div.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px">
             <div style="width:32px;height:32px;background:#FFB000;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#000;font-weight:bold;font-size:10px">?</div>
             <div>
               <strong>${escapeHtml(req.name || req.email)}</strong>
               <div class="small">${escapeHtml(req.email)}</div>
               <div class="muted" style="font-size:11px">${escapeHtml(compDisplay)}</div>
             </div>
          </div>
          <div>
            <button class="small-btn primary acceptBtn" style="background:var(--accent);color:var(--accent-text)">Accept</button>
            <button class="small-btn danger rejectBtn" style="margin-left:5px">Reject</button>
          </div>
        `;

        div.querySelector(".acceptBtn").addEventListener("click", () => respondToRequest(req.id, 'accept'));
        div.querySelector(".rejectBtn").addEventListener("click", () => respondToRequest(req.id, 'reject'));

        pendingRequestsList.appendChild(div);
      });

    } catch (e) {
      console.error(e);
      pendingRequestsList.innerHTML = "<div class='muted'>Error loading requests.</div>";
    }
  }

  async function respondToRequest(reqId, action) {
    try {
      const res = await fetch('/api/peers/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqId, action })
      });
      if (res.ok) {
        alert(`Request ${action}ed!`);
        renderRequests();
        if (action === 'accept') {
          // reload state to get new peer
          loadState();
        }
      } else {
        alert("Failed to process request");
      }
    } catch (e) { console.error(e); }
  }


  // Skill Gap Logic
  const gapChips = document.getElementById("gapChips");
  const compareTable = document.getElementById("compareTable");

  function renderGap() {
    if (!gapChips || !compareTable) return;
    gapChips.innerHTML = "";
    const tbody = compareTable.querySelector("tbody");
    if (tbody) tbody.innerHTML = "";

    // If no peers, tell user
    if (state.peers.length === 0) {
      gapChips.innerHTML = "<div class='note'>Add peers to see skill gaps!</div>";
      return;
    }

    console.log("[DEBUG] renderGap: Peers found:", state.peers.length);

    // 1. Get My Skills Set
    const mySkillsSet = new Set();
    (state.mySkills || []).forEach(s => {
      const name = typeof s === 'object' ? s.skill : s;
      if (name) mySkillsSet.add(normalizeSkill(name));
    });

    // 2. Aggregate peer skills
    const peerSkillCounts = {};
    const allPeerSkills = new Set();

    state.peers.forEach(p => {
      // p.skills is an array of strings (flattened by server)
      if (p.skills && Array.isArray(p.skills)) {
        p.skills.forEach(s => {
          const n = normalizeSkill(s);
          if (!n) return;
          allPeerSkills.add(n);
          peerSkillCounts[n] = (peerSkillCounts[n] || 0) + 1;
        });
      }
    });

    // 3. Find Missing Skills (Peers have, I don't)
    const missingSkills = [];
    allPeerSkills.forEach(s => {
      if (!mySkillsSet.has(s)) {
        missingSkills.push({ name: s, count: peerSkillCounts[s] });
      }
    });

    // Sort missing by popularity
    missingSkills.sort((a, b) => b.count - a.count);

    // 4. Render "Skills peers have that you don't"
    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexWrap = "wrap";
    list.style.gap = "10px";

    if (missingSkills.length === 0) {
      if (allPeerSkills.size === 0) {
        gapChips.innerHTML = `<div class="muted">Your peers have no skills listed yet.</div>`;
      } else {
        gapChips.innerHTML = `<div class="muted" style="color:#059669">🎉 You have all the skills your peers have!</div>`;
      }
    } else {
      missingSkills.forEach(item => {
        const tag = document.createElement("span");
        tag.className = "skill-tag";
        // Highlight style for missing
        tag.style.cssText = "background:#fff1f2; color:#be123c; border:1px solid #fda4af; padding:5px 10px; border-radius:15px; display:inline-flex; align-items:center; gap:5px;";
        tag.innerHTML = `<strong>${escapeHtml(item.name)}</strong> <span style="font-size:0.8em; opacity:0.8">(${item.count} peers)</span>`;
        list.appendChild(tag);
      });
      gapChips.appendChild(list);
    }

    // 5. Render "Detailed Comparison" Table
    // Union of all skills (My + Peers)
    const allSkillsUnion = new Set([...mySkillsSet, ...allPeerSkills]);
    const sortedAllSkills = Array.from(allSkillsUnion).sort();

    if (tbody) {
      if (sortedAllSkills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="muted" style="padding:20px; text-align:center;">No skills data found.</td></tr>`;
      } else {
        sortedAllSkills.forEach(skillName => {
          const tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid #1e293b";

          // Stats
          const pCount = peerSkillCounts[skillName] || 0;
          const haveIt = mySkillsSet.has(skillName);

          tr.innerHTML = `
                    <td style="padding:10px;">${escapeHtml(skillName)}</td>
                    <td style="padding:10px;">${pCount}</td>
                    <td style="padding:10px;">
                        ${haveIt
              ? '<span style="color:#4ade80; font-weight:bold;">✔ Yes</span>'
              : '<span style="color:#f43f5e; font-weight:bold;">✘ No</span>'}
                    </td>
                `;
          tbody.appendChild(tr);
        });
      }
    }
  }

  // --- RESOURCES & RECOMMENDATIONS ---
  const resourceModal = document.getElementById("resourceModal");
  const globalRecommendBtn = document.getElementById("globalRecommendBtn");
  const saveResourceBtn = document.getElementById("saveResourceBtn");
  const cancelResourceBtn = document.getElementById("cancelResourceBtn");

  const resTitle = document.getElementById("resTitle");
  const resURL = document.getElementById("resURL");
  const resNote = document.getElementById("resNote");
  const resSkill = document.getElementById("resSkill");
  const resAuthorIndex = document.getElementById("resAuthorIndex"); // "Recommend To..."

  const resourceGrid = document.getElementById("resourceGrid");
  const resourceSearch = document.getElementById("resourceSearch");
  const filterSkill = document.getElementById("filterSkill");
  const filterPeer = document.getElementById("filterPeer");
  const resetFilters = document.getElementById("resetFilters");

  function normalizeSkill(s) {
    if (typeof s !== 'string') return "";
    return s.trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function populateFilters() {
    // Collect all skills from resources
    const skillsSet = new Set();
    const peersSet = new Set();

    (state.resources || []).forEach(r => {
      // r.skill could be string or object? In standard it's string (skill name).
      // Wait, in mySkills it is obj. In resources?
      // let's assume resources store skill NAME.
      const sName = typeof r.skill === 'object' ? r.skill.skill : r.skill;
      if (sName) skillsSet.add(sName);
      if (r.author) peersSet.add(r.author);
    });

    // preserve active filters if possible
    const activeSkill = filterSkill.value;
    const activePeer = filterPeer.value;

    filterSkill.innerHTML = '<option value="">All Skills</option>' + Array.from(skillsSet).sort().map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    filterPeer.innerHTML = '<option value="">All Peers</option>' + Array.from(peersSet).sort().map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

    // restore
    if (activeSkill) filterSkill.value = activeSkill;
    if (activePeer) filterPeer.value = activePeer;
  }

  function renderResources() {
    populateFilters();
    const q = (resourceSearch.value || "").trim().toLowerCase();
    const skillF = filterSkill.value;
    const peerF = filterPeer.value;

    const list = (state.resources || []).slice().reverse().filter(r => {
      const sName = typeof r.skill === 'object' ? r.skill.skill : r.skill;
      if (skillF && sName !== skillF) return false;
      // Allow specific peer match OR "All" (peerIndex -1)
      if (peerF && r.author !== peerF && r.author !== "All") return false;
      if (!q) return true;
      const hay = `${r.title} ${sName} ${r.author} ${r.note}`.toLowerCase();
      return hay.includes(q);
    });

    resourceGrid.innerHTML = "";
    if (list.length === 0) {
      const card = document.createElement("div");
      card.className = "resource-card";
      card.innerHTML = `<div class="title muted">No resources matched.</div><div class="note">Ask peers to recommend resources from the Peers page.</div>`;
      resourceGrid.appendChild(card);
      return;
    }

    list.forEach((r, idx) => {
      const card = document.createElement("div");
      card.className = "resource-card";
      const sName = typeof r.skill === 'object' ? r.skill.skill : r.skill;

      card.innerHTML = `
        <div class="meta">
          <div>
            <div class="title">${escapeHtml(r.title || r.url)}</div>
            <div class="small">by ${escapeHtml(r.author || "Peer")} • recommended for <strong>${escapeHtml(sName || "General")}</strong></div>
          </div>
          <div style="text-align:right">
            <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" style="margin-right:8px">Open</a>
            <button class="removeResourceBtn secondary" style="font-size:11px; padding:2px 6px">Remove</button>
          </div>
        </div>
        ${r.note ? `<div class="note">${escapeHtml(r.note)}</div>` : ""}
      `;

      const removeBtn = card.querySelector(".removeResourceBtn");
      removeBtn.addEventListener("click", () => {
        if (confirm("Remove this recommendation?")) {
          // Find index in main state array (since list is reversed/filtered, can't use idx directly effectively unless careful)
          // Better to find by reference or ID. Currently no ID. 
          // Assuming object ref is same? 
          const realIdx = state.resources.indexOf(r);
          if (realIdx > -1) {
            state.resources.splice(realIdx, 1);
            saveState(); // Warning: If SAVE doesn't persist resources, this is temporary!
            renderResources();
            refreshAll();
          }
        }
      });

      resourceGrid.appendChild(card);
    });
  }

  // resource modal handlers
  globalRecommendBtn && globalRecommendBtn.addEventListener("click", () => {
    resAuthorIndex.innerHTML = `<option value="-1">All (Everyone)</option>`;
    state.peers.forEach((p, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = p.name || `Peer ${i + 1}`;
      resAuthorIndex.appendChild(opt);
    });

    // Populate Skills Dropdown (Only MY skills)
    const uniqueSkills = new Set();
    // 1. My skills
    state.mySkills.forEach(s => uniqueSkills.add(typeof s === 'object' ? normalizeSkill(s.skill) : normalizeSkill(s)));

    resSkill.innerHTML = "<option value=''>(any skill)</option>" + Array.from(uniqueSkills).sort().map(s => {
      return `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`;
    }).join("");

    resTitle.value = "";
    resURL.value = "";
    resNote.value = "";
    resourceModal.style.display = "flex";
  });

  saveResourceBtn.addEventListener("click", async () => {
    const title = resTitle.value.trim();
    const url = resURL.value.trim();
    const note = resNote.value.trim();
    const skill = resSkill.value || "";

    if (!url) { alert("Please add a URL."); return; }

    const isMe = resAuthorIndex.value === "-1";

    // IF "All" is selected, we treat it as a personal/general note (saved to Self)
    if (isMe) {
      const resource = { title: title || url, url, note, skill, author: "All", peerIndex: -1, created: Date.now() };
      state.resources = state.resources || [];
      state.resources.push(resource);
      saveState();
      renderResources();
      resourceModal.style.display = "none";
      showPage("resources");
      return;
    }

    // IF a specific PEER is selected, we SEND it to them
    const i = parseInt(resAuthorIndex.value, 10);
    const peer = state.peers[i];

    if (peer && peer.linkedId) {
      // Send to Peer via API
      try {
        const res = await fetch('/api/resources/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            receiverId: peer.linkedId,
            resource: { title: title || url, url, note, skill }
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert(`Resource recommended to ${peer.name || "Peer"} successfully!`);

          // ALSO save locally so I can see what I recommended
          const author = (peer && peer.name) ? peer.name : `Peer ${i + 1}`;
          // We use the peer's name as author for display grouping "Recommended for [Peer]" or similar?
          // Actually currently display is "by [author]". 
          // If I recommended it, I am the author in the Peer's DB. 
          // But in MY DB, I want to see it grouped under that Peer.
          // The resource list filters by 'author' or 'peerIndex'.
          // If we set 'peerIndex' to 'i', it will show up when filtering by that Peer.

          const resource = { title: title || url, url, note, skill, author, peerIndex: i, created: Date.now() };
          state.resources = state.resources || [];
          state.resources.push(resource);
          saveState();
          renderResources();

          resourceModal.style.display = "none";
          showPage("resources");
        } else {
          alert("Failed to recommend: " + (data.error || "Unknown error"));
        }
      } catch (e) {
        console.error(e);
        alert("Network error sending recommendation.");
      }
    } else {
      // Fallback for non-linked peers (local save as 'by Peer')
      const author = (peer && peer.name) ? peer.name : `Peer ${i + 1}`;
      const resource = { title: title || url, url, note, skill, author, peerIndex: i, created: Date.now() };
      state.resources = state.resources || [];
      state.resources.push(resource);
      saveState();
      renderResources();
      resourceModal.style.display = "none";
      showPage("resources");
    }
  });

  cancelResourceBtn.addEventListener("click", () => resourceModal.style.display = "none");

  // filters events
  [resourceSearch, filterSkill, filterPeer].forEach(el => {
    el && el.addEventListener("input", renderResources);
    el && el.addEventListener("change", renderResources);
  });
  resetFilters.addEventListener("click", () => {
    resourceSearch.value = "";
    filterSkill.value = "";
    filterPeer.value = "";
    renderResources();
  });

  // helpers
  function escapeHtml(s) { if (!s) return ""; return s.toString().replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }

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

  function renderAll() {
    renderProfile();
    renderMySkills();
    renderPeerList();
    initCharts();
    refreshAll();
  }

  // auth
  let authScreen, authTitle, authForm, authUsername, authPassword, authSwitch, authMsg, appContainer;
  let isRegistering = false;
  let currentUser = localStorage.getItem("psi_user");
  let currentUserId = localStorage.getItem("psi_user_id");
  if (currentUserId === "undefined") currentUserId = null;

  function setupTheme() {
    const themeBtn = document.getElementById("themeToggleBtn");
    const storedTheme = localStorage.getItem("psi_theme");

    if (storedTheme === "light") {
      document.body.classList.add("light-mode");
      if (themeBtn) themeBtn.textContent = "☀️";
    }

    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");
        const isLight = document.body.classList.contains("light-mode");
        themeBtn.textContent = isLight ? "☀️" : "🌙";
        localStorage.setItem("psi_theme", isLight ? "light" : "dark");

        // Refresh charts to pick up any style changes if needed (though canvas needs manual update usually)
        // refreshCharts(); 
      });
    }
  }

  function setupAuth() {
    setupTheme();
    // console.log("running setupAuth");

    authScreen = document.getElementById("authScreen");
    authTitle = document.getElementById("authTitle");
    authForm = document.getElementById("authForm");
    authUsername = document.getElementById("authUsername");
    authPassword = document.getElementById("authPassword");
    authSwitch = document.getElementById("authSwitch");
    authMsg = document.getElementById("authMsg");
    appContainer = document.querySelector(".app");

    if (!authForm) {
      console.error("AuthForm not found!");
      return;
    }

    authSwitch.addEventListener("click", () => {
      isRegistering = !isRegistering;
      authTitle.textContent = isRegistering ? "Register" : "Login";
      authSwitch.textContent = isRegistering ? "Have an account? Login" : "Don't have an account? Register";
      authMsg.textContent = "";
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("psi_user");
        localStorage.removeItem("psi_user_id");
        location.reload();
      });
    }

    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // alert("Submit pressed!"); // Force user validation
      if (authMsg) authMsg.textContent = "Processing...";
      const username = authUsername.value.trim();
      const password = authPassword.value.trim();
      if (!username || !password) return;

      // Email validation (Relaxed for testing)
      const emailRegex = /@/;
      if (!emailRegex.test(username)) {
        authMsg.textContent = "Please enter a valid email";
        return;
      }

      const endpoint = isRegistering ? '/api/register' : '/api/login';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
          authMsg.textContent = data.error || "Action failed";
          return;
        }

        if (isRegistering) {
          alert("Registration successful! Please login.");
          isRegistering = false;
          authTitle.textContent = "Login";
          authSwitch.textContent = "Don't have an account? Register";
          authPassword.value = "";
        } else {
          currentUser = data.username;
          currentUserId = data.userId;
          localStorage.setItem("psi_user", currentUser);
          localStorage.setItem("psi_user_id", currentUserId);
          showApp();
        }
      } catch (e) {
        console.error("Auth Request Error:", e);
        if (authMsg) authMsg.textContent = "Network error: " + e.message;
      }
    });
  }

  function showApp() {
    if (authScreen) authScreen.style.display = "none";
    if (appContainer) appContainer.classList.add("active");
    loadState().then(() => {
      renderAll();
      if (state.profile.avatar && typeof brandAvatar !== 'undefined') brandAvatar.src = state.profile.avatar;

      // Restore last page from Hash
      const hash = window.location.hash.substring(1);
      const lastPage = hash || "dashboard";
      showPage(lastPage);
    });
  }

  // init
  document.addEventListener("DOMContentLoaded", async () => {
    setupAuth();

    // Check if logged in
    if (currentUser && currentUserId) {
      showApp();
    } else {
      // Ensure auth screen is visible
      if (authScreen) authScreen.style.display = "flex";
      if (appContainer) appContainer.classList.remove("active");
    }

    // close modal on clicking outside
    if (typeof resourceModal !== 'undefined') {
      resourceModal.addEventListener("click", (e) => {
        if (e.target === resourceModal) resourceModal.style.display = "none";
      });
    }

    window.addEventListener('resize', () => {
      if (typeof trendingChart !== 'undefined' && trendingChart) trendingChart.resize();
      if (typeof companyChart !== 'undefined' && companyChart) companyChart.resize();
      if (typeof domainChart !== 'undefined' && domainChart) domainChart.resize();
    });
  });

  // expose showPage
  window.showPage = (id) => showPage(id);

})();
