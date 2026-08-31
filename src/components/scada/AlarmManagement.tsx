import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  AlertOctagon,
  Bell,
  BellRing,
  CheckCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Volume1,
  Sliders,
  Play,
  Download,
  Filter,
  Search,
  RefreshCw,
  Clock,
  Zap,
  Info,
  ShieldAlert,
  Flame,
  Activity,
  History,
  XCircle,
  FileSpreadsheet,
  Settings2,
} from 'lucide-react';
import { ScadaTag } from '../../types';
import { AlarmAudioProfile } from '../../services/scadaAudioService';

export type AlarmSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AlarmState = 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK';
export type AlarmCondition = 'HIGH_HIGH' | 'HIGH' | 'LOW' | 'LOW_LOW' | 'DIGITAL_TRIP' | 'DEVIATION' | 'SYSTEM_FAULT';

export interface ActiveAlarm {
  id: string;
  tagId: string;
  tagName: string;
  address: string;
  condition: AlarmCondition;
  severity: AlarmSeverity;
  state: AlarmState;
  message: string;
  triggerValue: number | boolean;
  thresholdValue?: number | boolean;
  unit?: string;
  timestamp: number;
  formattedTime: string;
  ackTimestamp?: number;
  ackBy?: string;
}

export interface HistoricalAlarmLog {
  id: string;
  alarmId: string;
  tagId: string;
  tagName: string;
  address: string;
  eventType: 'RAISED' | 'ACKNOWLEDGED' | 'CLEARED' | 'SUPPRESSED';
  condition: AlarmCondition;
  severity: AlarmSeverity;
  value: number | boolean;
  threshold?: number | boolean;
  unit?: string;
  message: string;
  timestamp: number;
  formattedTime: string;
  operator?: string;
  notes?: string;
}

interface AlarmManagementProps {
  activeAlarms: ActiveAlarm[];
  historicalLogs: HistoricalAlarmLog[];
  tags: ScadaTag[];
  onAcknowledgeAlarm: (alarmId: string) => void;
  onAcknowledgeAll: () => void;
  onClearHistoricalLogs: () => void;
  onSimulateFault: (faultType: string) => void;
  onResetAllFaults: () => void;
  isAudioSilenced: boolean;
  onToggleAudioSilence: () => void;
  isAlarmSoundEnabled?: boolean;
  onToggleAlarmSound?: () => void;
  alarmVolume?: number;
  onChangeAlarmVolume?: (vol: number) => void;
  alarmAudioProfile?: AlarmAudioProfile;
  onChangeAudioProfile?: (profile: AlarmAudioProfile) => void;
  onTestAlarmSound?: () => void;
}

