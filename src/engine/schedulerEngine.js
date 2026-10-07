/**
 * SyncFlow CPU Scheduling Engine
 * Pure logic simulation module.
 */

// Color Palette for Processes (consistent throughout the app)
export const PROCESS_COLORS = [
  '#38BDF8', // P1 - Sky Blue
  '#10B981', // P2 - Emerald
  '#F59E0B', // P3 - Amber
  '#F43F5E', // P4 - Rose
  '#8B5CF6', // P5 - Purple
  '#EC4899', // P6 - Pink
  '#06B6D4', // P7 - Cyan
  '#84CC16', // P8 - Lime
  '#A855F7', // P9 - Violet
  '#F97316', // P10 - Orange
];

export function getProcessColor(index) {
  return PROCESS_COLORS[index % PROCESS_COLORS.length];
}

/**
 * Calculates CT, TAT, WT, RT, Avg Metrics, CPU Utilization & Throughput from a simulation timeline.
 */
export function calculateMetrics(processes, timeline, totalTime, contextSwitchCount) {
  const metrics = {};
  
  // Track first run time for Response Time (RT)
  const firstRunTime = {};

  timeline.forEach(block => {
    if (block.type === 'run' && block.pid !== 'IDLE' && block.pid !== 'CS') {
      if (firstRunTime[block.pid] === undefined) {
        firstRunTime[block.pid] = block.start;
      }
    }
  });

  // Track completion time for each process
  processes.forEach(p => {
    // Find the last block where this process ran
    const pBlocks = timeline.filter(b => b.pid === p.pid && b.type === 'run');
    const completionTime = pBlocks.length > 0 ? Math.max(...pBlocks.map(b => b.end || 0)) : (p.arrivalTime || 0);
    
    const turnaroundTime = completionTime - (p.arrivalTime || 0);
    const waitingTime = turnaroundTime - (p.burstTime || 0);
    const responseTime = (firstRunTime[p.pid] !== undefined ? firstRunTime[p.pid] : (p.arrivalTime || 0)) - (p.arrivalTime || 0);

    metrics[p.pid] = {
      id: p.id,
      pid: p.pid,
      arrivalTime: p.arrivalTime || 0,
      burstTime: p.burstTime || 0,
      priority: p.priority || 1,
      completionTime,
      turnaroundTime: Math.max(0, turnaroundTime),
      waitingTime: Math.max(0, waitingTime),
      responseTime: Math.max(0, responseTime),
      color: p.color
    };
  });

  const processList = Object.values(metrics);
  const n = processList.length;
  const validTotalTime = isNaN(totalTime) || totalTime < 0 ? 0 : totalTime;

  if (n === 0) {
    return {
      processMetrics: [],
      summaryMetrics: {
        avgWaitingTime: 0,
        avgTurnaroundTime: 0,
        avgResponseTime: 0,
        cpuUtilization: 0,
        throughput: 0,
        totalDuration: 0,
        contextSwitches: 0,
        idleTime: 0
      }
    };
  }

  const sumWT = processList.reduce((acc, p) => acc + p.waitingTime, 0);
  const sumTAT = processList.reduce((acc, p) => acc + p.turnaroundTime, 0);
  const sumRT = processList.reduce((acc, p) => acc + p.responseTime, 0);

  const totalIdleTime = timeline
    .filter(b => b.type === 'idle')
    .reduce((acc, b) => acc + Math.max(0, (b.end || 0) - (b.start || 0)), 0);

  const totalBusyTime = timeline
    .filter(b => b.type === 'run')
    .reduce((acc, b) => acc + Math.max(0, (b.end || 0) - (b.start || 0)), 0);

  const cpuUtilization = validTotalTime > 0 ? Math.min(100, Math.round((totalBusyTime / validTotalTime) * 1000) / 10) : 0;
  const throughput = validTotalTime > 0 ? Math.round((n / validTotalTime) * 1000) / 1000 : 0;

  return {
    processMetrics: processList,
    summaryMetrics: {
      avgWaitingTime: Math.round((sumWT / n) * 100) / 100,
      avgTurnaroundTime: Math.round((sumTAT / n) * 100) / 100,
      avgResponseTime: Math.round((sumRT / n) * 100) / 100,
      cpuUtilization: isNaN(cpuUtilization) ? 0 : cpuUtilization,
      throughput: isNaN(throughput) ? 0 : throughput,
      totalDuration: validTotalTime,
      contextSwitches: contextSwitchCount,
      idleTime: totalIdleTime
    }
  };
}

