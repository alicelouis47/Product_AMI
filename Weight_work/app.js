/* =========================================
   Helgeson-Birnie Positional Weight Calculator
   Core Application Logic
   ========================================= */

// ---- Data Store ----
let nodes = []; // { id: number, time: number }
let edges = []; // { from: number, to: number }
let positionalWeights = {}; // nodeId -> weight

// ---- DOM References ----
const $ = (sel) => document.querySelector(sel);
const nodeIdInput = $('#node-id');
const nodeTimeInput = $('#node-time');
const addNodeBtn = $('#add-node-btn');
const edgeFromSelect = $('#edge-from');
const edgeToSelect = $('#edge-to');
const addEdgeBtn = $('#add-edge-btn');
const nodesTableBody = $('#nodes-table tbody');
const edgesTableBody = $('#edges-table tbody');
const calcPwBtn = $('#calc-pw-btn');
const pwTableBody = $('#pw-table tbody');
const rankedTableBody = $('#ranked-table tbody');
const balanceBtn = $('#balance-btn');
const cycleTimeInput = $('#cycle-time');
const balanceTableBody = $('#balance-table tbody');
const summaryTableBody = $('#summary-table tbody');
const loadExampleBtn = $('#load-example-btn');
const clearAllBtn = $('#clear-all-btn');
const canvas = $('#network-canvas');
const ctx = canvas.getContext('2d');

// Region Approach
const regionBtn = $('#region-btn');
const regionCycleTimeInput = $('#region-cycle-time');
const regionAssignTableBody = $('#region-assign-table tbody');
const regionStationTableBody = $('#region-station-table tbody');
const regionSummaryTableBody = $('#region-summary-table tbody');

// ---- Event Listeners ----
addNodeBtn.addEventListener('click', addNode);
addEdgeBtn.addEventListener('click', addEdge);
calcPwBtn.addEventListener('click', calculatePositionalWeights);
balanceBtn.addEventListener('click', performLineBalancing);
loadExampleBtn.addEventListener('click', loadExample);
clearAllBtn.addEventListener('click', clearAll);
regionBtn.addEventListener('click', performRegionApproach);
regionCycleTimeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performRegionApproach(); });

// Enter key support
nodeIdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { nodeTimeInput.focus(); } });
nodeTimeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addNode(); });
cycleTimeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performLineBalancing(); });

// ---- Node CRUD ----
function addNode() {
    const id = parseInt(nodeIdInput.value);
    const time = parseFloat(nodeTimeInput.value);
    if (isNaN(id) || id < 1) return showToast('กรุณาใส่หมายเลขขั้นตอนที่ถูกต้อง', 'error');
    if (isNaN(time) || time < 0) return showToast('กรุณาใส่เวลาที่ถูกต้อง', 'error');
    if (nodes.find(n => n.id === id)) return showToast(`ขั้นตอน ${id} มีอยู่แล้ว`, 'error');

    nodes.push({ id, time });
    nodes.sort((a, b) => a.id - b.id);
    nodeIdInput.value = '';
    nodeTimeInput.value = '';
    nodeIdInput.focus();
    renderNodes();
    updateEdgeSelectors();
    drawNetwork();
    showToast(`เพิ่มขั้นตอน ${id} (t=${time}) สำเร็จ`);
}

function removeNode(id) {
    nodes = nodes.filter(n => n.id !== id);
    edges = edges.filter(e => e.from !== id && e.to !== id);
    renderNodes();
    renderEdges();
    updateEdgeSelectors();
    drawNetwork();
}

function renderNodes() {
    const noMsg = $('#no-nodes');
    if (nodes.length === 0) {
        nodesTableBody.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }
    noMsg.style.display = 'none';
    nodesTableBody.innerHTML = nodes.map(n => `
        <tr>
            <td>${n.id}</td>
            <td>${n.time}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removeNode(${n.id})">✕</button></td>
        </tr>
    `).join('');
}

