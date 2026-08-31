import { ProcessSceneState, DigitalTwinObject } from '../../types';

export class DigitalTwinEngine {
  public sceneState: ProcessSceneState;

  public static stepProcess(
    state: ProcessSceneState,
    deltaTimeMs: number,
    getPlcOutput: (address: string) => boolean,
    setPlcInput: (address: string, val: boolean) => void
  ): ProcessSceneState {
    const engine = new DigitalTwinEngine(JSON.parse(JSON.stringify(state)));
    engine.update(deltaTimeMs / 1000, getPlcOutput, setPlcInput);
    return engine.sceneState;
  }


  constructor(initialState?: ProcessSceneState) {

    this.sceneState = initialState || this.createDefaultSceneState('conveyor_sorting');
  }

  public createDefaultSceneState(template: ProcessSceneState['template']): ProcessSceneState {
    if (template === 'tank_filling_pid') {
      return {
        template: 'tank_filling_pid',
        objects: [
          {
            id: 'tank_01',
            name: 'Chemical Storage Tank 1000L',
            category: 'MECHANISM',
            type: 'TANK',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            state: { value: 35.0 },
          },
          {
            id: 'pump_inflow',
            name: 'Inflow Feed Pump P101',
            category: 'ACTUATOR',
            type: 'PUMP',
            position: [-2.5, 0.5, 0],
            rotation: [0, 0, 0],
            plcBinding: { outputAddress: 'Q0.0' },
            state: { active: false, speed: 0 },
          },
          {
            id: 'valve_drain',
            name: 'Discharge Solenoid Valve V102',
            category: 'ACTUATOR',
            type: 'VALVE',
            position: [2.5, 0.3, 0],
            rotation: [0, 0, 0],
            plcBinding: { outputAddress: 'Q0.1' },
            state: { active: false, positionRatio: 0 },
          },
          {
            id: 'sensor_level_trans',
            name: 'Ultrasonic Level Transmitter LT-01',
            category: 'ANALOG_SENSOR',
            type: 'LEVEL_SENSOR',
            position: [0, 2.8, 0],
            rotation: [0, 0, 0],
            plcBinding: { analogAddress: 'DB1.DBD0', scaleMin: 0, scaleMax: 100 },
            state: { value: 35.0 },
          },
          {
            id: 'sensor_high_switch',
            name: 'High Level Limit Switch LSH-01',
            category: 'SENSOR',
            type: 'LIMIT_SWITCH',
            position: [0, 2.4, 0],
            rotation: [0, 0, 0],
            plcBinding: { inputAddress: 'I0.0' },
            state: { detected: false },
          },
          {
            id: 'sensor_low_switch',
            name: 'Low Level Limit Switch LSL-01',
            category: 'SENSOR',
            type: 'LIMIT_SWITCH',
            position: [0, 0.6, 0],
            rotation: [0, 0, 0],
            plcBinding: { inputAddress: 'I0.1' },
            state: { detected: false },
          },
        ],
        dynamicItems: [],
        processVariables: {
          tankLevel: 35.0,
          tankTemperature: 24.5,
          pipeFlowRate: 0,
          conveyorSpeed: 0,
          sortedItemsCount: 0,
          rejectedItemsCount: 0,
          cycleTime: 0,
        },
      };
    }

    // Default: conveyor_sorting
    return {
      template: 'conveyor_sorting',
      objects: [
        {
          id: 'conveyor_main',
          name: 'Main Feed Conveyor Belt',
          category: 'ACTUATOR',
          type: 'CONVEYOR',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          plcBinding: { outputAddress: 'Q0.0' },
          state: { active: false, speed: 0 },
        },
        {
          id: 'diverter_cylinder',
          name: 'Pneumatic Reject Diverter CYL-1',
          category: 'ACTUATOR',
          type: 'PNEUMATIC_CYLINDER',
          position: [1.2, 0.6, 0.8],
          rotation: [0, 0, 0],
          plcBinding: { outputAddress: 'Q0.1' },
          state: { active: false, positionRatio: 0 },
        },
        {
          id: 'photo_sensor_entry',
          name: 'Entry Optical Sensor PE-1',
          category: 'SENSOR',
          type: 'PHOTO_SENSOR',
          position: [-2.2, 0.7, 0.5],
          rotation: [0, 0, 0],
          plcBinding: { inputAddress: 'I0.0' },
          state: { detected: false },
        },
        {
          id: 'photo_sensor_sort',
          name: 'Sorting Zone Sensor PE-2',
          category: 'SENSOR',
          type: 'PHOTO_SENSOR',
          position: [1.0, 0.7, 0.5],
          rotation: [0, 0, 0],
          plcBinding: { inputAddress: 'I0.1' },
          state: { detected: false },
        },
        {
          id: 'limit_switch_extended',
          name: 'Cylinder Extended Limit Switch LSE',
          category: 'SENSOR',
          type: 'LIMIT_SWITCH',
          position: [1.2, 0.6, 0.2],
          rotation: [0, 0, 0],
          plcBinding: { inputAddress: 'I0.2' },
          state: { detected: false },
        },
      ],
      dynamicItems: [
        { id: 'box_1', type: 'box', position: [-4.0, 0.6, 0], color: '#38bdf8', weight: 2.5 },
        { id: 'box_2', type: 'box', position: [-8.0, 0.6, 0], color: '#f87171', weight: 4.2 },
        { id: 'box_3', type: 'box', position: [-12.0, 0.6, 0], color: '#38bdf8', weight: 2.5 },
      ],
      processVariables: {
        tankLevel: 0,
        tankTemperature: 20,
        pipeFlowRate: 0,
        conveyorSpeed: 0,
        sortedItemsCount: 14,
        rejectedItemsCount: 3,
        cycleTime: 4.2,
      },
    };
  }

