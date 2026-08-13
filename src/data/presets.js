/**
 * SyncFlow Presets and Demo Workloads
 */

export const PRESETS = [
  {
    id: 'textbook',
    name: 'Textbook Classic',
    description: 'Standard 5-process scenario with varying arrival and burst times from OS Silberschatz.',
    algorithm: 'RR',
    timeQuantum: 2,
    processes: [
      { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3, queueLevel: 0 },
      { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1, queueLevel: 0 },
      { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4, queueLevel: 1 },
      { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2, queueLevel: 1 },
      { id: '5', pid: 'P5', arrivalTime: 4, burstTime: 2, priority: 5, queueLevel: 2 },
    ]
  },
  {
    id: 'convoy',
    name: 'Convoy Effect Demo',
    description: 'Demonstrates how a massive process arriving first (P1) stalls subsequent short processes in FCFS vs SJF.',
    algorithm: 'FCFS',
    timeQuantum: 2,
    processes: [
      { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 24, priority: 3, queueLevel: 0 },
      { id: '2', pid: 'P2', arrivalTime: 0, burstTime: 3, priority: 1, queueLevel: 0 },
      { id: '3', pid: 'P3', arrivalTime: 0, burstTime: 3, priority: 2, queueLevel: 0 },
    ]
  },
  {
    id: 'starvation',
    name: 'Starvation & Aging Showcase',
    description: 'A low-priority process (P4) is starved by continuous high-priority arrivals until Aging is enabled.',
    algorithm: 'PRIORITY_P',
    timeQuantum: 2,
    processes: [
      { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 6, priority: 1, queueLevel: 0 },
      { id: '2', pid: 'P2', arrivalTime: 2, burstTime: 5, priority: 1, queueLevel: 0 },
      { id: '3', pid: 'P3', arrivalTime: 4, burstTime: 5, priority: 1, queueLevel: 0 },
      { id: '4', pid: 'P4', arrivalTime: 0, burstTime: 8, priority: 10, queueLevel: 1 }, // Low priority
    ]
  },
  {
    id: 'quantum-demo',
    name: 'Quantum Sensitivity (RR)',
    description: 'Shows how small vs large time quantum affects context switches and turnaround time.',
    algorithm: 'RR',
    timeQuantum: 2,
    processes: [
      { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 10, priority: 1, queueLevel: 0 },
      { id: '2', pid: 'P2', arrivalTime: 0, burstTime: 12, priority: 2, queueLevel: 0 },
      { id: '3', pid: 'P3', arrivalTime: 0, burstTime: 8, priority: 1, queueLevel: 0 },
      { id: '4', pid: 'P4', arrivalTime: 0, burstTime: 6, priority: 3, queueLevel: 0 },
    ]
  },
  {
    id: 'mlfq-demo',
    name: 'MLFQ Dynamic Queue Flow',
    description: 'CPU-bound job (P1) is demoted to lower queues while interactive job (P2) stays in top queue.',
    algorithm: 'MLFQ',
    timeQuantum: 2,
    processes: [
      { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 14, priority: 2, queueLevel: 0 },
      { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 2, priority: 1, queueLevel: 0 },
      { id: '3', pid: 'P3', arrivalTime: 3, burstTime: 10, priority: 3, queueLevel: 0 },
    ]
  }
];

export function generateRandomWorkload(count = 5) {
  const processes = [];
  for (let i = 1; i <= count; i++) {
    processes.push({
      id: String(i),
      pid: `P${i}`,
      arrivalTime: Math.floor(Math.random() * 6),
      burstTime: Math.floor(Math.random() * 10) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
      queueLevel: Math.random() > 0.5 ? 0 : 1
    });
  }
  return processes;
}