// ---- Edge CRUD ----
function addEdge() {
    const from = parseInt(edgeFromSelect.value);
    const to = parseInt(edgeToSelect.value);
    if (isNaN(from) || isNaN(to)) return showToast('กรุณาเลือก Node ต้นทางและปลายทาง', 'error');
    if (from === to) return showToast('ต้นทางและปลายทางต้องไม่ซ้ำกัน', 'error');
    if (edges.find(e => e.from === from && e.to === to)) return showToast('ความสัมพันธ์นี้มีอยู่แล้ว', 'error');

    edges.push({ from, to });
    renderEdges();
    drawNetwork();
    showToast(`เพิ่มความสัมพันธ์ ${from} → ${to} สำเร็จ`);
}

function removeEdge(from, to) {
    edges = edges.filter(e => !(e.from === from && e.to === to));
    renderEdges();
    drawNetwork();
}

function renderEdges() {
    const noMsg = $('#no-edges');
    if (edges.length === 0) {
        edgesTableBody.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }
    noMsg.style.display = 'none';
    edgesTableBody.innerHTML = edges.map(e => `
        <tr>
            <td>${e.from}</td>
            <td>${e.to}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removeEdge(${e.from},${e.to})">✕</button></td>
        </tr>
    `).join('');
}

function updateEdgeSelectors() {
    const options = '<option value="">เลือก Node</option>' +
        nodes.map(n => `<option value="${n.id}">${n.id}</option>`).join('');
    edgeFromSelect.innerHTML = options;
    edgeToSelect.innerHTML = options;
}

// ---- Positional Weight Calculation ----
// Wi = ti + sum of tj for all j that are successors (direct and indirect) of i
function calculatePositionalWeights() {
    if (nodes.length === 0) return showToast('กรุณาเพิ่ม Node ก่อน', 'error');

    // Build adjacency list (successors)
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
        if (adj[e.from]) adj[e.from].push(e.to);
    });

    // Get all successors of a node using DFS
    function getAllSuccessors(nodeId) {
        const visited = new Set();
        const stack = [...(adj[nodeId] || [])];
        while (stack.length > 0) {
            const curr = stack.pop();
            if (!visited.has(curr)) {
                visited.add(curr);
                (adj[curr] || []).forEach(s => {
                    if (!visited.has(s)) stack.push(s);
                });
            }
        }
        return visited;
    }

    const timeMap = {};
    nodes.forEach(n => timeMap[n.id] = n.time);

    positionalWeights = {};
    nodes.forEach(n => {
        const successors = getAllSuccessors(n.id);
        let w = n.time;
        successors.forEach(sId => {
            w += (timeMap[sId] || 0);
        });
        positionalWeights[n.id] = w;
    });

    renderPwTable();
    renderRankedTable();
    drawNetwork();
    showToast('คำนวณ Positional Weight สำเร็จ ✓');
}

function renderPwTable() {
    const noMsg = $('#no-pw');
    noMsg.style.display = 'none';
    pwTableBody.innerHTML = nodes.map(n => `
        <tr>
            <td>${n.id}</td>
            <td><strong>${positionalWeights[n.id] ?? '—'}</strong></td>
        </tr>
    `).join('');
}

