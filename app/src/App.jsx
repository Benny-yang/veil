import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import AppNav from './components/AppNav'

// Placeholder pages
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

function AppLayout() {
  const location = useLocation()
  const isLanding = ['/', '/auth', '/onboarding'].includes(location.pathname)

  return (
    <>
      {/* AppNav shows on all pages except the Landing page */}
      {!isLanding && <AppNav />}

      {/* Main Content Area */}
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/zones/:id" element={<ZoneDetail />} />
          <Route path="/works/:id" element={<WorkDetail />} />
          <Route path="/collection" element={<PrivateCollection />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/review" element={<ReviewApplications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
