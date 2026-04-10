/**
 * Admin Announcements Management Page
 *
 * REQUIRED SQL MIGRATION:
 * ───────────────────────
 * CREATE TABLE announcement (
 *     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *     title TEXT NOT NULL,
 *     body TEXT,
 *     type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','event')),
 *     is_active BOOLEAN NOT NULL DEFAULT true,
 *     pinned BOOLEAN NOT NULL DEFAULT false,
 *     created_by UUID REFERENCES app_user(id),
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     expires_at TIMESTAMPTZ
 * );
 *
 * Enable RLS and add policy:
 * ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY admin_all ON announcement FOR ALL USING (
 *     EXISTS(SELECT 1 FROM app_user WHERE id = auth.uid() AND role = 'admin')
 * );
 */

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useSupabaseQuery } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Megaphone, Plus, Trash2, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Announcement {
	id: string;
	title: string;
	body: string | null;
	type: 'info' | 'warning' | 'success' | 'event';
	is_active: boolean;
	pinned: boolean;
	created_by: string | null;
	created_at: string;
	expires_at: string | null;
}

function useAnnouncementsData() {
	return useSupabaseQuery<Announcement[]>(
		async () => {
			const { data, error } = await (supabase as any)
				.from('announcement')
				.select('id, title, body, type, is_active, pinned, created_by, created_at, expires_at')
				.order('pinned', { ascending: false })
				.order('created_at', { ascending: false });

			if (error) {
				// Check if table doesn't exist
				if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
					return { data: null, error: { isTableMissing: true, message: error.message } };
				}
				console.error('[ManageAnnouncements] fetch error:', error);
				return { data: [], error };
			}

			return { data: data || [], error: null };
		},
		[]
	);
}

