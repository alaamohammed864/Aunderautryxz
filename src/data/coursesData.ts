import { AssignmentTask } from '../types';
import { SAMPLE_PROJECTS } from './sampleProjects';

export const ASSIGNMENT_TASKS: AssignmentTask[] = [
  {
    id: 'asg_dol_motor',
    title: 'Assignment 1: Direct-On-Line Motor Starter with Overload Protection',
    category: 'PLC',
    difficulty: 'Beginner',
    description: 'Implement standard DOL motor starter logic with Start/Stop momentary pushbuttons, seal-in memory latch, and thermal overload trip interlock.',
    objective: 'Demonstrate proper latching and interlocking in Ladder Logic.',
    instructions: [
      '1. Map Start Button to I0.0 (NO) and Stop Button to I0.1 (NC).',
      '2. Map Thermal Overload contact to I0.2 (NC).',
      '3. When I0.0 is pressed momentarily, Q0.0 (KM1 Motor Contactor) must turn ON and stay ON via seal-in latch.',
      '4. When I0.1 (Stop) or I0.2 (Overload) opens, Q0.0 must immediately de-energize.',
      '5. Connect Green Run Lamp to Q0.1 and Red Trip Lamp to Q0.2.',
    ],
    recommendedModel: 'Siemens S7-1200',
    requiredInputs: [
      { address: 'I0.0', symbol: 'START_PB', desc: 'Start Pushbutton (NO)' },
      { address: 'I0.1', symbol: 'STOP_PB', desc: 'Stop Pushbutton (NC)' },
      { address: 'I0.2', symbol: 'OVERLOAD_NC', desc: 'Thermal Overload Trip Contact' },
    ],
    requiredOutputs: [
      { address: 'Q0.0', symbol: 'MOTOR_KM1', desc: 'Motor Main Contactor' },
      { address: 'Q0.1', symbol: 'RUN_LAMP', desc: 'Green Run Lamp' },
    ],
    testCases: [
      {
        id: 'tc1_start_latch',
        name: 'Test Case 1: Start Button Pulse & Seal-in Latch',
        description: 'Applies 100ms pulse on I0.0, checks that Q0.0 latches ON and stays ON after I0.0 is released.',
        inputsSequence: [
          { timeOffsetMs: 50, address: 'I0.0', value: true },
          { timeOffsetMs: 150, address: 'I0.0', value: false },
        ],
        expectedOutputs: [
          { timeOffsetMs: 250, address: 'Q0.0', expectedValue: true },
          { timeOffsetMs: 250, address: 'Q0.1', expectedValue: true },
        ],
        weightPoints: 50,
      },
      {
        id: 'tc2_stop_interlock',
        name: 'Test Case 2: Stop Button Immediate De-energization',
        description: 'While motor is running, presses Stop button (I0.1=true), verifies Q0.0 turns OFF.',
        inputsSequence: [
          { timeOffsetMs: 50, address: 'I0.0', value: true },
          { timeOffsetMs: 150, address: 'I0.0', value: false },
          { timeOffsetMs: 300, address: 'I0.1', value: true },
          { timeOffsetMs: 400, address: 'I0.1', value: false },
        ],
        expectedOutputs: [
          { timeOffsetMs: 450, address: 'Q0.0', expectedValue: false },
          { timeOffsetMs: 450, address: 'Q0.1', expectedValue: false },
        ],
        weightPoints: 50,
      },
    ],
    starterProject: SAMPLE_PROJECTS[0],
    maxScore: 100,
  },
  {
    id: 'asg_conveyor_sort',
    title: 'Assignment 2: Conveyor Optical Sorting & Pneumatic Diverter',
    category: 'DIGITAL_TWIN',
    difficulty: 'Intermediate',
    description: 'Program the optical sensor PE-2 and pneumatic cylinder diverter to reject defect packages into the side chute while counting total sorted parts.',
    objective: 'Implement sensor-driven timed actuation and counter integration.',
    instructions: [
      '1. Start conveyor belt drive on Q0.0 when master switch I0.0 is ON.',
      '2. When Optical Sensor PE-2 (I0.2) detects a defect box, extend pneumatic piston Q0.1 for 1.2 seconds using a TON timer.',
      '3. Retract piston after 1.2 seconds.',
      '4. Increment Counter C1 on each package passed.',
    ],
    recommendedModel: 'Siemens S7-1200',
    requiredInputs: [
      { address: 'I0.0', symbol: 'RUN_SW', desc: 'Master Run Switch' },
      { address: 'I0.2', symbol: 'PE_SORT', desc: 'Sorting Optical Eye' },
    ],
    requiredOutputs: [
      { address: 'Q0.0', symbol: 'CONVEYOR_M1', desc: 'Conveyor Drive Motor' },
      { address: 'Q0.1', symbol: 'CYL_SOLENOID', desc: 'Pneumatic Reject Diverter' },
    ],
    testCases: [
      {
        id: 'tc_conv_run',
        name: 'Test Case 1: Belt Run Command',
        description: 'Verifies conveyor motor Q0.0 starts when I0.0 is enabled.',
        inputsSequence: [{ timeOffsetMs: 50, address: 'I0.0', value: true }],
        expectedOutputs: [{ timeOffsetMs: 150, address: 'Q0.0', expectedValue: true }],
        weightPoints: 40,
      },
      {
        id: 'tc_piston_pulse',
        name: 'Test Case 2: Diverter Pulse Timing',
        description: 'Verifies diverter piston activates on sensor trigger and de-energizes.',
        inputsSequence: [
          { timeOffsetMs: 50, address: 'I0.0', value: true },
          { timeOffsetMs: 100, address: 'I0.2', value: true },
        ],
        expectedOutputs: [
          { timeOffsetMs: 200, address: 'Q0.1', expectedValue: false }, // before TON finishes or during pulse
        ],
        weightPoints: 60,
      },
    ],
    starterProject: SAMPLE_PROJECTS[1],
    maxScore: 100,
  },
];