// ----------------------------------------------------
// 1. FCFS (First Come First Served) - Non Preemptive
// ----------------------------------------------------
export function simulateFCFS(processes, options = {}) {
  const cs = Math.max(0, options.csOverhead || 0);
  let currentTime = 0;
  const timeline = [];
  const eventLog = [];
  let csCount = 0;

  // Copy and sort by Arrival Time (break tie by PID)
  const procList = processes.map((p, i) => ({
    ...p,
    arrivalTime: Math.max(0, p.arrivalTime || 0),
    burstTime: Math.max(1, p.burstTime || 1),
    color: getProcessColor(i)
  })).sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));

  let lastPid = null;

  procList.forEach((p, idx) => {
    // If CPU is idle before process arrives
    if (currentTime < p.arrivalTime) {
      timeline.push({
        start: currentTime,
        end: p.arrivalTime,
        pid: 'IDLE',
        type: 'idle',
        decisionReason: `No processes ready in range t=${currentTime} to t=${p.arrivalTime}`,
        remainingTimeMap: {},
        readyQueueAtStart: []
      });
      eventLog.push({ time: currentTime, type: 'info', message: `CPU idle until t=${p.arrivalTime}` });
      currentTime = p.arrivalTime;
      lastPid = null;
    }

    // Context switch overhead if switching processes
    if (cs > 0 && lastPid && lastPid !== p.pid) {
      csCount++;
      timeline.push({
        start: currentTime,
        end: currentTime + cs,
        pid: 'CS',
        type: 'cs',
        decisionReason: `Context switch penalty from ${lastPid} to ${p.pid} (${cs} units)`,
        remainingTimeMap: {},
        readyQueueAtStart: [p.pid]
      });
      eventLog.push({ time: currentTime, type: 'warning', message: `Context switch: ${lastPid} ➔ ${p.pid} (${cs}ms cost)` });
      currentTime += cs;
    }

    const readyQueueNow = procList
      .filter(x => x.arrivalTime <= currentTime && x.arrivalTime > (procList[idx - 1]?.arrivalTime || 0))
      .map(x => x.pid);

    timeline.push({
      start: currentTime,
      end: currentTime + p.burstTime,
      pid: p.pid,
      type: 'run',
      color: p.color,
      decisionReason: `${p.pid} selected (earliest arrival time = ${p.arrivalTime})`,
      remainingTimeMap: { [p.pid]: 0 },
      readyQueueAtStart: readyQueueNow
    });

    eventLog.push({ time: currentTime, type: 'success', message: `${p.pid} started execution for burst ${p.burstTime}` });
    currentTime += p.burstTime;
    eventLog.push({ time: currentTime, type: 'info', message: `${p.pid} completed execution at t=${currentTime}` });
    lastPid = p.pid;
  });

  const metrics = calculateMetrics(procList, timeline, currentTime, csCount);
  return { timeline, ...metrics, eventLog };
}

