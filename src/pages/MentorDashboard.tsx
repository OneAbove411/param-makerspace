import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Calendar, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAllEvents, useEventWebsitesForReview } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface ShowcaseSlot {
  id: string;
  status: string;
  event_id: string;
  user_id: string;
  topic: string;
  project: {
    id: string;
    title: string;
  };
  app_user: {
    name: string;
  };
  event: {
    title: string;
  };
}

export function MentorDashboard() {
  const { user } = useAuth();
  const { data: events = [], loading: eventsLoading } = useAllEvents();
  const { data: allSubmissions = [] } = useEventWebsitesForReview();
  const [showcaseSlots, setShowcaseSlots] = useState<ShowcaseSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const isAuthorized = user && (user.role === 'mentor' || user.role === 'admin');

  // Fetch showcase slots
  useEffect(() => {
    const fetchShowcaseSlots = async () => {
      try {
        const { data } = await supabase
          .from('showcase_slot')
          .select(
            'id, status, event_id, user_id, topic, project:project!project_id(id, title), app_user:app_user!user_id(name), event:event!event_id(title)'
          )
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (data) {
          setShowcaseSlots(data as ShowcaseSlot[]);
        }
      } catch (error) {
        console.error('Error fetching showcase slots:', error);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchShowcaseSlots();
  }, []);

  // Filter events for this mentor (admins see all, mentors see their own)
  const mentorEvents =
    user?.role === 'admin'
      ? events
      : events.filter((e) => e.created_by === user?.id);

  // Calculate stats
  const totalEvents = mentorEvents.length;
  const pendingReviews = allSubmissions.filter((s) => s.status === 'pending').length;
  const now = new Date();
  const upcomingEvents = mentorEvents.filter((e) => new Date(e.date) > now).length;

  // Helper function to format event type
  const formatEventType = (t: string) =>
    t === 'build_challenge' ? 'Build Challenge' : t === 'tech_tuesday' ? 'Tech Tuesday' : 'Maker Meetup';

  // Helper function to approve/reject submissions
  const handleSubmissionAction = async (
    submissionId: string,
    action: 'approved' | 'rejected'
  ) => {
    try {
      await supabase
        .from('event_website')
        .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', submissionId);
      window.location.reload();
    } catch (error) {
      console.error('Error updating submission:', error);
    }
  };

  // Helper function to approve/reject showcase slots
  const handleSlotAction = async (slotId: string, action: 'approved' | 'rejected') => {
    try {
      await supabase.from('showcase_slot').update({ status: action }).eq('id', slotId);
      setShowcaseSlots(showcaseSlots.filter((s) => s.id !== slotId));
    } catch (error) {
      console.error('Error updating showcase slot:', error);
    }
  };

  // Access control — after all hooks
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-brutal-bg pt-32 px-8">
        <div className="max-w-4xl mx-auto border-4 border-brutal-dark bg-brutal-paper p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-brutal-red" />
            <h1 className="font-heading text-brutal-dark text-2xl uppercase tracking-wider">
              Access Denied
            </h1>
          </div>
          <p className="font-data text-brutal-dark">
            Only mentors and admins can access the mentor dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-bg pt-32 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <Shield className="w-10 h-10 text-brutal-red" />
            <h1 className="font-heading text-brutal-dark text-4xl uppercase tracking-wider">
              Mentor Dashboard
            </h1>
          </div>
          <p className="font-data text-brutal-dark ml-14">
            Manage your events, review submissions, and track registrations.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Events Card */}
          <div className="border-4 border-brutal-dark bg-brutal-paper p-6 shadow-[4px_4px_0px_#111]">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-data text-brutal-dark text-sm uppercase tracking-widest">
                Total Events
              </h3>
              <Calendar className="w-6 h-6 text-brutal-red" />
            </div>
            <p className="font-heading text-brutal-dark text-4xl">{totalEvents}</p>
          </div>

          {/* Pending Reviews Card */}
          <div className="border-4 border-brutal-dark bg-brutal-paper p-6 shadow-[4px_4px_0px_#111]">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-data text-brutal-dark text-sm uppercase tracking-widest">
                Pending Reviews
              </h3>
              <FileText className="w-6 h-6 text-brutal-red" />
            </div>
            <p className="font-heading text-brutal-dark text-4xl">{pendingReviews}</p>
          </div>

          {/* Upcoming Events Card */}
          <div className="border-4 border-brutal-dark bg-brutal-paper p-6 shadow-[4px_4px_0px_#111]">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-data text-brutal-dark text-sm uppercase tracking-widest">
                Upcoming Events
              </h3>
              <AlertCircle className="w-6 h-6 text-brutal-red" />
            </div>
            <p className="font-heading text-brutal-dark text-4xl">{upcomingEvents}</p>
          </div>
        </div>

        {/* Your Events Section */}
        <div className="mb-12">
          <div className="border-b-4 border-brutal-dark pb-2 mb-6">
            <h2 className="font-heading text-brutal-dark text-2xl uppercase tracking-wider">
              Your Events
            </h2>
          </div>

          {eventsLoading ? (
            <div className="text-center py-8">
              <p className="font-data text-brutal-dark">Loading events...</p>
            </div>
          ) : mentorEvents.length === 0 ? (
            <div className="border-4 border-brutal-dark bg-brutal-paper p-8 text-center">
              <p className="font-data text-brutal-dark">
                No events found. Create your first event to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {mentorEvents.map((event) => {
                const eventDate = new Date(event.date);
                const isPast = eventDate < now;
                const registrations = event.registration_count || 0;

                return (
                  <div
                    key={event.id}
                    className="border-4 border-brutal-dark bg-brutal-paper p-6 shadow-[4px_4px_0px_#111]"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <h3 className="font-heading text-brutal-dark text-xl mb-2">
                          {event.title}
                        </h3>
                        <div className="flex gap-2 mb-3">
                          <span className="font-data text-xs uppercase tracking-widest bg-brutal-dark text-brutal-paper px-2 py-1 border-2 border-brutal-dark">
                            {formatEventType(event.event_type)}
                          </span>
                          <span
                            className={`font-data text-xs uppercase tracking-widest border-2 px-2 py-1 ${
                              isPast
                                ? 'border-brutal-dark text-brutal-dark'
                                : 'border-brutal-red text-brutal-red'
                            }`}
                          >
                            {isPast ? 'Past' : 'Upcoming'}
                          </span>
                        </div>
                        <p className="font-data text-sm text-brutal-dark">
                          {eventDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="font-data text-xs uppercase tracking-widest text-brutal-dark mb-1">
                          Location
                        </p>
                        <p className="font-data text-sm text-brutal-dark mb-4">
                          {event.location}
                        </p>
                        <p className="font-data text-xs uppercase tracking-widest text-brutal-dark mb-1">
                          Capacity
                        </p>
                        <p className="font-data text-sm text-brutal-dark">
                          {registrations} / {event.capacity}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div>
                          <p className="font-data text-xs uppercase tracking-widest text-brutal-dark mb-1">
                            Status
                          </p>
                          <p className="font-data text-sm text-brutal-dark capitalize">
                            {event.registration_status || 'Active'}
                          </p>
                        </div>
                        <Link
                          to={`/events/${event.id}`}
                          className="font-data text-sm uppercase tracking-wider text-brutal-dark border-2 border-brutal-dark bg-brutal-paper px-4 py-2 hover:bg-brutal-dark hover:text-brutal-paper transition"
                        >
                          Manage Event
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Website Reviews Section */}
        <div className="mb-12">
          <div className="border-b-4 border-brutal-dark pb-2 mb-6">
            <h2 className="font-heading text-brutal-dark text-2xl uppercase tracking-wider">
              Pending Website Reviews
            </h2>
          </div>

          {allSubmissions.filter((s) => s.status === 'pending').length === 0 ? (
            <div className="border-4 border-brutal-dark bg-brutal-paper p-8 text-center">
              <p className="font-data text-brutal-dark">No pending website submissions to review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {allSubmissions
                .filter((s) => s.status === 'pending')
                .map((submission) => (
                  <div
                    key={submission.id}
                    className="border-4 border-brutal-dark bg-brutal-paper p-6 shadow-[4px_4px_0px_#111]"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <h3 className="font-heading text-brutal-dark text-lg mb-2">
                          {submission.title}
                        </h3>
                        <p className="font-data text-sm text-brutal-dark mb-2">
                          Submitted by: <strong>{submission.userName}</strong>
                        </p>
                        <p className="font-data text-[10px] text-brutal-dark/50 uppercase tracking-wider">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        {submission.html_content && (
                          <div className="border-2 border-brutal-dark p-4 bg-white max-h-64 overflow-y-auto">
                            <p className="font-data text-xs uppercase tracking-widest text-brutal-dark mb-2">
                              Preview
                            </p>
                            <iframe
                              srcDoc={submission.html_content}
                              className="w-full h-48 border-2 border-brutal-dark"
                              title={`Preview: ${submission.title}`}
                              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubmissionAction(submission.id, 'approved')}
                        className="flex items-center gap-2 font-data text-sm uppercase tracking-wider text-brutal-paper bg-brutal-dark border-2 border-brutal-dark px-4 py-2 hover:shadow-[4px_4px_0px_#111] transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleSubmissionAction(submission.id, 'rejected')}
                        className="flex items-center gap-2 font-data text-sm uppercase tracking-wider text-brutal-dark border-2 border-brutal-dark bg-brutal-paper px-4 py-2 hover:bg-brutal-dark hover:text-brutal-paper transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Recent Showcase Slot Requests Section */}
        <div>
          <div className="border-b-4 border-brutal-dark pb-2 mb-6">
            <h2 className="font-heading text-brutal-dark text-2xl uppercase tracking-wider">
              Showcase Slot Requests
            </h2>
          </div>

          {slotsLoading ? (
            <div className="text-center py-8">
              <p className="font-data text-brutal-dark">Loading showcase requests...</p>
            </div>
          ) : showcaseSlots.length === 0 ? (
            <div className="border-4 border-brutal-dark bg-brutal-paper p-8 text-center">
              <p className="font-data text-brutal-dark">No pending showcase slot requests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {showcaseSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="border-4 border-brutal-dark bg-brutal-paper p-6 shadow-[4px_4px_0px_#111]"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <h3 className="font-heading text-brutal-dark text-lg mb-2">
                        {slot.project?.title || 'Untitled Project'}
                      </h3>
                      <p className="font-data text-sm text-brutal-dark mb-2">
                        Requested by: <strong>{slot.app_user?.name}</strong>
                      </p>
                      <p className="font-data text-sm text-brutal-dark mb-2">
                        Event: <strong>{slot.event?.title}</strong>
                      </p>
                      <p className="font-data text-sm text-brutal-dark">
                        Topic: <strong>{slot.topic}</strong>
                      </p>
                    </div>

                    <div className="md:col-span-2 flex flex-col justify-between">
                      <div></div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSlotAction(slot.id, 'approved')}
                          className="flex items-center gap-2 font-data text-sm uppercase tracking-wider text-brutal-paper bg-brutal-dark border-2 border-brutal-dark px-4 py-2 hover:shadow-[4px_4px_0px_#111] transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleSlotAction(slot.id, 'rejected')}
                          className="flex items-center gap-2 font-data text-sm uppercase tracking-wider text-brutal-dark border-2 border-brutal-dark bg-brutal-paper px-4 py-2 hover:bg-brutal-dark hover:text-brutal-paper transition"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
