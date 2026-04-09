import React from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/project/SectionHeader';
import { useEditProject } from './EditProjectContext';

export function EditTeamTab() {
  const {
    project,
    user,
    members,
    addingRole,
    setAddingRole,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleAddMember,
    handleRemoveMember,
    handleUpdateMemberRole,
  } = useEditProject();

  return (
    <section>
      <SectionHeader
        variant="drama"
        eyebrow="Collaboration"
        title="Team"
        hairlineMarginClass="mb-6"
      />

      <div className="mb-6 relative">
        <div className="flex gap-2 mb-3 bg-brutal-dark/[0.03] p-1 rounded-lg border border-brutal-dark/8">
          <button
            type="button"
            onClick={() => setAddingRole('collaborator')}
            className={`flex-1 py-1.5 px-3 rounded-md font-data text-xs font-bold uppercase transition-colors ${
              addingRole === 'collaborator'
                ? 'bg-brutal-dark text-brutal-bg'
                : 'text-brutal-dark/50 hover:bg-brutal-dark/5'
            }`}
          >
            Contributor
          </button>
          <button
            type="button"
            onClick={() => setAddingRole('mentor')}
            className={`flex-1 py-1.5 px-3 rounded-md font-data text-xs font-bold uppercase transition-colors ${
              addingRole === 'mentor'
                ? 'bg-brutal-dark text-brutal-bg'
                : 'text-brutal-dark/50 hover:bg-brutal-dark/5'
            }`}
          >
            Mentor
          </button>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-brutal-dark/40" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-white border border-brutal-dark/20 pl-9 pr-4 py-2.5 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-3 w-4 h-4 text-brutal-dark/60 animate-spin" aria-hidden="true" />
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-brutal-dark/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
            {searchResults.map((res) => (
              <div
                key={res.id}
                className="flex items-center justify-between p-3 hover:bg-brutal-dark/5 border-b border-brutal-dark/5 last:border-0"
              >
                <div className="overflow-hidden">
                  <div className="font-data text-sm font-bold truncate">{res.name}</div>
                  <div className="font-data text-xs text-brutal-dark/50 truncate">{res.email}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-brutal-red"
                  onClick={() => handleAddMember(res)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-xs flex-shrink-0">
              {(project as any).ownerName?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div>
              <div className="font-data text-sm font-bold">{(project as any).ownerName || 'Owner'}</div>
              <div className="font-data text-[10px] font-bold text-brutal-red uppercase">Owner</div>
            </div>
          </div>
        </div>
        {members
          .filter((m: any) => m.user_id !== project.owner_id)
          .map((m: any) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-4 rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg group"
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                <div className="w-8 h-8 rounded-full bg-brutal-dark/10 text-brutal-dark font-heading font-bold flex items-center justify-center text-xs flex-shrink-0">
                  {m.app_user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="overflow-hidden">
                  <div className="font-data text-sm font-bold truncate">{m.app_user?.name}</div>
                  <select
                    aria-label={`Role for ${m.app_user?.name || 'member'}`}
                    className="font-data text-[10px] uppercase bg-transparent text-brutal-dark/60 border-none p-0 focus:ring-0 cursor-pointer"
                    value={m.role}
                    onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                    disabled={project.owner_id !== user?.id}
                  >
                    <option value="collaborator">Collaborator</option>
                    <option value="co-lead">Co-Lead</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </div>
              </div>
              {project.owner_id === user?.id && (
                <button
                  onClick={() => handleRemoveMember(m.id)}
                  className="text-brutal-red p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        {members.length === 0 && (
          <div className="text-center font-data text-xs text-brutal-dark/40 py-4 border-2 border-dashed border-brutal-dark/10 rounded-2xl">
            No team members added yet.
          </div>
        )}
      </div>
    </section>
  );
}
