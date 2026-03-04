let activities = [];

// DOM Elements
const form = document.getElementById('activity-form');
const inputTableBody = document.getElementById('input-tbody');
const btnCalculate = document.getElementById('btn-calculate');
const btnClear = document.getElementById('btn-clear');
const btnLoadExample = document.getElementById('btn-load-example');
const resultsWrapper = document.getElementById('results-wrapper');
const resultsTableBody = document.getElementById('results-tbody');
const errorMsg = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const diagramContainer = document.getElementById('mermaid-diagram');
const statDuration = document.getElementById('stat-duration');
const statPath = document.getElementById('stat-path');

// Event Listeners
form.addEventListener('submit', addActivity);
btnClear.addEventListener('click', clearAll);
btnLoadExample.addEventListener('click', loadExample);
btnCalculate.addEventListener('click', calculateCPM);

// Tab Listeners
document.addEventListener('click', e => {
    if (e.target.closest('.tab-btn')) {
        const btn = e.target.closest('.tab-btn');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    }
});

// Add Activity
function addActivity(e) {
    e.preventDefault();

    const id = document.getElementById('act-id').value.trim();
    const name = document.getElementById('act-name').value.trim();
    const durationStr = document.getElementById('act-duration').value;
    const duration = parseFloat(durationStr);
    const predsStr = document.getElementById('act-preds').value.trim();

    if (!id) return showError("Activity ID is required");
    if (activities.some(a => a.id === id)) return showError(`Activity ID '${id}' already exists`);
    if (isNaN(duration) || duration < 0) return showError("Duration must be a positive number");

    // Parse predecessors
    let preds = [];
    if (predsStr) {
        preds = predsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
    }

    // Valiate preds exist
    for (let p of preds) {
        if (!activities.some(a => a.id === p)) {
            return showError(`Predecessor '${p}' has not been added yet. Add it first!`);
        }
    }

    activities.push({
        id,
        name: name || id,
        duration,
        predecessors: preds
    });

    form.reset();
    document.getElementById('act-id').focus();
    hideError();
    updateInputTable();
}

function deleteActivity(id) {
    // Check if it's a predecessor for another activity
    const dependent = activities.find(a => a.predecessors.includes(id));
    if (dependent) {
        showError(`Cannot delete '${id}' because '${dependent.id}' depends on it.`);
        return;
    }

    activities = activities.filter(a => a.id !== id);
    updateInputTable();
}

function clearAll() {
    activities = [];
    updateInputTable();
    hideResults();
}

