import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import GrillPage from './pages/GrillPage';
import HistoryPage from './pages/HistoryPage';
import SessionResultPage from './pages/SessionResultPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />

      <Route
        path="/grill"
        element={
          <ProtectedRoute>
            <GrillPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:sessionId"
        element={
          <ProtectedRoute>
            <SessionResultPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/grill" replace />} />
      <Route path="*" element={<Navigate to="/grill" replace />} />
    </Routes>
  );
}
