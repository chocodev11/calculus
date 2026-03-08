import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Story from './pages/Story'
import Step from './pages/Step'
import Login from './pages/Login'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import QuestShop from './pages/QuestShop'
import NotFound from './pages/NotFound'
import VerificationBlocker from './components/VerificationBlocker'
import DevTerminal from './components/DevTerminal'

const DEV_TERMINAL_ENABLED = import.meta.env.VITE_DEV_TERMINAL === 'true'

// Admin
import AdminLayout from './admin/AdminLayout'
import AdminDashboard from './admin/Dashboard'
import AdminCourses from './admin/Courses'
import AdminCourseEditor from './admin/CourseEditor'
import AdminDataManager from './admin/DataManager'
import AdminServerStatus from './admin/ServerStatus'
import AdminSettings from './admin/Settings'

export default function App() {
  return (
    <>
      <VerificationBlocker />
      {DEV_TERMINAL_ENABLED && <DevTerminal />}
      <Routes>
      {/* Main App */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="course/:slug" element={<Story />} />
        <Route path="profile" element={<Profile />} />
        <Route path="quests" element={<QuestShop />} />
        <Route path="shop" element={<QuestShop />} />
      </Route>
      <Route path="/course/:slug/step/:encodedId" element={<Step />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Admin Panel - Hidden from main UI, only accessible via /admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="courses/:slug" element={<AdminCourseEditor />} />
        <Route path="data" element={<AdminDataManager />} />
        <Route path="server" element={<AdminServerStatus />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}
