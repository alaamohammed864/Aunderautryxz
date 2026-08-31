import {
  LadderElement,
  LadderRung,
  PlcMemoryState,
  PlcProgram,
} from '../../types';

export class PlcSimulationEngine {
  public memory: PlcMemoryState;
  public program: PlcProgram;
  public isRunning: boolean = false;
  private scanTimer: any = null;
  public onScanComplete?: (memory: PlcMemoryState, rungs: LadderRung[]) => void;

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

  public static executeScanCycle(
    memory: PlcMemoryState,
    program: PlcProgram,
    deltaTimeMs: number = 20
  ): { updatedMemory: PlcMemoryState; updatedProgram: PlcProgram } {
    const engine = new PlcSimulationEngine(program);
    engine.memory = JSON.parse(JSON.stringify(memory));
    const evaluatedRungs = engine.executeScan(deltaTimeMs);
    return {
      updatedMemory: engine.memory,
      updatedProgram: {
        ...program,
        rungs: evaluatedRungs,
      },
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

  public executeScan(deltaTimeMs: number = 20): LadderRung[] {
    const startScan = performance.now();
    const now = Date.now();
    this.memory.scanCount++;

    const evaluatedRungs: LadderRung[] = [];

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

      // Now execute coils, timers, counters, math on the rung
      for (const elem of rung.mainBranch) {
        switch (elem.type) {
          case 'COIL': {
            this.setBit(elem.address, effectivePower);
            break;
          }
          case 'SET_COIL': {
            if (effectivePower) {
              this.setBit(elem.address, true);
            }
            break;
          }
          case 'RESET_COIL': {
            if (effectivePower) {
              this.setBit(elem.address, false);
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
              } else {
                timer.et += deltaTimeMs;
                if (timer.et >= timer.pt) {
                  timer.et = timer.pt;
                  timer.q = true;
                }
              }
            } else {
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
              }
              if (timer.running) {
                timer.et += deltaTimeMs;
                if (timer.et >= timer.pt) {
                  timer.et = timer.pt;
                  timer.q = false;
                  timer.running = false;
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
            }
            if (timer.running) {
              timer.et += deltaTimeMs;
              if (timer.et >= timer.pt) {
                timer.et = timer.pt;
                timer.q = false;
                timer.running = false;
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
              if (counter.cv >= counter.pv) {
                counter.q = true;
              }
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
              if (counter.cv <= 0) {
                counter.q = true;
              }
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