export const AlarmManagement: React.FC<AlarmManagementProps> = ({
  activeAlarms,
  historicalLogs,
  tags,
  onAcknowledgeAlarm,
  onAcknowledgeAll,
  onClearHistoricalLogs,
  onSimulateFault,
  onResetAllFaults,
  isAudioSilenced,
  onToggleAudioSilence,
  isAlarmSoundEnabled = true,
  onToggleAlarmSound,
  alarmVolume = 0.7,
  onChangeAlarmVolume,
  alarmAudioProfile = 'industrial',
  onChangeAudioProfile,
  onTestAlarmSound,
}) => {
  const [alarmTab, setAlarmTab] = useState<'active' | 'history' | 'analytics'>('active');
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAlarm, setSelectedAlarm] = useState<ActiveAlarm | null>(null);

  // Filter Active Alarms
  const filteredActiveAlarms = useMemo(() => {
    return activeAlarms.filter((alarm) => {
      const matchesSearch =
        alarm.tagName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alarm.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alarm.message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        severityFilter === 'ALL' || alarm.severity === severityFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'UNACK' && (alarm.state === 'ACTIVE_UNACK' || alarm.state === 'CLEARED_UNACK')) ||
        (statusFilter === 'ACK' && (alarm.state === 'ACTIVE_ACK' || alarm.state === 'CLEARED_ACK'));

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [activeAlarms, searchQuery, severityFilter, statusFilter]);

  // Filter Historical Logs
  const filteredHistory = useMemo(() => {
    return historicalLogs.filter((log) => {
      const matchesSearch =
        log.tagName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        severityFilter === 'ALL' || log.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [historicalLogs, searchQuery, severityFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const unackCount = activeAlarms.filter(
      (a) => a.state === 'ACTIVE_UNACK' || a.state === 'CLEARED_UNACK'
    ).length;
    const criticalCount = activeAlarms.filter((a) => a.severity === 'CRITICAL').length;
    const highCount = activeAlarms.filter((a) => a.severity === 'HIGH').length;
    const totalToday = historicalLogs.length;

    // Calculate Top Bad Actor Tag
    const tagOccurrences: Record<string, number> = {};
    historicalLogs.forEach((log) => {
      tagOccurrences[log.tagName] = (tagOccurrences[log.tagName] || 0) + 1;
    });

    let topBadActor = 'None';
    let maxCount = 0;
    Object.entries(tagOccurrences).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topBadActor = `${name} (${count})`;
      }
    });

    return {
      activeCount: activeAlarms.length,
      unackCount,
      criticalCount,
      highCount,
      totalEvents: totalToday,
      topBadActor,
    };
  }, [activeAlarms, historicalLogs]);

  // Export logs to CSV
  const handleExportCSV = () => {
    if (historicalLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Event', 'Severity', 'Tag', 'Address', 'Condition', 'Value', 'Message', 'Operator'];
    const rows = historicalLogs.map((log) => [
      log.id,
      log.formattedTime,
      log.eventType,
      log.severity,
      log.tagName,
      log.address,
      log.condition,
      String(log.value),
      `"${log.message.replace(/"/g, '""')}"`,
      log.operator || 'System',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `scada_alarm_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (sev: AlarmSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-700 text-rose-300 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-700 text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950 border border-yellow-700 text-yellow-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 border border-blue-700 text-blue-300 flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-400" />
            LOW
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
            INFO
          </span>
        );
    }
  };

  const getStateBadge = (state: AlarmState) => {
    switch (state) {
      case 'ACTIVE_UNACK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600/30 border border-rose-500 text-rose-300 animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            UNACK
          </span>
        );
      case 'ACTIVE_ACK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-600/30 border border-amber-500 text-amber-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            ACKED
          </span>
        );
      case 'CLEARED_UNACK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center gap-1">
            CLEARED (UNACK)
          </span>
        );
      case 'CLEARED_ACK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center gap-1">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner with KPIs & Emergency Fault Simulation Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Active Alarms</span>
            <Bell className={`w-3.5 h-3.5 ${stats.activeCount > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {stats.activeCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.unackCount} Unacknowledged
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Critical Priority</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {stats.criticalCount}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">
            Emergency Trips
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">High Priority</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {stats.highCount}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">
            Process Warnings
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Total Events</span>
            <History className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-300 mt-1">
            {stats.totalEvents}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Logged in buffer
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between col-span-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Top Bad Actor Tag</span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-200 truncate mt-1">
            {stats.topBadActor}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Most frequent alarm source in session
          </div>
        </div>
      </div>

      {/* Process Fault Simulation Matrix (Interactive Tool for Student/Operator Training) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Interactive Fault & Alarm Injection Studio
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-950 text-blue-400 border border-blue-800 rounded">
              Operator Training
            </span>
          </div>
          <button
            onClick={onResetAllFaults}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors w-fit"
          >
            <RefreshCw className="w-3 h-3 text-emerald-400" />
            <span>Reset All Process Faults</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <button
            onClick={() => onSimulateFault('TANK_HIGH_HIGH')}
            className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-rose-400 font-bold flex items-center justify-between">
              <span>TANK1 HIGH-HIGH</span>
              <AlertOctagon className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
              Force Level to 96%
            </div>
          </button>

          <button
            onClick={() => onSimulateFault('MOTOR_OVERTEMP')}
            className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-amber-400 font-bold flex items-center justify-between">
              <span>MOTOR OVERHEAT</span>
              <Flame className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
              Surge Temp to 92°C
            </div>
          </button>

          <button
            onClick={() => onSimulateFault('PRESSURE_SURGE')}
            className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-amber-400 font-bold flex items-center justify-between">
              <span>PIPE OVERPRESSURE</span>
              <Activity className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
              Surge to 8.5 Bar
            </div>
          </button>

          <button
            onClick={() => onSimulateFault('ESTOP_TRIP')}
            className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-rose-400 font-bold flex items-center justify-between">
              <span>E-STOP ACTIVATED</span>
              <AlertOctagon className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
              Trip Input I0.2 (True)
            </div>
          </button>

          <button
            onClick={() => onSimulateFault('OVERLOAD_TRIP')}
            className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-purple-950/50 border border-slate-800 hover:border-purple-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-purple-400 font-bold flex items-center justify-between">
              <span>THERMAL OVERLOAD</span>
              <ShieldAlert className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
              Trip Relay F2 (I0.3)
            </div>
          </button>
        </div>
      </div>

      {/* Main Alarm Management Workbench */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        {/* Navigation Sub-Tabs & Action Toolbar */}
        <div className="p-3 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAlarmTab('active')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                alarmTab === 'active'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Active Alarms</span>
              {activeAlarms.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-mono font-extrabold">
                  {activeAlarms.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setAlarmTab('history')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                alarmTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Sequence of Events (History)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({historicalLogs.length})
              </span>
            </button>

            <button
              onClick={() => setAlarmTab('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                alarmTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Tag Threshold Limits</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Alarm Sound Toggle Button */}
            {onToggleAlarmSound && (
              <button
                onClick={onToggleAlarmSound}
                title={isAlarmSoundEnabled ? 'Alarm Sound: Enabled (Click to Mute)' : 'Alarm Sound: Disabled (Click to Enable)'}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isAlarmSoundEnabled
                    ? 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300 hover:bg-cyan-900/80'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAlarmSoundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Alarm Sound:</span>
                <span className={`font-mono font-bold ${isAlarmSoundEnabled ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {isAlarmSoundEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            {/* Audio Settings & Test Button */}
            <button
              onClick={() => setShowAudioSettings(!showAudioSettings)}
              title="Audio Alert Settings & Tone Customization"
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                showAudioSettings
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Audio Config</span>
            </button>

            {/* Horn / Audio Silence Toggle */}
            <button
              onClick={onToggleAudioSilence}
              title={isAudioSilenced ? 'Unmute Siren / Buzzer' : 'Silence Siren / Buzzer'}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isAudioSilenced
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300 animate-pulse'
              }`}
            >
              {isAudioSilenced ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">
                {isAudioSilenced ? 'Siren Silenced' : 'Siren Active'}
              </span>
            </button>

            {/* Acknowledge All */}
            <button
              onClick={onAcknowledgeAll}
              disabled={activeAlarms.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Ack All Alarms</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={historicalLogs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Export Log</span>
            </button>
          </div>
        </div>

        {/* Expandable Audio Settings Panel */}
        {showAudioSettings && (
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 text-xs text-slate-300 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Audio Master Toggle */}
                {onToggleAlarmSound && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Browser Audio Alerts:</span>
                    <button
                      onClick={onToggleAlarmSound}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isAlarmSoundEnabled
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-900'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {isAlarmSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      <span>{isAlarmSoundEnabled ? 'ENABLED' : 'DISABLED'}</span>
                    </button>
                  </div>
                )}

                {/* Tone Profile Selector */}
                {onChangeAudioProfile && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Alarm Tone Profile:</span>
                    <select
                      value={alarmAudioProfile}
                      onChange={(e) => onChangeAudioProfile(e.target.value as AlarmAudioProfile)}
                      className="bg-slate-900 border border-slate-750 rounded-md px-2.5 py-1 text-slate-200 text-xs outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="industrial">Industrial Triple Pulse (Sawtooth/Square)</option>
                      <option value="siren">Modulated Frequency Siren (800-1200Hz)</option>
                      <option value="beeps">Standard Warning Beeps</option>
                      <option value="modern">Modern Process Chime</option>
                    </select>
                  </div>
                )}

                {/* Volume Slider */}
                {onChangeAlarmVolume && (
                  <div className="flex items-center gap-2 min-w-[170px]">
                    <span className="text-slate-400 font-medium">Volume:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={alarmVolume}
                      onChange={(e) => onChangeAlarmVolume(Number(e.target.value))}
                      className="w-24 accent-cyan-400 cursor-pointer"
                    />
                    <span className="font-mono text-cyan-400 font-bold w-9 text-right">
                      {Math.round(alarmVolume * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Test Audio Alert Button */}
              {onTestAlarmSound && (
                <button
                  onClick={onTestAlarmSound}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-900/60 hover:bg-cyan-800/80 border border-cyan-600/70 text-cyan-200 text-xs font-bold transition-all cursor-pointer shadow-sm w-fit"
                >
                  <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                  <span>Test Audio Alert</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Audio alerts use the browser's Web Audio synthesizer. Audio activates automatically on new critical/high alarms when enabled.
            </p>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by tag, address, or alarm message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-200 text-xs outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Severity:</span>
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {alarmTab === 'active' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="UNACK">Unacknowledged Only</option>
                <option value="ACK">Acknowledged Only</option>
              </select>
            )}
          </div>
        </div>

        {/* View Content based on Selected Tab */}
        {alarmTab === 'active' && (
          <div className="overflow-x-auto">
            {filteredActiveAlarms.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60" />
                <p className="text-sm font-semibold text-slate-400">No Active Alarms in Plant</p>
                <p className="text-xs text-slate-600">All process variables within safe operating thresholds.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="p-3">Severity</th>
                    <th className="p-3">Tag & Address</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">Live Value</th>
                    <th className="p-3">Alarm Message</th>
                    <th className="p-3">Trigger Time</th>
                    <th className="p-3">State</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredActiveAlarms.map((alarm) => {
                    const isUnack = alarm.state === 'ACTIVE_UNACK' || alarm.state === 'CLEARED_UNACK';
                    return (
                      <tr
                        key={alarm.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isUnack
                            ? 'bg-rose-950/20'
                            : 'bg-transparent'
                        }`}
                      >
                        <td className="p-3">{getSeverityBadge(alarm.severity)}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-200">{alarm.tagName}</div>
                          <div className="font-mono text-[10px] text-blue-400">{alarm.address}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
                            {alarm.condition}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-300">
                          {typeof alarm.triggerValue === 'number'
                            ? `${alarm.triggerValue} ${alarm.unit || ''}`
                            : String(alarm.triggerValue)}
                          {alarm.thresholdValue !== undefined && (
                            <span className="text-[10px] text-slate-500 font-normal block">
                              Limit: {String(alarm.thresholdValue)} {alarm.unit || ''}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 max-w-xs">{alarm.message}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {alarm.formattedTime}
                        </td>
                        <td className="p-3">{getStateBadge(alarm.state)}</td>
                        <td className="p-3 text-right">
                          {isUnack && (
                            <button
                              onClick={() => onAcknowledgeAlarm(alarm.id)}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow transition-all cursor-pointer"
                            >
                              Acknowledge
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {alarmTab === 'history' && (
          <div>
            <div className="p-2.5 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400 px-3">
              <span>Buffer Capacity: 200 chronological events</span>
              <button
                onClick={onClearHistoricalLogs}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Clear History Buffer
              </button>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  No historical alarm records found matching filters.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 z-10">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Event</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Tag & Address</th>
                      <th className="p-2.5">Condition</th>
                      <th className="p-2.5">Value</th>
                      <th className="p-2.5">Event Description</th>
                      <th className="p-2.5">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-sans">
                    {filteredHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 text-[11px]">
                        <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap">
                          {log.formattedTime}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase ${
                              log.eventType === 'RAISED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : log.eventType === 'ACKNOWLEDGED'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {log.eventType}
                          </span>
                        </td>
                        <td className="p-2.5">{getSeverityBadge(log.severity)}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-300">{log.tagName}</span>
                          <span className="font-mono text-[9px] text-slate-500 ml-1">
                            ({log.address})
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">{log.condition}</td>
                        <td className="p-2.5 font-mono text-slate-300">
                          {String(log.value)} {log.unit || ''}
                        </td>
                        <td className="p-2.5 text-slate-300">{log.message}</td>
                        <td className="p-2.5 font-mono text-slate-400">{log.operator || 'SYSTEM'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {alarmTab === 'analytics' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Configured SCADA Tag Alarm Threshold Matrix</h3>
                <p className="text-xs text-slate-400">Process high/low limit triggers monitored by SCADA continuous polling</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tags.map((tag) => (
                <div key={tag.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                    <div>
                      <span className="font-bold text-xs text-slate-200">{tag.name}</span>
                      <span className="text-[10px] font-mono text-blue-400 ml-2">[{tag.address}]</span>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                      Type: {tag.dataType} ({tag.unit})
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                    <div className="bg-slate-900 p-1.5 rounded border border-rose-900/40">
                      <span className="text-rose-400 block font-bold">Low-Low</span>
                      <span className="text-slate-300">{tag.alarmLowLow !== undefined ? tag.alarmLowLow : 'N/A'}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-yellow-900/40">
                      <span className="text-yellow-400 block font-bold">Low</span>
                      <span className="text-slate-300">{tag.alarmLow !== undefined ? tag.alarmLow : 'N/A'}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-yellow-900/40">
                      <span className="text-yellow-400 block font-bold">High</span>
                      <span className="text-slate-300">{tag.alarmHigh !== undefined ? tag.alarmHigh : 'N/A'}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-rose-900/40">
                      <span className="text-rose-400 block font-bold">High-High</span>
                      <span className="text-slate-300">{tag.alarmHighHigh !== undefined ? tag.alarmHighHigh : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-slate-400">Current Value:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {String(tag.currentValue)} {tag.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