// ----------------------------------------------------
// 2. SJF (Shortest Job First) - Non Preemptive
// ----------------------------------------------------
export function simulateSJF(processes, options = {}) {
  const cs = Math.max(0, options.csOverhead || 0);
  let currentTime = 0;
  const timeline = [];
  const eventLog = [];
  let csCount = 0;

  let procs = processes.map((p, i) => ({
    ...p,
    arrivalTime: Math.max(0, p.arrivalTime || 0),
    burstTime: Math.max(1, p.burstTime || 1),
    color: getProcessColor(i),
    completed: false
  }));

  let completedCount = 0;
  let lastPid = null;
  const maxTimeLimit = procs.reduce((acc, p) => acc + p.arrivalTime + p.burstTime + (cs * 5), 0) + 1000;
  let steps = 0;
  const maxSteps = 5000;

  while (completedCount < procs.length && currentTime < maxTimeLimit && steps < maxSteps) {
    steps++;
    const ready = procs.filter(p => !p.completed && p.arrivalTime <= currentTime);

    if (ready.length === 0) {
      const uncompleted = procs.filter(p => !p.completed);
      if (uncompleted.length === 0) break;
      const nextArrival = Math.max(currentTime + 1, Math.min(...uncompleted.map(p => p.arrivalTime)));
      timeline.push({
        start: currentTime,
        end: nextArrival,
        pid: 'IDLE',
        type: 'idle',
        decisionReason: `CPU Idle: Next process arrives at t=${nextArrival}`,
        remainingTimeMap: {},
        readyQueueAtStart: []
      });
      eventLog.push({ time: currentTime, type: 'info', message: `CPU idle until t=${nextArrival}` });
      currentTime = nextArrival;
      lastPid = null;
      continue;
    }

    // Pick process with shortest burst time (tie breaker: arrival time, then PID)
    ready.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
    const nextProc = ready[0];

    if (cs > 0 && lastPid && lastPid !== nextProc.pid) {
      csCount++;
      timeline.push({
        start: currentTime,
        end: currentTime + cs,
        pid: 'CS',
        type: 'cs',
        decisionReason: `Context switch penalty from ${lastPid} to ${nextProc.pid}`,
        remainingTimeMap: {},
        readyQueueAtStart: ready.map(r => r.pid)
      });
      eventLog.push({ time: currentTime, type: 'warning', message: `Context switch: ${lastPid} ➔ ${nextProc.pid}` });
      currentTime += cs;
    }

    timeline.push({
      start: currentTime,
      end: currentTime + nextProc.burstTime,
      pid: nextProc.pid,
      type: 'run',
      color: nextProc.color,
      decisionReason: `${nextProc.pid} chosen: shortest burst time (${nextProc.burstTime}) among ready queue`,
      remainingTimeMap: { [nextProc.pid]: 0 },
      readyQueueAtStart: ready.map(r => r.pid)
    });

    eventLog.push({ time: currentTime, type: 'success', message: `${nextProc.pid} started execution (Burst: ${nextProc.burstTime})` });
    currentTime += nextProc.burstTime;
    nextProc.completed = true;
    completedCount++;
    eventLog.push({ time: currentTime, type: 'info', message: `${nextProc.pid} completed at t=${currentTime}` });
    lastPid = nextProc.pid;
  }

  const metrics = calculateMetrics(procs, timeline, currentTime, csCount);
  return { timeline, ...metrics, eventLog };
}

// ----------------------------------------------------
// 3. SRTF (Shortest Remaining Time First) - Preemptive
// ----------------------------------------------------
export function simulateSRTF(processes, options = {}) {
  const cs = Math.max(0, options.csOverhead || 0);
  let currentTime = 0;
  const timeline = [];
  const eventLog = [];
  let csCount = 0;

  let procs = processes.map((p, i) => ({
    ...p,
    arrivalTime: Math.max(0, p.arrivalTime || 0),
    burstTime: Math.max(1, p.burstTime || 1),
    remainingTime: Math.max(1, p.burstTime || 1),
    color: getProcessColor(i),
    completed: false
  }));

  const maxTimeLimit = procs.reduce((acc, p) => acc + p.arrivalTime + p.burstTime + (cs * 5), 0) + 1000;
  let steps = 0;
  const maxSteps = 5000;
  let lastPid = null;

  while (procs.some(p => !p.completed) && currentTime < maxTimeLimit && steps < maxSteps) {
    steps++;
    const ready = procs.filter(p => !p.completed && p.arrivalTime <= currentTime);

    if (ready.length === 0) {
      const uncompleted = procs.filter(p => !p.completed);
      if (uncompleted.length === 0) break;
      const nextArrival = Math.max(currentTime + 1, Math.min(...uncompleted.map(p => p.arrivalTime)));
      timeline.push({
        start: currentTime,
        end: nextArrival,
        pid: 'IDLE',
        type: 'idle',
        decisionReason: `CPU Idle: No process ready until t=${nextArrival}`,
        remainingTimeMap: {},
        readyQueueAtStart: []
      });
      eventLog.push({ time: currentTime, type: 'info', message: `CPU idle until t=${nextArrival}` });
      currentTime = nextArrival;
      lastPid = null;
      continue;
    }

    ready.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
    const currentProc = ready[0];

    // Find next event time (arrival of a shorter job or completion)
    const futureArrivals = procs.filter(p => !p.completed && p.arrivalTime > currentTime).map(p => p.arrivalTime);
    let runDuration = currentProc.remainingTime;

    if (futureArrivals.length > 0) {
      const nextArrival = Math.min(...futureArrivals);
      const timeToNextArrival = nextArrival - currentTime;
      if (timeToNextArrival > 0 && timeToNextArrival < runDuration) {
        runDuration = timeToNextArrival;
      }
    }
    runDuration = Math.max(1, Math.min(runDuration, currentProc.remainingTime));

    if (cs > 0 && lastPid && lastPid !== currentProc.pid) {
      csCount++;
      timeline.push({
        start: currentTime,
        end: currentTime + cs,
        pid: 'CS',
        type: 'cs',
        decisionReason: `Context switch cost from ${lastPid} to ${currentProc.pid}`,
        remainingTimeMap: {},
        readyQueueAtStart: ready.map(r => r.pid)
      });
      eventLog.push({ time: currentTime, type: 'warning', message: `Context switch: ${lastPid} ➔ ${currentProc.pid}` });
      currentTime += cs;
    }

    const remMap = {};
    procs.forEach(p => remMap[p.pid] = p.remainingTime);

    timeline.push({
      start: currentTime,
      end: currentTime + runDuration,
      pid: currentProc.pid,
      type: 'run',
      color: currentProc.color,
      decisionReason: `${currentProc.pid} chosen: Shortest remaining time (${currentProc.remainingTime})`,
      remainingTimeMap: remMap,
      readyQueueAtStart: ready.map(r => r.pid)
    });

    eventLog.push({ time: currentTime, type: 'success', message: `${currentProc.pid} running (Remaining: ${currentProc.remainingTime})` });
    currentTime += runDuration;
    currentProc.remainingTime -= runDuration;

    if (currentProc.remainingTime <= 0) {
      currentProc.remainingTime = 0;
      currentProc.completed = true;
      eventLog.push({ time: currentTime, type: 'info', message: `${currentProc.pid} finished execution at t=${currentTime}` });
    }

    lastPid = currentProc.pid;
  }

  // Merge consecutive timeline blocks for same PID to simplify visualization
  const mergedTimeline = mergeTimelineBlocks(timeline);
  const metrics = calculateMetrics(procs, mergedTimeline, currentTime, csCount);
  return { timeline: mergedTimeline, ...metrics, eventLog };
}