// Update Input Table UI
function updateInputTable() {
    inputTableBody.innerHTML = '';

    if (activities.length === 0) {
        inputTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">No activities added yet.</td></tr>';
        btnCalculate.disabled = true;
        return;
    }

    activities.forEach(act => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${act.id}</strong></td>
            <td>${act.name}</td>
            <td>${act.duration}</td>
            <td>${act.predecessors.length > 0 ? act.predecessors.join(', ') : '-'}</td>
            <td>
                <button type="button" class="btn-danger btn-sm" onclick="deleteActivity('${act.id}')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </td>
        `;
        inputTableBody.appendChild(tr);
    });

    btnCalculate.disabled = false;
}

// Load Example from the image provided by user
function loadExample() {
    activities = [
        { id: "1", name: "ออกแบบและเสนอขออนุมัติเงินกู้", duration: 3, predecessors: [] },
        { id: "2", name: "ปรับพื้น", duration: 2, predecessors: ["1"] },
        { id: "3", name: "สั่งวัสดุ", duration: 1, predecessors: ["1"] },
        { id: "4", name: "ก่อสร้าง", duration: 3, predecessors: ["2", "3"] },
        { id: "5", name: "เลือกสี", duration: 1, predecessors: ["3"] },
        { id: "6", name: "เลือกพรม", duration: 1, predecessors: ["5"] },
        { id: "7", name: "เก็บงาน", duration: 1, predecessors: ["4", "6"] }
    ];
    updateInputTable();
    hideError();
}

function showError(msg) {
    errorText.textContent = msg;
    errorMsg.classList.remove('hidden');
    // Scroll to error if needed
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
    errorMsg.classList.add('hidden');
}

function hideResults() {
    resultsWrapper.classList.add('hidden');
    document.getElementById('aon-diagram').innerHTML = '<div class="placeholder-text">Add activities and calculate to see the AON diagram.</div>';
    document.getElementById('aoa-diagram').innerHTML = '<div class="placeholder-text">Add activities and calculate to see the AOA diagram.</div>';
}

// Core CPM Algorithm
function calculateCPM() {
    hideError();

    // Setup data structures
    const n = activities.length;
    let adj = {}; // successors map
    let inDegree = {};
    let nodeMap = {};

    activities.forEach(a => {
        adj[a.id] = [];
        inDegree[a.id] = 0;
        nodeMap[a.id] = { ...a, es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false };
    });

    // Build Graph
    activities.forEach(a => {
        a.predecessors.forEach(p => {
            if (adj[p]) {
                adj[p].push(a.id);
                inDegree[a.id]++;
            }
        });
    });

    // Topological Sort implementation utilizing Kahn's Algorithm
    let queue = [];
    let topoOrder = [];

    for (let id in inDegree) {
        if (inDegree[id] === 0) {
            queue.push(id);
        }
    }

    while (queue.length > 0) {
        let u = queue.shift();
        topoOrder.push(u);

        adj[u].forEach(v => {
            inDegree[v]--;
            if (inDegree[v] === 0) {
                queue.push(v);
            }
        });
    }

    if (topoOrder.length !== n) {
        return showError("Cycle detected in the project network! Invalid dependencies.");
    }

    // Forward Pass
    let maxProjectEF = 0;
    topoOrder.forEach(u => {
        let node = nodeMap[u];
        let maxPredEF = 0;

        node.predecessors.forEach(p => {
            if (nodeMap[p].ef > maxPredEF) {
                maxPredEF = nodeMap[p].ef;
            }
        });

        node.es = maxPredEF;
        node.ef = node.es + node.duration;

        if (node.ef > maxProjectEF) {
            maxProjectEF = node.ef;
        }
    });

    // Backward Pass
    // Initialize LF for all nodes, default is maxProjectEF. We start from end of topological sort
    activities.forEach(a => {
        nodeMap[a.id].lf = maxProjectEF;
    });

    for (let i = topoOrder.length - 1; i >= 0; i--) {
        let u = topoOrder[i];
        let node = nodeMap[u];

        // If it has successors, LF is minimum LS of successors
        let successors = adj[u];
        if (successors.length > 0) {
            let minSuccLS = Infinity;
            successors.forEach(v => {
                if (nodeMap[v].ls < minSuccLS) {
                    minSuccLS = nodeMap[v].ls;
                }
            });
            node.lf = minSuccLS;
        }

        node.ls = node.lf - node.duration;
        node.slack = node.ls - node.es;

        if (node.slack === 0) {
            node.isCritical = true;
        }
    }

    renderResults(nodeMap, topoOrder, maxProjectEF);
    renderDiagram(nodeMap, adj);
}

function renderResults(nodeMap, topoOrder, projectDuration) {
    resultsWrapper.classList.remove('hidden');
    resultsTableBody.innerHTML = '';

    let criticalEntities = [];

    topoOrder.forEach(id => {
        let node = nodeMap[id];
        if (node.isCritical) criticalEntities.push(id);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${node.id}</strong> <span style="font-size:0.8em; color:var(--text-muted); display:block">${node.name !== node.id ? node.name : ''}</span></td>
            <td>${node.duration}</td>
            <td>${node.es}</td>
            <td><strong>${node.ef}</strong></td>
            <td>${node.ls}</td>
            <td><strong>${node.lf}</strong></td>
            <td>${node.slack}</td>
            <td>
                ${node.isCritical ?
                '<span class="badge-critical">Critical</span>' :
                '<span class="badge-normal">Normal</span>'}
            </td>
        `;
        resultsTableBody.appendChild(tr);
    });

    statDuration.textContent = projectDuration;
    statPath.textContent = criticalEntities.join(' → ');

    // Scroll to results seamlessly
    resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderDiagram(nodeMap, adj) {
    const aonContainer = document.getElementById('aon-diagram');
    const aoaContainer = document.getElementById('aoa-diagram');

    aonContainer.innerHTML = '<div class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> Generating AON Diagram...</div>';
    aoaContainer.innerHTML = '<div class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> Generating AOA Diagram...</div>';

    // 1. Generate AON (Activity on Node)
    let aonGraph = 'graph LR\n';
    for (let id in nodeMap) {
        let node = nodeMap[id];
        let cClass = node.isCritical ? ' critical' : '';
        let labelHTML = `"<div class='cpm-node${cClass}'>` +
            `<div class='cpm-row'><div class='cpm-cell' title='Activity ID'>${node.id}</div><div class='cpm-cell' title='Earliest Start'>${node.es}</div><div class='cpm-cell' title='Earliest Finish'>${node.ef}</div></div>` +
            `<div class='cpm-row'><div class='cpm-cell' title='Duration'>${node.duration}</div><div class='cpm-cell' title='Latest Start'>${node.ls}</div><div class='cpm-cell' title='Latest Finish'>${node.lf}</div></div>` +
            `</div>"`;
        aonGraph += `    ${id}[${labelHTML}]\n`;
        aonGraph += `    style ${id} fill:none,stroke:none\n`;
    }
    for (let u in adj) {
        adj[u].forEach(v => {
            if (nodeMap[u].isCritical && nodeMap[v].isCritical) {
                aonGraph += `    ${u} ==> ${v}\n`;
            } else {
                aonGraph += `    ${u} --> ${v}\n`;
            }
        });
    }

    // 2. Generate AOA (Activity on Arrow)
    let aoaGraph = 'graph LR\n';
    let { nodes, edges } = generateAOA(activities);
    let eventMap = {};
    let evCounter = 1;
    let topoNodes = findTopoOrder(nodes, edges);
    topoNodes.forEach(n => {
        eventMap[n] = evCounter++;
        aoaGraph += `    ${n}(( ${eventMap[n]} ))\n`;
        aoaGraph += `    style ${n} fill:#f8fafc,stroke:#333,stroke-width:2px,color:#000\n`;
    });

    edges.forEach(e => {
        if (e.type === 'activity') {
            let isCrit = nodeMap[e.id].isCritical;
            let label = `${e.name !== e.id ? e.name : e.id} (${e.duration})`;
            if (isCrit) {
                aoaGraph += `    ${e.from} == "${label}" ==> ${e.to}\n`;
            } else {
                aoaGraph += `    ${e.from} -- "${label}" --> ${e.to}\n`;
            }
        } else {
            aoaGraph += `    ${e.from} -. "Dummy" .-> ${e.to}\n`;
        }
    });

    let renderFn = async () => {
        if (!window.mermaidRenderer) {
            let msg = '<div class="error-message">Mermaid library not loaded yet. Click recalculate.</div>';
            aonContainer.innerHTML = msg;
            aoaContainer.innerHTML = msg;
            return;
        }

        try {
            const { svg: aonSvg } = await window.mermaidRenderer.render('aon-graph-svg', aonGraph);
            aonContainer.innerHTML = aonSvg;
            const aonSvgEl = aonContainer.querySelector('svg');
            if (aonSvgEl) { aonSvgEl.style.maxWidth = '100%'; aonSvgEl.style.height = 'auto'; }
        } catch (e) {
            console.error("AON Error:", e);
            aonContainer.innerHTML = `<div class="error-message">Error generating AON diagram: <br> ${e.message}</div>`;
        }

        try {
            const { svg: aoaSvg } = await window.mermaidRenderer.render('aoa-graph-svg', aoaGraph);
            aoaContainer.innerHTML = aoaSvg;
            const aoaSvgEl = aoaContainer.querySelector('svg');
            if (aoaSvgEl) { aoaSvgEl.style.maxWidth = '100%'; aoaSvgEl.style.height = 'auto'; }
        } catch (e) {
            console.error("AOA Error:", e);
            aoaContainer.innerHTML = `<div class="error-message">Error generating AOA diagram: <br> ${e.message}</div>`;
        }
    };

    if (window.mermaidRenderer) await renderFn();
    else setTimeout(renderFn, 500);
}

