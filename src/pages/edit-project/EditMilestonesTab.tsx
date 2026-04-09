import React from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/project/SectionHeader';
import { useEditProject } from './EditProjectContext';

export function EditMilestonesTab() {
  const {
    milestones,
    newMilestoneTitle,
    setNewMilestoneTitle,
    newMilestoneDesc,
    setNewMilestoneDesc,
    handleAddMilestone,
    handleToggleMilestone,
    handleDeleteMilestone,
    handleReorderMilestone,
    actionLoading,
    milestoneListRef,
  } = useEditProject();

  const completedMilestones = milestones.filter((m: any) => m.is_complete).length;
  const totalMilestones = milestones.length;
  const milestonePercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <section ref={milestoneListRef}>
      <SectionHeader
        variant="drama"
        eyebrow="Build Progress"
        title="Milestones"
        rightSlot={totalMilestones > 0 ? `${completedMilestones}/${totalMilestones} Done` : undefined}
        hairlineMarginClass="mb-6"
      />

      {/* Progress bar */}
      {totalMilestones > 0 && (
        <div
          className="w-full h-1 bg-brutal-dark/8 rounded-full mb-8 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(milestonePercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Milestone completion"
        >
          <div
            className="h-full bg-brutal-red rounded-full origin-left transition-all duration-700"
            style={{ width: `${milestonePercent}%` }}
          />
        </div>
      )}

      {/* Add milestone inputs */}
      <div className="flex flex-col gap-2 mb-6 p-4 rounded-xl bg-brutal-dark/[0.03] border border-brutal-dark/8">
        <input
          type="text"
          placeholder="Milestone title"
          className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
          value={newMilestoneTitle}
          onChange={(e) => setNewMilestoneTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
          value={newMilestoneDesc}
          onChange={(e) => setNewMilestoneDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
        />
        <Button
          size="sm"
          onClick={handleAddMilestone}
          disabled={actionLoading || !newMilestoneTitle.trim()}
          className="mt-1 self-start"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Milestone
        </Button>
      </div>

      {/* Milestone grid */}
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
        {[...milestones]
          .sort((a, b) => a.display_order - b.display_order)
          .map((m: any, i: number, arr: any[]) => (
            <li
              key={m.id}
              className={`p-5 rounded-2xl border-2 transition-all duration-300 group relative
                ${m.is_complete
                  ? 'bg-brutal-bg border-brutal-dark/5 opacity-60'
                  : 'bg-brutal-bg border-brutal-dark/10 hover:border-brutal-red/30'
                }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleMilestone(m.id, m.is_complete)}
                  aria-pressed={!!m.is_complete}
                  aria-label={
                    m.is_complete
                      ? `Mark "${m.title}" as incomplete`
                      : `Mark "${m.title}" as complete`
                  }
                  className={`mt-1 flex-shrink-0 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center rounded
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red
                    ${m.is_complete ? 'text-green-600' : 'text-brutal-dark/30 hover:text-brutal-dark/60'}`}
                >
                  {m.is_complete ? (
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Circle className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
                <div className="flex-1 overflow-hidden">
                  <span className="font-data text-2xl font-bold text-brutal-red" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4
                    className={`font-heading font-bold text-sm uppercase tracking-tight-heading mt-1
                      ${m.is_complete ? 'line-through text-brutal-dark/40' : 'text-brutal-dark'}`}
                  >
                    {m.title}
                  </h4>
                  {m.description && (
                    <p className="font-data text-xs text-brutal-dark/50 mt-1 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReorderMilestone(m.id, 'up')}
                    disabled={i === 0}
                    aria-label={`Move "${m.title}" up`}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-brutal-dark/40
                      hover:text-brutal-dark hover:bg-brutal-dark/5 disabled:opacity-20 disabled:pointer-events-none
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorderMilestone(m.id, 'down')}
                    disabled={i === arr.length - 1}
                    aria-label={`Move "${m.title}" down`}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-brutal-dark/40
                      hover:text-brutal-dark hover:bg-brutal-dark/5 disabled:opacity-20 disabled:pointer-events-none
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMilestone(m.id)}
                    aria-label={`Delete milestone "${m.title}"`}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-brutal-red
                      hover:bg-brutal-red/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
      </ol>
      {milestones.length === 0 && (
        <p className="font-data text-xs text-brutal-dark/35 italic pl-0.5">
          No milestones yet — break the build into trackable steps above.
        </p>
      )}
    </section>
  );
}
