import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PlcDialect,
  PlcExecutionLog,
  PlcMemoryAreaStats,
  PlcMemoryState,
  PlcProgram,
  PlcTaskMetric,
  SimulationMode,
} from '../../types';
import { PlcSimulationEngine } from '../../engine/plc/plcEngine';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownCircle,
  Binary,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Download,
  Filter,
  Flame,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sliders,
  Terminal,
  Trash2,
  Unlock,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface PlcDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: PlcMemoryState;
  program: PlcProgram;
  dialect: PlcDialect;
  simulationMode: SimulationMode;
  onSetBit: (address: string, val: boolean) => void;
  onSetNumeric: (address: string, val: number) => void;
  onForceBit?: (address: string, val: boolean | number) => void;
  onUnforceBit?: (address: string) => void;
  onUnforceAll?: () => void;
  onStepSimulation?: () => void;
  recentLogs?: PlcExecutionLog[];
}

type DiagTab = 'memory' | 'tasks' | 'logs' | 'watch' | 'faults';

export const PlcDiagnosticsModal: React.FC<PlcDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  memory,
  program,
  dialect,
  simulationMode,
  onSetBit,
  onSetNumeric,
  onForceBit,
  onUnforceBit,
  onUnforceAll,
  onStepSimulation,
  recentLogs = [],
}) => {
  const [activeTab, setActiveTab] = useState<DiagTab>('memory');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLogPaused, setIsLogPaused] = useState<boolean>(false);
  const [logFilterCategory, setLogFilterCategory] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Local log accumulator for live streaming
  const [accumulatedLogs, setAccumulatedLogs] = useState<PlcExecutionLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Watch Table custom list
  const [watchAddresses, setWatchAddresses] = useState<string[]>([
    'I0.0',
    'I0.1',
    'Q0.0',
    'Q0.1',
    'M0.0',
    'T1',
    'C1',
    'IW64',
    'QW64',
  ]);
  const [newWatchInput, setNewWatchInput] = useState<string>('');

  // Performance calculation moving stats
  const [scanHistory, setScanHistory] = useState<number[]>([]);
  useEffect(() => {
    if (memory.scanCycleTime !== undefined) {
      setScanHistory((prev) => {
        const next = [...prev, memory.scanCycleTime];
        if (next.length > 50) next.shift();
        return next;
      });
    }
  }, [memory.scanCount, memory.scanCycleTime]);

  // Sync recent logs into accumulated list
  useEffect(() => {
    if (recentLogs && recentLogs.length > 0 && !isLogPaused) {
      setAccumulatedLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const newOnes = recentLogs.filter((l) => !existingIds.has(l.id));
        if (newOnes.length === 0) return prev;
        const combined = [...prev, ...newOnes];
        return combined.slice(-300); // keep last 300 logs
      });
    }
  }, [recentLogs, isLogPaused]);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [accumulatedLogs, autoScroll, activeTab]);

  // Calculate memory stats breakdown
  const memoryStats = useMemo<PlcMemoryAreaStats[]>(() => {
    return PlcSimulationEngine.calculateMemoryStats(memory, program);
  }, [memory, program]);

  // Scan statistics computations
  const avgScanTime = useMemo(() => {
    if (scanHistory.length === 0) return memory.scanCycleTime || 20;
    const sum = scanHistory.reduce((a, b) => a + b, 0);
    return Number((sum / scanHistory.length).toFixed(2));
  }, [scanHistory, memory.scanCycleTime]);

  const minScanTime = useMemo(() => {
    if (scanHistory.length === 0) return memory.scanCycleTime || 20;
    return Math.min(...scanHistory);
  }, [scanHistory, memory.scanCycleTime]);

  const maxScanTime = useMemo(() => {
    if (scanHistory.length === 0) return memory.scanCycleTime || 20;
    return Math.max(...scanHistory);
  }, [scanHistory, memory.scanCycleTime]);

  // Total instruction count estimation
  const totalInstructions = useMemo(() => {
    let count = 0;
    program.rungs.forEach((r) => {
      count += r.mainBranch.length;
      if (r.subBranches) {
        r.subBranches.forEach((b) => (count += b.elements.length));
      }
    });
    return count;
  }, [program]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return accumulatedLogs.filter((log) => {
      if (logFilterCategory !== 'ALL' && log.category !== logFilterCategory) {
        return false;
      }
      if (logSearchQuery.trim() !== '') {
        const query = logSearchQuery.toLowerCase();
        const msgMatch = log.message.toLowerCase().includes(query);
        const taskMatch = log.task.toLowerCase().includes(query);
        const addrMatch = log.address?.toLowerCase().includes(query);
        const detailMatch = log.details?.toLowerCase().includes(query);
        return msgMatch || taskMatch || addrMatch || detailMatch;
      }
      return true;
    });
  }, [accumulatedLogs, logFilterCategory, logSearchQuery]);

  // Forced bits map
  const forcedMap = memory.forcedBits || {};
  const forcedCount = Object.keys(forcedMap).length;

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newWatchInput.trim().toUpperCase();
    if (clean && !watchAddresses.includes(clean)) {
      setWatchAddresses([...watchAddresses, clean]);
      setNewWatchInput('');
    }
  };

  const handleRemoveWatch = (addr: string) => {
    setWatchAddresses(watchAddresses.filter((a) => a !== addr));
  };

  const handleToggleForce = (addr: string) => {
    const isForced = forcedMap[addr] !== undefined;
    if (isForced) {
      if (onUnforceBit) onUnforceBit(addr);
    } else {
      // Toggle or default to true
      const current = resolveBit(addr);
      if (onForceBit) onForceBit(addr, !current);
    }
  };

  const resolveBit = (addr: string): boolean => {
    const clean = addr.trim().toUpperCase();
    if (forcedMap[clean] !== undefined) return Boolean(forcedMap[clean]);
    if (clean.startsWith('I') || clean.startsWith('X')) return Boolean(memory.inputs[clean]);
    if (clean.startsWith('Q') || clean.startsWith('Y')) return Boolean(memory.outputs[clean]);
    if (clean.startsWith('M')) return Boolean(memory.memory[clean]);
    if (clean.startsWith('T')) return Boolean(memory.timers[clean]?.q);
    if (clean.startsWith('C')) return Boolean(memory.counters[clean]?.q);
    return Boolean(memory.memory[clean]);
  };

  const resolveNumeric = (addr: string): number => {
    const clean = addr.trim().toUpperCase();
    if (forcedMap[clean] !== undefined && typeof forcedMap[clean] === 'number') {
      return Number(forcedMap[clean]);
    }
    if (!isNaN(Number(clean))) return Number(clean);
    if (clean.startsWith('T')) return memory.timers[clean]?.et || 0;
    if (clean.startsWith('C')) return memory.counters[clean]?.cv || 0;
    return memory.dataRegisters[clean] || 0;
  };

  const exportLogsAsJson = () => {
    const blob = new Blob([JSON.stringify(accumulatedLogs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plc_diagnostics_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLogsAsCsv = () => {
    const headers = ['Timestamp', 'Time', 'Category', 'Severity', 'Task', 'Rung', 'Address', 'Message', 'Details'];
    const rows = accumulatedLogs.map((l) => [
      l.timestamp,
      `"${l.timeStr}"`,
      l.category,
      l.severity,
      l.task,
      l.rungNumber || '',
      l.address || '',
      `"${l.message.replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plc_diagnostics_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  // Task list definitions with live simulated runtime telemetry
  const plcTasks: PlcTaskMetric[] = [
    {
      id: 'OB1',
      name: 'Main Program Cycle [OB1]',
      type: 'CYCLIC',
      priority: 1,
      cycleMs: 20,
      lastDurationUs: Math.round((memory.scanCycleTime || 0.45) * 1000),
      avgDurationUs: Math.round(avgScanTime * 1000),
      maxDurationUs: Math.round(maxScanTime * 1000),
      executions: memory.scanCount,
      status: simulationMode === 'RUN' ? 'RUNNING' : 'IDLE',
      overrunCount: 0,
    },
    {
      id: 'OB35',
      name: 'Cyclic Interrupt PID [OB35]',
      type: 'INTERRUPT',
      priority: 12,
      cycleMs: 100,
      lastDurationUs: 140,
      avgDurationUs: 135,
      maxDurationUs: 210,
      executions: Math.floor(memory.scanCount / 5),
      status: simulationMode === 'RUN' ? 'ACTIVE' : 'IDLE',
      overrunCount: 0,
    },
    {
      id: 'OB40',
      name: 'Process Hardware Alarm [OB40]',
      type: 'EVENT',
      priority: 16,
      cycleMs: 0,
      lastDurationUs: 45,
      avgDurationUs: 42,
      maxDurationUs: 88,
      executions: 12,
      status: 'IDLE',
      overrunCount: 0,
    },
    {
      id: 'OB82',
      name: 'Diagnostic Error Handler [OB82]',
      type: 'FAULT',
      priority: 26,
      cycleMs: 0,
      lastDurationUs: 80,
      avgDurationUs: 75,
      maxDurationUs: 150,
      executions: accumulatedLogs.filter((l) => l.category === 'FAULT').length,
      status: 'IDLE',
      overrunCount: 0,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden text-slate-100 ${
          isExpanded ? 'w-full h-full max-w-none' : 'w-full max-w-6xl h-[88vh] max-h-[850px]'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white tracking-tight font-mono flex items-center gap-2">
                  PLC ENGINE DIAGNOSTICS & TELEMETRY
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800">
                  {dialect === 'siemens' ? 'Siemens S7-1200' : 'Delta DVP-SS2'}
                </span>
                {forcedCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>{forcedCount} FORCED</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Real-time memory allocation map, deterministic task cycle execution logs, and variable force table
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            {/* Live Scan Pill */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">SCAN:</span>
                <span className="font-bold text-emerald-400">{memory.scanCycleTime || 0} ms</span>
              </div>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">CYCLES:</span>
                <span className="font-bold text-slate-200">{memory.scanCount.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    simulationMode === 'RUN' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[10px] uppercase font-bold text-slate-300">{simulationMode}</span>
              </div>
            </div>

            {/* Single Step button */}
            {onStepSimulation && (
              <button
                onClick={onStepSimulation}
                title="Single Scan Step"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>STEP</span>
              </button>
            )}

            {/* Maximize / Restore */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Restore window size' : 'Expand full screen'}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="Close Diagnostics"
              className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagnostic Tabs Navigation */}
        <div className="bg-slate-950/60 px-5 py-2 border-b border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('memory')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                activeTab === 'memory'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Memory Allocation Map</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Task Engine & Scan Cycles</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Execution Logs Stream</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 border border-slate-800 text-emerald-400">
                {accumulatedLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('watch')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                activeTab === 'watch'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Variable Watch & Force Table</span>
              {forcedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-900 text-amber-200">
                  {forcedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('faults')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                activeTab === 'faults'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-purple-400" />
              <span>Fault Injection Testbench</span>
            </button>
          </div>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-900/60 custom-scrollbar">
          {/* TAB 1: MEMORY ALLOCATION MAP */}
          {activeTab === 'memory' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Overview Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>WORK MEMORY</span>
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-white">4.8</span>
                    <span className="text-xs text-slate-400">/ 128 KB (3.8%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full w-[4%]" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>LOAD MEMORY (FLASH)</span>
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-white">32.4</span>
                    <span className="text-xs text-slate-400">/ 4096 KB (0.8%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full w-[1%]" />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>RETENTIVE REGISTERS</span>
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-emerald-400">100%</span>
                    <span className="text-xs text-slate-400">NVRAM Protected</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Battery-less supercap backup</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>INSTRUCTION FOOTPRINT</span>
                    <Cpu className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-amber-400">{totalInstructions}</span>
                    <span className="text-xs text-slate-400">OpCodes across {program.rungs.length} Rungs</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-2">
                    Evaluation density: {(totalInstructions / (program.rungs.length || 1)).toFixed(1)} ops/rung
                  </div>
                </div>
              </div>

              {/* Memory Areas Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memoryStats.map((stat) => (
                  <div
                    key={stat.area}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white font-mono">{stat.name}</span>
                        <span className="px-2 py-0.5 bg-slate-900 text-blue-400 border border-slate-800 rounded text-xs font-mono font-bold">
                          {stat.prefix}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{stat.description}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">Allocated Elements:</span>
                        <span className="font-bold text-slate-200">
                          {stat.activeCount} active / {stat.totalElements} defined
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono mb-2">
                        <span className="text-slate-400">Area Capacity:</span>
                        <span className="font-bold text-slate-300">
                          {stat.usedBytes} / {stat.capacityBytes} Bytes (
                          {Math.round((stat.usedBytes / stat.capacityBytes) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (stat.usedBytes / stat.capacityBytes) * 100)}%`,
                            backgroundColor:
                              stat.area === 'INPUTS'
                                ? '#3b82f6'
                                : stat.area === 'OUTPUTS'
                                ? '#10b981'
                                : stat.area === 'TIMERS'
                                ? '#f59e0b'
                                : stat.area === 'COUNTERS'
                                ? '#8b5cf6'
                                : '#06b6d4',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-time Bit Heatmap (Byte-Level Memory Inspector) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Binary className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-white font-mono">
                      Real-Time Bit Pattern Matrix (%I / %Q / %M)
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    High Bit (1): <span className="text-emerald-400 font-bold">Green</span> | Low Bit (0):{' '}
                    <span className="text-slate-600">Dark</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Inputs Byte IB0 */}
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 font-mono">
                    <div className="flex justify-between text-xs text-blue-400 font-bold mb-2">
                      <span>PROCESS INPUTS (%IB0 / X0-X7)</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 text-center">
                      {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                        const addr = dialect === 'delta' ? `X${bit}` : `I0.${bit}`;
                        const isHigh = resolveBit(addr);
                        const isForced = forcedMap[addr] !== undefined;
                        return (
                          <div
                            key={addr}
                            onClick={() => handleToggleForce(addr)}
                            title={`${addr} (Click to force/unforce)`}
                            className={`p-2 rounded border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isHigh
                                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                            } ${isForced ? 'ring-2 ring-amber-500' : ''}`}
                          >
                            <span className="text-[10px] text-slate-400">.{bit}</span>
                            <span className="text-xs font-black">{isHigh ? '1' : '0'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Outputs Byte QB0 */}
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 font-mono">
                    <div className="flex justify-between text-xs text-emerald-400 font-bold mb-2">
                      <span>PROCESS OUTPUTS (%QB0 / Y0-Y7)</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 text-center">
                      {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                        const addr = dialect === 'delta' ? `Y${bit}` : `Q0.${bit}`;
                        const isHigh = resolveBit(addr);
                        const isForced = forcedMap[addr] !== undefined;
                        return (
                          <div
                            key={addr}
                            onClick={() => handleToggleForce(addr)}
                            title={`${addr} (Click to force/unforce)`}
                            className={`p-2 rounded border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isHigh
                                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                            } ${isForced ? 'ring-2 ring-amber-500' : ''}`}
                          >
                            <span className="text-[10px] text-slate-400">.{bit}</span>
                            <span className="text-xs font-black">{isHigh ? '1' : '0'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Internal Flags MB0 */}
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 font-mono">
                    <div className="flex justify-between text-xs text-cyan-400 font-bold mb-2">
                      <span>INTERNAL FLAGS (%MB0 / M0-M7)</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 text-center">
                      {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                        const addr = dialect === 'delta' ? `M${bit}` : `M0.${bit}`;
                        const isHigh = resolveBit(addr);
                        const isForced = forcedMap[addr] !== undefined;
                        return (
                          <div
                            key={addr}
                            onClick={() => handleToggleForce(addr)}
                            title={`${addr} (Click to force/unforce)`}
                            className={`p-2 rounded border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isHigh
                                ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                            } ${isForced ? 'ring-2 ring-amber-500' : ''}`}
                          >
                            <span className="text-[10px] text-slate-400">.{bit}</span>
                            <span className="text-xs font-black">{isHigh ? '1' : '0'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TASK ENGINE & SCAN CYCLES */}
          {activeTab === 'tasks' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Scan Cycle Performance KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>CURRENT SCAN TIME</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-emerald-400">{memory.scanCycleTime || 0}</span>
                    <span className="text-xs text-slate-400">ms / scan</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-2">
                    Frequency: {memory.scanCycleTime > 0 ? (1000 / memory.scanCycleTime).toFixed(1) : '50.0'} Hz
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>AVG / MIN / MAX JITTER</span>
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-white">{avgScanTime}</span>
                    <span className="text-xs text-slate-400">
                      ms (min: {minScanTime}, max: {maxScanTime})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-2">
                    Jitter: ±{(maxScanTime - minScanTime).toFixed(2)} ms variance
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>WATCHDOG TIMER (WDT)</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-amber-400">
                      {Math.max(0, 100 - (memory.scanCycleTime || 0)).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">Headroom (100ms Limit)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, 100 - (memory.scanCycleTime || 0)))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>EVALUATED NETWORKS</span>
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-purple-400">{program.rungs.length}</span>
                    <span className="text-xs text-slate-400">Rungs</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-2">
                    Energized: {program.rungs.filter((r) => r.isEnergized).length} active rungs
                  </div>
                </div>
              </div>

              {/* Task Engine Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-mono">
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-white">
                      Organization Blocks & Real-Time Task Dispatcher
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Target Cycle Interval: 20ms</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <th className="py-2.5 px-4">Task / OB</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Priority</th>
                        <th className="py-2.5 px-4">Target Interval</th>
                        <th className="py-2.5 px-4">Last Exec (µs)</th>
                        <th className="py-2.5 px-4">Avg Exec (µs)</th>
                        <th className="py-2.5 px-4">Total Cycles</th>
                        <th className="py-2.5 px-4">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {plcTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>{t.name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                              {t.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-amber-400 font-bold">{t.priority}</td>
                          <td className="py-3 px-4 text-slate-300">{t.cycleMs > 0 ? `${t.cycleMs} ms` : 'On Event'}</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">{t.lastDurationUs} µs</td>
                          <td className="py-3 px-4 text-slate-300">{t.avgDurationUs} µs</td>
                          <td className="py-3 px-4 text-slate-400">{t.executions.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'RUNNING' || t.status === 'ACTIVE'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXECUTION LOGS STREAM */}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-fadeIn flex flex-col h-full">
              {/* Log Filter & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono text-slate-400">CATEGORY:</span>
                  <select
                    value={logFilterCategory}
                    onChange={(e) => setLogFilterCategory(e.target.value)}
                    className="bg-slate-900 text-xs font-mono text-white border border-slate-800 rounded px-2.5 py-1 outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL CATEGORIES</option>
                    <option value="CYCLE">CYCLE & SCANS</option>
                    <option value="RUNG">RUNG EVALUATION</option>
                    <option value="TIMER">TIMERS (TON/TOF/TP)</option>
                    <option value="COUNTER">COUNTERS (CTU/CTD)</option>
                    <option value="FAULT">FAULTS & EXCEPTIONS</option>
                  </select>

                  {/* Search query */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Search address or text..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 outline-none w-48 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Pause Stream */}
                  <button
                    onClick={() => setIsLogPaused(!isLogPaused)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors cursor-pointer ${
                      isLogPaused
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    {isLogPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{isLogPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}</span>
                  </button>

                  {/* Auto-scroll toggle */}
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2.5 py-1 rounded border text-xs font-mono transition-colors cursor-pointer ${
                      autoScroll
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    AUTO-SCROLL: {autoScroll ? 'ON' : 'OFF'}
                  </button>

                  {/* Clear */}
                  <button
                    onClick={() => setAccumulatedLogs([])}
                    title="Clear Logs"
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Export JSON */}
                  <button
                    onClick={exportLogsAsJson}
                    title="Export JSON"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>JSON</span>
                  </button>

                  {/* Export CSV */}
                  <button
                    onClick={exportLogsAsCsv}
                    title="Export CSV"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Log Stream Console Terminal */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex-1 h-[420px] overflow-y-auto font-mono text-xs shadow-inner custom-scrollbar flex flex-col justify-between">
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
                    <Terminal className="w-8 h-8 mb-2 opacity-50 text-blue-400" />
                    <span>No execution logs recorded yet. Start the simulation in RUN mode to stream events.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredLogs.map((log) => {
                      const isSuccess = log.severity === 'SUCCESS';
                      const isWarn = log.severity === 'WARN';
                      const isError = log.severity === 'ERROR';

                      return (
                        <div
                          key={log.id}
                          className={`px-3 py-1.5 rounded flex items-start justify-between gap-3 border transition-colors ${
                            isError
                              ? 'bg-rose-950/40 border-rose-900/60 text-rose-200'
                              : isWarn
                              ? 'bg-amber-950/40 border-amber-900/60 text-amber-200'
                              : isSuccess
                              ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200'
                              : 'bg-slate-900/50 border-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="text-[11px] text-slate-500 shrink-0 select-none">
                              {log.timeStr}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                                log.category === 'CYCLE'
                                  ? 'bg-blue-950 text-blue-400'
                                  : log.category === 'RUNG'
                                  ? 'bg-purple-950 text-purple-400'
                                  : log.category === 'TIMER'
                                  ? 'bg-amber-950 text-amber-400'
                                  : log.category === 'COUNTER'
                                  ? 'bg-cyan-950 text-cyan-400'
                                  : 'bg-rose-950 text-rose-400'
                              }`}
                            >
                              {log.category}
                            </span>
                            {log.rungNumber && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded shrink-0">
                                NW#{log.rungNumber}
                              </span>
                            )}
                            <span className="font-semibold break-all text-slate-200">{log.message}</span>
                          </div>

                          {log.details && (
                            <span className="text-[11px] text-slate-400 italic hidden sm:inline shrink-0">
                              {log.details}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: VARIABLE WATCH & FORCE TABLE */}
          {activeTab === 'watch' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Watch Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <form onSubmit={handleAddWatch} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 font-bold">ADD WATCH ADDRESS:</span>
                  <input
                    type="text"
                    placeholder="e.g. I0.0, Q0.0, M0.1, IW64"
                    value={newWatchInput}
                    onChange={(e) => setNewWatchInput(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white uppercase font-mono placeholder-slate-500 outline-none w-56"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD TAG</span>
                  </button>
                </form>

                {forcedCount > 0 && onUnforceAll && (
                  <button
                    onClick={onUnforceAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer shadow-md shadow-amber-950"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>UNFORCE ALL ({forcedCount})</span>
                  </button>
                )}
              </div>

              {/* Watch & Force Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-mono">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <th className="py-2.5 px-4">Address</th>
                        <th className="py-2.5 px-4">State / Value</th>
                        <th className="py-2.5 px-4">Radix: Hex</th>
                        <th className="py-2.5 px-4">Radix: Binary</th>
                        <th className="py-2.5 px-4">Force Status</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {watchAddresses.map((addr) => {
                        const isBit = !addr.startsWith('IW') && !addr.startsWith('QW') && !addr.startsWith('MW') && !addr.startsWith('D') && !addr.startsWith('DB');
                        const isForced = forcedMap[addr] !== undefined;

                        const bitVal = resolveBit(addr);
                        const numVal = isBit ? (bitVal ? 1 : 0) : resolveNumeric(addr);

                        return (
                          <tr
                            key={addr}
                            className={`hover:bg-slate-900/40 transition-colors ${
                              isForced ? 'bg-amber-950/20' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  bitVal ? 'bg-emerald-400' : 'bg-slate-600'
                                }`}
                              />
                              <span className="text-blue-300 font-bold">{addr}</span>
                            </td>

                            <td className="py-3 px-4">
                              {isBit ? (
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-xs ${
                                    bitVal
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {bitVal ? 'TRUE (1)' : 'FALSE (0)'}
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold text-sm">{numVal}</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-slate-400">
                              16#{numVal.toString(16).toUpperCase().padStart(4, '0')}
                            </td>

                            <td className="py-3 px-4 text-slate-400">
                              2#{numVal.toString(2).padStart(8, '0')}
                            </td>

                            <td className="py-3 px-4">
                              {isForced ? (
                                <span className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>FORCED ({String(forcedMap[addr])})</span>
                                </span>
                              ) : (
                                <span className="text-slate-500">Unforced (Real)</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right space-x-1.5">
                              {/* Toggle Force Bit */}
                              {isBit ? (
                                <button
                                  onClick={() => handleToggleForce(addr)}
                                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                                    isForced
                                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {isForced ? 'UNFORCE' : 'FORCE'}
                                </button>
                              ) : null}

                              {/* Remove Watch */}
                              <button
                                onClick={() => handleRemoveWatch(addr)}
                                title="Remove tag from watch"
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FAULT INJECTION TESTBENCH */}
          {activeTab === 'faults' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl">
                <div className="flex items-center gap-2 text-purple-400 font-bold font-mono text-sm mb-2">
                  <Flame className="w-4 h-4 text-purple-400" />
                  <span>HARDWARE & SOFTWARE FAULT INJECTION SIMULATOR</span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Simulate industrial abnormal conditions, sensor chatter, arithmetic division faults, and watchdog timeouts to verify how your ladder logic handles emergency stops and interlocks.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Fault 1: E-Stop Stuck High */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono mb-1">
                        E-Stop Contact Failure
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Forces E-Stop input NC contact Open to test fail-safe power interruption.
                      </p>
                    </div>
                    <button
                      onClick={() => onForceBit && onForceBit('I0.2', false)}
                      className="w-full py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      INJECT E-STOP TRIP
                    </button>
                  </div>

                  {/* Fault 2: Motor Thermal Overload */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono mb-1">
                        Motor Thermal Overload Trip
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Trips Thermal Overload Relay Auxiliary contact (95-96 / I0.3) to test motor shutdown.
                      </p>
                    </div>
                    <button
                      onClick={() => onForceBit && onForceBit('I0.3', false)}
                      className="w-full py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      INJECT OVERLOAD TRIP
                    </button>
                  </div>

                  {/* Fault 3: Division by Zero Stress */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono mb-1">
                        Math Register Zero Divisor
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Sets divisor numeric register to 0 to verify OB82 Diagnostic Handler reaction.
                      </p>
                    </div>
                    <button
                      onClick={() => onSetNumeric('IW60', 0)}
                      className="w-full py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      SET DIVISOR = 0
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PLC Virtual Runtime: 50.0 Hz deterministic IEC 61131-3 virtual scan machine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
