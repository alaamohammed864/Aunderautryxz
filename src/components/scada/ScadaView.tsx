import React, { useState, useEffect } from 'react';
import {
  PlcMemoryState,
  ProcessTrendDataPoint,
  ScadaTag,
  SimulationMode,
} from '../../types';
import {
  Activity,
  Sliders,
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle,
  TrendingUp,
  Flame,
  Layers,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldAlert,
  Radio,
  Tag,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  AlarmManagement,
  ActiveAlarm,
  HistoricalAlarmLog,
  AlarmSeverity,
  AlarmCondition,
} from './AlarmManagement';
import {
  ScadaTrendChart,
  ScadaTrendPoint,
  SCADA_TAG_CONFIGS,
} from './ScadaTrendChart';

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
  // Main SCADA Tabs
  const [activeScadaTab, setActiveScadaTab] = useState<'pid' | 'trends' | 'alarms' | 'tags'>('pid');

  // Audio siren silence state
  const [isAudioSilenced, setIsAudioSilenced] = useState<boolean>(false);

  // PID Controller States
  const [sp, setSp] = useState<number>(65.0);
  const [pv, setPv] = useState<number>(20.0);
  const [cv, setCv] = useState<number>(0.0);
  const [kp, setKp] = useState<number>(2.5);
  const [ki, setKi] = useState<number>(0.8);
  const [kd, setKd] = useState<number>(0.2);
  const [isAuto, setIsAuto] = useState<boolean>(true);

  // Additional Process Variables for Telemetry & Alarm simulation
  const [motorSpeed, setMotorSpeed] = useState<number>(0);
  const [motorTemp, setMotorTemp] = useState<number>(45.0);
  const [pipePressure, setPipePressure] = useState<number>(4.2);
  const [pumpFlow, setPumpFlow] = useState<number>(28.5);
  const [motorCurrent, setMotorCurrent] = useState<number>(12.4);
  const [eStopTripped, setEStopTripped] = useState<boolean>(false);
  const [overloadTripped, setOverloadTripped] = useState<boolean>(false);

  // Live Historian Trend points (up to 300 samples)
  const [trendHistory, setTrendHistory] = useState<ScadaTrendPoint[]>(() => {
    // Generate initial baseline points
    const now = Date.now();
    const initial: ScadaTrendPoint[] = [];
    for (let i = 20; i >= 0; i--) {
      const t = now - i * 1000;
      initial.push({
        timestamp: t,
        timeStr: new Date(t).toLocaleTimeString(),
        tankLevel: 20.0 + (20 - i) * 1.5,
        tankSetpoint: 65.0,
        controlOutput: 45.0,
        motorSpeed: 650,
        motorTemp: 44.0 + (20 - i) * 0.1,
        pipePressure: 4.1 + Math.sin(i * 0.3) * 0.2,
        pumpFlow: 28.0 + Math.cos(i * 0.3) * 1.2,
        motorCurrent: 12.2,
      });
    }
    return initial;
  });

  // Trend pause status (freeze view for inspection without stopping backend telemetry)
  const [isTrendPaused, setIsTrendPaused] = useState<boolean>(false);

  // Active Alarms & Historical Event Log State
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([
    {
      id: 'alm_init_1',
      tagId: 'tag_temp',
      tagName: 'TEMP_MOTOR1',
      address: 'IW66',
      condition: 'HIGH',
      severity: 'HIGH',
      state: 'ACTIVE_UNACK',
      message: 'Motor winding temperature elevated (78.2°C)',
      triggerValue: 78.2,
      thresholdValue: 75.0,
      unit: '°C',
      timestamp: Date.now() - 45000,
      formattedTime: new Date(Date.now() - 45000).toLocaleTimeString(),
    },
  ]);

  const [historicalLogs, setHistoricalLogs] = useState<HistoricalAlarmLog[]>([
    {
      id: 'log_init_1',
      alarmId: 'alm_init_1',
      tagId: 'tag_temp',
      tagName: 'TEMP_MOTOR1',
      address: 'IW66',
      eventType: 'RAISED',
      condition: 'HIGH',
      severity: 'HIGH',
      value: 78.2,
      threshold: 75.0,
      unit: '°C',
      message: 'Motor winding temperature exceeded High threshold (75°C)',
      timestamp: Date.now() - 45000,
      formattedTime: new Date(Date.now() - 45000).toLocaleTimeString(),
      operator: 'SYSTEM',
    },
    {
      id: 'log_init_2',
      alarmId: 'alm_prev_level',
      tagId: 'tag_level',
      tagName: 'LEVEL_TANK1',
      address: 'IW64',
      eventType: 'CLEARED',
      condition: 'LOW',
      severity: 'MEDIUM',
      value: 22.0,
      threshold: 15.0,
      unit: '%',
      message: 'Tank level returned to safe operating zone',
      timestamp: Date.now() - 120000,
      formattedTime: new Date(Date.now() - 120000).toLocaleTimeString(),
      operator: 'OPERATOR_1',
    },
  ]);

  // SCADA Monitored Tags definition
  const scadaTags: ScadaTag[] = [
    {
      id: 'tag_level',
      name: 'LEVEL_TANK1',
      address: 'IW64',
      dataType: 'REAL',
      unit: '%',
      currentValue: Math.round(pv * 10) / 10,
      minVal: 0,
      maxVal: 100,
      alarmLowLow: 5,
      alarmLow: 15,
      alarmHigh: 80,
      alarmHighHigh: 92,
      alarmState: pv >= 92 ? 'HIGH_HIGH' : pv >= 80 ? 'HIGH' : pv <= 5 ? 'LOW_LOW' : pv <= 15 ? 'LOW' : 'NORMAL',
    },
    {
      id: 'tag_speed',
      name: 'SPEED_MOTOR1',
      address: 'MW10',
      dataType: 'INT',
      unit: 'RPM',
      currentValue: motorSpeed,
      minVal: 0,
      maxVal: 1800,
      alarmHigh: 1600,
      alarmHighHigh: 1750,
      alarmState: motorSpeed >= 1750 ? 'HIGH_HIGH' : motorSpeed >= 1600 ? 'HIGH' : 'NORMAL',
    },
    {
      id: 'tag_temp',
      name: 'TEMP_MOTOR1',
      address: 'IW66',
      dataType: 'REAL',
      unit: '°C',
      currentValue: Math.round(motorTemp * 10) / 10,
      minVal: 0,
      maxVal: 120,
      alarmHigh: 75,
      alarmHighHigh: 90,
      alarmState: motorTemp >= 90 ? 'HIGH_HIGH' : motorTemp >= 75 ? 'HIGH' : 'NORMAL',
    },
    {
      id: 'tag_pressure',
      name: 'PRESSURE_PIPE',
      address: 'IW68',
      dataType: 'REAL',
      unit: 'Bar',
      currentValue: Math.round(pipePressure * 10) / 10,
      minVal: 0,
      maxVal: 10,
      alarmLow: 1.5,
      alarmHigh: 7.0,
      alarmHighHigh: 8.2,
      alarmState: pipePressure >= 8.2 ? 'HIGH_HIGH' : pipePressure >= 7.0 ? 'HIGH' : pipePressure <= 1.5 ? 'LOW' : 'NORMAL',
    },
    {
      id: 'tag_flow',
      name: 'FLOW_PUMP',
      address: 'IW70',
      dataType: 'REAL',
      unit: 'L/min',
      currentValue: Math.round(pumpFlow * 10) / 10,
      minVal: 0,
      maxVal: 50,
      alarmLowLow: 2.0,
      alarmHigh: 45.0,
      alarmState: pumpFlow >= 45.0 ? 'HIGH' : pumpFlow <= 2.0 ? 'LOW_LOW' : 'NORMAL',
    },
    {
      id: 'tag_current',
      name: 'MOTOR_CURRENT',
      address: 'IW72',
      dataType: 'REAL',
      unit: 'A',
      currentValue: Math.round(motorCurrent * 10) / 10,
      minVal: 0,
      maxVal: 30,
      alarmHigh: 18.0,
      alarmHighHigh: 24.0,
      alarmState: motorCurrent >= 24.0 ? 'HIGH_HIGH' : motorCurrent >= 18.0 ? 'HIGH' : 'NORMAL',
    },
    {
      id: 'tag_estop',
      name: 'ESTOP_TRIP',
      address: 'I0.2',
      dataType: 'BOOL',
      unit: 'STATE',
      currentValue: eStopTripped,
      minVal: 0,
      maxVal: 1,
      alarmState: eStopTripped ? 'FAULT' : 'NORMAL',
    },
    {
      id: 'tag_overload',
      name: 'OVERLOAD_F2',
      address: 'I0.3',
      dataType: 'BOOL',
      unit: 'STATE',
      currentValue: overloadTripped,
      minVal: 0,
      maxVal: 1,
      alarmState: overloadTripped ? 'FAULT' : 'NORMAL',
    },
  ];

  // Helper to raise alarm if not already active
  const triggerAlarm = (
    tagId: string,
    tagName: string,
    address: string,
    condition: AlarmCondition,
    severity: AlarmSeverity,
    message: string,
    val: number | boolean,
    threshold?: number | boolean,
    unit?: string
  ) => {
    setActiveAlarms((prev) => {
      const existing = prev.find((a) => a.tagId === tagId && a.condition === condition);
      if (existing) return prev; // Already active

      const newAlarmId = `alm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newAlarm: ActiveAlarm = {
        id: newAlarmId,
        tagId,
        tagName,
        address,
        condition,
        severity,
        state: 'ACTIVE_UNACK',
        message,
        triggerValue: val,
        thresholdValue: threshold,
        unit,
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString(),
      };

      // Add to historical sequence of events
      setHistoricalLogs((h) => [
        {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          alarmId: newAlarmId,
          tagId,
          tagName,
          address,
          eventType: 'RAISED',
          condition,
          severity,
          value: val,
          threshold,
          unit,
          message,
          timestamp: Date.now(),
          formattedTime: new Date().toLocaleTimeString(),
          operator: 'SYSTEM',
        },
        ...h.slice(0, 199),
      ]);

      return [newAlarm, ...prev];
    });
  };

  // Helper to clear alarm if condition returned to normal
  const clearAlarm = (tagId: string, condition?: AlarmCondition) => {
    setActiveAlarms((prev) => {
      const matching = prev.filter(
        (a) => a.tagId === tagId && (!condition || a.condition === condition)
      );
      if (matching.length === 0) return prev;

      matching.forEach((m) => {
        setHistoricalLogs((h) => [
          {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            alarmId: m.id,
            tagId: m.tagId,
            tagName: m.tagName,
            address: m.address,
            eventType: 'CLEARED',
            condition: m.condition,
            severity: m.severity,
            value: m.triggerValue,
            threshold: m.thresholdValue,
            unit: m.unit,
            message: `${m.tagName} returned to normal operating range`,
            timestamp: Date.now(),
            formattedTime: new Date().toLocaleTimeString(),
            operator: 'SYSTEM',
          },
          ...h.slice(0, 199),
        ]);
      });

      return prev.filter((a) => !(a.tagId === tagId && (!condition || a.condition === condition)));
    });
  };

  // Acknowledge single alarm
  const handleAcknowledgeAlarm = (alarmId: string) => {
    setActiveAlarms((prev) =>
      prev.map((a) => {
        if (a.id === alarmId) {
          const updated: ActiveAlarm = {
            ...a,
            state: a.state === 'ACTIVE_UNACK' ? 'ACTIVE_ACK' : 'CLEARED_ACK',
            ackTimestamp: Date.now(),
            ackBy: 'OPERATOR_MAIN',
          };

          setHistoricalLogs((h) => [
            {
              id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              alarmId: a.id,
              tagId: a.tagId,
              tagName: a.tagName,
              address: a.address,
              eventType: 'ACKNOWLEDGED',
              condition: a.condition,
              severity: a.severity,
              value: a.triggerValue,
              unit: a.unit,
              message: `Alarm acknowledged by Operator`,
              timestamp: Date.now(),
              formattedTime: new Date().toLocaleTimeString(),
              operator: 'OPERATOR_MAIN',
            },
            ...h.slice(0, 199),
          ]);

          return updated;
        }
        return a;
      })
    );
  };

  // Acknowledge all alarms
  const handleAcknowledgeAll = () => {
    setActiveAlarms((prev) =>
      prev.map((a) => ({
        ...a,
        state: 'ACTIVE_ACK',
        ackTimestamp: Date.now(),
        ackBy: 'OPERATOR_MAIN',
      }))
    );

    setHistoricalLogs((h) => [
      {
        id: `log_${Date.now()}_ackall`,
        alarmId: 'all',
        tagId: 'GLOBAL',
        tagName: 'SCADA_GLOBAL',
        address: 'SYS',
        eventType: 'ACKNOWLEDGED',
        condition: 'DEVIATION',
        severity: 'INFO',
        value: true,
        message: 'All active alarms acknowledged by Operator',
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString(),
        operator: 'OPERATOR_MAIN',
      },
      ...h.slice(0, 199),
    ]);
  };

  // Fault simulation injection
  const handleSimulateFault = (faultType: string) => {
    if (faultType === 'TANK_HIGH_HIGH') {
      setPv(96.5);
      triggerAlarm(
        'tag_level',
        'LEVEL_TANK1',
        'IW64',
        'HIGH_HIGH',
        'CRITICAL',
        'CRITICAL: Tank 1 Liquid Overflow Risk (>92%)',
        96.5,
        92.0,
        '%'
      );
    } else if (faultType === 'MOTOR_OVERTEMP') {
      setMotorTemp(92.4);
      triggerAlarm(
        'tag_temp',
        'TEMP_MOTOR1',
        'IW66',
        'HIGH_HIGH',
        'CRITICAL',
        'CRITICAL: Main Drive Motor Overheating (>90°C)',
        92.4,
        90.0,
        '°C'
      );
    } else if (faultType === 'PRESSURE_SURGE') {
      setPipePressure(8.6);
      triggerAlarm(
        'tag_pressure',
        'PRESSURE_PIPE',
        'IW68',
        'HIGH_HIGH',
        'HIGH',
        'WARNING: Hydraulic pipe pressure surge detected (>8.2 Bar)',
        8.6,
        8.2,
        'Bar'
      );
    } else if (faultType === 'ESTOP_TRIP') {
      setEStopTripped(true);
      triggerAlarm(
        'tag_estop',
        'ESTOP_TRIP',
        'I0.2',
        'DIGITAL_TRIP',
        'CRITICAL',
        'EMERGENCY STOP BUTTON PRESSED - Production Cell Tripped',
        true,
        true
      );
    } else if (faultType === 'OVERLOAD_TRIP') {
      setOverloadTripped(true);
      triggerAlarm(
        'tag_overload',
        'OVERLOAD_F2',
        'I0.3',
        'DIGITAL_TRIP',
        'HIGH',
        'Thermal Overload Relay F2 Tripped - Motor Circuit Open',
        true,
        true
      );
    }
  };

  const handleResetAllFaults = () => {
    setEStopTripped(false);
    setOverloadTripped(false);
    setMotorTemp(45.0);
    setPipePressure(4.2);
    setPumpFlow(28.5);
    setPv(sp);

    clearAlarm('tag_estop');
    clearAlarm('tag_overload');
    clearAlarm('tag_temp');
    clearAlarm('tag_pressure');
    clearAlarm('tag_level');
  };

  // Simulate PID loop dynamics & tag threshold triggers
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

        // Derived numeric tag calculations for plant telemetry
        const rpm = Math.round((output / 100) * 1450 + (output > 0 ? (Math.random() * 12 - 6) : 0));
        setMotorSpeed(Math.max(0, rpm));

        const temp = Math.round((42 + (output / 100) * 36 + (Math.random() * 0.4 - 0.2)) * 10) / 10;
        setMotorTemp(temp);

        const press = Math.round((1.8 + (newPv / 100) * 5.2 + Math.sin(Date.now() / 2500) * 0.2) * 100) / 100;
        setPipePressure(press);

        const flow = Math.round((Math.max(0, (output / 100) * 44 + (Math.random() * 1.0 - 0.5))) * 10) / 10;
        setPumpFlow(flow);

        const current = Math.round((6.0 + (output / 100) * 16.5 + (Math.random() * 0.4 - 0.2)) * 10) / 10;
        setMotorCurrent(current);

        // Sync to memory register IW64
        onSetNumeric('IW64', Math.round(newPv));

        // Evaluate Level Alarms dynamically
        if (newPv >= 92) {
          triggerAlarm(
            'tag_level',
            'LEVEL_TANK1',
            'IW64',
            'HIGH_HIGH',
            'CRITICAL',
            'CRITICAL: Tank 1 Level Exceeded High-High Limit (92%)',
            Math.round(newPv * 10) / 10,
            92,
            '%'
          );
        } else if (newPv >= 80) {
          triggerAlarm(
            'tag_level',
            'LEVEL_TANK1',
            'IW64',
            'HIGH',
            'HIGH',
            'Tank 1 Level Exceeded High Threshold (80%)',
            Math.round(newPv * 10) / 10,
            80,
            '%'
          );
        } else if (newPv <= 5) {
          triggerAlarm(
            'tag_level',
            'LEVEL_TANK1',
            'IW64',
            'LOW_LOW',
            'HIGH',
            'Tank 1 Level Below Critical Low Limit (5%)',
            Math.round(newPv * 10) / 10,
            5,
            '%'
          );
        } else {
          clearAlarm('tag_level');
        }

        // Append to Trend history if not paused
        setTrendHistory((prev) => {
          if (isTrendPaused) return prev;

          const now = Date.now();
          const nextPoint: ScadaTrendPoint = {
            timestamp: now,
            timeStr: new Date(now).toLocaleTimeString(),
            tankLevel: Math.round(newPv * 10) / 10,
            tankSetpoint: sp,
            controlOutput: Math.round(output * 10) / 10,
            motorSpeed: Math.max(0, rpm),
            motorTemp: temp,
            pipePressure: press,
            pumpFlow: flow,
            motorCurrent: current,
          };
          const slice = [...prev, nextPoint];
          if (slice.length > 300) slice.shift();
          return slice;
        });

        return newPv;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [sp, kp, ki, kd, isAuto, simulationMode, cv, isTrendPaused]);

  const injectDisturbance = () => {
    setPv((prev) => Math.max(0, prev - 25));
  };

  const unackCriticalCount = activeAlarms.filter(
    (a) => (a.state === 'ACTIVE_UNACK' || a.state === 'CLEARED_UNACK') && (a.severity === 'CRITICAL' || a.severity === 'HIGH')
  ).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 select-none">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Header & Visual Alarm Flash Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
              unackCriticalCount > 0
                ? 'bg-rose-950 border-rose-600 text-rose-400 animate-pulse'
                : 'bg-blue-950 border-blue-800 text-blue-400'
            }`}>
              {unackCriticalCount > 0 ? <BellRing className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>SCADA SUPERVISORY & ALARM MANAGEMENT</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  Online
                </span>
                {activeAlarms.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                    {activeAlarms.length} Active Alarms
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                Continuous telemetry recorder, closed-loop PID tuning, and plant-wide alarm matrix
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
              onClick={handleAcknowledgeAll}
              disabled={activeAlarms.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ack Alarms</span>
            </button>
          </div>
        </div>

        {/* Dynamic Critical Alarm Flash Banner */}
        {unackCriticalCount > 0 && (
          <div className="bg-rose-950/80 border-2 border-rose-600 rounded-xl p-3.5 shadow-lg shadow-rose-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-300 shrink-0 animate-bounce" />
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-rose-200 flex items-center gap-2">
                  <span>PLANT ALARM CONDITION DETECTED</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[10px]">
                    {unackCriticalCount} Critical/High
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-0.5">
                  Process limits exceeded. Check telemetry readings and acknowledge alarms in the Alarms tab.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => setActiveScadaTab('alarms')}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow cursor-pointer transition-all"
              >
                Inspect Alarms
              </button>
              <button
                onClick={handleAcknowledgeAll}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-rose-700 font-semibold text-xs cursor-pointer transition-all"
              >
                Ack All
              </button>
            </div>
          </div>
        )}

        {/* Primary SCADA Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveScadaTab('pid')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeScadaTab === 'pid'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Supervisory & Closed-Loop PID</span>
          </button>

          <button
            onClick={() => setActiveScadaTab('trends')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeScadaTab === 'trends'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <LineChartIcon className="w-4 h-4 text-emerald-400" />
            <span>Telemetry Historian (Recharts)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveScadaTab('alarms')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeScadaTab === 'alarms'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Bell className={`w-4 h-4 ${activeAlarms.length > 0 ? 'text-rose-400' : ''}`} />
            <span>Alarms & Sequence of Events</span>
            {activeAlarms.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-mono font-extrabold">
                {activeAlarms.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveScadaTab('tags')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeScadaTab === 'tags'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>SCADA Tag Matrix ({scadaTags.length})</span>
          </button>
        </div>

        {/* Tab 1: Supervisory & PID Tuning View */}
        {activeScadaTab === 'pid' && (
          <div className="space-y-5">
            {/* Live Recharts Process Trend Chart */}
            <ScadaTrendChart
              data={trendHistory}
              isPaused={isTrendPaused}
              onTogglePause={() => setIsTrendPaused(!isTrendPaused)}
              onInjectDisturbance={injectDisturbance}
              title="Live SCADA Multi-Pen Process Trend"
              subtitle="Closed-loop PID response, level sensors, and actuator output telemetry"
              height={320}
              showBrush={false}
            />

            {/* PID Loop Parameter Tuner & Quick Annunciator Summary */}
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

              {/* Quick Plant Alarms Mini Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-xs uppercase tracking-wider text-white">
                        Active Plant Alarms
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveScadaTab('alarms')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      Open Full Alarms Studio &rarr;
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeAlarms.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center">
                        <CheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
                        <span>All monitored tags normal.</span>
                      </div>
                    ) : (
                      activeAlarms.slice(0, 3).map((alm) => (
                        <div
                          key={alm.id}
                          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                            alm.state === 'ACTIVE_UNACK'
                              ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 font-bold">
                              <span className="font-mono text-cyan-400">{alm.tagName}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                                  alm.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-slate-950'
                                }`}
                              >
                                {alm.severity}
                              </span>
                            </div>
                            <p className="mt-0.5 text-slate-300 line-clamp-1">{alm.message}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap ml-2">
                            {alm.formattedTime}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Telemetry Polling: 100ms</span>
                  <span className="font-mono text-emerald-400">Status: Deterministic</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Telemetry Historian & Multi-Tag Analyzer */}
        {activeScadaTab === 'trends' && (
          <div className="space-y-5">
            <ScadaTrendChart
              data={trendHistory}
              isPaused={isTrendPaused}
              onTogglePause={() => setIsTrendPaused(!isTrendPaused)}
              onInjectDisturbance={injectDisturbance}
              title="SCADA Plant-Wide Multi-Tag Historian & Live Trends"
              subtitle="Interactive high-resolution Recharts line series for analog tags, drives, pressures, and control loops"
              height={460}
              showBrush={true}
            />

            {/* Numeric Tag Live Matrix Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {SCADA_TAG_CONFIGS.map((cfg) => {
                const latest = trendHistory[trendHistory.length - 1];
                const rawVal = latest ? latest[cfg.key] : 0;
                const pct = Math.max(0, Math.min(100, ((rawVal - cfg.min) / (cfg.max - cfg.min || 1)) * 100));

                return (
                  <div
                    key={cfg.key}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-200 truncate">{cfg.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-950 text-slate-400 rounded border border-slate-800">
                        {cfg.address}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between font-mono my-1">
                      <span className="text-2xl font-black" style={{ color: cfg.color }}>
                        {typeof rawVal === 'number' ? rawVal.toFixed(cfg.decimals) : rawVal}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{cfg.unit}</span>
                    </div>

                    {/* Progress Fill Bar */}
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-2 border border-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cfg.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>{cfg.min} {cfg.unit}</span>
                      <span>{cfg.max} {cfg.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Full Alarm Management Studio */}
        {activeScadaTab === 'alarms' && (
          <AlarmManagement
            activeAlarms={activeAlarms}
            historicalLogs={historicalLogs}
            tags={scadaTags}
            onAcknowledgeAlarm={handleAcknowledgeAlarm}
            onAcknowledgeAll={handleAcknowledgeAll}
            onClearHistoricalLogs={() => setHistoricalLogs([])}
            onSimulateFault={handleSimulateFault}
            onResetAllFaults={handleResetAllFaults}
            isAudioSilenced={isAudioSilenced}
            onToggleAudioSilence={() => setIsAudioSilenced(!isAudioSilenced)}
          />
        )}

        {/* Tab 3: Tag Matrix & Threshold Configuration */}
        {activeScadaTab === 'tags' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">SCADA Tag Database & Alarm Limits</h3>
                <p className="text-xs text-slate-400">
                  Continuous scan telemetry tags mapped to PLC memory registers and field instrumentation
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-1 rounded">
                Total Tags: {scadaTags.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="p-3">Tag Name</th>
                    <th className="p-3">PLC Address</th>
                    <th className="p-3">Data Type</th>
                    <th className="p-3">Current Value</th>
                    <th className="p-3">Low-Low</th>
                    <th className="p-3">Low</th>
                    <th className="p-3">High</th>
                    <th className="p-3">High-High</th>
                    <th className="p-3">Alarm State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {scadaTags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold font-sans text-slate-200">{tag.name}</td>
                      <td className="p-3 text-blue-400">{tag.address}</td>
                      <td className="p-3 text-slate-400">{tag.dataType}</td>
                      <td className="p-3 font-bold text-emerald-400">
                        {String(tag.currentValue)} {tag.unit}
                      </td>
                      <td className="p-3 text-rose-400">{tag.alarmLowLow !== undefined ? `${tag.alarmLowLow} ${tag.unit}` : '-'}</td>
                      <td className="p-3 text-yellow-400">{tag.alarmLow !== undefined ? `${tag.alarmLow} ${tag.unit}` : '-'}</td>
                      <td className="p-3 text-yellow-400">{tag.alarmHigh !== undefined ? `${tag.alarmHigh} ${tag.unit}` : '-'}</td>
                      <td className="p-3 text-rose-400">{tag.alarmHighHigh !== undefined ? `${tag.alarmHighHigh} ${tag.unit}` : '-'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tag.alarmState === 'HIGH_HIGH' || tag.alarmState === 'FAULT'
                              ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                              : tag.alarmState === 'HIGH' || tag.alarmState === 'LOW'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {tag.alarmState}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
