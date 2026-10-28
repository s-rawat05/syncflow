-- ============================================================================
-- SyncFlow Lookup Seed Data (Algorithms)
-- DBMS Concept: Static Domain Lookup / Reference Dimension Seeding
-- ============================================================================

INSERT INTO Algorithms (Code, Name, IsPreemptive, UsesQuantum, UsesPriority, UsesQueues) VALUES
('FCFS',        'First-Come, First-Served',          0, 0, 0, 0),
('SJF',         'Shortest Job First',                0, 0, 0, 0),
('SRTF',        'Shortest Remaining Time First',     1, 0, 0, 0),
('PRIORITY_NP', 'Priority Scheduling (Non-Preemptive)', 0, 0, 1, 0),
('PRIORITY_P',  'Priority Scheduling (Preemptive)',  1, 0, 1, 0),
('RR',          'Round Robin',                       1, 1, 0, 0),
('MLQ',         'Multilevel Queue',                  1, 1, 0, 1),
('MLFQ',        'Multilevel Feedback Queue',         1, 0, 0, 1);
