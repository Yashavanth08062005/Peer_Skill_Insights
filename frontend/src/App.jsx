import { useState, useEffect } from 'react';
import './index.css';
import Dashboard from './Dashboard';
import MySkills from './MySkills';
import Peers from './Peers';
import SkillGap from './SkillGap';
import Resources from './Resources';
import Profile from './Profile';

function App() {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState(null);
  const [view, setView] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [authMsg, setAuthMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedId = localStorage.getItem('psi_user_id');
    const savedName = localStorage.getItem('psi_username');
    const savedTheme = localStorage.getItem('psi_theme') || 'dark';

    if (savedId) {
      setUser({ id: savedId, username: savedName });
    }
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');

  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('psi_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
  };

  // Fetch App State when user is logged in
  useEffect(() => {
    if (user && user.id) {
      // ... (rest of fetch logic from original file)
      fetch(`/api/state/${user.id}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to load state');
        })
        .then(data => {
          // ... normalization ...
          if (!data.mySkills) data.mySkills = [];
          data.mySkills = data.mySkills.map(s => {
            if (typeof s === 'string') return { skill: s, company: "" };
            return s;
          });

          if (!data.profile.companies) {
            data.profile.companies = data.profile.companies || [];
            if (data.profile.company && data.profile.companies.length === 0) {
              data.profile.companies.push(data.profile.company);
            }
          }
          setAppState(data);
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  // ... (handleLogin, handleRegister, handleLogout)
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthMsg('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      const data = await res.json();
      if (res.ok) {
        // Fix: normalize user object to match useEffect expectation (id property)
        setUser({ ...data, id: data.userId });
        localStorage.setItem('psi_user_id', data.userId);
        localStorage.setItem('psi_username', data.username);
        setAuthMsg('');
      } else {
        setAuthMsg(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthMsg('Server error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthMsg('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthMsg('Registration successful! Please login.');
        setAuthMode('login');
      } else {
        setAuthMsg(data.error || 'Registration failed');
      }
    } catch (err) {
      setAuthMsg('Server error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('psi_user_id');
    localStorage.removeItem('psi_username');
    setEmail('');
    setPassword('');
  };

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div style={{ marginTop: 12 }}>
              <button type="submit" className="action" style={{ width: '100%' }}>
                {authMode === 'login' ? 'Login' : 'Register'}
              </button>
            </div>
            {authMsg && <div className="auth-msg">{authMsg}</div>}
            <div
              className="auth-switch"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthMsg('');
              }}
            >
              {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand" style={{ justifyContent: 'space-between' }}>
          <h1>Peer Skill Insights</h1>
          <button onClick={toggleTheme} style={{ background: 'transparent', border: '1px solid var(--sidebar-text)', color: 'var(--sidebar-text)', borderRadius: '50%', width: 24, height: 24, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }} title="Toggle Theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
        <div className="nav-vertical">
          <button
            className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${view === 'myskills' ? 'active' : ''}`}
            onClick={() => setView('myskills')}
          >
            My Skills
          </button>
          <button
            className={`nav-btn ${view === 'skillgap' ? 'active' : ''}`}
            onClick={() => setView('skillgap')}
          >
            Skill Gap
          </button>
          <button
            className={`nav-btn ${view === 'peers' ? 'active' : ''}`}
            onClick={() => setView('peers')}
          >
            Peers
          </button>
          <button
            className={`nav-btn ${view === 'resources' ? 'active' : ''}`}
            onClick={() => setView('resources')}
          >
            Resources
          </button>
          <button
            className={`nav-btn ${view === 'profile' ? 'active' : ''}`}
            onClick={() => setView('profile')}
          >
            Profile
          </button>
        </div>
        <div className="sidebar-footer">
          <button className="nav-btn logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="main-content-wrapper">
        <header className="topbar-context">
          <div className="context-title">
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </div>
          <div className="user-pill">
            <span>{user.username}</span>
          </div>
        </header>

        <main className="main">
          {view === 'dashboard' && <Dashboard state={appState} />}

          {view === 'myskills' && (
            <MySkills
              state={appState}
              userId={user.id}
              refreshState={() => {
                // Re-fetch logic
                fetch(`/api/state/${user.id}`)
                  .then(res => res.json())
                  .then(data => {
                    if (!data.mySkills) data.mySkills = [];
                    data.mySkills = data.mySkills.map(s => {
                      if (typeof s === 'string') return { skill: s, company: "" };
                      return s;
                    });
                    if (!data.profile.companies) {
                      data.profile.companies = data.profile.companies || [];
                      if (data.profile.company && data.profile.companies.length === 0) {
                        data.profile.companies.push(data.profile.company);
                      }
                    }
                    setAppState(data);
                  });
              }}
            />
          )}

          {view === 'peers' && (
            <Peers
              state={appState}
              userId={user.id}
              refreshState={() => {
                fetch(`/api/state/${user.id}`)
                  .then(res => res.json())
                  .then(data => {
                    if (!data.mySkills) data.mySkills = [];
                    data.mySkills = data.mySkills.map(s => {
                      if (typeof s === 'string') return { skill: s, company: "" };
                      return s;
                    });
                    if (!data.profile.companies) {
                      data.profile.companies = data.profile.companies || [];
                      if (data.profile.company && data.profile.companies.length === 0) {
                        data.profile.companies.push(data.profile.company);
                      }
                    }
                    setAppState(data);
                  });
              }}
              setView={setView}
            />
          )}

          {view === 'skillgap' && <SkillGap state={appState} />}

          {view === 'resources' && (
            <Resources
              state={appState}
              userId={user.id}
              refreshState={() => { /* re-fetch if needed */ }}
            />
          )}

          {view === 'profile' && (
            <Profile
              state={appState}
              userId={user.id}
              refreshState={() => { /* re-fetch handled by parent if needed, but passing same signature */
                fetch(`/api/state/${user.id}`)
                  .then(res => res.json())
                  .then(data => {
                    if (!data.mySkills) data.mySkills = [];
                    data.mySkills = data.mySkills.map(s => {
                      if (typeof s === 'string') return { skill: s, company: "" };
                      return s;
                    });
                    if (!data.profile.companies) {
                      data.profile.companies = data.profile.companies || [];
                      if (data.profile.company && data.profile.companies.length === 0) {
                        data.profile.companies.push(data.profile.company);
                      }
                    }
                    setAppState(data);
                  });
              }}
            />
          )}

          {view !== 'dashboard' && view !== 'myskills' && view !== 'peers' && view !== 'skillgap' && view !== 'resources' && view !== 'profile' && (
            <div className="page active">
              <h2>{view.charAt(0).toUpperCase() + view.slice(1)} Section</h2>
              <div className="card">
                <h3>Currently under construction</h3>
                <p>We are moving to React! This page will be ready soon.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
