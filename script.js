const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let currentPage = 0;
let displayTimer = null;

async function init() {
    await refreshData();
    setInterval(refreshData, 60000); // Refresh data from sheet every minute
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
    } catch (err) { console.error("Sync Error", err); }
}

function updateDashboard(cat, lvl) {
    const filtered = masterData.filter(item => 
        item.category.trim() === cat.trim() && item.level.toString().trim() === lvl.toString().trim()
    ).sort((a, b) => a.rank - b.rank);

    currentPage = 0; // Reset to page 1 on category change
    renderStaticUI(filtered, cat, lvl);
}

function renderStaticUI(data, cat, lvl) {
    const podium = document.getElementById('podium');
    const smallList = document.getElementById('team-list-small');
    const tableBody = document.getElementById('full-table-body');
    
    if (displayTimer) clearInterval(displayTimer);
    podium.innerHTML = ''; 

    if (data.length === 0) return;

    // 1. STATIC PODIUM (Always visible)
    data.slice(0, 3).forEach(team => {
        const color = team.rank === 1 ? '#d4af37' : (team.rank === 2 ? '#c0c0c0' : '#cd7f32');
        podium.innerHTML += `
            <div class="podium-card ${team.rank === 1 ? 'gold' : ''}">
                <span class="text-xl font-black" style="color: ${color}">RANK ${team.rank}</span>
                <h3 class="text-4xl font-black truncate text-white">${team.team}</h3>
                <p class="text-7xl font-black" style="color: ${color}">${team.score}</p>
            </div>`;
    });

    // 2. PAGING LOGIC
    // Determine how many teams to show per page
    const leftLimit = (lvl === "1") ? 15 : (cat === "Pick and Place" ? 5 : 4);
    const challengersData = data.slice(3, leftLimit);
    const completeData = data; 

    const teamsPerPageLeft = 4;  // Show 4 challengers at a time
    const teamsPerPageRight = 6; // Show 6 table rows at a time

    function showPage() {
        // --- Render Left Side (Challengers) ---
        const leftStart = (currentPage * teamsPerPageLeft) % (challengersData.length || 1);
        const leftPage = challengersData.slice(leftStart, leftStart + teamsPerPageLeft);
        
        // --- Render Right Side (Table) ---
        const rightStart = (currentPage * teamsPerPageRight) % (completeData.length || 1);
        const rightPage = completeData.slice(rightStart, rightStart + teamsPerPageRight);

        // Transition Animation
        [smallList, tableBody].forEach(el => el.classList.add('slide-out'));

        setTimeout(() => {
            // Update Left HTML
            smallList.innerHTML = leftPage.map(team => `
                <div class="challenger-row slide-in">
                    <div class="flex items-center gap-8">
                        <span class="text-[#d4af37] text-5xl font-black italic">#${team.rank}</span>
                        <span class="font-black text-3xl truncate w-64">${team.team}</span>
                    </div>
                    <span class="bg-blue-600 px-8 py-2 rounded-2xl text-4xl font-black">${team.score}</span>
                </div>
            `).join('');

            // Update Right HTML
            tableBody.innerHTML = rightPage.map(team => `
                <tr class="slide-in">
                    <td class="font-black text-[#d4af37] italic">#${team.rank}</td>
                    <td>${team.team}</td>
                    <td class="text-right text-5xl text-white font-black">${team.score}</td>
                </tr>
            `).join('');

            [smallList, tableBody].forEach(el => el.classList.remove('slide-out'));
            currentPage++;
        }, 500);
    }

    showPage(); // Show first page immediately
    displayTimer = setInterval(showPage, 4000); // Change page every 4 seconds (3s view + 1s anim)
}

// Navigation event listeners (same as before)
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        updateDashboard(this.dataset.cat, this.dataset.lvl);
    });
});

init();