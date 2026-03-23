/* =========================================
   Target Line Efficiency Optimizer
   Core Application Logic
   ========================================= */

// ---- Data Store ----
let nodes = []; // { id: number, time: number }
let edges = []; // { from: number, to: number }

// ---- DOM References ----
const $ = (sel) => document.querySelector(sel);
const nodeIdInput = $('#node-id');
const nodeTimeInput = $('#node-time');
const addNodeBtn = $('#add-node-btn');
const edgeFromInput = $('#edge-from');
const edgeToInput = $('#edge-to');
const addEdgeBtn = $('#add-edge-btn');
const nodesTableBody = $('#nodes-table tbody');
const edgesTableBody = $('#edges-table tbody');
const loadExampleBtn = $('#load-example-btn');
const clearAllBtn = $('#clear-all-btn');
const canvas = $('#network-canvas');
const ctx = canvas.getContext('2d');

const targetEffInput = $('#target-efficiency');
const fixedCtInput = $('#fixed-cycle-time');
const optimizeBtn = $('#optimize-btn');

const searchStatus = $('#search-status');
const resultCard = $('#optimize-result-card');
const failedCard = $('#optimize-failed-card');
const optBalanceTableBody = $('#optimize-balance-table tbody');
const optSummaryTableBody = $('#optimize-summary-table tbody');

// ---- Event Listeners ----
addNodeBtn.addEventListener('click', addNode);
addEdgeBtn.addEventListener('click', addEdge);
loadExampleBtn.addEventListener('click', loadExample);
clearAllBtn.addEventListener('click', clearAll);
optimizeBtn.addEventListener('click', () => {
    // Run asynchronously to allow UI to show "Searching..."
    searchStatus.style.display = 'block';
    resultCard.style.display = 'none';
    failedCard.style.display = 'none';
    setTimeout(performOptimization, 100);
});
targetEffInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { optimizeBtn.click(); } });
fixedCtInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { optimizeBtn.click(); } });

// Enter key support
nodeIdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { nodeTimeInput.focus(); } });
nodeTimeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addNode(); });
edgeFromInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { edgeToInput.focus(); } });
edgeToInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addEdge(); });

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
    drawNetwork();
    showToast(`เพิ่มขั้นตอน ${id} (t=${time}) สำเร็จ`);
}

function removeNode(id) {
    nodes = nodes.filter(n => n.id !== id);
    edges = edges.filter(e => e.from !== id && e.to !== id);
    renderNodes();
    renderEdges();
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
    const from = parseInt(edgeFromInput.value);
    const toInputVal = edgeToInput.value.trim();

    if (isNaN(from)) return showToast('กรุณาระบุ Node ต้นทาง', 'error');
    if (!toInputVal) return showToast('กรุณาระบุ Node ปลายทาง', 'error');

    if (!nodes.find(n => n.id === from)) return showToast(`ไม่พบ Node ต้นทาง: ${from}`, 'error');

    const toNodes = toInputVal.split(',').map(val => parseInt(val.trim())).filter(val => !isNaN(val));
    if (toNodes.length === 0) return showToast('กรุณาระบุ Node ปลายทางให้ถูกต้อง', 'error');

    let addedCount = 0;

    for (const to of toNodes) {
        if (!nodes.find(n => n.id === to)) {
            showToast(`ไม่พบ Node ปลายทาง: ${to}`, 'error');
            continue;
        }
        if (from === to) {
            showToast(`ต้นทางและปลายทางต้องไม่ซ้ำกัน (${from} → ${to})`, 'error');
            continue;
        }
        if (edges.find(e => e.from === from && e.to === to)) {
            showToast(`ความสัมพันธ์ ${from} → ${to} มีอยู่แล้ว`, 'error');
            continue;
        }

        edges.push({ from, to });
        addedCount++;
    }

    if (addedCount > 0) {
        renderEdges();
        drawNetwork();
        showToast(`เพิ่มความสัมพันธ์ ${addedCount} รายการ สำเร็จ`);
        edgeToInput.value = '';
        edgeFromInput.focus();
    }
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


// ---- Helper Algorithms ----

function computePositionalWeights() {
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
        if (adj[e.from]) adj[e.from].push(e.to);
    });

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

    let pw = {};
    nodes.forEach(n => {
        const successors = getAllSuccessors(n.id);
        let w = n.time;
        successors.forEach(sId => w += (timeMap[sId] || 0));
        pw[n.id] = w;
    });
    return pw;
}

