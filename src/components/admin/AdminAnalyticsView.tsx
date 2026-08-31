import React from 'react';
import { UserRole } from '../../types';
import {
  BarChart3,
  Users,
  ShieldCheck,
  Award,
  CreditCard,
  Download,
  CheckCircle,
  Activity,
  Cpu,
  Server,
  Zap,
} from 'lucide-react';

interface AdminAnalyticsViewProps {
  userRole: UserRole;
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({ userRole }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-['Rajdhani'] tracking-wide">
                LABORATORY ANALYTICS & INSTITUTIONAL ADMINISTRATION
              </h1>
              <p className="text-xs text-slate-400">
                Institutional usage telemetry, auto-grading gradebook analytics, and subscription licensing
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const data = JSON.stringify({
                timestamp: new Date().toISOString(),
                institution: 'MIT Industrial Automation Lab',
                activeStudents: 142,
                totalLabHours: 1248.5,
                overallPassRate: '94.2%',
              }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `twinlab-gradebook-report-${Date.now()}.json`;
              a.click();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Analytics Report</span>
          </button>
        </div>

        {/* Telemetry Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Active Students</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">142</div>
            <span className="text-[10px] text-emerald-400 font-semibold">+18% this semester</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Auto-Grading Pass Rate</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">94.2%</div>
            <span className="text-[10px] text-slate-400">Over 1,840 automated test runs</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Avg. Scan Cycle Execution</span>
              <Cpu className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-300 font-mono">0.68 ms</div>
            <span className="text-[10px] text-slate-400">Deterministic scan engine</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Cloud TwinLab Sandbox</span>
              <Server className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300 font-mono">99.99%</div>
            <span className="text-[10px] text-emerald-400 font-semibold">Zero Crashes Reported</span>
          </div>
        </div>

        {/* Subscription & Licensing Tiers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Institutional Subscription & Seats
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Community</span>
                <div className="text-xl font-bold text-white mt-1">$0 / Free</div>
                <p className="text-xs text-slate-400 mt-2">
                  Complete browser PLC, Electrical, and 3D simulation for self-paced students and makers.
                </p>
              </div>
              <button className="mt-4 w-full py-1.5 rounded bg-slate-800 text-slate-300 text-xs font-semibold">
                Current Plan
              </button>
            </div>

            {/* Academic Pro */}
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/60 shadow-lg shadow-cyan-950/40 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-cyan-400 uppercase">Academic Campus</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold">
                    RECOMMENDED
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-1">$49 / mo per Lab</div>
                <p className="text-xs text-slate-300 mt-2">
                  Unlimited student seats, auto-grading testbenches, live classroom broadcasting, and Siemens/Delta exports.
                </p>
              </div>
              <button className="mt-4 w-full py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold">
                Active Academic License
              </button>
            </div>

            {/* Industrial Enterprise */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase">Industrial Enterprise</span>
                <div className="text-xl font-bold text-white mt-1">Custom / Org</div>
                <p className="text-xs text-slate-400 mt-2">
                  Hardware-in-the-loop OPC UA connectivity, customized factory 3D assets, SCADA telemetry streaming, and SSO.
                </p>
              </div>
              <button className="mt-4 w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
                Contact Enterprise Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
