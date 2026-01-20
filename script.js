const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMAOD8nWYa5fGhC1S2n8mYrsF62n2epBvrrOwjoTxSx0NVBUK1y7WlYlhLtuEewnVWOEuK-LVGBc9b/pub?output=csv";

let masterData = [];
let displayTimer = null;

async function init() {
    updateClock();
    setInterval(updateClock, 1000);
    await refreshData();
    setupHoverEffects(); // Initialize the new hover popup logic
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
        if (active) updateDashboard(active.dataset.cat, active.dataset.lvl);
    } catch (err) { console.error("Sync Error", err); }
}

function setupHoverEffects() {
    const balloon = document.getElementById('category-balloon');
    if (!balloon) return;

    // Ensure balloon is positioned absolutely in your CSS
    balloon.style.position = 'fixed';
    balloon.style.pointerEvents = 'none'; // Prevents the balloon from flickering
    balloon.style.display = 'none';
    balloon.style.zIndex = '1000';

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            const tip = this.getAttribute('data-tip') || 
                        `${this.dataset.cat}: Level ${this.dataset.lvl}`;
            
            balloon.innerText = tip;
            balloon.style.display = 'block';
            
            // Re-trigger fade animation
            balloon.classList.remove('list-item-fade');
            void balloon.offsetWidth; 
            balloon.classList.add('list-item-fade');
        });

        btn.addEventListener('mousemove', function(e) {
            // Positions the balloon 20px below and to the right of the cursor
            balloon.style.left = (e.clientX + 20) + 'px';
            balloon.style.top = (e.clientY + 20) + 'px';
        });

        btn.addEventListener('mouseleave', function() {
            balloon.style.display = 'none';
        });
    });
}

function updateDashboard(cat, lvl) {
    const podium = document.getElementById('podium');
    const dbBody = document.getElementById('dashboard-body');

    if (displayTimer) clearInterval(displayTimer);

    podium.innerHTML = "";
    dbBody.innerHTML = "";

    if (cat === "Mini Sumo" && lvl === "1") {
        podium.style.display = 'none';
        const groups = {};
        masterData.filter(i => i.category === "Mini Sumo" && i.level === "1").forEach(t => {
            if (!groups[t.rank]) groups[t.rank] = [];
            groups[t.rank].push(t);
        });
        renderStaticSumoGroups(groups);
    } else if (cat === "Mini Sumo" && lvl === "2") {
        podium.style.display = 'none';
        // Use trim() and toLowerCase() to ensure matches even with formatting errors
        const level2Data = masterData.filter(i => 
            i.category.trim() === "Mini Sumo" && 
            i.level.toString().trim() === "2"
        );
        renderSumoLevel2Bracket(level2Data);
    } else {
        podium.style.display = 'grid';
        const filtered = masterData.filter(i => i.category === cat && i.level === lvl)
                                   .sort((a,b) => parseInt(a.rank) - parseInt(b.rank));
        renderStandardPaged(filtered);
    }
}

function renderSumoLevel2Bracket(data) {
    const r1 = data.filter(t => t.rank.toString().trim() === "1");
    const r2 = data.filter(t => {
        const r = t.rank.toString().trim();
        return r === "2" || r === "2X";
    });
    const r3 = data.filter(t => {
        const r = t.rank.toString().trim();
        return r === "3" || r === "3X";
    });

    const getBracketCard = (team, roundType) => {
        // High-visibility "Waiting" state for empty slots
        if (!team) {
            return `<div class="glass-card opacity-10 border-2 border-dashed border-white/20 w-full flex items-center justify-center h-full mb-1">
                <span class="text-xl font-black text-gray-600 italic">TBD</span>
            </div>`;
        }
        
        const s = (team.score || "x;x;x").split(';');
        const groupLabel = s[0];
        const history = s.slice(1);
        const wins = history.filter(v => v === "1").length;
        const isWinner = wins >= 2;
        const isPending = team.rank.toString().includes('X');

        // Dynamic Sizing logic based on Round
        const config = {
            r1: { padding: 'p-1', teamSize: 'text-xl', groupSize: 'text-[0.5rem]', iconSize: 'text-2xl', gap: 'gap-2' },
            r2: { padding: 'p-4', teamSize: 'text-4xl', groupSize: 'text-sm', iconSize: 'text-4xl', gap: 'gap-4' },
            r3: { padding: 'p-8', teamSize: 'text-6xl', groupSize: 'text-lg', iconSize: 'text-6xl', gap: 'gap-6' }
        }[roundType];

        return `
        <div class="glass-card ${config.padding} flex flex-col justify-center border-2 
            ${isWinner ? 'border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : (isPending ? 'border-gold/40' : 'border-white/10')} 
            w-full h-full mb-1 transition-all" style="min-height: 0;">
            
            <div class="${config.groupSize} text-gold font-black uppercase leading-none mb-1">GROUP ${groupLabel} ${isPending ? '• PENDING' : ''}</div>
            
            <div class="flex justify-between items-center w-full">
                <span class="${config.teamSize} font-black uppercase text-white truncate mr-2 leading-none">${team.team}</span>
                <div class="flex ${config.gap} ${config.iconSize} leading-none">
                    ${history.map(v => {
                        if (v === "1") return `<span class="text-green-500">✅</span>`;
                        if (v === "0") return `<span class="text-red-500">❌</span>`;
                        return `<span class="text-gray-500 opacity-50">⏳</span>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    };

    document.getElementById('dashboard-body').innerHTML = `
        <div class="flex w-full h-full p-2 gap-4 overflow-hidden bg-black/40">
            <div class="flex-1 flex flex-col h-full">
                <h4 class="text-3xl font-black text-gray-500 uppercase text-center mb-2 italic tracking-tighter">Round 1</h4>
                <div class="flex-1 grid grid-rows-12 gap-1 h-full">
                    ${Array.from({length: 12}).map((_, i) => getBracketCard(r1[i], 'r1')).join('')}
                </div>
            </div>

            <div class="flex-[1.3] flex flex-col h-full">
                <h4 class="text-5xl font-black text-gold uppercase text-center mb-2 italic">Round 2</h4>
                <div class="flex-1 grid grid-rows-6 gap-2 h-full">
                    ${Array.from({length: 6}).map((_, i) => getBracketCard(r2[i], 'r2')).join('')}
                </div>
            </div>

            <div class="flex-[1.7] flex flex-col h-full">
                <h4 class="text-6xl font-black text-white uppercase text-center mb-4 italic border-b-4 border-white/20 pb-2">Championship</h4>
                <div class="flex-1 grid grid-rows-3 gap-4 h-full">
                    ${Array.from({length: 3}).map((_, i) => getBracketCard(r3[i], 'r3')).join('')}
                </div>
            </div>
        </div>`;
}

