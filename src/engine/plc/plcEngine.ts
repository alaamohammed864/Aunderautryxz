import {
  LadderElement,
  LadderRung,
  PlcExecutionLog,
  PlcMemoryAreaStats,
  PlcMemoryState,
  PlcProgram,
  PlcTaskMetric,
} from '../../types';

export class PlcSimulationEngine {
  public memory: PlcMemoryState;
  public program: PlcProgram;
  public isRunning: boolean = false;
  private scanTimer: any = null;
  public onScanComplete?: (memory: PlcMemoryState, rungs: LadderRung[]) => void;
  public executionLogs: PlcExecutionLog[] = [];

  public static createInitialMemory(): PlcMemoryState {
    return {
      inputs: {},
      outputs: {},
      memory: {},
      timers: {},
      counters: {},
      dataRegisters: {},
      lastScanTimestamp: Date.now(),
      scanCycleTime: 0,
      scanCount: 0,
      edges: {},
      forcedBits: {},
    };
  }

  public static forceBit(memory: PlcMemoryState, address: string, val: boolean | number): PlcMemoryState {
    const clean = address.trim().toUpperCase();
    return {
      ...memory,
      forcedBits: {
        ...(memory.forcedBits || {}),
        [clean]: val,
      },
    };
  }

  public static unforceBit(memory: PlcMemoryState, address: string): PlcMemoryState {
    const clean = address.trim().toUpperCase();
    const forced = { ...(memory.forcedBits || {}) };
    delete forced[clean];
    return {
      ...memory,
      forcedBits: forced,
    };
  }

  public static unforceAll(memory: PlcMemoryState): PlcMemoryState {
    return {
      ...memory,
      forcedBits: {},
    };
  }

  public static setBit(memory: PlcMemoryState, address: string, val: boolean): PlcMemoryState {
    const clean = address.trim().toUpperCase();
    const updated = {
      ...memory,
      inputs: { ...memory.inputs },
      outputs: { ...memory.outputs },
      memory: { ...memory.memory },
    };

    if (clean.startsWith('I') || clean.startsWith('X')) {
      updated.inputs[clean] = val;
    } else if (clean.startsWith('Q') || clean.startsWith('Y')) {
      updated.outputs[clean] = val;
    } else {
      updated.memory[clean] = val;
    }
    return updated;
  }

  public static setDataRegister(memory: PlcMemoryState, address: string, val: number): PlcMemoryState {
    const clean = address.trim().toUpperCase();
    return {
      ...memory,
      dataRegisters: {
        ...memory.dataRegisters,
        [clean]: val,
      },
    };
  }

