import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Filter,
  Clock,
  User,
  AlertTriangle,
  Building,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { OperationalTask, AccountDemandUnit } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface TasksActivityViewProps {
  tasks: OperationalTask[];
  accounts: AccountDemandUnit[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<OperationalTask, 'id' | 'createdAt'>) => void;
  onSelectAccount: (account: AccountDemandUnit) => void;
}

export const TasksActivityView: React.FC<TasksActivityViewProps> = ({
  tasks,
  accounts,
  onToggleTask,
  onAddTask,
  onSelectAccount,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newAccountId, setNewAccountId] = useState(accounts[0]?.id || '');
  const [newPriority, setNewPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newDueDate, setNewDueDate] = useState('Today, 5:00 PM');
  const [newAssignee, setNewAssignee] = useState('Sarah Chen (Enterprise AE)');
  const [newMotion, setNewMotion] = useState<'PLG' | 'SLG' | 'DUAL'>('DUAL');

  const isUrgent = (p: string) => p === 'URGENT' || p === 'URGENT_SURGE';

  const filtered = tasks.filter((t) => {
    if (priorityFilter === 'URGENT') return isUrgent(t.priority);
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    playCadConfirm();

    const selectedAcc = accounts.find((a) => a.id === newAccountId);

    onAddTask({
      title: newTitle,
      accountId: newAccountId,
      accountName: selectedAcc?.accountName || 'Unknown Account',
      priority: newPriority,
      dueDate: newDueDate,
      assignedTo: newAssignee,
      motion: newMotion,
      completed: false,
    });

    setNewTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // MARKETING OPS ACTIVITY
            </span>
            <span className="text-xs text-slate-400">OPERATIONAL TASKS &amp; FIELD EXECUTION</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Tasks &amp; Operational Marketing Activity Hub
          </h2>
          <p className="text-xs text-slate-400">
            Autonomous tasks dispatched to AEs, SDRs, and Solutions Architects based on demand unit signals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playCadClick();
              setShowAddModal(true);
            }}
            className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>DISPATCH NEW TASK</span>
          </button>
        </div>
      </div>

      {/* New Task Inline Modal */}
      {showAddModal && (
        <div className="p-4 rounded bg-[#081220] border border-cyan-400/50 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
            <span className="text-xs font-bold text-cyan-300">DISPATCH NEW REVOPS OPERATIONAL TASK</span>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              CANCEL [ESC]
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 text-[10px]">TASK ACTION DESCRIPTION:</label>
              <input
                type="text"
                placeholder="e.g. Schedule Executive Briefing with CIO regarding seat expansion"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">TARGET ACCOUNT DEMAND UNIT:</label>
              <select
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">PRIORITY LEVEL:</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-2 text-white"
              >
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">ASSIGNED REPRESENTATIVE:</label>
              <input
                type="text"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">TARGET MOTION:</label>
              <select
                value={newMotion}
                onChange={(e) => setNewMotion(e.target.value as any)}
                className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-2 text-white"
              >
                <option value="DUAL">DUAL MOTION</option>
                <option value="PLG">PLG EXPANSION</option>
                <option value="SLG">SLG ENTERPRISE</option>
              </select>
            </div>

            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-colors"
              >
                CONFIRM TASK DISPATCH
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-3 rounded bg-[#081220] border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            PRIORITY:
          </span>
          {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <button
              key={p}
              onClick={() => {
                playCadClick();
                setPriorityFilter(p);
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                priorityFilter === p
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="text-slate-400 text-xs">
          {tasks.filter((t) => !t.completed).length} PENDING / {tasks.filter((t) => t.completed).length} COMPLETED
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filtered.map((task) => {
          const matchedAcc = accounts.find((a) => a.id === task.accountId);
          return (
            <div
              key={task.id}
              className={`p-3.5 rounded border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                task.completed
                  ? 'bg-[#060b13]/50 border-slate-800 opacity-60'
                  : isUrgent(task.priority)
                  ? 'bg-[#0e101d] border-amber-500/40'
                  : 'bg-[#081322] border-cyan-500/20 hover:border-cyan-400/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
                    playCadClick();
                    onToggleTask(task.id);
                  }}
                  className="mt-0.5 text-cyan-400 hover:text-cyan-200 cursor-pointer"
                >
                  {task.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-600 hover:text-cyan-400" />
                  )}
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        task.completed ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                        isUrgent(task.priority)
                          ? 'bg-rose-950 border-rose-500/40 text-rose-300'
                          : task.priority === 'HIGH'
                          ? 'bg-amber-950 border-amber-500/40 text-amber-300'
                          : 'bg-cyan-950 border-cyan-500/30 text-cyan-300'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                      {task.motion}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="text-cyan-300 font-bold">{task.accountName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {task.assignedTo}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      DUE: {task.dueDate}
                    </span>
                  </div>
                </div>
              </div>

              {matchedAcc && (
                <button
                  onClick={() => {
                    playCadClick();
                    onSelectAccount(matchedAcc);
                  }}
                  className="px-2.5 py-1 rounded bg-[#091526] hover:bg-[#0c1c33] border border-cyan-500/30 text-cyan-300 text-xs self-end sm:self-center cursor-pointer transition-colors"
                >
                  INSPECT DU →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