function renderRankedTable() {
    const noMsg = $('#no-ranked');
    noMsg.style.display = 'none';
    const ranked = nodes
        .map(n => ({ id: n.id, w: positionalWeights[n.id] }))
        .sort((a, b) => b.w - a.w);

    rankedTableBody.innerHTML = ranked.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${r.id}</td>
            <td><strong>${r.w}</strong></td>
        </tr>
    `).join('');
}

// ---- Line Balancing (Helgeson-Birnie) ----
function performLineBalancing() {
    const ct = parseFloat(cycleTimeInput.value);
    if (isNaN(ct) || ct <= 0) return showToast('กรุณาใส่ Cycle Time ที่ถูกต้อง', 'error');
    if (Object.keys(positionalWeights).length === 0) {
        calculatePositionalWeights();
    }

    // Build predecessor map
    const predecessors = {};
    nodes.forEach(n => predecessors[n.id] = []);
    edges.forEach(e => {
        if (predecessors[e.to]) predecessors[e.to].push(e.from);
    });

    // Ranked order (descending by positional weight)
    const ranked = nodes
        .map(n => ({ id: n.id, time: n.time, w: positionalWeights[n.id] }))
        .sort((a, b) => b.w - a.w);

    const assigned = new Set();
    const stations = []; // [ { stationNum, jobs: [{id, time, cumTime}] } ]
    let stationNum = 1;
    let currentStation = { stationNum, jobs: [] };
    let stationTime = 0;

    // Copy ranked list as the task queue
    const taskQueue = [...ranked];

    while (taskQueue.length > 0) {
        let foundTask = false;

        for (let i = 0; i < taskQueue.length; i++) {
            const task = taskQueue[i];

            // Check if all predecessors are assigned
            const allPredsAssigned = predecessors[task.id].every(p => assigned.has(p));
            if (!allPredsAssigned) continue;

            // Check if fits in current station
            if (stationTime + task.time <= ct) {
                stationTime += task.time;
                currentStation.jobs.push({
                    id: task.id,
                    time: task.time,
                    cumTime: stationTime
                });
                assigned.add(task.id);
                taskQueue.splice(i, 1);
                foundTask = true;
                break;
            }
        }

        if (!foundTask) {
            // Close current station and open new one
            if (currentStation.jobs.length > 0) {
                stations.push(currentStation);
            }
            stationNum++;
            stationTime = 0;
            currentStation = { stationNum, jobs: [] };

            // Try again — if still no task fits, force the first eligible
            let forced = false;
            for (let i = 0; i < taskQueue.length; i++) {
                const task = taskQueue[i];
                const allPredsAssigned = predecessors[task.id].every(p => assigned.has(p));
                if (!allPredsAssigned) continue;

                stationTime += task.time;
                currentStation.jobs.push({
                    id: task.id,
                    time: task.time,
                    cumTime: stationTime
                });
                assigned.add(task.id);
                taskQueue.splice(i, 1);
                forced = true;
                break;
            }

            if (!forced && taskQueue.length > 0) {
                // Should not happen with valid data, but safety break
                showToast('ไม่สามารถจัดสมดุลได้ — ตรวจสอบ Precedence Relationships', 'error');
                return;
            }
        }
    }

    // Push last station
    if (currentStation.jobs.length > 0) {
        stations.push(currentStation);
    }

    renderBalanceTable(stations, ct);
    renderSummaryTable(stations, ct);
    renderEfficiency(stations, ct);
    showToast(`จัดสมดุลสำเร็จ — ${stations.length} สถานีงาน ✓`);
}

function renderBalanceTable(stations, ct) {
    $('#balance-result-card').style.display = 'block';
    let html = '';
    stations.forEach(s => {
        s.jobs.forEach((job, idx) => {
            const isFirst = idx === 0;
            const rowClass = isFirst ? 'station-first' : '';
            const condition = job.cumTime <= ct ? 'YES' : 'NO';
            const stationLabel = isFirst
                ? `<strong>${s.stationNum}</strong>`
                : '';
            // First row of first station shows CT
            html += `<tr class="${rowClass}">
                <td>${stationLabel}</td>
                <td>${job.id}</td>
                <td>${job.time}</td>
                <td>${job.cumTime}</td>
                <td style="color: ${condition === 'YES' ? 'var(--accent-3)' : 'var(--accent-danger)'}">${isFirst && s.stationNum === 1 ? ct + ' นาที' : condition}</td>
            </tr>`;
        });
    });
    balanceTableBody.innerHTML = html;
}

function renderSummaryTable(stations, ct) {
    $('#summary-card').style.display = 'block';
    const totalTime = nodes.reduce((sum, n) => sum + n.time, 0);
    let html = '';
    stations.forEach(s => {
        const stTime = s.jobs.reduce((sum, j) => sum + j.time, 0);
        const eff = ((stTime / ct) * 100).toFixed(2);
        const jobIds = s.jobs.map(j => j.id).join(', ');
        html += `<tr>
            <td><strong>${s.stationNum}</strong></td>
            <td>${jobIds}</td>
            <td>${stTime}</td>
            <td>${eff}</td>
        </tr>`;
    });
    // Total row
    const lineEff = ((totalTime / (ct * stations.length)) * 100).toFixed(2);
    html += `<tr style="border-top: 2px solid var(--accent-1); font-weight: 700;">
        <td>Total</td>
        <td></td>
        <td>${totalTime}</td>
        <td></td>
    </tr>`;
    html += `<tr style="font-weight: 700;">
        <td colspan="3" style="text-align:right;">Line Efficiency %</td>
        <td style="color: var(--accent-3); font-size: 1.1rem;">${lineEff}</td>
    </tr>`;
    summaryTableBody.innerHTML = html;
}

function renderEfficiency(stations, ct) {
    $('#stats-grid').style.display = 'grid';
    const totalTime = nodes.reduce((sum, n) => sum + n.time, 0);
    const M = stations.length;
    const lineEff = ((totalTime / (ct * M)) * 100).toFixed(2);
    $('#stat-stations').textContent = M;
    $('#stat-ct').textContent = ct + ' นาที';
    $('#stat-total-time').textContent = totalTime + ' นาที';
    $('#stat-line-eff').textContent = lineEff + '%';
}

// ---- Network Drawing ----
function drawNetwork() {
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth || 1100;
    const displayH = 500;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.height = displayH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayW, displayH);

    if (nodes.length === 0) {
        ctx.fillStyle = '#484f58';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('เพิ่ม Node และ Edge เพื่อดูแผนภาพ', displayW / 2, displayH / 2);
        return;
    }

    // Compute levels using topological ordering (Kahn's algorithm)
    const adj = {};
    const inDeg = {};
    nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
    edges.forEach(e => {
        if (adj[e.from]) adj[e.from].push(e.to);
        if (inDeg[e.to] !== undefined) inDeg[e.to]++;
    });

    const levels = {};
    const queue = [];
    nodes.forEach(n => { if (inDeg[n.id] === 0) { queue.push(n.id); levels[n.id] = 0; } });

    let maxLevel = 0;
    while (queue.length > 0) {
        const curr = queue.shift();
        (adj[curr] || []).forEach(next => {
            const newLevel = levels[curr] + 1;
            if (levels[next] === undefined || newLevel > levels[next]) {
                levels[next] = newLevel;
            }
            inDeg[next]--;
            if (inDeg[next] === 0) {
                queue.push(next);
            }
            if (newLevel > maxLevel) maxLevel = newLevel;
        });
    }

    // Handle nodes without level (isolated)
    nodes.forEach(n => {
        if (levels[n.id] === undefined) levels[n.id] = 0;
    });

    // Group nodes per level
    const levelGroups = {};
    nodes.forEach(n => {
        const lv = levels[n.id];
        if (!levelGroups[lv]) levelGroups[lv] = [];
        levelGroups[lv].push(n);
    });

    const numLevels = maxLevel + 1;
    const padding = 60;
    const nodeRadius = 22;
    const usableW = displayW - padding * 2;
    const usableH = displayH - padding * 2;
    const levelSpacing = numLevels > 1 ? usableW / (numLevels - 1) : usableW / 2;

    // Compute positions
    const positions = {};
    for (let lv = 0; lv <= maxLevel; lv++) {
        const group = levelGroups[lv] || [];
        const count = group.length;
        const vSpacing = count > 1 ? usableH / (count - 1) : 0;
        group.forEach((n, i) => {
            const x = padding + (numLevels > 1 ? lv * levelSpacing : usableW / 2);
            const y = padding + (count > 1 ? i * vSpacing : usableH / 2);
            positions[n.id] = { x, y };
        });
    }

    // Draw edges
    edges.forEach(e => {
        const from = positions[e.from];
        const to = positions[e.to];
        if (!from || !to) return;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;

        const startX = from.x + ux * nodeRadius;
        const startY = from.y + uy * nodeRadius;
        const endX = to.x - ux * (nodeRadius + 8);
        const endY = to.y - uy * (nodeRadius + 8);

        // Line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrowhead
        const arrowSize = 10;
        const angle = Math.atan2(endY - startY, endX - startX);
        ctx.beginPath();
        ctx.moveTo(endX + ux * 8, endY + uy * 8);
        ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = 'rgba(88, 166, 255, 0.6)';
        ctx.fill();
    });

    // Draw nodes
    const timeMap = {};
    nodes.forEach(n => timeMap[n.id] = n.time);

    nodes.forEach(n => {
        const pos = positions[n.id];
        if (!pos) return;

        // Glow
        const gradient = ctx.createRadialGradient(pos.x, pos.y, nodeRadius * 0.5, pos.x, pos.y, nodeRadius * 2);
        gradient.addColorStop(0, 'rgba(88, 166, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(88, 166, 255, 0)');
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#161b22';
        ctx.fill();
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node ID
        ctx.fillStyle = '#e6edf3';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.id.toString(), pos.x, pos.y);

        // Time label
        ctx.fillStyle = '#d29922';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`t=${n.time}`, pos.x, pos.y - nodeRadius - 10);

        // Positional Weight label (if calculated)
        if (positionalWeights[n.id] !== undefined) {
            ctx.fillStyle = '#bc8cff';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`W=${positionalWeights[n.id]}`, pos.x, pos.y + nodeRadius + 14);
        }
    });
}

// ---- Example Data (21 nodes from textbook) ----
function loadExample() {
    nodes = [
        { id: 1, time: 4 }, { id: 2, time: 3 }, { id: 3, time: 9 },
        { id: 4, time: 5 }, { id: 5, time: 9 }, { id: 6, time: 4 },
        { id: 7, time: 8 }, { id: 8, time: 7 }, { id: 9, time: 5 },
        { id: 10, time: 1 }, { id: 11, time: 3 }, { id: 12, time: 1 },
        { id: 13, time: 5 }, { id: 14, time: 3 }, { id: 15, time: 5 },
        { id: 16, time: 3 }, { id: 17, time: 13 }, { id: 18, time: 5 },
        { id: 19, time: 2 }, { id: 20, time: 3 }, { id: 21, time: 7 }
    ];

    edges = [
        { from: 1, to: 2 }, { from: 1, to: 3 }, { from: 1, to: 4 },
        { from: 2, to: 21 },
        { from: 3, to: 4 },
        { from: 4, to: 5 }, { from: 4, to: 21 },
        { from: 5, to: 6 }, { from: 5, to: 7 }, { from: 5, to: 8 },
        { from: 6, to: 8 },
        { from: 7, to: 8 }, { from: 7, to: 14 },
        { from: 8, to: 9 },
        { from: 9, to: 10 }, { from: 9, to: 11 }, { from: 9, to: 12 }, { from: 9, to: 13 },
        { from: 10, to: 15 },
        { from: 11, to: 15 },
        { from: 12, to: 15 },
        { from: 13, to: 17 }, { from: 13, to: 18 },
        { from: 14, to: 19 },
        { from: 15, to: 16 }, { from: 15, to: 18 },
        { from: 16, to: 17 },
        { from: 17, to: 20 },
        { from: 18, to: 19 }
    ];

    renderNodes();
    renderEdges();
    updateEdgeSelectors();
    drawNetwork();
    cycleTimeInput.value = 21;
    regionCycleTimeInput.value = 21;
    showToast('โหลดตัวอย่าง 21 Nodes สำเร็จ');
}

function clearAll() {
    nodes = [];
    edges = [];
    positionalWeights = {};
    renderNodes();
    renderEdges();
    updateEdgeSelectors();
    pwTableBody.innerHTML = '';
    rankedTableBody.innerHTML = '';
    balanceTableBody.innerHTML = '';
    summaryTableBody.innerHTML = '';
    regionAssignTableBody.innerHTML = '';
    regionStationTableBody.innerHTML = '';
    regionSummaryTableBody.innerHTML = '';
    $('#no-pw').style.display = 'block';
    $('#no-ranked').style.display = 'block';
    $('#balance-result-card').style.display = 'none';
    $('#summary-card').style.display = 'none';
    $('#stats-grid').style.display = 'none';
    $('#region-assign-card').style.display = 'none';
    $('#region-station-card').style.display = 'none';
    $('#region-summary-card').style.display = 'none';
    $('#region-stats-grid').style.display = 'none';
    cycleTimeInput.value = '';
    regionCycleTimeInput.value = '';
    drawNetwork();
    showToast('ล้างข้อมูลทั้งหมดแล้ว');
}

// ---- Toast Notification ----
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 12px 24px;
        border-radius: 12px;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 9999;
        opacity: 0;
        transition: all 0.3s ease;
        backdrop-filter: blur(12px);
        max-width: 90vw;
        text-align: center;
        color: #fff;
        background: ${type === 'error' ? 'rgba(248, 81, 73, 0.85)' : 'rgba(63, 185, 80, 0.85)'};
        border: 1px solid ${type === 'error' ? 'rgba(248, 81, 73, 0.4)' : 'rgba(63, 185, 80, 0.4)'};
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ---- Region Approach (Mansoor) ----
function computeALAPRegions() {
    // Step 1: Build adjacency and compute earliest levels (ASAP)
    const adj = {};
    const inDeg = {};
    nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
    edges.forEach(e => {
        if (adj[e.from]) adj[e.from].push(e.to);
        if (inDeg[e.to] !== undefined) inDeg[e.to]++;
    });

    // ASAP levels (earliest start)
    const asapLevels = {};
    const queue = [];
    nodes.forEach(n => { if (inDeg[n.id] === 0) { queue.push(n.id); asapLevels[n.id] = 0; } });
    let maxLevel = 0;
    const inDegCopy = { ...inDeg };
    while (queue.length > 0) {
        const curr = queue.shift();
        (adj[curr] || []).forEach(next => {
            const newLevel = asapLevels[curr] + 1;
            if (asapLevels[next] === undefined || newLevel > asapLevels[next]) {
                asapLevels[next] = newLevel;
            }
            inDegCopy[next]--;
            if (inDegCopy[next] === 0) queue.push(next);
            if (newLevel > maxLevel) maxLevel = newLevel;
        });
    }

    // Handle isolated nodes
    nodes.forEach(n => { if (asapLevels[n.id] === undefined) asapLevels[n.id] = 0; });

    // Step 2: ALAP levels (latest start)
    // Leaf nodes get ALAP = maxLevel, others = min(ALAP of successors) - 1
    const alapLevels = {};
    // Process in reverse topological order
    const revTopo = [];
    const visited = new Set();
    function dfsPost(nodeId) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        (adj[nodeId] || []).forEach(s => dfsPost(s));
        revTopo.push(nodeId);
    }
    nodes.forEach(n => dfsPost(n.id));

    revTopo.forEach(nId => {
        const succs = adj[nId] || [];
        if (succs.length === 0) {
            alapLevels[nId] = maxLevel;
        } else {
            let minSuccLevel = Infinity;
            succs.forEach(s => {
                if (alapLevels[s] !== undefined && alapLevels[s] < minSuccLevel) {
                    minSuccLevel = alapLevels[s];
                }
            });
            alapLevels[nId] = minSuccLevel - 1;
        }
    });

    return { alapLevels, maxLevel };
}

function performRegionApproach() {
    const ct = parseFloat(regionCycleTimeInput.value);
    if (isNaN(ct) || ct <= 0) return showToast('กรุณาใส่ Cycle Time ที่ถูกต้อง', 'error');
    if (nodes.length === 0) return showToast('กรุณาเพิ่ม Node ก่อน', 'error');

    // Step 1 & 2: Compute ALAP regions
    const { alapLevels, maxLevel } = computeALAPRegions();

    // Group nodes by ALAP region
    const regionGroups = {};
    const timeMap = {};
    nodes.forEach(n => {
        timeMap[n.id] = n.time;
        const r = alapLevels[n.id];
        if (!regionGroups[r]) regionGroups[r] = [];
        regionGroups[r].push(n);
    });

    // Sort tasks within each region by time descending
    const regionKeys = Object.keys(regionGroups).map(Number).sort((a, b) => a - b);
    regionKeys.forEach(r => {
        regionGroups[r].sort((a, b) => b.time - a.time);
    });

    // Roman numeral conversion
    const toRoman = (num) => {
        const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let result = '';
        for (let i = 0; i < vals.length; i++) {
            while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
        }
        return result;
    };

    // Render region assignment table
    $('#region-assign-card').style.display = 'block';
    let regionIdx = 0;
    regionAssignTableBody.innerHTML = regionKeys.map(r => {
        regionIdx++;
        const tasksStr = regionGroups[r].map(n => n.id).join(', ');
        return `<tr>
            <td><strong>${toRoman(regionIdx)}</strong></td>
            <td>${tasksStr}</td>
        </tr>`;
    }).join('');

    // Build ordered task list: by region, then by time desc within region
    const orderedTasks = [];
    regionKeys.forEach(r => {
        regionGroups[r].forEach(n => orderedTasks.push({ id: n.id, time: n.time, region: r }));
    });

    // Build predecessor map
    const predecessors = {};
    nodes.forEach(n => predecessors[n.id] = []);
    edges.forEach(e => {
        if (predecessors[e.to]) predecessors[e.to].push(e.from);
    });

    // Step 3 & 4: Assign tasks to stations (flexible greedy)
    const assigned = new Set();
    const stations = [];
    let stationNum = 1;
    let currentStation = { stationNum, jobs: [] };
    let stationTime = 0;
    const taskQueue = [...orderedTasks];

    while (taskQueue.length > 0) {
        let bestFitIdx = -1;
        let bestFitGap = Infinity;

        // Try to find the best task that fits and has all predecessors assigned
        for (let i = 0; i < taskQueue.length; i++) {
            const task = taskQueue[i];
            const allPredsAssigned = predecessors[task.id].every(p => assigned.has(p));
            if (!allPredsAssigned) continue;

            const newTime = stationTime + task.time;
            if (newTime <= ct) {
                const gap = ct - newTime;
                // Prefer tasks that fill the station closer to CT
                // But also respect the region order (prefer earlier region tasks first)
                if (bestFitIdx === -1) {
                    bestFitIdx = i;
                    bestFitGap = gap;
                } else {
                    // If this task has a gap of 0 (perfect fit), prefer it
                    if (gap === 0) {
                        bestFitIdx = i;
                        bestFitGap = 0;
                        break;
                    }
                    // Otherwise prefer the first eligible task (maintains region order)
                    // unless the current best leaves too much gap and a later task fills better
                    if (gap < bestFitGap && bestFitGap > 0) {
                        // Only swap if the first eligible has already been added or the gap improvement is significant
                    }
                }
                // Use the first eligible task (region order priority)
                break;
            }
        }

        if (bestFitIdx !== -1) {
            const task = taskQueue[bestFitIdx];
            stationTime += task.time;
            currentStation.jobs.push({ id: task.id, time: task.time });
            assigned.add(task.id);
            taskQueue.splice(bestFitIdx, 1);
        } else {
            // No task fits in current station — close it and open new one
            if (currentStation.jobs.length > 0) {
                stations.push(currentStation);
            }
            stationNum++;
            stationTime = 0;
            currentStation = { stationNum, jobs: [] };

            // Force the first eligible task
            let forced = false;
            for (let i = 0; i < taskQueue.length; i++) {
                const task = taskQueue[i];
                if (predecessors[task.id].every(p => assigned.has(p))) {
                    stationTime += task.time;
                    currentStation.jobs.push({ id: task.id, time: task.time });
                    assigned.add(task.id);
                    taskQueue.splice(i, 1);
                    forced = true;
                    break;
                }
            }
            if (!forced && taskQueue.length > 0) {
                showToast('ไม่สามารถจัดสมดุลได้ — ตรวจสอบ Precedence', 'error');
                return;
            }
        }

        // After assigning a task, try to fill remaining gap with later tasks
        if (stationTime < ct && taskQueue.length > 0) {
            let filled = true;
            while (filled && stationTime < ct) {
                filled = false;
                // Search for tasks that fill the remaining gap, preferring perfect or near-perfect fit
                let bestIdx = -1;
                let bestGap = Infinity;
                for (let i = 0; i < taskQueue.length; i++) {
                    const task = taskQueue[i];
                    if (!predecessors[task.id].every(p => assigned.has(p))) continue;
                    const newTime = stationTime + task.time;
                    if (newTime <= ct) {
                        const gap = ct - newTime;
                        if (gap < bestGap) {
                            bestGap = gap;
                            bestIdx = i;
                        }
                        if (gap === 0) break;
                    }
                }
                if (bestIdx !== -1) {
                    const task = taskQueue[bestIdx];
                    stationTime += task.time;
                    currentStation.jobs.push({ id: task.id, time: task.time });
                    assigned.add(task.id);
                    taskQueue.splice(bestIdx, 1);
                    filled = true;
                }
            }
        }

        // If station is full or no more tasks fit, close station when next iteration finds no fit
    }

    if (currentStation.jobs.length > 0) {
        stations.push(currentStation);
    }

    // Render results
    renderRegionStationTable(stations, ct);
    renderRegionSummaryTable(stations, ct);
    renderRegionEfficiency(stations, ct);
    showToast(`Region Approach — ${stations.length} สถานีงาน ✓`);
}

function renderRegionStationTable(stations, ct) {
    $('#region-station-card').style.display = 'block';
    regionStationTableBody.innerHTML = stations.map(s => {
        const stTime = s.jobs.reduce((sum, j) => sum + j.time, 0);
        const jobIds = s.jobs.map(j => j.id).join(', ');
        return `<tr>
            <td><strong>${s.stationNum}</strong></td>
            <td>${jobIds}</td>
            <td>${stTime}</td>
        </tr>`;
    }).join('');
}

function renderRegionSummaryTable(stations, ct) {
    $('#region-summary-card').style.display = 'block';
    const totalTime = nodes.reduce((sum, n) => sum + n.time, 0);
    let html = '';
    stations.forEach(s => {
        const stTime = s.jobs.reduce((sum, j) => sum + j.time, 0);
        const eff = ((stTime / ct) * 100).toFixed(2);
        const jobIds = s.jobs.map(j => j.id).join(', ');
        html += `<tr>
            <td><strong>${s.stationNum}</strong></td>
            <td>${jobIds}</td>
            <td>${stTime}</td>
            <td>${eff}</td>
        </tr>`;
    });
    const lineEff = ((totalTime / (ct * stations.length)) * 100).toFixed(2);
    html += `<tr style="border-top: 2px solid var(--accent-3); font-weight: 700;">
        <td>Total</td><td></td><td>${totalTime}</td><td></td>
    </tr>`;
    html += `<tr style="font-weight: 700;">
        <td colspan="3" style="text-align:right;">Line Efficiency %</td>
        <td style="color: var(--accent-3); font-size: 1.1rem;">${lineEff}</td>
    </tr>`;
    regionSummaryTableBody.innerHTML = html;
}

function renderRegionEfficiency(stations, ct) {
    $('#region-stats-grid').style.display = 'grid';
    const totalTime = nodes.reduce((sum, n) => sum + n.time, 0);
    const M = stations.length;
    const lineEff = ((totalTime / (ct * M)) * 100).toFixed(2);
    $('#region-stat-stations').textContent = M;
    $('#region-stat-ct').textContent = ct + ' นาที';
    $('#region-stat-total-time').textContent = totalTime + ' นาที';
    $('#region-stat-line-eff').textContent = lineEff + '%';
}

// ---- Resize handler ----
window.addEventListener('resize', () => drawNetwork());

// ---- Initial draw ----
drawNetwork();
