import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { RootLayout } from './components/layout/RootLayout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

/**
 * Route-level code splitting.
 *
 * Every page is loaded lazily via `React.lazy` so the initial bundle for the
 * landing page is small and fast. Each page becomes its own chunk, which
 * means:
 *   • Logged-out visitors to "/" only pay for Home + hero dependencies.
 *   • Admin / mentor tooling (ManageUsers, ReviewProjects, etc.) never
 *     touches the wire unless a mentor/admin navigates to them.
 *   • Heavy dependencies used by a single page (charts, GSAP timelines,
 *     Spline, three.js) stay inside that page's chunk.
 *
 * Pages use `export function Foo` (named exports), so each `lazy()` call
 * adapts the named export into the default export `React.lazy` expects.
 */
const lazyNamed = <K extends string>(
    loader: () => Promise<Record<K, React.ComponentType<Record<string, unknown>>>>,
    name: K,
) => lazy(async () => {
    const mod = await loader();
    return { default: mod[name] };
});

const Home = lazyNamed(() => import('./pages/Home'), 'Home');
const Projects = lazyNamed(() => import('./pages/Projects'), 'Projects');
const ProjectDetails = lazyNamed(() => import('./pages/ProjectDetails'), 'ProjectDetails');
const RemixPage = lazyNamed(() => import('./pages/RemixPage'), 'RemixPage');
const Challenges = lazyNamed(() => import('./pages/Challenges'), 'Challenges');
const ChallengeDetails = lazyNamed(() => import('./pages/ChallengeDetails'), 'ChallengeDetails');
const Events = lazyNamed(() => import('./pages/Events'), 'Events');
const EventDetails = lazyNamed(() => import('./pages/EventDetails'), 'EventDetails');
const Makers = lazyNamed(() => import('./pages/Makers'), 'Makers');
const MakerDetails = lazyNamed(() => import('./pages/MakerDetails'), 'MakerDetails');
const Badges = lazyNamed(() => import('./pages/Badges'), 'Badges');
const Store = lazyNamed(() => import('./pages/Store'), 'Store');
const Login = lazyNamed(() => import('./pages/Login'), 'Login');
const Register = lazyNamed(() => import('./pages/Register'), 'Register');
const ForgotPassword = lazyNamed(() => import('./pages/ForgotPassword'), 'ForgotPassword');
const UpdatePassword = lazyNamed(() => import('./pages/UpdatePassword'), 'UpdatePassword');
const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard');
const ProfileSetup = lazyNamed(() => import('./pages/ProfileSetup'), 'ProfileSetup');
const AuthCallback = lazyNamed(() => import('./pages/AuthCallback'), 'AuthCallback');
const EditProject = lazyNamed(() => import('./pages/EditProject'), 'EditProject');
const ManageUsers = lazyNamed(() => import('./pages/admin/ManageUsers'), 'ManageUsers');
const ManageChallenges = lazyNamed(() => import('./pages/admin/ManageChallenges'), 'ManageChallenges');
const ManageEvents = lazyNamed(() => import('./pages/admin/ManageEvents'), 'ManageEvents');
const ManageBadges = lazyNamed(() => import('./pages/admin/ManageBadges'), 'ManageBadges');
const ManageStore = lazyNamed(() => import('./pages/admin/ManageStore'), 'ManageStore');
const ManageEquipment = lazyNamed(() => import('./pages/admin/ManageEquipment'), 'ManageEquipment');
const ManageInventory = lazyNamed(() => import('./pages/admin/ManageInventory'), 'ManageInventory');
const ReviewProjects = lazyNamed(() => import('./pages/admin/ReviewProjects'), 'ReviewProjects');
const ReviewChallenges = lazyNamed(() => import('./pages/admin/ReviewChallenges'), 'ReviewChallenges');
const ReviewEventSubmissions = lazyNamed(() => import('./pages/admin/ReviewEventSubmissions'), 'ReviewEventSubmissions');
const ReviewWebsiteSubmissions = lazyNamed(() => import('./pages/admin/ReviewWebsiteSubmissions'), 'ReviewWebsiteSubmissions');
const ManageProjects = lazyNamed(() => import('./pages/admin/ManageProjects'), 'ManageProjects');
const MentorDashboard = lazyNamed(() => import('./pages/MentorDashboard'), 'MentorDashboard');
const ExplorerHub = lazyNamed(() => import('./pages/ExplorerHub'), 'ExplorerHub');
const BuildChallenges = lazyNamed(() => import('./pages/EventsByType'), 'BuildChallenges');
const TechTuesdays = lazyNamed(() => import('./pages/EventsByType'), 'TechTuesdays');
const MakerMeetups = lazyNamed(() => import('./pages/EventsByType'), 'MakerMeetups');
const ManageTags = lazyNamed(() => import('./pages/admin/ManageTags'), 'ManageTags');
const ManageMentors = lazyNamed(() => import('./pages/admin/ManageMentors'), 'ManageMentors');
const ManageAnnouncements = lazyNamed(() => import('./pages/admin/ManageAnnouncements'), 'ManageAnnouncements');
const PrivacyPolicy = lazyNamed(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const TermsOfService = lazyNamed(() => import('./pages/TermsOfService'), 'TermsOfService');
const SafetyGuidelines = lazyNamed(() => import('./pages/SafetyGuidelines'), 'SafetyGuidelines');
const MergeRequestPage = lazyNamed(() => import('./pages/MergeRequestPage'), 'MergeRequestPage');
const NewMergeRequestPage = lazyNamed(() => import('./pages/NewMergeRequestPage'), 'NewMergeRequestPage');

/**
 * Minimal route fallback. Intentionally quiet — the full-page skeletons each
 * route ships internally will take over once the chunk resolves. We avoid
 * flashing a big "Loading…" slab because chunk loads are typically under
 * 200ms on a warm cache.
 */
function RouteFallback() {
    return (
        <div
            className="flex-1 w-full bg-brutal-bg min-h-[50vh]"
            aria-busy="true"
            aria-live="polite"
        />
    );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/projects/:id/remix" element={<RemixPage />} />
              <Route path="/projects/:id/merge-requests/new" element={<NewMergeRequestPage />} />
              <Route path="/projects/:id/merge-requests/:mrId" element={<MergeRequestPage />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/challenges/:id" element={<ChallengeDetails />} />
              <Route path="/explorer-hub" element={<ExplorerHub />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/build-challenges" element={<BuildChallenges />} />
              <Route path="/events/tech-tuesdays" element={<TechTuesdays />} />
              <Route path="/events/meetups" element={<MakerMeetups />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/makers" element={<Makers />} />
              <Route path="/makers/:id" element={<MakerDetails />} />
              <Route path="/badges" element={<Badges />} />
              <Route path="/store" element={<Store />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/safety" element={<SafetyGuidelines />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['viewer', 'maker', 'mentor', 'admin']} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile-setup" element={<ProfileSetup />} />
                {/* §10 Edit Cockpit — single-page bento (no nested routes). */}
                <Route path="/projects/:id/edit" element={<EditProject />} />
                {/* Backwards-compat redirects: any deep links to the old
                    tabbed routes land on the new single-page editor. */}
                <Route path="/projects/:id/edit/core" element={<Navigate to=".." replace relative="path" />} />
                <Route path="/projects/:id/edit/milestones" element={<Navigate to=".." replace relative="path" />} />
                <Route path="/projects/:id/edit/media" element={<Navigate to=".." replace relative="path" />} />
                <Route path="/projects/:id/edit/team" element={<Navigate to=".." replace relative="path" />} />
              </Route>

              {/* Mentor & Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['mentor', 'admin']} />}>
                <Route path="/mentor-dashboard" element={<MentorDashboard />} />
                <Route path="/admin/review-projects" element={<ReviewProjects />} />
                <Route path="/admin/review-challenges" element={<ReviewChallenges />} />
                <Route path="/admin/review-submissions" element={<ReviewEventSubmissions />} />
                <Route path="/admin/review-websites" element={<ReviewWebsiteSubmissions />} />
                <Route path="/admin/events" element={<ManageEvents />} />
                <Route path="/admin/inventory" element={<ManageInventory />} />
                <Route path="/admin/challenges" element={<ManageChallenges />} />
                <Route path="/admin/projects" element={<ManageProjects />} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/users" element={<ManageUsers />} />
                <Route path="/admin/badges" element={<ManageBadges />} />
                <Route path="/admin/store" element={<ManageStore />} />
                <Route path="/admin/equipment" element={<ManageEquipment />} />
                <Route path="/admin/tags" element={<ManageTags />} />
                <Route path="/admin/mentors" element={<ManageMentors />} />
                <Route path="/admin/announcements" element={<ManageAnnouncements />} />
              </Route>

              <Route path="*" element={<div className="p-20 font-data text-2xl">404 - Not Found</div>} />
            </Route>
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
