const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let currentPage = 0;
let displayTimer = null;

async function init() {
    await refreshData();
    setInterval(refreshData, 30000); // Check for fresh scores every 30s
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
                <p class="text-3xl text-gray-500 tracking-[0.4em] uppercase">Tournament Data Pending</p>
            </div>`;
        return;
    }

    // Restore standard structure if coming back from Sumo
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

    if (data.length === 0) {
        smallList.innerHTML = `<p class="text-2xl text-gray-500 p-6">No data available for this category.</p>`;
        return;
    }

    // 1. STATIC PODIUM (Top 3 always visible)
    data.slice(0, 3).forEach(team => {
        const color = team.rank === 1 ? '#d4af37' : (team.rank === 2 ? '#c0c0c0' : '#cd7f32');
        podium.innerHTML += `
            <div class="podium-card ${team.rank === 1 ? 'gold' : ''}">
                <span class="text-xl font-black" style="color: ${color}">RANK ${team.rank}</span>
                <h3 class="text-5xl font-black truncate text-white">${team.team}</h3>
                <p class="text-7xl font-black" style="color: ${color}">${team.score}</p>
            </div>`;
    });

    // 2. DEFINE DATA SETS
    // Challengers Side: specific limits per your rules
    let challengerLimit = 4; 
    if (lvl === "1") challengerLimit = 15;
    else if (cat === "Pick and Place") challengerLimit = 5;
    const challengersData = data.slice(3, challengerLimit);

    // Complete Side: The whole list
    const completeData = data; 

    const perPageLeft = 4;   // 4 teams on left
    const perPageRight = 6;  // 6 teams on right

    function rotatePage() {
        // Animation Out
        [smallList, tableBody].forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-30px)';
        });

        setTimeout(() => {
            // Calculate slice for Left Side
            const leftIdx = (currentPage * perPageLeft) % (challengersData.length || 1);
            const leftItems = challengersData.slice(leftIdx, leftIdx + perPageLeft);
            
            // Calculate slice for Right Side
            const rightIdx = (currentPage * perPageRight) % (completeData.length || 1);
            const rightItems = completeData.slice(rightIdx, rightIdx + perPageRight);

            // Update Left HTML
            smallList.innerHTML = leftItems.map(team => `
                <div class="challenger-row">
                    <div class="flex items-center gap-8">
                        <span class="text-[#d4af37] text-5xl font-black italic">#${team.rank}</span>
                        <span class="font-black text-3xl truncate w-64">${team.team}</span>
                    </div>
                    <span class="bg-blue-600 px-8 py-2 rounded-2xl text-4xl font-black shadow-lg">${team.score}</span>
                </div>
            `).join('') || `<p class="text-gray-500 italic p-4 text-2xl">Finals in progress...</p>`;

            // Update Right HTML
            tableBody.innerHTML = rightItems.map(team => `
                <tr>
                    <td class="font-black text-[#d4af37] italic">#${team.rank}</td>
                    <td class="truncate max-w-[400px]">${team.team}</td>
                    <td class="text-right text-5xl text-white font-black">${team.score}</td>
                </tr>
            `).join('');

            // Animation In
            [smallList, tableBody].forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            });

            currentPage++;
        }, 600);
    }

    currentPage = 0;
    rotatePage();
    displayTimer = setInterval(rotatePage, 5600); // 5s view + 0.6s transition
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