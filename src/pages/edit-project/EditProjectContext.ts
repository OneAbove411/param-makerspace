import { createContext, useContext } from 'react';
import type { Project } from '../../lib/database.types';
import type { AutosaveStatus } from '../../lib/useAutosave';
import type { ProjectWithRelations } from '../../lib/hooks';

export interface EditProjectContextType {
  // Data
  project: ProjectWithRelations;
  user: any;

  // Form state
  form: Partial<Project>;
  setForm: (form: Partial<Project>) => void;
  formDirty: boolean;
  setFormDirty: (dirty: boolean) => void;

  // Autosave
  autosaveStatus: AutosaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;

  // Loading states
  actionLoading: boolean;
  setActionLoading: (loading: boolean) => void;
  uploadingImage: boolean;
  uploadingFile: boolean;

  // Milestones
  milestones: any[];
  setMilestones: (milestones: any[]) => void;
  newMilestoneTitle: string;
  setNewMilestoneTitle: (title: string) => void;
  newMilestoneDesc: string;
  setNewMilestoneDesc: (desc: string) => void;

  // Videos
  videos: any[];
  setVideos: (videos: any[]) => void;
  newVideoUrl: string;
  setNewVideoUrl: (url: string) => void;
  newVideoTitle: string;
  setNewVideoTitle: (title: string) => void;
  videoUrlError: string;
  setVideoUrlError: (error: string) => void;
  addingVideo: boolean;
  setAddingVideo: (adding: boolean) => void;

  // Members
  members: any[];
  setMembers: (members: any[]) => void;
  addingRole: 'collaborator' | 'mentor';
  setAddingRole: (role: 'collaborator' | 'mentor') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  setSearchResults: (results: any[]) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;

  // Media tab
  mediaTab: 'gallery' | 'videos' | 'files';
  setMediaTab: (tab: 'gallery' | 'videos' | 'files') => void;

  // Handlers
  updateField: <K extends keyof Project>(key: K, value: any) => void;
  refetch: () => Promise<void>;

  // Milestone handlers
  fetchMilestones: () => Promise<void>;
  handleAddMilestone: () => Promise<void>;
  handleToggleMilestone: (milestoneId: string, currentVal: boolean) => Promise<void>;
  handleDeleteMilestone: (milestoneId: string) => Promise<void>;
  handleReorderMilestone: (milestoneId: string, direction: 'up' | 'down') => Promise<void>;

  // Video handlers
  fetchVideos: () => Promise<void>;
  handleAddVideo: (e: React.FormEvent) => Promise<void>;
  handleDeleteVideo: (videoId: string) => Promise<void>;

  // Media handlers
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteImage: (imageId: string, url: string) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteFile: (fileId: string, url: string) => Promise<void>;

  // Member handlers
  fetchMembers: () => Promise<void>;
  handleAddMember: (selectedUser: any) => Promise<void>;
  handleRemoveMember: (memberId: string) => Promise<void>;
  handleUpdateMemberRole: (memberId: string, newRole: string) => Promise<void>;

  // Utils
  milestoneListRef: React.RefObject<HTMLOListElement | null>;
  newVideoUrlRef: React.RefObject<HTMLInputElement | null>;

  // Submit
  handleSave: (e: React.FormEvent) => Promise<void>;
  handleSubmitForReview: () => Promise<void>;
}

export const EditProjectContext = createContext<EditProjectContextType | undefined>(undefined);

export function useEditProject() {
  const ctx = useContext(EditProjectContext);
  if (!ctx) {
    throw new Error('useEditProject must be used within EditProjectShell');
  }
  return ctx;
}