// RESTORED STANDARD UI LOGIC
function renderStaticSumoGroups(groups) {
    const names = Object.keys(groups).sort();
    document.getElementById('dashboard-body').innerHTML = `
        <div class="grid grid-cols-3 grid-rows-2 gap-6 w-full h-full p-2">
            ${names.map(n => {
                const teams = groups[n];
                return `
                <div class="glass-card p-6 flex flex-col border-2 border-gold/30 bg-black/60 shadow-2xl">
                    <h2 class="text-5xl font-black text-gold border-b-4 border-gold/40 mb-4 uppercase italic tracking-tight">GROUP ${n}</h2>
                    <table class="w-full">
                        <thead><tr class="text-gold uppercase text-sm opacity-80 border-b border-white/10"><th class="text-left pb-3">Team Name</th><th class="text-center pb-3">History</th><th class="text-right pb-3">W-L</th></tr></thead>
                        <tbody>
                            ${teams.map(t => {
                                const s = (t.score || "x;x;x;x;x").split(';');
                                const w = s.filter(v => v === "1").length, l = s.filter(v => v === "0").length;
                                const markers = s.map(v => v === "1" ? '✅' : v === "0" ? '❌' : '⏳').join(' ');
                                return `<tr class="border-b border-white/5"><td class="font-black py-3 text-white uppercase truncate max-w-[140px] text-2xl">${t.team}</td><td class="text-center py-3 text-xl tracking-widest">${markers}</td><td class="text-right font-black text-gold py-3 text-4xl">${w}-${l}</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
            }).join('')}
        </div>`;
}

function renderStandardPaged(data) {
    const p = document.getElementById('podium');
    const dbBody = document.getElementById('dashboard-body');
    const activeItem = document.querySelector('.nav-item.active');
    const category = activeItem ? activeItem.dataset.cat : "";
    const unit = category === "Line Following" ? "sec" : "PTS";
    data.slice(0,3).forEach(t => {
        let color = t.rank=="1" ? "#d4af37" : (t.rank=="2" ? "#c0c0c0" : "#cd7f32");
        p.innerHTML += `<div class="podium-card glass-card flex items-center p-6" style="border-left: 10px solid ${color}"><div class="px-4"><span class="text-6xl font-black" style="color:${color}">#${t.rank}</span></div><div class="flex-1 px-4 overflow-hidden"><h3 class="text-2xl font-black uppercase text-white truncate">${t.team}</h3><span class="text-4xl font-black" style="color:${color}">${t.score} ${unit}</span></div></div>`;
    });
    const list = data.slice(3, 30);
    const rows = Math.ceil(list.length / 3);
    dbBody.innerHTML = `<div class="glass-card w-full h-full p-8 overflow-hidden"><div class="grid grid-cols-3 grid-flow-col gap-x-10 gap-y-3 h-full" style="grid-template-rows: repeat(${rows || 1}, 1fr);">${list.map(t => `<div class="flex justify-between items-center bg-white/5 rounded-xl px-6 py-2 border border-white/5"><span class="text-2xl font-black text-gold">#${t.rank}</span><span class="text-2xl font-bold uppercase truncate flex-1 px-6 text-white">${t.team}</span><span class="text-2xl font-black text-blue-500">${t.score} ${unit}</span></div>`).join('')}</div></div>`;
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
    updateDashboard(this.dataset.cat, this.dataset.lvl);
}));

init();