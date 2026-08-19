import { Navigate, Route, Routes } from 'react-router-dom';
import LegacyDataNotice from './components/LegacyDataNotice';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ProjectBoardPage from './pages/ProjectBoardPage';
import RegisterPage from './pages/RegisterPage';
import TaskDetailsPage from './pages/TaskDetailsPage';

function App() {
  return (
    <>
      <LegacyDataNotice />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects/:projectId" element={<ProjectBoardPage />} />
          <Route
            path="/projects/:projectId/tasks/:taskId"
            element={<TaskDetailsPage />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