function findTopoOrder(nodes, edges) {
    let inDep = {};
    let adj = {};
    nodes.forEach(n => { inDep[n] = 0; adj[n] = []; });
    edges.forEach(e => {
        adj[e.from].push(e.to);
        inDep[e.to]++;
    });
    let q = [];
    nodes.forEach(n => { if (inDep[n] === 0) q.push(n); });
    let res = [];
    while (q.length > 0) {
        let u = q.shift();
        res.push(u);
        adj[u].forEach(v => {
            inDep[v]--;
            if (inDep[v] === 0) q.push(v);
        });
    }
    return res.length === nodes.length ? res : nodes;
}

function generateAOA(activities) {
    if (activities.length === 0) return { nodes: [], edges: [] };
    let nodes = [];
    let edges = [];
    let nodeIdCounter = 1;
    const createNode = () => { let id = 'n' + nodeIdCounter++; nodes.push(id); return id; };

    let actNodes = {};
    activities.forEach(a => {
        actNodes[a.id] = { start: createNode(), end: createNode(), act: a };
        edges.push({ from: actNodes[a.id].start, to: actNodes[a.id].end, type: 'activity', id: a.id, name: a.name, duration: a.duration });
    });

    let startNode = createNode();
    let endNode = createNode();

    activities.forEach(a => {
        if (a.predecessors.length === 0) {
            edges.push({ from: startNode, to: actNodes[a.id].start, type: 'dummy' });
        } else {
            a.predecessors.forEach(p => {
                edges.push({ from: actNodes[p].end, to: actNodes[a.id].start, type: 'dummy' });
            });
        }
    });

    let hasSucc = {};
    activities.forEach(a => {
        a.predecessors.forEach(p => hasSucc[p] = true);
    });
    activities.forEach(a => {
        if (!hasSucc[a.id]) {
            edges.push({ from: actNodes[a.id].end, to: endNode, type: 'dummy' });
        }
    });

    // Reduction loop
    let changed = true;
    while (changed) {
        changed = false;
        let outCount = {}, inCount = {};
        edges.forEach(e => {
            outCount[e.from] = (outCount[e.from] || 0) + 1;
            inCount[e.to] = (inCount[e.to] || 0) + 1;
        });

        for (let i = 0; i < edges.length; i++) {
            let e = edges[i];
            if (e.type === 'dummy') {
                if (outCount[e.from] === 1 || inCount[e.to] === 1) {
                    let U = e.from, V = e.to;
                    let realEdges = edges.filter(ed => ed.type === 'activity');
                    let pairs = new Set();
                    let duplicate = false;
                    for (let re of realEdges) {
                        let from = re.from === V ? U : re.from;
                        let to = re.to === V ? U : re.to;
                        let signature = from + '->' + to;
                        if (pairs.has(signature)) { duplicate = true; break; }
                        pairs.add(signature);
                    }

                    let pathExists = false;
                    if (!duplicate) {
                        let adj = {}; nodes.forEach(n => adj[n] = []);
                        edges.forEach(ed => { if (ed !== e) adj[ed.from].push(ed.to); });
                        let q = [U];
                        let visited = new Set([U]);
                        while (q.length > 0) {
                            let curr = q.shift();
                            if (curr === V) { pathExists = true; break; }
                            adj[curr].forEach(nxt => {
                                if (!visited.has(nxt)) { visited.add(nxt); q.push(nxt); }
                            });
                        }
                    }

                    if (!duplicate && !pathExists) {
                        edges.splice(i, 1);
                        edges.forEach(ed => {
                            if (ed.from === V) ed.from = U;
                            if (ed.to === V) ed.to = U;
                        });
                        nodes = nodes.filter(n => n !== V);
                        changed = true;
                        break;
                    }
                }
            }
        }
    }

    // Eliminate Transitive Dummies
    changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < edges.length; i++) {
            let e = edges[i];
            if (e.type === 'dummy') {
                let adj = {}; nodes.forEach(n => adj[n] = []);
                edges.forEach((ed, idx) => { if (idx !== i) adj[ed.from].push(ed.to); });
                let q = [e.from];
                let visited = new Set([e.from]);
                let redundant = false;
                while (q.length > 0) {
                    let curr = q.shift();
                    if (curr === e.to) { redundant = true; break; }
                    adj[curr].forEach(nxt => {
                        if (!visited.has(nxt)) { visited.add(nxt); q.push(nxt); }
                    });
                }
                if (redundant) {
                    edges.splice(i, 1);
                    changed = true;
                    break;
                }
            }
        }
    }

    edges = edges.filter(e => !(e.type === 'dummy' && e.from === e.to));
    let connected = new Set();
    edges.forEach(e => { connected.add(e.from); connected.add(e.to); });
    nodes = nodes.filter(n => connected.has(n));

    return { nodes, edges };
}