function getPredecessorsMap() {
    const p = {};
    nodes.forEach(n => p[n.id] = []);
    edges.forEach(e => {
        if (p[e.to]) p[e.to].push(e.from);
    });
    return p;
}

function balanceLine(orderedTasksList, predecessors, ct) {
    const assigned = new Set();
    const stations = [];
    let stationNum = 1;

    while (assigned.size < nodes.length) {
        let stationJobs = [];
        let sTime = 0;

        const remaining = orderedTasksList.filter(t => !assigned.has(t.id));
        for (const task of remaining) {
            const allPredsAssigned = predecessors[task.id].every(p => assigned.has(p));
            if (!allPredsAssigned) continue;

            if (sTime + task.time <= ct) {
                sTime += task.time;
                stationJobs.push({ id: task.id, time: task.time });
                assigned.add(task.id);
            }
        }

        if (stationJobs.length === 0) {
            return null; // Cannot balance, e.g., task time > cycle time or cyclic dependency
        }

        stations.push({ stationNum, jobs: stationJobs });
        stationNum++;
    }
    return stations;
}

function computeEfficiency(stations, ct, totalTime) {
    if (!stations) return 0;
    const M = stations.length;
    return (totalTime / (ct * M)) * 100;
}

function generateRandomTopologicalSort(nodes, predecessors) {
    let available = [];
    let assigned = new Set();
    let result = [];
    
    nodes.forEach(n => {
        if (predecessors[n.id].length === 0) available.push(n);
    });
    
    while(available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        const chosen = available[idx];
        available.splice(idx, 1);
        
        result.push({ id: chosen.id, time: chosen.time });
        assigned.add(chosen.id);
        
        nodes.forEach(n => {
            if (!assigned.has(n.id) && !available.find(a => a.id === n.id)) {
                if (predecessors[n.id].every(p => assigned.has(p))) {
                    available.push(n);
                }
            }
        });
    }
    return result;
}

function balanceLineStationOriented(nodes, predecessors, ct, pw) {
    const assigned = new Set();
    const stations = [];
    let stationNum = 1;
    let maxIterations = 5000;

    while (assigned.size < nodes.length) {
        let bestSubset = [];
        let bestSum = -1;
        let bestScore = -1; 
        let iterations = 0;

        function dfs(currentSubset, currentSum, currentScore, currentAssigned) {
            iterations++;
            if (iterations > maxIterations) return;

            let available = [];
            for (const n of nodes) {
                if (!currentAssigned.has(n.id)) {
                    if (predecessors[n.id].every(p => currentAssigned.has(p))) {
                        available.push(n);
                    }
                }
            }

            let extended = false;
            for (const n of available) {
                if (currentSum + n.time <= ct) {
                    extended = true;
                    currentAssigned.add(n.id);
                    currentSubset.push(n);
                    
                    dfs(currentSubset, currentSum + n.time, currentScore + (pw[n.id] || 0), currentAssigned);
                    
                    currentSubset.pop();
                    currentAssigned.delete(n.id);
                }
            }

            if (!extended) {
                if (currentSum > bestSum || (currentSum === bestSum && currentScore > bestScore)) {
                    bestSum = currentSum;
                    bestScore = currentScore;
                    bestSubset = [...currentSubset];
                }
            }
        }

        let tempAssigned = new Set(assigned);
        dfs([], 0, 0, tempAssigned);

        if (bestSubset.length === 0) return null; 

        let stationJobs = [];
        for (const n of bestSubset) {
            assigned.add(n.id);
            stationJobs.push({ id: n.id, time: n.time });
        }
        stations.push({ stationNum, jobs: stationJobs });
        stationNum++;
    }
    return stations;
}


// ---- Target Optimization ----

