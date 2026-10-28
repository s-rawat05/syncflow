import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createApp } from '../server/app.js';
import { resetDatabase } from '../server/db/reset.js';
import { runSimulation } from '../src/engine/schedulerEngine.js';
import { PRESETS } from '../src/data/presets.js';

function setupApiTest() {
  const db = new Database(':memory:');
  resetDatabase(db);
  const app = createApp(db);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    db,
    server,
    baseUrl,
    close: () => new Promise(res => server.close(res))
  };
}

async function registerUser(baseUrl, name = 'Test User', email = 'test@example.com', password = 'password123') {
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  return await res.json();
}

test('Phase 5 - Algorithm Lookup API', async () => {
  const ctx = setupApiTest();
  try {
    const res = await fetch(`${ctx.baseUrl}/api/algorithms`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.algorithms.length, 8);
    const codes = data.algorithms.map(a => a.Code);
    assert.ok(codes.includes('FCFS'));
    assert.ok(codes.includes('RR'));
    assert.ok(codes.includes('MLFQ'));
  } finally {
    await ctx.close();
  }
});

test('Phase 5 - Scenarios CRUD, Duplicate, Import and 409 Lock on Runs', async () => {
  const ctx = setupApiTest();
  try {
    const { token } = await registerUser(ctx.baseUrl);
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 1. Create scenario with processes (POST /api/scenarios)
    const createRes = await fetch(`${ctx.baseUrl}/api/scenarios`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Batch Jobs',
        description: 'Standard workload',
        isPublic: 1,
        processes: [
          { pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
          { pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 }
        ]
      })
    });
    assert.equal(createRes.status, 201);
    const { scenario } = await createRes.json();
    assert.equal(scenario.Title, 'Batch Jobs');
    assert.equal(scenario.processes.length, 2);

    // 2. Fetch my scenarios (GET /api/scenarios)
    const listRes = await fetch(`${ctx.baseUrl}/api/scenarios`, { headers: authHeaders });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.scenarios.length, 1);
    assert.equal(listData.scenarios[0].ProcessCount, 2);
    assert.equal(listData.scenarios[0].RunCount, 0);

    // 3. Fetch public scenarios (GET /api/scenarios/public)
    const pubRes = await fetch(`${ctx.baseUrl}/api/scenarios/public`);
    assert.equal(pubRes.status, 200);
    const pubData = await pubRes.json();
    assert.equal(pubData.scenarios.length, 1);
    assert.equal(pubData.scenarios[0].Title, 'Batch Jobs');

    // 4. Duplicate scenario (POST /api/scenarios/:id/duplicate)
    const dupRes = await fetch(`${ctx.baseUrl}/api/scenarios/${scenario.ScenarioID}/duplicate`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.equal(dupRes.status, 201);
    const dupData = await dupRes.json();
    assert.equal(dupData.scenario.Title, 'Batch Jobs (Copy)');
    assert.equal(dupData.scenario.processes.length, 2);

    // 5. Import scenario JSON (POST /api/scenarios/import)
    const importRes = await fetch(`${ctx.baseUrl}/api/scenarios/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify([
        { pid: 'P10', arrivalTime: 0, burstTime: 8 },
        { pid: 'P20', arrivalTime: 2, burstTime: 4 }
      ])
    });
    assert.equal(importRes.status, 201);
    const importData = await importRes.json();
    assert.equal(importData.scenario.processes.length, 2);

    // 6. Save a run on the first scenario so it becomes locked
    const sim = runSimulation('FCFS', scenario.processes, { csOverhead: 0 });
    const runRes = await fetch(`${ctx.baseUrl}/api/runs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        scenarioId: scenario.ScenarioID,
        algorithmCode: 'FCFS',
        timeline: sim.timeline,
        processMetrics: sim.processMetrics
      })
    });
    assert.equal(runRes.status, 201);

    // 7. Attempt to update processes on locked scenario -> Expect 409 with hint
    const lockUpdateRes = await fetch(`${ctx.baseUrl}/api/scenarios/${scenario.ScenarioID}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Updated Title',
        processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 99 }]
      })
    });
    assert.equal(lockUpdateRes.status, 409);
    const lockUpdateData = await lockUpdateRes.json();
    assert.equal(lockUpdateData.canSaveAsCopy, true);
    assert.ok(lockUpdateData.error.includes('Save as copy'));

    // 8. Delete scenario cascades (DELETE /api/scenarios/:id)
    const delRes = await fetch(`${ctx.baseUrl}/api/scenarios/${scenario.ScenarioID}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert.equal(delRes.status, 200);

    const getAfterDel = await fetch(`${ctx.baseUrl}/api/scenarios/${scenario.ScenarioID}`);
    assert.equal(getAfterDel.status, 404);
  } finally {
    await ctx.close();
  }
});

