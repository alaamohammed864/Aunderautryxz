export type UserRole = 'student' | 'teacher' | 'institution_admin' | 'system_admin' | 'guest';

export type AppView =
  | 'dashboard'
  | 'electrical'
  | 'ladder'
  | 'process3d'
  | 'hmi'
  | 'scada'
  | 'classroom'
  | 'assignments'
  | 'community'
  | 'library'
  | 'analytics'
  | 'admin'
  | 'docs';

export type PlcDialect = 'siemens' | 'delta';

export type SimulationMode = 'STOP' | 'RUN' | 'PAUSE' | 'STEP';

// --- PLC TYPES ---
export type PlcInstructionType =
  | 'NO_CONTACT'
  | 'NC_CONTACT'
  | 'POS_EDGE'
  | 'NEG_EDGE'
  | 'COIL'
  | 'SET_COIL'
  | 'RESET_COIL'
  | 'TON'
  | 'TOF'
  | 'TP'
  | 'CTU'
  | 'CTD'
  | 'CTUD'
  | 'CMP_EQ'
  | 'CMP_GT'
  | 'CMP_LT'
  | 'CMP_GE'
  | 'CMP_LE'
  | 'CMP_NE'
  | 'MATH_ADD'
  | 'MATH_SUB'
  | 'MATH_MUL'
  | 'MATH_DIV'
  | 'MOVE';

export interface LadderElement {
  id: string;
  type: PlcInstructionType;
  address: string; // e.g. "I0.0", "Q0.0", "M0.0", "T1", "C1"
  symbol?: string; // e.g. "START_BTN", "CONVEYOR_MOTOR"
  description?: string;
  // Parameters for timers, counters, math, compare
  presetTime?: number; // in milliseconds for timers
  presetCount?: number; // for counters
  currentValue?: number;
  in1?: string; // address or constant
  in2?: string; // address or constant
  out?: string; // destination address
  branchId?: string; // for parallel branch grouping
}

export interface LadderBranch {
  id: string;
  elements: LadderElement[];
}

