const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let currentPage = 0;
let displayTimer = null;
let clusterIndex = 0;

async function init() {
    updateClock();
    setInterval(updateClock, 1000);
    await refreshData();
    setInterval(refreshData, 30000);
}

function updateClock() {
    const el = document.getElementById('sync-time');
    if (el) el.innerText = "LAST SYNC: " + new Date().toLocaleTimeString();
}

async function refreshData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(r => r.trim() !== '').slice(1);
        masterData = rows.map(row => {
            const c = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(f => f.replace(/^"|"$/g, '').trim());
            return { category: c[1], level: c[2], team: c[3], score: c[4], rank: c[5] };
        });
        const active = document.querySelector('.nav-item.active');
        updateDashboard(active.dataset.cat, active.dataset.lvl);
    } catch (err) { console.error("Sync Error", err); }
}

function updateDashboard(cat, lvl) {
    const podium = document.getElementById('podium');
    const dbBody = document.getElementById('dashboard-body');

    const balloon = document.getElementById('category-balloon');

    // Update the Balloon Caption
    const activeItem = document.querySelector(`.nav-item[data-cat="${cat}"][data-lvl="${lvl}"]`);
    if (activeItem && balloon) {
        balloon.innerText = activeItem.getAttribute('data-tip') || `${cat}: Level ${lvl}`;
        // Re-trigger the animation
        balloon.classList.remove('list-item-fade');
        void balloon.offsetWidth; // Trigger reflow
        balloon.classList.add('list-item-fade');
    }
    if (displayTimer) clearInterval(displayTimer);

    if (cat === "Mini Sumo" && lvl === "1") {
        podium.style.display = 'none';
        const groups = {};
        masterData.filter(i => i.category === "Mini Sumo" && i.level === "1").forEach(t => {
            if (!groups[t.rank]) groups[t.rank] = [];
            groups[t.rank].push(t);
        });
        startSumoL1Cycle(groups);
    } else if (cat === "Mini Sumo" && lvl === "2") {
        podium.style.display = 'none';
        renderSumoLevel2(masterData.filter(i => i.category === "Mini Sumo" && i.level === "2"));
    } else {
        podium.style.display = 'grid';
        dbBody.innerHTML = `
            <section class="w-[45%] glass-card flex flex-col overflow-hidden">
                <div class="p-6 border-b border-white/10 bg-white/5"><h4 class="text-3xl font-black text-[#d4af37] uppercase">Next Challengers for the Next Round</h4></div>
                <div id="team-list-small" class="flex-1 p-6"></div>
            </section>
            <section class="w-[55%] glass-card flex flex-col overflow-hidden">
                <div class="p-6 border-b border-white/10 bg-white/5"><h4 class="text-3xl font-black text-gray-400 uppercase">Complete Standings</h4></div>
                <div id="full-table-container" class="flex-1 overflow-hidden">
                    <table class="w-full text-left"><tbody id="full-table-body"></tbody></table>
                </div>
            </section>`;
        const filtered = masterData.filter(i => i.category === cat && i.level === lvl).sort((a,b) => parseInt(a.rank) - parseInt(b.rank));
        renderStandardPaged(filtered);
    }
}

// SUMO LEVEL 1: MAXIMIZED WITH ANIMATION AND CAPTIONS
function startSumoL1Cycle(groups) {
    const names = Object.keys(groups).sort();
    function next() {
        const n = names[clusterIndex % names.length];
        const teams = groups[n];
        
        document.getElementById('dashboard-body').innerHTML = `
            <div class="flex w-full h-full items-center justify-center p-4">
                <div class="cluster-card-single list-item-fade">
                    <h2 class="text-7xl font-black text-white mb-8 border-b-4 border-gold pb-4 uppercase italic">CLUSTER ${n}</h2>
                    <table class="w-full">
                        <thead>
                            <tr class="text-gold uppercase tracking-widest text-xl opacity-70">
                                <th class="text-left p-6">Participant</th>
                                <th class="text-center p-6">Match History</th>
                                <th class="text-right p-6">W—L Record</th>
                            </tr>
                        </thead>
                        <tbody>${teams.map((t, idx) => {
                            const s = (t.score || "x;x;x;x;x").split(';');
                            const w = s.filter(v => v === "1").length, l = s.filter(v => v === "0").length;
                            const m = s.map(v => {
                                if (v === "1") return `<div class="marker-history win-bg"><i class="fas fa-check"></i></div>`;
                                if (v === "0") return `<div class="marker-history loss-bg"><i class="fas fa-times"></i></div>`;
                                return `<div class="marker-history pending-bg"><i class="fas fa-hourglass-half animate-pulse"></i></div>`;
                            }).join('');
                            
                            return `
                            <tr class="sumo-row-fade" style="animation-delay: ${idx * 0.15}s">
                                <td class="text-4xl font-extrabold p-6 text-white uppercase">${t.team}</td>
                                <td><div class="flex gap-4 justify-center">${m}</div></td>
                                <td class="text-right text-6xl font-black text-gold monospace">${w}-${l}</td>
                            </tr>`;
                        }).join('')}</tbody>
                    </table>
                </div>
            </div>`;
        clusterIndex++;
    }
    next(); 
    displayTimer = setInterval(next, 7000); // Increased slightly to allow for animation time
}

