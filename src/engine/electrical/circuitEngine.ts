import {
  CircuitSimulationState,
  ElectricalComponent,
  ElectricalWire,
} from '../../types';

export class ElectricalCircuitEngine {
  public state: CircuitSimulationState;

  public static solve(state: CircuitSimulationState, deltaTimeMs: number = 20): CircuitSimulationState {
    const engine = new ElectricalCircuitEngine(JSON.parse(JSON.stringify(state)));
    return engine.solveCircuit(deltaTimeMs);
  }

  constructor(initialState?: CircuitSimulationState) {

    this.state = initialState || {
      isPowered: true,
      components: [],
      wires: [],
      shortCircuitDetected: false,
      faultMessage: undefined,
    };
  }

  public solveCircuit(deltaTimeMs: number = 20): CircuitSimulationState {
    const { components, wires, isPowered } = this.state;
    if (!isPowered) {
      // Clear all energized states
      const deEnergizedComponents = components.map((c) => ({
        ...c,
        pins: c.pins.map((p) => ({ ...p, isEnergized: false, voltage: 0 })),
        state: {
          ...c.state,
          energized: false,
          speedRpm: Math.max(0, (c.state.speedRpm || 0) - (deltaTimeMs / 1000) * 500),
        },
      }));
      const deEnergizedWires = wires.map((w) => ({
        ...w,
        isEnergized: false,
        voltage: 0,
        hasShortCircuit: false,
      }));
      this.state.components = deEnergizedComponents;
      this.state.wires = deEnergizedWires;
      this.state.shortCircuitDetected = false;
      return this.state;
    }

    // Step 1: Initialize graph of Pin IDs
    // Find all Power sources
    const powerSources = components.filter(
      (c) =>
        c.type === 'POWER_AC_3P' ||
        c.type === 'POWER_AC_1P' ||
        c.type === 'POWER_DC_24V'
    );

    // Build adjacency list for wires between Pin IDs (format: "compId:pinId")
    const pinAdjacency: Map<string, string[]> = new Map();
    wires.forEach((w) => {
      const p1 = `${w.fromCompId}:${w.fromPinId}`;
      const p2 = `${w.toCompId}:${w.toPinId}`;
      if (!pinAdjacency.has(p1)) pinAdjacency.set(p1, []);
      if (!pinAdjacency.has(p2)) pinAdjacency.set(p2, []);
      pinAdjacency.get(p1)!.push(p2);
      pinAdjacency.get(p2)!.push(p1);
    });

    // Map internal conduction inside each component
    const componentInternalConduction: Map<string, string[]> = new Map();

    components.forEach((comp) => {
      const cid = comp.id;
      const addInternal = (pA: string, pB: string) => {
        const fullA = `${cid}:${pA}`;
        const fullB = `${cid}:${pB}`;
        if (!componentInternalConduction.has(fullA)) componentInternalConduction.set(fullA, []);
        if (!componentInternalConduction.has(fullB)) componentInternalConduction.set(fullB, []);
        componentInternalConduction.get(fullA)!.push(fullB);
        componentInternalConduction.get(fullB)!.push(fullA);
      };

      switch (comp.type) {
        case 'CIRCUIT_BREAKER_1P':
        case 'FUSE_1P':
          if (!comp.state.tripped) {
            addInternal('1', '2');
          }
          break;
        case 'CIRCUIT_BREAKER_3P':
        case 'FUSE_3P':
          if (!comp.state.tripped) {
            addInternal('L1', 'T1');
            addInternal('L2', 'T2');
            addInternal('L3', 'T3');
          }
          break;
        case 'PUSH_BUTTON_NO':
        case 'LIMIT_SWITCH_NO':
          if (comp.state.closed) {
            addInternal('13', '14');
            addInternal('3', '4');
            addInternal('NO1', 'NO2');
          }
          break;
        case 'PUSH_BUTTON_NC':
        case 'EMERGENCY_STOP':
          if (!comp.state.closed) {
            // NC is closed by default unless pressed
            addInternal('11', '12');
            addInternal('1', '2');
            addInternal('NC1', 'NC2');
          }
          break;
        case 'SELECTOR_SWITCH':
          if (comp.state.closed) {
            addInternal('1', '2');
          }
          break;
        case 'AUX_CONTACT_NO':
          if (comp.state.closed) {
            addInternal('13', '14');
            addInternal('3', '4');
          }
          break;
        case 'AUX_CONTACT_NC':
          if (!comp.state.closed) {
            addInternal('21', '22');
            addInternal('1', '2');
          }
          break;
        case 'CONTACTOR_3P':
          if (comp.state.energized) {
            addInternal('L1', 'T1');
            addInternal('L2', 'T2');
            addInternal('L3', 'T3');
            addInternal('13', '14'); // NO aux
          }
          break;
        case 'OVERLOAD_RELAY':
          if (!comp.state.tripped) {
            addInternal('L1', 'T1');
            addInternal('L2', 'T2');
            addInternal('L3', 'T3');
            addInternal('95', '96'); // NC trip contact
          }
          break;
        case 'TERMINAL_BLOCK':
          addInternal('IN', 'OUT');
          addInternal('1', '2');
          break;
        default:
          break;
      }
    });

    // Traverse live power potentials
    const energizedPins = new Set<string>();
    const pinVoltages = new Map<string, number>();

    const queue: { pin: string; voltage: number }[] = [];

    // Seed power sources
    powerSources.forEach((src) => {
      if (src.type === 'POWER_AC_3P') {
        ['L1', 'L2', 'L3'].forEach((p) => {
          const full = `${src.id}:${p}`;
          energizedPins.add(full);
          pinVoltages.set(full, 400);
          queue.push({ pin: full, voltage: 400 });
        });
      } else if (src.type === 'POWER_AC_1P') {
        const fullL = `${src.id}:L`;
        energizedPins.add(fullL);
        pinVoltages.set(fullL, 230);
        queue.push({ pin: fullL, voltage: 230 });
      } else if (src.type === 'POWER_DC_24V') {
        const fullV = `${src.id}:+24V`;
        energizedPins.add(fullV);
        pinVoltages.set(fullV, 24);
        queue.push({ pin: fullV, voltage: 24 });
      }
    });

    // BFS Propagation
    while (queue.length > 0) {
      const { pin: currentPin, voltage: currentV } = queue.shift()!;

      // 1. Traverse via wires
      const wiredNeighbors = pinAdjacency.get(currentPin) || [];
      for (const nextPin of wiredNeighbors) {
        if (!energizedPins.has(nextPin)) {
          energizedPins.add(nextPin);
          pinVoltages.set(nextPin, currentV);
          queue.push({ pin: nextPin, voltage: currentV });
        }
      }

      // 2. Traverse through components with closed internal contacts
      const internalNeighbors = componentInternalConduction.get(currentPin) || [];
      for (const nextPin of internalNeighbors) {
        if (!energizedPins.has(nextPin)) {
          energizedPins.add(nextPin);
          pinVoltages.set(nextPin, currentV);
          queue.push({ pin: nextPin, voltage: currentV });
        }
      }
    }

    // Update Contactor and Relay Coil states based on A1-A2 energization
    const updatedComponents = components.map((comp) => {
      const cid = comp.id;
      const isCoil =
        comp.type === 'CONTACTOR_3P' ||
        comp.type === 'RELAY_COIL' ||
        comp.type === 'TIMER_RELAY_ON' ||
        comp.type === 'SOLENOID_VALVE';

      let isEnergized = false;

      if (isCoil) {
        const pinA1 = `${cid}:A1`;
        const pinA2 = `${cid}:A2`;
        // In real circuit, A1 is energized and A2 returns to N/0V
        // If A1 has potential or is wired to active source, mark coil energized
        if (energizedPins.has(pinA1) || energizedPins.has(`${cid}:1`)) {
          isEnergized = true;
        }
      } else if (
        comp.type === 'PILOT_LAMP_GREEN' ||
        comp.type === 'PILOT_LAMP_RED' ||
        comp.type === 'PILOT_LAMP_YELLOW' ||
        comp.type === 'BUZZER'
      ) {
        const pinX1 = `${cid}:X1`;
        const pinL = `${cid}:L`;
        const pinPlus = `${cid}:+`;
        if (energizedPins.has(pinX1) || energizedPins.has(pinL) || energizedPins.has(pinPlus)) {
          isEnergized = true;
        }
      } else if (comp.type === 'MOTOR_3PHASE') {
        const pU = `${cid}:U1`;
        const pV = `${cid}:V1`;
        const pW = `${cid}:W1`;
        if (
          energizedPins.has(pU) ||
          energizedPins.has(pV) ||
          energizedPins.has(pW) ||
          energizedPins.has(`${cid}:T1`)
        ) {
          isEnergized = true;
        }
      }

      // Update Motor Speed Acceleration
      let currentRpm = comp.state.speedRpm || 0;
      if (comp.type === 'MOTOR_3PHASE') {
        if (isEnergized) {
          currentRpm = Math.min(1450, currentRpm + (deltaTimeMs / 1000) * 1200);
        } else {
          currentRpm = Math.max(0, currentRpm - (deltaTimeMs / 1000) * 400);
        }
      }

      // Sync linked auxiliary contacts if this is a contactor
      return {
        ...comp,
        pins: comp.pins.map((p) => {
          const full = `${cid}:${p.id}`;
          const isPinLive = energizedPins.has(full);
          return {
            ...p,
            isEnergized: isPinLive,
            voltage: pinVoltages.get(full) || 0,
          };
        }),
        state: {
          ...comp.state,
          energized: isEnergized,
          speedRpm: currentRpm,
        },
      };
    });

    // Second pass: Update auxiliary contacts linked to energized contactors
    const contactorStates = new Map<string, boolean>();
    updatedComponents.forEach((c) => {
      if (c.type === 'CONTACTOR_3P' || c.type === 'RELAY_COIL') {
        contactorStates.set(c.id, Boolean(c.state.energized));
      }
    });

    const finalComponents = updatedComponents.map((c) => {
      if (c.associatedCoilId && contactorStates.has(c.associatedCoilId)) {
        const coilActive = contactorStates.get(c.associatedCoilId);
        return {
          ...c,
          state: {
            ...c.state,
            closed: c.type === 'AUX_CONTACT_NO' ? coilActive : !coilActive,
          },
        };
      }
      return c;
    });

    // Update wires energized states
    const updatedWires = wires.map((w) => {
      const p1 = `${w.fromCompId}:${w.fromPinId}`;
      const p2 = `${w.toCompId}:${w.toPinId}`;
      const isLive = energizedPins.has(p1) || energizedPins.has(p2);
      const volt = Math.max(pinVoltages.get(p1) || 0, pinVoltages.get(p2) || 0);
      return {
        ...w,
        isEnergized: isLive,
        voltage: volt,
      };
    });

    this.state.components = finalComponents;
    this.state.wires = updatedWires;
    this.state.shortCircuitDetected = false;

    return this.state;
  }
}
