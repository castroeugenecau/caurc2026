const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let sideScrollInterval = null;
let tableScrollInterval = null;

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
        updateDashboard(active.dataset.cat, active.dataset.lvl);
        document.getElementById('sync-time').innerText = "LIVE: " + new Date().toLocaleTimeString();
    } catch (err) { console.error("Sync Error", err); }
}

function updateDashboard(cat, lvl) {
    const dashboardBody = document.getElementById('dashboard-body');
    const podium = document.getElementById('podium');

    if (cat === "Mini Sumo") {
        podium.style.display = 'none';
        dashboardBody.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center glass-card">
                <i class="fas fa-user-ninja text-9xl text-[#d4af37] mb-6 animate-bounce"></i>
                <h2 class="text-7xl font-black">MINI SUMO</h2>
                <p class="text-3xl text-gray-500 tracking-[0.4em] uppercase">Data Integration Pending</p>
            </div>`;
        return;
    }

    // Restore standard structure if coming back from Sumo
    podium.style.display = 'grid';
    if (!document.getElementById('team-list-small')) location.reload();

    const filtered = masterData.filter(item => 
        item.category.trim() === cat.trim() && item.level.toString().trim() === lvl.toString().trim()
    ).sort((a, b) => a.rank - b.rank);

    renderUI(filtered, cat, lvl);
}

function renderUI(data, cat, lvl) {
    const podium = document.getElementById('podium');
    const smallList = document.getElementById('team-list-small');
    const fullTableBody = document.getElementById('full-table-body');
    const fullTableContainer = document.getElementById('full-table-container');
    
    clearInterval(sideScrollInterval); clearInterval(tableScrollInterval);
    podium.innerHTML = ''; smallList.innerHTML = ''; fullTableBody.innerHTML = '';

    if (data.length === 0) return;

    // 1. PODIUM (1-3)
    data.slice(0, 3).forEach(team => {
        const color = team.rank === 1 ? '#d4af37' : (team.rank === 2 ? '#c0c0c0' : '#cd7f32');
        podium.innerHTML += `
            <div class="podium-card ${team.rank === 1 ? 'gold' : ''}">
                <span class="text-xl font-black" style="color: ${color}">RANK ${team.rank}</span>
                <h3 class="text-5xl font-black truncate text-white">${team.team}</h3>
                <p class="text-7xl font-black" style="color: ${color}">${team.score}</p>
            </div>`;
    });

    // 2. NEXT CHALLENGERS (Based on your custom rules)
    let nextLimit = 4; // Default for Levels 2/3
    if (lvl === "1") nextLimit = 15;
    else if (cat === "Pick and Place") nextLimit = 5;

    let secondary = data.slice(3, nextLimit);
    smallList.innerHTML = secondary.map(team => `
        <div class="challenger-row">
            <div class="flex items-center gap-8">
                <span class="text-[#d4af37] text-5xl font-black italic">#${team.rank}</span>
                <span class="font-black text-3xl truncate w-64">${team.team}</span>
            </div>
            <span class="bg-blue-600 px-8 py-2 rounded-2xl text-4xl font-black">${team.score}</span>
        </div>
    `).join('');

    // 3. COMPLETE LIST
    fullTableBody.innerHTML = data.map(team => `
        <tr>
            <td class="font-black text-[#d4af37] italic">#${team.rank}</td>
            <td>${team.team}</td>
            <td class="text-right text-5xl text-white font-black">${team.score}</td>
        </tr>
    `).join('');

    sideScrollInterval = startAutoScroll(smallList, 50);
    tableScrollInterval = startAutoScroll(fullTableContainer, 70);
}

function startAutoScroll(container, speed) {
    let scrollPos = 0;
    return setInterval(() => {
        scrollPos += 1;
        if (scrollPos >= container.scrollHeight - container.clientHeight) scrollPos = -100;
        container.scrollTop = scrollPos;
    }, speed);
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        updateDashboard(this.dataset.cat, this.dataset.lvl);
    });
});

init();