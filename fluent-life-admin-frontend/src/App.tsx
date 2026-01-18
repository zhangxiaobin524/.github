import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MenuProvider } from './contexts/MenuContext';
import Login from './pages/Login';
import Dashboard from './pages/dashboard';
import Users from './pages/users';
import UserTrainingRecords from './pages/UserTrainingRecords';
import Posts from './pages/Posts';
import Rooms from './pages/Rooms';
import Training from './pages/Training';
import Permission from './pages/permission';
import Settings from './pages/settings';
import TongueTwisters from './pages/tongue-twisters';
import DailyExpressions from './pages/daily-expressions';
import SpeechTechniques from './pages/speech-techniques';
import LegalDocuments from './pages/legal-documents/LegalDocuments';
import AppSettings from './pages/app-settings';
import HelpCategories from './pages/help-categories';
import HelpArticles from './pages/help-articles';
import AIRoles from './pages/ai-roles';
import VoiceTypes from './pages/voice-types';
import UserSettings from './pages/UserSettings';
import FeedbackManagement from './pages/FeedbackManagement';
import OperationLogs from './pages/OperationLogs';
import Comments from './pages/Comments';
import FollowsCollections from './pages/FollowsCollections';
import PostLikes from './pages/PostLikes';
import ExposureModules from './pages/exposure-modules';
import Videos from './pages/Videos';
import Layout from './components/Layout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <MenuProvider>
      <BrowserRouter>
        <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Users />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/users/:userId/training-records"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <UserTrainingRecords />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/posts"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Posts />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/rooms"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Rooms />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/training"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Training />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/tongue-twisters"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <TongueTwisters />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/daily-expressions"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <DailyExpressions />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/speech-techniques"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <SpeechTechniques />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/legal-documents"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <LegalDocuments />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/app-settings"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <AppSettings />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/help-categories"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <HelpCategories />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/help-articles"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <HelpArticles />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/ai-roles"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <AIRoles />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/voice-types"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <VoiceTypes />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/permission"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Permission />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Settings />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/user-settings"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <UserSettings />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/feedback"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <FeedbackManagement />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/operation-logs"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <OperationLogs />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/comments"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Comments />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/follows-collections"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <FollowsCollections />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/post-likes"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <PostLikes />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/exposure-modules"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <ExposureModules />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/videos"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)}>
                <Videos />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        </Routes>
      </BrowserRouter>
    </MenuProvider>
  );
}

export default App;
