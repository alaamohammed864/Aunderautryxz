import React, { useState } from 'react';
import {
  CircuitSimulationState,
  ElectricalComponent,
  ElectricalComponentType,
  ElectricalPin,
  ElectricalWire,
  SimulationMode,
} from '../../types';
import {
  Zap,
  Plus,
  Trash2,
  Play,
  RotateCw,
  AlertTriangle,
  Radio,
  Power,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ElectricalSimulatorProps {
  circuitState: CircuitSimulationState;
  setCircuitState: (state: CircuitSimulationState) => void;
  simulationMode: SimulationMode;
  onComponentStateChange?: (compId: string, newState: any) => void;
}

export const ElectricalSimulator: React.FC<ElectricalSimulatorProps> = ({
  circuitState,
  setCircuitState,
  simulationMode,
  onComponentStateChange,
}) => {
  const [selectedPin, setSelectedPin] = useState<{ compId: string; pinId: string } | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [meterMode, setMeterMode] = useState<boolean>(false);
  const [meterPinA, setMeterPinA] = useState<{ compId: string; pinId: string; voltage: number } | null>(null);
  const [meterReading, setMeterReading] = useState<string | null>(null);

  const toggleComponentAction = (comp: ElectricalComponent) => {
    const updated = { ...comp };

    if (comp.type === 'CIRCUIT_BREAKER_1P' || comp.type === 'CIRCUIT_BREAKER_3P') {
      updated.state = {
        ...updated.state,
        closed: !updated.state.closed,
        tripped: false,
      };
    } else if (comp.type === 'PUSH_BUTTON_NO' || comp.type === 'PUSH_BUTTON_NC') {
      // Toggle momentary button press
      updated.state = {
        ...updated.state,
        closed: !updated.state.closed,
      };
    } else if (comp.type === 'EMERGENCY_STOP') {
      updated.state = {
        ...updated.state,
        closed: !updated.state.closed,
      };
    } else if (comp.type === 'OVERLOAD_RELAY') {
      updated.state = {
        ...updated.state,
        tripped: !updated.state.tripped,
      };
    }

    const newComponents = circuitState.components.map((c) =>
      c.id === comp.id ? updated : c
    );
    setCircuitState({ ...circuitState, components: newComponents });
    if (onComponentStateChange) onComponentStateChange(comp.id, updated.state);
  };

  const handlePinClick = (compId: string, pin: ElectricalPin) => {
    if (meterMode) {
      if (!meterPinA) {
        setMeterPinA({ compId, pinId: pin.id, voltage: pin.voltage || 0 });
        setMeterReading('Probe A placed. Click second terminal for voltage drop...');
      } else {
        const vA = meterPinA.voltage;
        const vB = pin.voltage || 0;
        const diff = Math.abs(vA - vB);
        setMeterReading(`Potential Difference: ${diff} V ${diff > 50 ? 'AC' : 'DC'}`);
        setMeterPinA(null);
      }
      return;
    }

    // Wiring Mode
    if (!selectedPin) {
      setSelectedPin({ compId, pinId: pin.id });
    } else {
      if (selectedPin.compId === compId && selectedPin.pinId === pin.id) {
        setSelectedPin(null);
        return;
      }
      // Create new wire
      const newWire: ElectricalWire = {
        id: 'w_' + Math.random().toString(36).substring(2, 9),
        fromCompId: selectedPin.compId,
        fromPinId: selectedPin.pinId,
        toCompId: compId,
        toPinId: pin.id,
        color: '#38bdf8',
        isEnergized: false,
      };
      setCircuitState({
        ...circuitState,
        wires: [...circuitState.wires, newWire],
      });
      setSelectedPin(null);
    }
  };

  const addComponent = (type: ElectricalComponentType) => {
    let name = 'Component';
    let label = 'C1';
    let pins: ElectricalPin[] = [];

    const defaultX = 280 + Math.random() * 80;
    const defaultY = 150 + Math.random() * 80;

    switch (type) {
      case 'CIRCUIT_BREAKER_3P':
        name = '3-Pole Circuit Breaker';
        label = 'Q2 (25A)';
        pins = [
          { id: 'L1', name: '1', type: 'POWER', x: 10, y: 0 },
          { id: 'T1', name: '2', type: 'POWER', x: 10, y: 40 },
          { id: 'L2', name: '3', type: 'POWER', x: 25, y: 0 },
          { id: 'T2', name: '4', type: 'POWER', x: 25, y: 40 },
          { id: 'L3', name: '5', type: 'POWER', x: 40, y: 0 },
          { id: 'T3', name: '6', type: 'POWER', x: 40, y: 40 },
        ];
        break;
      case 'CONTACTOR_3P':
        name = 'Contactor 3-Pole';
        label = 'KM2';
        pins = [
          { id: 'L1', name: '1', type: 'POWER', x: 10, y: 0 },
          { id: 'T1', name: '2', type: 'POWER', x: 10, y: 50 },
          { id: 'L2', name: '3', type: 'POWER', x: 25, y: 0 },
          { id: 'T2', name: '4', type: 'POWER', x: 25, y: 50 },
          { id: 'L3', name: '5', type: 'POWER', x: 40, y: 0 },
          { id: 'T3', name: '6', type: 'POWER', x: 40, y: 50 },
          { id: 'A1', name: 'A1', type: 'CONTROL', x: 60, y: 15 },
          { id: 'A2', name: 'A2', type: 'CONTROL', x: 60, y: 35 },
          { id: '13', name: '13', type: 'CONTROL', x: 75, y: 10 },
          { id: '14', name: '14', type: 'CONTROL', x: 75, y: 40 },
        ];
        break;
      case 'PUSH_BUTTON_NO':
        name = 'Push Button NO (Green)';
        label = 'START S2';
        pins = [
          { id: '3', name: '3', type: 'CONTROL', x: 15, y: 0 },
          { id: '4', name: '4', type: 'CONTROL', x: 15, y: 40 },
        ];
        break;
      case 'PILOT_LAMP_GREEN':
        name = 'Indicator Lamp (Green)';
        label = 'H2 (Run)';
        pins = [
          { id: 'X1', name: 'X1', type: 'CONTROL', x: 15, y: 0 },
          { id: 'X2', name: 'X2', type: 'CONTROL', x: 15, y: 35 },
        ];
        break;
      case 'MOTOR_3PHASE':
        name = '3-Phase Induction Motor';
        label = 'M2 (2.2kW)';
        pins = [
          { id: 'U1', name: 'U1', type: 'POWER', x: 10, y: 0 },
          { id: 'V1', name: 'V1', type: 'POWER', x: 25, y: 0 },
          { id: 'W1', name: 'W1', type: 'POWER', x: 40, y: 0 },
          { id: 'PE', name: 'PE', type: 'GROUND', x: 55, y: 0 },
        ];
        break;
      default:
        pins = [
          { id: '1', name: '1', type: 'CONTROL', x: 10, y: 0 },
          { id: '2', name: '2', type: 'CONTROL', x: 10, y: 40 },
        ];
    }

    const newComp: ElectricalComponent = {
      id: 'comp_' + Math.random().toString(36).substring(2, 9),
      type,
      name,
      label,
      x: defaultX,
      y: defaultY,
      pins,
      state: { closed: false, energized: false, tripped: false, speedRpm: 0 },
    };

    setCircuitState({
      ...circuitState,
      components: [...circuitState.components, newComp],
    });
    setSelectedComponentId(newComp.id);
  };

  const deleteComponent = (id: string) => {
    setCircuitState({
      ...circuitState,
      components: circuitState.components.filter((c) => c.id !== id),
      wires: circuitState.wires.filter((w) => w.fromCompId !== id && w.toCompId !== id),
    });
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  const clearWires = () => {
    setCircuitState({ ...circuitState, wires: [] });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Left Components Palette */}
      <div className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
            Electrical Library
          </span>
        </div>

        {/* Component Categories */}
        <div className="space-y-3 text-xs">
          {/* Power & Protection */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Power & Switching
            </span>
            <div className="grid grid-cols-1 gap-1">
              <button
                onClick={() => addComponent('CIRCUIT_BREAKER_3P')}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <span>3P Circuit Breaker</span>
                <span className="text-[10px] font-mono text-cyan-400">MCB 3P</span>
              </button>
              <button
                onClick={() => addComponent('CONTACTOR_3P')}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <span>Contactor + Aux NO</span>
                <span className="text-[10px] font-mono text-amber-400">KM (A1-A2)</span>
              </button>
              <button
                onClick={() => addComponent('MOTOR_3PHASE')}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <span>3-Phase AC Motor</span>
                <span className="text-[10px] font-mono text-emerald-400">M (U-V-W)</span>
              </button>
            </div>
          </div>

          {/* Controls & Sensors */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Push Buttons & Lamps
            </span>
            <div className="grid grid-cols-1 gap-1">
              <button
                onClick={() => addComponent('PUSH_BUTTON_NO')}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <span>Start Button (NO)</span>
                <span className="text-[10px] text-emerald-400">Term 3-4</span>
              </button>
              <button
                onClick={() => addComponent('PILOT_LAMP_GREEN')}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <span>Pilot Lamp (Green)</span>
                <span className="text-[10px] text-emerald-400">X1-X2</span>
              </button>
            </div>
          </div>
        </div>

        {/* Multimeter Mode Tool */}
        <div className="mt-auto pt-3 border-t border-slate-800">
          <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-amber-300 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                Digital Multimeter
              </span>
              <button
                onClick={() => {
                  setMeterMode(!meterMode);
                  setMeterPinA(null);
                  setMeterReading(null);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  meterMode
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-900/50'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {meterMode ? 'PROBES ACTIVE' : 'ENABLE'}
              </button>
            </div>
            <div className="bg-slate-900 rounded p-1.5 border border-slate-800 font-mono text-[11px] text-center text-amber-400 min-h-[30px] flex items-center justify-center">
              {meterReading || (meterMode ? 'Click any 2 terminals to probe voltage' : 'Multimeter Standby')}
            </div>
          </div>

          <div className="flex gap-1.5 mt-2">
            <button
              onClick={clearWires}
              className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            >
              Clear Wires
            </button>
            {selectedComponentId && (
              <button
                onClick={() => deleteComponent(selectedComponentId)}
                className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schematic / Panel Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
        {/* Top bar info */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white flex items-center gap-1.5 font-['Rajdhani'] text-sm">
              <span>CONTROL CABINET WIRING SCHEMATIC</span>
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400" />
                Live 400V / 24V Current Paths
              </span>
              <span>• Click Pin A then Pin B to connect wire</span>
            </div>
          </div>

          {circuitState.shortCircuitDetected && (
            <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/80 px-2 py-1 rounded border border-rose-800 animate-bounce">
              <AlertTriangle className="w-4 h-4" />
              <span>SHORT CIRCUIT DETECTED! Breaker Tripped</span>
            </div>
          )}
        </div>

        {/* Interactive Electrical Canvas */}
        <div className="flex-1 overflow-auto p-6 relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          {/* Render Wire Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {circuitState.wires.map((wire) => {
              const compFrom = circuitState.components.find((c) => c.id === wire.fromCompId);
              const compTo = circuitState.components.find((c) => c.id === wire.toCompId);
              if (!compFrom || !compTo) return null;

              const pinFrom = compFrom.pins.find((p) => p.id === wire.fromPinId);
              const pinTo = compTo.pins.find((p) => p.id === wire.toPinId);
              if (!pinFrom || !pinTo) return null;

              const x1 = compFrom.x + pinFrom.x;
              const y1 = compFrom.y + pinFrom.y;
              const x2 = compTo.x + pinTo.x;
              const y2 = compTo.y + pinTo.y;

              const isLive = wire.isEnergized && simulationMode === 'RUN';

              return (
                <g key={wire.id}>
                  {/* Outer glow when energized */}
                  {isLive && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#38bdf8"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                      className="animate-pulse"
                    />
                  )}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isLive ? '#38bdf8' : '#64748b'}
                    strokeWidth="2.5"
                    strokeDasharray={isLive ? '6 3' : 'none'}
                    className={isLive ? 'animate-[dash_1s_linear_infinite]' : ''}
                  />
                  {/* Connection terminal dots */}
                  <circle cx={x1} cy={y1} r="3" fill={isLive ? '#38bdf8' : '#94a3b8'} />
                  <circle cx={x2} cy={y2} r="3" fill={isLive ? '#38bdf8' : '#94a3b8'} />
                </g>
              );
            })}
          </svg>

          {/* Render Component Blocks */}
          <div className="relative z-20 min-w-[700px] min-h-[500px]">
            {circuitState.components.map((comp) => {
              const isSelected = selectedComponentId === comp.id;

              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedComponentId(comp.id)}
                  style={{ left: `${comp.x}px`, top: `${comp.y}px` }}
                  className={`absolute rounded-xl border p-2.5 shadow-lg transition-all cursor-move ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-900'
                      : 'border-slate-800 bg-slate-900/95 hover:border-slate-700'
                  }`}
                >
                  {/* Component Title Header */}
                  <div className="flex items-center justify-between gap-3 mb-2 border-b border-slate-800 pb-1">
                    <div>
                      <span className="font-bold text-xs text-white block">{comp.label}</span>
                      <span className="text-[9px] text-slate-400 block">{comp.name}</span>
                    </div>
                    {comp.plcAddress && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        PLC {comp.plcAddress}
                      </span>
                    )}
                  </div>

                  {/* Component Interactive Face */}
                  <div className="flex flex-col items-center justify-center p-2 min-h-[60px] bg-slate-950/70 rounded-lg border border-slate-800/80 mb-2">
                    {/* Breaker Toggle Lever */}
                    {(comp.type === 'CIRCUIT_BREAKER_1P' || comp.type === 'CIRCUIT_BREAKER_3P') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComponentAction(comp);
                        }}
                        className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                          comp.state.closed
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                            : 'bg-rose-700 text-white'
                        }`}
                      >
                        {comp.state.closed ? 'ON (CLOSED)' : 'OFF (TRIPPED)'}
                      </button>
                    )}

                    {/* Push Button Face */}
                    {(comp.type === 'PUSH_BUTTON_NO' || comp.type === 'PUSH_BUTTON_NC') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComponentAction(comp);
                        }}
                        className={`w-12 h-12 rounded-full font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                          comp.type === 'PUSH_BUTTON_NO'
                            ? comp.state.closed
                              ? 'bg-emerald-400 text-slate-950 ring-4 ring-emerald-500/50'
                              : 'bg-emerald-700 text-white hover:bg-emerald-600'
                            : comp.state.closed
                            ? 'bg-rose-400 text-slate-950 ring-4 ring-rose-500/50'
                            : 'bg-rose-700 text-white hover:bg-rose-600'
                        }`}
                      >
                        {comp.state.closed ? 'PRESSED' : 'PRESS'}
                      </button>
                    )}

                    {/* Pilot Lamp Face */}
                    {comp.type.startsWith('PILOT_LAMP') && (
                      <div
                        className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                          comp.state.energized && simulationMode === 'RUN'
                            ? 'bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-500/80 animate-pulse'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      >
                        <Sparkles className={`w-4 h-4 ${comp.state.energized ? 'text-white' : 'text-slate-700'}`} />
                      </div>
                    )}

                    {/* Contactor Coil State */}
                    {comp.type === 'CONTACTOR_3P' && (
                      <div className="text-center space-y-1">
                        <div
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            comp.state.energized && simulationMode === 'RUN'
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          COIL: {comp.state.energized && simulationMode === 'RUN' ? 'PULLED IN' : 'RELEASED'}
                        </div>
                        <span className="text-[9px] text-slate-400">Aux NO: 13-14 (Latched)</span>
                      </div>
                    )}

                    {/* 3-Phase Induction Motor Rotor */}
                    {comp.type === 'MOTOR_3PHASE' && (
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                            (comp.state.speedRpm || 0) > 100 && simulationMode === 'RUN'
                              ? 'border-emerald-400 text-emerald-400 animate-spin shadow-lg shadow-emerald-500/30'
                              : 'border-slate-700 text-slate-600'
                          }`}
                        >
                          <RotateCw className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 mt-1">
                          {Math.round(comp.state.speedRpm || 0)} RPM
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Terminal Connection Pins */}
                  <div className="flex items-center justify-around gap-1 pt-1 border-t border-slate-800/80">
                    {comp.pins.map((pin) => {
                      const isPinSelected =
                        selectedPin?.compId === comp.id && selectedPin?.pinId === pin.id;

                      return (
                        <button
                          key={pin.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinClick(comp.id, pin);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                            isPinSelected
                              ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400 shadow-md'
                              : pin.isEnergized && simulationMode === 'RUN'
                              ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {pin.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
