import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppView,
  CircuitSimulationState,
  DigitalTwinProcessState,
  PlcDialect,
  PlcMemoryState,
  PlcProgram,
  SimulationMode,
  TwinLabProject,
  UserRole,
} from './types';
import { SAMPLE_PROJECTS } from './data/sampleProjects';
import { StorageService } from './services/storageService';
import { PlcSimulationEngine } from './engine/plc/plcEngine';
import { ElectricalCircuitEngine } from './engine/electrical/circuitEngine';
import { DigitalTwinEngine } from './engine/digitalTwin/digitalTwinEngine';
import { LanguageCode } from './i18n/translations';

// Subcomponents
import { Header } from './components/common/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { PlcLadderEditor } from './components/plc/PlcLadderEditor';
import { ElectricalSimulator } from './components/electrical/ElectricalSimulator';
import { Process3DView } from './components/digitalTwin/Process3DView';
import { HmiDesigner } from './components/hmi/HmiDesigner';
import { ScadaView } from './components/scada/ScadaView';
import { ClassroomView } from './components/classroom/ClassroomView';
import { AdminAnalyticsView } from './components/admin/AdminAnalyticsView';
import { DocsView } from './components/docs/DocsView';

export const App: React.FC = () => {
  // 1. Projects State
  const [projectsList, setProjectsList] = useState<TwinLabProject[]>(() => {
    return StorageService.loadAllProjects();
  });
  const [activeProject, setActiveProject] = useState<TwinLabProject>(() => {
    return projectsList[0] || SAMPLE_PROJECTS[0];
  });

  // 2. Navigation & User Preferences
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [plcDialect, setPlcDialect] = useState<PlcDialect>(activeProject.plc.dialect);

  // 3. Master Simulation Controls
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('RUN');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [scanStats, setScanStats] = useState<{ cycleTime: number; scanCount: number }>({
    cycleTime: 20,
    scanCount: 0,
  });

  // 4. Live Simulation Memory & Subsystem States
  const [plcMemory, setPlcMemory] = useState<PlcMemoryState>(() =>
    PlcSimulationEngine.createInitialMemory()
  );
  const [ladderProgram, setLadderProgram] = useState<PlcProgram>(activeProject.ladder);
  const [circuitState, setCircuitState] = useState<CircuitSimulationState>(activeProject.electrical);
  const [processState, setProcessState] = useState<DigitalTwinProcessState>(activeProject.process3d);
  const [hmiScreen, setHmiScreen] = useState(activeProject.hmi);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);

  // Global Uptime timer
  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  };

  // Keep references for high-speed simulation loop
  const memRef = useRef<PlcMemoryState>(plcMemory);
  memRef.current = plcMemory;
  const programRef = useRef<PlcProgram>(ladderProgram);
  programRef.current = ladderProgram;
  const circuitRef = useRef<CircuitSimulationState>(circuitState);
  circuitRef.current = circuitState;
  const processRef = useRef<DigitalTwinProcessState>(processState);
  processRef.current = processState;

  // Handler to manually update PLC bit / register
  const handleSetBit = useCallback((address: string, val: boolean) => {
    const updated = PlcSimulationEngine.setBit(memRef.current, address, val);
    setPlcMemory(updated);
  }, []);

  const handleSetNumeric = useCallback((address: string, val: number) => {
    const updated = PlcSimulationEngine.setDataRegister(memRef.current, address, val);
    setPlcMemory(updated);
  }, []);

  // Single step execution
  const handleStepSimulation = useCallback(() => {
    const deltaMs = 20;

    // 1. Solve Electrical Circuit
    const solvedCircuit = ElectricalCircuitEngine.solve(circuitRef.current);
    setCircuitState(solvedCircuit);

    // 2. Scan PLC Program
    const { updatedMemory, updatedProgram } = PlcSimulationEngine.executeScanCycle(
      memRef.current,
      programRef.current,
      deltaMs
    );
    setPlcMemory(updatedMemory);
    setLadderProgram(updatedProgram);

    // 3. Step 3D Process
    const getPlcOutput = (addr: string) => Boolean(updatedMemory.outputs[addr]);
    const setPlcInput = (addr: string, val: boolean) => {
      PlcSimulationEngine.setBit(updatedMemory, addr, val);
    };
    const updatedProcess = DigitalTwinEngine.stepProcess(
      processRef.current,
      deltaMs,
      getPlcOutput,
      setPlcInput
    );
    setProcessState(updatedProcess);

    setScanStats((prev) => ({ cycleTime: 20, scanCount: prev.scanCount + 1 }));
  }, []);

  // Master Deterministic Simulation Scan Loop (50Hz / 20ms base scan time)
  useEffect(() => {
    if (simulationMode !== 'RUN') return;

    const baseIntervalMs = 25 / (speedMultiplier || 1.0);
    const interval = setInterval(() => {
      const startTime = performance.now();
      const deltaMs = 25 * speedMultiplier;

      // 1. Solve Electrical Circuit
      const solvedCircuit = ElectricalCircuitEngine.solve(circuitRef.current);

      // 2. Link electrical component states to PLC inputs if mapped
      solvedCircuit.components.forEach((comp) => {
        if (comp.plcAddress && comp.type.startsWith('PUSH_BUTTON')) {
          PlcSimulationEngine.setBit(memRef.current, comp.plcAddress, Boolean(comp.state.closed));
        }
      });

      // 3. Scan PLC Ladder Logic Program
      const { updatedMemory, updatedProgram } = PlcSimulationEngine.executeScanCycle(
        memRef.current,
        programRef.current,
        deltaMs
      );

      // 4. Link PLC outputs back to Electrical contactors & lamps
      solvedCircuit.components.forEach((comp) => {
        if (comp.plcAddress && (comp.type === 'CONTACTOR_3P' || comp.type.startsWith('PILOT_LAMP'))) {
          const isOutputOn = Boolean(updatedMemory.outputs[comp.plcAddress]);
          comp.state.energized = isOutputOn;
          if (comp.type === 'CONTACTOR_3P') {
            comp.state.closed = isOutputOn;
          }
        }
      });

      // 5. Step 3D Process Engine
      const getPlcOutput = (addr: string) => Boolean(updatedMemory.outputs[addr]);
      const setPlcInput = (addr: string, val: boolean) => {
        PlcSimulationEngine.setBit(updatedMemory, addr, val);
      };

      const updatedProcess = DigitalTwinEngine.stepProcess(
        processRef.current,
        deltaMs,
        getPlcOutput,
        setPlcInput
      );

      // Sync state back to React
      setPlcMemory(updatedMemory);
      setLadderProgram(updatedProgram);
      setCircuitState(solvedCircuit);
      setProcessState(updatedProcess);

      const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
      setScanStats((prev) => ({
        cycleTime: elapsed || 20,
        scanCount: prev.scanCount + 1,
      }));
    }, baseIntervalMs);

    return () => clearInterval(interval);
  }, [simulationMode, speedMultiplier]);

  // Project Management Actions
  const handleSelectProject = (proj: TwinLabProject) => {
    setActiveProject(proj);
    setLadderProgram(proj.ladder);
    setCircuitState(proj.electrical);
    setProcessState(proj.process3d);
    setHmiScreen(proj.hmi);
    setPlcDialect(proj.plc.dialect);
    setPlcMemory(PlcSimulationEngine.createInitialMemory());
  };

  const handleSaveProject = () => {
    const updated: TwinLabProject = {
      ...activeProject,
      ladder: ladderProgram,
      electrical: circuitState,
      process3d: processState,
      hmi: hmiScreen,
      plc: { ...activeProject.plc, dialect: plcDialect },
      updatedAt: new Date().toISOString(),
    };
    StorageService.saveProject(updated);
    setActiveProject(updated);
    setProjectsList(StorageService.loadAllProjects());
  };

  const handleNewProject = () => {
    const newProj: TwinLabProject = {
      version: '1.0.0',
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: `Custom Automation Lab ${projectsList.length + 1}`,
      description: 'User-designed industrial automation project.',
      category: 'PLC',
      author: 'TwinLab Engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['PLC', 'Automation', 'Custom'],
      isPublic: true,
      likes: 0,
      forks: 0,
      plc: {
        model: 'Siemens S7-1200 CPU 1214C DC/DC/DC',
        dialect: 'siemens',
        scanTimeMs: 20,
      },
      ladder: {
        id: 'prog_new',
        name: 'Main [OB1]',
        dialect: 'siemens',
        scanTimeMs: 20,
        rungs: [
          {
            id: 'rung_1',
            rungNumber: 1,
            comment: 'Network 1: Master Control',
            mainBranch: [
              { id: 'e1', type: 'NO_CONTACT', address: 'I0.0', symbol: 'START_PB' },
              { id: 'e2', type: 'COIL', address: 'Q0.0', symbol: 'MOTOR_KM1' },
            ],
          },
        ],
      },
      ioTable: [
        {
          address: 'I0.0',
          symbol: 'START_PB',
          type: 'BOOL',
          description: 'Start Pushbutton',
          direction: 'INPUT',
          value: false,
        },
        {
          address: 'Q0.0',
          symbol: 'MOTOR_KM1',
          type: 'BOOL',
          description: 'Main Motor KM1 Contactor',
          direction: 'OUTPUT',
          value: false,
        },
      ],
      electrical: {
        isPowered: true,
        shortCircuitDetected: false,
        components: [
          {
            id: 'cb1',
            type: 'CIRCUIT_BREAKER_3P',
            name: 'Main Breaker',
            label: 'Q1 (25A)',
            x: 80,
            y: 80,
            pins: [
              { id: 'L1', name: '1', type: 'POWER', x: 10, y: 0 },
              { id: 'T1', name: '2', type: 'POWER', x: 10, y: 40 },
            ],
            state: { closed: true, energized: true },
          },
        ],
        wires: [],
      },
      process3d: {
        template: 'conveyor_sorting',
        objects: [
          {
            id: 'conv1',
            name: 'Infeed Conveyor Belt 1',
            category: 'ACTUATOR',
            type: 'CONVEYOR',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            plcBinding: { outputAddress: 'Q0.0' },
            state: { active: false, speed: 0 },
          },
        ],
        dynamicItems: [],
        processVariables: {
          tankLevel: 0,
          tankTemperature: 22,
          pipeFlowRate: 0,
          conveyorSpeed: 0,
          sortedItemsCount: 0,
          rejectedItemsCount: 0,
          cycleTime: 0,
        },
      },
      hmi: {
        id: 'scr_main',
        name: 'Overview Screen',
        width: 800,
        height: 480,
        backgroundColor: '#020617',
        widgets: [
          {
            id: 'w1',
            type: 'PUSH_BUTTON',
            label: 'START',
            x: 60,
            y: 80,
            width: 120,
            height: 70,
            bindingTag: 'I0.0',
          },
          {
            id: 'w2',
            type: 'PILOT_LAMP',
            label: 'MOTOR RUN',
            x: 220,
            y: 80,
            width: 120,
            height: 70,
            bindingTag: 'Q0.0',
          },
        ],
      },
      scada: {
        tags: [
          {
            id: 'tag1',
            name: 'MOTOR_STATUS',
            address: 'Q0.0',
            dataType: 'BOOL',
            unit: 'FLAG',
            currentValue: false,
            minVal: 0,
            maxVal: 1,
            alarmState: 'NORMAL',
          },
        ],
        pidParams: {
          id: 'pid_1',
          name: 'Primary Loop PID',
          sp: 65,
          pv: 0,
          output: 0,
          kp: 2.4,
          ki: 0.08,
          kd: 0.15,
          sampleTime: 0.05,
          autoMode: true,
          manualOutput: 0,
          deadband: 0.5,
          error: 0,
          integralSum: 0,
          prevError: 0,
        },
      },
      simulationSettings: {
        speedMultiplier: 1.0,
        autoResetOnFault: false,
        noiseEnabled: false,
      },
    };

    StorageService.saveProject(newProj);
    setProjectsList(StorageService.loadAllProjects());
    handleSelectProject(newProj);
    setCurrentView('ladder');
  };


  const handleExportProject = () => {
    StorageService.exportProjectAsJson(activeProject);
  };

  const handleImportProject = (jsonString: string) => {
    const imported = StorageService.importProjectFromJson(jsonString);
    if (imported) {
      setProjectsList(StorageService.loadAllProjects());
      handleSelectProject(imported);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Universal Industrial Workstation Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeProject={activeProject}
        projectsList={projectsList}
        onSelectProject={handleSelectProject}
        onSaveProject={handleSaveProject}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        simulationMode={simulationMode}
        setSimulationMode={setSimulationMode}
        onStepSimulation={handleStepSimulation}
        speedMultiplier={speedMultiplier}
        setSpeedMultiplier={setSpeedMultiplier}
        plcDialect={plcDialect}
        setPlcDialect={setPlcDialect}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        language={language}
        setLanguage={setLanguage}
        scanStats={scanStats}
      />

      {/* Main Multi-Domain Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentView === 'dashboard' && (
          <DashboardView
            activeProject={activeProject}
            projectsList={projectsList}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProject}
            onNavigate={setCurrentView}
            simulationMode={simulationMode}
            userRole={currentRole}
          />
        )}

        {currentView === 'ladder' && (
          <PlcLadderEditor
            program={ladderProgram}
            setProgram={setLadderProgram}
            memory={plcMemory}
            onSetBit={handleSetBit}
            onSetNumeric={handleSetNumeric}
            simulationMode={simulationMode}
            dialect={plcDialect}
          />
        )}

        {currentView === 'electrical' && (
          <ElectricalSimulator
            circuitState={circuitState}
            setCircuitState={setCircuitState}
            simulationMode={simulationMode}
          />
        )}

        {currentView === 'process3d' && (
          <Process3DView
            processState={processState}
            setProcessState={setProcessState}
            plcMemory={plcMemory}
            onSetPlcInput={handleSetBit}
            simulationMode={simulationMode}
          />
        )}

        {currentView === 'hmi' && (
          <HmiDesigner
            hmiScreen={hmiScreen}
            setHmiScreen={setHmiScreen}
            memory={plcMemory}
            onSetBit={handleSetBit}
            onSetNumeric={handleSetNumeric}
            simulationMode={simulationMode}
          />
        )}

        {currentView === 'scada' && (
          <ScadaView
            memory={plcMemory}
            onSetNumeric={handleSetNumeric}
            simulationMode={simulationMode}
          />
        )}

        {currentView === 'classroom' && (
          <ClassroomView
            currentProgram={ladderProgram}
            onLoadProject={handleSelectProject}
            userRole={currentRole}
          />
        )}

        {currentView === 'assignments' && (
          <ClassroomView
            currentProgram={ladderProgram}
            onLoadProject={handleSelectProject}
            userRole={currentRole}
          />
        )}

        {currentView === 'analytics' && <AdminAnalyticsView userRole={currentRole} />}

        {currentView === 'admin' && <AdminAnalyticsView userRole={currentRole} />}

        {currentView === 'docs' && <DocsView />}
      </main>

      {/* Professional Polish Workstation Status Footer */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 text-[10px] text-slate-400 font-medium select-none z-20">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
            <span className="font-mono text-slate-300">Engine: STABLE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
            <span className="font-mono text-slate-300">Server: CONNECTED</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
            <span className="font-mono text-slate-300">Students: 14 Active</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-slate-300">Scan Time: {scanStats.cycleTime}ms</span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">LATENCY:</span>
            <span className="text-emerald-400 font-bold">14ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">UPTIME:</span>
            <span className="text-slate-200 font-semibold">{formatUptime(uptimeSeconds)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500">CYCLES:</span>
            <span className="text-blue-400 font-semibold">#{scanStats.scanCount}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
