-- ============================================================================
-- SyncFlow Relational Database Schema (SQLite)
-- Single Source of Truth
--
-- Every constraint, trigger, view, and index includes an explanatory comment
-- identifying the specific Database Management System (DBMS) concept.
-- ============================================================================

-- Enforce Foreign Key Referencing Constraints on Connection
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Table: Users
-- DBMS Concept: Entity Integrity (Primary Key), Domain Integrity (CHECK constraints)
-- Candidate Key / Uniqueness Constraint on Email
-- ----------------------------------------------------------------------------
CREATE TABLE Users (
    -- Entity Integrity: Surrogate primary key uniquely identifying each user
    UserID        INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Domain Integrity: Name length must be between 2 and 60 characters
    Name          TEXT NOT NULL CHECK(length(Name) BETWEEN 2 AND 60),

    -- Domain Integrity & Uniqueness: Valid email pattern and unique candidate key
    Email         TEXT NOT NULL UNIQUE CHECK(Email LIKE '%_@_%._%'),

    -- Security / Attribute Storage: Bcrypt hash of password (plain text never stored)
    PasswordHash  TEXT NOT NULL,

    -- Audit Timestamp: Temporal tracking of user account creation
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Table: Scenarios
-- DBMS Concept: Relational Association (1:M User to Scenarios),
-- Referential Integrity (Foreign Key with ON DELETE CASCADE),
-- Composite Uniqueness Constraint (Candidate Key: (OwnerID, Title))
-- ----------------------------------------------------------------------------
CREATE TABLE Scenarios (
    -- Entity Integrity: Primary key for workload scenario
    ScenarioID    INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Referential Integrity: Scenario must belong to an existing User
    OwnerID       INTEGER NOT NULL,

    -- Domain Integrity: Title constrained between 1 and 80 characters
    Title         TEXT NOT NULL CHECK(length(Title) BETWEEN 1 AND 80),

    -- Attribute Domain: Optional descriptive text
    Description   TEXT,

    -- Domain Integrity: Boolean flag represented as integer {0, 1}
    IsPublic      INTEGER NOT NULL DEFAULT 0 CHECK(IsPublic IN (0,1)),

    -- Audit Timestamps: Temporal metadata for lifecycle auditing
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Candidate Key: Enforces that an owner cannot have duplicate scenario titles
    UNIQUE(OwnerID, Title),

    -- Referential Integrity: Deleting an owner cascades to delete their scenarios
    FOREIGN KEY (OwnerID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table: Processes
-- DBMS Concept: First Normal Form (1NF) - Each process is an individual atomic tuple;
-- Composite Primary Key (ScenarioID, PID);
-- Domain Range Constraints (BurstTime > 0, ArrivalTime >= 0);
-- Referential Integrity with CASCADE
-- ----------------------------------------------------------------------------
CREATE TABLE Processes (
    -- Identifying Foreign Key component of Composite Primary Key
    ScenarioID    INTEGER NOT NULL,

    -- Domain Integrity: PID identifier between 1 and 10 characters (e.g. 'P1')
    PID           TEXT NOT NULL CHECK(length(PID) BETWEEN 1 AND 10),

    -- Domain Integrity: Arrival timestamp cannot be negative
    ArrivalTime   INTEGER NOT NULL CHECK(ArrivalTime >= 0),

    -- Domain Integrity: CPU Burst time must be strictly positive (> 0)
    BurstTime     INTEGER NOT NULL CHECK(BurstTime > 0),

    -- Domain Integrity: Priority rank (optional or non-negative integer)
    Priority      INTEGER CHECK(Priority IS NULL OR Priority >= 0),

    -- Domain Integrity: Target queue index for multilevel queue architectures
    QueueLevel    INTEGER CHECK(QueueLevel IS NULL OR QueueLevel >= 0),

    -- Entity Integrity: Composite Primary Key ensuring unique PID per scenario
    PRIMARY KEY (ScenarioID, PID),

    -- Referential Integrity: Cascade delete all processes when scenario is dropped
    FOREIGN KEY (ScenarioID) REFERENCES Scenarios(ScenarioID) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table: Algorithms
-- DBMS Concept: Lookup / Dimension Table, Domain Enum Enforced by Unique Key
-- ----------------------------------------------------------------------------
CREATE TABLE Algorithms (
    -- Entity Integrity: Surrogate primary key for CPU scheduling algorithms
    AlgorithmID   INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Candidate Key: Standardized algorithm mnemonic code
    Code          TEXT NOT NULL UNIQUE,

    -- Attribute Domain: Full human-readable algorithm name
    Name          TEXT NOT NULL,

    -- Domain Integrity: Preemption flag {0, 1}
    IsPreemptive  INTEGER NOT NULL CHECK(IsPreemptive IN (0,1)),

    -- Domain Integrity: Quantum requirement indicator flag
    UsesQuantum   INTEGER NOT NULL DEFAULT 0 CHECK(UsesQuantum IN (0,1)),

    -- Domain Integrity: Priority requirement indicator flag
    UsesPriority  INTEGER NOT NULL DEFAULT 0 CHECK(UsesPriority IN (0,1)),

    -- Domain Integrity: Multi-level queue support indicator flag
    UsesQueues    INTEGER NOT NULL DEFAULT 0 CHECK(UsesQueues IN (0,1))
);

-- ----------------------------------------------------------------------------
-- Table: SimulationRuns
-- DBMS Concept: Fact / Transaction Entity,
-- Multi-Table Referential Integrity,
-- Restrictive Foreign Key Delete Rules (ON DELETE RESTRICT on Algorithm)
-- ----------------------------------------------------------------------------
CREATE TABLE SimulationRuns (
    -- Entity Integrity: Unique identifier for saved simulation run
    RunID              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Referential Integrity: Source workload scenario
    ScenarioID         INTEGER NOT NULL,

    -- Referential Integrity: Algorithm reference (restricted: cannot delete algorithm with runs)
    AlgorithmID        INTEGER NOT NULL,

    -- Referential Integrity: User who executed this simulation
    RunBy              INTEGER NOT NULL,

    -- Domain Integrity: Round Robin time quantum (strictly positive if defined)
    Quantum            INTEGER CHECK(Quantum IS NULL OR Quantum > 0),

    -- Domain Integrity: Context switch overhead duration in milliseconds
    ContextSwitchTime  INTEGER NOT NULL DEFAULT 0 CHECK(ContextSwitchTime >= 0),

    -- Domain Integrity: Starvation aging interval (cycles before priority promotion)
    AgingInterval      INTEGER CHECK(AgingInterval IS NULL OR AgingInterval > 0),

    -- Correlated Grouping: Shared identifier grouping concurrent runs from Race Mode
    RaceGroup          TEXT,

    -- Temporal Audit: Execution timestamp
    CreatedAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ScenarioID)  REFERENCES Scenarios(ScenarioID) ON DELETE CASCADE,
    FOREIGN KEY (AlgorithmID) REFERENCES Algorithms(AlgorithmID) ON DELETE RESTRICT,
    FOREIGN KEY (RunBy)       REFERENCES Users(UserID) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table: RunQueueConfig
-- DBMS Concept: First Normal Form (1NF) - Multi-valued queue configuration
-- decomposed into an independent relation; Composite Primary Key (RunID, QueueLevel)
-- ----------------------------------------------------------------------------
CREATE TABLE RunQueueConfig (
    -- Composite Key Component & Foreign Key to parent simulation run
    RunID           INTEGER NOT NULL,

    -- Domain Integrity: Zero-based queue index
    QueueLevel      INTEGER NOT NULL CHECK(QueueLevel >= 0),

    -- Attribute Domain: Scheduling algorithm assigned to this queue level
    QueueAlgorithm  TEXT NOT NULL,

    -- Domain Integrity: Optional quantum assigned specifically to this queue
    Quantum         INTEGER CHECK(Quantum IS NULL OR Quantum > 0),

    PRIMARY KEY (RunID, QueueLevel),
    FOREIGN KEY (RunID) REFERENCES SimulationRuns(RunID) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table: GanttSlots
-- DBMS Concept: Time-Series / Sliced Interval Representation;
-- Tuple-Level Conditional Integrity Constraints;
-- Composite Primary Key (RunID, Seq)
-- ----------------------------------------------------------------------------
CREATE TABLE GanttSlots (
    -- Parent Simulation Run foreign key
    RunID      INTEGER NOT NULL,

    -- Sequence number ordering execution slices within this simulation run
    Seq        INTEGER NOT NULL CHECK(Seq >= 1),

    -- Domain Integrity: Type of time slice ('RUN' for active execution, 'IDLE', or 'CS')
    SlotType   TEXT NOT NULL CHECK(SlotType IN ('RUN','IDLE','CS')),

    -- Process identifier executed during this slice (NULL for IDLE and CS)
    PID        TEXT,

    -- Temporal Domain: Start timestamp (non-negative)
    StartTime  INTEGER NOT NULL CHECK(StartTime >= 0),

    -- Temporal Domain: End timestamp
    EndTime    INTEGER NOT NULL,

    PRIMARY KEY (RunID, Seq),

    -- Temporal Integrity: Positive interval duration
    CHECK(EndTime > StartTime),

    -- Conditional Tuple Integrity: RUN slots must identify PID; IDLE/CS cannot have PID
    CHECK((SlotType = 'RUN' AND PID IS NOT NULL) OR (SlotType <> 'RUN' AND PID IS NULL)),

    FOREIGN KEY (RunID) REFERENCES SimulationRuns(RunID) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table: RunMetrics
-- DBMS Concept: Deliberate Denormalization / Redundancy for Independent
-- Verification against reconstructed Gantt data; Composite Key (RunID, PID)
-- ----------------------------------------------------------------------------
CREATE TABLE RunMetrics (
    RunID           INTEGER NOT NULL,
    PID             TEXT NOT NULL,

    -- Domain Integrity: Completion timestamp
    CompletionTime  INTEGER NOT NULL,

    -- Domain Integrity: Turnaround time (must be strictly positive for completed process)
    TurnaroundTime  INTEGER NOT NULL CHECK(TurnaroundTime > 0),

    -- Domain Integrity: Waiting time (non-negative)
    WaitingTime     INTEGER NOT NULL CHECK(WaitingTime >= 0),

    -- Domain Integrity: Response time (non-negative)
    ResponseTime    INTEGER NOT NULL CHECK(ResponseTime >= 0),

    PRIMARY KEY (RunID, PID),
    FOREIGN KEY (RunID) REFERENCES SimulationRuns(RunID) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- DBMS Concept: Physical Database Design & Query Access Path Optimization
-- ============================================================================

-- Index 1: Foreign key index for user scenario lookups
-- DBMS Concept: Index on Foreign Key to avoid full table scans on user scenario joins
CREATE INDEX idx_scenarios_owner ON Scenarios(OwnerID);

-- Index 2: Composite index for scenario + algorithm run filtering
-- DBMS Concept: Composite B-Tree index supporting multi-column equality queries
CREATE INDEX idx_runs_scenario_algo ON SimulationRuns(ScenarioID, AlgorithmID);

-- Index 3: Composite covering index for user activity timeline queries
-- DBMS Concept: Composite index accelerating range ordering by CreatedAt per user
CREATE INDEX idx_runs_user_time ON SimulationRuns(RunBy, CreatedAt);

-- Index 4: Composite index on GanttSlots (RunID, StartTime)
-- DBMS Concept: Range scan index accelerating overlap checks and timeline retrieval
CREATE INDEX idx_slots_run_start ON GanttSlots(RunID, StartTime);

-- ============================================================================
-- TRIGGERS
-- DBMS Concept: Active Database Rules, Declarative Business Logic,
-- Cross-Table Integrity Enforcement, Immutability & Audit Logging
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger 1: trg_run_quantum_rule
-- DBMS Concept: Cross-Table Integrity Constraint Enforcement
-- Enforces that Quantum is mandatory for algorithms with UsesQuantum=1,
-- and forbidden (NULL) for algorithms with UsesQuantum=0.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_run_quantum_rule
BEFORE INSERT ON SimulationRuns
FOR EACH ROW
WHEN (
    ((SELECT UsesQuantum FROM Algorithms WHERE AlgorithmID = NEW.AlgorithmID) = 1 AND NEW.Quantum IS NULL)
    OR
    ((SELECT UsesQuantum FROM Algorithms WHERE AlgorithmID = NEW.AlgorithmID) = 0 AND NEW.Quantum IS NOT NULL)
)
BEGIN
    SELECT RAISE(ABORT, 'Quantum constraint violation: Quantum required if and only if algorithm UsesQuantum');
END;

-- ----------------------------------------------------------------------------
-- Trigger 2: trg_slot_no_overlap
-- DBMS Concept: Temporal Mutual Exclusion Constraint (Disjoint Interval Rule)
-- A single-core CPU cannot execute more than one slot simultaneously.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_slot_no_overlap
BEFORE INSERT ON GanttSlots
FOR EACH ROW
WHEN EXISTS (
    SELECT 1 FROM GanttSlots g
    WHERE g.RunID = NEW.RunID
      AND g.StartTime < NEW.EndTime
      AND NEW.StartTime < g.EndTime
)
BEGIN
    SELECT RAISE(ABORT, 'Overlapping Gantt slots: a single CPU cannot run two things at once');
END;

-- ----------------------------------------------------------------------------
-- Trigger 3: trg_lock_processes_insert
-- DBMS Concept: Historical Provenance Protection / Append-Only Guard
-- Rejects adding new processes to a scenario that already has saved simulation runs.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_lock_processes_insert
BEFORE INSERT ON Processes
FOR EACH ROW
WHEN EXISTS (
    SELECT 1 FROM SimulationRuns WHERE ScenarioID = NEW.ScenarioID
)
BEGIN
    SELECT RAISE(ABORT, 'Cannot add processes to a scenario with saved runs. Save as a copy instead.');
END;

-- ----------------------------------------------------------------------------
-- Trigger 4: trg_lock_processes_update
-- DBMS Concept: Historical Provenance Protection / Mutation Guard
-- Rejects updating existing processes of a scenario with saved simulation runs.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_lock_processes_update
BEFORE UPDATE ON Processes
FOR EACH ROW
WHEN EXISTS (
    SELECT 1 FROM SimulationRuns WHERE ScenarioID = OLD.ScenarioID
)
BEGIN
    SELECT RAISE(ABORT, 'Cannot modify processes of a scenario with saved runs. Save as a copy instead.');
END;

-- ----------------------------------------------------------------------------
-- Trigger 5: trg_lock_processes_delete
-- DBMS Concept: Conditional Cascade Guard
-- Rejects individual process deletion if runs exist, while permitting
-- full scenario deletion (where the parent scenario row is deleted first).
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_lock_processes_delete
BEFORE DELETE ON Processes
FOR EACH ROW
WHEN EXISTS (SELECT 1 FROM SimulationRuns WHERE ScenarioID = OLD.ScenarioID)
 AND EXISTS (SELECT 1 FROM Scenarios WHERE ScenarioID = OLD.ScenarioID)
BEGIN
    SELECT RAISE(ABORT, 'Cannot delete processes from a scenario with saved runs. Save as a copy instead.');
END;

-- ----------------------------------------------------------------------------
-- Trigger 6: trg_scenarios_touch
-- DBMS Concept: Automated Audit Timestamp Maintenance
-- Automatically refreshes UpdatedAt timestamp upon scenario mutation.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_scenarios_touch
AFTER UPDATE ON Scenarios
FOR EACH ROW
BEGIN
    UPDATE Scenarios
    SET UpdatedAt = CURRENT_TIMESTAMP
    WHERE ScenarioID = OLD.ScenarioID;
END;

-- ----------------------------------------------------------------------------
-- Trigger 7: trg_slot_pid_valid
-- DBMS Concept: Inter-Table Referential Validity for Weak Entities
-- Asserts that any process executed in a RUN slot actually belongs to the run scenario.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_slot_pid_valid
BEFORE INSERT ON GanttSlots
FOR EACH ROW
WHEN NEW.SlotType = 'RUN' AND NEW.PID IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM SimulationRuns r
    JOIN Processes p ON p.ScenarioID = r.ScenarioID AND p.PID = NEW.PID
    WHERE r.RunID = NEW.RunID
)
BEGIN
    SELECT RAISE(ABORT, 'Gantt slot PID does not exist in run scenario');
END;

-- ----------------------------------------------------------------------------
-- Trigger 8: trg_slot_after_arrival
-- DBMS Concept: Temporal Causality Enforcement
-- A process cannot execute on CPU before its arrival time in the system.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_slot_after_arrival
BEFORE INSERT ON GanttSlots
FOR EACH ROW
WHEN NEW.SlotType = 'RUN' AND NEW.PID IS NOT NULL AND EXISTS (
    SELECT 1 FROM SimulationRuns r
    JOIN Processes p ON p.ScenarioID = r.ScenarioID AND p.PID = NEW.PID
    WHERE r.RunID = NEW.RunID AND NEW.StartTime < p.ArrivalTime
)
BEGIN
    SELECT RAISE(ABORT, 'Gantt slot cannot start before process arrival time');
END;

-- ----------------------------------------------------------------------------
-- Trigger 9: trg_metrics_pid_valid
-- DBMS Concept: Referential Cross-Entity Consistency
-- Enforces that RunMetrics records correspond to valid processes in the run scenario.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_metrics_pid_valid
BEFORE INSERT ON RunMetrics
FOR EACH ROW
WHEN NOT EXISTS (
    SELECT 1 FROM SimulationRuns r
    JOIN Processes p ON p.ScenarioID = r.ScenarioID AND p.PID = NEW.PID
    WHERE r.RunID = NEW.RunID
)
BEGIN
    SELECT RAISE(ABORT, 'RunMetrics PID does not exist in run scenario');
END;

-- ----------------------------------------------------------------------------
-- Trigger 10: trg_immutable_ganttslots
-- DBMS Concept: Write-Once-Read-Many (WORM) / Immutability Trigger
-- Saved simulation slots cannot be tampered with or updated post-insertion.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_immutable_ganttslots
BEFORE UPDATE ON GanttSlots
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'GanttSlots rows are immutable once recorded');
END;

-- ----------------------------------------------------------------------------
-- Trigger 11: trg_immutable_runmetrics
-- DBMS Concept: Write-Once-Read-Many (WORM) / Immutability Trigger
-- Saved process metrics cannot be modified after simulation run persistence.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_immutable_runmetrics
BEFORE UPDATE ON RunMetrics
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'RunMetrics rows are immutable once recorded');
END;

-- ============================================================================
-- VIEWS (Analytics, Reconstruction, and Independent Verification)
-- DBMS Concept: Relational Views (Virtual Tables), Grouping, Aggregation,
-- Window Functions, Set Operations (UNION ALL), Relational Algebra
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View 1: vw_metrics_recomputed
-- DBMS Concept: Declarative Data Reconstruction / Aggregated Derivation
-- Independently calculates CT, TAT, WT, RT from raw Gantt slices using textbook formulas.
-- ----------------------------------------------------------------------------
CREATE VIEW vw_metrics_recomputed AS
SELECT
    r.RunID,
    p.PID,
    MAX(g.EndTime)                                 AS CompletionTime,
    MAX(g.EndTime) - p.ArrivalTime                 AS TurnaroundTime,
    MAX(g.EndTime) - p.ArrivalTime - p.BurstTime   AS WaitingTime,
    MIN(g.StartTime) - p.ArrivalTime               AS ResponseTime,
    SUM(g.EndTime - g.StartTime)                   AS ExecutedTime,
    p.BurstTime
FROM SimulationRuns r
JOIN Processes p  ON p.ScenarioID = r.ScenarioID
JOIN GanttSlots g ON g.RunID = r.RunID AND g.SlotType = 'RUN' AND g.PID = p.PID
GROUP BY r.RunID, p.PID;

-- ----------------------------------------------------------------------------
-- View 2: vw_metrics_mismatch
-- DBMS Concept: Relational Integrity Audit View (Discrepancy Detection)
-- Employs Set Operators (UNION ALL) and Outer Joins to detect four classes of anomaly.
-- Must return 0 rows for valid, authentic runs.
-- ----------------------------------------------------------------------------
CREATE VIEW vw_metrics_mismatch AS
-- 1. METRIC_MISMATCH: Stored metrics contradict recomputed Gantt metrics
SELECT
    m.RunID,
    m.PID,
    'METRIC_MISMATCH' AS ProblemType,
    'Stored metrics differ from recomputed Gantt values (Stored WT=' || m.WaitingTime || ', Recomputed WT=' || c.WaitingTime || ')' AS Details
FROM RunMetrics m
JOIN vw_metrics_recomputed c ON c.RunID = m.RunID AND c.PID = m.PID
WHERE m.CompletionTime <> c.CompletionTime
   OR m.TurnaroundTime <> c.TurnaroundTime
   OR m.WaitingTime    <> c.WaitingTime
   OR m.ResponseTime   <> c.ResponseTime

UNION ALL

-- 2. EXECUTED_NOT_EQUAL_BURST: Total time allocated on CPU differs from required burst
SELECT
    c.RunID,
    c.PID,
    'EXECUTED_NOT_EQUAL_BURST' AS ProblemType,
    'Total CPU execution duration (' || c.ExecutedTime || ') does not equal process burst (' || c.BurstTime || ')' AS Details
FROM vw_metrics_recomputed c
WHERE c.ExecutedTime <> c.BurstTime

UNION ALL

-- 3. PROCESS_NEVER_RAN: Process in scenario was never scheduled a RUN slot
SELECT
    r.RunID,
    p.PID,
    'PROCESS_NEVER_RAN' AS ProblemType,
    'Process defined in scenario was never allocated a RUN slot' AS Details
FROM SimulationRuns r
JOIN Processes p ON p.ScenarioID = r.ScenarioID
LEFT JOIN GanttSlots g ON g.RunID = r.RunID AND g.SlotType = 'RUN' AND g.PID = p.PID
WHERE g.RunID IS NULL

UNION ALL

-- 4. METRICS_MISSING: Process defined in scenario lacks corresponding RunMetrics row
SELECT
    r.RunID,
    p.PID,
    'METRICS_MISSING' AS ProblemType,
    'Process in scenario lacks a record in RunMetrics' AS Details
FROM SimulationRuns r
JOIN Processes p ON p.ScenarioID = r.ScenarioID
LEFT JOIN RunMetrics m ON m.RunID = r.RunID AND m.PID = p.PID
WHERE m.PID IS NULL;

-- ----------------------------------------------------------------------------
-- View 3: vw_run_summary
-- DBMS Concept: Analytical Aggregate View / Common Table Expressions (CTEs)
-- Combines multiple dimensions (Users, Scenarios, Algorithms, Metrics, Slots)
-- into a unified reporting summary without Cartesian product anomalies.
-- ----------------------------------------------------------------------------
CREATE VIEW vw_run_summary AS
WITH RunSlotStats AS (
    SELECT
        RunID,
        COALESCE(MAX(EndTime), 0) AS Makespan,
        COALESCE(SUM(CASE WHEN SlotType = 'RUN' THEN EndTime - StartTime ELSE 0 END), 0) AS BusyTime,
        COUNT(CASE WHEN SlotType = 'CS' THEN 1 END) AS ContextSwitches
    FROM GanttSlots
    GROUP BY RunID
),
RunMetricStats AS (
    SELECT
        RunID,
        COUNT(PID) AS MetricProcessCount,
        ROUND(AVG(WaitingTime), 2) AS AvgWT,
        ROUND(AVG(TurnaroundTime), 2) AS AvgTAT,
        ROUND(AVG(ResponseTime), 2) AS AvgRT
    FROM RunMetrics
    GROUP BY RunID
),
ScenarioProcCount AS (
    SELECT ScenarioID, COUNT(PID) AS ProcessCount
    FROM Processes
    GROUP BY ScenarioID
)
SELECT
    r.RunID,
    r.ScenarioID,
    s.Title AS ScenarioTitle,
    r.AlgorithmID,
    a.Code AS AlgorithmCode,
    a.Name AS AlgorithmName,
    r.RunBy,
    u.Name AS RunByName,
    r.Quantum,
    r.ContextSwitchTime,
    r.AgingInterval,
    r.RaceGroup,
    r.CreatedAt,
    COALESCE(spc.ProcessCount, 0) AS ProcessCount,
    COALESCE(rms.AvgWT, 0.0) AS AvgWT,
    COALESCE(rms.AvgTAT, 0.0) AS AvgTAT,
    COALESCE(rms.AvgRT, 0.0) AS AvgRT,
    COALESCE(rss.Makespan, 0) AS Makespan,
    ROUND(
        CASE
            WHEN COALESCE(rss.Makespan, 0) > 0
            THEN (CAST(rss.BusyTime AS REAL) / rss.Makespan) * 100.0
            ELSE 0.0
        END,
        1
    ) AS CpuUtilization,
    ROUND(
        CASE
            WHEN COALESCE(rss.Makespan, 0) > 0
            THEN CAST(COALESCE(spc.ProcessCount, 0) AS REAL) / rss.Makespan
            ELSE 0.0
        END,
        3
    ) AS Throughput,
    COALESCE(rss.ContextSwitches, 0) AS ContextSwitches
FROM SimulationRuns r
JOIN Scenarios s ON s.ScenarioID = r.ScenarioID
JOIN Algorithms a ON a.AlgorithmID = r.AlgorithmID
JOIN Users u ON u.UserID = r.RunBy
LEFT JOIN ScenarioProcCount spc ON spc.ScenarioID = r.ScenarioID
LEFT JOIN RunMetricStats rms ON rms.RunID = r.RunID
LEFT JOIN RunSlotStats rss ON rss.RunID = r.RunID;

-- ----------------------------------------------------------------------------
-- View 4: vw_algorithm_leaderboard
-- DBMS Concept: Window Functions (RANK() OVER, ROW_NUMBER() OVER with PARTITION BY)
-- Identifies each algorithm's optimal performance per scenario and ranks them.
-- ----------------------------------------------------------------------------
CREATE VIEW vw_algorithm_leaderboard AS
WITH BestRunPerAlgo AS (
    SELECT
        RunID,
        ScenarioID,
        ScenarioTitle,
        AlgorithmID,
        AlgorithmCode,
        AlgorithmName,
        Quantum,
        ContextSwitchTime,
        AgingInterval,
        ProcessCount,
        AvgWT,
        AvgTAT,
        AvgRT,
        CpuUtilization,
        Throughput,
        ContextSwitches,
        CreatedAt,
        ROW_NUMBER() OVER (
            PARTITION BY ScenarioID, AlgorithmID
            ORDER BY AvgWT ASC, AvgTAT ASC, RunID ASC
        ) AS rn
    FROM vw_run_summary
)
SELECT
    ScenarioID,
    ScenarioTitle,
    AlgorithmID,
    AlgorithmCode,
    AlgorithmName,
    RunID,
    Quantum,
    ContextSwitchTime,
    AgingInterval,
    ProcessCount,
    AvgWT,
    AvgTAT,
    AvgRT,
    CpuUtilization,
    Throughput,
    ContextSwitches,
    CreatedAt,
    RANK() OVER (
        PARTITION BY ScenarioID
        ORDER BY AvgWT ASC, AvgTAT ASC
    ) AS AlgorithmRank
FROM BestRunPerAlgo
WHERE rn = 1;

-- ----------------------------------------------------------------------------
-- View 5: vw_user_activity
-- DBMS Concept: Complex Analytical Join (GROUP BY, Subqueries, Multi-table LEFT JOIN)
-- Ensures that users with zero scenarios and zero runs are still represented.
-- ----------------------------------------------------------------------------
CREATE VIEW vw_user_activity AS
WITH UserScenarios AS (
    SELECT OwnerID, COUNT(*) AS ScenarioCount
    FROM Scenarios
    GROUP BY OwnerID
),
UserRuns AS (
    SELECT
        RunBy,
        COUNT(*) AS RunCount,
        MAX(CreatedAt) AS LastRunAt
    FROM SimulationRuns
    GROUP BY RunBy
),
AlgoUsage AS (
    SELECT
        RunBy,
        AlgorithmID,
        COUNT(*) AS UsageCount,
        ROW_NUMBER() OVER (PARTITION BY RunBy ORDER BY COUNT(*) DESC, AlgorithmID ASC) AS rn
    FROM SimulationRuns
    GROUP BY RunBy, AlgorithmID
)
SELECT
    u.UserID,
    u.Name,
    u.Email,
    u.CreatedAt AS UserRegisteredAt,
    COALESCE(us.ScenarioCount, 0) AS ScenarioCount,
    COALESCE(ur.RunCount, 0) AS RunCount,
    COALESCE(a.Code, 'None') AS MostUsedAlgorithm,
    COALESCE(ur.LastRunAt, u.CreatedAt) AS LastActivity
FROM Users u
LEFT JOIN UserScenarios us ON us.OwnerID = u.UserID
LEFT JOIN UserRuns ur ON ur.RunBy = u.UserID
LEFT JOIN AlgoUsage au ON au.RunBy = u.UserID AND au.rn = 1
LEFT JOIN Algorithms a ON a.AlgorithmID = au.AlgorithmID;
