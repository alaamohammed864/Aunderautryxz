import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LadderElement,
  LadderRung,
  PlcDialect,
  PlcMemoryState,
  PlcProgram,
} from '../../types';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Compass,
  CornerDownRight,
  Eye,
  Filter,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Search,
  Sliders,
  Zap,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface PlcLadderMiniMapProps {
  program: PlcProgram;
  memory: PlcMemoryState;
  selectedRungId: string | null;
  onSelectRung: (rungId: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  rungRefs: React.MutableRefObject<{ [id: string]: HTMLDivElement | null }>;
  dialect: PlcDialect;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type MiniMapDensity = 'schematic' | 'compact';

export const PlcLadderMiniMap: React.FC<PlcLadderMiniMapProps> = ({
  program,
  memory,
  selectedRungId,
  onSelectRung,
  scrollContainerRef,
  rungRefs,
  dialect,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [density, setDensity] = useState<MiniMapDensity>('schematic');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [filterOnlyEnergized, setFilterOnlyEnergized] = useState<boolean>(false);
  const [filterOnlyErrors, setFilterOnlyErrors] = useState<boolean>(false);

  // Viewport tracking state (for visible scroll window indicator)
  const [visibleRungRange, setVisibleRungRange] = useState<{ startIdx: number; endIdx: number }>({
    startIdx: 0,
    endIdx: Math.min(program.rungs.length - 1, 3),
  });

  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniRungRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const isBitTrue = (addr: string): boolean => {
    const clean = addr.trim().toUpperCase();
    if (memory.forcedBits && memory.forcedBits[clean] !== undefined) {
      return Boolean(memory.forcedBits[clean]);
    }
    if (clean.startsWith('I') || clean.startsWith('X')) return Boolean(memory.inputs[clean]);
    if (clean.startsWith('Q') || clean.startsWith('Y')) return Boolean(memory.outputs[clean]);
    if (clean.startsWith('M')) return Boolean(memory.memory[clean]);
    if (clean.startsWith('T')) return Boolean(memory.timers[clean]?.q);
    if (clean.startsWith('C')) return Boolean(memory.counters[clean]?.q);
    return Boolean(memory.memory[clean]);
  };

  // Track scroll position of main ladder editor to calculate active viewport range
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      let firstVisible = -1;
      let lastVisible = -1;

      program.rungs.forEach((rung, idx) => {
        const el = rungRefs.current[rung.id];
        if (!el) return;

        const elTop = el.offsetTop - container.offsetTop;
        const elBottom = elTop + el.offsetHeight;

        // Check intersection with visible container window
        if (elBottom >= scrollTop && elTop <= scrollTop + containerHeight) {
          if (firstVisible === -1) firstVisible = idx;
          lastVisible = idx;
        }
      });

      if (firstVisible !== -1 && lastVisible !== -1) {
        setVisibleRungRange({ startIdx: firstVisible, endIdx: lastVisible });
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef, rungRefs, program.rungs]);

  // Filtered rungs calculation
  const filteredRungs = useMemo(() => {
    return program.rungs.filter((rung) => {
      if (filterOnlyEnergized && !rung.isEnergized) return false;
      if (filterOnlyErrors && !rung.hasError) return false;

      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase().trim();
        const numMatch = `rung ${rung.rungNumber}`.includes(q) || `network ${rung.rungNumber}`.includes(q) || `${rung.rungNumber}` === q;
        const commentMatch = (rung.comment || '').toLowerCase().includes(q);

        // Search within elements
        const elemMatch = rung.mainBranch.some(
          (e) =>
            e.address.toLowerCase().includes(q) ||
            (e.symbol || '').toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q)
        );

        const subElemMatch = (rung.subBranches || []).some((b) =>
          b.elements.some(
            (e) =>
              e.address.toLowerCase().includes(q) ||
              (e.symbol || '').toLowerCase().includes(q) ||
              e.type.toLowerCase().includes(q)
          )
        );

        return numMatch || commentMatch || elemMatch || subElemMatch;
      }

      return true;
    });
  }, [program.rungs, filterQuery, filterOnlyEnergized, filterOnlyErrors]);

  // Overall stats
  const totalEnergized = useMemo(() => program.rungs.filter((r) => r.isEnergized).length, [program.rungs]);
  const totalErrors = useMemo(() => program.rungs.filter((r) => r.hasError).length, [program.rungs]);

  // Jump to specific rung
  const handleJumpToRung = (rungId: string) => {
    onSelectRung(rungId);
    const targetElement = rungRefs.current[rungId];
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handleJumpToTop = () => {
    if (program.rungs.length > 0) {
      handleJumpToRung(program.rungs[0].id);
    }
  };

  const handleJumpToBottom = () => {
    if (program.rungs.length > 0) {
      handleJumpToRung(program.rungs[program.rungs.length - 1].id);
    }
  };

  const handleJumpToNextEnergized = () => {
    const energized = program.rungs.filter((r) => r.isEnergized);
    if (energized.length === 0) return;

    const currentIndex = energized.findIndex((r) => r.id === selectedRungId);
    const nextRung = energized[(currentIndex + 1) % energized.length];
    if (nextRung) {
      handleJumpToRung(nextRung.id);
    }
  };

  // Render a mini element icon/shape inside schematic mode
  const renderMiniElement = (elem: LadderElement) => {
    const isHigh = isBitTrue(elem.address);

    switch (elem.type) {
      case 'NO_CONTACT':
        return (
          <div
            key={elem.id}
            title={`NO Contact: ${elem.address} (${elem.symbol || 'TAG'}) = ${isHigh ? '1' : '0'}`}
            className={`flex items-center justify-center px-1 py-0.5 rounded border text-[8px] font-mono shrink-0 transition-colors ${
              isHigh
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-[0_0_4px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span className="text-[7px] text-slate-500 mr-0.5">| |</span>
            <span className="truncate max-w-[36px]">{elem.address}</span>
          </div>
        );

      case 'NC_CONTACT':
        return (
          <div
            key={elem.id}
            title={`NC Contact: ${elem.address} (${elem.symbol || 'TAG'}) = ${isHigh ? '1' : '0'}`}
            className={`flex items-center justify-center px-1 py-0.5 rounded border text-[8px] font-mono shrink-0 transition-colors ${
              isHigh
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-[0_0_4px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span className="text-[7px] text-slate-500 mr-0.5">|/|</span>
            <span className="truncate max-w-[36px]">{elem.address}</span>
          </div>
        );

      case 'COIL':
      case 'SET_COIL':
      case 'RESET_COIL': {
        const isSet = elem.type === 'SET_COIL';
        const isRst = elem.type === 'RESET_COIL';
        const labelPrefix = isSet ? '(S)' : isRst ? '(R)' : '( )';

        return (
          <div
            key={elem.id}
            title={`${elem.type}: ${elem.address} (${elem.symbol || 'OUTPUT'}) = ${isHigh ? '1' : '0'}`}
            className={`flex items-center justify-center px-1 py-0.5 rounded border text-[8px] font-mono shrink-0 transition-colors ${
              isHigh
                ? 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_6px_rgba(16,185,129,0.5)] font-bold'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span className="text-[7px] text-emerald-400 mr-0.5">{labelPrefix}</span>
            <span className="truncate max-w-[36px]">{elem.address}</span>
          </div>
        );
      }

      case 'TON':
      case 'TOF':
      case 'TP':
        return (
          <div
            key={elem.id}
            title={`Timer ${elem.type}: ${elem.address} (${elem.presetTime}ms)`}
            className={`flex items-center justify-center px-1 py-0.5 rounded border text-[8px] font-mono shrink-0 ${
              isHigh
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_4px_rgba(245,158,11,0.4)]'
                : 'bg-slate-900 border-amber-900/60 text-amber-400/80'
            }`}
          >
            <span className="text-[7px] font-bold mr-0.5">[{elem.type}]</span>
            <span className="truncate max-w-[28px]">{elem.address}</span>
          </div>
        );

      case 'CTU':
      case 'CTD':
        return (
          <div
            key={elem.id}
            title={`Counter ${elem.type}: ${elem.address}`}
            className="flex items-center justify-center px-1 py-0.5 rounded border text-[8px] font-mono shrink-0 bg-slate-900 border-purple-900/60 text-purple-400"
          >
            <span className="text-[7px] font-bold mr-0.5">[{elem.type}]</span>
            <span className="truncate max-w-[28px]">{elem.address}</span>
          </div>
        );

      default:
        return (
          <div
            key={elem.id}
            title={`${elem.type}: ${elem.address || ''}`}
            className="flex items-center justify-center px-1 py-0.5 rounded border text-[8px] font-mono shrink-0 bg-slate-900 border-slate-700 text-cyan-400"
          >
            <span className="truncate max-w-[38px]">{elem.type.replace('MATH_', '')}</span>
          </div>
        );
    }
  };

  // Collapsed slim sidebar preview
  if (isCollapsed) {
    return (
      <div className="w-10 bg-slate-950 border-l border-slate-800 flex flex-col items-center py-3 select-none shrink-0 z-10 transition-all duration-200">
        <button
          onClick={onToggleCollapse}
          title="Expand Ladder Mini-Map (Visual Structure Navigation)"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-colors cursor-pointer mb-3 group"
        >
          <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform" />
        </button>

        <div className="w-5 h-px bg-slate-800 my-1" />

        {/* Mini heat-strip ladder in collapsed state */}
        <div className="flex-1 w-full flex flex-col items-center gap-1.5 overflow-y-auto px-1 py-2 custom-scrollbar">
          {program.rungs.map((rung, idx) => {
            const isSelected = selectedRungId === rung.id;
            const isVisible = idx >= visibleRungRange.startIdx && idx <= visibleRungRange.endIdx;

            return (
              <button
                key={rung.id}
                onClick={() => handleJumpToRung(rung.id)}
                title={`Jump to Network #${rung.rungNumber}: ${rung.comment || 'Logic Rung'} (${rung.isEnergized ? 'Energized' : 'Idle'})`}
                className={`w-5 h-7 rounded-sm flex flex-col items-center justify-center text-[8px] font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-blue-500 bg-blue-600 text-white shadow-md'
                    : isVisible
                    ? 'bg-slate-800 text-slate-300 border border-slate-600'
                    : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300 border border-slate-800'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mb-0.5 ${
                    rung.hasError
                      ? 'bg-rose-500 animate-pulse'
                      : rung.isEnergized
                      ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]'
                      : 'bg-slate-600'
                  }`}
                />
                <span>{rung.rungNumber}</span>
              </button>
            );
          })}
        </div>

        <div className="w-5 h-px bg-slate-800 my-1" />

        <div className="text-[9px] font-mono font-bold text-slate-500 flex flex-col items-center">
          <span className="text-emerald-400">{totalEnergized}</span>
          <span>/{program.rungs.length}</span>
        </div>
      </div>
    );
  }

  // Expanded Mini-Map Panel
  return (
    <div
      className="w-72 sm:w-80 bg-slate-950 border-l border-slate-800 flex flex-col select-none shrink-0 z-10 shadow-2xl transition-all duration-200"
      ref={miniMapContainerRef}
    >
      {/* Header & Quick Navigation Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
                <span>LADDER MINI-MAP</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                  {program.rungs.length} Net
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Density switch */}
            <button
              onClick={() => setDensity(density === 'schematic' ? 'compact' : 'schematic')}
              title={density === 'schematic' ? 'Switch to Compact Bar View' : 'Switch to Schematic Preview'}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-mono transition-colors cursor-pointer"
            >
              {density === 'schematic' ? <Layers className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-blue-400" />}
            </button>

            {/* Collapse */}
            <button
              onClick={onToggleCollapse}
              title="Collapse Mini-Map"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Filter / Search Input */}
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Filter by Rung #, Tag, or Comment..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-6 py-1 text-[11px] text-white placeholder-slate-500 font-mono outline-none focus:border-cyan-500 transition-colors"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1.5 text-slate-500 hover:text-white text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Quick Filter Tags & Jump Controls */}
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterOnlyEnergized(!filterOnlyEnergized)}
              className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                filterOnlyEnergized
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              <span>{totalEnergized} Live</span>
            </button>

            {totalErrors > 0 && (
              <button
                onClick={() => setFilterOnlyErrors(!filterOnlyErrors)}
                className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                  filterOnlyErrors
                    ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                    : 'bg-slate-950 text-rose-400 border-slate-800 hover:text-rose-300'
                }`}
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>{totalErrors} Err</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleJumpToTop}
              title="Jump to Top Network"
              className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3 h-3" />
            </button>

            <button
              onClick={handleJumpToNextEnergized}
              title="Jump to Next Energized Network"
              className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-emerald-950 text-emerald-400 border border-slate-800 hover:border-emerald-800 transition-colors cursor-pointer flex items-center gap-0.5 font-bold"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>NEXT</span>
            </button>

            <button
              onClick={handleJumpToBottom}
              title="Jump to Bottom Network"
              className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors cursor-pointer"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Mini-Map Rung Track Container */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-slate-950/70 custom-scrollbar relative">
        {filteredRungs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs font-mono text-center p-4">
            <Filter className="w-6 h-6 mb-2 opacity-50 text-cyan-400" />
            <span>No networks match filter criteria</span>
            <button
              onClick={() => {
                setFilterQuery('');
                setFilterOnlyEnergized(false);
                setFilterOnlyErrors(false);
              }}
              className="mt-2 text-cyan-400 hover:underline text-[11px] cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredRungs.map((rung) => {
            const isSelected = selectedRungId === rung.id;
            const originalIndex = program.rungs.findIndex((r) => r.id === rung.id);
            const isVisible =
              originalIndex >= visibleRungRange.startIdx && originalIndex <= visibleRungRange.endIdx;
            const isEnergized = rung.isEnergized;

            return (
              <div
                key={rung.id}
                ref={(el) => {
                  miniRungRefs.current[rung.id] = el;
                }}
                onClick={() => handleJumpToRung(rung.id)}
                className={`group relative rounded-lg border transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500 shadow-md shadow-cyan-950'
                    : isVisible
                    ? 'bg-slate-900/90 border-slate-700 hover:border-slate-500 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Active Viewport Indicator Tag */}
                {isVisible && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                )}

                {/* Rung Header */}
                <div className="px-2 py-1 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        rung.hasError
                          ? 'bg-rose-500 animate-pulse'
                          : isEnergized
                          ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                          : 'bg-slate-600'
                      }`}
                    />
                    <span
                      className={`font-bold shrink-0 ${
                        isSelected ? 'text-cyan-300' : 'text-slate-300'
                      }`}
                    >
                      NW #{rung.rungNumber}
                    </span>
                    <span className="text-slate-400 truncate text-[9px]">
                      {rung.comment || 'Logic Network'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {isEnergized && (
                      <span className="text-[8px] font-bold text-emerald-400 px-1 py-0.2 rounded bg-emerald-950 border border-emerald-800">
                        ON
                      </span>
                    )}
                    {rung.hasError && (
                      <span className="text-[8px] font-bold text-rose-400 px-1 py-0.2 rounded bg-rose-950 border border-rose-800">
                        ERR
                      </span>
                    )}
                  </div>
                </div>

                {/* Rung Body Preview */}
                {density === 'schematic' ? (
                  /* SCHEMATIC MODE: Visual mini circuit schematic with rails */
                  <div className="p-2 relative flex items-center">
                    {/* Left Power Rail */}
                    <div
                      className={`w-1 h-full min-h-[28px] rounded-l transition-colors shrink-0 ${
                        isEnergized
                          ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                          : 'bg-blue-600/50'
                      }`}
                    />

                    {/* Circuit Wire & Elements Flow */}
                    <div className="flex-1 flex flex-col gap-1 px-1.5 overflow-hidden">
                      {/* Main branch line */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                        <div
                          className={`h-0.5 w-2 shrink-0 ${
                            isEnergized ? 'bg-emerald-400' : 'bg-slate-700'
                          }`}
                        />
                        {rung.mainBranch.map((elem) => renderMiniElement(elem))}
                        <div
                          className={`h-0.5 flex-1 min-w-[8px] ${
                            isEnergized ? 'bg-emerald-400' : 'bg-slate-700'
                          }`}
                        />
                      </div>

                      {/* Sub branches (OR branches) preview */}
                      {rung.subBranches && rung.subBranches.length > 0 && (
                        <div className="flex flex-col gap-1 pl-2 border-l border-b border-slate-700/60 rounded-bl pb-0.5">
                          {rung.subBranches.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center gap-1 overflow-x-auto no-scrollbar"
                            >
                              <CornerDownRight className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                              {b.elements.map((elem) => renderMiniElement(elem))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Neutral Rail */}
                    <div
                      className={`w-1 h-full min-h-[28px] rounded-r transition-colors shrink-0 ${
                        isEnergized
                          ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                          : 'bg-slate-700'
                      }`}
                    />
                  </div>
                ) : (
                  /* COMPACT MODE: Condensed bar preview with element counts */
                  <div className="px-2.5 py-1.5 flex items-center justify-between text-[9px] font-mono">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>{rung.mainBranch.length} elements</span>
                      {rung.subBranches && rung.subBranches.length > 0 && (
                        <span className="text-cyan-400">+{rung.subBranches.length} branch</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {rung.mainBranch.slice(0, 3).map((elem) => (
                        <span
                          key={elem.id}
                          className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                            isBitTrue(elem.address)
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {elem.address}
                        </span>
                      ))}
                      {rung.mainBranch.length > 3 && (
                        <span className="text-slate-600 text-[8px]">
                          +{rung.mainBranch.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Mini-Map Summary Footer */}
      <div className="p-2 border-t border-slate-800 bg-slate-900/90 text-[10px] font-mono text-slate-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>
            Visible: NW #{visibleRungRange.startIdx + 1} - #{visibleRungRange.endIdx + 1}
          </span>
        </div>
        <div className="text-slate-500 text-[9px]">Click to jump</div>
      </div>
    </div>
  );
};