  public static calculateMemoryStats(memory: PlcMemoryState, program: PlcProgram): PlcMemoryAreaStats[] {
    const inputKeys = Object.keys(memory.inputs);
    const activeInputs = inputKeys.filter((k) => Boolean(memory.inputs[k])).length;

    const outputKeys = Object.keys(memory.outputs);
    const activeOutputs = outputKeys.filter((k) => Boolean(memory.outputs[k])).length;

    const flagKeys = Object.keys(memory.memory);
    const activeFlags = flagKeys.filter((k) => Boolean(memory.memory[k])).length;

    const timerKeys = Object.keys(memory.timers);
    const activeTimers = timerKeys.filter((k) => memory.timers[k]?.running || memory.timers[k]?.q).length;

    const counterKeys = Object.keys(memory.counters);
    const activeCounters = counterKeys.filter((k) => memory.counters[k]?.cv > 0 || memory.counters[k]?.q).length;

    const dataKeys = Object.keys(memory.dataRegisters);
    const activeData = dataKeys.filter((k) => memory.dataRegisters[k] !== 0).length;

    return [
      {
        area: 'INPUTS',
        name: 'Process Image Input (PII)',
        prefix: '%I / X',
        capacityBytes: 128,
        usedBytes: Math.max(16, Math.ceil(inputKeys.length / 8)),
        totalElements: Math.max(8, inputKeys.length),
        activeCount: activeInputs,
        description: 'Physical sensor & pushbutton inputs buffered per scan cycle',
      },
      {
        area: 'OUTPUTS',
        name: 'Process Image Output (PIQ)',
        prefix: '%Q / Y',
        capacityBytes: 128,
        usedBytes: Math.max(16, Math.ceil(outputKeys.length / 8)),
        totalElements: Math.max(8, outputKeys.length),
        activeCount: activeOutputs,
        description: 'Actuator, contactor, valve & pilot lamp output buffers',
      },
      {
        area: 'FLAGS',
        name: 'Internal Memory Flags',
        prefix: '%M / M',
        capacityBytes: 512,
        usedBytes: Math.max(32, Math.ceil(flagKeys.length / 8)),
        totalElements: Math.max(16, flagKeys.length),
        activeCount: activeFlags,
        description: 'Internal latching bits, auxiliary state flags, and step flags',
      },
      {
        area: 'TIMERS',
        name: 'IEC Hardware Timers',
        prefix: '%T / T',
        capacityBytes: 256,
        usedBytes: Math.max(12, timerKeys.length * 12),
        totalElements: Math.max(8, timerKeys.length),
        activeCount: activeTimers,
        description: 'TON (On-Delay), TOF (Off-Delay), and TP (Pulse) timer registers',
      },
      {
        area: 'COUNTERS',
        name: 'IEC Hardware Counters',
        prefix: '%C / C',
        capacityBytes: 256,
        usedBytes: Math.max(8, counterKeys.length * 8),
        totalElements: Math.max(8, counterKeys.length),
        activeCount: activeCounters,
        description: 'CTU (Up-Counter) and CTD (Down-Counter) registers',
      },
      {
        area: 'DATA_BLOCKS',
        name: 'Data Registers & Words',
        prefix: '%DB / D / VW',
        capacityBytes: 2048,
        usedBytes: Math.max(64, dataKeys.length * 4),
        totalElements: Math.max(16, dataKeys.length),
        activeCount: activeData,
        description: 'Word/DWord numeric registers for PID calculations, speeds & temperatures',
      },
    ];
  }

  public static executeScanCycle(
    memory: PlcMemoryState,
    program: PlcProgram,
    deltaTimeMs: number = 20
  ): { updatedMemory: PlcMemoryState; updatedProgram: PlcProgram; logs: PlcExecutionLog[] } {
    const engine = new PlcSimulationEngine(program);
    engine.memory = JSON.parse(JSON.stringify(memory));
    const evaluatedRungs = engine.executeScan(deltaTimeMs);
    return {
      updatedMemory: engine.memory,
      updatedProgram: {
        ...program,
        rungs: evaluatedRungs,
      },
      logs: engine.executionLogs,
    };
  }

  constructor(program: PlcProgram) {
    this.program = program;
    this.memory = PlcSimulationEngine.createInitialMemory();
  }

  public createInitialMemory(): PlcMemoryState {
    return PlcSimulationEngine.createInitialMemory();
  }


  public setProgram(program: PlcProgram) {
    this.program = program;
  }

  public getBit(address: string): boolean {
    const clean = address.trim().toUpperCase();
    // Check if forced by operator
    if (this.memory.forcedBits && this.memory.forcedBits[clean] !== undefined) {
      return Boolean(this.memory.forcedBits[clean]);
    }
    if (clean.startsWith('I') || clean.startsWith('X')) {
      return Boolean(this.memory.inputs[clean]);
    }
    if (clean.startsWith('Q') || clean.startsWith('Y')) {
      return Boolean(this.memory.outputs[clean]);
    }
    if (clean.startsWith('M')) {
      return Boolean(this.memory.memory[clean]);
    }
    if (clean.startsWith('T')) {
      return Boolean(this.memory.timers[clean]?.q);
    }
    if (clean.startsWith('C')) {
      return Boolean(this.memory.counters[clean]?.q);
    }
    return Boolean(this.memory.memory[clean]);
  }

  public setBit(address: string, val: boolean) {
    const clean = address.trim().toUpperCase();
    if (clean.startsWith('I') || clean.startsWith('X')) {
      this.memory.inputs[clean] = val;
    } else if (clean.startsWith('Q') || clean.startsWith('Y')) {
      this.memory.outputs[clean] = val;
    } else if (clean.startsWith('M')) {
      this.memory.memory[clean] = val;
    } else {
      this.memory.memory[clean] = val;
    }
  }