function renderSumoLevel2(data) {
    const r1 = data.filter(t => t.rank == "1");
    const r2 = data.filter(t => t.rank == "2" || t.rank == "2X");
    const r3 = data.filter(t => t.rank == "3" || t.rank == "3X");

    const getCard = (team) => {
        if (!team) return `<div class="match-card opacity-10"><div class="text-2xl font-bold">Waiting...</div></div>`;
        const s = team.score.split(';');
        const isPending = team.rank.toString().includes('X');
        const markers = s.slice(1).map(g => {
            if (g === "1") return `<div class="m-mark win-bg"><i class="fas fa-check"></i></div>`;
            if (g === "0") return `<div class="m-mark loss-bg"><i class="fas fa-times"></i></div>`;
            return `<div class="m-mark pending-bg"><i class="fas fa-hourglass-half animate-pulse"></i></div>`;
        }).join('');
        const wins = s.filter(g=>g==="1").length;
        return `<div class="match-card ${isPending ? 'waiting-match' : (wins >= 2 ? 'bracket-winner' : '')}">
            <div class="text-[0.9rem] text-gold uppercase font-black mb-1">Cluster ${s[0]} ${isPending ? '• ROUND PENDING' : ''}</div>
            <div class="flex justify-between items-center"><span class="text-3xl font-black uppercase">${team.team}</span><div class="flex gap-2">${markers}</div></div>
        </div>`;
    };

    const bracketHTML = `
        <div class="round-column"><h4 class="text-gray-500 font-black text-center text-3xl mb-6">ROUND 1</h4>${r1.map(t => getCard(t)).join('')}</div>
        <div class="path-connector"><div class="path-line"></div><div class="path-line" style="border-radius: 20px 0 0 20px; border-left: 3px solid rgba(212,175,55,0.3); border-right:none"></div></div>
        <div class="round-column"><h4 class="text-gold font-black text-center text-3xl mb-6">ROUND 2</h4>${[0,1,2,3,4,5].map(i => getCard(r2[i])).join('')}</div>
        <div class="path-connector"><div class="path-line"></div></div>
        <div class="round-column"><h4 class="text-white font-black text-center text-3xl mb-6 underline">CHAMPIONSHIP</h4>${[0,1,2].map(i => getCard(r3[i])).join('')}</div>`;

    document.getElementById('dashboard-body').innerHTML = `<div class="bracket-viewport glass-card"><div class="bracket-scroll-content">${bracketHTML}${bracketHTML}</div></div>`;
}

function renderStandardPaged(data) {
    const p = document.getElementById('podium'); p.innerHTML = '';
    data.slice(0,3).forEach(t => {
        let color = t.rank=="1"?"#d4af37":t.rank=="2"?"#c0c0c0":"#cd7f32";
        p.innerHTML += `<div class="podium-card ${t.rank==1?'gold':t.rank==2?'silver':'bronze'}"><div class="podium-left px-4"><span class="text-5xl font-black" style="color:${color}">#${t.rank}</span></div><div class="flex-1 px-4"><h3 class="podium-team-name text-2xl">${t.team}</h3><span class="text-4xl font-black" style="color:${color}">${t.score} PTS</span></div></div>`;
    });
    function rotate() {
        const l = document.getElementById('team-list-small'), r = document.getElementById('full-table-body');
        if(!l || !r) return;
        const rItems = data.slice((currentPage*6)%data.length, (currentPage*6)%data.length+6);
        
        // Staggered Entry Animation for Next Challengers
        l.innerHTML = data.slice(3, 7).map((t, idx) => `
            <div class="list-item-fade flex justify-between items-center p-6 bg-white/5 rounded-2xl mb-4 border border-white/10" style="animation-delay: ${idx * 0.1}s">
                <span class="text-4xl font-black text-gold">#${t.rank}</span>
                <span class="text-3xl font-bold uppercase">${t.team}</span>
                <span class="bg-blue-600 px-6 py-2 rounded-xl font-black text-3xl">${t.score}</span>
            </div>`).join('');
            
        // Staggered Entry Animation for Standings Table
        r.innerHTML = rItems.map((t, idx) => `
            <tr class="list-item-fade border-b border-white/5" style="animation-delay: ${idx * 0.05}s">
                <td class="p-6 text-4xl font-black text-gold">#${t.rank}</td>
                <td class="p-6 text-3xl font-bold uppercase">${t.team}</td>
                <td class="p-6 text-right text-4xl font-black">${t.score}</td>
            </tr>`).join('');
            
        currentPage++;
    }
    rotate(); displayTimer = setInterval(rotate, 6000);
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active'); updateDashboard(this.dataset.cat, this.dataset.lvl);
}));

init();