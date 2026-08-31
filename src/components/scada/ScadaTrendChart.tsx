import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Brush,
} from 'recharts';
import {
  TrendingUp,
  Sliders,
  Play,
  Pause,
  Download,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  Gauge,
  Thermometer,
  Zap,
} from 'lucide-react';

export interface ScadaTrendPoint {
  timestamp: number;
  timeStr: string;
  // Numeric Tag Values
  tankLevel: number; // PV (%)
  tankSetpoint: number; // SP (%)
  controlOutput: number; // CV (%)
  motorSpeed: number; // RPM (0 - 1800)
  motorTemp: number; // °C (0 - 120)
  pipePressure: number; // Bar (0 - 10)
  pumpFlow: number; // L/min (0 - 50)
  motorCurrent: number; // A (0 - 30)
}

export interface TagConfig {
  key: keyof Omit<ScadaTrendPoint, 'timestamp' | 'timeStr'>;
  name: string;
  label: string;
  address: string;
  unit: string;
  color: string;
  min: number;
  max: number;
  decimals: number;
  category: 'PID' | 'DRIVE' | 'HYDRAULIC';
  defaultVisible: boolean;
  strokeDasharray?: string;
  strokeWidth?: number;
}

export const SCADA_TAG_CONFIGS: TagConfig[] = [
  {
    key: 'tankLevel',
    name: 'PV: Tank 1 Level',
    label: 'Level (PV)',
    address: 'IW64',
    unit: '%',
    color: '#10b981', // Emerald
    min: 0,
    max: 100,
    decimals: 1,
    category: 'PID',
    defaultVisible: true,
    strokeWidth: 2.5,
  },
  {
    key: 'tankSetpoint',
    name: 'SP: Level Setpoint',
    label: 'Setpoint (SP)',
    address: 'IW60',
    unit: '%',
    color: '#f59e0b', // Amber
    min: 0,
    max: 100,
    decimals: 1,
    category: 'PID',
    defaultVisible: true,
    strokeDasharray: '4 3',
    strokeWidth: 2,
  },
  {
    key: 'controlOutput',
    name: 'CV: Control Output',
    label: 'Valve / Pump (CV)',
    address: 'QW64',
    unit: '%',
    color: '#06b6d4', // Cyan
    min: 0,
    max: 100,
    decimals: 1,
    category: 'PID',
    defaultVisible: true,
    strokeWidth: 2,
  },
  {
    key: 'motorSpeed',
    name: 'SPEED: KM1 Motor',
    label: 'Motor Speed',
    address: 'MW10',
    unit: 'RPM',
    color: '#3b82f6', // Blue
    min: 0,
    max: 1800,
    decimals: 0,
    category: 'DRIVE',
    defaultVisible: true,
    strokeWidth: 2,
  },
  {
    key: 'motorTemp',
    name: 'TEMP: Motor Winding',
    label: 'Motor Temp',
    address: 'IW66',
    unit: '°C',
    color: '#f97316', // Orange
    min: 0,
    max: 120,
    decimals: 1,
    category: 'DRIVE',
    defaultVisible: false,
    strokeWidth: 2,
  },
  {
    key: 'pipePressure',
    name: 'PRESS: Pipe Line',
    label: 'Hydraulic Pressure',
    address: 'IW68',
    unit: 'Bar',
    color: '#a855f7', // Purple
    min: 0,
    max: 10,
    decimals: 2,
    category: 'HYDRAULIC',
    defaultVisible: false,
    strokeWidth: 2,
  },
  {
    key: 'pumpFlow',
    name: 'FLOW: Discharge Rate',
    label: 'Pump Flow',
    address: 'IW70',
    unit: 'L/min',
    color: '#ec4899', // Pink
    min: 0,
    max: 50,
    decimals: 1,
    category: 'HYDRAULIC',
    defaultVisible: false,
    strokeWidth: 2,
  },
  {
    key: 'motorCurrent',
    name: 'CURR: Drive Amperage',
    label: 'Motor Current',
    address: 'IW72',
    unit: 'A',
    color: '#e2e8f0', // Slate
    min: 0,
    max: 30,
    decimals: 1,
    category: 'DRIVE',
    defaultVisible: false,
    strokeWidth: 1.5,
  },
];

interface ScadaTrendChartProps {
  data: ScadaTrendPoint[];
  isPaused: boolean;
  onTogglePause: () => void;
  onInjectDisturbance?: () => void;
  title?: string;
  subtitle?: string;
  height?: number;
  showBrush?: boolean;
}