  public getNumeric(address: string): number {
    const clean = address.trim().toUpperCase();
    // Check if forced
    if (this.memory.forcedBits && typeof this.memory.forcedBits[clean] === 'number') {
      return Number(this.memory.forcedBits[clean]);
    }
    if (!isNaN(Number(clean))) return Number(clean);
    if (clean.startsWith('D') || clean.startsWith('DB') || clean.startsWith('MD') || clean.startsWith('VW')) {
      return this.memory.dataRegisters[clean] || 0;
    }
    if (clean.startsWith('T')) {
      return this.memory.timers[clean]?.et || 0;
    }
    if (clean.startsWith('C')) {
      return this.memory.counters[clean]?.cv || 0;
    }
    return this.memory.dataRegisters[clean] || 0;
  }

  public setNumeric(address: string, val: number) {
    const clean = address.trim().toUpperCase();
    this.memory.dataRegisters[clean] = val;
  }

  public addLog(log: Omit<PlcExecutionLog, 'id' | 'timestamp' | 'timeStr'>) {
    const now = Date.now();
    const fullLog: PlcExecutionLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: now,
      timeStr: new Date(now).toLocaleTimeString() + '.' + (now % 1000).toString().padStart(3, '0'),
      ...log,
    };
    this.executionLogs.push(fullLog);
    if (this.executionLogs.length > 200) {
      this.executionLogs.shift();
    }
  }

  public executeScan(deltaTimeMs: number = 20): LadderRung[] {
    const startScan = performance.now();
    const now = Date.now();
    this.memory.scanCount++;

    const evaluatedRungs: LadderRung[] = [];

    // Periodic scan cycle summary log (every 50 scans)
    if (this.memory.scanCount % 50 === 1) {
      this.addLog({
        category: 'CYCLE',
        severity: 'INFO',
        task: 'OB1_MainCycle',
        message: `Cyclic Scan #${this.memory.scanCount} started (Target: ${deltaTimeMs}ms)`,
        details: `Evaluating ${this.program.rungs.length} networks`,
      });
    }

    for (const rung of this.program.rungs) {
      let mainPower = true;
      let rungError = false;
      let errorMsg = '';

      // Evaluate series elements in main branch
      for (const elem of rung.mainBranch) {
        if (!elem.address && elem.type !== 'MOVE') continue;

        switch (elem.type) {
          case 'NO_CONTACT': {
            const val = this.getBit(elem.address);
            if (!val) mainPower = false;
            break;
          }
          case 'NC_CONTACT': {
            const val = this.getBit(elem.address);
            if (val) mainPower = false;
            break;
          }
          case 'POS_EDGE': {
            const current = this.getBit(elem.address);
            const prev = this.memory.edges[elem.id] || false;
            const rising = current && !prev;
            this.memory.edges[elem.id] = current;
            if (!rising) mainPower = false;
            break;
          }
          case 'NEG_EDGE': {
            const current = this.getBit(elem.address);
            const prev = this.memory.edges[elem.id] || false;
            const falling = !current && prev;
            this.memory.edges[elem.id] = current;
            if (!falling) mainPower = false;
            break;
          }
          case 'CMP_EQ': {
            const v1 = this.getNumeric(elem.in1 || '0');
            const v2 = this.getNumeric(elem.in2 || '0');
            if (v1 !== v2) mainPower = false;
            break;
          }
          case 'CMP_GT': {
            const v1 = this.getNumeric(elem.in1 || '0');
            const v2 = this.getNumeric(elem.in2 || '0');
            if (!(v1 > v2)) mainPower = false;
            break;
          }
          case 'CMP_LT': {
            const v1 = this.getNumeric(elem.in1 || '0');
            const v2 = this.getNumeric(elem.in2 || '0');
            if (!(v1 < v2)) mainPower = false;
            break;
          }
          case 'CMP_GE': {
            const v1 = this.getNumeric(elem.in1 || '0');
            const v2 = this.getNumeric(elem.in2 || '0');
            if (!(v1 >= v2)) mainPower = false;
            break;
          }
          case 'CMP_LE': {
            const v1 = this.getNumeric(elem.in1 || '0');
            const v2 = this.getNumeric(elem.in2 || '0');
            if (!(v1 <= v2)) mainPower = false;
            break;
          }
          case 'CMP_NE': {
            const v1 = this.getNumeric(elem.in1 || '0');
            const v2 = this.getNumeric(elem.in2 || '0');
            if (v1 === v2) mainPower = false;
            break;
          }
          default:
            break;
        }
      }

      // Evaluate sub-branches (OR branches in parallel)
      let branchPower = false;
      if (rung.subBranches && rung.subBranches.length > 0) {
        for (const sub of rung.subBranches) {
          let thisSubPower = true;
          for (const elem of sub.elements) {
            if (elem.type === 'NO_CONTACT' && !this.getBit(elem.address)) {
              thisSubPower = false;
            }
            if (elem.type === 'NC_CONTACT' && this.getBit(elem.address)) {
              thisSubPower = false;
            }
          }
          if (thisSubPower && sub.elements.length > 0) {
            branchPower = true;
          }
        }
      }

      // Effective power rail for output actions
      const effectivePower = mainPower || branchPower;

      // Log rung power transition if it changed
      if (rung.isEnergized !== effectivePower && this.memory.scanCount > 1) {
        this.addLog({
          category: 'RUNG',
          severity: effectivePower ? 'SUCCESS' : 'INFO',
          task: 'OB1_MainCycle',
          rungNumber: rung.rungNumber,
          message: `Network #${rung.rungNumber} ${effectivePower ? 'ENERGIZED (Power Rail Active)' : 'DE-ENERGIZED'}`,
          details: rung.comment || 'Ladder Logic Network',
          value: effectivePower,
        });
      }

      // Now execute coils, timers, counters, math on the rung
      for (const elem of rung.mainBranch) {
        switch (elem.type) {
          case 'COIL': {
            const prev = this.getBit(elem.address);
            this.setBit(elem.address, effectivePower);
            if (prev !== effectivePower) {
              this.addLog({
                category: 'RUNG',
                severity: effectivePower ? 'SUCCESS' : 'INFO',
                task: 'OB1_MainCycle',
                rungNumber: rung.rungNumber,
                address: elem.address,
                message: `Coil ${elem.address} (${elem.symbol || 'OUTPUT'}) set to ${effectivePower ? 'TRUE (1)' : 'FALSE (0)'}`,
                value: effectivePower,
              });
            }
            break;
          }
          case 'SET_COIL': {
            if (effectivePower) {
              const prev = this.getBit(elem.address);
              this.setBit(elem.address, true);
              if (!prev) {
                this.addLog({
                  category: 'RUNG',
                  severity: 'SUCCESS',
                  task: 'OB1_MainCycle',
                  rungNumber: rung.rungNumber,
                  address: elem.address,
                  message: `Set Coil (LATCH) ${elem.address} (${elem.symbol || 'TAG'}) locked to TRUE`,
                  value: true,
                });
              }
            }
            break;
          }
          case 'RESET_COIL': {
            if (effectivePower) {
              const prev = this.getBit(elem.address);
              this.setBit(elem.address, false);
              if (prev) {
                this.addLog({
                  category: 'RUNG',
                  severity: 'INFO',
                  task: 'OB1_MainCycle',
                  rungNumber: rung.rungNumber,
                  address: elem.address,
                  message: `Reset Coil (UNLATCH) ${elem.address} (${elem.symbol || 'TAG'}) cleared to FALSE`,
                  value: false,
                });
              }
            }
            break;
          }
          case 'TON': {
            const pt = elem.presetTime || 3000;
            const tKey = elem.address;
            if (!this.memory.timers[tKey]) {
              this.memory.timers[tKey] = { pt, et: 0, q: false, running: false, prevIn: false, startTime: now };
            }
            const timer = this.memory.timers[tKey];
            timer.pt = pt;
            if (effectivePower) {
              if (!timer.running) {
                timer.running = true;
                timer.startTime = now;
                timer.et = 0;
                this.addLog({
                  category: 'TIMER',
                  severity: 'INFO',
                  task: 'OB1_MainCycle',
                  rungNumber: rung.rungNumber,
                  address: tKey,
                  message: `Timer TON ${tKey} started timing (Preset: ${pt}ms)`,
                });
              } else {
                timer.et += deltaTimeMs;
                if (timer.et >= timer.pt) {
                  timer.et = timer.pt;
                  if (!timer.q) {
                    timer.q = true;
                    this.addLog({
                      category: 'TIMER',
                      severity: 'SUCCESS',
                      task: 'OB1_MainCycle',
                      rungNumber: rung.rungNumber,
                      address: tKey,
                      message: `Timer TON ${tKey} expired! Output Q -> TRUE (ET = ${timer.et}ms)`,
                      value: true,
                    });
                  }
                }
              }
            } else {
              if (timer.running) {
                this.addLog({
                  category: 'TIMER',
                  severity: 'INFO',
                  task: 'OB1_MainCycle',
                  rungNumber: rung.rungNumber,
                  address: tKey,
                  message: `Timer TON ${tKey} reset (Input dropped)`,
                });
              }
              timer.running = false;
              timer.et = 0;
              timer.q = false;
            }
            timer.prevIn = effectivePower;
            break;
          }
          case 'TOF': {
            const pt = elem.presetTime || 3000;
            const tKey = elem.address;
            if (!this.memory.timers[tKey]) {
              this.memory.timers[tKey] = { pt, et: 0, q: false, running: false, prevIn: false, startTime: now };
            }
            const timer = this.memory.timers[tKey];
            timer.pt = pt;
            if (effectivePower) {
              timer.q = true;
              timer.running = false;
              timer.et = 0;
            } else {
              if (timer.prevIn && !effectivePower) {
                timer.running = true;
                timer.et = 0;
                this.addLog({
                  category: 'TIMER',
                  severity: 'INFO',
                  task: 'OB1_MainCycle',
                  rungNumber: rung.rungNumber,
                  address: tKey,
                  message: `Timer TOF ${tKey} off-delay started timing (${pt}ms)`,
                });
              }
              if (timer.running) {
                timer.et += deltaTimeMs;
                if (timer.et >= timer.pt) {
                  timer.et = timer.pt;
                  timer.q = false;
                  timer.running = false;
                  this.addLog({
                    category: 'TIMER',
                    severity: 'SUCCESS',
                    task: 'OB1_MainCycle',
                    rungNumber: rung.rungNumber,
                    address: tKey,
                    message: `Timer TOF ${tKey} completed! Output Q -> FALSE`,
                    value: false,
                  });
                }
              }
            }
            timer.prevIn = effectivePower;
            break;
          }
          case 'TP': {
            const pt = elem.presetTime || 2000;
            const tKey = elem.address;
            if (!this.memory.timers[tKey]) {
              this.memory.timers[tKey] = { pt, et: 0, q: false, running: false, prevIn: false, startTime: now };
            }
            const timer = this.memory.timers[tKey];
            timer.pt = pt;
            if (effectivePower && !timer.prevIn && !timer.running) {
              timer.running = true;
              timer.q = true;
              timer.et = 0;
              this.addLog({
                category: 'TIMER',
                severity: 'SUCCESS',
                task: 'OB1_MainCycle',
                rungNumber: rung.rungNumber,
                address: tKey,
                message: `Timer TP ${tKey} pulse triggered (Duration: ${pt}ms)`,
                value: true,
              });
            }
            if (timer.running) {
              timer.et += deltaTimeMs;
              if (timer.et >= timer.pt) {
                timer.et = timer.pt;
                timer.q = false;
                timer.running = false;
                this.addLog({
                  category: 'TIMER',
                  severity: 'INFO',
                  task: 'OB1_MainCycle',
                  rungNumber: rung.rungNumber,
                  address: tKey,
                  message: `Timer TP ${tKey} pulse ended`,
                  value: false,
                });
              }
            }
            timer.prevIn = effectivePower;
            break;
          }
          case 'CTU': {
            const pv = elem.presetCount || 5;
            const cKey = elem.address;
            if (!this.memory.counters[cKey]) {
              this.memory.counters[cKey] = { pv, cv: 0, q: false, prevCu: false, prevCd: false };
            }
            const counter = this.memory.counters[cKey];
            counter.pv = pv;
            const rising = effectivePower && !counter.prevCu;
            if (rising) {
              counter.cv++;
              const reached = counter.cv >= counter.pv;
              if (reached) counter.q = true;
              this.addLog({
                category: 'COUNTER',
                severity: reached ? 'SUCCESS' : 'INFO',
                task: 'OB1_MainCycle',
                rungNumber: rung.rungNumber,
                address: cKey,
                message: `Counter CTU ${cKey} counted up: CV=${counter.cv}/${counter.pv} ${reached ? '(THRESHOLD REACHED)' : ''}`,
                value: counter.cv,
              });
            }
            counter.prevCu = effectivePower;
            break;
          }
          case 'CTD': {
            const pv = elem.presetCount || 5;
            const cKey = elem.address;
            if (!this.memory.counters[cKey]) {
              this.memory.counters[cKey] = { pv, cv: pv, q: false, prevCu: false, prevCd: false };
            }
            const counter = this.memory.counters[cKey];
            counter.pv = pv;
            const rising = effectivePower && !counter.prevCd;
            if (rising) {
              if (counter.cv > 0) counter.cv--;
              const reached = counter.cv <= 0;
              if (reached) counter.q = true;
              this.addLog({
                category: 'COUNTER',
                severity: reached ? 'SUCCESS' : 'INFO',
                task: 'OB1_MainCycle',
                rungNumber: rung.rungNumber,
                address: cKey,
                message: `Counter CTD ${cKey} counted down: CV=${counter.cv}/${counter.pv}`,
                value: counter.cv,
              });
            }
            counter.prevCd = effectivePower;
            break;
          }
          case 'MATH_ADD': {
            if (effectivePower && elem.out) {
              const v1 = this.getNumeric(elem.in1 || '0');
              const v2 = this.getNumeric(elem.in2 || '0');
              this.setNumeric(elem.out, v1 + v2);
            }
            break;
          }
          case 'MATH_SUB': {
            if (effectivePower && elem.out) {
              const v1 = this.getNumeric(elem.in1 || '0');
              const v2 = this.getNumeric(elem.in2 || '0');
              this.setNumeric(elem.out, v1 - v2);
            }
            break;
          }
          case 'MATH_MUL': {
            if (effectivePower && elem.out) {
              const v1 = this.getNumeric(elem.in1 || '0');
              const v2 = this.getNumeric(elem.in2 || '0');
              this.setNumeric(elem.out, v1 * v2);
            }
            break;
          }
          case 'MATH_DIV': {
            if (effectivePower && elem.out) {
              const v1 = this.getNumeric(elem.in1 || '0');
              const v2 = this.getNumeric(elem.in2 || '1');
              if (v2 !== 0) {
                this.setNumeric(elem.out, Math.floor(v1 / v2));
              } else {
                rungError = true;
                errorMsg = 'Division by zero';
                this.addLog({
                  category: 'FAULT',
                  severity: 'ERROR',
                  task: 'OB82_Diagnostic',
                  rungNumber: rung.rungNumber,
                  message: `Math Exception in Network #${rung.rungNumber}: Division by zero (${v1} / 0)`,
                });
              }
            }
            break;
          }
          case 'MOVE': {
            if (effectivePower && elem.out) {
              const v1 = this.getNumeric(elem.in1 || '0');
              this.setNumeric(elem.out, v1);
            }
            break;
          }
          default:
            break;
        }
      }

      evaluatedRungs.push({
        ...rung,
        isEnergized: effectivePower,
        hasError: rungError,
        errorMessage: errorMsg,
      });
    }

    const endScan = performance.now();
    this.memory.scanCycleTime = Number((endScan - startScan).toFixed(2));
    this.memory.lastScanTimestamp = now;

    if (this.onScanComplete) {
      this.onScanComplete(this.memory, evaluatedRungs);
    }

    return evaluatedRungs;
  }

  public reset() {
    this.memory = this.createInitialMemory();
  }
}
