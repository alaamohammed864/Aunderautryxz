import React, { useState } from 'react';
import {
  BookOpen,
  Cpu,
  Zap,
  Box,
  Monitor,
  Activity,
  ChevronRight,
  Code,
  FileText,
  CheckCircle,
} from 'lucide-react';

export const DocsView: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<'plc' | 'siemens_delta' | 'motor_control' | 'digital_twin' | 'pid'>('plc');

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Left Topic Sidebar */}
      <div className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-cyan-300">
            Engineering Docs
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <button
            onClick={() => setSelectedTopic('plc')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
              selectedTopic === 'plc'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>PLC Ladder Fundamentals</span>
          </button>

          <button
            onClick={() => setSelectedTopic('siemens_delta')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
              selectedTopic === 'siemens_delta'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Siemens & Delta Addressing</span>
          </button>

          <button
            onClick={() => setSelectedTopic('motor_control')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
              selectedTopic === 'motor_control'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Motor Control & DOL / Star-Delta</span>
          </button>

          <button
            onClick={() => setSelectedTopic('digital_twin')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
              selectedTopic === 'digital_twin'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D Digital Twin Mapping</span>
          </button>

          <button
            onClick={() => setSelectedTopic('pid')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
              selectedTopic === 'pid'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Closed-Loop PID Tuning</span>
          </button>
        </div>
      </div>

      {/* Right Content Pane */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-200">
        <div className="max-w-4xl space-y-6">
          {/* Topic 1: PLC Ladder Logic */}
          {selectedTopic === 'plc' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white font-['Rajdhani'] flex items-center gap-2">
                <Cpu className="w-6 h-6 text-cyan-400" />
                <span>PLC Scan Cycle & Ladder Logic Architecture</span>
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Industrial Programmable Logic Controllers (PLCs) operate using a continuous deterministic scan cycle comprised of three distinct phases:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs font-bold text-cyan-400 block mb-1">Phase 1: Input Scan</span>
                  <p className="text-xs text-slate-400">
                    Reads physical input terminals (push buttons, photoeyes, proximity sensors) and copies status into the Process Image Input (PII) memory table.
                  </p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs font-bold text-cyan-400 block mb-1">Phase 2: Logic Execution</span>
                  <p className="text-xs text-slate-400">
                    Executes user ladder rungs sequentially from top to bottom, evaluating Boolean power flow, timers (TON/TOF), and counters.
                  </p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs font-bold text-cyan-400 block mb-1">Phase 3: Output Update</span>
                  <p className="text-xs text-slate-400">
                    Transfers calculated Process Image Output (PIQ) values to physical actuator terminals (motor contactors, solenoid valves, pilot lamps).
                  </p>
                </div>
              </div>

              <h2 className="text-base font-bold text-white mt-6 mb-2">Core Ladder Logic Instructions</h2>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-cyan-300 font-mono">-[ ]- NO Contact (Normally Open)</span>
                    <p className="text-slate-400 mt-0.5">Passes power flow when the addressed bit evaluates to TRUE (1).</p>
                  </div>
                  <span className="font-mono text-slate-500">Ex: I0.0, X0</span>
                </div>

                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-cyan-300 font-mono">-[/]- NC Contact (Normally Closed)</span>
                    <p className="text-slate-400 mt-0.5">Passes power flow when the addressed bit is FALSE (0). Standard for Stop buttons and Safety Overloads.</p>
                  </div>
                  <span className="font-mono text-slate-500">Ex: I0.1, X1</span>
                </div>

                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-400 font-mono">-( )- Standard Output Coil</span>
                    <p className="text-slate-400 mt-0.5">Energizes target output bit (sets to 1) whenever the rung has active power flow.</p>
                  </div>
                  <span className="font-mono text-slate-500">Ex: Q0.0, Y0</span>
                </div>

                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-400 font-mono">TON On-Delay Timer</span>
                    <p className="text-slate-400 mt-0.5">Delays turning output Q ON until input condition has remained continuously TRUE for PT milliseconds.</p>
                  </div>
                  <span className="font-mono text-slate-500">Ex: T1 (PT=3000ms)</span>
                </div>
              </div>
            </div>
          )}

          {/* Topic 2: Siemens & Delta Dialects */}
          {selectedTopic === 'siemens_delta' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white font-['Rajdhani'] flex items-center gap-2">
                <Code className="w-6 h-6 text-cyan-400" />
                <span>PLC Address Translation: Siemens S7 vs Delta DVP</span>
              </h1>
              <p className="text-sm text-slate-300">
                TwinLab includes full dual-dialect normalization, allowing seamless logic conversion between European IEC / Siemens conventions and Asian Delta / Mitsubishi syntax.
              </p>

              <div className="overflow-x-auto my-4">
                <table className="w-full text-xs text-left border border-slate-800">
                  <thead className="bg-slate-900 text-slate-300 font-bold uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Memory Type</th>
                      <th className="p-2.5 text-cyan-400">Siemens S7-1200 / S7-1500</th>
                      <th className="p-2.5 text-amber-400">Delta DVP-SS2 / ES2</th>
                      <th className="p-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    <tr className="bg-slate-950">
                      <td className="p-2.5 font-sans font-medium text-white">Digital Inputs</td>
                      <td className="p-2.5 text-cyan-300">I0.0 to I1.7 (Byte.Bit)</td>
                      <td className="p-2.5 text-amber-300">X0 to X7 (Octal)</td>
                      <td className="p-2.5 font-sans text-slate-400">Pushbuttons, switches, sensors</td>
                    </tr>
                    <tr className="bg-slate-900/60">
                      <td className="p-2.5 font-sans font-medium text-white">Digital Outputs</td>
                      <td className="p-2.5 text-cyan-300">Q0.0 to Q1.7 (Byte.Bit)</td>
                      <td className="p-2.5 text-amber-300">Y0 to Y7 (Octal)</td>
                      <td className="p-2.5 font-sans text-slate-400">Motor contactors, valves, lamps</td>
                    </tr>
                    <tr className="bg-slate-950">
                      <td className="p-2.5 font-sans font-medium text-white">Internal Flags (Memory)</td>
                      <td className="p-2.5 text-cyan-300">M0.0 to M99.7</td>
                      <td className="p-2.5 text-amber-300">M0 to M1000</td>
                      <td className="p-2.5 font-sans text-slate-400">Internal state memory & latches</td>
                    </tr>
                    <tr className="bg-slate-900/60">
                      <td className="p-2.5 font-sans font-medium text-white">Timers</td>
                      <td className="p-2.5 text-cyan-300">T1, T2, IEC_Timer DB</td>
                      <td className="p-2.5 text-amber-300">T0 to T255</td>
                      <td className="p-2.5 font-sans text-slate-400">100ms / 10ms precision delay timers</td>
                    </tr>
                    <tr className="bg-slate-950">
                      <td className="p-2.5 font-sans font-medium text-white">Data Registers</td>
                      <td className="p-2.5 text-cyan-300">MW10, DB1.DBD0, IW64</td>
                      <td className="p-2.5 text-amber-300">D0 to D1000</td>
                      <td className="p-2.5 font-sans text-slate-400">16-bit / 32-bit analog process values</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Topic 3: Motor Control */}
          {selectedTopic === 'motor_control' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white font-['Rajdhani'] flex items-center gap-2">
                <Zap className="w-6 h-6 text-amber-400" />
                <span>Industrial Motor Control & Protection</span>
              </h1>
              <p className="text-sm text-slate-300">
                Direct-On-Line (DOL) and Star-Delta starter circuits are standard methods for powering 3-phase induction motors safely.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <h3 className="font-bold text-white text-sm mb-1">Direct-On-Line (DOL) Starter Design</h3>
                  <p className="text-slate-400 leading-relaxed">
                    A DOL starter applies the full line voltage (400VAC) directly to motor terminals. It requires:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300">
                    <li>3-Pole Molded Case Circuit Breaker (MCCB) for short-circuit protection.</li>
                    <li>Main Contactor KM1 with 24VDC coil (A1-A2) and NO auxiliary seal-in contacts (13-14).</li>
                    <li>Thermal Overload Relay (F2) with NC trip contact (95-96) wired in series with the Stop PB.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Topic 4: Digital Twin */}
          {selectedTopic === 'digital_twin' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white font-['Rajdhani'] flex items-center gap-2">
                <Box className="w-6 h-6 text-sky-400" />
                <span>3D Digital Twin Mapping & Simulation Synchronization</span>
              </h1>
              <p className="text-sm text-slate-300">
                The TwinLab 3D engine connects physical manufacturing equipment models with the PLC memory image in real-time.
              </p>
            </div>
          )}

          {/* Topic 5: PID Tuning */}
          {selectedTopic === 'pid' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white font-['Rajdhani'] flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-400" />
                <span>Closed-Loop PID Process Control Tuning</span>
              </h1>
              <p className="text-sm text-slate-300">
                Proportional-Integral-Derivative (PID) controllers calculate an error value as the difference between a desired Setpoint (SP) and measured Process Variable (PV).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
