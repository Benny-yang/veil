import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppNav from './components/AppNav'

// Pages
import Landing from './pages/Landing'
import Home from './pages/Home'
import Explore from './pages/Explore'
import ZoneDetail from './pages/ZoneDetail'
import WorkDetail from './pages/WorkDetail'
import PrivateCollection from './pages/PrivateCollection'
import Chat from './pages/Chat'
import ReviewApplications from './pages/ReviewApplications'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'

/** 需要登入才能進入的路由 */
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth()
  const token = localStorage.getItem('veil_access_token')
  if (!currentUser && !token) {
    return <Navigate to="/auth" replace />
  }
  return children
}

function AppLayout() {
  const location = useLocation()
  const isLanding = ['/', '/auth', '/onboarding'].includes(location.pathname)

  return (
    <>
      {!isLanding && <AppNav />}
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Protected routes */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/zones/:id" element={<ProtectedRoute><ZoneDetail /></ProtectedRoute>} />
          <Route path="/works/:id" element={<ProtectedRoute><WorkDetail /></ProtectedRoute>} />
          <Route path="/collection" element={<ProtectedRoute><PrivateCollection /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/review/:zoneId" element={<ProtectedRoute><ReviewApplications /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