  public update(
    dt: number,
    getPlcOutput: (addr: string) => boolean | number,
    setPlcInput: (addr: string, val: boolean | number) => void
  ) {
    const s = this.sceneState;

    if (s.template === 'conveyor_sorting') {
      // 1. Conveyor motor status
      const conveyorMotorActive = Boolean(getPlcOutput('Q0.0'));
      const diverterPistonActive = Boolean(getPlcOutput('Q0.1'));

      const conveyorObj = s.objects.find((o) => o.type === 'CONVEYOR');
      if (conveyorObj) {
        conveyorObj.state.active = conveyorMotorActive;
        conveyorObj.state.speed = conveyorMotorActive ? 1.5 : 0;
        s.processVariables.conveyorSpeed = conveyorMotorActive ? 100 : 0;
      }

      // 2. Diverter piston stroke
      const diverterObj = s.objects.find((o) => o.type === 'PNEUMATIC_CYLINDER');
      if (diverterObj) {
        diverterObj.state.active = diverterPistonActive;
        const targetRatio = diverterPistonActive ? 1.0 : 0.0;
        const current = diverterObj.state.positionRatio || 0;
        const strokeSpeed = 4.0; // full stroke in 250ms
        if (current < targetRatio) {
          diverterObj.state.positionRatio = Math.min(targetRatio, current + dt * strokeSpeed);
        } else if (current > targetRatio) {
          diverterObj.state.positionRatio = Math.max(targetRatio, current - dt * strokeSpeed);
        }

        // Limit switch feedback to PLC
        const isExtended = (diverterObj.state.positionRatio || 0) > 0.85;
        setPlcInput('I0.2', isExtended);
      }

      // 3. Move items along conveyor
      const speed = conveyorMotorActive ? 1.8 : 0;
      let entrySensorTriggered = false;
      let sortSensorTriggered = false;

      s.dynamicItems.forEach((item) => {
        if (conveyorMotorActive) {
          // If rejected by piston at sort station
          if (
            diverterObj &&
            (diverterObj.state.positionRatio || 0) > 0.5 &&
            item.position[0] > 0.8 &&
            item.position[0] < 1.6
          ) {
            item.isRejected = true;
            item.position[2] += dt * 3.0; // push off conveyor in Z
          } else if (!item.isRejected) {
            item.position[0] += dt * speed;
          }
        }

        // Loop items back to start when passed
        if (item.position[0] > 6.0 || item.position[2] > 3.0) {
          if (item.isRejected) {
            s.processVariables.rejectedItemsCount++;
          } else {
            s.processVariables.sortedItemsCount++;
          }
          item.position[0] = -5.0 - Math.random() * 3.0;
          item.position[2] = 0;
          item.isRejected = false;
          item.color = Math.random() > 0.5 ? '#38bdf8' : '#f87171';
        }

        // Check sensor intersections
        // Entry photo sensor at x = -2.2
        if (Math.abs(item.position[0] - -2.2) < 0.45 && Math.abs(item.position[2]) < 0.3) {
          entrySensorTriggered = true;
        }

        // Sort photo sensor at x = 1.0
        if (Math.abs(item.position[0] - 1.0) < 0.45 && Math.abs(item.position[2]) < 0.3) {
          sortSensorTriggered = true;
        }
      });

      // Update sensors state and write to PLC inputs
      const entrySensor = s.objects.find((o) => o.id === 'photo_sensor_entry');
      if (entrySensor) {
        entrySensor.state.detected = entrySensorTriggered;
        setPlcInput('I0.0', entrySensorTriggered);
      }

      const sortSensor = s.objects.find((o) => o.id === 'photo_sensor_sort');
      if (sortSensor) {
        sortSensor.state.detected = sortSensorTriggered;
        setPlcInput('I0.1', sortSensorTriggered);
      }
    } else if (s.template === 'tank_filling_pid') {
      // Tank level physics
      const pumpActive = Boolean(getPlcOutput('Q0.0'));
      const drainValveActive = Boolean(getPlcOutput('Q0.1'));

      const pumpObj = s.objects.find((o) => o.type === 'PUMP');
      if (pumpObj) {
        pumpObj.state.active = pumpActive;
        pumpObj.state.speed = pumpActive ? 2800 : 0;
      }

      const valveObj = s.objects.find((o) => o.type === 'VALVE');
      if (valveObj) {
        valveObj.state.active = drainValveActive;
        valveObj.state.positionRatio = drainValveActive ? 1.0 : 0.0;
      }

      let currentLevel = s.processVariables.tankLevel;
      const inflow = pumpActive ? 12.0 * dt : 0;
      const outflow = drainValveActive ? 8.0 * dt : 1.0 * dt; // natural slight drain

      currentLevel = Math.max(0, Math.min(100, currentLevel + inflow - outflow));
      s.processVariables.tankLevel = Number(currentLevel.toFixed(1));
      s.processVariables.pipeFlowRate = pumpActive ? 24.5 : 0;

      // Update high and low limit sensors
      const highLimit = currentLevel >= 85.0;
      const lowLimit = currentLevel <= 15.0;

      const highSensor = s.objects.find((o) => o.id === 'sensor_high_switch');
      if (highSensor) {
        highSensor.state.detected = highLimit;
        setPlcInput('I0.0', highLimit);
      }

      const lowSensor = s.objects.find((o) => o.id === 'sensor_low_switch');
      if (lowSensor) {
        lowSensor.state.detected = lowLimit;
        setPlcInput('I0.1', lowLimit);
      }

      // Analog level transmitter
      const analogLevelTrans = s.objects.find((o) => o.id === 'sensor_level_trans');
      if (analogLevelTrans) {
        analogLevelTrans.state.value = s.processVariables.tankLevel;
      }
    }
  }

  public setSceneTemplate(template: ProcessSceneState['template']) {
    this.sceneState = this.createDefaultSceneState(template);
  }
}
