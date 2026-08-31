import { PidControllerParams } from '../../types';

export class PidProcessEngine {
  public params: PidControllerParams;

  constructor(initialParams?: Partial<PidControllerParams>) {
    this.params = {
      id: 'PID_01',
      name: 'Tank Level PID Loop',
      sp: 65.0, // Setpoint %
      pv: 20.0, // Initial PV %
      output: 0.0, // Control Output 0-100%
      kp: 2.4, // Proportional Gain
      ki: 0.15, // Integral Gain
      kd: 0.05, // Derivative Gain
      sampleTime: 0.05, // 50ms
      autoMode: true,
      manualOutput: 0.0,
      deadband: 0.2,
      error: 0.0,
      integralSum: 0.0,
      prevError: 0.0,
      ...initialParams,
    };
  }

  public step(dt: number = 0.05, externalDisturbance: number = 0): { pv: number; output: number; sp: number; error: number } {
    const p = this.params;

    if (!p.autoMode) {
      p.output = Math.max(0, Math.min(100, p.manualOutput));
    } else {
      // Calculate error
      let currentError = p.sp - p.pv;

      // Deadband check
      if (Math.abs(currentError) < p.deadband) {
        currentError = 0;
      }
      p.error = currentError;

      // Proportional term
      const pTerm = p.kp * currentError;

      // Integral term with anti-windup clamping
      p.integralSum += currentError * dt;
      p.integralSum = Math.max(-100, Math.min(100, p.integralSum));
      const iTerm = p.ki * p.integralSum;

      // Derivative term
      const dError = (currentError - p.prevError) / (dt > 0 ? dt : 0.05);
      const dTerm = p.kd * dError;
      p.prevError = currentError;

      // PID Output calculation
      let calculatedOutput = pTerm + iTerm + dTerm;
      p.output = Math.max(0, Math.min(100, calculatedOutput));
    }

    // First-order process dynamics response:
    // Rate of change of PV = (Output * ValveGain) - (DrainRate + Disturbance)
    const inflowRate = (p.output / 100) * 8.0; // max 8 % / sec
    const outflowRate = 1.8 + externalDisturbance; // natural drain / outflow
    const netFlow = inflowRate - outflowRate;

    p.pv = Math.max(0, Math.min(100, p.pv + netFlow * dt));

    return {
      pv: Number(p.pv.toFixed(2)),
      output: Number(p.output.toFixed(2)),
      sp: p.sp,
      error: Number(p.error.toFixed(2)),
    };
  }

  public setSetpoint(sp: number) {
    this.params.sp = Math.max(0, Math.min(100, sp));
  }

  public setTuning(kp: number, ki: number, kd: number) {
    this.params.kp = kp;
    this.params.ki = ki;
    this.params.kd = kd;
  }

  public toggleMode(auto: boolean) {
    this.params.autoMode = auto;
    if (!auto) {
      this.params.manualOutput = this.params.output;
    }
  }
}
