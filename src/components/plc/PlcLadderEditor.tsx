import React, { useState, useRef } from 'react';
import {
  LadderElement,
  LadderRung,
  PlcDialect,
  PlcInstructionType,
  PlcMemoryState,
  PlcProgram,
  SimulationMode,
} from '../../types';
import {
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  CornerDownRight,
  Zap,
  Activity,
  AlertCircle,
  HelpCircle,
  Cpu,
  Lock,
  Unlock,
  Compass,
  Camera,
  Bookmark,
} from 'lucide-react';
import { PlcLadderMiniMap } from './PlcLadderMiniMap';

interface PlcLadderEditorProps {
  program: PlcProgram;
  setProgram: (p: PlcProgram) => void;
  memory: PlcMemoryState;
  onSetBit: (address: string, val: boolean) => void;
  onSetNumeric: (address: string, val: number) => void;
  simulationMode: SimulationMode;
  dialect: PlcDialect;
  onOpenDiagnostics?: () => void;
  onOpenSnapshots?: () => void;
  onQuickTakeSnapshot?: () => void;
  snapshotsCount?: number;
}

export const PlcLadderEditor: React.FC<PlcLadderEditorProps> = ({
  program,
  setProgram,
  memory,
  onSetBit,
  onSetNumeric,
  simulationMode,
  dialect,
  onOpenDiagnostics,
  onOpenSnapshots,
  onQuickTakeSnapshot,
  snapshotsCount = 0,
}) => {
  const [selectedElement, setSelectedElement] = useState<LadderElement | null>(null);
  const [selectedRungId, setSelectedRungId] = useState<string | null>(program.rungs[0]?.id || null);
  const [editingAddress, setEditingAddress] = useState<string>('');
  const [editingSymbol, setEditingSymbol] = useState<string>('');
  const [editingPreset, setEditingPreset] = useState<number>(3000);
  const [isMiniMapCollapsed, setIsMiniMapCollapsed] = useState<boolean>(false);

  // References for scrolling and mini-map sync
  const ladderContainerRef = useRef<HTMLDivElement>(null);
  const rungRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const isBitTrue = (addr: string): boolean => {
    const clean = addr.trim().toUpperCase();
    if (clean.startsWith('I') || clean.startsWith('X')) return Boolean(memory.inputs[clean]);
    if (clean.startsWith('Q') || clean.startsWith('Y')) return Boolean(memory.outputs[clean]);
    if (clean.startsWith('M')) return Boolean(memory.memory[clean]);
    if (clean.startsWith('T')) return Boolean(memory.timers[clean]?.q);
    if (clean.startsWith('C')) return Boolean(memory.counters[clean]?.q);
    return Boolean(memory.memory[clean]);
  };

  const getNumericVal = (addr: string): number => {
    const clean = addr.trim().toUpperCase();
    if (!isNaN(Number(clean))) return Number(clean);
    if (clean.startsWith('T')) return memory.timers[clean]?.et || 0;
    if (clean.startsWith('C')) return memory.counters[clean]?.cv || 0;
    return memory.dataRegisters[clean] || 0;
  };

  const addRung = () => {
    const newRung: LadderRung = {
      id: 'rung_' + Math.random().toString(36).substring(2, 9),
      rungNumber: program.rungs.length + 1,
      comment: `Network ${program.rungs.length + 1}: Logic Network`,
      mainBranch: [
        {
          id: 'elem_' + Math.random().toString(36).substring(2, 9),
          type: 'NO_CONTACT',
          address: dialect === 'delta' ? 'X0' : 'I0.0',
          symbol: 'START_PB',
        },
        {
          id: 'elem_' + Math.random().toString(36).substring(2, 9),
          type: 'COIL',
          address: dialect === 'delta' ? 'Y0' : 'Q0.0',
          symbol: 'MOTOR_KM1',
        },
      ],
    };
    setProgram({ ...program, rungs: [...program.rungs, newRung] });
    setSelectedRungId(newRung.id);
  };

  const deleteRung = (rungId: string) => {
    if (program.rungs.length <= 1) return;
    const filtered = program.rungs
      .filter((r) => r.id !== rungId)
      .map((r, i) => ({ ...r, rungNumber: i + 1 }));
    setProgram({ ...program, rungs: filtered });
  };

  const addElementToRung = (type: PlcInstructionType) => {
    if (!selectedRungId) return;
    const rungs = program.rungs.map((r) => {
      if (r.id !== selectedRungId) return r;
      const isOutput =
        type === 'COIL' ||
        type === 'SET_COIL' ||
        type === 'RESET_COIL' ||
        type === 'TON' ||
        type === 'TOF' ||
        type === 'TP' ||
        type === 'CTU' ||
        type === 'CTD' ||
        type === 'MATH_ADD' ||
        type === 'MOVE';

      let defaultAddress = dialect === 'delta' ? 'X0' : 'I0.0';
      if (isOutput) defaultAddress = dialect === 'delta' ? 'Y0' : 'Q0.0';
      if (type === 'TON' || type === 'TOF' || type === 'TP') defaultAddress = dialect === 'delta' ? 'T0' : 'T1';
      if (type === 'CTU' || type === 'CTD') defaultAddress = dialect === 'delta' ? 'C0' : 'C1';

      const newElem: LadderElement = {
        id: 'elem_' + Math.random().toString(36).substring(2, 9),
        type,
        address: defaultAddress,
        symbol: isOutput ? 'OUTPUT_TAG' : 'INPUT_TAG',
        presetTime: 3000,
        presetCount: 5,
      };

      // Place outputs at the end, contacts before outputs
      const outputs = r.mainBranch.filter((e) =>
        ['COIL', 'SET_COIL', 'RESET_COIL', 'TON', 'TOF', 'TP', 'CTU', 'CTD', 'MATH_ADD', 'MOVE'].includes(e.type)
      );
      const contacts = r.mainBranch.filter(
        (e) => !['COIL', 'SET_COIL', 'RESET_COIL', 'TON', 'TOF', 'TP', 'CTU', 'CTD', 'MATH_ADD', 'MOVE'].includes(e.type)
      );

      if (isOutput) {
        return { ...r, mainBranch: [...contacts, ...outputs, newElem] };
      } else {
        return { ...r, mainBranch: [...contacts, newElem, ...outputs] };
      }
    });

    setProgram({ ...program, rungs });
  };

  const addBranchToRung = (rungId: string) => {
    const rungs = program.rungs.map((r) => {
      if (r.id !== rungId) return r;
      const sub = r.subBranches || [];
      const newBranch = {
        id: 'branch_' + Math.random().toString(36).substring(2, 9),
        elements: [
          {
            id: 'elem_' + Math.random().toString(36).substring(2, 9),
            type: 'NO_CONTACT' as PlcInstructionType,
            address: dialect === 'delta' ? 'Y0' : 'Q0.0',
            symbol: 'KM1_SEAL',
          },
        ],
      };
      return { ...r, subBranches: [...sub, newBranch] };
    });
    setProgram({ ...program, rungs });
  };

  const removeElement = (rungId: string, elemId: string) => {
    const rungs = program.rungs.map((r) => {
      if (r.id !== rungId) return r;
      return {
        ...r,
        mainBranch: r.mainBranch.filter((e) => e.id !== elemId),
        subBranches: r.subBranches?.map((sb) => ({
          ...sb,
          elements: sb.elements.filter((e) => e.id !== elemId),
        })),
      };
    });
    setProgram({ ...program, rungs });
    if (selectedElement?.id === elemId) setSelectedElement(null);
  };

  const saveSelectedElementUpdates = () => {
    if (!selectedElement || !selectedRungId) return;
    const rungs = program.rungs.map((r) => {
      if (r.id !== selectedRungId) return r;
      const updateElem = (e: LadderElement): LadderElement => {
        if (e.id !== selectedElement.id) return e;
        return {
          ...e,
          address: editingAddress.toUpperCase().trim(),
          symbol: editingSymbol.toUpperCase().trim(),
          presetTime: editingPreset,
          presetCount: editingPreset,
        };
      };
      return {
        ...r,
        mainBranch: r.mainBranch.map(updateElem),
        subBranches: r.subBranches?.map((sb) => ({
          ...sb,
          elements: sb.elements.map(updateElem),
        })),
      };
    });
    setProgram({ ...program, rungs });
    setSelectedElement({
      ...selectedElement,
      address: editingAddress,
      symbol: editingSymbol,
      presetTime: editingPreset,
      presetCount: editingPreset,
    });
  };

  const selectElementForEdit = (elem: LadderElement, rungId: string) => {
    setSelectedElement(elem);
    setSelectedRungId(rungId);
    setEditingAddress(elem.address);
    setEditingSymbol(elem.symbol || '');
    setEditingPreset(elem.presetTime || elem.presetCount || 3000);
  };

  const toggleAddressForce = (addr: string) => {
    const current = isBitTrue(addr);
    onSetBit(addr, !current);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Left Toolbar: Instruction Library */}
      <div className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-cyan-300">
            Instruction Palette
          </span>
        </div>

        {/* Contacts */}
        <div className="space-y-1 mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contacts & Inputs</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => addElementToRung('NO_CONTACT')}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 cursor-pointer"
            >
              <span className="font-bold text-sm">-[ ]-</span>
              <span className="text-[11px] font-sans text-slate-300">NO Contact</span>
            </button>
            <button
              onClick={() => addElementToRung('NC_CONTACT')}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 cursor-pointer"
            >
              <span className="font-bold text-sm">-[/]-</span>
              <span className="text-[11px] font-sans text-slate-300">NC Contact</span>
            </button>
            <button
              onClick={() => addElementToRung('POS_EDGE')}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 cursor-pointer"
            >
              <span className="font-bold text-sm">-[P]-</span>
              <span className="text-[11px] font-sans text-slate-300">Rising Edge</span>
            </button>
            <button
              onClick={() => addElementToRung('NEG_EDGE')}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 cursor-pointer"
            >
              <span className="font-bold text-sm">-[N]-</span>
              <span className="text-[11px] font-sans text-slate-300">Falling Edge</span>
            </button>
          </div>
        </div>

        {/* Coils */}
        <div className="space-y-1 mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coils & Outputs</span>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => addElementToRung('COIL')}
              className="flex flex-col items-center justify-center p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs font-mono text-emerald-400 cursor-pointer"
            >
              <span className="font-bold text-sm">-( )-</span>
              <span className="text-[10px] font-sans text-slate-300">Coil</span>
            </button>
            <button
              onClick={() => addElementToRung('SET_COIL')}
              className="flex flex-col items-center justify-center p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs font-mono text-emerald-400 cursor-pointer"
            >
              <span className="font-bold text-sm">-( S )-</span>
              <span className="text-[10px] font-sans text-slate-300">Set</span>
            </button>
            <button
              onClick={() => addElementToRung('RESET_COIL')}
              className="flex flex-col items-center justify-center p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs font-mono text-emerald-400 cursor-pointer"
            >
              <span className="font-bold text-sm">-( R )-</span>
              <span className="text-[10px] font-sans text-slate-300">Reset</span>
            </button>
          </div>
        </div>

        {/* Timers & Counters */}
        <div className="space-y-1 mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timers & Counters</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => addElementToRung('TON')}
              className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-xs text-amber-300 cursor-pointer"
            >
              <span className="font-mono font-bold">TON</span>
              <span className="text-[10px] text-slate-400">On Delay</span>
            </button>
            <button
              onClick={() => addElementToRung('TOF')}
              className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-xs text-amber-300 cursor-pointer"
            >
              <span className="font-mono font-bold">TOF</span>
              <span className="text-[10px] text-slate-400">Off Delay</span>
            </button>
            <button
              onClick={() => addElementToRung('CTU')}
              className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-xs text-purple-300 cursor-pointer"
            >
              <span className="font-mono font-bold">CTU</span>
              <span className="text-[10px] text-slate-400">Count Up</span>
            </button>
            <button
              onClick={() => addElementToRung('CTD')}
              className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-xs text-purple-300 cursor-pointer"
            >
              <span className="font-mono font-bold">CTD</span>
              <span className="text-[10px] text-slate-400">Count Down</span>
            </button>
          </div>
        </div>

        {/* Comparators & Math */}
        <div className="space-y-1 mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compare & Math</span>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => addElementToRung('CMP_EQ')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-sky-300 cursor-pointer text-center"
            >
              == EQ
            </button>
            <button
              onClick={() => addElementToRung('CMP_GT')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-sky-300 cursor-pointer text-center"
            >
              &gt; GT
            </button>
            <button
              onClick={() => addElementToRung('CMP_LT')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-sky-300 cursor-pointer text-center"
            >
              &lt; LT
            </button>
            <button
              onClick={() => addElementToRung('MATH_ADD')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-sky-300 cursor-pointer text-center"
            >
              + ADD
            </button>
            <button
              onClick={() => addElementToRung('MATH_SUB')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-sky-300 cursor-pointer text-center"
            >
              - SUB
            </button>
            <button
              onClick={() => addElementToRung('MOVE')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-sky-300 cursor-pointer text-center"
            >
              MOV
            </button>
          </div>
        </div>

        {/* Selected Element Property Inspector */}
        {selectedElement && (
          <div className="mt-auto pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-cyan-400 uppercase">Tag Inspector</span>
              <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                {selectedElement.type}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Address (e.g. I0.0, Q0.0, M0.0)</label>
                <input
                  type="text"
                  value={editingAddress}
                  onChange={(e) => setEditingAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-300 uppercase outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Symbol Alias</label>
                <input
                  type="text"
                  value={editingSymbol}
                  onChange={(e) => setEditingSymbol(e.target.value)}
                  placeholder="e.g. START_PB"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 uppercase outline-none focus:border-cyan-500"
                />
              </div>

              {(selectedElement.type === 'TON' ||
                selectedElement.type === 'TOF' ||
                selectedElement.type === 'TP' ||
                selectedElement.type === 'CTU' ||
                selectedElement.type === 'CTD') && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    {selectedElement.type.startsWith('T') ? 'Preset Time (PT in ms)' : 'Preset Count (PV)'}
                  </label>
                  <input
                    type="number"
                    value={editingPreset}
                    onChange={(e) => setEditingPreset(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-amber-300 outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveSelectedElementUpdates}
                  className="flex-1 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Apply Tag
                </button>
                <button
                  onClick={() => selectedRungId && removeElement(selectedRungId, selectedElement.id)}
                  className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Center: Interactive Ladder Diagram Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Canvas Top Controls */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white flex items-center gap-1.5 font-['Rajdhani'] text-sm">
              <span>RUNG NETWORK DIAGRAM</span>
              <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800">
                {dialect === 'siemens' ? 'IEC 61131-3 / S7-1200' : 'Delta DVP PLC'}
              </span>
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500" />
              <span>Green Rails = Live 24VDC Power Flow</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Mini-Map button */}
            <button
              onClick={() => setIsMiniMapCollapsed(!isMiniMapCollapsed)}
              title={isMiniMapCollapsed ? 'Show Mini-Map Navigator' : 'Hide Mini-Map Navigator'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border ${
                !isMiniMapCollapsed
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-700/80 shadow-sm shadow-cyan-950'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${!isMiniMapCollapsed ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">MINI-MAP</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">
                {program.rungs.length}
              </span>
            </button>

            {/* Snapshots Button */}
            {onOpenSnapshots && (
              <button
                onClick={onOpenSnapshots}
                title="Simulation Snapshots & State Restore"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">SNAPSHOTS</span>
                {snapshotsCount > 0 && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                    {snapshotsCount}
                  </span>
                )}
              </button>
            )}

            {onOpenDiagnostics && (
              <button
                onClick={onOpenDiagnostics}
                title="Open Real-Time Diagnostics, Memory Map & Execution Logs"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950 hover:bg-blue-900 border border-blue-700/60 text-blue-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>DIAGNOSTICS</span>
              </button>
            )}
            <button
              onClick={addRung}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rung</span>
            </button>
          </div>
        </div>

        {/* Scrollable Ladder Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" ref={ladderContainerRef}>
          {program.rungs.map((rung) => {
            const isSelected = selectedRungId === rung.id;
            const isRungEnergized = rung.isEnergized;

            return (
              <div
                key={rung.id}
                id={`rung-${rung.id}`}
                ref={(el) => {
                  rungRefs.current[rung.id] = el;
                }}
                onClick={() => setSelectedRungId(rung.id)}
                className={`relative rounded-xl border transition-all p-3 sm:p-4 bg-slate-900/90 ${
                  isSelected
                    ? 'border-blue-500/80 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Rung Header */}
                <div className="flex items-center justify-between mb-3 text-xs border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">
                      RUNG {rung.rungNumber}
                    </span>
                    <input
                      type="text"
                      value={rung.comment || ''}
                      onChange={(e) => {
                        const updated = program.rungs.map((r) =>
                          r.id === rung.id ? { ...r, comment: e.target.value } : r
                        );
                        setProgram({ ...program, rungs: updated });
                      }}
                      placeholder="Add Network comment..."
                      className="bg-transparent text-slate-300 text-xs outline-none border-b border-transparent focus:border-blue-500 w-64 sm:w-96"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addBranchToRung(rung.id);
                      }}
                      title="Add Parallel Branch (OR Logic)"
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-[11px] transition-colors cursor-pointer border border-slate-700"
                    >
                      <CornerDownRight className="w-3 h-3 text-blue-400" />
                      <span>+ Branch</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRung(rung.id);
                      }}
                      title="Delete Rung"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ladder Diagram Circuit View */}
                <div className="relative flex items-center min-h-[100px] px-6 py-2 overflow-x-auto">
                  {/* Left Power Rail (L+) */}
                  <div
                    className={`absolute left-2 top-0 bottom-0 w-1.5 rounded-full transition-colors ${
                      simulationMode === 'RUN'
                        ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]'
                        : 'bg-slate-700'
                    }`}
                  />

                  {/* Right Power Rail (M / Ground) */}
                  <div className="absolute right-2 top-0 bottom-0 w-1.5 rounded-full bg-blue-600/30" />

                  {/* Main Logic Horizontal Rung Line */}
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Main Branch Wire */}
                    <div className="relative flex items-center justify-between gap-3 min-w-[500px]">
                      {/* Connecting Line */}
                      <div
                        className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] transition-colors ${
                          isRungEnergized && simulationMode === 'RUN'
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                            : 'bg-slate-700'
                        }`}
                      />

                      {/* Series Elements */}
                      <div className="relative z-10 flex items-center gap-4 flex-wrap">
                        {rung.mainBranch.map((elem) => {
                          const isOutput = [
                            'COIL',
                            'SET_COIL',
                            'RESET_COIL',
                            'TON',
                            'TOF',
                            'TP',
                            'CTU',
                            'CTD',
                            'MATH_ADD',
                            'MOVE',
                          ].includes(elem.type);

                          if (isOutput) return null; // Render contacts first

                          const bitState = isBitTrue(elem.address);
                          const isSelectedElem = selectedElement?.id === elem.id;

                          return (
                            <div
                              key={elem.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectElementForEdit(elem, rung.id);
                              }}
                              className={`group relative flex flex-col items-center border rounded-lg px-2.5 py-1.5 cursor-pointer transition-all ${
                                isSelectedElem
                                  ? 'border-blue-400 ring-2 ring-blue-400/40 bg-slate-800'
                                  : 'border-slate-700 hover:border-blue-500/60'
                              } ${
                                bitState && simulationMode === 'RUN'
                                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                  : 'bg-slate-900'
                              }`}
                            >
                              {/* Address & Symbol */}
                              <div className="text-center mb-0.5 leading-tight">
                                <span className={`font-mono text-[11px] font-bold block ${bitState ? 'text-emerald-400' : 'text-slate-300'}`}>
                                  {elem.address}
                                </span>
                                {elem.symbol && (
                                  <span className="text-[9px] text-slate-400 block max-w-[80px] truncate font-sans">
                                    {elem.symbol}
                                  </span>
                                )}
                              </div>

                              {/* Graphical Symbol */}
                              <div className="my-0.5 flex items-center justify-center font-mono text-sm font-bold">
                                {elem.type === 'NO_CONTACT' && (
                                  <span className={bitState ? 'text-emerald-300' : 'text-slate-400'}>
                                    [ -| |- ]
                                  </span>
                                )}
                                {elem.type === 'NC_CONTACT' && (
                                  <span className={!bitState ? 'text-emerald-300' : 'text-slate-400'}>
                                    [ -|/|- ]
                                  </span>
                                )}
                                {elem.type === 'POS_EDGE' && (
                                  <span className="text-sky-400">[ -|P|- ]</span>
                                )}
                                {elem.type === 'NEG_EDGE' && (
                                  <span className="text-sky-400">[ -|N|- ]</span>
                                )}
                                {elem.type.startsWith('CMP') && (
                                  <span className="text-amber-300 text-xs px-1.5 py-0.5 bg-slate-950 rounded border border-amber-800/60">
                                    {elem.in1} {elem.type === 'CMP_EQ' ? '==' : '>'} {elem.in2}
                                  </span>
                                )}
                              </div>

                              {/* Quick Toggle Force Bit Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAddressForce(elem.address);
                                }}
                                title="Click to toggle/force bit"
                                className={`mt-1 px-1.5 py-0.2 text-[9px] rounded font-mono font-bold transition-all ${
                                  bitState
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {bitState ? '1 (ON)' : '0 (OFF)'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Output Elements (Coils, Timers, Blocks) */}
                      <div className="relative z-10 flex items-center gap-3 ml-auto">
                        {rung.mainBranch.map((elem) => {
                          const isOutput = [
                            'COIL',
                            'SET_COIL',
                            'RESET_COIL',
                            'TON',
                            'TOF',
                            'TP',
                            'CTU',
                            'CTD',
                            'MATH_ADD',
                            'MOVE',
                          ].includes(elem.type);

                          if (!isOutput) return null;

                          const bitState = isBitTrue(elem.address);
                          const isSelectedElem = selectedElement?.id === elem.id;

                          // Render Coil
                          if (elem.type === 'COIL' || elem.type === 'SET_COIL' || elem.type === 'RESET_COIL') {
                            return (
                              <div
                                key={elem.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectElementForEdit(elem, rung.id);
                                }}
                                className={`flex flex-col items-center border rounded-lg px-3 py-1.5 cursor-pointer transition-all ${
                                  isSelectedElem
                                    ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-slate-800'
                                    : 'border-slate-700 hover:border-emerald-500/60'
                                } ${
                                  bitState && simulationMode === 'RUN'
                                    ? 'shadow-[0_0_12px_rgba(16,185,129,0.3)] border-emerald-500 bg-emerald-500/20'
                                    : 'bg-slate-900'
                                }`}
                              >
                                <span className="font-mono text-[11px] font-bold text-emerald-300 block">
                                  {elem.address}
                                </span>
                                {elem.symbol && (
                                  <span className="text-[9px] text-slate-400 block max-w-[80px] truncate">
                                    {elem.symbol}
                                  </span>
                                )}
                                <div className="my-0.5 font-mono text-sm font-bold">
                                  {elem.type === 'COIL' && (
                                    <span className={bitState ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                      -( )-
                                    </span>
                                  )}
                                  {elem.type === 'SET_COIL' && (
                                    <span className={bitState ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                      -( S )-
                                    </span>
                                  )}
                                  {elem.type === 'RESET_COIL' && (
                                    <span className="text-amber-400 font-bold">-( R )-</span>
                                  )}
                                </div>
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                    bitState ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {bitState ? 'ACTIVE' : 'IDLE'}
                                </span>
                              </div>
                            );
                          }

                          // Render TON/TOF/TP Timer Block
                          if (elem.type === 'TON' || elem.type === 'TOF' || elem.type === 'TP') {
                            const timerData = memory.timers[elem.address] || {
                              pt: elem.presetTime || 3000,
                              et: 0,
                              q: false,
                            };
                            const pct = Math.min(100, (timerData.et / (timerData.pt || 1)) * 100);

                            return (
                              <div
                                key={elem.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectElementForEdit(elem, rung.id);
                                }}
                                className="w-36 bg-slate-800 border-2 border-blue-500/50 rounded-lg p-2.5 shadow-md cursor-pointer text-xs flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between border-b border-blue-500/30 pb-1">
                                  <span className="font-bold text-blue-400 font-mono text-[11px]">{elem.type}</span>
                                  <span className="font-mono text-slate-200 text-[10px] bg-slate-900 px-1 rounded">{elem.address}</span>
                                </div>
                                <div className="text-[9px] space-y-0.5 font-mono">
                                  <div className="flex justify-between items-center text-slate-400">
                                    <span>IN:</span>
                                    <span className={isRungEnergized ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                      {isRungEnergized ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-400">
                                    <span>PT:</span>
                                    <span className="text-slate-100 font-semibold">{elem.presetTime || 3000}ms</span>
                                  </div>
                                  <div className="flex justify-between items-center text-blue-300 font-bold">
                                    <span>ET:</span>
                                    <span>{timerData.et}ms</span>
                                  </div>
                                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-700">
                                    <div
                                      className="h-full bg-blue-500 transition-all duration-75 shadow-[0_0_4px_#3b82f6]"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Render CTU Counter Block
                          if (elem.type === 'CTU' || elem.type === 'CTD') {
                            const counterData = memory.counters[elem.address] || {
                              pv: elem.presetCount || 5,
                              cv: 0,
                              q: false,
                            };

                            return (
                              <div
                                key={elem.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectElementForEdit(elem, rung.id);
                                }}
                                className="w-36 bg-slate-800 border-2 border-purple-500/50 rounded-lg p-2.5 shadow-md cursor-pointer text-xs flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between border-b border-purple-500/30 pb-1">
                                  <span className="font-bold text-purple-400 font-mono text-[11px]">{elem.type}</span>
                                  <span className="font-mono text-slate-200 text-[10px] bg-slate-900 px-1 rounded">{elem.address}</span>
                                </div>
                                <div className="text-[9px] space-y-0.5 font-mono">
                                  <div className="flex justify-between text-slate-400">
                                    <span>PV:</span>
                                    <span className="text-slate-100 font-semibold">{elem.presetCount || 5}</span>
                                  </div>
                                  <div className="flex justify-between text-purple-300 font-bold">
                                    <span>CV:</span>
                                    <span>{counterData.cv}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400">
                                    <span>Q:</span>
                                    <span className={counterData.q ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                      {counterData.q ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </div>

                    {/* Sub-branches (Parallel OR paths like Start PB Seal-in) */}
                    {rung.subBranches && rung.subBranches.length > 0 && (
                      <div className="pl-6 border-l-2 border-slate-700 space-y-2">
                        {rung.subBranches.map((branch) => (
                          <div key={branch.id} className="flex items-center gap-3">
                            <CornerDownRight className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="flex items-center gap-2">
                              {branch.elements.map((elem) => {
                                const bitState = isBitTrue(elem.address);
                                return (
                                  <div
                                    key={elem.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectElementForEdit(elem, rung.id);
                                    }}
                                    className={`flex flex-col items-center border rounded-lg px-2.5 py-1.5 cursor-pointer ${
                                      bitState
                                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/20'
                                        : 'bg-slate-900 border-slate-700'
                                    }`}
                                  >
                                    <span className="font-mono text-[11px] font-bold text-blue-300">
                                      {elem.address}
                                    </span>
                                    <span className="text-[9px] text-slate-400">{elem.symbol || 'LATCH'}</span>
                                    <span className="font-mono text-sm font-bold text-emerald-300 mt-0.5">[ -| |- ]</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time I/O Debug Console (Professional Polish Terminal) */}
        <div className="h-44 bg-slate-900 border-t border-slate-800 p-3 overflow-hidden shrink-0 select-none">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Real-time I/O Debug Console
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              [Filtered: Active Scan Only]
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 h-28">
            {/* Input 1 (I0.0 / X0) */}
            <div
              onClick={() => toggleAddressForce(dialect === 'delta' ? 'X0' : 'I0.0')}
              className="bg-slate-950 border border-slate-800 hover:border-blue-500/40 p-2.5 rounded-lg flex flex-col gap-1 cursor-pointer transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold text-slate-400">
                  {dialect === 'delta' ? 'X0' : 'I0.0'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-blue-600/20 text-blue-400 rounded font-semibold">
                  INPUT
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-200 truncate">START_PB</div>
              <div className="w-full bg-slate-800 h-1.5 mt-auto rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isBitTrue(dialect === 'delta' ? 'X0' : 'I0.0')
                      ? 'w-full bg-emerald-500 shadow-[0_0_6px_#10b981]'
                      : 'w-0 bg-slate-600'
                  }`}
                />
              </div>
            </div>

            {/* Input 2 (I0.1 / X1) */}
            <div
              onClick={() => toggleAddressForce(dialect === 'delta' ? 'X1' : 'I0.1')}
              className="bg-slate-950 border border-slate-800 hover:border-blue-500/40 p-2.5 rounded-lg flex flex-col gap-1 cursor-pointer transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold text-slate-400">
                  {dialect === 'delta' ? 'X1' : 'I0.1'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-blue-600/20 text-blue-400 rounded font-semibold">
                  INPUT
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-200 truncate">STOP_PB</div>
              <div className="w-full bg-slate-800 h-1.5 mt-auto rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isBitTrue(dialect === 'delta' ? 'X1' : 'I0.1')
                      ? 'w-full bg-emerald-500 shadow-[0_0_6px_#10b981]'
                      : 'w-0 bg-slate-600'
                  }`}
                />
              </div>
            </div>

            {/* Output 1 (Q0.0 / Y0) */}
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold text-slate-400">
                  {dialect === 'delta' ? 'Y0' : 'Q0.0'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-600/20 text-amber-400 rounded font-semibold">
                  OUTPUT
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-200 truncate">MAIN_MOTOR</div>
              <div className="w-full bg-slate-800 h-1.5 mt-auto rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isBitTrue(dialect === 'delta' ? 'Y0' : 'Q0.0')
                      ? 'w-full bg-emerald-500 shadow-[0_0_6px_#10b981]'
                      : 'w-0 bg-slate-600'
                  }`}
                />
              </div>
            </div>

            {/* Analog Sensor Feedback */}
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold text-slate-400">AI_0 (IW64)</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-purple-600/20 text-purple-400 rounded font-semibold">
                  ANALOG
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-200 truncate">RPM_FEEDBACK</div>
              <div className="flex justify-between items-baseline mt-auto">
                <span className="text-sm font-mono text-emerald-400 font-bold">
                  {isBitTrue(dialect === 'delta' ? 'Y0' : 'Q0.0') ? '1,450.2' : '0.0'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">RPM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Visual Ladder Mini-Map Navigator */}
      <PlcLadderMiniMap
        program={program}
        memory={memory}
        selectedRungId={selectedRungId}
        onSelectRung={(id) => setSelectedRungId(id)}
        scrollContainerRef={ladderContainerRef}
        rungRefs={rungRefs}
        dialect={dialect}
        isCollapsed={isMiniMapCollapsed}
        onToggleCollapse={() => setIsMiniMapCollapsed(!isMiniMapCollapsed)}
      />
    </div>
  );
};
