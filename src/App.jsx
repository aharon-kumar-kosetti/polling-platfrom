import React from 'react'
import { Routes, Route } from 'react-router-dom'
import TopNavBar from './components/TopNavBar'
import LandingPage from './pages/LandingPage'
import Authentication from './pages/Authentication'
import Signup from './pages/Signup'
import JoinSession from './pages/JoinSession'
import ParticipantWaitingRoom from './pages/ParticipantWaitingRoom'
import ParticipantLiveQuiz from './pages/ParticipantLiveQuiz'
import ParticipantQuestionResult from './pages/ParticipantQuestionResult'
import FinalLeaderboard from './pages/FinalLeaderboard'
import FeedbackSubmission from './pages/FeedbackSubmission'
import FeedbackResponses from './pages/FeedbackResponses'
import ParticipantProfile from './pages/ParticipantProfile'
import PostSessionAnalytics from './pages/PostSessionAnalytics'
import OrganizerDashboard from './pages/OrganizerDashboard'
import SessionBuilder from './pages/SessionBuilder'
import FormBuilder from './pages/FormBuilder'
import FormTemplateSelection from './pages/FormTemplateSelection'
import LiveMonitoring from './pages/LiveMonitoring'
import AccountSettings from './pages/AccountSettings'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <>
      <TopNavBar />
      <Routes>
        {/* Public & Entry Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Authentication />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/join" element={<JoinSession />} />
        <Route path="/waiting-room" element={<ParticipantWaitingRoom />} />
        
        {/* Interactive Participant Quiz Flows */}
        <Route path="/play" element={<ParticipantLiveQuiz />} />
        <Route path="/play/:sessionId" element={<ParticipantLiveQuiz />} />
        <Route path="/result" element={<ParticipantQuestionResult />} />
        <Route path="/leaderboard" element={<FinalLeaderboard />} />
        <Route path="/leaderboard/:sessionId" element={<FinalLeaderboard />} />
        <Route path="/feedback" element={<FeedbackSubmission />} />
        <Route path="/feedback/:sessionId" element={<FeedbackSubmission />} />
        <Route path="/profile" element={<ParticipantProfile />} />
        <Route path="/history" element={<ParticipantProfile />} />

        {/* Analytics & Reports */}
        <Route path="/analytics" element={<PostSessionAnalytics />} />
        <Route path="/analytics/:sessionId" element={<PostSessionAnalytics />} />
        <Route path="/feedback/responses" element={<FeedbackResponses />} />
        <Route path="/feedback/responses/:sessionId" element={<FeedbackResponses />} />

        {/* Protected Organizer Workspace Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<OrganizerDashboard />} />
          <Route path="/builder" element={<SessionBuilder />} />
          <Route path="/builder/:id" element={<SessionBuilder />} />
          <Route path="/builder/form" element={<FormBuilder />} />
          <Route path="/builder/form/templates" element={<FormTemplateSelection />} />
          <Route path="/host" element={<LiveMonitoring />} />
          <Route path="/host/:sessionId" element={<LiveMonitoring />} />
          <Route path="/settings" element={<AccountSettings />} />
        </Route>

        {/* Error / 404 Route */}
        <Route path="/error" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
