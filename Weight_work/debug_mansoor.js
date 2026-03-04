const nodes = [
    { id: 1, time: 4 }, { id: 2, time: 3 }, { id: 3, time: 9 },
    { id: 4, time: 5 }, { id: 5, time: 9 }, { id: 6, time: 4 },
    { id: 7, time: 8 }, { id: 8, time: 7 }, { id: 9, time: 5 },
    { id: 10, time: 1 }, { id: 11, time: 3 }, { id: 12, time: 1 },
    { id: 13, time: 5 }, { id: 14, time: 3 }, { id: 15, time: 5 },
    { id: 16, time: 3 }, { id: 17, time: 13 }, { id: 18, time: 5 },
    { id: 19, time: 2 }, { id: 20, time: 3 }, { id: 21, time: 7 }
];

const edges = [
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

const ct = 21;

// Compute ALAP
const adj = {};
const inDeg = {};
nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
edges.forEach(e => {
    if (adj[e.from]) adj[e.from].push(e.to);
    if (inDeg[e.to] !== undefined) inDeg[e.to]++;
});

const asapLevels = {};
const queue = [];
nodes.forEach(n => { if (inDeg[n.id] === 0) { queue.push(n.id); asapLevels[n.id] = 0; } });
let maxLevel = 0;
const inDegCopy = { ...inDeg };
while (queue.length > 0) {
    const curr = queue.shift();
    (adj[curr] || []).forEach(next => {
        const newLevel = asapLevels[curr] + 1;
        if (asapLevels[next] === undefined || newLevel > asapLevels[next]) asapLevels[next] = newLevel;
        inDegCopy[next]--;
        if (inDegCopy[next] === 0) queue.push(next);
        if (newLevel > maxLevel) maxLevel = newLevel;
    });
}
nodes.forEach(n => { if (asapLevels[n.id] === undefined) asapLevels[n.id] = 0; });

const alapLevels = {};
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

const regionGroups = {};
nodes.forEach(n => {
    const r = alapLevels[n.id];
    if (!regionGroups[r]) regionGroups[r] = [];
    regionGroups[r].push(n);
});

// Sorted regions ASCENDING ALAP
const regionKeys = Object.keys(regionGroups).map(Number).sort((a, b) => a - b);
regionKeys.forEach(r => {
    // Sort tasks descending time
    regionGroups[r].sort((a, b) => {
        if (b.time !== a.time) return b.time - a.time;
        // In textbook: 17, 18, 14, 2 (14 before 2). 11, 10, 12 (10 before 12).
        // Let's secondary sort by id just ascending? Unclear how textbook breaks ties.
        // It might not matter if time is the same.
        return a.id - b.id;
    });
});

const orderedTasks = [];
regionKeys.forEach(r => {
    regionGroups[r].forEach(n => orderedTasks.push({ id: n.id, time: n.time, region: r }));
});

console.log("Ordered List of Tasks:");
console.log(orderedTasks.map(t => `${t.id}(${t.time})`).join(', '));

const predecessors = {};
nodes.forEach(n => predecessors[n.id] = []);
edges.forEach(e => {
    if (predecessors[e.to]) predecessors[e.to].push(e.from);
});

const assigned = new Set();
const stations = [];
let stationNum = 1;

while (assigned.size < nodes.length) {
    let validCombinations = [];

    // DFS to find paths
    function explore(currentSubset, currentSum) {
        validCombinations.push({ subset: [...currentSubset], sum: currentSum });

        let tempAssigned = new Set(assigned);
        currentSubset.forEach(id => tempAssigned.add(id));

        for (let i = 0; i < orderedTasks.length; i++) {
            const task = orderedTasks[i];
            if (!tempAssigned.has(task.id)) {
                const canAdd = predecessors[task.id].every(p => tempAssigned.has(p));
                if (canAdd && currentSum + task.time <= ct) {
                    const lastIdx = currentSubset.length > 0
                        ? orderedTasks.findIndex(t => t.id === currentSubset[currentSubset.length - 1])
                        : -1;

                    if (i > lastIdx) {
                        explore([...currentSubset, task.id], currentSum + task.time);
                    }
                }
            }
        }
    }

    explore([], 0);

    // Pick best subset
    validCombinations.sort((a, b) => {
        if (b.sum !== a.sum) return b.sum - a.sum;

        // prefer subsets that appear earlier in orderedTasks
        for (const t of orderedTasks) {
            const aHas = a.subset.includes(t.id);
            const bHas = b.subset.includes(t.id);
            if (aHas && !bHas) return -1;
            if (bHas && !aHas) return 1;
        }
        return 0;
    });

    const bestComb = validCombinations[0];
    bestComb.subset.forEach(id => assigned.add(id));
    stations.push({ stationNum, jobs: bestComb.subset.map(id => id), sum: bestComb.sum });
    stationNum++;
}

console.log("\nStations:");
stations.forEach(s => {
    console.log(`Station ${s.stationNum}: ${s.jobs.join(', ')} (Time: ${s.sum})`);
});
