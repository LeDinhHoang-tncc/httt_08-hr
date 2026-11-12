
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Header.css";

function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          HR Recruitment
        </Link>

        <nav className="nav">
          <Link to="/">Trang chủ</Link>
          <Link to="/#jobs">Việc làm</Link>
        </nav>

        <div className="auth-buttons">
          {isAuthenticated && user ? (
            <>
              <span className="user-name">
                Xin chào, {user.full_name}
              </span>
              {user.role === "candidate" && (
              <Link to="/candidate/dashboard" className="btn-dashboard">
                  Dashboard ứng viên
                </Link>
              )}

              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-login">
                Đăng nhập
              </Link>

              <Link to="/register" className="btn-register">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
