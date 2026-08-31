import React, { useRef } from 'react';
import {
  AppView,
  PlcDialect,
  SimulationMode,
  TwinLabProject,
  UserRole,
} from '../../types';
import { LanguageCode, TRANSLATIONS } from '../../i18n/translations';
import {
  Play,
  Square,
  Pause,
  FastForward,
  Save,
  Download,
  Upload,
  Share2,
  Cpu,
  Layers,
  Box,
  Monitor,
  Activity,
  Users,
  GraduationCap,
  FolderKanban,
  Settings,
  HelpCircle,
  BarChart3,
  Globe,
  UserCheck,
  Zap,
  Camera,
  RotateCcw,
  Bookmark,
  History,
} from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeProject: TwinLabProject;
  projectsList: TwinLabProject[];
  onSelectProject: (proj: TwinLabProject) => void;
  onSaveProject: () => void;
  onExportProject: () => void;
  onImportProject: (json: string) => void;
  simulationMode: SimulationMode;
  setSimulationMode: (mode: SimulationMode) => void;
  onStepSimulation: () => void;
  speedMultiplier: number;
  setSpeedMultiplier: (speed: number) => void;
  plcDialect: PlcDialect;
  setPlcDialect: (dialect: PlcDialect) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  scanStats: { cycleTime: number; scanCount: number };
  onOpenDiagnostics?: () => void;
  forcedCount?: number;
  onOpenSnapshots?: () => void;
  onQuickTakeSnapshot?: () => void;
  onQuickRestoreLastSnapshot?: () => void;
  snapshotsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  activeProject,
  projectsList,
  onSelectProject,
  onSaveProject,
  onExportProject,
  onImportProject,
  simulationMode,
  setSimulationMode,
  onStepSimulation,
  speedMultiplier,
  setSpeedMultiplier,
  plcDialect,
  setPlcDialect,
  currentRole,
  setCurrentRole,
  language,
  setLanguage,
  scanStats,
  onOpenDiagnostics,
  forcedCount = 0,
  onOpenSnapshots,
  onQuickTakeSnapshot,
  onQuickRestoreLastSnapshot,
  snapshotsCount = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImportProject(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const navItems: { id: AppView; label: string; icon: any; badge?: string }[] = [
    { id: 'dashboard', label: t.dashboard, icon: FolderKanban },
    { id: 'ladder', label: t.ladder, icon: Cpu, badge: 'PLC' },
    { id: 'electrical', label: t.electrical, icon: Zap },
    { id: 'process3d', label: t.process3d, icon: Box, badge: '3D' },
    { id: 'hmi', label: t.hmi, icon: Monitor },
    { id: 'scada', label: t.scada, icon: Activity },
    { id: 'classroom', label: t.classroom, icon: Users, badge: 'Live' },
    { id: 'assignments', label: t.assignments, icon: GraduationCap },
    { id: 'analytics', label: t.analytics, icon: BarChart3 },
    { id: 'docs', label: t.docs, icon: HelpCircle },
    { id: 'admin', label: t.admin, icon: Settings },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 flex flex-col select-none shrink-0 shadow-lg z-30">
      {/* Top Toolbar */}
      <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 gap-3">
        {/* Branding & Project Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => setCurrentView('dashboard')}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-900/40 tracking-wider">
              DTL
            </div>
            <div>
              <h1 className="font-bold text-slate-100 tracking-tight text-sm sm:text-base flex items-center font-['Rajdhani']">
                <span>DIGITAL TWIN LAB</span>
                <span className="text-blue-400 text-[10px] ml-1.5 px-1.5 py-0.2 border border-blue-500/40 rounded bg-blue-950/60 uppercase font-sans font-semibold">
                  Pro v4.2
                </span>
              </h1>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <span>Dev & Concept:</span>
                <span className="text-blue-400 font-semibold">Eng ALAA MOHAMMED</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden md:block" />

          {/* Project Pill Dropdown */}
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 max-w-[200px] sm:max-w-[280px]">
            <span className="text-slate-500 italic hidden sm:inline">PROJECT:</span>
            <select
              aria-label="Select Project"
              value={activeProject.id}
              onChange={(e) => {
                const p = projectsList.find((x) => x.id === e.target.value);
                if (p) onSelectProject(p);
              }}
              className="bg-transparent text-xs text-slate-100 outline-none w-full truncate font-semibold cursor-pointer"
            >
              {projectsList.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-slate-900 text-slate-100 font-mono">
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Action Buttons */}
          <div className="hidden xl:flex items-center gap-1">
            <button
              onClick={onSaveProject}
              title="Save Project"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.save}</span>
            </button>
            <button
              onClick={onExportProject}
              title="Export Project JSON"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.export}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import Project JSON"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.import}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Center/Right: PLC Status Badge & Simulation Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* PLC Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-lg">
            {simulationMode === 'RUN' && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                  PLC: RUNNING
                </span>
              </>
            )}
            {simulationMode === 'PAUSE' && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 font-mono">
                  PLC: PAUSED
                </span>
              </>
            )}
            {simulationMode === 'STOP' && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 font-mono">
                  PLC: STOPPED
                </span>
              </>
            )}
          </div>

          {/* Master Simulation Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
            <button
              onClick={() => setSimulationMode('RUN')}
              title="RUN PLC Engine"
              className={`p-2 rounded border transition-all cursor-pointer ${
                simulationMode === 'RUN'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>

            <button
              onClick={() => setSimulationMode('PAUSE')}
              title="PAUSE Simulation"
              className={`p-2 rounded border transition-all cursor-pointer ${
                simulationMode === 'PAUSE'
                  ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-amber-400'
              }`}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setSimulationMode('STOP')}
              title="STOP & Reset I/O"
              className={`p-2 rounded border transition-all cursor-pointer ${
                simulationMode === 'STOP'
                  ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-rose-400'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            <button
              onClick={onStepSimulation}
              title="Single Scan Step"
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-blue-400 transition-all cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center pl-1 border-l border-slate-800 text-[10px] text-slate-400">
              <select
                aria-label="Simulation Speed"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                className="bg-slate-900 text-slate-200 border border-slate-800 rounded px-1.5 py-1 text-[11px] font-mono outline-none cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={1.0}>1.0x</option>
                <option value={2.0}>2.0x</option>
                <option value={5.0}>5.0x</option>
              </select>
            </div>
          </div>

          {/* Simulation Snapshots & Memory State Controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
            {onQuickTakeSnapshot && (
              <button
                onClick={onQuickTakeSnapshot}
                title="Save Quick Simulation Snapshot (Freeze current PLC memory)"
                className="flex items-center gap-1 px-2 py-1.5 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-sm group"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">SNAPSHOT</span>
              </button>
            )}

            {onQuickRestoreLastSnapshot && (
              <button
                onClick={onQuickRestoreLastSnapshot}
                disabled={snapshotsCount === 0}
                title={
                  snapshotsCount > 0
                    ? 'Restore PLC State to Previous Snapshot'
                    : 'No saved snapshots to restore'
                }
                className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs font-mono font-bold transition-all ${
                  snapshotsCount > 0
                    ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-700/60 text-emerald-300 hover:text-white cursor-pointer shadow-sm group'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${snapshotsCount > 0 ? 'text-emerald-400 group-hover:-rotate-45 transition-transform' : 'text-slate-600'}`} />
                <span className="hidden sm:inline">RESTORE</span>
              </button>
            )}

            {onOpenSnapshots && (
              <button
                onClick={onOpenSnapshots}
                title="Open Simulation Snapshots Library & Memory Diff Inspector"
                className="flex items-center gap-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px]">
                  {snapshotsCount}
                </span>
              </button>
            )}
          </div>

          {/* Diagnostics Modal Trigger Button */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              title="Open Real-Time PLC Memory & Execution Diagnostics"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900/90 border border-blue-700/60 text-blue-300 hover:text-white text-xs font-mono font-bold shadow-md shadow-blue-950 transition-all cursor-pointer group"
            >
              <Cpu className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">DIAGNOSTICS</span>
              {forcedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                  {forcedCount}F
                </span>
              )}
            </button>
          )}

          {/* User Role, Dialect & Language */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Dialect */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] text-slate-400 font-mono">PLC:</span>
              <select
                aria-label="PLC Dialect"
                value={plcDialect}
                onChange={(e) => setPlcDialect(e.target.value as PlcDialect)}
                className="bg-transparent text-xs text-blue-400 font-mono font-semibold outline-none cursor-pointer"
              >
                <option value="siemens" className="bg-slate-900 text-slate-100">S7-1200</option>
                <option value="delta" className="bg-slate-900 text-slate-100">Delta DVP</option>
              </select>
            </div>

            {/* Role */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Active Role"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer capitalize font-medium"
              >
                <option value="student" className="bg-slate-900">Student</option>
                <option value="teacher" className="bg-slate-900">Teacher</option>
                <option value="institution_admin" className="bg-slate-900">Inst. Admin</option>
                <option value="system_admin" className="bg-slate-900">Sys. Admin</option>
                <option value="guest" className="bg-slate-900">Guest</option>
              </select>
            </div>

            {/* Language */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <Globe className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer uppercase font-semibold"
              >
                <option value="en" className="bg-slate-900">EN</option>
                <option value="es" className="bg-slate-900">ES</option>
                <option value="ar" className="bg-slate-900">AR</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Bar */}
      <nav className="flex items-center px-4 py-1.5 overflow-x-auto no-scrollbar gap-1.5 bg-slate-950/80 border-b border-slate-800/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
