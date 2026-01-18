import { useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const normalizeSkill = (s) => s.trim().toLowerCase();

function Dashboard({ state }) {
    if (!state) return <div>Loading data...</div>;

    // 1. Prepare Trending Data
    const skillCounts = {};

    // My Skills
    (state.mySkills || []).forEach(s => {
        const name = typeof s === 'object' ? s.skill : s;
        if (name) {
            const n = normalizeSkill(name);
            skillCounts[n] = (skillCounts[n] || 0) + 1;
        }
    });

    // Peer Skills
    (state.peers || []).forEach(p => {
        if (p.skills && Array.isArray(p.skills)) {
            p.skills.forEach(s => {
                const n = normalizeSkill(s);
                skillCounts[n] = (skillCounts[n] || 0) + 1;
            });
        }
    });

    const sortedSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8

    const trendingData = {
        labels: sortedSkills.map(i => i[0]),
        datasets: [{
            label: 'Skill Frequency (Network)',
            data: sortedSkills.map(i => i[1]),
            backgroundColor: '#00ED64',
            borderRadius: 4,
        }]
    };

    const trendingOptions = {
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
    };

    // 2. Prepare Company Data
    const compMap = {};

    // My Companies (from Skills)
    (state.mySkills || []).forEach(s => {
        const c = typeof s === 'object' ? s.company : "";
        if (c) {
            compMap[c] = (compMap[c] || 0) + 1;
        }
    });

    // Peer Companies
    (state.peers || []).forEach(p => {
        let companies = [];
        const raw = p.company;

        if (Array.isArray(raw)) {
            companies = raw;
        } else if (typeof raw === 'string') {
            const trimmed = raw.trim();
            // Check if it's a JSON array string
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) companies = parsed;
                } catch (e) {
                    companies = [trimmed];
                }
            } else if (trimmed) {
                // Single company string
                companies = [trimmed];
            }
        }

        companies.forEach(c => {
            if (c && c !== "Student") { // Filter out potential default/placeholder
                compMap[c] = (compMap[c] || 0) + 1;
            }
        });
    });

    const companyData = {
        labels: Object.keys(compMap),
        datasets: [{
            label: 'Skill Count by Company',
            data: Object.values(compMap),
            backgroundColor: '#0ea5e9'
        }]
    };

    return (
        <section className="page active">
            <h2>Dashboard</h2>
            <div className="grid">
                <div className="card">
                    <h3>Trending Skills</h3>
                    <div className="chart-container" style={{ height: 300 }}>
                        {sortedSkills.length > 0 ? (
                            <Bar data={trendingData} options={trendingOptions} />
                        ) : (
                            <div className="muted">No skills in network yet.</div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3>Top Companies (Internships)</h3>
                    <div className="chart-container" style={{ height: 300 }}>
                        {Object.keys(compMap).length > 0 ? (
                            <Bar data={companyData} options={{ responsive: true, maintainAspectRatio: false }} />
                        ) : (
                            <div className="muted">Add companies to see stats.</div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Dashboard;