test('Phase 5 - Transaction Rollback Demo: failAfterSlots leaves zero partial records', async () => {
  const ctx = setupApiTest();
  try {
    const { token } = await registerUser(ctx.baseUrl);
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // Create scenario
    const scRes = await fetch(`${ctx.baseUrl}/api/scenarios`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Rollback Demo Scenario',
        processes: [
          { pid: 'P1', arrivalTime: 0, burstTime: 5 },
          { pid: 'P2', arrivalTime: 1, burstTime: 3 },
          { pid: 'P3', arrivalTime: 2, burstTime: 4 }
        ]
      })
    });
    const { scenario } = await scRes.json();

    const sim = runSimulation('FCFS', scenario.processes, { csOverhead: 0 });

    // Intentionally request rollback after 1 slot
    const failRes = await fetch(`${ctx.baseUrl}/api/runs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        scenarioId: scenario.ScenarioID,
        algorithmCode: 'FCFS',
        timeline: sim.timeline,
        processMetrics: sim.processMetrics,
        failAfterSlots: 1
      })
    });

    assert.equal(failRes.status, 422);
    const failData = await failRes.json();
    assert.ok(failData.details.includes('Simulated rollback triggered after 1 slots'));

    // Verify atomic rollback in DB: ZERO runs, ZERO slots, ZERO metrics exist!
    const runCount = ctx.db.prepare('SELECT count(*) as c FROM SimulationRuns WHERE ScenarioID = ?').get(scenario.ScenarioID).c;
    const slotCount = ctx.db.prepare('SELECT count(*) as c FROM GanttSlots').get().c;
    const metricCount = ctx.db.prepare('SELECT count(*) as c FROM RunMetrics').get().c;

    assert.equal(runCount, 0, 'SimulationRuns must have 0 rows after rollback');
    assert.equal(slotCount, 0, 'GanttSlots must have 0 rows after rollback');
    assert.equal(metricCount, 0, 'RunMetrics must have 0 rows after rollback');
  } finally {
    await ctx.close();
  }
});

test('Phase 5 - Race Mode Persistence and Batch Verification', async () => {
  const ctx = setupApiTest();
  try {
    const { token } = await registerUser(ctx.baseUrl);
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    const scRes = await fetch(`${ctx.baseUrl}/api/scenarios`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Race Scenario',
        processes: [
          { pid: 'P1', arrivalTime: 0, burstTime: 6, priority: 2 },
          { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
          { pid: 'P3', arrivalTime: 2, burstTime: 2, priority: 3 }
        ]
      })
    });
    const { scenario } = await scRes.json();

    const fcfsSim = runSimulation('FCFS', scenario.processes, { csOverhead: 0 });
    const sjfSim = runSimulation('SJF', scenario.processes, { csOverhead: 0 });

    // Save race
    const raceRes = await fetch(`${ctx.baseUrl}/api/runs/race`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        scenarioId: scenario.ScenarioID,
        raceGroup: 'grand_prix_2026',
        runs: [
          {
            algorithmCode: 'FCFS',
            timeline: fcfsSim.timeline,
            processMetrics: fcfsSim.processMetrics
          },
          {
            algorithmCode: 'SJF',
            timeline: sjfSim.timeline,
            processMetrics: sjfSim.processMetrics
          }
        ]
      })
    });

    assert.equal(raceRes.status, 201);
    const raceData = await raceRes.json();
    assert.equal(raceData.runIds.length, 2);
    assert.equal(raceData.raceGroup, 'grand_prix_2026');

    // Check history (GET /api/runs?scenarioId=)
    const historyRes = await fetch(`${ctx.baseUrl}/api/runs?scenarioId=${scenario.ScenarioID}`, {
      headers: authHeaders
    });
    assert.equal(historyRes.status, 200);
    const historyData = await historyRes.json();
    assert.equal(historyData.runs.length, 2);

    // Check full run details (GET /api/runs/:id)
    const runId = raceData.runIds[0];
    const runDetailRes = await fetch(`${ctx.baseUrl}/api/runs/${runId}`, {
      headers: authHeaders
    });
    assert.equal(runDetailRes.status, 200);
    const runDetail = await runDetailRes.json();
    assert.ok(runDetail.run);
    assert.ok(runDetail.slots.length > 0);
    assert.equal(runDetail.metrics.length, 3);

    // Check user stats (GET /api/me/stats)
    const statsRes = await fetch(`${ctx.baseUrl}/api/me/stats`, { headers: authHeaders });
    assert.equal(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.equal(statsData.stats.ScenarioCount, 1);
    assert.equal(statsData.stats.RunCount, 2);
  } finally {
    await ctx.close();
  }
});

test('Phase 5 - Comprehensive Verification: /verify returns 0 mismatches for EVERY algorithm on EVERY preset scenario', async () => {
  const ctx = setupApiTest();
  try {
    const { token } = await registerUser(ctx.baseUrl);
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    const algorithms = ['FCFS', 'SJF', 'SRTF', 'PRIORITY_NP', 'PRIORITY_P', 'RR', 'MLQ', 'MLFQ'];

    for (const preset of PRESETS) {
      // Create scenario for this preset
      const scRes = await fetch(`${ctx.baseUrl}/api/scenarios`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: preset.name,
          description: preset.description,
          processes: preset.processes
        })
      });
      assert.equal(scRes.status, 201, `Failed to create scenario for ${preset.name}`);
      const { scenario } = await scRes.json();

      for (const algoCode of algorithms) {
        const quantum = algoCode === 'RR' || algoCode === 'MLQ' ? (preset.timeQuantum || 2) : null;
        const sim = runSimulation(algoCode, scenario.processes, {
          timeQuantum: preset.timeQuantum || 2,
          csOverhead: 0,
          agingEnabled: false
        });

        // Setup queue config if MLQ or MLFQ
        const queueConfig = [];
        if (algoCode === 'MLQ') {
          queueConfig.push({ queueLevel: 0, queueAlgorithm: 'RR', quantum: preset.timeQuantum || 2 });
          queueConfig.push({ queueLevel: 1, queueAlgorithm: 'FCFS', quantum: null });
        } else if (algoCode === 'MLFQ') {
          queueConfig.push({ queueLevel: 0, queueAlgorithm: 'RR', quantum: 2 });
          queueConfig.push({ queueLevel: 1, queueAlgorithm: 'RR', quantum: 4 });
          queueConfig.push({ queueLevel: 2, queueAlgorithm: 'FCFS', quantum: null });
        }

        // Save run
        const runRes = await fetch(`${ctx.baseUrl}/api/runs`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            scenarioId: scenario.ScenarioID,
            algorithmCode: algoCode,
            quantum,
            contextSwitchTime: 0,
            queueConfig,
            timeline: sim.timeline,
            processMetrics: sim.processMetrics
          })
        });

        assert.equal(runRes.status, 201, `Failed to save run ${algoCode} on ${preset.name}`);
        const { runId } = await runRes.json();

        // Verify run
        const verifyRes = await fetch(`${ctx.baseUrl}/api/runs/${runId}/verify`, {
          headers: authHeaders
        });
        assert.equal(verifyRes.status, 200);
        const verifyData = await verifyRes.json();

        assert.equal(
          verifyData.isVerified,
          true,
          `Run ${runId} (${algoCode} on ${preset.name}) failed verification with ${verifyData.mismatchCount} mismatches: ${JSON.stringify(verifyData.mismatches)}`
        );
        assert.equal(verifyData.mismatches.length, 0);
      }
    }
  } finally {
    await ctx.close();
  }
});