// Helper to merge contiguous blocks for same pid if no event intervened
function mergeTimelineBlocks(timeline) {
  if (timeline.length === 0) return [];
  const merged = [ { ...timeline[0] } ];

  for (let i = 1; i < timeline.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = timeline[i];

    if (prev.pid === curr.pid && prev.type === curr.type) {
      prev.end = curr.end;
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

// ----------------------------------------------------
// 4. Priority Scheduling (Non-Preemptive & Preemptive with Aging)
// ----------------------------------------------------
export function simulatePriority(processes, options = {}) {
  const isPreemptive = options.preemptive !== false;
  const agingEnabled = !!options.agingEnabled;
  const agingInterval = Math.max(1, options.agingInterval || 5);
  const cs = Math.max(0, options.csOverhead || 0);

  let currentTime = 0;
  const timeline = [];
  const eventLog = [];
  let csCount = 0;

  let procs = processes.map((p, i) => ({
    ...p,
    arrivalTime: Math.max(0, p.arrivalTime || 0),
    burstTime: Math.max(1, p.burstTime || 1),
    remainingTime: Math.max(1, p.burstTime || 1),
    effectivePriority: p.priority || 1,
    waitingCounter: 0,
    color: getProcessColor(i),
    completed: false
  }));

  let lastPid = null;
  const maxTimeLimit = procs.reduce((acc, p) => acc + p.arrivalTime + p.burstTime + (cs * 5), 0) + 1000;
  let steps = 0;
  const maxSteps = 5000;

  while (procs.some(p => !p.completed) && currentTime < maxTimeLimit && steps < maxSteps) {
    steps++;

    // Apply aging to waiting processes if enabled
    if (agingEnabled && currentTime > 0) {
      procs.forEach(p => {
        if (!p.completed && p.arrivalTime <= currentTime && p.pid !== lastPid) {
          p.waitingCounter++;
          if (p.waitingCounter % agingInterval === 0 && p.effectivePriority > 1) {
            p.effectivePriority--; // Boost priority by lowering numerical rank
            eventLog.push({
              time: currentTime,
              type: 'warning',
              message: `AGING: ${p.pid} priority boosted to ${p.effectivePriority} due to long wait`
            });
          }
        }
      });
    }

    const ready = procs.filter(p => !p.completed && p.arrivalTime <= currentTime);

    if (ready.length === 0) {
      const uncompleted = procs.filter(p => !p.completed);
      if (uncompleted.length === 0) break;
      const nextArrival = Math.max(currentTime + 1, Math.min(...uncompleted.map(p => p.arrivalTime)));
      timeline.push({
        start: currentTime,
        end: nextArrival,
        pid: 'IDLE',
        type: 'idle',
        decisionReason: `CPU Idle: Waiting for next process arrival at t=${nextArrival}`,
        remainingTimeMap: {},
        readyQueueAtStart: []
      });
      eventLog.push({ time: currentTime, type: 'info', message: `CPU idle until t=${nextArrival}` });
      currentTime = nextArrival;
      lastPid = null;
      continue;
    }

    // Sort by effectivePriority ascending (1 = highest), then arrival time, then PID
    ready.sort((a, b) => a.effectivePriority - b.effectivePriority || a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
    const currentProc = ready[0];

    const runDuration = isPreemptive ? Math.min(1, currentProc.remainingTime) : currentProc.remainingTime;

    if (cs > 0 && lastPid && lastPid !== currentProc.pid) {
      csCount++;
      timeline.push({
        start: currentTime,
        end: currentTime + cs,
        pid: 'CS',
        type: 'cs',
        decisionReason: `Context switch penalty from ${lastPid} to ${currentProc.pid}`,
        remainingTimeMap: {},
        readyQueueAtStart: ready.map(r => r.pid)
      });
      eventLog.push({ time: currentTime, type: 'warning', message: `Context switch: ${lastPid} ➔ ${currentProc.pid}` });
      currentTime += cs;
    }

    const remMap = {};
    procs.forEach(p => remMap[p.pid] = p.remainingTime);

    timeline.push({
      start: currentTime,
      end: currentTime + runDuration,
      pid: currentProc.pid,
      type: 'run',
      color: currentProc.color,
      decisionReason: `${currentProc.pid} selected: Highest priority (${currentProc.effectivePriority})`,
      remainingTimeMap: remMap,
      readyQueueAtStart: ready.map(r => r.pid)
    });

    if (currentTime % 5 === 0 || lastPid !== currentProc.pid) {
      eventLog.push({ time: currentTime, type: 'success', message: `${currentProc.pid} running with Priority ${currentProc.effectivePriority}` });
    }

    currentTime += runDuration;
    currentProc.remainingTime -= runDuration;

    if (currentProc.remainingTime <= 0) {
      currentProc.remainingTime = 0;
      currentProc.completed = true;
      eventLog.push({ time: currentTime, type: 'info', message: `${currentProc.pid} completed at t=${currentTime}` });
    }

    lastPid = currentProc.pid;
  }

  const mergedTimeline = mergeTimelineBlocks(timeline);
  const metrics = calculateMetrics(procs, mergedTimeline, currentTime, csCount);
  return { timeline: mergedTimeline, ...metrics, eventLog };
}

// ----------------------------------------------------
// 5. Round Robin (RR) - Preemptive with Quantum & CS Overhead
// ----------------------------------------------------
export function simulateRoundRobin(processes, options = {}) {
  const quantum = Math.max(1, options.timeQuantum || 2);
  const cs = Math.max(0, options.csOverhead || 0);

  let currentTime = 0;
  const timeline = [];
  const eventLog = [];
  let csCount = 0;

  let procs = processes.map((p, i) => ({
    ...p,
    arrivalTime: Math.max(0, p.arrivalTime || 0),
    burstTime: Math.max(1, p.burstTime || 1),
    remainingTime: Math.max(1, p.burstTime || 1),
    color: getProcessColor(i),
    completed: false,
    inQueue: false
  }));

  // Sort initial arrival
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));

  const readyQueue = [];
  let lastPid = null;

  // Add initial arrived processes at t=0
  procs.filter(p => p.arrivalTime === 0).forEach(p => {
    readyQueue.push(p);
    p.inQueue = true;
  });

  const maxTimeLimit = procs.reduce((acc, p) => acc + p.arrivalTime + p.burstTime + (cs * 5), 0) + 1000;
  let steps = 0;
  const maxSteps = 5000;

  while (procs.some(p => !p.completed) && currentTime < maxTimeLimit && steps < maxSteps) {
    steps++;
    if (readyQueue.length === 0) {
      // Check if any process is arriving later
      const uncompleted = procs.filter(p => !p.completed && !p.inQueue);
      if (uncompleted.length > 0) {
        const nextArrival = Math.max(currentTime + 1, Math.min(...uncompleted.map(p => p.arrivalTime)));
        timeline.push({
          start: currentTime,
          end: nextArrival,
          pid: 'IDLE',
          type: 'idle',
          decisionReason: `CPU Idle: Ready queue empty, next process arrives at t=${nextArrival}`,
          remainingTimeMap: {},
          readyQueueAtStart: []
        });
        eventLog.push({ time: currentTime, type: 'info', message: `CPU idle until t=${nextArrival}` });
        currentTime = nextArrival;
        lastPid = null;

        // Push newly arrived processes
        procs.filter(p => p.arrivalTime <= currentTime && !p.completed && !p.inQueue).forEach(p => {
          readyQueue.push(p);
          p.inQueue = true;
        });
        continue;
      }
    }

    if (readyQueue.length === 0) break;

    const currentProc = readyQueue.shift();
    currentProc.inQueue = false;

    if (cs > 0 && lastPid && lastPid !== currentProc.pid) {
      csCount++;
      timeline.push({
        start: currentTime,
        end: currentTime + cs,
        pid: 'CS',
        type: 'cs',
        decisionReason: `Context switch penalty (${cs} units) switching to ${currentProc.pid}`,
        remainingTimeMap: {},
        readyQueueAtStart: readyQueue.map(r => r.pid)
      });
      eventLog.push({ time: currentTime, type: 'warning', message: `Context switch: ${lastPid} ➔ ${currentProc.pid}` });
      currentTime += cs;
    }

    const executeTime = Math.max(1, Math.min(quantum, currentProc.remainingTime));

    const remMap = {};
    procs.forEach(p => remMap[p.pid] = p.remainingTime);

    timeline.push({
      start: currentTime,
      end: currentTime + executeTime,
      pid: currentProc.pid,
      type: 'run',
      color: currentProc.color,
      decisionReason: `${currentProc.pid} allocated quantum of ${executeTime}ms (q=${quantum})`,
      remainingTimeMap: remMap,
      readyQueueAtStart: [currentProc.pid, ...readyQueue.map(r => r.pid)]
    });

    eventLog.push({
      time: currentTime,
      type: 'success',
      message: `${currentProc.pid} running for ${executeTime}ms (q=${quantum})`
    });

    currentTime += executeTime;
    currentProc.remainingTime -= executeTime;

    // Check newly arrived processes during execution window before requeuing currentProc
    procs.filter(p => !p.completed && !p.inQueue && p.pid !== currentProc.pid && p.arrivalTime <= currentTime).forEach(p => {
      readyQueue.push(p);
      p.inQueue = true;
    });

    if (currentProc.remainingTime <= 0) {
      currentProc.remainingTime = 0;
      currentProc.completed = true;
      eventLog.push({ time: currentTime, type: 'info', message: `${currentProc.pid} completed execution at t=${currentTime}` });
    } else {
      // Requeue current process
      readyQueue.push(currentProc);
      currentProc.inQueue = true;
    }

    lastPid = currentProc.pid;
  }

  const metrics = calculateMetrics(procs, timeline, currentTime, csCount);
  return { timeline, ...metrics, eventLog };
}

// ----------------------------------------------------
// 6. Multilevel Queue (MLQ) - Static Queue Assignment
// ----------------------------------------------------
export function simulateMLQ(processes, options = {}) {
  // Queue 0: High Priority (Round Robin q=2)
  // Queue 1: Low Priority (FCFS)
  const quantum = Math.max(1, options.timeQuantum || 2);
  const cs = Math.max(0, options.csOverhead || 0);

  let currentTime = 0;
  const timeline = [];
  const eventLog = [];
  let csCount = 0;

  let procs = processes.map((p, i) => ({
    ...p,
    arrivalTime: Math.max(0, p.arrivalTime || 0),
    burstTime: Math.max(1, p.burstTime || 1),
    remainingTime: Math.max(1, p.burstTime || 1),
    queueLevel: p.queueLevel !== undefined ? p.queueLevel : (p.priority <= 2 ? 0 : 1),
    color: getProcessColor(i),
    completed: false
  }));

  let lastPid = null;
  const maxTimeLimit = procs.reduce((acc, p) => acc + p.arrivalTime + p.burstTime + (cs * 5), 0) + 1000;
  let steps = 0;
  const maxSteps = 5000;

  let q0Head = 0;

  while (procs.some(p => !p.completed) && currentTime < maxTimeLimit && steps < maxSteps) {
    steps++;
    const readyQ0 = procs.filter(p => !p.completed && p.arrivalTime <= currentTime && p.queueLevel === 0);
    const readyQ1 = procs.filter(p => !p.completed && p.arrivalTime <= currentTime && p.queueLevel === 1);

    if (readyQ0.length === 0 && readyQ1.length === 0) {
      const uncompleted = procs.filter(p => !p.completed);
      if (uncompleted.length === 0) break;
      const nextArrival = Math.max(currentTime + 1, Math.min(...uncompleted.map(p => p.arrivalTime)));
      timeline.push({
        start: currentTime,
        end: nextArrival,
        pid: 'IDLE',
        type: 'idle',
        decisionReason: `CPU Idle: Both Queue 0 and Queue 1 empty until t=${nextArrival}`,
        remainingTimeMap: {},
        readyQueueAtStart: []
      });
      currentTime = nextArrival;
      lastPid = null;
      continue;
    }

    let currentProc = null;
    let executeTime = 1;
    let decisionReason = '';

    if (readyQ0.length > 0) {
      // High priority queue runs RR
      readyQ0.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
      const idx = q0Head % readyQ0.length;
      currentProc = readyQ0[idx];
      q0Head = (q0Head + 1) % readyQ0.length;
      executeTime = Math.max(1, Math.min(quantum, currentProc.remainingTime));
      decisionReason = `${currentProc.pid} selected from High-Priority Queue 0 (RR q=${quantum})`;
    } else {
      // Low priority queue runs FCFS
      readyQ1.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
      currentProc = readyQ1[0];
      executeTime = Math.max(1, currentProc.remainingTime);
      decisionReason = `${currentProc.pid} selected from Low-Priority Queue 1 (FCFS)`;
    }

    if (cs > 0 && lastPid && lastPid !== currentProc.pid) {
      csCount++;
      timeline.push({
        start: currentTime,
        end: currentTime + cs,
        pid: 'CS',
        type: 'cs',
        decisionReason: `Context switch penalty to ${currentProc.pid}`,
        remainingTimeMap: {},
        readyQueueAtStart: [...readyQ0, ...readyQ1].map(r => r.pid)
      });
      currentTime += cs;
    }

    const remMap = {};
    procs.forEach(p => remMap[p.pid] = p.remainingTime);

    timeline.push({
      start: currentTime,
      end: currentTime + executeTime,
      pid: currentProc.pid,
      type: 'run',
      color: currentProc.color,
      decisionReason,
      remainingTimeMap: remMap,
      readyQueueAtStart: [...readyQ0, ...readyQ1].map(r => r.pid)
    });

    eventLog.push({
      time: currentTime,
      type: 'success',
      message: `${currentProc.pid} running from Queue ${currentProc.queueLevel} for ${executeTime}ms`
    });

    currentTime += executeTime;
    currentProc.remainingTime -= executeTime;

    if (currentProc.remainingTime <= 0) {
      currentProc.remainingTime = 0;
      currentProc.completed = true;
      eventLog.push({ time: currentTime, type: 'info', message: `${currentProc.pid} completed at t=${currentTime}` });
    }

    lastPid = currentProc.pid;
  }

  const mergedTimeline = mergeTimelineBlocks(timeline);
  const metrics = calculateMetrics(procs, mergedTimeline, currentTime, csCount);
  return { timeline: mergedTimeline, ...metrics, eventLog };
}

// ----------------------------------------------------
// 7. Multilevel Feedback Queue (MLFQ) - Dynamic Queue Feedback
// ----------------------------------------------------
export function simulateMLFQ(processes, options = {}) {
  // Q0: RR q=2
  // Q1: RR q=4
  // Q2: FCFS
  const q0Quantum = 2;
  const q1Quantum = 4;
  const cs = Math.max(0, options.csOverhead || 0);

  let currentTime = 0;
  const timeline = [];
  const eventLog = [];
  let csCount = 0;

  let procs = processes.map((p, i) => ({
    ...p,
    arrivalTime: Math.max(0, p.arrivalTime || 0),
    burstTime: Math.max(1, p.burstTime || 1),
    remainingTime: Math.max(1, p.burstTime || 1),
    currentQueue: 0, // Starts at highest priority Q0
    color: getProcessColor(i),
    completed: false
  }));

  let lastPid = null;
  const maxTimeLimit = procs.reduce((acc, p) => acc + p.arrivalTime + p.burstTime + (cs * 5), 0) + 1000;
  let steps = 0;
  const maxSteps = 5000;

  let q0Head = 0;
  let q1Head = 0;

  while (procs.some(p => !p.completed) && currentTime < maxTimeLimit && steps < maxSteps) {
    steps++;
    const ready = procs.filter(p => !p.completed && p.arrivalTime <= currentTime);

    if (ready.length === 0) {
      const uncompleted = procs.filter(p => !p.completed);
      if (uncompleted.length === 0) break;
      const nextArrival = Math.max(currentTime + 1, Math.min(...uncompleted.map(p => p.arrivalTime)));
      timeline.push({
        start: currentTime,
        end: nextArrival,
        pid: 'IDLE',
        type: 'idle',
        decisionReason: `CPU Idle: All queues empty until t=${nextArrival}`,
        remainingTimeMap: {},
        readyQueueAtStart: []
      });
      currentTime = nextArrival;
      lastPid = null;
      continue;
    }

    // Pick top-most active queue
    const q0List = ready.filter(p => p.currentQueue === 0);
    const q1List = ready.filter(p => p.currentQueue === 1);
    const q2List = ready.filter(p => p.currentQueue === 2);

    let currentProc = null;
    let executeTime = 1;
    let decisionReason = '';
    let quantumUsed = 0;

    if (q0List.length > 0) {
      q0List.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
      const idx = q0Head % q0List.length;
      currentProc = q0List[idx];
      q0Head = (q0Head + 1) % q0List.length;
      quantumUsed = q0Quantum;
      executeTime = Math.max(1, Math.min(q0Quantum, currentProc.remainingTime));
      decisionReason = `${currentProc.pid} running in Q0 (RR q=${q0Quantum})`;
    } else if (q1List.length > 0) {
      q1List.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
      const idx = q1Head % q1List.length;
      currentProc = q1List[idx];
      q1Head = (q1Head + 1) % q1List.length;
      quantumUsed = q1Quantum;
      executeTime = Math.max(1, Math.min(q1Quantum, currentProc.remainingTime));
      decisionReason = `${currentProc.pid} running in Q1 (RR q=${q1Quantum})`;
    } else if (q2List.length > 0) {
      q2List.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
      currentProc = q2List[0];
      executeTime = Math.max(1, currentProc.remainingTime); // FCFS
      decisionReason = `${currentProc.pid} running in Q2 (FCFS background queue)`;
    }

    if (cs > 0 && lastPid && lastPid !== currentProc.pid) {
      csCount++;
      timeline.push({
        start: currentTime,
        end: currentTime + cs,
        pid: 'CS',
        type: 'cs',
        decisionReason: `Context switch penalty to ${currentProc.pid}`,
        remainingTimeMap: {},
        readyQueueAtStart: ready.map(r => r.pid)
      });
      currentTime += cs;
    }

    const remMap = {};
    procs.forEach(p => remMap[p.pid] = p.remainingTime);

    timeline.push({
      start: currentTime,
      end: currentTime + executeTime,
      pid: currentProc.pid,
      type: 'run',
      color: currentProc.color,
      decisionReason,
      remainingTimeMap: remMap,
      readyQueueAtStart: ready.map(r => r.pid)
    });

    currentTime += executeTime;
    currentProc.remainingTime -= executeTime;

    if (currentProc.remainingTime <= 0) {
      currentProc.remainingTime = 0;
      currentProc.completed = true;
      eventLog.push({ time: currentTime, type: 'info', message: `${currentProc.pid} completed at t=${currentTime}` });
    } else {
      // If used full quantum without completing, demote to next lower queue
      if (quantumUsed > 0 && executeTime === quantumUsed && currentProc.currentQueue < 2) {
        currentProc.currentQueue++;
        eventLog.push({
          time: currentTime,
          type: 'warning',
          message: `MLFQ DEMOTION: ${currentProc.pid} demoted to Queue ${currentProc.currentQueue}`
        });
      }
    }

    lastPid = currentProc.pid;
  }

  const mergedTimeline = mergeTimelineBlocks(timeline);
  const metrics = calculateMetrics(procs, mergedTimeline, currentTime, csCount);
  return { timeline: mergedTimeline, ...metrics, eventLog };
}

/**
 * Unified dispatch function for all CPU scheduling algorithms.
 */
export function runSimulation(algorithm, processes, options = {}) {
  switch (algorithm) {
    case 'FCFS':
      return simulateFCFS(processes, options);
    case 'SJF':
      return simulateSJF(processes, options);
    case 'SRTF':
      return simulateSRTF(processes, options);
    case 'PRIORITY_NP':
      return simulatePriority(processes, { ...options, preemptive: false });
    case 'PRIORITY_P':
      return simulatePriority(processes, { ...options, preemptive: true });
    case 'RR':
      return simulateRoundRobin(processes, options);
    case 'MLQ':
      return simulateMLQ(processes, options);
    case 'MLFQ':
      return simulateMLFQ(processes, options);
    default:
      return simulateFCFS(processes, options);
  }
}