function performOptimization() {
    searchStatus.style.display = 'none';
    const targetEffStr = targetEffInput.value.trim();
    const fixedCtStr = fixedCtInput.value.trim();
    
    // Parse values
    const targetEff = targetEffStr !== '' ? parseFloat(targetEffStr) : 0;
    const fixedCt = fixedCtStr !== '' ? parseFloat(fixedCtStr) : 0;

    if (nodes.length === 0) {
        return showToast('กรุณาเพิ่ม Node ก่อน', 'error');
    }
    
    if (targetEffStr !== '' && (isNaN(targetEff) || targetEff <= 0 || targetEff > 100)) {
        return showToast('กรุณาใส่ Target Efficiency (0 - 100) ที่ถูกต้อง', 'error');
    }
    if (fixedCtStr !== '' && (isNaN(fixedCt) || fixedCt <= 0)) {
        return showToast('กรุณาใส่ Cycle Time ที่ถูกต้อง', 'error');
    }
    if (targetEffStr === '' && fixedCtStr === '') {
        return showToast('กรุณากำหนด Target Efficiency หรือ Cycle Time อย่างน้อย 1 ค่า', 'error');
    }

    const totalTime = nodes.reduce((sum, n) => sum + n.time, 0);
    const maxTime = Math.max(...nodes.map(n => n.time));
    
    if (fixedCt > 0 && fixedCt < maxTime) {
        return showToast(`Cycle Time ต้องไม่น้อยกว่าเวลาที่มากที่สุดใน Node (${maxTime} นาที)`, 'error');
    }
    
    const predecessors = getPredecessorsMap();
    
    const pw = computePositionalWeights();
    const rankedHB = nodes.map(n => ({ id: n.id, time: n.time, w: pw[n.id] }))
                          .sort((a, b) => b.w - a.w || b.time - a.time);

    const rankedLCR = nodes.map(n => ({ id: n.id, time: n.time }))
                           .sort((a, b) => b.time - a.time);

    let bestResult = null;
    let found = false;
    
    let hasDecimals = nodes.some(n => !Number.isInteger(n.time));
    let step = hasDecimals ? 0.1 : 1;

    const candidateLists = [rankedHB, rankedLCR];

    let startCt = fixedCt > 0 ? fixedCt : maxTime;
    let endCt = fixedCt > 0 ? fixedCt : totalTime;
    let localBestForCt = null;

    for (let ct = startCt; ct <= endCt; ct += step) {
        ct = Math.round(ct * 10) / 10;
        
        let possibleStations = [];

        // 1. Traditional greedy lists (HB, LCR)
        for (const orderList of candidateLists) {
            let s = balanceLine(orderList, predecessors, ct);
            if (s) possibleStations.push(s);
        }

        // 2. Station-Oriented Algorithm (DFS to perfectly pack bins mimicking human logic)
        let soStations = balanceLineStationOriented(nodes, predecessors, ct, pw);
        if (soStations) possibleStations.push(soStations);

        // 3. Random Topological Sorts Monte Carlo (100 iterations per CT)
        for (let i = 0; i < 100; i++) {
            let rndOrder = generateRandomTopologicalSort(nodes, predecessors);
            let s = balanceLine(rndOrder, predecessors, ct);
            if (s) possibleStations.push(s);
        }

        for (const stations of possibleStations) {
            const eff = computeEfficiency(stations, ct, totalTime);
            
            if (targetEff > 0) {
                if (eff >= targetEff) {
                    bestResult = { ct, stations, eff };
                    found = true;
                    break;
                }
            } else {
                if (!localBestForCt || eff > localBestForCt.eff) {
                    localBestForCt = { ct, stations, eff };
                }
            }
        }
        if (found) break; 
        
        // If we are looking for best efficiency within a specified Cycle Time without a target
        if (targetEff === 0 && fixedCt > 0 && localBestForCt) {
            bestResult = localBestForCt;
            found = true;
            break;
        }
    }

    if (found && bestResult) {
        renderOptimizationResult(bestResult.stations, bestResult.ct, bestResult.eff, totalTime);
        showToast('ค้นหาการจัดรูปแบบสำเร็จ!');
    } else {
        if (targetEff > 0 && fixedCt > 0) {
            $('#failed-target').textContent = `Target ${targetEff}% ด้วย CT ${fixedCt} นาที`;
        } else if (targetEff > 0) {
            $('#failed-target').textContent = `Target ${targetEff}%`;
        } else {
            $('#failed-target').textContent = `Cycle Time แบบที่ระบุ`;
        }
        failedCard.style.display = 'block';
        showToast('ไม่พบรูปแบบการจัดสายการผลิตตามเป้าหมาย', 'error');
    }
}

