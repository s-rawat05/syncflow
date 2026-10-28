import test from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateFCFS,
  simulateSJF,
  simulateSRTF,
  simulatePriority,
  simulateRoundRobin,
  runSimulation
} from '../src/engine/schedulerEngine.js';

test('Test A - FCFS (context-switch 0)', () => {
  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 8 },
    { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 6 }
  ];

  const result = simulateFCFS(processes, { csOverhead: 0 });
  const metrics = result.processMetrics.reduce((acc, p) => {
    acc[p.pid] = p;
    return acc;
  }, {});

  // Completion times: 5, 8, 16, 22
  assert.equal(metrics.P1.completionTime, 5);
  assert.equal(metrics.P2.completionTime, 8);
  assert.equal(metrics.P3.completionTime, 16);
  assert.equal(metrics.P4.completionTime, 22);

  // Waiting times: 0, 4, 6, 13
  assert.equal(metrics.P1.waitingTime, 0);
  assert.equal(metrics.P2.waitingTime, 4);
  assert.equal(metrics.P3.waitingTime, 6);
  assert.equal(metrics.P4.waitingTime, 13);

  // Averages: avg WT 5.75, avg TAT 11.25
  assert.equal(result.summaryMetrics.avgWaitingTime, 5.75);
  assert.equal(result.summaryMetrics.avgTurnaroundTime, 11.25);
});

test('Test A - SJF Non-Preemptive (context-switch 0)', () => {
  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 8 },
    { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 6 }
  ];

  const result = simulateSJF(processes, { csOverhead: 0 });
  const metrics = result.processMetrics.reduce((acc, p) => {
    acc[p.pid] = p;
    return acc;
  }, {});

  // Execution order: P1, P2, P4, P3
  const executionOrder = result.timeline
    .filter(s => s.type === 'run')
    .map(s => s.pid);
  assert.deepEqual(executionOrder, ['P1', 'P2', 'P4', 'P3']);

  // Waiting times: 0, 4, 12, 5; avg WT 5.25
  assert.equal(metrics.P1.waitingTime, 0);
  assert.equal(metrics.P2.waitingTime, 4);
  assert.equal(metrics.P3.waitingTime, 12);
  assert.equal(metrics.P4.waitingTime, 5);
  assert.equal(result.summaryMetrics.avgWaitingTime, 5.25);
});

test('Test A - SRTF (context-switch 0)', () => {
  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 8 },
    { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 6 }
  ];

  const result = simulateSRTF(processes, { csOverhead: 0 });
  const metrics = result.processMetrics.reduce((acc, p) => {
    acc[p.pid] = p;
    return acc;
  }, {});

  // Slices: P1[0,1] P2[1,4] P1[4,8] P4[8,14] P3[14,22]
  const runSlices = result.timeline
    .filter(s => s.type === 'run')
    .map(s => ({ pid: s.pid, start: s.start, end: s.end }));

  assert.deepEqual(runSlices, [
    { pid: 'P1', start: 0, end: 1 },
    { pid: 'P2', start: 1, end: 4 },
    { pid: 'P1', start: 4, end: 8 },
    { pid: 'P4', start: 8, end: 14 },
    { pid: 'P3', start: 14, end: 22 }
  ]);

  // WT: 3, 0, 12, 5; avg WT 5.00
  assert.equal(metrics.P1.waitingTime, 3);
  assert.equal(metrics.P2.waitingTime, 0);
  assert.equal(metrics.P3.waitingTime, 12);
  assert.equal(metrics.P4.waitingTime, 5);
  assert.equal(result.summaryMetrics.avgWaitingTime, 5.00);

  // RT: 0, 0, 12, 5
  assert.equal(metrics.P1.responseTime, 0);
  assert.equal(metrics.P2.responseTime, 0);
  assert.equal(metrics.P3.responseTime, 12);
  assert.equal(metrics.P4.responseTime, 5);
});

test('Test B - Priority Non-Preemptive (context-switch 0, no aging)', () => {
  // Lower number = more urgent: P1 pri 3, P2 pri 1, P3 pri 4, P4 pri 2
  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 2, priority: 4 },
    { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 1, priority: 2 }
  ];

  const result = simulatePriority(processes, { preemptive: false, agingEnabled: false, csOverhead: 0 });
  const metrics = result.processMetrics.reduce((acc, p) => {
    acc[p.pid] = p;
    return acc;
  }, {});

  // Order: P1, P2, P4, P3
  const executionOrder = result.timeline
    .filter(s => s.type === 'run')
    .map(s => s.pid);
  assert.deepEqual(executionOrder, ['P1', 'P2', 'P4', 'P3']);

  // WT: 0, 3, 6, 4; avg 3.25
  assert.equal(metrics.P1.waitingTime, 0);
  assert.equal(metrics.P2.waitingTime, 3);
  assert.equal(metrics.P3.waitingTime, 6);
  assert.equal(metrics.P4.waitingTime, 4);
  assert.equal(result.summaryMetrics.avgWaitingTime, 3.25);
});

