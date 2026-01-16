const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let currentPage = 0;
let displayTimer = null;

async function init() {
    await refreshData();
    setInterval(refreshData, 30000); 
}

async function refreshData() {
    try {
        const response = await fetch(CSV_URL);
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
    } catch (err) { console.error("Sync Error", err); }
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

    // 1. PODIUM
    data.slice(0, 3).forEach(team => {
        const color = team.rank === 1 ? '#d4af37' : (team.rank === 2 ? '#c0c0c0' : '#cd7f32');
        podium.innerHTML += `
            <div class="podium-card ${team.rank === 1 ? 'gold' : ''}">
                <span class="text-xl font-black" style="color: ${color}">RANK ${team.rank}</span>
                <h3 class="text-4xl font-black truncate text-white">${team.team}</h3>
                <p class="text-6xl font-black" style="color: ${color}">${team.score}</p>
            </div>`;
    });

    // 2. DATA CONFIGURATION
    let challengerLimit = (lvl === "1") ? 15 : (cat === "Pick and Place" ? 5 : 4);
    const challengersData = data.slice(3, challengerLimit);
    const completeData = data; 

    const perPageLeft = 4;   // Fixed 4 for Challengers
    const perPageRight = 5;  // Fixed 5 for Complete Standings

    function rotatePage() {
        [smallList, tableBody].forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-20px)';
        });

        setTimeout(() => {
            const leftIdx = (currentPage * perPageLeft) % (challengersData.length || 1);
            const leftItems = challengersData.slice(leftIdx, leftIdx + perPageLeft);
            
            const rightIdx = (currentPage * perPageRight) % (completeData.length || 1);
            const rightItems = completeData.slice(rightIdx, rightIdx + perPageRight);

            smallList.innerHTML = leftItems.map(team => `
                <div class="challenger-row">
                    <div class="flex items-center gap-8">
                        <span class="challenger-rank">#${team.rank}</span>
                        <span class="challenger-name truncate w-[420px]">${team.team}</span>
                    </div>
                    <span class="challenger-score shadow-xl">${team.score}</span>
                </div>
            `).join('') || `<p class="text-gray-500 italic p-6 text-2xl">Awaiting Qualifiers...</p>`;

            tableBody.innerHTML = rightItems.map(team => `
                <tr>
                    <td class="rank-col">#${team.rank}</td>
                    <td class="truncate max-w-[320px] text-white font-bold">${team.team}</td>
                    <td class="text-right score-col text-white font-black">${team.score}</td>
                </tr>
            `).join('');

            [smallList, tableBody].forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            });

            currentPage++;
        }, 600);
    }

    currentPage = 0;
    rotatePage();
    displayTimer = setInterval(rotatePage, 5600); 
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