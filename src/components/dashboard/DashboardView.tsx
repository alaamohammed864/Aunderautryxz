import React from 'react';
import {
  AppView,
  SimulationMode,
  TwinLabProject,
  UserRole,
} from '../../types';
import {
  Cpu,
  Zap,
  Box,
  Monitor,
  Activity,
  Users,
  GraduationCap,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCode,
  ShieldCheck,
  Flame,
  Layers,
} from 'lucide-react';

interface DashboardViewProps {
  activeProject: TwinLabProject;
  projectsList: TwinLabProject[];
  onSelectProject: (p: TwinLabProject) => void;
  onNewProject: () => void;
  onNavigate: (view: AppView) => void;
  simulationMode: SimulationMode;
  userRole: UserRole;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeProject,
  projectsList,
  onSelectProject,
  onNewProject,
  onNavigate,
  simulationMode,
  userRole,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome & System Status Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                  TwinLab Industrial Lab v1.0
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] inline-block" />
                  Deterministic Engine Online
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Industrial Automation Digital Twin Laboratory
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Design and simulate complete multi-domain automation systems: Electrical schematics, PLC Ladder Logic, 3D mechanical processes, visual HMI touchscreens, and SCADA monitoring in a unified deterministic browser engine.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onNewProject}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-950/40 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
              <button
                onClick={() => onNavigate('ladder')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Open Simulator</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
            <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">PLC Dialects</span>
              <div className="text-sm font-bold text-blue-300 mt-1">Siemens S7-1200 & Delta DVP</div>
            </div>
            <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Active Simulation</span>
              <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5 font-mono">
                <span className={`w-2 h-2 rounded-full ${simulationMode === 'RUN' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-600'}`} />
                {simulationMode} Mode
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">3D Process Engine</span>
              <div className="text-sm font-bold text-slate-200 mt-1">WebGL Three.js 60 FPS</div>
            </div>
            <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Persistence</span>
              <div className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Indexed LocalStorage
              </div>
            </div>
          </div>
        </div>

        {/* Modules Quick Launchpad */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Interactive Engineering Workspaces</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* PLC Ladder */}
            <div
              onClick={() => onNavigate('ladder')}
              className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-950/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                    {activeProject.ladder.rungs.length} Rungs
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  PLC Ladder Logic Editor
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Deterministic scan-cycle engine with NO/NC contacts, Set/Reset coils, TON/TOF timers, CTU counters, math blocks, and live energized power-flow monitoring.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-cyan-400 gap-1">
                <span>Open Ladder Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Electrical Circuit */}
            <div
              onClick={() => onNavigate('electrical')}
              className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-amber-950/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                    {activeProject.electrical.components.length} Components
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  Electrical Circuit Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Drag & drop electrical panels with 3-phase power, breakers, contactors with magnetic auxiliary feedback, thermal overloads, pushbuttons, and live wire potentials.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 gap-1">
                <span>Open Electrical Panel</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 3D Process Twin */}
            <div
              onClick={() => onNavigate('process3d')}
              className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-sky-950/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-700/60 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                    <Box className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/50">
                    3D Scene: {activeProject.process3d.template.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                  Industrial 3D Process Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Interactive WebGL factory floor with moving conveyor belts, pneumatic sorting pistons, photoelectric laser eyes, liquid tanks, and pick & place gantries.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-sky-400 gap-1">
                <span>Launch 3D Digital Twin</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* HMI Designer */}
            <div
              onClick={() => onNavigate('hmi')}
              className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-950/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-700/60 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/50">
                    {activeProject.hmi.widgets.length} Widgets
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                  HMI Designer & Touchscreen
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Visual touch panel creator with pushbuttons, pilot lamps, radial gauges, sliders, tank level visualizers, and live two-way PLC tag address binding.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-purple-400 gap-1">
                <span>Design HMI Screens</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* SCADA & Trends */}
            <div
              onClick={() => onNavigate('scada')}
              className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-950/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                    PID Closed Loop
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  SCADA Dashboard & PID Tuner
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Control room supervisory system with real-time multi-pen trend charts, alarm annunciator matrix, event logging, and PID loop tuning (Kp, Ki, Kd).
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 gap-1">
                <span>Open SCADA Center</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Classroom & Assignments */}
            <div
              onClick={() => onNavigate('assignments')}
              className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-950/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50">
                    Auto-Grading
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Assignments & Virtual Classroom
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Curriculum with automated simulation testbenches that stimulate inputs and grade student submissions automatically with detailed rubric analysis.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 gap-1">
                <span>View Exercises & Tests</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Industrial Sample Projects Showcase */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-cyan-400" />
              <span>Ready-Made Industrial Projects</span>
            </h2>
            <span className="text-xs text-slate-400">Click any project to load into simulator</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {projectsList.map((proj) => {
              const isCurrent = proj.id === activeProject.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {proj.category}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-100 line-clamp-1">{proj.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{proj.plc.model}</span>
                    <span className="text-cyan-400 font-sans hover:underline">Load &rarr;</span>
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