test('Test B - Priority Preemptive (context-switch 0, no aging)', () => {
  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 2, priority: 4 },
    { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 1, priority: 2 }
  ];

  const result = simulatePriority(processes, { preemptive: true, agingEnabled: false, csOverhead: 0 });
  const metrics = result.processMetrics.reduce((acc, p) => {
    acc[p.pid] = p;
    return acc;
  }, {});

  // Slices: P1[0,1] P2[1,4] P4[4,5] P1[5,8] P3[8,10]
  // Note: Since simulatePriority runs unit-by-unit in preemptive mode, we merge contiguous slots for the same PID or inspect the raw slices
  const rawRunSlices = result.timeline.filter(s => s.type === 'run');

  // Let's check both: either unit slices or merged slices
  const mergedSlices = [];
  rawRunSlices.forEach(s => {
    const prev = mergedSlices[mergedSlices.length - 1];
    if (prev && prev.pid === s.pid && prev.end === s.start) {
      prev.end = s.end;
    } else {
      mergedSlices.push({ pid: s.pid, start: s.start, end: s.end });
    }
  });

  assert.deepEqual(mergedSlices, [
    { pid: 'P1', start: 0, end: 1 },
    { pid: 'P2', start: 1, end: 4 },
    { pid: 'P4', start: 4, end: 5 },
    { pid: 'P1', start: 5, end: 8 },
    { pid: 'P3', start: 8, end: 10 }
  ]);

  // WT: 4, 0, 6, 1; avg 2.75
  assert.equal(metrics.P1.waitingTime, 4);
  assert.equal(metrics.P2.waitingTime, 0);
  assert.equal(metrics.P3.waitingTime, 6);
  assert.equal(metrics.P4.waitingTime, 1);
  assert.equal(result.summaryMetrics.avgWaitingTime, 2.75);
});

test('Round Robin - Hand-computed Test & Arrival/Preemption Ordering Convention', () => {
  /**
   * CONVENTION UNDER TEST:
   * When a process completes its time quantum at time t, and one or more new processes arrive
   * at time t, the newly arrived processes are added to the ready queue FIRST, before the
   * just-preempted process is requeued at the tail of the ready queue.
   *
   * Workload:
   * Quantum q = 2, cs = 0
   * (P1, arrival 0, burst 5)
   * (P2, arrival 2, burst 3)
   * (P3, arrival 4, burst 2)
   *
   * Timeline:
   * t=0..2: P1 runs (remaining 3). At t=2, P2 arrives. P2 queued first, then P1 requeued. Queue: [P2, P1].
   * t=2..4: P2 runs (remaining 1). At t=4, P3 arrives. P3 queued first, then P2 requeued. Queue: [P1, P3, P2].
   * t=4..6: P1 runs (remaining 1). At t=6, no arrival. P1 requeued. Queue: [P3, P2, P1].
   * t=6..8: P3 runs (remaining 0) -> Completed at 8. Queue: [P2, P1].
   * t=8..9: P2 runs (remaining 0) -> Completed at 9. Queue: [P1].
   * t=9..10: P1 runs (remaining 0) -> Completed at 10.
   */
  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5 },
    { id: '2', pid: 'P2', arrivalTime: 2, burstTime: 3 },
    { id: '3', pid: 'P3', arrivalTime: 4, burstTime: 2 }
  ];

  const result = simulateRoundRobin(processes, { timeQuantum: 2, csOverhead: 0 });
  const metrics = result.processMetrics.reduce((acc, p) => {
    acc[p.pid] = p;
    return acc;
  }, {});

  const runSlices = result.timeline
    .filter(s => s.type === 'run')
    .map(s => ({ pid: s.pid, start: s.start, end: s.end }));

  assert.deepEqual(runSlices, [
    { pid: 'P1', start: 0, end: 2 },
    { pid: 'P2', start: 2, end: 4 },
    { pid: 'P1', start: 4, end: 6 },
    { pid: 'P3', start: 6, end: 8 },
    { pid: 'P2', start: 8, end: 9 },
    { pid: 'P1', start: 9, end: 10 }
  ]);

  // Completions
  assert.equal(metrics.P1.completionTime, 10);
  assert.equal(metrics.P2.completionTime, 9);
  assert.equal(metrics.P3.completionTime, 8);

  // Waiting times: P1: 10-0-5=5; P2: 9-2-3=4; P3: 8-4-2=2
  assert.equal(metrics.P1.waitingTime, 5);
  assert.equal(metrics.P2.waitingTime, 4);
  assert.equal(metrics.P3.waitingTime, 2);

  // Response times: P1: 0-0=0; P2: 2-2=0; P3: 6-4=2
  assert.equal(metrics.P1.responseTime, 0);
  assert.equal(metrics.P2.responseTime, 0);
  assert.equal(metrics.P3.responseTime, 2);

  // Averages
  assert.equal(result.summaryMetrics.avgWaitingTime, 3.67);
  assert.equal(result.summaryMetrics.avgTurnaroundTime, 7.00);
  assert.equal(result.summaryMetrics.avgResponseTime, 0.67);
});
