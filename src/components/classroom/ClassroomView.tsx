import React, { useState } from 'react';
import {
  AssignmentTask,
  GradingResult,
  PlcProgram,
  TwinLabProject,
  UserRole,
} from '../../types';
import { ASSIGNMENT_TASKS } from '../../data/coursesData';
import { AssignmentGraderEngine } from '../../engine/autograder/assignmentEngine';
import {
  GraduationCap,
  Users,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookOpen,
  FileCode,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface ClassroomViewProps {
  currentProgram: PlcProgram;
  onLoadProject: (p: TwinLabProject) => void;
  userRole: UserRole;
}

export const ClassroomView: React.FC<ClassroomViewProps> = ({
  currentProgram,
  onLoadProject,
  userRole,
}) => {
  const [selectedTask, setSelectedTask] = useState<AssignmentTask>(ASSIGNMENT_TASKS[0]);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  const runGrading = async () => {
    setIsGrading(true);
    setGradingResult(null);

    // Run testbench evaluation
    const result = await AssignmentGraderEngine.gradeAssignment(selectedTask, currentProgram);
    setGradingResult(result);
    setIsGrading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-['Rajdhani'] tracking-wide flex items-center gap-2">
                <span>VIRTUAL CLASSROOM & AUTOMATED ASSIGNMENT GRADER</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 uppercase">
                  {userRole} Mode
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Automated simulation testbench runner with real-time test vector grading
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Task Selector & Auto-Grader Runner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Course Exercises List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Available Assignments</span>
            </h2>

            <div className="space-y-2">
              {ASSIGNMENT_TASKS.map((task) => {
                const isSelected = selectedTask.id === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setGradingResult(null);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                        {task.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Max: {task.maxScore} pts
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-100">{task.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Virtual Classroom Live Roster */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live Virtual Lab Roster</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">4 Online</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="font-medium text-slate-200">Dr. Alan Vance (Instructor)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Host
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Elena Rostova (Student)</span>
                  <span className="text-[9px] text-emerald-400 font-mono">Score: 100%</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Marcus Chen (Student)</span>
                  <span className="text-[9px] text-amber-400 font-mono">Score: 85%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Assignment Workspace & Auto-Grader */}
          <div className="lg:col-span-2 space-y-4">
            {/* Task Details Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-['Rajdhani']">
                    {selectedTask.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedTask.objective}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onLoadProject(selectedTask.starterProject)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Load Starter Project</span>
                  </button>

                  <button
                    onClick={runGrading}
                    disabled={isGrading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isGrading ? 'Evaluating Tests...' : 'Run Auto-Grader'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions list */}
              <div className="space-y-1.5 mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Implementation Instructions
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {selectedTask.instructions.map((ins, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Required I/O Tags Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Required Inputs
                  </span>
                  <div className="space-y-1">
                    {selectedTask.requiredInputs.map((inp) => (
                      <div
                        key={inp.address}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono"
                      >
                        <span className="text-cyan-300 font-bold">{inp.address}</span>
                        <span className="text-slate-400 font-sans">{inp.symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Required Outputs
                  </span>
                  <div className="space-y-1">
                    {selectedTask.requiredOutputs.map((out) => (
                      <div
                        key={out.address}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono"
                      >
                        <span className="text-emerald-300 font-bold">{out.address}</span>
                        <span className="text-slate-400 font-sans">{out.symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Testbench Grading Results Report */}
            {gradingResult && (
              <div
                className={`border rounded-xl p-5 shadow-xl transition-all ${
                  gradingResult.passed
                    ? 'bg-emerald-950/20 border-emerald-500/80 shadow-emerald-950/30'
                    : 'bg-rose-950/20 border-rose-500/80 shadow-rose-950/30'
                }`}
              >
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    {gradingResult.passed ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
                        <XCircle className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {gradingResult.passed
                          ? 'Assignment Successfully Verified!'
                          : 'Testbench Verification Failed'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Evaluated {gradingResult.testResults.length} test vector sequences
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-white">
                      {gradingResult.totalScore} / {gradingResult.maxScore}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">
                      Grade Points
                    </span>
                  </div>
                </div>

                {/* Test Results Breakdown */}
                <div className="space-y-2">
                  {gradingResult.testResults.map((tr) => (
                    <div
                      key={tr.testCaseId}
                      className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        {tr.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-slate-200">{tr.name}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{tr.details}</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-cyan-400 shrink-0">
                        {tr.earnedPoints} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
