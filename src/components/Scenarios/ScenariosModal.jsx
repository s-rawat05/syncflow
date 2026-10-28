import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Copy, Trash2, Globe, Lock, Download, Upload, Check, AlertCircle, FileCode, Play, Sparkles } from 'lucide-react';
import { api } from '../../services/apiClient';

export default function ScenariosModal({
  isOpen,
  onClose,
  currentProcesses,
  onLoadScenario,
  activeScenarioId,
  activeScenarioTitle,
  onScenarioSaved
}) {
  const [tab, setTab] = useState('my'); // 'my' | 'public' | 'save' | 'import'
  const [myScenarios, setMyScenarios] = useState([]);
  const [publicScenarios, setPublicScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Save Form State
  const [saveTitle, setSaveTitle] = useState(activeScenarioTitle || '');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveIsPublic, setSaveIsPublic] = useState(false);
  const [saveAsCopyMode, setSaveAsCopyMode] = useState(false);

  // Import State
  const [importJsonText, setImportJsonText] = useState('');

  const fetchScenarios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (tab === 'my') {
        const list = await api.getMyScenarios();
        setMyScenarios(list);
      } else if (tab === 'public') {
        const list = await api.getPublicScenarios();
        setPublicScenarios(list);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to load scenarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScenarios();
      if (activeScenarioTitle) {
        setSaveTitle(activeScenarioTitle);
      }
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const handleSaveScenario = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (activeScenarioId && !saveAsCopyMode) {
        // Attempt update
        try {
          const updated = await api.updateScenario(activeScenarioId, {
            title: saveTitle,
            description: saveDesc,
            isPublic: saveIsPublic,
            processes: currentProcesses
          });
          setSuccessMsg('Scenario successfully updated!');
          onScenarioSaved?.(updated.ScenarioID, updated.Title);
          fetchScenarios();
        } catch (updateErr) {
          if (updateErr.status === 409 && updateErr.data?.canSaveAsCopy) {
            setSaveAsCopyMode(true);
            setError(updateErr.data.error);
          } else {
            throw updateErr;
          }
        }
      } else {
        // Create new scenario or save as copy
        const titleToUse = saveAsCopyMode && saveTitle === activeScenarioTitle
          ? `${saveTitle} (Copy)`
          : saveTitle;

        const created = await api.createScenario({
          title: titleToUse,
          description: saveDesc,
          isPublic: saveIsPublic ? 1 : 0,
          processes: currentProcesses
        });
        setSuccessMsg('New scenario successfully saved to your account!');
        onScenarioSaved?.(created.ScenarioID, created.Title);
        setSaveAsCopyMode(false);
        fetchScenarios();
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to save scenario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (scenarioId) => {
    try {
      const scenario = await api.getScenario(scenarioId);
      onLoadScenario(scenario.processes, scenario.ScenarioID, scenario.Title);
      onClose();
    } catch (err) {
      setError('Failed to load scenario processes');
    }
  };

  const handleDuplicate = async (scenarioId) => {
    try {
      await api.duplicateScenario(scenarioId);
      fetchScenarios();
    } catch (err) {
      setError('Failed to duplicate scenario');
    }
  };

  const handleDelete = async (scenarioId) => {
    if (!window.confirm('Delete this scenario and all its saved simulation runs? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteScenario(scenarioId);
      fetchScenarios();
    } catch (err) {
      setError('Failed to delete scenario');
    }
  };

  const handleTogglePublic = async (sc) => {
    try {
      await api.updateScenario(sc.ScenarioID, { isPublic: sc.IsPublic ? 0 : 1 });
      fetchScenarios();
    } catch (err) {
      setError('Failed to update scenario privacy');
    }
  };

  const handleImportJson = async () => {
    setError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      const imported = await api.importScenario(parsed);
      setSuccessMsg(`Successfully imported "${imported.Title}" with ${imported.processes.length} processes!`);
      onLoadScenario(imported.processes, imported.ScenarioID, imported.Title);
      setImportJsonText('');
      setTab('my');
    } catch (err) {
      setError(err.data?.error || err.message || 'Invalid JSON format.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setImportJsonText(evt.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-2xl p-6 border border-white/10 shadow-2xl relative flex flex-col text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sora font-bold text-lg text-white">Workload Scenarios Manager</h3>
            <p className="text-xs text-slate-400">Save process sets to the database, duplicate, or load community workloads</p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex bg-[#13131F] p-1 rounded-xl mb-4 border border-white/5 gap-1 shrink-0">
          <button
            onClick={() => { setTab('my'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'my'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Scenarios
          </button>
          <button
            onClick={() => { setTab('public'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'public'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Public Workloads
          </button>
          <button
            onClick={() => { setTab('save'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'save'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Save Current Workload
          </button>
          <button
            onClick={() => { setTab('import'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'import'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Import JSON
          </button>
        </div>

        {/* Notification alerts */}
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: My Scenarios */}
        {tab === 'my' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading scenarios...</div>
            ) : myScenarios.length === 0 ? (
              <div className="py-12 text-center">
                <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No saved scenarios found.</p>
                <p className="text-[11px] text-slate-500 mt-1">Switch to "Save Current Workload" to persist your processes.</p>
              </div>
            ) : (
              myScenarios.map((sc) => (
                <div
                  key={sc.ScenarioID}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.07] border border-white/10 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-sora font-semibold text-sm text-white truncate">{sc.Title}</h4>
                      {sc.IsPublic ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          <Lock className="w-2.5 h-2.5" /> Private
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{sc.ProcessCount} processes</span>
                      <span>•</span>
                      <span>{sc.RunCount} runs</span>
                      <span>•</span>
                      <span className="text-[10px] font-mono">{new Date(sc.UpdatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleLoad(sc.ScenarioID)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1"
                      title="Load processes into simulator"
                    >
                      <Play className="w-3 h-3 fill-purple-300" />
                      <span>Load</span>
                    </button>
                    <button
                      onClick={() => handleDuplicate(sc.ScenarioID)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                      title="Duplicate scenario"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTogglePublic(sc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                      title={sc.IsPublic ? 'Make Private' : 'Make Public'}
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sc.ScenarioID)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete scenario and all associated runs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Public Workloads */}
        {tab === 'public' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading public workloads...</div>
            ) : publicScenarios.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No public scenarios shared yet.</div>
            ) : (
              publicScenarios.map((sc) => (
                <div
                  key={sc.ScenarioID}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.07] border border-white/10 transition-all flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-sora font-semibold text-sm text-white truncate">{sc.Title}</h4>
                      <span className="text-[10px] font-mono text-purple-300">by {sc.OwnerName}</span>
                    </div>
                    {sc.Description && <p className="text-xs text-slate-400 truncate mb-1">{sc.Description}</p>}
                    <span className="text-xs text-slate-400">{sc.ProcessCount} processes</span>
                  </div>

                  <button
                    onClick={() => handleLoad(sc.ScenarioID)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-purple-300" />
                    <span>Load</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Save Current Workload */}
        {tab === 'save' && (
          <form onSubmit={handleSaveScenario} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
              Saving <strong className="text-white">{currentProcesses.length} processes</strong> currently defined in the Process Table.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Scenario Title</label>
              <input
                type="text"
                required
                maxLength={80}
                placeholder="e.g. Memory Thrashing Workload"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                className="w-full glass-input text-xs px-3 py-2 rounded-xl text-slate-100 placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Brief summary of what this scheduling scenario tests..."
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                className="w-full glass-input text-xs px-3 py-2 rounded-xl text-slate-100 placeholder-slate-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublicCheck"
                checked={saveIsPublic}
                onChange={(e) => setSaveIsPublic(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
              />
              <label htmlFor="isPublicCheck" className="text-xs text-slate-300 cursor-pointer flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>Make Public (available to all users in Public Scenarios)</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Saving...' : saveAsCopyMode ? 'Save as Copy' : activeScenarioId ? 'Update Scenario' : 'Save Scenario'}
              </button>

              {activeScenarioId && !saveAsCopyMode && (
                <button
                  type="button"
                  onClick={() => setSaveAsCopyMode(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                >
                  Save as Copy
                </button>
              )}
            </div>
          </form>
        )}

        {/* Tab 4: Import JSON */}
        {tab === 'import' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
              Upload a <code className="text-emerald-400 font-mono">.json</code> file or paste a JSON array of processes to import directly into your account database.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Upload JSON File</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600/30 file:text-purple-200 hover:file:bg-purple-600/40 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Or Paste JSON Process Array</label>
              <textarea
                rows={6}
                placeholder='[{"pid": "P1", "arrivalTime": 0, "burstTime": 5, "priority": 1}]'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full glass-input text-xs font-mono p-3 rounded-xl text-slate-200 placeholder-slate-600 resize-none"
              />
            </div>

            <button
              onClick={handleImportJson}
              disabled={!importJsonText.trim()}
              className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Import Scenario to Account</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
