import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';

// Page Imports
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UploadPolicy from './pages/UploadPolicy';
import UploadClaim from './pages/UploadClaim';
import ClaimAnalysis from './pages/ClaimAnalysis';
import ClaimPackage from './pages/ClaimPackage';
import ClaimHistory from './pages/ClaimHistory';
import MissingDocuments from './pages/MissingDocuments';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e6eef8]">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Global Layout wrapper to conditionally show navigation
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-[#e6eef8] text-slate-800 flex flex-col">
      <Navbar />
      <main className="flex-grow">

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Dashboard and Action Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload-policy" 
            element={
              <ProtectedRoute>
                <UploadPolicy />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload-claim" 
            element={
              <ProtectedRoute>
                <UploadClaim />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/claim-analysis" 
            element={
              <ProtectedRoute>
                <ClaimAnalysis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/claim-package" 
            element={
              <ProtectedRoute>
                <ClaimPackage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/claim-history" 
            element={
              <ProtectedRoute>
                <ClaimHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/missing-documents" 
            element={
              <ProtectedRoute>
                <MissingDocuments />
              </ProtectedRoute>
            } 
          />

          {/* Redirects */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
