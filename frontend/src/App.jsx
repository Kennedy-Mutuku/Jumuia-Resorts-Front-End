import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';

// Public pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ResortsPage from './pages/ResortsPage';
import ServicesPage from './pages/ServicesPage';
import OffersPage from './pages/OffersPage';
import FeedbackPage from './pages/FeedbackPage';
import ContactPage from './pages/ContactPage';

// Resort detail pages
import ResortDetail, { ResortOverview, ResortRooms, ResortConference, ResortGallery, ResortExcursions, ResortOffers, ResortFeedback } from './pages/ResortDetail';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBookings from './pages/admin/AdminBookings';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminMessages from './pages/admin/AdminMessages';
import AdminOffers from './pages/admin/AdminOffers';
import AdminUsers from './pages/admin/AdminUsers';
import { AdminCalendar, AdminContent, AdminReports, AdminSettings, AdminBranchManagers } from './pages/admin/AdminModuleStubs';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/resorts" element={<ResortsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* Resort Detail Routes */}
            <Route path="/resorts/:resort" element={<ResortDetail />}>
              <Route index element={<ResortOverview />} />
              <Route path="rooms" element={<ResortRooms />} />
              <Route path="conference" element={<ResortConference />} />
              <Route path="gallery" element={<ResortGallery />} />
              <Route path="excursions" element={<ResortExcursions />} />
              <Route path="offers" element={<ResortOffers />} />
              <Route path="feedback" element={<ResortFeedback />} />
            </Route>
          </Route>

          {/* Admin Login (no layout) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Protected Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="branch-managers" element={<AdminBranchManagers />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
