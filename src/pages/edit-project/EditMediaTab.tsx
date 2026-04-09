import React from 'react';
import {
  Image as ImageIcon,
  FileText,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FieldError } from '../../components/ui/FieldError';
import { SectionHeader } from '../../components/project/SectionHeader';
import { getYoutubeThumbnail } from '../../lib/videoUtils';
import { useEditProject } from './EditProjectContext';

export function EditMediaTab() {
  const {
    project,
    mediaTab,
    setMediaTab,
    videos,
    newVideoUrl,
    setNewVideoUrl,
    newVideoTitle,
    setNewVideoTitle,
    videoUrlError,
    setVideoUrlError,
    addingVideo,
    newVideoUrlRef,
    handleAddVideo,
    handleDeleteVideo,
    uploadingImage,
    handleImageUpload,
    handleDeleteImage,
    uploadingFile,
    handleFileUpload,
    handleDeleteFile,
    actionLoading,
  } = useEditProject();

  return (
    <section>
      <SectionHeader
        variant="drama"
        eyebrow="Project Assets"
        title="Media"
        hairlineMarginClass="mb-6"
      />

      {/* Media tabs */}
      <div
        role="tablist"
        aria-label="Media sections"
        className="flex gap-1 mb-6 bg-brutal-dark/[0.03] p-1 rounded-lg border border-brutal-dark/8"
      >
        {(['gallery', 'videos', 'files'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={mediaTab === t}
            onClick={() => setMediaTab(t)}
            className={`flex-1 py-2 px-3 rounded-md font-data text-[10px] font-bold uppercase tracking-wider transition-colors ${
              mediaTab === t
                ? 'bg-brutal-dark text-brutal-bg'
                : 'text-brutal-dark/50 hover:bg-brutal-dark/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Gallery tab */}
      {mediaTab === 'gallery' && (
        <>
          <div className="space-y-3 mb-4">
            {project.images && project.images.length > 0 ? (
              project.images.map((img, i) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark/5"
                >
                  <div className="w-full h-36 overflow-hidden">
                    <img
                      src={img.image_url}
                      alt={img.caption || `Gallery image ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  {i === 0 && (
                    <div className="absolute top-2 left-2 bg-brutal-dark text-white text-[10px] font-bold px-2 py-0.5 rounded font-data uppercase">
                      Cover
                    </div>
                  )}
                  {img.caption && (
                    <div className="px-3 py-1.5 font-data text-xs text-brutal-dark/60 truncate bg-white border-t border-brutal-dark/5">
                      {img.caption}
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteImage(img.id, img.image_url)}
                    className="absolute top-2 right-2 bg-brutal-red text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    disabled={actionLoading}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center p-4 border-2 border-dashed border-brutal-dark/10 rounded-xl font-data text-xs text-brutal-dark/40">
                No images yet. First upload becomes the cover.
              </div>
            )}
          </div>
          <label className="block w-full">
            <span
              className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-brutal-dark/20 border-dashed rounded-xl font-data text-sm font-bold text-brutal-dark/60 hover:bg-brutal-dark/10 hover:text-brutal-dark cursor-pointer transition-colors ${
                uploadingImage ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {uploadingImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-brutal-dark border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" /> Upload Image
                </>
              )}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
          </label>
        </>
      )}

      {/* Videos tab */}
      {mediaTab === 'videos' && (
        <>
          <div className="space-y-2 mb-4">
            {videos.length > 0 ? (
              videos.map((vid) => {
                const thumb = getYoutubeThumbnail(vid.video_url);
                return (
                  <div
                    key={vid.id}
                    className="flex items-center gap-3 p-2 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-xl group"
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        className="w-16 h-10 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="overflow-hidden flex-1">
                      <div className="font-data text-xs font-bold truncate">{vid.title}</div>
                      <div className="font-data text-[10px] text-brutal-dark/40 truncate">
                        {vid.video_url}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVideo(vid.id)}
                      className="text-brutal-red p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-4 border-2 border-dashed border-brutal-dark/10 rounded-xl font-data text-xs text-brutal-dark/40">
                No videos yet.
              </div>
            )}
          </div>
          <form onSubmit={handleAddVideo} className="space-y-2">
            <label htmlFor="ep-new-video-title" className="sr-only">
              Video title
            </label>
            <input
              id="ep-new-video-title"
              type="text"
              placeholder="Video title (optional)"
              className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
            />
            <div className="flex gap-2">
              <label htmlFor="ep-new-video-url" className="sr-only">
                Video URL
              </label>
              <input
                id="ep-new-video-url"
                ref={newVideoUrlRef}
                type="url"
                placeholder="https://youtu.be/..."
                aria-invalid={!!videoUrlError}
                aria-describedby="ep-new-video-url-err"
                className={`flex-1 bg-white border px-3 py-2 rounded-xl font-data text-sm focus:outline-none transition-colors ${
                  videoUrlError
                    ? 'border-brutal-red'
                    : 'border-brutal-dark/20 focus:border-brutal-dark'
                }`}
                value={newVideoUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewVideoUrl(v);
                  if (!v.trim()) setVideoUrlError('');
                  else setVideoUrlError('');
                }}
              />
              <Button
                type="submit"
                size="sm"
                disabled={addingVideo || !newVideoUrl.trim() || !!videoUrlError}
              >
                {addingVideo ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <FieldError id="ep-new-video-url-err">{videoUrlError}</FieldError>
          </form>
        </>
      )}

      {/* Files tab */}
      {mediaTab === 'files' && (
        <>
          <div className="space-y-2 mb-4">
            {project.files && project.files.length > 0 ? (
              project.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-xl group"
                >
                  <div className="overflow-hidden flex-1 mr-2">
                    <div
                      className="font-data text-sm font-bold truncate text-brutal-dark"
                      title={file.file_name}
                    >
                      {file.file_name}
                    </div>
                    <div className="font-data text-xs text-brutal-dark/40">
                      {file.file_size ? (file.file_size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.id, file.file_url)}
                    className="p-2 hover:bg-brutal-red/10 hover:text-brutal-red rounded text-brutal-dark/40 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    disabled={actionLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center p-4 border-2 border-dashed border-brutal-dark/10 rounded-xl font-data text-xs text-brutal-dark/40">
                Attach 3D models, code zip, BOM.csv, or PDFs.
              </div>
            )}
          </div>
          <label className="block w-full">
            <span
              className={`flex items-center justify-center gap-2 w-full p-3 bg-brutal-dark text-white rounded-xl font-data text-sm font-bold hover:bg-brutal-red cursor-pointer transition-colors ${
                uploadingFile ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {uploadingFile ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Attach File
                </>
              )}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploadingFile}
            />
          </label>
        </>
      )}
    </section>
  );
}
