import { AssignmentTask, GradingResult, SubmissionResult, TwinLabProject, PlcProgram } from '../../types';
import { PlcSimulationEngine } from '../plc/plcEngine';

export class AssignmentGraderEngine {
  public static async gradeAssignment(
    task: AssignmentTask,
    program: PlcProgram
  ): Promise<GradingResult> {
    let totalScore = 0;
    const testResults = [];

    for (const tc of task.testCases) {
      const plcEngine = new PlcSimulationEngine(program);
      let testPassed = true;
      let failureReason = '';

      plcEngine.reset();

      let maxTime = 1000;
      tc.inputsSequence.forEach((i) => {
        if (i.timeOffsetMs > maxTime) maxTime = i.timeOffsetMs;
      });
      tc.expectedOutputs.forEach((o) => {
        if (o.timeOffsetMs > maxTime) maxTime = o.timeOffsetMs;
      });
      maxTime += 500;

      const dt = 20;
      let currentTime = 0;

      while (currentTime <= maxTime) {
        tc.inputsSequence.forEach((inp) => {
          if (currentTime >= inp.timeOffsetMs && currentTime < inp.timeOffsetMs + dt * 2) {
            if (typeof inp.value === 'boolean') {
              plcEngine.setBit(inp.address, inp.value);
            } else {
              plcEngine.setNumeric(inp.address, inp.value);
            }
          }
        });

        plcEngine.executeScan(dt);

        for (const out of tc.expectedOutputs) {
          if (currentTime >= out.timeOffsetMs && currentTime < out.timeOffsetMs + dt) {
            const actualVal =
              typeof out.expectedValue === 'boolean'
                ? plcEngine.getBit(out.address)
                : plcEngine.getNumeric(out.address);

            if (actualVal !== out.expectedValue) {
              testPassed = false;
              failureReason = `At ${currentTime}ms: ${out.address} was ${actualVal}, expected ${out.expectedValue}`;
              break;
            }
          }
        }

        if (!testPassed) break;
        currentTime += dt;
      }

      const pointsEarned = testPassed ? tc.weightPoints : 0;
      totalScore += pointsEarned;

      testResults.push({
        testCaseId: tc.id,
        name: tc.name,
        passed: testPassed,
        earnedPoints: pointsEarned,
        details: testPassed
          ? '✓ Test passed successfully. All outputs matched required timing.'
          : `✗ Test failed: ${failureReason}`,
      });
    }

    const maxScore = task.maxScore || 100;
    return {
      passed: totalScore >= maxScore * 0.7,
      totalScore,
      maxScore,
      testResults,
    };
  }

  public static gradeSubmission(

    task: AssignmentTask,
    project: TwinLabProject,
    studentId: string = 'std_01',
    studentName: string = 'Student Alex'
  ): SubmissionResult {
    let totalScore = 0;
    const testCaseResults = [];

    for (const tc of task.testCases) {
      // Create isolated test PLC runner
      const plcEngine = new PlcSimulationEngine(project.ladder);
      let testPassed = true;
      let failureReason = '';

      // Initialize inputs and outputs
      plcEngine.reset();

      // Find max time duration in test case
      let maxTime = 1000;
      tc.inputsSequence.forEach((i) => {
        if (i.timeOffsetMs > maxTime) maxTime = i.timeOffsetMs;
      });
      tc.expectedOutputs.forEach((o) => {
        if (o.timeOffsetMs > maxTime) maxTime = o.timeOffsetMs;
      });
      maxTime += 500; // grace period

      const dt = 20; // 20ms scan
      let currentTime = 0;

      while (currentTime <= maxTime) {
        // Apply input vectors scheduled at or before this timestamp
        tc.inputsSequence.forEach((inp) => {
          if (currentTime >= inp.timeOffsetMs && currentTime < inp.timeOffsetMs + dt * 2) {
            if (typeof inp.value === 'boolean') {
              plcEngine.setBit(inp.address, inp.value);
            } else {
              plcEngine.setNumeric(inp.address, inp.value);
            }
          }
        });

        // Run PLC scan
        plcEngine.executeScan(dt);

        // Check output assertions
        for (const out of tc.expectedOutputs) {
          if (currentTime >= out.timeOffsetMs && currentTime < out.timeOffsetMs + dt) {
            const actualVal =
              typeof out.expectedValue === 'boolean'
                ? plcEngine.getBit(out.address)
                : plcEngine.getNumeric(out.address);

            if (actualVal !== out.expectedValue) {
              testPassed = false;
              failureReason = `At ${currentTime}ms: ${out.address} was ${actualVal}, expected ${out.expectedValue}`;
              break;
            }
          }
        }

        if (!testPassed) break;
        currentTime += dt;
      }

      const pointsEarned = testPassed ? tc.weightPoints : 0;
      totalScore += pointsEarned;

      testCaseResults.push({
        testId: tc.id,
        name: tc.name,
        passed: testPassed,
        actualScore: pointsEarned,
        feedback: testPassed
          ? '✓ Test passed successfully. All outputs matched required timing.'
          : `✗ Test failed: ${failureReason}`,
      });
    }

    const maxScore = task.maxScore || 100;
    const passed = totalScore >= maxScore * 0.7;

    return {
      assignmentId: task.id,
      studentId,
      studentName,
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: totalScore,
      maxScore,
      passed,
      testCaseResults,
      overallFeedback: passed
        ? `Excellent job! Your logic verified ${totalScore}/${maxScore} points.`
        : `Logic did not pass all automated simulation criteria (${totalScore}/${maxScore}). Review timing rungs and I/O assignments.`,
    };
  }
}
