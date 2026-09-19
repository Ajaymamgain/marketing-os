import React, { useState } from 'react';
import {
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { AccountDemandUnit, BuyingRole, CommitteeMember } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface BuyingCommitteesViewProps {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
  onAddMember?: (accountId: string, member: CommitteeMember) => void;
}

export const BuyingCommitteesView: React.FC<BuyingCommitteesViewProps> = ({
  accounts,
  onSelectAccount,
}) => {
  const [filterMissingRole, setFilterMissingRole] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [addingMemberAccId, setAddingMemberAccId] = useState<string | null>(null);

  // Quick form state
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<BuyingRole>('technical_champion');
  const [newEmail, setNewEmail] = useState('');

  const filtered = accounts.filter((acc) => {
    if (search && !acc.accountName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMissingRole !== 'ALL' && !acc.committee.missingRoles.includes(filterMissingRole as BuyingRole)) {
      return false;
    }
    return true;
  });

  const handleSaveMember = (acc: AccountDemandUnit) => {
    if (!newName) return;
    playCadConfirm();
    const createdMember: CommitteeMember = {
      id: `MEM-${Date.now().toString().slice(-4)}`,
      name: newName,
      title: newTitle || 'Stakeholder',
      role: newRole,
      sentiment: 'SUPPORTIVE',
      influenceLevel: 'HIGH',
      engagementScore: 78,
      lastSeen: 'Just now',
      email: newEmail || `${newName.toLowerCase().replace(' ', '.')}@${acc.domain}`,
      keyNotes: 'Added via Buying Committee Operations workspace.',
    };

    acc.committee.members.push(createdMember);
    acc.committee.missingRoles = acc.committee.missingRoles.filter((r) => r !== newRole);
    acc.committee.totalIdentified = acc.committee.members.length;
    acc.committee.coverageScore = Math.min(100, Math.round((acc.committee.totalIdentified / 6) * 100));

    setAddingMemberAccId(null);
    setNewName('');
    setNewTitle('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // BUYING COMMITTEES
            </span>
            <span className="text-xs text-slate-400">ENTERPRISE 6-PERSONA MAPPING MATRIX</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Enterprise Buying Committee Operations
          </h2>
          <p className="text-xs text-slate-400">
            Audits stakeholder multi-threading across 6 core personas required for enterprise deal velocity.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#081220] border border-cyan-500/30 text-cyan-300">
            REQUIRED ROLES: 6 PER DU
          </span>
          <span className="px-2.5 py-1 rounded bg-[#081220] border border-amber-500/30 text-amber-300">
            {accounts.filter((a) => a.committee.missingRoles.includes('economic_buyer')).length} MISSING ECONOMIC BUYER
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded bg-[#081220] border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400">FILTER MISSING ROLE:</span>
          {[
            { id: 'ALL', label: 'ALL ACCOUNTS' },
            { id: 'economic_buyer', label: 'MISSING ECONOMIC BUYER' },
            { id: 'security_infosec', label: 'MISSING INFOSEC' },
            { id: 'procurement', label: 'MISSING PROCUREMENT' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                playCadClick();
                setFilterMissingRole(item.id);
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterMissingRole === item.id
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-slate-400 text-xs">
          SHOWING {filtered.length} OF {accounts.length} ACCOUNTS
        </div>
      </div>

      {/* Committees Account List */}
      <div className="space-y-4">
        {filtered.map((acc) => (
          <div
            key={acc.id}
            className="p-4 rounded bg-[#081220] border border-cyan-500/25 space-y-3.5 hover:border-cyan-400/40 transition-all"
          >
            {/* Account Header in Committee row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-900/30 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-white">{acc.accountName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  {acc.primaryMotion}
                </span>
                <span className="text-[10px] text-slate-400">ARR: ${(acc.estDealValue / 1000).toFixed(0)}k</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">COVERAGE:</span>
                  <span className="text-amber-300 font-bold text-xs">{acc.committee.coverageScore}%</span>
                  <span className="text-slate-500 text-[10px]">
                    ({acc.committee.totalIdentified}/6 Roles)
                  </span>
                </div>

                <button
                  onClick={() => {
                    playCadClick();
                    setAddingMemberAccId(addingMemberAccId === acc.id ? null : acc.id);
                  }}
                  className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3 h-3 text-cyan-400" />
                  <span>ADD STAKEHOLDER</span>
                </button>

                <button
                  onClick={() => {
                    playCadClick();
                    onSelectAccount(acc);
                  }}
                  className="px-2 py-1 rounded bg-[#070e1a] hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>INSPECT</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick Add Stakeholder Inline Form */}
            {addingMemberAccId === acc.id && (
              <div className="p-3 rounded bg-[#060c17] border border-cyan-400/40 space-y-3 animate-fadeIn">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                  MAP NEW STAKEHOLDER TO {acc.accountName.toUpperCase()}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Dr. Maya Lin)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="p-1.5 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="Title (e.g. VP Infrastructure)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="p-1.5 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as BuyingRole)}
                    className="p-1.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="technical_champion">Technical Champion</option>
                    <option value="economic_buyer">Economic Buyer</option>
                    <option value="security_infosec">Security / InfoSec</option>
                    <option value="day_to_day_evaluator">Day-to-day Evaluator</option>
                    <option value="procurement">Procurement / Legal</option>
                    <option value="executive_sponsor">Executive Sponsor</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveMember(acc)}
                      className="flex-1 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-colors"
                    >
                      CONFIRM MAP
                    </button>
                    <button
                      onClick={() => setAddingMemberAccId(null)}
                      className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mapped Members Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {acc.committee.members.map((member) => (
                <div
                  key={member.id}
                  className="p-2.5 rounded bg-[#070e1a] border border-cyan-950 flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{member.name}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded border font-bold ${
                          member.sentiment === 'CHAMPION' || member.sentiment === 'positive'
                            ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                            : member.sentiment === 'SUPPORTIVE' || member.sentiment === 'neutral'
                            ? 'bg-cyan-950 border-cyan-500/40 text-cyan-300'
                            : 'bg-rose-950 border-rose-500/40 text-rose-400'
                        }`}
                      >
                        {member.sentiment}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{member.title}</p>
                    <span className="text-[10px] text-cyan-400/80 block">
                      ROLE: {member.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-cyan-300 block">
                      {member.engagementScore} PTS
                    </span>
                    <span className="text-[9px] text-slate-500">{member.influenceLevel} INFL</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Missing Roles Warning */}
            {acc.committee.missingRoles.length > 0 && (
              <div className="p-2 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  GAP WARNING: Missing critical roles:{' '}
                  {acc.committee.missingRoles.map((r) => r.replace('_', ' ').toUpperCase()).join(', ')}
                </span>
                <span className="text-[10px] text-slate-400">Playbook: Dispatch Multi-Thread Campaign</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