export const ScadaTrendChart: React.FC<ScadaTrendChartProps> = ({
  data,
  isPaused,
  onTogglePause,
  onInjectDisturbance,
  title = 'SCADA Process Multi-Pen Historian & Trend',
  subtitle = 'Real-time telemetry time-series visualization with Recharts dynamic scaling',
  height = 360,
  showBrush = true,
}) => {
  // Visible Pens state
  const [visiblePens, setVisiblePens] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SCADA_TAG_CONFIGS.forEach((tag) => {
      initial[tag.key] = tag.defaultVisible;
    });
    return initial;
  });

  // Scaling mode: 'normalized' (0-100%) or 'engineering' (Native Units)
  const [scaleMode, setScaleMode] = useState<'normalized' | 'engineering'>('normalized');

  // Curve interpolation type: 'monotone' | 'linear' | 'stepAfter'
  const [curveType, setCurveType] = useState<'monotone' | 'linear' | 'stepAfter'>('monotone');

  // Show Alarm reference threshold lines
  const [showAlarmLimits, setShowAlarmLimits] = useState<boolean>(true);

  // Time buffer window: 30 (last 30 pts), 60, 120, 300, 0 (all)
  const [windowSize, setWindowSize] = useState<number>(60);

  // Selected preset filter
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'PID' | 'DRIVE' | 'HYDRAULIC'>('ALL');

  // Filtered dataset according to window size
  const displayData = useMemo(() => {
    if (windowSize <= 0 || data.length <= windowSize) {
      return data;
    }
    return data.slice(data.length - windowSize);
  }, [data, windowSize]);

  // Normalized data for single 0-100% chart axis view if in normalized mode
  const chartData = useMemo(() => {
    if (scaleMode === 'engineering') {
      return displayData;
    }

    // In normalized mode, normalize each tag to 0-100% based on its min/max
    return displayData.map((pt) => {
      const normalizedPoint: any = {
        timestamp: pt.timestamp,
        timeStr: pt.timeStr,
        raw: pt,
      };

      SCADA_TAG_CONFIGS.forEach((cfg) => {
        const val = pt[cfg.key];
        if (typeof val === 'number') {
          const span = cfg.max - cfg.min || 1;
          const normalized = Math.max(0, Math.min(100, ((val - cfg.min) / span) * 100));
          normalizedPoint[cfg.key] = Math.round(normalized * 10) / 10;
        }
      });

      return normalizedPoint;
    });
  }, [displayData, scaleMode]);

  // Tag summary stats over current display window
  const tagStatistics = useMemo(() => {
    const stats: Record<
      string,
      { min: number; max: number; avg: number; current: number; count: number }
    > = {};

    if (displayData.length === 0) return stats;

    SCADA_TAG_CONFIGS.forEach((cfg) => {
      const values = displayData
        .map((d) => d[cfg.key])
        .filter((v): v is number => typeof v === 'number');

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const sum = values.reduce((acc, v) => acc + v, 0);
        const avg = sum / values.length;
        const current = values[values.length - 1];

        stats[cfg.key] = {
          min: Math.round(min * 100) / 100,
          max: Math.round(max * 100) / 100,
          avg: Math.round(avg * 100) / 100,
          current: Math.round(current * 100) / 100,
          count: values.length,
        };
      }
    });

    return stats;
  }, [displayData]);

  // Toggle pen visibility
  const togglePen = (key: string) => {
    setVisiblePens((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Preset Handlers
  const handleApplyPreset = (preset: 'PID' | 'DRIVE' | 'HYDRAULIC' | 'ALL' | 'NONE') => {
    const next: Record<string, boolean> = {};
    SCADA_TAG_CONFIGS.forEach((cfg) => {
      if (preset === 'ALL') next[cfg.key] = true;
      else if (preset === 'NONE') next[cfg.key] = false;
      else next[cfg.key] = cfg.category === preset;
    });
    setVisiblePens(next);
  };

  // Export CSV of historical trend data
  const handleExportCsv = () => {
    if (data.length === 0) return;

    const headers = ['Timestamp', 'Time', ...SCADA_TAG_CONFIGS.map((t) => `${t.name} (${t.unit})`)];
    const rows = data.map((d) => [
      d.timestamp,
      d.timeStr,
      ...SCADA_TAG_CONFIGS.map((t) => d[t.key]),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SCADA_Trend_Telemetry_${new Date().toISOString().slice(0, 19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Header & Telemetry Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 ${
                    isPaused
                      ? 'bg-amber-950 text-amber-300 border border-amber-700 font-bold'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                    }`}
                  />
                  {isPaused ? 'RECORDER PAUSED' : 'LIVE STREAMING'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {displayData.length} pts recorded
                </span>
              </h2>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume Button */}
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isPaused ? 'Resume live recording' : 'Pause chart to inspect values'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Stream' : 'Pause Trend'}</span>
          </button>

          {/* Load Disturbance Injection (if callback provided) */}
          {onInjectDisturbance && (
            <button
              onClick={onInjectDisturbance}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer"
              title="Inject abrupt load disturbance to test PID recovery response"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Step Disturbance</span>
            </button>
          )}

          {/* Time Window Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <span className="text-[10px] text-slate-400 px-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Window:</span>
            </span>
            {[
              { label: '30s', val: 30 },
              { label: '1m', val: 60 },
              { label: '3m', val: 180 },
              { label: 'All', val: 0 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setWindowSize(opt.val)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  windowSize === opt.val
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Scale Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setScaleMode('normalized')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                scaleMode === 'normalized'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Normalize all process tags to 0-100% scale for easy comparison"
            >
              % Unified
            </button>
            <button
              onClick={() => setScaleMode('engineering')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                scaleMode === 'engineering'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show native engineering units"
            >
              Native Units
            </button>
          </div>

          {/* Interpolation Style */}
          <select
            value={curveType}
            onChange={(e) => setCurveType(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="monotone">Smooth Spline</option>
            <option value="linear">Linear Trace</option>
            <option value="stepAfter">Stepped Logic</option>
          </select>

          {/* Alarm Limits Toggle */}
          <button
            onClick={() => setShowAlarmLimits(!showAlarmLimits)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              showAlarmLimits
                ? 'bg-rose-950/70 border-rose-700 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Alarm Threshold Lines (HH, H, LL)"
          >
            <span>Alarm Limits</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCsv}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Export full historical trend data to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Multi-Pen Selector & Channel Dashboard */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Telemetry Pen Matrix & Live Readings
            </span>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 mr-1">Presets:</span>
            <button
              onClick={() => handleApplyPreset('PID')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-mono cursor-pointer"
            >
              PID Trio
            </button>
            <button
              onClick={() => handleApplyPreset('DRIVE')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 font-mono cursor-pointer"
            >
              Drive Motor
            </button>
            <button
              onClick={() => handleApplyPreset('HYDRAULIC')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 font-mono cursor-pointer"
            >
              Hydraulics
            </button>
            <button
              onClick={() => handleApplyPreset('ALL')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono cursor-pointer"
            >
              All
            </button>
            <button
              onClick={() => handleApplyPreset('NONE')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-mono cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tag Pill Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {SCADA_TAG_CONFIGS.map((cfg) => {
            const isVisible = visiblePens[cfg.key];
            const stats = tagStatistics[cfg.key];
            const currentValue = stats ? stats.current : displayData[displayData.length - 1]?.[cfg.key] ?? '-';

            return (
              <button
                key={cfg.key}
                onClick={() => togglePen(cfg.key)}
                style={{
                  borderColor: isVisible ? cfg.color : '#334155',
                  backgroundColor: isVisible ? `${cfg.color}15` : '#020617',
                }}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                  isVisible ? 'shadow-sm' : 'opacity-60 hover:opacity-90'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {cfg.address}
                  </span>
                  {isVisible ? (
                    <Eye className="w-3 h-3 text-slate-300" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-slate-600" />
                  )}
                </div>

                <div className="font-bold text-[11px] text-slate-200 truncate" title={cfg.name}>
                  {cfg.label}
                </div>

                <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-slate-800/60 font-mono">
                  <span className="text-xs font-extrabold" style={{ color: isVisible ? cfg.color : '#94a3b8' }}>
                    {typeof currentValue === 'number'
                      ? currentValue.toFixed(cfg.decimals)
                      : currentValue}
                  </span>
                  <span className="text-[10px] text-slate-400">{cfg.unit}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="relative bg-slate-950 rounded-xl border border-slate-800/80 p-3 pt-4 shadow-inner">
        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Activity className="w-8 h-8 text-slate-600 animate-pulse mb-2" />
            <span>Awaiting telemetry stream data points...</span>
          </div>
        ) : (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />

                <XAxis
                  dataKey="timeStr"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={{ stroke: '#334155' }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={{ stroke: '#334155' }}
                  domain={scaleMode === 'normalized' ? [0, 100] : ['auto', 'auto']}
                  unit={scaleMode === 'normalized' ? '%' : undefined}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const rawPoint = payload[0]?.payload?.raw || payload[0]?.payload;

                    return (
                      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 font-mono text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            <Clock className="w-3 h-3" />
                            {label}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {rawPoint?.timestamp ? new Date(rawPoint.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {payload.map((entry: any) => {
                            const cfg = SCADA_TAG_CONFIGS.find((c) => c.key === entry.dataKey);
                            if (!cfg) return null;

                            const actualVal = rawPoint ? rawPoint[cfg.key] : entry.value;

                            return (
                              <div
                                key={entry.dataKey}
                                className="flex items-center justify-between gap-3 text-[11px]"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: cfg.color }}
                                  />
                                  <span className="text-slate-300 font-medium truncate">
                                    {cfg.label}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-500">
                                    [{cfg.address}]
                                  </span>
                                </div>
                                <div className="font-mono font-bold text-right shrink-0">
                                  <span style={{ color: cfg.color }}>
                                    {typeof actualVal === 'number'
                                      ? actualVal.toFixed(cfg.decimals)
                                      : actualVal}
                                  </span>
                                  <span className="text-slate-400 ml-1 text-[10px]">
                                    {cfg.unit}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Alarm Threshold Reference Lines (Level Tank reference) */}
                {showAlarmLimits && (
                  <>
                    <ReferenceLine
                      y={92}
                      stroke="#f43f5e"
                      strokeDasharray="4 2"
                      strokeWidth={1.5}
                      label={{
                        value: 'High-High Limit (92%)',
                        fill: '#f43f5e',
                        fontSize: 9,
                        position: 'insideTopRight',
                      }}
                    />
                    <ReferenceLine
                      y={80}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{
                        value: 'High Limit (80%)',
                        fill: '#f59e0b',
                        fontSize: 9,
                        position: 'insideTopRight',
                      }}
                    />
                    <ReferenceLine
                      y={5}
                      stroke="#e11d48"
                      strokeDasharray="4 2"
                      strokeWidth={1}
                      label={{
                        value: 'Low-Low Limit (5%)',
                        fill: '#e11d48',
                        fontSize: 9,
                        position: 'insideBottomRight',
                      }}
                    />
                  </>
                )}

                {/* Render Selected Dynamic Lines */}
                {SCADA_TAG_CONFIGS.map((cfg) => {
                  if (!visiblePens[cfg.key]) return null;

                  return (
                    <Line
                      key={cfg.key}
                      type={curveType}
                      dataKey={cfg.key}
                      name={cfg.label}
                      stroke={cfg.color}
                      strokeWidth={cfg.strokeWidth || 2}
                      strokeDasharray={cfg.strokeDasharray}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 1, stroke: '#ffffff' }}
                      isAnimationActive={false} // Disabled for high-frequency 200ms real-time fluidity
                    />
                  );
                })}

                {/* Optional Interactive Range Brush at bottom */}
                {showBrush && chartData.length > 20 && (
                  <Brush
                    dataKey="timeStr"
                    height={22}
                    stroke="#3b82f6"
                    fill="#020617"
                    tickFormatter={() => ''}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Real-time Statistics Summary Table Strip */}
      <div className="overflow-x-auto bg-slate-950/60 rounded-lg border border-slate-800/80 p-3">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Channel Min / Max / Average Telemetry Statistics</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono lowercase">
            computed over {displayData.length} live samples
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
          {SCADA_TAG_CONFIGS.filter((cfg) => visiblePens[cfg.key]).map((cfg) => {
            const stats = tagStatistics[cfg.key];
            if (!stats) return null;

            return (
              <div
                key={cfg.key}
                className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg font-mono text-[11px]"
              >
                <div className="flex items-center gap-1 font-bold text-slate-300 truncate mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="truncate">{cfg.label}</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Current:</span>
                    <span className="font-bold" style={{ color: cfg.color }}>
                      {stats.current.toFixed(cfg.decimals)} {cfg.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Min:</span>
                    <span>{stats.min.toFixed(cfg.decimals)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Max:</span>
                    <span>{stats.max.toFixed(cfg.decimals)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Avg:</span>
                    <span>{stats.avg.toFixed(cfg.decimals)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