export function ManageAnnouncements() {
	const { role } = useAuth();
	const { data: announcements, loading, error, refetch } = useAnnouncementsData();
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
	const [formData, setFormData] = useState<{
		title: string;
		body: string;
		type: Announcement['type'];
		pinned: boolean;
		expiresAt: string;
	}>({
		title: '',
		body: '',
		type: 'info',
		pinned: false,
		expiresAt: '',
	});

	if (role !== 'admin') {
		return (
			<div className="p-24 text-center font-data text-2xl">
				Access Denied: Admin Only
			</div>
		);
	}

	// Handle missing table
	if (error && (error as any).isTableMissing) {
		return (
			<div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
				<div className="max-w-2xl mx-auto">
					<div className="p-8 bg-yellow-50 border-2 border-yellow-400/50 rounded-2xl">
						<h2 className="font-heading font-bold text-2xl text-yellow-800 mb-4 uppercase flex items-center gap-2">
							<AlertTriangle className="w-6 h-6" />
							Announcement Table Missing
						</h2>
						<p className="font-data text-sm text-yellow-800/70 mb-6">
							The <code className="bg-yellow-200 px-1 rounded">announcement</code> table hasn't been created yet. Run this SQL migration in your Supabase SQL Editor:
						</p>
						<pre className="bg-yellow-900/10 p-4 rounded overflow-auto text-xs text-yellow-900 mb-6 border border-yellow-300">
{`CREATE TABLE announcement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','event')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON announcement FOR ALL USING (
    EXISTS(SELECT 1 FROM app_user WHERE id = auth.uid() AND role = 'admin')
);`}
						</pre>
						<Button onClick={() => refetch()}>Retry After Migration</Button>
					</div>
				</div>
			</div>
		);
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title.trim()) return;

		setActionLoading('create');
		const { error } = await (supabase as any).from('announcement').insert({
			title: formData.title,
			body: formData.body || null,
			type: formData.type,
			pinned: formData.pinned,
			expires_at: formData.expiresAt || null,
			is_active: true,
		});

		if (error) {
			console.error('Create failed:', error);
			alert('Failed to create announcement: ' + error.message);
		} else {
			setFormData({ title: '', body: '', type: 'info', pinned: false, expiresAt: '' });
			setIsCreating(false);
			await refetch();
		}
		setActionLoading(null);
	};

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingAnn || !formData.title.trim()) return;

		setActionLoading(editingAnn.id);
		const { error } = await (supabase as any)
			.from('announcement')
			.update({
				title: formData.title,
				body: formData.body || null,
				type: formData.type,
				pinned: formData.pinned,
				expires_at: formData.expiresAt || null,
			})
			.eq('id', editingAnn.id);

		if (error) {
			console.error('Update failed:', error);
			alert('Failed to update announcement: ' + error.message);
		} else {
			setEditingAnn(null);
			setFormData({ title: '', body: '', type: 'info', pinned: false, expiresAt: '' });
			await refetch();
		}
		setActionLoading(null);
	};

	const handleToggleActive = async (ann: Announcement) => {
		setActionLoading(ann.id);
		const { error } = await (supabase as any)
			.from('announcement')
			.update({ is_active: !ann.is_active })
			.eq('id', ann.id);

		if (error) console.error('Toggle failed:', error);
		await refetch();
		setActionLoading(null);
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Delete this announcement? This cannot be undone.')) return;
		setActionLoading(id);
		const { error } = await (supabase as any).from('announcement').delete().eq('id', id);
		if (error) console.error('Delete failed:', error);
		await refetch();
		setActionLoading(null);
	};

	const openEdit = (ann: Announcement) => {
		setEditingAnn(ann);
		setFormData({
			title: ann.title,
			body: ann.body || '',
			type: ann.type,
			pinned: ann.pinned,
			expiresAt: ann.expires_at ? ann.expires_at.split('T')[0] : '',
		});
	};

	const typeIcons = {
		info: <Info className="w-4 h-4" />,
		warning: <AlertTriangle className="w-4 h-4" />,
		success: <CheckCircle className="w-4 h-4" />,
		event: <Megaphone className="w-4 h-4" />,
	};

	const typeBgColors = {
		info: 'bg-blue-100 text-blue-800',
		warning: 'bg-yellow-100 text-yellow-800',
		success: 'bg-green-100 text-green-800',
		event: 'bg-purple-100 text-purple-800',
	};

	if (loading) {
		return (
			<div className="p-24 flex justify-center font-data">
				Loading announcements...
			</div>
		);
	}

	return (
		<div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
			<div className="max-w-5xl mx-auto space-y-8">
				<div className="flex items-center gap-3 mb-2">
					<span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">
						Admin Panel
					</span>
					<Link
						to="/dashboard"
						className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline"
					>
						Back to Dashboard
					</Link>
				</div>

				<h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
					<Megaphone className="w-10 h-10 text-brutal-red" />
					Announcements
				</h1>
				<p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mb-8">
					Create and manage site-wide announcements. Pin important messages and set expiration dates.
				</p>

				{/* Create Button */}
				<div className="flex justify-between items-center">
					<span />
					<Button
						onClick={() => {
							setIsCreating(true);
							setEditingAnn(null);
							setFormData({ title: '', body: '', type: 'info', pinned: false, expiresAt: '' });
						}}
						className="flex items-center gap-2"
					>
						<Plus className="w-4 h-4" />
						New Announcement
					</Button>
				</div>

				{/* Empty state */}
				{announcements && announcements.length === 0 && !isCreating && (
					<div className="p-12 bg-yellow-50 border-2 border-yellow-400/50 rounded-2xl text-center">
						<h3 className="font-heading font-bold text-2xl text-yellow-800 uppercase mb-3">
							No Announcements
						</h3>
						<p className="font-data text-sm text-yellow-800/70 max-w-lg mx-auto">
							You haven't created any announcements yet. Click "New Announcement" to get started.
						</p>
					</div>
				)}

				{/* Announcements list */}
				{announcements && announcements.length > 0 && (
					<div className="space-y-4">
						{announcements.map((ann) => (
							<Card key={ann.id} className="p-6 border-2 border-brutal-dark/10">
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-3 mb-2 flex-wrap">
											<h3 className="font-heading font-bold text-xl text-brutal-dark break-words">
												{ann.title}
											</h3>
											<div className="flex gap-2 flex-wrap">
												<span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${typeBgColors[ann.type]}`}>
													{typeIcons[ann.type]}
													{ann.type}
												</span>
												{ann.pinned && (
													<span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-brutal-red/10 text-brutal-red rounded">
														Pinned
													</span>
												)}
												{!ann.is_active && (
													<span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-red-100 text-red-800 rounded">
														Inactive
													</span>
												)}
											</div>
										</div>
										{ann.body && (
											<p className="font-data text-sm text-brutal-dark/70 line-clamp-2 mb-3">
												{ann.body}
											</p>
										)}
										<div className="flex gap-4 flex-wrap text-xs font-data text-brutal-dark/50">
											<span>Created: {new Date(ann.created_at).toLocaleDateString()}</span>
											{ann.expires_at && (
												<span>Expires: {new Date(ann.expires_at).toLocaleDateString()}</span>
											)}
										</div>
									</div>
									<div className="flex gap-2 flex-shrink-0">
										<button
											onClick={() => handleToggleActive(ann)}
											disabled={actionLoading === ann.id}
											className={`text-sm font-bold px-3 py-2 rounded transition-colors ${ann.is_active
													? 'text-brutal-red hover:bg-brutal-red/10'
													: 'text-green-600 hover:bg-green-600/10'
												}`}
										>
											{actionLoading === ann.id
												? '...'
												: ann.is_active
													? 'Deactivate'
													: 'Activate'}
										</button>
										<button
											onClick={() => openEdit(ann)}
											className="px-3 py-2 text-brutal-dark/50 hover:text-brutal-dark hover:bg-brutal-dark/5 rounded transition-colors"
											title="Edit"
										>
											Edit
										</button>
										<button
											onClick={() => handleDelete(ann.id)}
											disabled={actionLoading === ann.id}
											className="px-3 py-2 text-brutal-red/70 hover:text-brutal-red hover:bg-brutal-red/10 rounded transition-colors"
											title="Delete"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</div>
							</Card>
						))}
					</div>
				)}

				{/* Create/Edit Modal */}
				{(isCreating || editingAnn) && (
					<div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
						<Card className="w-full max-w-md p-6 border-2 border-brutal-dark shadow-2xl relative">
							<button
								onClick={() => {
									setIsCreating(false);
									setEditingAnn(null);
									setFormData({ title: '', body: '', type: 'info', pinned: false, expiresAt: '' });
								}}
								className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark"
							>
								<X className="w-5 h-5" />
							</button>

							<h2 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">
								{editingAnn ? 'Edit Announcement' : 'New Announcement'}
							</h2>

							<form
								onSubmit={editingAnn ? handleUpdate : handleCreate}
								className="space-y-4"
							>
								<Input
									label="Title"
									value={formData.title}
									onChange={(e) =>
										setFormData({ ...formData, title: e.target.value })
									}
									placeholder="e.g., Lab Maintenance"
									required
								/>

								<div>
									<label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
										Message Body (optional)
									</label>
									<textarea
										value={formData.body}
										onChange={(e) =>
											setFormData({ ...formData, body: e.target.value })
										}
										placeholder="Additional details..."
										className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 rounded font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors resize-vertical min-h-20"
									/>
								</div>

								<div>
									<label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
										Type
									</label>
									<select
										value={formData.type}
										onChange={(e) =>
											setFormData({ ...formData, type: e.target.value as any })
										}
										className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 rounded text-brutal-dark font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
									>
										<option value="info">Info</option>
										<option value="warning">Warning</option>
										<option value="success">Success</option>
										<option value="event">Event</option>
									</select>
								</div>

								<div>
									<label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
										Expires At (optional)
									</label>
									<input
										type="date"
										value={formData.expiresAt}
										onChange={(e) =>
											setFormData({ ...formData, expiresAt: e.target.value })
										}
										className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 rounded font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
									/>
								</div>

								<div className="flex items-center gap-3 py-2">
									<input
										type="checkbox"
										id="pinned"
										checked={formData.pinned}
										onChange={(e) =>
											setFormData({ ...formData, pinned: e.target.checked })
										}
										className="w-4 h-4 accent-brutal-red"
									/>
									<label
										htmlFor="pinned"
										className="font-data text-sm font-bold cursor-pointer"
									>
										Pin to top
									</label>
								</div>

								<div className="pt-4 flex justify-end gap-3 border-t-2 border-brutal-dark/10">
									<Button
										type="button"
										variant="secondary"
										onClick={() => {
											setIsCreating(false);
											setEditingAnn(null);
											setFormData({ title: '', body: '', type: 'info', pinned: false, expiresAt: '' });
										}}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										disabled={!formData.title.trim() || actionLoading === 'create' || actionLoading === editingAnn?.id}
									>
										{actionLoading ? 'Saving...' : editingAnn ? 'Update' : 'Create'}
									</Button>
								</div>
							</form>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
