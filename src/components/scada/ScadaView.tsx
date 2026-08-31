import React, { useState, useEffect } from 'react';
import {
  PlcMemoryState,
  ProcessTrendDataPoint,
  ScadaAlarm,
  SimulationMode,
} from '../../types';
import {
  Activity,
  Sliders,
  AlertTriangle,
  Bell,
  CheckCircle,
  TrendingUp,
  Flame,
  Layers,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface ScadaViewProps {
  memory: PlcMemoryState;
  onSetNumeric: (address: string, val: number) => void;
  simulationMode: SimulationMode;
}

export const ScadaView: React.FC<ScadaViewProps> = ({
  memory,
  onSetNumeric,
  simulationMode,
}) => {
  // PID Controller States
  const [sp, setSp] = useState<number>(65.0);
  const [pv, setPv] = useState<number>(20.0);
  const [cv, setCv] = useState<number>(0.0);
  const [kp, setKp] = useState<number>(2.5);
  const [ki, setKi] = useState<number>(0.8);
  const [kd, setKd] = useState<number>(0.2);
  const [isAuto, setIsAuto] = useState<boolean>(true);

  // Historical trend points (last 50 points)
  const [trendHistory, setTrendHistory] = useState<ProcessTrendDataPoint[]>([]);

  // Alarms
  const [alarms, setAlarms] = useState<ScadaAlarm[]>([
    {
      id: 'alm_1',
      tag: 'LEVEL_TANK1',
      message: 'Liquid level approaching high threshold (90%)',
      priority: 'HIGH',
      state: 'ACTIVE',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'alm_2',
      tag: 'MOTOR_TEMP',
      message: 'Induction motor KM1 winding temperature nominal (48°C)',
      priority: 'INFO',
      state: 'CLEARED',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Simulate PID loop dynamics
  useEffect(() => {
    if (simulationMode !== 'RUN') return;

    let integral = 0;
    let lastError = 0;

    const interval = setInterval(() => {
      setPv((prevPv) => {
        const error = sp - prevPv;
        integral = Math.max(-50, Math.min(50, integral + error * 0.1));
        const derivative = (error - lastError) / 0.1;
        lastError = error;

        // PID output calculation
        let output = kp * error + ki * integral + kd * derivative;
        output = Math.max(0, Math.min(100, output));
        setCv(output);

        // Process dynamic response: liquid level filling
        const fillRate = output * 0.08;
        const drainRate = prevPv * 0.04;
        const newPv = Math.max(0, Math.min(100, prevPv + fillRate - drainRate));

        // Sync to memory register IW64
        onSetNumeric('IW64', Math.round(newPv));

        // Append to Trend history
        setTrendHistory((prev) => {
          const nextPoint: ProcessTrendDataPoint = {
            timestamp: Date.now(),
            pv: Math.round(newPv * 10) / 10,
            sp,
            cv: Math.round(output * 10) / 10,
          };
          const slice = [...prev, nextPoint];
          if (slice.length > 40) slice.shift();
          return slice;
        });

        return newPv;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [sp, kp, ki, kd, isAuto, simulationMode]);

  const injectDisturbance = () => {
    setPv((prev) => Math.max(0, prev - 25));
  };

  const acknowledgeAlarms = () => {
    setAlarms((prev) =>
      prev.map((a) => (a.state === 'ACTIVE' ? { ...a, state: 'ACKNOWLEDGED' } : a))
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-['Rajdhani'] tracking-wide flex items-center gap-2">
                <span>SCADA SUPERVISORY CONTROL & CLOSED-LOOP PID</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Online
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Real-time multi-pen telemetry recorder, PID loop tuner, and plant alarm matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={injectDisturbance}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Inject Load Disturbance</span>
            </button>
            <button
              onClick={acknowledgeAlarms}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ack Alarms</span>
            </button>
          </div>
        </div>

        {/* Live Multi-Pen Trend Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-white">
                Live Multi-Pen Process Trend
              </span>
            </div>
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                PV (Process Variable): {Math.round(pv * 10) / 10}%
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                SP (Setpoint): {sp}%
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                CV (Control Output): {Math.round(cv * 10) / 10}%
              </span>
            </div>
          </div>

          {/* SVG Realtime Trend Graph */}
          <div className="relative h-64 bg-slate-950 rounded-lg border border-slate-800/80 p-2 overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
              <div className="border-b border-slate-600 text-[10px] text-slate-400">100%</div>
              <div className="border-b border-slate-600 text-[10px] text-slate-400">75%</div>
              <div className="border-b border-slate-600 text-[10px] text-slate-400">50%</div>
              <div className="border-b border-slate-600 text-[10px] text-slate-400">25%</div>
              <div className="text-[10px] text-slate-400">0%</div>
            </div>

            <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
              {/* SP Line */}
              {trendHistory.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  points={trendHistory
                    .map((pt, idx) => {
                      const x = (idx / (trendHistory.length - 1)) * 400;
                      const y = 150 - (pt.sp / 100) * 140 - 5;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}

              {/* CV Line */}
              {trendHistory.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  points={trendHistory
                    .map((pt, idx) => {
                      const x = (idx / (trendHistory.length - 1)) * 400;
                      const y = 150 - (pt.cv / 100) * 140 - 5;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}

              {/* PV Line (Prominent) */}
              {trendHistory.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3"
                  points={trendHistory
                    .map((pt, idx) => {
                      const x = (idx / (trendHistory.length - 1)) * 400;
                      const y = 150 - (pt.pv / 100) * 140 - 5;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}
            </svg>
          </div>
        </div>

        {/* PID Loop Parameter Tuner & Diagnostics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PID Tuner Knobs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-white">
                  PID Loop Parameter Tuning
                </span>
              </div>
              <button
                onClick={() => setIsAuto(!isAuto)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  isAuto ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {isAuto ? 'AUTO MODE' : 'MANUAL'}
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Setpoint */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Target Setpoint (SP)</span>
                  <span className="text-amber-400 font-mono font-bold">{sp} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sp}
                  onChange={(e) => setSp(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Proportional Gain Kp */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Proportional Gain (Kp)</span>
                  <span className="text-cyan-400 font-mono font-bold">{kp}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={kp}
                  onChange={(e) => setKp(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Integral Gain Ki */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Integral Time / Reset (Ki)</span>
                  <span className="text-cyan-400 font-mono font-bold">{ki}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5"
                  step="0.1"
                  value={ki}
                  onChange={(e) => setKi(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Derivative Gain Kd */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Derivative Rate (Kd)</span>
                  <span className="text-cyan-400 font-mono font-bold">{kd}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2"
                  step="0.05"
                  value={kd}
                  onChange={(e) => setKd(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Alarm Annunciator Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-white">
                  Plant Alarm Annunciator
                </span>
              </div>

              <div className="space-y-2">
                {alarms.map((alm) => (
                  <div
                    key={alm.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      alm.state === 'ACTIVE'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200 animate-pulse'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="font-mono text-cyan-400">{alm.tag}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                            alm.priority === 'HIGH' ? 'bg-rose-600 text-white' : 'bg-slate-700'
                          }`}
                        >
                          {alm.priority}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-300">{alm.message}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{alm.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>OPC UA Server: Connected</span>
              <span className="font-mono text-emerald-400">Rate: 100ms update</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