export interface LadderRung {
  id: string;
  rungNumber: number;
  comment?: string;
  mainBranch: LadderElement[];
  subBranches?: LadderBranch[];
  isEnergized?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export interface PlcProgram {
  id: string;
  name: string;
  dialect: PlcDialect;
  scanTimeMs: number; // default e.g. 20ms
  rungs: LadderRung[];
}

export interface PlcIoTag {
  address: string;
  symbol: string;
  type: 'BOOL' | 'INT' | 'REAL' | 'TIME';
  description: string;
  direction: 'INPUT' | 'OUTPUT' | 'MEMORY' | 'TIMER' | 'COUNTER' | 'DATA';
  value: boolean | number;
  isForced?: boolean;
  forcedValue?: boolean | number;
  linkedDevice?: string; // 3D/Electrical entity ID
}

export interface PlcMemoryState {
  inputs: Record<string, boolean | number>;
  outputs: Record<string, boolean | number>;
  memory: Record<string, boolean | number>;
  timers: Record<
    string,
    {
      pt: number;
      et: number;
      q: boolean;
      running: boolean;
      prevIn: boolean;
      startTime: number;
    }
  >;
  counters: Record<
    string,
    {
      pv: number;
      cv: number;
      q: boolean;
      prevCu: boolean;
      prevCd: boolean;
    }
  >;
  dataRegisters: Record<string, number>;
  lastScanTimestamp: number;
  scanCycleTime: number;
  scanCount: number;
  edges: Record<string, boolean>; // remembers previous edge state
  forcedBits?: Record<string, boolean | number>; // Forced I/O for debugging
}

// --- PLC DIAGNOSTICS & EXECUTION LOGS ---
export type PlcLogCategory = 'CYCLE' | 'RUNG' | 'TIMER' | 'COUNTER' | 'FORCE' | 'FAULT' | 'MEMORY';
export type PlcLogSeverity = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

export interface PlcExecutionLog {
  id: string;
  timestamp: number;
  timeStr: string;
  category: PlcLogCategory;
  severity: PlcLogSeverity;
  task: string;
  rungNumber?: number;
  address?: string;
  message: string;
  details?: string;
  value?: boolean | number | string;
}

export interface PlcTaskMetric {
  id: string;
  name: string;
  type: 'CYCLIC' | 'INTERRUPT' | 'EVENT' | 'FAULT';
  priority: number;
  cycleMs: number;
  lastDurationUs: number;
  avgDurationUs: number;
  maxDurationUs: number;
  executions: number;
  status: 'ACTIVE' | 'RUNNING' | 'IDLE' | 'YIELD';
  overrunCount: number;
}

export interface PlcMemoryAreaStats {
  area: 'INPUTS' | 'OUTPUTS' | 'FLAGS' | 'TIMERS' | 'COUNTERS' | 'DATA_BLOCKS';
  name: string;
  prefix: string;
  capacityBytes: number;
  usedBytes: number;
  totalElements: number;
  activeCount: number;
  description: string;
}

// --- ELECTRICAL SIMULATOR TYPES ---
export type ElectricalComponentType =
  | 'POWER_AC_3P'
  | 'POWER_AC_1P'
  | 'POWER_DC_24V'
  | 'CIRCUIT_BREAKER_3P'
  | 'CIRCUIT_BREAKER_1P'
  | 'FUSE_3P'
  | 'FUSE_1P'
  | 'TRANSFORMER_24V'
  | 'CONTACTOR_3P'
  | 'AUX_CONTACT_NO'
  | 'AUX_CONTACT_NC'
  | 'OVERLOAD_RELAY'
  | 'RELAY_COIL'
  | 'PUSH_BUTTON_NO'
  | 'PUSH_BUTTON_NC'
  | 'EMERGENCY_STOP'
  | 'SELECTOR_SWITCH'
  | 'LIMIT_SWITCH_NO'
  | 'PROXIMITY_SENSOR'
  | 'PHOTOELECTRIC_SENSOR'
  | 'TIMER_RELAY_ON'
  | 'MOTOR_3PHASE'
  | 'PILOT_LAMP_GREEN'
  | 'PILOT_LAMP_RED'
  | 'PILOT_LAMP_YELLOW'
  | 'BUZZER'
  | 'SOLENOID_VALVE'
  | 'TERMINAL_BLOCK'
  | 'GROUND_NODE';

export interface ElectricalPin {
  id: string;
  name: string; // e.g. "L1", "T1", "A1", "A2", "13", "14"
  type: 'POWER' | 'CONTROL' | 'GROUND';
  x: number; // relative pin offset
  y: number;
  isEnergized?: boolean;
  voltage?: number;
}

export interface ElectricalComponent {
  id: string;
  type: ElectricalComponentType;
  name: string;
  label: string;
  x: number;
  y: number;
  rotation?: number; // 0, 90, 180, 270
  pins: ElectricalPin[];
  state: {
    closed?: boolean; // for contacts, buttons, switches
    tripped?: boolean; // for breakers, overloads
    energized?: boolean; // for coils, lamps, motors
    speedRpm?: number; // for motor
    timerElapsed?: number; // for timer relay
    sensorDetected?: boolean;
  };
  associatedCoilId?: string; // links aux contact to contactor/relay
  plcAddress?: string; // optional PLC address binding (e.g. I0.0 for button, Q0.0 for coil)
}

export interface ElectricalWire {
  id: string;
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  color?: string;
  isEnergized?: boolean;
  voltage?: number;
  hasShortCircuit?: boolean;
}

export interface CircuitSimulationState {
  isPowered: boolean;
  components: ElectricalComponent[];
  wires: ElectricalWire[];
  shortCircuitDetected: boolean;
  faultMessage?: string;
}

// --- 3D PROCESS & DIGITAL TWIN TYPES ---
export type ProcessSceneTemplate =
  | 'conveyor_sorting'
  | 'tank_filling_pid'
  | 'gantry_pick_place'
  | 'traffic_intersection'
  | 'bottle_capper'
  | 'three_motor_starter';

export interface DigitalTwinObject {
  id: string;
  name: string;
  category: 'ACTUATOR' | 'SENSOR' | 'ANALOG_SENSOR' | 'MECHANISM' | 'ITEM';
  type:
    | 'CONVEYOR'
    | 'MOTOR'
    | 'PNEUMATIC_CYLINDER'
    | 'DIVERTER'
    | 'PUMP'
    | 'VALVE'
    | 'HEATER'
    | 'PHOTO_SENSOR'
    | 'PROXIMITY_SENSOR'
    | 'LEVEL_SENSOR'
    | 'TEMPERATURE_SENSOR'
    | 'FLOW_SENSOR'
    | 'LIMIT_SWITCH'
    | 'TANK'
    | 'BOX'
    | 'BOTTLE'
    | 'TRAFFIC_LIGHT';
  position: [number, number, number];
  rotation: [number, number, number];
  plcBinding?: {
    inputAddress?: string; // Actuates from PLC Output or Feeds to PLC Input
    outputAddress?: string;
    analogAddress?: string;
    scaleMin?: number;
    scaleMax?: number;
  };
  state: {
    active?: boolean;
    positionRatio?: number; // 0.0 to 1.0 (for pistons, gates, valves)
    speed?: number;
    value?: number; // for analog sensor like level, temp
    fault?: boolean;
    detected?: boolean;
  };
}

export interface ProcessSceneState {
  template: ProcessSceneTemplate;
  objects: DigitalTwinObject[];
  dynamicItems: {
    id: string;
    type: 'box' | 'bottle' | 'pallet' | 'car';
    position: [number, number, number];
    color?: string;
    weight?: number;
    isRejected?: boolean;
    isFilled?: boolean;
    isCapped?: boolean;
  }[];
  processVariables: {
    tankLevel: number; // 0 - 100 %
    tankTemperature: number; // 20 - 100 C
    pipeFlowRate: number; // 0 - 50 L/min
    conveyorSpeed: number; // 0 - 100 %
    sortedItemsCount: number;
    rejectedItemsCount: number;
    cycleTime: number;
  };
}

export type DigitalTwinProcessState = ProcessSceneState;


// --- HMI DESIGNER TYPES ---
export type HmiWidgetType =
  | 'PUSH_BUTTON'
  | 'PUSH_BUTTON_MOMENTARY'
  | 'PUSH_BUTTON_TOGGLE'
  | 'PILOT_LAMP'
  | 'NUMERIC_DISPLAY'
  | 'NUMERIC_INPUT'
  | 'ROTARY_GAUGE'
  | 'RADIAL_GAUGE'
  | 'LINEAR_METER'
  | 'SLIDER'
  | 'TANK_VIEW'
  | 'TANK_LEVEL'
  | 'MOTOR_SYMBOL'
  | 'VALVE_SYMBOL'
  | 'TREND_MINI'
  | 'ALARM_BANNER'
  | 'LABEL_TEXT'
  | 'EMERGENCY_BUTTON';

export interface HmiWidget {
  id: string;
  type: HmiWidgetType;
  title?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tagAddress?: string; // PLC tag binding (e.g. "I0.0", "Q0.0", "M0.0", "DB1.DBD0")
  bindingTag?: string;
  minValue?: number;
  maxValue?: number;
  color?: string;
  secondaryTag?: string;
  config?: {
    colorOn?: string;
    colorOff?: string;
    min?: number;
    max?: number;
    unit?: string;
    precision?: number;
    labelOn?: string;
    labelOff?: string;
    fontSize?: number;
  };
}


export interface HmiScreen {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  widgets: HmiWidget[];
}

// --- SCADA & PID TYPES ---
export interface ScadaTag {
  id: string;
  name: string;
  address: string;
  dataType: 'BOOL' | 'INT' | 'REAL';
  unit: string;
  currentValue: number | boolean;
  minVal: number;
  maxVal: number;
  alarmLowLow?: number;
  alarmLow?: number;
  alarmHigh?: number;
  alarmHighHigh?: number;
  alarmState: 'NORMAL' | 'LOW_LOW' | 'LOW' | 'HIGH' | 'HIGH_HIGH' | 'FAULT';
}

export interface ScadaAlarmEvent {
  id: string;
  timestamp: string;
  tag: string;
  description: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'FAULT';
  state: 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';
  value: number | boolean;
}

export interface HistoricalDataPoint {
  timestamp: number;
  [key: string]: number; // tagId -> value
}

export interface PidControllerParams {
  id: string;
  name: string;
  sp: number; // Setpoint
  pv: number; // Process Variable
  output: number; // Control Output 0-100%
  kp: number; // Proportional Gain
  ki: number; // Integral Gain
  kd: number; // Derivative Gain
  sampleTime: number; // seconds
  autoMode: boolean; // Auto vs Manual
  manualOutput: number;
  deadband: number;
  error: number;
  integralSum: number;
  prevError: number;
}

export interface ProcessTrendDataPoint {
  timestamp: number;
  pv: number;
  sp: number;
  cv: number;
}

export interface ScadaAlarm {
  id: string;
  tag: string;
  message: string;
  priority: 'INFO' | 'HIGH' | 'CRITICAL';
  state: 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';
  timestamp: string;
}

export interface GradingResult {
  passed: boolean;
  totalScore: number;
  maxScore: number;
  testResults: {
    testCaseId: string;
    name: string;
    passed: boolean;
    earnedPoints: number;
    details: string;
  }[];
}

export interface ClassroomMessage {
  id: string;
  senderName: string;
  role: UserRole;
  text: string;
  timestamp: string;
}

export interface StudentParticipant {
  id: string;
  name: string;
  avatar: string;
  hasControl: boolean;
  status: 'active' | 'idle' | 'raising_hand';
  currentScore?: number;
}

export interface ClassroomSession {
  id: string;
  code: string;
  title: string;
  teacherName: string;
  isActive: boolean;
  controlHolderId: string; // teacher or student ID
  isSimPaused: boolean;
  activeProjectId?: string;
  students: StudentParticipant[];
  messages: ClassroomMessage[];
}

export interface AssignmentTestCase {
  id: string;
  name: string;
  description: string;
  inputsSequence: {
    timeOffsetMs: number;
    address: string;
    value: boolean | number;
  }[];
  expectedOutputs: {
    timeOffsetMs: number;
    address: string;
    expectedValue: boolean | number;
  }[];
  weightPoints: number;
}

export interface AssignmentTask {
  id: string;
  title: string;
  category: 'PLC' | 'ELECTRICAL' | 'DIGITAL_TWIN' | 'PID';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  objective: string;
  instructions: string[];
  recommendedModel: 'Siemens S7-1200' | 'Delta DVP';
  requiredInputs: { address: string; symbol: string; desc: string }[];
  requiredOutputs: { address: string; symbol: string; desc: string }[];
  testCases: AssignmentTestCase[];
  starterProject: TwinLabProject;
  maxScore: number;
}

export interface SubmissionResult {
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  passed: boolean;
  testCaseResults: {
    testId: string;
    name: string;
    passed: boolean;
    actualScore: number;
    feedback: string;
  }[];
  overallFeedback: string;
}

// --- SIMULATION SNAPSHOTS ---
export interface SimulationSnapshot {
  id: string;
  name: string;
  description?: string;
  timestamp: number;
  timeFormatted: string;
  memory: PlcMemoryState;
  simulationMode: SimulationMode;
  processState?: DigitalTwinProcessState;
  metadata: {
    activeInputsCount: number;
    activeOutputsCount: number;
    activeFlagsCount: number;
    activeTimersCount: number;
    forcedBitsCount: number;
    scanCount: number;
    cycleTimeMs: number;
  };
}

// --- PROJECT FILE SCHEMA ---
export interface TwinLabProject {
  version: '1.0.0';
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
  likes: number;
  forks: number;
  plc: {
    dialect: PlcDialect;
    model: string;
    scanTimeMs: number;
  };
  ladder: PlcProgram;
  ioTable: PlcIoTag[];
  electrical: CircuitSimulationState;
  process3d: ProcessSceneState;
  hmi: HmiScreen;
  scada: {
    tags: ScadaTag[];
    pidParams: PidControllerParams;
  };
  simulationSettings: {
    speedMultiplier: number;
    autoResetOnFault: boolean;
    noiseEnabled: boolean;
  };
}
