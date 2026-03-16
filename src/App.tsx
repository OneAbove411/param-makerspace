import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AuthProvider } from './lib/auth';
import { Home } from './pages/Home';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { Challenges } from './pages/Challenges';
import { ChallengeDetails } from './pages/ChallengeDetails';
import { Events } from './pages/Events';
import { EventDetails } from './pages/EventDetails';
import { Makers } from './pages/Makers';
import { MakerDetails } from './pages/MakerDetails';
import { Badges } from './pages/Badges';
import { Store } from './pages/Store';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { ProfileSetup } from './pages/ProfileSetup';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { EditProject } from './pages/EditProject';
import { ManageUsers } from './pages/admin/ManageUsers';
import { ManageChallenges } from './pages/admin/ManageChallenges';
import { ManageEvents } from './pages/admin/ManageEvents';
import { ManageBadges } from './pages/admin/ManageBadges';
import { ManageStore } from './pages/admin/ManageStore';
import { ManageEquipment } from './pages/admin/ManageEquipment';
import { ManageInventory } from './pages/admin/ManageInventory';
import { ReviewProjects } from './pages/admin/ReviewProjects';
import { ReviewChallenges } from './pages/admin/ReviewChallenges';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/challenges/:id" element={<ChallengeDetails />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/makers" element={<Makers />} />
            <Route path="/makers/:id" element={<MakerDetails />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/store" element={<Store />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['maker', 'mentor', 'admin']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/projects/:id/edit" element={<EditProject />} />
            </Route>

            {/* Mentor & Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['mentor', 'admin']} />}>
              <Route path="/admin/review-projects" element={<ReviewProjects />} />
              <Route path="/admin/review-challenges" element={<ReviewChallenges />} />
              <Route path="/admin/events" element={<ManageEvents />} />
              <Route path="/admin/inventory" element={<ManageInventory />} />
            </Route>

            {/* Admin Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/challenges" element={<ManageChallenges />} />
              <Route path="/admin/badges" element={<ManageBadges />} />
              <Route path="/admin/store" element={<ManageStore />} />
              <Route path="/admin/equipment" element={<ManageEquipment />} />
            </Route>

            <Route path="*" element={<div className="p-20 font-data text-2xl">404 - Not Found</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
