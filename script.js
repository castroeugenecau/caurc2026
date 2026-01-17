const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let currentPage = 0;
let displayTimer = null;

async function init() {
    // Start clock immediately
    updateTime();
    setInterval(updateTime, 1000);

    // Initial data fetch
    await refreshData();
    // Refresh data every 30 seconds
    setInterval(refreshData, 30000); 
}

function updateTime() {
    const timeEl = document.getElementById('sync-time');
    if (timeEl) {
        const now = new Date();
        timeEl.innerText = "LAST SYNC: " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

async function refreshData() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== '').slice(1);
        
        masterData = rows.map(row => {
            const c = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(f => f.replace(/^"|"$/g, '').trim());
            return {
                category: c[1] || "", level: c[2] || "", team: c[3] || "Unknown", score: c[4] || "0", rank: parseInt(c[5]) || 99
            };
        });

        const active = document.querySelector('.nav-item.active');
        if (active) updateDashboard(active.dataset.cat, active.dataset.lvl);
    } catch (err) { 
        console.error("Sync Error:", err);
        document.getElementById('sync-time').innerText = "CONNECTION LOST - RETRYING...";
    }
}

function updateDashboard(cat, lvl) {
    const dashboardBody = document.getElementById('dashboard-body');
    const podium = document.getElementById('podium');

    if (cat === "Mini Sumo") {
        if (displayTimer) clearInterval(displayTimer);
        podium.style.display = 'none';
        dashboardBody.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center glass-card">
                <i class="fas fa-user-ninja text-9xl text-[#d4af37] mb-6 animate-bounce"></i>
                <h2 class="text-7xl font-black uppercase">Mini Sumo</h2>
                <p class="text-3xl text-gray-500 tracking-[0.4em] uppercase">Data Integration Pending</p>
            </div>`;
        return;
    }

    podium.style.display = 'grid';
    const filtered = masterData.filter(item => 
        item.category.trim() === cat.trim() && item.level.toString().trim() === lvl.toString().trim()
    ).sort((a, b) => a.rank - b.rank);

    renderPagedUI(filtered, cat, lvl);
}

function renderPagedUI(data, cat, lvl) {
    const podium = document.getElementById('podium');
    const smallList = document.getElementById('team-list-small');
    const tableBody = document.getElementById('full-table-body');
    
    if (displayTimer) clearInterval(displayTimer);
    podium.innerHTML = ''; 

    if (data.length === 0) return;

// 1. HORIZONTAL PODIUM (Top 3)
    data.slice(0, 3).forEach(team => {
        let theme = "";
        let icon = "";
        let color = "";

        if (team.rank === 1) {
            theme = "gold"; icon = "fa-crown"; color = "#d4af37";
        } else if (team.rank === 2) {
            theme = "silver"; icon = "fa-medal"; color = "#c0c0c0";
        } else {
            theme = "bronze"; icon = "fa-award"; color = "#cd7f32";
        }

        podium.innerHTML += `
            <div class="podium-card ${theme}">
                <div class="podium-left">
                    <i class="fas ${icon} trophy-icon" style="color: ${color}"></i>
                    <span class="text-2xl font-black italic" style="color: ${color}">#${team.rank}</span>
                </div>
                
                <div class="podium-right">
                    <h3 class="podium-team-name">${team.team}</h3>
                    <div class="podium-score-wrap">
                        <span class="podium-score" style="color: ${color}">${team.score}</span>
                        <span class="score-label">Points</span>
                    </div>
                </div>
            </div>`;
    });

    // 2. DATA Slicing Logic
    let challengerLimit = (lvl === "1") ? 15 : (cat === "Pick and Place" ? 5 : 4);
    const challengersData = data.slice(3, challengerLimit);
    const completeData = data; 

    const perPageLeft = 4;   // 4 teams per page
    const perPageRight = 5;  // 5 teams per page

    function rotatePage() {
        // Exit animation
        [smallList, tableBody].forEach(el => {
            if(el) { el.style.opacity = '0'; el.style.transform = 'translateX(-20px)'; }
        });

        setTimeout(() => {
            // Slicing
            const leftIdx = (currentPage * perPageLeft) % (challengersData.length || 1);
            const leftItems = challengersData.slice(leftIdx, leftIdx + perPageLeft);
            
            const rightIdx = (currentPage * perPageRight) % (completeData.length || 1);
            const rightItems = completeData.slice(rightIdx, rightIdx + perPageRight);

            // Render Left (4 items)
            smallList.innerHTML = leftItems.map(team => `
                <div class="challenger-row">
                    <div class="flex items-center gap-8">
                        <span class="challenger-rank">#${team.rank}</span>
                        <span class="challenger-name truncate w-[400px]">${team.team}</span>
                    </div>
                    <span class="challenger-score">${team.score}</span>
                </div>
            `).join('') || `<p class="text-gray-500 p-6 text-2xl">Finals in Progress...</p>`;

            // Render Right (5 items)
            tableBody.innerHTML = rightItems.map(team => `
                <tr>
                    <td class="rank-col">#${team.rank}</td>
                    <td class="truncate max-w-[320px] text-white font-bold">${team.team}</td>
                    <td class="text-right score-col text-white font-black">${team.score}</td>
                </tr>
            `).join('');

            // Entry animation
            [smallList, tableBody].forEach(el => {
                if(el) { el.style.opacity = '1'; el.style.transform = 'translateX(0)'; }
            });

            currentPage++;
        }, 600);
    }

    currentPage = 0;
    rotatePage();
    displayTimer = setInterval(rotatePage, 5600); // 5s pause + 0.6s anim
}

// Nav Listeners
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        updateDashboard(this.dataset.cat, this.dataset.lvl);
    });
});

init();