document.addEventListener('DOMContentLoaded', () => {
    // Demo data based on the provided textbook problem
    const demoData = [
        { id: "a", preds: "", a: 6, m: 8, b: 10 },
        { id: "b", preds: "", a: 3, m: 6, b: 9 },
        { id: "c", preds: "", a: 1, m: 3, b: 5 },
        { id: "d", preds: "a", a: 2, m: 4, b: 12 },
        { id: "f", preds: "b", a: 2, m: 3, b: 4 },
        { id: "g", preds: "c", a: 3, m: 4, b: 5 },
        { id: "h", preds: "c", a: 2, m: 2, b: 2 },
        { id: "i", preds: "a, f, g", a: 3, m: 7, b: 11 },
        { id: "j", preds: "a, f, g", a: 2, m: 4, b: 6 },
        { id: "l", preds: "d", a: 1, m: 4, b: 7 },
        { id: "m", preds: "i, h, j", a: 1, m: 10, b: 13 }
    ];

    const tbody = document.querySelector("#activityTable tbody");
    const addRowBtn = document.getElementById('addRowBtn');
    const resetBtn = document.getElementById('resetBtn');
    const calculateBtn = document.getElementById('calculateBtn');
    const addDemoDataBtn = document.getElementById('addDemoDataBtn');
    const resultsSection = document.getElementById('resultsSection');

    let network = null; // Store vis.js network instance

    // Initialize with demo data on load
    loadData(demoData);

    // Event Listeners
    addRowBtn.addEventListener('click', () => addRow());

    resetBtn.addEventListener('click', () => {
        if (confirm("คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?")) {
            tbody.innerHTML = '';
            addRow(); // add empty row
            resultsSection.classList.add('hidden');
        }
    });

    addDemoDataBtn.addEventListener('click', () => {
        loadData(demoData);
        resultsSection.classList.add('hidden');
    });

    calculateBtn.addEventListener('click', () => {
        calculateCPM();
    });

    // Add row to table
    function addRow(data = { id: "", preds: "", a: "", m: "", b: "" }) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="text" class="form-control col-id" value="${data.id}" placeholder="เช่น A, B"></td>
            <td><input type="text" class="form-control col-preds" value="${data.preds}" placeholder="คั่นด้วย ,"></td>
            <td><input type="number" class="form-control col-a input-sm" value="${data.a}" step="any"></td>
            <td><input type="number" class="form-control col-m input-sm" value="${data.m}" step="any"></td>
            <td><input type="number" class="form-control col-b input-sm" value="${data.b}" step="any"></td>
            <td class="text-center"><button class="btn-icon delete-btn" title="ลบ"><i class="fa-solid fa-trash"></i></button></td>
        `;

        tr.querySelector('.delete-btn').addEventListener('click', function () {
            tr.remove();
        });

        tbody.appendChild(tr);
    }

    function loadData(dataArray) {
        tbody.innerHTML = '';
        dataArray.forEach(item => addRow(item));
    }

    // Main logic for PERT/CPM calculation
    function calculateCPM() {
        const rows = document.querySelectorAll('#activityTable tbody tr');
        let activities = {};
        let actKeys = [];

        // Parse user inputs
        rows.forEach(row => {
            let id = row.querySelector('.col-id').value.trim();
            const predsRaw = row.querySelector('.col-preds').value.trim();
            const a = parseFloat(row.querySelector('.col-a').value);
            const m = parseFloat(row.querySelector('.col-m').value);
            const b = parseFloat(row.querySelector('.col-b').value);

            if (!id) return; // ignore empty ID
            id = id.toUpperCase(); // Normalize ID case (though original was lowercase, uppercase is standard. However, let's keep user case for math)
            // Actually, keep original case for display, but use exact string for matching
            id = row.querySelector('.col-id').value.trim(); // Revert to exact trim

            activities[id] = {
                id: id,
                preds: predsRaw ? predsRaw.split(',').map(s => s.trim()).filter(s => s !== '') : [],
                a: isNaN(a) ? 0 : a,
                m: isNaN(m) ? 0 : m,
                b: isNaN(b) ? 0 : b,
                successors: []
            };
            actKeys.push(id);
        });

        if (actKeys.length === 0) {
            alert("โปรดเพิ่มข้อมูลกิจกรรมอย่างน้อย 1 รายการก่อนคำนวณ");
            return;
        }

        // 1. Calculate Expected Time (t) and Variance (v)
        actKeys.forEach(k => {
            const act = activities[k];
            act.t = (act.a + 4 * act.m + act.b) / 6;
            act.v = Math.pow((act.b - act.a) / 6, 2);
            act.es = 0; act.ef = 0; act.ls = 0; act.lf = 0; act.slack = 0;
        });

        // 2. Map Successors and Check Validity
        let hasError = false;
        actKeys.forEach(k => {
            activities[k].preds.forEach(pId => {
                if (activities[pId]) {
                    activities[pId].successors.push(k);
                } else {
                    alert(`ไม่พบกิจกรรมที่ต้องทำก่อนหน้า '${pId}' สำหรับกิจกรรม '${k}' \nโปรดตรวจสอบการพิมพ์ให้ถูกต้อง`);
                    hasError = true;
                }
            });
        });

        if (hasError) return;

        // 3. Topological Sort using Kahn's Algorithm
        let inDegree = {};
        actKeys.forEach(k => inDegree[k] = activities[k].preds.length);

        let queue = actKeys.filter(k => inDegree[k] === 0);
        let sorted = [];

        while (queue.length > 0) {
            let u = queue.shift();
            sorted.push(u);
            activities[u].successors.forEach(v => {
                inDegree[v]--;
                if (inDegree[v] === 0) queue.push(v);
            });
        }

        if (sorted.length !== actKeys.length) {
            alert("เส้นทางกิจกรรมมีวงจรปิด (Cycle detected) ไม่สามารถคำนวณได้ ตรวจสอบความสัมพันธ์ก่อนหน้า");
            return;
        }

        // 4. Forward Pass (Calculate ES and EF)
        sorted.forEach(id => {
            let act = activities[id];
            let maxES = 0;
            act.preds.forEach(pId => {
                maxES = Math.max(maxES, activities[pId].ef);
            });
            act.es = maxES;
            act.ef = act.es + act.t;
        });

        const projectDuration = Math.max(...actKeys.map(k => activities[k].ef));

        // 5. Backward Pass (Calculate LF, LS, and Slack)
        // Clone array and reverse it to iterate backwards topologically
        [...sorted].reverse().forEach(id => {
            let act = activities[id];
            if (act.successors.length === 0) {
                // Determine finish node logic
                act.lf = projectDuration;
            } else {
                let minLF = Infinity;
                act.successors.forEach(sId => {
                    minLF = Math.min(minLF, activities[sId].ls);
                });
                act.lf = minLF;
            }
            act.ls = act.lf - act.t;
            act.slack = act.ls - act.es; // Float/Slack
        });

        // 6. Identify Critical Path & project Variance
        let criticalPathKeys = new Set();
        let projectVariance = 0;

        // Standard logic: A critical activity has slack == 0.
        // We accumulate variance for activities on the critical path.
        // If there are multiple branches, we typically trace the longest path, but here all paths with slack 0 define project duration.
        // For simple project variance, we sum variances of the critical activities.
        sorted.forEach(id => {
            let act = activities[id];
            if (Math.abs(act.slack) < 0.001) {
                criticalPathKeys.add(id);
                projectVariance += act.v;
            }
        });

        renderResults(activities, sorted, projectDuration, projectVariance, criticalPathKeys);
    }

    function renderResults(activities, sortedKeys, projectDuration, projectVariance, criticalPathKeys) {
        // Unhide results
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update Summary Cards
        document.getElementById('resDuration').innerText = projectDuration.toFixed(2);
        document.getElementById('resVariance').innerText = projectVariance.toFixed(2);

        // Critical path string
        let cpString = Array.from(criticalPathKeys).join(' ➔ ');
        document.getElementById('resCriticalPath').innerText = cpString || 'None';

        // Update Table
        const resultTbody = document.getElementById('resultTableBody');
        resultTbody.innerHTML = '';

        // Render in ID sorted or topological sorted?
        // Let's render in original user input order or topological. User order is usually preferred.
        Object.keys(activities).forEach(k => {
            const act = activities[k];
            const isCritical = criticalPathKeys.has(k);
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td style="font-weight: 600; color: ${isCritical ? 'var(--critical)' : 'white'}">${act.id}</td>
                <td>${act.t.toFixed(2)}</td>
                <td>${act.v.toFixed(2)}</td>
                <td>${act.es.toFixed(2)}</td>
                <td>${act.ef.toFixed(2)}</td>
                <td>${act.ls.toFixed(2)}</td>
                <td>${act.lf.toFixed(2)}</td>
                <td>${act.slack.toFixed(2)}</td>
                <td>${isCritical ? '<span class="badge badge-critical">Critical</span>' : '<span class="badge badge-normal">-</span>'}</td>
            `;
            resultTbody.appendChild(tr);
        });

        // Update Network Graph
        renderGraph(activities, sortedKeys, criticalPathKeys);
    }

    function renderGraph(activities, sortedKeys, criticalPathKeys) {
        const container = document.getElementById('networkGraph');

        let nodesData = [];
        let edgesData = [];

        // Build Nodes (AON Strategy)
        sortedKeys.forEach(k => {
            const act = activities[k];
            const isCrit = criticalPathKeys.has(k);

            nodesData.push({
                id: k,
                label: `กิจกรรม ${k}\nt = ${act.t.toFixed(2)}\nES:${act.es.toFixed(1)} | EF:${act.ef.toFixed(1)}\nLS:${act.ls.toFixed(1)} | LF:${act.lf.toFixed(1)}`,
                shape: 'box',
                margin: 14,
                font: { face: 'Outfit', color: isCrit ? '#991b1b' : '#334155', size: 14, bold: true },
                color: {
                    background: isCrit ? '#fecaca' : '#ffffff',
                    border: isCrit ? '#ef4444' : '#cbd5e1',
                    highlight: { background: isCrit ? '#fca5a5' : '#f8fafc', border: isCrit ? '#dc2626' : '#94a3b8' }
                },
                borderWidth: isCrit ? 3 : 1,
                shadow: true
            });

            // Build Edges
            act.preds.forEach(pId => {
                // An edge is critical ONLY if both nodes are critical, AND it is actually on the path 
                // (i.e. pred.EF == act.ES ensures it's the sequence causing the critical path)
                const pAct = activities[pId];
                const isEdgeCrit = isCrit && criticalPathKeys.has(pId) && (Math.abs(pAct.ef - act.es) < 0.001);

                edgesData.push({
                    from: pId,
                    to: k,
                    arrows: 'to',
                    color: {
                        color: isEdgeCrit ? '#ef4444' : '#94a3b8',
                        highlight: isEdgeCrit ? '#dc2626' : '#64748b'
                    },
                    width: isEdgeCrit ? 3 : 1.5,
                    smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 }
                });
            });
        });

        // Also add Start/End pseudo-nodes for better graph layout clarity
        const startNodes = sortedKeys.filter(k => activities[k].preds.length === 0);
        const endNodes = sortedKeys.filter(k => activities[k].successors.length === 0);

        nodesData.push({
            id: 'START', label: 'Start', shape: 'circle',
            color: { background: '#10b981', border: '#059669' },
            font: { color: 'white' }, borderWidth: 2
        });
        nodesData.push({
            id: 'END', label: 'End', shape: 'circle',
            color: { background: '#6366f1', border: '#4f46e5' },
            font: { color: 'white' }, borderWidth: 2
        });

        startNodes.forEach(nId => {
            const isCrit = criticalPathKeys.has(nId) && (activities[nId].es === 0);
            edgesData.push({
                from: 'START', to: nId, arrows: 'to',
                color: { color: isCrit ? '#ef4444' : '#94a3b8' }, width: isCrit ? 3 : 1
            });
        });

        endNodes.forEach(nId => {
            // Find max EF to determine true end
            const maxEF = Math.max(...endNodes.map(k => activities[k].ef));
            const isCrit = criticalPathKeys.has(nId) && (Math.abs(activities[nId].ef - maxEF) < 0.001);
            edgesData.push({
                from: nId, to: 'END', arrows: 'to',
                color: { color: isCrit ? '#ef4444' : '#94a3b8' }, width: isCrit ? 3 : 1
            });
        });

        const data = {
            nodes: new vis.DataSet(nodesData),
            edges: new vis.DataSet(edgesData)
        };

        const options = {
            layout: {
                hierarchical: {
                    direction: 'LR',
                    sortMethod: 'directed',
                    levelSeparation: 250,
                    nodeSpacing: 120
                }
            },
            physics: {
                enabled: false // disable physics after initial layout for cleaner view
            },
            interaction: {
                dragNodes: true,
                zoomView: true,
                dragView: true
            }
        };

        if (network) {
            network.destroy();
        }
        network = new vis.Network(container, data, options);
    }
});
