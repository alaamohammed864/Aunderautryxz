import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HmiScreen,
  HmiWidget,
  HmiWidgetType,
  PlcMemoryState,
  SimulationMode,
} from '../../types';
import {
  Monitor,
  Play,
  Edit3,
  Plus,
  Trash2,
  Sliders,
  Radio,
  Gauge,
  Layers,
  Sparkles,
  ToggleLeft,
  Settings,
} from 'lucide-react';

interface HmiDesignerProps {
  hmiScreen: HmiScreen;
  setHmiScreen: (screen: HmiScreen) => void;
  memory: PlcMemoryState;
  onSetBit: (address: string, val: boolean) => void;
  onSetNumeric: (address: string, val: number) => void;
  simulationMode: SimulationMode;
}

export const HmiDesigner: React.FC<HmiDesignerProps> = ({
  hmiScreen,
  setHmiScreen,
  memory,
  onSetBit,
  onSetNumeric,
  simulationMode,
}) => {
  const [isDesignMode, setIsDesignMode] = useState<boolean>(false);
  const [selectedWidget, setSelectedWidget] = useState<HmiWidget | null>(null);

  const getTagBit = (addr?: string): boolean => {
    if (!addr) return false;
    const clean = addr.trim().toUpperCase();
    if (clean.startsWith('I') || clean.startsWith('X')) return Boolean(memory.inputs[clean]);
    if (clean.startsWith('Q') || clean.startsWith('Y')) return Boolean(memory.outputs[clean]);
    if (clean.startsWith('M')) return Boolean(memory.memory[clean]);
    return Boolean(memory.memory[clean]);
  };

  const getTagNumeric = (addr?: string): number => {
    if (!addr) return 0;
    const clean = addr.trim().toUpperCase();
    return memory.dataRegisters[clean] || 0;
  };

  const handleWidgetPress = (widget: HmiWidget) => {
    if (isDesignMode) {
      setSelectedWidget(widget);
      return;
    }

    if (widget.type === 'PUSH_BUTTON' && widget.bindingTag) {
      const current = getTagBit(widget.bindingTag);
      onSetBit(widget.bindingTag, !current);
    }
  };

  const addWidget = (type: HmiWidgetType) => {
    const newWidget: HmiWidget = {
      id: 'wgt_' + Math.random().toString(36).substring(2, 9),
      type,
      label: type === 'PUSH_BUTTON' ? 'START PUMP' : type === 'PILOT_LAMP' ? 'RUN STATUS' : 'PROCESS VALUE',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 150,
      width: type === 'TANK_LEVEL' ? 80 : 130,
      height: type === 'TANK_LEVEL' ? 180 : 70,
      bindingTag: type === 'PUSH_BUTTON' ? 'I0.0' : type === 'PILOT_LAMP' ? 'Q0.0' : 'IW64',
      minValue: 0,
      maxValue: 100,
      color: '#38bdf8',
    };

    setHmiScreen({
      ...hmiScreen,
      widgets: [...hmiScreen.widgets, newWidget],
    });
    setSelectedWidget(newWidget);
  };

  const deleteWidget = (id: string) => {
    setHmiScreen({
      ...hmiScreen,
      widgets: hmiScreen.widgets.filter((w) => w.id !== id),
    });
    if (selectedWidget?.id === id) setSelectedWidget(null);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Left Sidebar: Widget Palette & Properties */}
      <div className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-950 border border-purple-700/60 flex items-center justify-center text-purple-400">
              <Monitor className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs uppercase tracking-wider text-purple-300">
              HMI Touchscreen
            </span>
          </div>

          <button
            onClick={() => setIsDesignMode(!isDesignMode)}
            className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              isDesignMode
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isDesignMode ? 'DESIGN MODE' : 'RUN MODE'}
          </button>
        </div>

        {/* Widget Toolbox (Visible in Design Mode) */}
        {isDesignMode ? (
          <div className="space-y-3 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Add HMI Elements
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => addWidget('PUSH_BUTTON')}
                className="flex flex-col items-center justify-center p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-purple-300 cursor-pointer"
              >
                <Radio className="w-4 h-4 mb-1" />
                <span>Push Button</span>
              </button>
              <button
                onClick={() => addWidget('PILOT_LAMP')}
                className="flex flex-col items-center justify-center p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-purple-300 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mb-1" />
                <span>Pilot Lamp</span>
              </button>
              <button
                onClick={() => addWidget('RADIAL_GAUGE')}
                className="flex flex-col items-center justify-center p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-purple-300 cursor-pointer"
              >
                <Gauge className="w-4 h-4 mb-1" />
                <span>Radial Gauge</span>
              </button>
              <button
                onClick={() => addWidget('TANK_LEVEL')}
                className="flex flex-col items-center justify-center p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-purple-300 cursor-pointer"
              >
                <Layers className="w-4 h-4 mb-1" />
                <span>Tank Level</span>
              </button>
              <button
                onClick={() => addWidget('SLIDER')}
                className="flex flex-col items-center justify-center p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-purple-300 cursor-pointer col-span-2"
              >
                <Sliders className="w-4 h-4 mb-1" />
                <span>Setpoint Slider</span>
              </button>
            </div>

            {/* Selected Widget Property Inspector */}
            {selectedWidget && (
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-purple-400 uppercase">Widget Properties</span>
                  <button
                    onClick={() => deleteWidget(selectedWidget.id)}
                    className="p-1 rounded text-rose-400 hover:bg-rose-950 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Label Title</label>
                  <input
                    type="text"
                    value={selectedWidget.label}
                    onChange={(e) => {
                      const updated = hmiScreen.widgets.map((w) =>
                        w.id === selectedWidget.id ? { ...w, label: e.target.value } : w
                      );
                      setHmiScreen({ ...hmiScreen, widgets: updated });
                      setSelectedWidget({ ...selectedWidget, label: e.target.value });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">PLC Tag Address Binding</label>
                  <input
                    type="text"
                    value={selectedWidget.bindingTag || ''}
                    onChange={(e) => {
                      const updated = hmiScreen.widgets.map((w) =>
                        w.id === selectedWidget.id ? { ...w, bindingTag: e.target.value.toUpperCase() } : w
                      );
                      setHmiScreen({ ...hmiScreen, widgets: updated });
                      setSelectedWidget({ ...selectedWidget, bindingTag: e.target.value.toUpperCase() });
                    }}
                    placeholder="e.g. I0.0, Q0.0, IW64"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-300 outline-none uppercase"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-xs text-slate-400">
            <p className="leading-relaxed">
              Touchscreen is in <strong className="text-emerald-400">LIVE OPERATOR RUN MODE</strong>.
            </p>
            <p className="leading-relaxed">
              Press buttons and adjust sliders to send real-time signals to the PLC ladder logic scan cycle.
            </p>
          </div>
        )}
      </div>

      {/* Center HMI Touchscreen Bezel & Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-950 overflow-auto">
        {/* Realistic Industrial Touchscreen Bezel */}
        <div className="w-full max-w-4xl bg-slate-900 border-4 border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl relative min-h-[460px]">
          {/* Industrial Brand Bezel Badge */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs font-['Rajdhani'] tracking-widest text-slate-400 uppercase">
                TWINLAB COMFORT PANEL 1200
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            </div>
            <span className="text-[11px] font-mono text-cyan-400">
              Screen: {hmiScreen.name}
            </span>
          </div>

          {/* Interactive Screen Surface */}
          <div className="relative w-full h-[360px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden p-4">
            {hmiScreen.widgets.map((widget) => {
              const isSelected = selectedWidget?.id === widget.id && isDesignMode;
              const isBitActive = getTagBit(widget.bindingTag);
              const numVal = getTagNumeric(widget.bindingTag);

              return (
                <motion.div
                  key={widget.id}
                  onClick={() => handleWidgetPress(widget)}
                  whileHover={{ scale: isDesignMode ? 1.02 : 1.01 }}
                  whileTap={{ scale: isDesignMode ? 0.98 : 0.96 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    borderColor: isSelected
                      ? '#a855f7'
                      : isBitActive && (widget.type === 'PUSH_BUTTON' || widget.type === 'PILOT_LAMP')
                      ? '#10b981'
                      : '#334155',
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    left: `${widget.x}px`,
                    top: `${widget.y}px`,
                    width: `${widget.width}px`,
                    height: `${widget.height}px`,
                  }}
                  className={`absolute rounded-xl border p-2 flex flex-col items-center justify-center select-none ${
                    isDesignMode ? 'cursor-move' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'ring-2 ring-purple-400/40 bg-purple-950/20'
                      : 'bg-slate-900/90'
                  }`}
                >
                  {/* Push Button Widget */}
                  {widget.type === 'PUSH_BUTTON' && (
                    <div className="flex flex-col items-center justify-center w-full h-full relative">
                      {/* Subtle Expanding Ripple on Active State */}
                      <AnimatePresence>
                        {isBitActive && (
                          <motion.div
                            key="ripple"
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={{ scale: 1.35, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
                            className="absolute w-12 h-12 rounded-full border-2 border-emerald-400 pointer-events-none"
                          />
                        )}
                      </AnimatePresence>

                      <motion.div
                        animate={{
                          scale: isBitActive ? 0.94 : 1,
                          y: isBitActive ? 1.5 : 0,
                          backgroundColor: isBitActive ? '#10b981' : '#334155',
                          boxShadow: isBitActive
                            ? '0 0 18px rgba(16,185,129,0.7), inset 0 2px 4px rgba(0,0,0,0.3)'
                            : '0 4px 6px -1px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.15)',
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs relative overflow-hidden"
                      >
                        <motion.span
                          key={isBitActive ? 'ON' : 'OFF'}
                          initial={{ opacity: 0, y: isBitActive ? 4 : -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className={`font-mono ${isBitActive ? 'text-slate-950 font-extrabold' : 'text-slate-200'}`}
                        >
                          {isBitActive ? 'ON' : 'OFF'}
                        </motion.span>
                      </motion.div>
                      <span className="text-[10px] font-bold text-slate-300 mt-1 truncate max-w-full">
                        {widget.label}
                      </span>
                      <span className="text-[8px] font-mono text-cyan-400">{widget.bindingTag}</span>
                    </div>
                  )}

                  {/* Pilot Lamp Widget */}
                  {widget.type === 'PILOT_LAMP' && (
                    <div className="flex flex-col items-center justify-center w-full h-full relative">
                      <motion.div
                        animate={{
                          scale: isBitActive ? [1, 1.06, 1] : 1,
                          backgroundColor: isBitActive ? '#10b981' : '#0f172a',
                          borderColor: isBitActive ? '#6ee7b7' : '#334155',
                          boxShadow: isBitActive
                            ? [
                                '0 0 14px rgba(16,185,129,0.6), inset 0 0 8px rgba(255,255,255,0.7)',
                                '0 0 26px rgba(16,185,129,0.9), inset 0 0 12px rgba(255,255,255,0.9)',
                                '0 0 14px rgba(16,185,129,0.6), inset 0 0 8px rgba(255,255,255,0.7)',
                              ]
                            : '0 2px 4px rgba(0,0,0,0.5)',
                        }}
                        transition={{
                          scale: { duration: 2, repeat: isBitActive ? Infinity : 0, ease: 'easeInOut' },
                          boxShadow: { duration: 2, repeat: isBitActive ? Infinity : 0, ease: 'easeInOut' },
                          duration: 0.25,
                        }}
                        className="relative w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden"
                      >
                        {/* Light filament sheen / refraction */}
                        {isBitActive && (
                          <motion.div
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none"
                          />
                        )}
                        <motion.div
                          animate={{ scale: isBitActive ? [1, 1.15, 1] : 1 }}
                          transition={{ duration: 2, repeat: isBitActive ? Infinity : 0 }}
                        >
                          <Sparkles
                            className={`w-4 h-4 transition-colors ${
                              isBitActive ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]' : 'text-slate-700'
                            }`}
                          />
                        </motion.div>
                      </motion.div>
                      <span className="text-[10px] font-bold text-slate-300 mt-1 truncate max-w-full">
                        {widget.label}
                      </span>
                      <motion.span
                        animate={{ color: isBitActive ? '#34d399' : '#94a3b8' }}
                        className="text-[8px] font-mono font-semibold"
                      >
                        {isBitActive ? 'ENERGIZED' : 'IDLE'}
                      </motion.span>
                    </div>
                  )}

                  {/* Radial Gauge Widget */}
                  {widget.type === 'RADIAL_GAUGE' && (
                    <div className="flex flex-col items-center justify-center w-full h-full text-center">
                      <motion.div
                        animate={{ rotate: ((numVal - (widget.minValue || 0)) / ((widget.maxValue || 100) - (widget.minValue || 0))) * 180 - 90 }}
                        transition={{ type: 'spring', stiffness: 70, damping: 15 }}
                        className="mb-0.5 origin-center"
                      >
                        <Gauge className="w-6 h-6 text-cyan-400" />
                      </motion.div>
                      <motion.span
                        key={numVal}
                        initial={{ scale: 1.1, color: '#38bdf8' }}
                        animate={{ scale: 1, color: '#67e8f9' }}
                        transition={{ duration: 0.2 }}
                        className="text-base font-bold font-mono"
                      >
                        {numVal}
                      </motion.span>
                      <span className="text-[10px] text-slate-400 truncate">{widget.label}</span>
                    </div>
                  )}

                  {/* Tank Level Widget */}
                  {widget.type === 'TANK_LEVEL' && (
                    <div className="flex flex-col items-center justify-between w-full h-full p-1">
                      <motion.span
                        key={numVal}
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 1 }}
                        className="text-[9px] font-bold text-cyan-300 font-mono"
                      >
                        {numVal}%
                      </motion.span>
                      <div className="w-8 h-24 bg-slate-950 border border-slate-700 rounded overflow-hidden relative shadow-inner">
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400"
                          initial={false}
                          animate={{ height: `${Math.min(100, Math.max(0, numVal))}%` }}
                          transition={{ type: 'spring', stiffness: 70, damping: 15 }}
                        >
                          {/* Surface meniscus shine line */}
                          <motion.div
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-full h-1 bg-cyan-200 shadow-[0_0_6px_#38bdf8]"
                          />
                        </motion.div>
                      </div>
                      <span className="text-[8px] text-slate-400 truncate">{widget.label}</span>
                    </div>
                  )}

                  {/* Setpoint Slider */}
                  {widget.type === 'SLIDER' && (
                    <div className="flex flex-col items-center justify-center w-full h-full px-2">
                      <div className="flex justify-between w-full text-[10px] mb-1">
                        <span className="text-slate-300 font-bold truncate">{widget.label}</span>
                        <motion.span
                          key={numVal}
                          initial={{ scale: 1.15, color: '#38bdf8' }}
                          animate={{ scale: 1, color: '#22d3ee' }}
                          transition={{ duration: 0.15 }}
                          className="font-mono font-bold"
                        >
                          {numVal}
                        </motion.span>
                      </div>
                      <input
                        type="range"
                        min={widget.minValue || 0}
                        max={widget.maxValue || 100}
                        value={numVal}
                        onChange={(e) => {
                          if (widget.bindingTag) onSetNumeric(widget.bindingTag, Number(e.target.value));
                        }}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
