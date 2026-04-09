import React from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SectionHeader } from '../../components/project/SectionHeader';
import { useEditProject } from './EditProjectContext';

export function EditCoreTab() {
  const {
    form,
    updateField,
    handleSave,
    actionLoading,
    project,
  } = useEditProject();

  return (
    <div className="relative">
      {project.status === 'pending_review' && (
        <div className="absolute inset-0 bg-brutal-bg/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
          <div className="bg-white p-6 border-2 border-yellow-500 text-center max-w-sm rounded-xl shadow-xl">
            <h3 className="font-heading font-bold text-xl text-yellow-600 uppercase mb-2">Under Review</h3>
            <p className="font-data text-sm text-brutal-dark/80">Core details are locked during mentor review.</p>
          </div>
        </div>
      )}

      <SectionHeader
        variant="drama"
        as="h2"
        eyebrow="Project Details"
        title="Core"
        hairlineMarginClass="mb-6"
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Input
          label="Project Title"
          required
          value={form.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
        />
        <Input
          label="Summary"
          required
          value={form.summary || ''}
          onChange={(e) => updateField('summary', e.target.value)}
          placeholder="One-line description of this project"
        />
        <div>
          <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Description</label>
          <textarea
            required
            className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded-xl font-data min-h-[200px] focus:outline-none focus:border-brutal-dark transition-colors"
            value={form.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Detailed project description, goals, and technical approach..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Domain"
            value={form.domain || ''}
            onChange={(e) => updateField('domain', e.target.value)}
            placeholder="e.g. Robotics"
          />
          <Input
            label="Tier"
            value={form.tier || ''}
            onChange={(e) => updateField('tier', e.target.value)}
            placeholder="e.g. Tier 2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Duration"
            placeholder="e.g. 2 weeks"
            value={form.duration || ''}
            onChange={(e) => updateField('duration', e.target.value)}
          />
          <Input
            label="GitHub URL"
            placeholder="https://github.com/..."
            value={form.github_url || ''}
            onChange={(e) => updateField('github_url', e.target.value)}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={actionLoading} className="gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
