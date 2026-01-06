(() => {
  // Storage key
  const STORAGE_KEY = "psi_data_v1";

  // Demo data
  const demo = {
    profile: { name: "You", meta: "3rd Year - CSE", avatar: "" },
    mySkills: ["Python", "HTML"],
    peers: [
      { name: "imran", skills: ["Github"], company: "junpier" },
      { name: "farhaan", skills: ["Typescript"], company: "Dell" },
      { name: "farhan", skills: ["MongoDB"], company: "" }
    ],
    resources: []
  };

  // state
  let state = {
    profile: { name: "", meta: "", avatar: "", company: "" },
    mySkills: [],
    peers: [],
    resources: []
  };

  // Load state from DB
  async function loadState() {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/state/${currentUserId}`);
      const data = await res.json();
      state = data;
    } catch (e) {
      console.error("Load State Error:", e);
    }
  }

  // Save state to DB

  async function saveState() {
    if (!currentUserId) {
      console.warn("[Client] saveState called but currentUserId is missing");
      return;
    }
    console.log("[Client] Saving state for UserID:", currentUserId);
    try {
      const res = await fetch('/api/state/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          profile: state.profile,
          mySkills: state.mySkills,
          peers: state.peers,
          resources: state.resources
        })
      });
      if (!res.ok) console.error("[Client] Save failed:", res.status, await res.text());
      else console.log("[Client] Save successful");
    } catch (e) {
      console.error("Save Error:", e);
    }
  }

  // utils
  function normalizeSkill(s) {
    return s.trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function aggregateSkillCounts() {
    const counts = {};
    state.peers.forEach(p => (p.skills || []).forEach(s => {
      const sk = normalizeSkill(s);
      counts[sk] = (counts[sk] || 0) + 1;
    }));
    state.mySkills.forEach(s => {
      const sk = normalizeSkill(s);
      counts[sk] = (counts[sk] || 0) + 1;
    });
    return counts;
  }

  function topNFromCounts(counts, n = 8) {
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  // dom refs
  const pages = document.querySelectorAll(".page");
  const navBtns = document.querySelectorAll(".nav-btn");

  // profile
  const brandAvatar = document.getElementById("brandAvatar");
  const avatarInput = document.getElementById("avatarInput");
  const nameInput = document.getElementById("nameInput");
  const metaInput = document.getElementById("metaInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileMsg = document.getElementById("profileMsg");
  const profileSummary = document.getElementById("profileSummary");
  const changeAvatarBtn = document.getElementById("changeAvatarBtn");
  const removeAvatarBtn = document.getElementById("removeAvatarBtn");

  // myskills mini
  const mySkillsPfp = document.getElementById("mySkillsPfp");
  const mySkillsName = document.getElementById("mySkillsName");
  const mySkillsMeta = document.getElementById("mySkillsMeta");
  const mySkillsCompany = document.getElementById("mySkillsCompany");
  const myCompanyInput = document.getElementById("myCompanyInput");
  const saveCompanyBtn = document.getElementById("saveCompanyBtn");
  const removeCompanyBtn = document.getElementById("removeCompanyBtn");
  const mySkillsChangePhoto = document.getElementById("mySkillsChangePhoto");
  const mySkillsRemovePhoto = document.getElementById("mySkillsRemovePhoto");
  const mySkillsPhotoInput = document.getElementById("mySkillsPhotoInput");

  // skills
  const skillInput = document.getElementById("skillInput");
  const addSkillBtn = document.getElementById("addSkillBtn");
  const mySkillsList = document.getElementById("mySkillsList");

  // peers
  const peerName = document.getElementById("peerName"); // No longer used for input, but might be legacy ref
  const peerEmailInput = document.getElementById("peerEmailInput");
  const addPeerBtn = document.getElementById("addPeerBtn");
  const peerList = document.getElementById("peerList");

  // charts
  const trendingCtx = document.getElementById("trendingChart").getContext("2d");

  const companyCtx = document.getElementById("companyChart").getContext("2d");
  const domainCanvas = document.getElementById("domainChart");
  const domainCtx = domainCanvas ? domainCanvas.getContext("2d") : null;

  // skill gap
  const gapChipsEl = document.getElementById("gapChips");
  const compareTableBody = document.querySelector("#compareTable tbody");

  // companies
  const companyList = document.getElementById("companyList");

  // resources
  const resourceGrid = document.getElementById("resourceGrid");
  const resourceModal = document.getElementById("resourceModal");
  const resPeerIndex = document.getElementById("resPeerIndex");
  const resSkill = document.getElementById("resSkill");
  const resTitle = document.getElementById("resTitle");
  const resURL = document.getElementById("resURL");
  const resNote = document.getElementById("resNote");
  const saveResourceBtn = document.getElementById("saveResourceBtn");
  const cancelResourceBtn = document.getElementById("cancelResourceBtn");

  // filters
  const resourceSearch = document.getElementById("resourceSearch");
  const filterSkill = document.getElementById("filterSkill");
  const filterPeer = document.getElementById("filterPeer");
  const resetFilters = document.getElementById("resetFilters");

  let trendingChart, companyChart, domainChart;

  // navigation
  function showPage(id) {
    pages.forEach(p => p.id === id ? p.classList.add("active") : p.classList.remove("active"));
    navBtns.forEach(b => b.dataset.page === id ? b.classList.add("active") : b.classList.remove("active"));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  navBtns.forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));

  // profile rendering
  function renderProfile() {
    if (!nameInput) return;
    nameInput.value = state.profile.name || "";
    metaInput.value = state.profile.meta || "";
    brandAvatar.src = state.profile.avatar || "";
    if (profileSummary) {
      profileSummary.innerHTML = `
        <img class="pfp" src="${state.profile.avatar || ''}" onerror="this.style.visibility='hidden'"/>
        <div>
          <strong>${escapeHtml(state.profile.name || "Your Name")}</strong>
          <div class="muted">${escapeHtml(state.profile.meta || "")}</div>
          <div style="margin-top:8px">Skills: ${(state.mySkills || []).length} • Peers: ${(state.peers || []).length}</div>
        </div>
      `;
    }
  }

  function renderMySkillsProfileCard() {
    if (mySkillsPfp) mySkillsPfp.src = state.profile.avatar || "";
    if (mySkillsName) mySkillsName.textContent = state.profile.name || "Your Name";
    if (mySkillsMeta) mySkillsMeta.textContent = state.profile.meta || "";
    if (mySkillsCompany) mySkillsCompany.textContent = state.profile.company || "";
    if (myCompanyInput && state.profile.company) myCompanyInput.value = state.profile.company;
  }

  // avatar handling
  avatarInput && avatarInput.addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.profile.avatar = reader.result;
      saveState();
      renderProfile();
      renderMySkillsProfileCard();
    };
    reader.readAsDataURL(file);
  });

  mySkillsPhotoInput && mySkillsPhotoInput.addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.profile.avatar = reader.result;
      saveState();
      renderProfile();
      renderMySkillsProfileCard();
    };
    reader.readAsDataURL(file);
  });

  mySkillsPfp && mySkillsPfp.addEventListener("click", () => mySkillsPhotoInput && mySkillsPhotoInput.click());
  mySkillsChangePhoto && mySkillsChangePhoto.addEventListener("click", () => mySkillsPhotoInput && mySkillsPhotoInput.click());
  changeAvatarBtn && changeAvatarBtn.addEventListener("click", () => avatarInput && avatarInput.click());

  mySkillsRemovePhoto && mySkillsRemovePhoto.addEventListener("click", () => {
    if (!confirm("Remove profile photo?")) return;
    state.profile.avatar = "";
    saveState();
    renderProfile();
    renderMySkillsProfileCard();
  });

  removeAvatarBtn && removeAvatarBtn.addEventListener("click", () => {
    if (!confirm("Remove profile photo?")) return;
    state.profile.avatar = "";
    saveState();
    renderProfile();
    renderMySkillsProfileCard();
  });

  saveProfileBtn && saveProfileBtn.addEventListener("click", () => {
    state.profile.name = nameInput.value.trim() || "You";
    state.profile.meta = metaInput.value.trim();
    saveState();
    renderProfile();
    renderMySkillsProfileCard();
    profileMsg.textContent = "Profile saved.";
    setTimeout(() => profileMsg.textContent = "", 1500);
    refreshAll();
  });

  // My Company handlers
  saveCompanyBtn && saveCompanyBtn.addEventListener("click", () => {
    state.profile.company = myCompanyInput.value.trim();
    saveState();
    renderMySkillsProfileCard();
    refreshAll();
  });

  removeCompanyBtn && removeCompanyBtn.addEventListener("click", () => {
    state.profile.company = "";
    myCompanyInput.value = "";
    saveState();
    renderMySkillsProfileCard();
    refreshAll();
  });

  // my skills
  function renderMySkills() {
    mySkillsList.innerHTML = "";
    (state.mySkills || []).forEach((s, idx) => {
      const li = document.createElement("li");
      li.textContent = s;
      li.dataset.idx = idx;
      li.title = "Click to remove";
      li.style.cursor = "pointer";
      li.addEventListener("click", () => {
        if (confirm(`Remove skill "${s}" from your profile?`)) {
          state.mySkills.splice(idx, 1);
          saveState();
          renderMySkills();
          refreshAll();
        }
      });
      mySkillsList.appendChild(li);
    });
  }

  addSkillBtn && addSkillBtn.addEventListener("click", () => {
    const raw = skillInput.value;
    if (!raw.trim()) return;
    const normalized = normalizeSkill(raw);
    if (!state.mySkills.includes(normalized)) {
      state.mySkills.push(normalized);
      saveState();
      skillInput.value = "";
      renderMySkills();
      refreshAll();
    } else {
      alert("You already have this skill.");
    }
  });

  // peers
  addPeerBtn && addPeerBtn.addEventListener("click", async () => {
    const email = peerEmailInput.value.trim();
    if (!email) { alert("Please enter an email"); return; }

    // Call API to search user
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!data) {
        alert("User not found via email/username.");
        return;
      }

      // Add to peer list
      const name = data.name || email;
      const skills = data.skills || [];
      const company = data.company || "";

      // Check duplicate?
      const exists = state.peers.some(p => p.name === name || (p.email && p.email === email)); // Simple check

      state.peers.push({ name, skills, company });
      saveState();

      peerEmailInput.value = "";
      renderPeerList();
      refreshAll();
      showPage("peers");

    } catch (e) {
      console.error(e);
      alert("Error searching user");
    }
  });

  function renderPeerList() {
    peerList.innerHTML = "";
    state.peers.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "peer-item";
      const name = p.name || `Peer ${i + 1}`;
      const skillsHtml = (p.skills || []).map(s => `<span style="display:inline-block;background:#eef2ff;padding:4px 8px;border-radius:6px;margin-right:6px">${escapeHtml(s)}</span>`).join("");
      div.innerHTML = `
        <div style="flex:0 0 auto; width:44px; height:44px; border-radius:8px; background:#f3f6fb; display:flex;align-items:center;justify-content:center;color:#0f172a;font-weight:600">
          ${(name[0] || 'P').toUpperCase()}
        </div>
        <div style="flex:1">
          <strong>${escapeHtml(name)}</strong>
          <div class="peer-meta">${escapeHtml(p.company || '')}</div>
          <div style="margin-top:8px">${skillsHtml}</div>
        </div>
        <div style="flex:0 0 auto; display:flex; flex-direction:column; gap:8px">
          <div style="display:flex; gap:8px;">
            <button data-i="${i}" class="recommendResourceBtn action secondary">Recommend Resource</button>
            <button data-i="${i}" class="removePeerBtn secondary">Remove</button>
          </div>
        </div>
      `;
      peerList.appendChild(div);
    });

    document.querySelectorAll(".recommendResourceBtn").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const i = parseInt(ev.target.dataset.i, 10);
        resPeerIndex.value = i;
        // populate skill dropdown with peer skills
        const skills = (state.peers[i].skills || []).slice();
        resSkill.innerHTML = "<option value=''>(any skill)</option>" + skills.map(s => `<option>${escapeHtml(s)}</option>`).join("");
        resTitle.value = "";
        resURL.value = "";
        resNote.value = "";
        resourceModal.style.display = "flex";
      });
    });

    document.querySelectorAll(".removePeerBtn").forEach(btn => btn.addEventListener("click", (ev) => {
      const i = parseInt(ev.target.dataset.i, 10);
      if (confirm("Remove this peer entry?")) {
        // remove any resources authored by this peer index
        state.resources = (state.resources || []).filter(r => r.peerIndex !== i);
        // adjust peerIndex on resources greater than i
        state.resources.forEach(r => { if (r.peerIndex > i) r.peerIndex = r.peerIndex - 1; });
        state.peers.splice(i, 1);
        saveState();
        renderPeerList();
        refreshAll();
      }
    }));
  }

  // charts & analytics
  function initCharts() {
    if (trendingChart) trendingChart.destroy();
    if (companyChart) companyChart.destroy();
    if (domainChart) domainChart.destroy();

    trendingChart = new Chart(trendingCtx, {
      type: "bar",
      data: { labels: [], datasets: [{ label: "Student Count", data: [], backgroundColor: Array(10).fill('#0f62fe') }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });



    companyChart = new Chart(companyCtx, {
      type: "bar",
      data: { labels: [], datasets: [{ label: "Internship Count", data: [], backgroundColor: '#0f62fe' }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    if (domainCtx) {
      domainChart = new Chart(domainCtx, {
        type: "doughnut",
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#0f62fe', '#60a5fa', '#93c5fd', '#bfdbfe', '#e6f0ff', '#fde68a', '#fca5a5'] }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, padding: 8 } }
          }
        }
      });
    }
  }

  function refreshCharts() {
    // Trending
    const counts = aggregateSkillCounts();
    const top = topNFromCounts(counts, 10);
    trendingChart.data.labels = top.map(t => t[0]);
    trendingChart.data.datasets[0].data = top.map(t => t[1]);
    trendingChart.update();

    // timeline
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    timelineChart.data.labels = months;
    const trend = months.map((m, idx) => {
      const weight = top.reduce((acc, t) => acc + t[1], 0);
      return Math.max(1, Math.round(weight * (0.3 + idx * 0.15)));
    });
    timelineChart.data.datasets[0].data = trend;
    timelineChart.update();

    // Companies - only non-empty companies counted
    const compCounts = {};
    state.peers.forEach(p => {
      const c = (p.company || "").toString().trim();
      if (!c) return;
      compCounts[c] = (compCounts[c] || 0) + 1;
    });
    const compTop = Object.entries(compCounts).sort((a, b) => b[1] - a[1]);
    companyChart.data.labels = compTop.map(c => c[0]);
    companyChart.data.datasets[0].data = compTop.map(c => c[1]);
    companyChart.update();

    // Company donut
    if (domainChart) {
      domainChart.data.labels = compTop.map(c => c[0]);
      domainChart.data.datasets[0].data = compTop.map(c => c[1]);
      domainChart.update();
    }

    // Company list UI
    companyList.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "company-cards";
    Object.entries(compCounts).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
      const el = document.createElement("div");
      el.className = "company-card";
      const initials = (c.split(/\s+/).map(s => s[0] || '').slice(0, 2).join('')).toUpperCase();
      el.innerHTML = `<div class="company-avatar">${escapeHtml(initials || 'U')}</div>
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(c)}</div>
          <div style="font-size:13px;color:var(--muted)">${n} interns</div>
        </div>
      `;
      wrapper.appendChild(el);
    });
    if (wrapper.children.length === 0) {
      companyList.innerHTML = '<div class="muted">No company data available. Add company names to peer entries to populate internship trends.</div>';
    } else companyList.appendChild(wrapper);
  }

  // Skill gap
  function computeGap() {
    const counts = aggregateSkillCounts();
    const userSet = new Set((state.mySkills || []).map(s => normalizeSkill(s)));
    const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const gap = arr.filter(([skill]) => !userSet.has(skill));
    return { all: arr, gap };
  }

  function renderGap() {
    const { all, gap } = computeGap();
    gapChipsEl.innerHTML = "";
    gap.slice(0, 20).forEach(([skill, count]) => {
      const chip = document.createElement("div");
      chip.className = "gap-chip";
      chip.innerHTML = `<div style="font-weight:600">${escapeHtml(skill)}</div><small>${count}</small>`;
      chip.addEventListener("click", () => {
        if (confirm(`Add "${skill}" to your skills?`)) {
          state.mySkills.push(skill);
          saveState();
          renderMySkills();
          renderGap();
          refreshCharts();
        }
      });
      gapChipsEl.appendChild(chip);
    });

    compareTableBody.innerHTML = "";
    all.forEach(([skill, count]) => {
      const tr = document.createElement("tr");
      const have = state.mySkills.includes(skill) ? "Yes" : "No";
      tr.innerHTML = `<td>${escapeHtml(skill)}</td><td>${count}</td><td>${have}</td>`;
      compareTableBody.appendChild(tr);
    });
  }

  // Resources rendering & filters
  function populateFilters() {
    // skills and peers that have resources
    const skillsSet = new Set();
    const peersSet = new Set();
    (state.resources || []).forEach(r => {
      if (r.skill) skillsSet.add(r.skill);
      if (r.author) peersSet.add(r.author);
    });

    // also include all peer names for peer filter
    state.peers.forEach((p, i) => {
      if (p.name) peersSet.add(p.name);
    });

    filterSkill.innerHTML = '<option value="">All Skills</option>' + Array.from(skillsSet).sort().map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    filterPeer.innerHTML = '<option value="">All Peers</option>' + Array.from(peersSet).sort().map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  }

  function renderResources() {
    populateFilters();
    const q = (resourceSearch.value || "").trim().toLowerCase();
    const skillF = filterSkill.value;
    const peerF = filterPeer.value;

    const list = (state.resources || []).slice().reverse().filter(r => {
      if (skillF && r.skill !== skillF) return false;
      if (peerF && r.author !== peerF) return false;
      if (!q) return true;
      const hay = `${r.title} ${r.skill} ${r.author} ${r.note}`.toLowerCase();
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

    list.forEach(r => {
      const card = document.createElement("div");
      card.className = "resource-card";
      card.innerHTML = `
        <div class="meta">
          <div>
            <div class="title">${escapeHtml(r.title || r.url)}</div>
            <div class="small">by ${escapeHtml(r.author || "Peer")} • recommended for <strong>${escapeHtml(r.skill || "General")}</strong></div>
          </div>
          <div style="text-align:right">
            <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">Open</a>
          </div>
        </div>
        ${r.note ? `<div class="note">${escapeHtml(r.note)}</div>` : ""}
      `;
      resourceGrid.appendChild(card);
    });
  }

  // resource modal handlers
  saveResourceBtn.addEventListener("click", () => {
    const i = parseInt(resPeerIndex.value, 10);
    const title = resTitle.value.trim();
    const url = resURL.value.trim();
    const note = resNote.value.trim();
    const skill = resSkill.value || "";

    if (!url) { alert("Please add a URL."); return; }

    const author = (state.peers[i] && state.peers[i].name) ? state.peers[i].name : `Peer ${i + 1}`;
    const resource = { title: title || url, url, note, skill, author, peerIndex: i, created: Date.now() };
    state.resources = state.resources || [];
    state.resources.push(resource);
    saveState();
    renderResources();
    resourceModal.style.display = "none";
    showPage("resources");
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
    renderProfile();
    renderMySkills();
    renderMySkillsProfileCard();
    renderPeerList();
    renderGap();
    refreshCharts();
    renderResources();
  }

  function renderAll() {
    renderProfile();
    renderMySkills();
    renderPeerList();
    initCharts();
    refreshAll();
  }

  // auth
  const authScreen = document.getElementById("authScreen");
  const authTitle = document.getElementById("authTitle");
  const authForm = document.getElementById("authForm");
  const authUsername = document.getElementById("authUsername");
  const authPassword = document.getElementById("authPassword");
  const authSwitch = document.getElementById("authSwitch");
  const authMsg = document.getElementById("authMsg");
  const appContainer = document.querySelector(".app");

  let isRegistering = false;
  let currentUser = localStorage.getItem("psi_user");
  let currentUserId = localStorage.getItem("psi_user_id");

  authSwitch.addEventListener("click", () => {
    isRegistering = !isRegistering;
    authTitle.textContent = isRegistering ? "Register" : "Login";
    authSwitch.textContent = isRegistering ? "Have an account? Login" : "Don't have an account? Register";
    authMsg.textContent = "";
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("psi_user");
    localStorage.removeItem("psi_user_id");
    location.reload();
  });

  authForm.addEventListener("submit", async () => {
    authMsg.textContent = "";
    const username = authUsername.value.trim();
    const password = authPassword.value.trim();
    if (!username || !password) return;

    // Email validation
    // Format: Starts with "01fe", ends with "@kletech.ac.in"
    const emailRegex = /^01fe.*@kletech\.ac\.in$/;
    if (!emailRegex.test(username)) {
      authMsg.textContent = "Email must start with '01fe' and end with '@kletech.ac.in'";
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
        // Switch to login
        alert("Registration successful! Please login.");
        isRegistering = false;
        authTitle.textContent = "Login";
        authSwitch.textContent = "Don't have an account? Register";
        authPassword.value = "";
      } else {
        // Login success
        currentUser = data.username;
        currentUserId = data.userId;
        localStorage.setItem("psi_user", currentUser);
        localStorage.setItem("psi_user_id", currentUserId);
        showApp();
      }
    } catch (e) {
      console.error("Auth Request Error:", e);
      authMsg.textContent = "Network error: " + e.message;
    }
  });

  function showApp() {
    authScreen.style.display = "none";
    appContainer.classList.add("active");
    loadState().then(() => {
      renderAll();
      if (state.profile.avatar) brandAvatar.src = state.profile.avatar;
    });
  }

  // init
  document.addEventListener("DOMContentLoaded", async () => {
    // Check if logged in
    if (currentUser && currentUserId) {
      showApp();
    } else {
      // Ensure auth screen is visible
      authScreen.style.display = "flex";
      appContainer.classList.remove("active");
    }
    // Else show auth screen (default)

    // close modal on clicking outside
    resourceModal.addEventListener("click", (e) => {
      if (e.target === resourceModal) resourceModal.style.display = "none";
    });

    window.addEventListener('resize', () => {
      if (trendingChart) trendingChart.resize();

      if (companyChart) companyChart.resize();
      if (domainChart) domainChart.resize();
    });
  });

  // expose showPage
  window.showPage = (id) => showPage(id);

})();
