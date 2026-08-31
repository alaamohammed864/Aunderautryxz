import React, { useState, useMemo } from 'react';
import {
  DigitalTwinProcessState,
  PlcDialect,
  PlcMemoryState,
  SimulationMode,
  SimulationSnapshot,
} from '../../types';
import {
  Camera,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Clock,
  CheckCircle2,
  Layers,
  Zap,
  Sliders,
  Eye,
  X,
  Plus,
  Play,
  Pause,
  Square,
  Sparkles,
  ArrowRight,
  Database,
  Search,
  FileJson,
  Activity,
  History,
  Lock,
  Bookmark,
  AlertCircle,
  Copy,
} from 'lucide-react';

interface SimulationSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SimulationSnapshot[];
  currentMemory: PlcMemoryState;
  currentProcessState: DigitalTwinProcessState;
  simulationMode: SimulationMode;
  dialect: PlcDialect;
  onTakeSnapshot: (name?: string, description?: string) => SimulationSnapshot;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onClearAllSnapshots: () => void;
  onImportSnapshots: (snapshots: SimulationSnapshot[]) => void;
}

export const SimulationSnapshotModal: React.FC<SimulationSnapshotModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  currentMemory,
  currentProcessState,
  simulationMode,
  dialect,
  onTakeSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClearAllSnapshots,
  onImportSnapshots,
}) => {
  const [newSnapshotName, setNewSnapshotName] = useState<string>('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [justRestoredId, setJustRestoredId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'compare'>('list');

  // Stats calculation for current state preview
  const currentStats = useMemo(() => {
    const activeInputs = Object.entries(currentMemory.inputs || {}).filter(([_, v]) => Boolean(v)).map(([k]) => k);
    const activeOutputs = Object.entries(currentMemory.outputs || {}).filter(([_, v]) => Boolean(v)).map(([k]) => k);
    const activeFlags = Object.entries(currentMemory.memory || {}).filter(([_, v]) => Boolean(v)).map(([k]) => k);
    const activeTimers = Object.entries(currentMemory.timers || {}).filter(([_, v]) => {
      const timer = v as { q?: boolean; et?: number };
      return Boolean(timer?.q) || (timer?.et || 0) > 0;
    }).map(([k]) => k);
    const forcedBits = Object.keys(currentMemory.forcedBits || {});

    return {
      activeInputs,
      activeOutputs,
      activeFlags,
      activeTimers,
      forcedBits,
    };
  }, [currentMemory]);

  const selectedSnapshot = useMemo(() => {
    return snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0] || null;
  }, [snapshots, selectedSnapshotId]);

  // Filtered snapshots
  const filteredSnapshots = useMemo(() => {
    if (!searchQuery.trim()) return snapshots;
    const q = searchQuery.toLowerCase().trim();
    return snapshots.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        s.timeFormatted.toLowerCase().includes(q)
    );
  }, [snapshots, searchQuery]);

  const handleCreateSnapshot = () => {
    const defaultName = `Snapshot #${snapshots.length + 1} (${currentStats.activeOutputs.length} Out, ${currentStats.activeInputs.length} In)`;
    const name = newSnapshotName.trim() || defaultName;
    const desc = newSnapshotDesc.trim() || undefined;

    const created = onTakeSnapshot(name, desc);
    setNewSnapshotName('');
    setNewSnapshotDesc('');
    setJustSavedId(created.id);
    setSelectedSnapshotId(created.id);
    setActiveTab('list');

    setTimeout(() => {
      setJustSavedId(null);
    }, 2500);
  };

  const handleRestore = (id: string) => {
    onRestoreSnapshot(id);
    setJustRestoredId(id);
    setTimeout(() => {
      setJustRestoredId(null);
    }, 2000);
  };

  const handleExportAll = () => {
    const dataStr = JSON.stringify(snapshots, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twinlab_plc_snapshots_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSingle = (snapshot: SimulationSnapshot) => {
    const dataStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot_${snapshot.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${snapshot.timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          onImportSnapshots(parsed);
        } else if (parsed && parsed.memory && parsed.id) {
          onImportSnapshots([parsed]);
        }
      } catch (err) {
        console.error('Failed to import snapshots:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Memory Diff Computation (Current vs Selected Snapshot)
  const memoryDiff = useMemo(() => {
    if (!selectedSnapshot) return null;

    const snapMem = selectedSnapshot.memory;
    const diffs: {
      address: string;
      category: 'INPUT' | 'OUTPUT' | 'FLAG' | 'TIMER' | 'REGISTER' | 'FORCED';
      currentVal: any;
      snapVal: any;
      changed: boolean;
    }[] = [];

    // Check Inputs
    const allInputKeys = Array.from(new Set([...Object.keys(currentMemory.inputs || {}), ...Object.keys(snapMem.inputs || {})]));
    allInputKeys.forEach((key) => {
      const cur = Boolean(currentMemory.inputs?.[key]);
      const snap = Boolean(snapMem.inputs?.[key]);
      if (cur !== snap) {
        diffs.push({ address: key, category: 'INPUT', currentVal: cur ? '1' : '0', snapVal: snap ? '1' : '0', changed: true });
      }
    });

    // Check Outputs
    const allOutputKeys = Array.from(new Set([...Object.keys(currentMemory.outputs || {}), ...Object.keys(snapMem.outputs || {})]));
    allOutputKeys.forEach((key) => {
      const cur = Boolean(currentMemory.outputs?.[key]);
      const snap = Boolean(snapMem.outputs?.[key]);
      if (cur !== snap) {
        diffs.push({ address: key, category: 'OUTPUT', currentVal: cur ? '1' : '0', snapVal: snap ? '1' : '0', changed: true });
      }
    });

    // Check Memory Flags
    const allMemKeys = Array.from(new Set([...Object.keys(currentMemory.memory || {}), ...Object.keys(snapMem.memory || {})]));
    allMemKeys.forEach((key) => {
      const cur = Boolean(currentMemory.memory?.[key]);
      const snap = Boolean(snapMem.memory?.[key]);
      if (cur !== snap) {
        diffs.push({ address: key, category: 'FLAG', currentVal: cur ? '1' : '0', snapVal: snap ? '1' : '0', changed: true });
      }
    });

    // Check Timers
    const allTimerKeys = Array.from(new Set([...Object.keys(currentMemory.timers || {}), ...Object.keys(snapMem.timers || {})]));
    allTimerKeys.forEach((key) => {
      const cur = currentMemory.timers?.[key]?.q;
      const snap = snapMem.timers?.[key]?.q;
      if (cur !== snap) {
        diffs.push({ address: key, category: 'TIMER', currentVal: cur ? 'ON' : 'OFF', snapVal: snap ? 'ON' : 'OFF', changed: true });
      }
    });

    return diffs;
  }, [selectedSnapshot, currentMemory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] max-h-[780px] flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  SIMULATION SNAPSHOTS & STATE RESTORE
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-xs font-bold">
                  {snapshots.length} SAVED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Capture instant PLC memory states ($I, Q, M, T, C, D$) and restore anytime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Take Snapshot Button */}
            <button
              onClick={() => setActiveTab('create')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>SAVE SNAPSHOT</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action / Navigation Tab Bar */}
        <div className="px-5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Snapshot Library ({snapshots.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture New State</span>
            </button>

            {selectedSnapshot && (
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'compare'
                    ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Memory Diff Inspector</span>
                {memoryDiff && memoryDiff.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {memoryDiff.length} Δ
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Import / Export / Clear Bar */}
          <div className="flex items-center gap-2">
            <label
              title="Import snapshots from JSON file"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs cursor-pointer transition-colors"
            >
              <Upload className="w-3 h-3 text-cyan-400" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleFileInput} className="hidden" />
            </label>

            {snapshots.length > 0 && (
              <>
                <button
                  onClick={handleExportAll}
                  title="Export all snapshots to JSON file"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs cursor-pointer transition-colors"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export All</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all saved snapshots?')) {
                      onClearAllSnapshots();
                    }
                  }}
                  title="Clear all saved snapshots"
                  className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* TAB 1: CREATE SNAPSHOT PANEL */}
          {activeTab === 'create' && (
            <div className="p-6 overflow-y-auto flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 w-full shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">
                      Capture Real-Time PLC Memory Snapshot
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Freeze exact digital I/O states, analog registers, active timers, and accumulators
                    </p>
                  </div>
                </div>

                {/* Current State Summary Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 mb-5 font-mono text-xs">
                  <div className="text-slate-400 text-[11px] mb-2 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>LIVE MEMORY STATE TO BE CAPTURED</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      {simulationMode} MODE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">ACTIVE INPUTS</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {currentStats.activeInputs.length} / {Object.keys(currentMemory.inputs || {}).length}
                      </span>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentStats.activeInputs.slice(0, 3).join(', ') || 'None'}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">ACTIVE OUTPUTS</span>
                      <span className="font-bold text-blue-400 text-sm">
                        {currentStats.activeOutputs.length} / {Object.keys(currentMemory.outputs || {}).length}
                      </span>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentStats.activeOutputs.slice(0, 3).join(', ') || 'None'}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">MEMORY FLAGS</span>
                      <span className="font-bold text-purple-400 text-sm">
                        {currentStats.activeFlags.length} / {Object.keys(currentMemory.memory || {}).length}
                      </span>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentStats.activeFlags.slice(0, 3).join(', ') || 'None'}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">TIMERS / FORCES</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {currentStats.activeTimers.length}T / {currentStats.forcedBits.length}F
                      </span>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        Scan #{currentMemory.scanCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                      SNAPSHOT NAME
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. Conveyor Step 2 - Bottle Clamped (${new Date().toLocaleTimeString()})`}
                      value={newSnapshotName}
                      onChange={(e) => setNewSnapshotName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                      NOTES / DESCRIPTION (OPTIONAL)
                    </label>
                    <textarea
                      placeholder="Add comments on why this state was saved (e.g. testing fault recovery after E-Stop release)..."
                      rows={2}
                      value={newSnapshotDesc}
                      onChange={(e) => setNewSnapshotDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('list')}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSnapshot}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-cyan-950 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Save Snapshot Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SNAPSHOT LIBRARY & RESTORE */}
          {activeTab === 'list' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Snapshot Cards List */}
              <div className="w-full md:w-1/2 border-r border-slate-800 flex flex-col bg-slate-950/60">
                {/* Search & Filter Header */}
                <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search snapshots by name or timestamp..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-6 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Snapshots Scrollable List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                  {snapshots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-slate-500 font-mono text-xs">
                      <Camera className="w-10 h-10 mb-3 opacity-30 text-cyan-400" />
                      <span className="text-slate-400 font-bold mb-1">No Simulation Snapshots Saved</span>
                      <span className="text-slate-500 max-w-xs mb-4">
                        Save the current PLC memory state during simulation to rewind and replay test scenarios.
                      </span>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Take First Snapshot</span>
                      </button>
                    </div>
                  ) : filteredSnapshots.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 font-mono text-xs">
                      No snapshots match "{searchQuery}"
                    </div>
                  ) : (
                    filteredSnapshots.map((snap) => {
                      const isSelected = selectedSnapshot?.id === snap.id;
                      const isJustRestored = justRestoredId === snap.id;
                      const isJustSaved = justSavedId === snap.id;

                      return (
                        <div
                          key={snap.id}
                          onClick={() => setSelectedSnapshotId(snap.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500 shadow-md shadow-cyan-950'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          {/* Saved / Restored Flash Notification */}
                          {isJustRestored && (
                            <div className="absolute inset-0 bg-emerald-950/90 border border-emerald-500 flex items-center justify-center gap-2 text-emerald-300 font-mono font-bold text-xs z-10 animate-in fade-in">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>PLC MEMORY STATE RESTORED!</span>
                            </div>
                          )}

                          {isJustSaved && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] animate-pulse">
                              NEW
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-700'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-mono font-bold text-xs text-white truncate">
                                {snap.name}
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-slate-500 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {snap.timeFormatted}
                            </span>
                          </div>

                          {snap.description && (
                            <p className="text-[11px] text-slate-400 mb-2 line-clamp-1">
                              {snap.description}
                            </p>
                          )}

                          {/* Quick Metrics Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono mb-2.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                              {snap.metadata?.activeInputsCount || 0} In
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-blue-400">
                              {snap.metadata?.activeOutputsCount || 0} Out
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-purple-400">
                              {snap.metadata?.activeFlagsCount || 0} Flag
                            </span>
                            {(snap.metadata?.activeTimersCount || 0) > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800 text-amber-300">
                                {snap.metadata.activeTimersCount} Timers
                              </span>
                            )}
                            {(snap.metadata?.forcedBitsCount || 0) > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-600 text-amber-300">
                                {snap.metadata.forcedBitsCount} Forced
                              </span>
                            )}
                            <span className="text-slate-500 text-[9px] ml-auto">
                              Scan #{snap.metadata?.scanCount || 0}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(snap.id);
                              }}
                              title="Restore PLC memory to this exact state"
                              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs shadow transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>RESTORE STATE</span>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSnapshotId(snap.id);
                                  setActiveTab('compare');
                                }}
                                title="Compare with current live state"
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                              >
                                <Sliders className="w-3 h-3" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportSingle(snap);
                                }}
                                title="Download single snapshot JSON"
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSnapshot(snap.id);
                                }}
                                title="Delete snapshot"
                                className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Selected Snapshot Inspector */}
              <div className="hidden md:flex flex-1 flex-col bg-slate-950">
                {selectedSnapshot ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Selected Header */}
                    <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-mono font-bold text-sm text-white">
                            {selectedSnapshot.name}
                          </h3>
                          <span className="px-2 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {selectedSnapshot.simulationMode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Captured at {selectedSnapshot.timeFormatted} (Scan #{selectedSnapshot.metadata?.scanCount || 0})
                        </p>
                      </div>

                      <button
                        onClick={() => handleRestore(selectedSnapshot.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RESTORE THIS SNAPSHOT</span>
                      </button>
                    </div>

                    {/* Snapshot Detailed State Inspector */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {/* Inputs Matrix */}
                      <div>
                        <div className="text-[11px] font-mono font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span>PROCESS INPUTS ($I / X$)</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {Object.entries(selectedSnapshot.memory.inputs || {}).map(([k, v]) => (
                            <div
                              key={k}
                              className={`p-1.5 rounded border text-[10px] font-mono flex items-center justify-between ${
                                Boolean(v)
                                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}
                            >
                              <span>{k}</span>
                              <span>{Boolean(v) ? '1' : '0'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Outputs Matrix */}
                      <div>
                        <div className="text-[11px] font-mono font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span>PROCESS OUTPUTS ($Q / Y$)</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {Object.entries(selectedSnapshot.memory.outputs || {}).map(([k, v]) => (
                            <div
                              key={k}
                              className={`p-1.5 rounded border text-[10px] font-mono flex items-center justify-between ${
                                Boolean(v)
                                  ? 'bg-blue-950 border-blue-500 text-blue-300 font-bold shadow-[0_0_4px_rgba(59,130,246,0.4)]'
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}
                            >
                              <span>{k}</span>
                              <span>{Boolean(v) ? '1' : '0'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Memory Flags */}
                      <div>
                        <div className="text-[11px] font-mono font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-purple-400" />
                          <span>INTERNAL MEMORY FLAGS ($M / B$)</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {Object.entries(selectedSnapshot.memory.memory || {}).map(([k, v]) => (
                            <div
                              key={k}
                              className={`p-1.5 rounded border text-[10px] font-mono flex items-center justify-between ${
                                Boolean(v)
                                  ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}
                            >
                              <span>{k}</span>
                              <span>{Boolean(v) ? '1' : '0'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timers & Counters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-mono font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>TIMERS ($T$)</span>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(selectedSnapshot.memory.timers || {}).length === 0 ? (
                              <div className="text-[10px] font-mono text-slate-600 italic">No active timers</div>
                            ) : (
                              Object.entries(selectedSnapshot.memory.timers || {}).map(([k, v]) => {
                                const timer = v as { pt: number; et: number; q: boolean };
                                return (
                                  <div
                                    key={k}
                                    className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[10px] font-mono"
                                  >
                                    <span className="text-amber-400 font-bold">{k}</span>
                                    <span className="text-slate-400">
                                      ET: {timer.et}ms / PT: {timer.pt}ms
                                    </span>
                                    <span className={timer.q ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                                      Q:{timer.q ? '1' : '0'}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-mono font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-cyan-400" />
                            <span>DATA REGISTERS ($D / DB$)</span>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(selectedSnapshot.memory.dataRegisters || {}).length === 0 ? (
                              <div className="text-[10px] font-mono text-slate-600 italic">No custom registers</div>
                            ) : (
                              Object.entries(selectedSnapshot.memory.dataRegisters || {}).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[10px] font-mono"
                                >
                                  <span className="text-cyan-400 font-bold">{k}</span>
                                  <span className="text-white font-bold">{v}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
                    Select a snapshot on the left to inspect its memory state
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMPARE / DIFF INSPECTOR */}
          {activeTab === 'compare' && (
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-mono font-bold text-sm text-white flex items-center gap-2">
                      <span>MEMORY DELTA COMPARISON</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                        Current Live vs {selectedSnapshot?.name}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Visualizing bits and registers that will change when restoring this snapshot
                    </p>
                  </div>

                  {selectedSnapshot && (
                    <button
                      onClick={() => handleRestore(selectedSnapshot.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs shadow transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>APPLY RESTORE</span>
                    </button>
                  )}
                </div>

                {memoryDiff && memoryDiff.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center text-slate-400 font-mono text-xs">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <span className="font-bold text-white block mb-1">State is Identical</span>
                    <span>The current simulation memory exactly matches this snapshot.</span>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                          <th className="p-3">ADDRESS</th>
                          <th className="p-3">CATEGORY</th>
                          <th className="p-3">CURRENT LIVE STATE</th>
                          <th className="p-3">SNAPSHOT STATE (TARGET)</th>
                          <th className="p-3">ACTION ON RESTORE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {memoryDiff?.map((d) => (
                          <tr key={d.address} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-bold text-cyan-400">{d.address}</td>
                            <td className="p-3">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">
                                {d.category}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                d.currentVal === '1' || d.currentVal === 'ON'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}>
                                {d.currentVal}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                d.snapVal === '1' || d.snapVal === 'ON'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800 shadow-[0_0_4px_rgba(59,130,246,0.4)]'
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}>
                                {d.snapVal}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-amber-300 flex items-center gap-1">
                              <span>Transitions to {d.snapVal}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>Active Project: S7-1200 / Studio 5000</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">Safe Rollback Engine Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
