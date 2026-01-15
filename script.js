const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let myChart = null;
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
        document.getElementById('sync-time').innerText = "LIVE • " + new Date().toLocaleTimeString();
    } catch (err) { console.error("Sync Error", err); }
}

function updateDashboard(cat, lvl) {
    const filtered = masterData.filter(item => 
        item.category.trim() === cat.trim() && item.level.toString().trim() === lvl.toString().trim()
    ).sort((a, b) => a.rank - b.rank);

    document.getElementById('display-category').innerText = cat;
    document.getElementById('display-level').innerText = "Level " + lvl;
    renderUI(filtered, lvl);
}

function renderUI(data, currentLevel) {
    const podium = document.getElementById('podium');
    const smallList = document.getElementById('team-list-small');
    const fullTableBody = document.getElementById('full-table-body');
    const fullTableContainer = document.getElementById('full-table-container');
    
    podium.innerHTML = ''; smallList.innerHTML = ''; fullTableBody.innerHTML = '';
    clearInterval(sideScrollInterval); clearInterval(tableScrollInterval);

    if (data.length === 0) {
        podium.innerHTML = `<div class="col-span-3 text-center text-gray-600 py-10 italic">Data Pending...</div>`;
        return;
    }

    // 1. Podium
    const themes = { 1: { class: 'gold', label: '1ST', color: '#ffd700' }, 2: { class: 'silver', label: '2ND', color: '#c0c0c0' }, 3: { class: 'bronze', label: '3RD', color: '#cd7f32' } };
    data.slice(0, 3).forEach(team => {
        const t = themes[team.rank] || { class: '', label: 'RANK ' + team.rank, color: '#6b7280' };
        podium.innerHTML += `<div class="podium-card ${t.class}"><div class="rank-badge" style="color: ${t.color}">${t.label}</div><h3 class="text-lg font-bold truncate">${team.team}</h3><p class="text-2xl font-black" style="color: ${t.color}">${team.score}</p></div>`;
    });

    // 2. Secondary List Logic
    let secondary = currentLevel === "1" ? data.slice(3, 15) : (currentLevel === "2" ? data.slice(3, 4) : data.slice(3, 6));
    smallList.innerHTML = secondary.map(team => `<div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 mb-2"><div class="flex gap-3 items-center"><span class="text-gray-600 text-xs font-bold">#${team.rank}</span><span class="text-gray-300 text-xs truncate w-24">${team.team}</span></div><span class="text-blue-500 font-bold text-xs">${team.score}</span></div>`).join('');
    
    if (currentLevel === "1") sideScrollInterval = startAutoScroll(smallList, 50);

    // 3. Full Table Logic
    fullTableBody.innerHTML = data.map(team => `<tr class="border-t border-white/5"><td class="p-3 font-bold text-blue-500 text-xs">#${team.rank}</td><td class="p-3 text-gray-400 text-xs">${team.team}</td><td class="p-3 text-right font-mono text-white text-xs">${team.score}</td></tr>`).join('');
    tableScrollInterval = startAutoScroll(fullTableContainer, 60);

    renderChart(data.slice(0, currentLevel === "1" ? 15 : 5));
}

function startAutoScroll(container, speed) {
    let scrollPos = 0;
    return setInterval(() => {
        scrollPos += 0.5;
        if (scrollPos >= container.scrollHeight - container.clientHeight) scrollPos = -30;
        container.scrollTop = scrollPos;
    }, speed);
}

function renderChart(teams) {
    const ctx = document.getElementById('leaderboardChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: teams.map(t => t.team), datasets: [{ data: teams.map(t => parseFloat(t.score) || 0), backgroundColor: 'rgba(37, 99, 235, 0.4)', borderColor: '#2563eb', borderWidth: 1.5, borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#4b5563', font: { size: 8 } } }, x: { grid: { display: false }, ticks: { color: '#4b5563', font: { size: 8 } } } } }
    });
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        updateDashboard(this.dataset.cat, this.dataset.lvl);
    });
});

init();