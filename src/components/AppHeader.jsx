import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="app-header">
      <Link className="brand-link" to="/dashboard">Cosmic Flow</Link>
      <div className="header-user">
        <span>{user?.name}</span>
        <button type="button" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