function renderOptimizationResult(stations, ct, eff, totalTime) {
    resultCard.style.display = 'block';
    $('#opt-found-ct').textContent = ct;
    $('#opt-found-m').textContent = stations.length;
    $('#opt-found-eff').textContent = eff.toFixed(2) + '%';
    
    let htmlBalance = '';
    let isFirstRow = true;
    stations.forEach(s => {
        const stTime = s.jobs.reduce((sum, j) => sum + j.time, 0);
        const stEff = ((stTime / ct) * 100).toFixed(2);
        s.jobs.forEach((job, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === s.jobs.length - 1;
            const rowClass = isFirst ? 'station-first' : '';
            const stationLabel = isFirst ? `<strong>${s.stationNum}</strong>` : '';
            const stTimeLabel = isLast ? stTime : '';
            const effLabel = isLast ? stEff : '';
            const ctLabel = isFirstRow ? ct : '';
            htmlBalance += `<tr class="${rowClass}">
                <td>${stationLabel}</td>
                <td>${job.id}</td>
                <td>${job.time}</td>
                <td>${stTimeLabel}</td>
                <td>${effLabel}</td>
                <td>${ctLabel}</td>
            </tr>`;
            isFirstRow = false;
        });
    });
    // Total row
    htmlBalance += `<tr style="border-top: 2px solid var(--accent-1); font-weight: 700;">
        <td>Total</td><td></td><td>${totalTime}</td><td>${totalTime}</td><td></td><td></td>
    </tr>`;
    optBalanceTableBody.innerHTML = htmlBalance;

    let htmlSummary = '';
    stations.forEach(s => {
        const stTime = s.jobs.reduce((sum, j) => sum + j.time, 0);
        const stEff = ((stTime / ct) * 100).toFixed(2);
        const jobIds = s.jobs.map(j => j.id).join(', ');
        htmlSummary += `<tr>
            <td><strong>${s.stationNum}</strong></td>
            <td>${jobIds}</td>
            <td>${stTime}</td>
            <td>${stEff}</td>
        </tr>`;
    });
    // Total row
    htmlSummary += `<tr style="border-top: 2px solid var(--accent-1); font-weight: 700;">
        <td>Total</td>
        <td></td>
        <td>${totalTime}</td>
        <td></td>
    </tr>`;
    optSummaryTableBody.innerHTML = htmlSummary;
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
            if (inDeg[next] === 0) queue.push(next);
            if (newLevel > maxLevel) maxLevel = newLevel;
        });
    }

    nodes.forEach(n => { if (levels[n.id] === undefined) levels[n.id] = 0; });

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

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

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

    nodes.forEach(n => {
        const pos = positions[n.id];
        if (!pos) return;
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#161b22';
        ctx.fill();
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#e6edf3';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.id.toString(), pos.x, pos.y);

        ctx.fillStyle = '#d29922';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`t=${n.time}`, pos.x, pos.y - nodeRadius - 10);
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
    drawNetwork();
    targetEffInput.value = 85; 
    showToast('โหลดตัวอย่าง 21 Nodes สำเร็จ');
}

function clearAll() {
    nodes = [];
    edges = [];
    renderNodes();
    renderEdges();
    targetEffInput.value = '';
    fixedCtInput.value = '';
    resultCard.style.display = 'none';
    failedCard.style.display = 'none';
    optBalanceTableBody.innerHTML = '';
    optSummaryTableBody.innerHTML = '';
    drawNetwork();
    showToast('ล้างข้อมูลทั้งหมดแล้ว');
}

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
