import { Link, Outlet, useLocation } from "react-router-dom";
import "./AuthLayout.css";

// Hình minh họa chuyển động (cặp tài liệu, cặp công việc, kính lúp, ngôi sao lấp lánh)
function AuthIllustration() {
  return (
    <svg
      className="auth-illustration"
      viewBox="0 0 260 220"
      aria-hidden="true"
      focusable="false"
    >
      {/* Vòng nét đứt xoay chậm + quầng sáng phía sau */}
      <circle
        className="ill-ring"
        cx="130"
        cy="112"
        r="104"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="2"
        strokeDasharray="4 10"
        strokeLinecap="round"
      />
      <circle
        className="ill-blob"
        cx="130"
        cy="112"
        r="84"
        fill="rgba(255,255,255,0.14)"
      />

      {/* Tờ hồ sơ */}
      <g transform="rotate(-10 62 94)">
        <g className="ill-doc">
          <rect x="40" y="64" width="46" height="60" rx="8" fill="#ffffff" />
          <rect x="48" y="76" width="30" height="5" rx="2.5" fill="#cfe7e1" />
          <rect x="48" y="87" width="22" height="5" rx="2.5" fill="#cfe7e1" />
          <rect x="48" y="98" width="26" height="5" rx="2.5" fill="#cfe7e1" />
          <circle cx="72" cy="114" r="6" fill="#0e6b5c" />
          <path
            d="M69 114l2.2 2.2 4-4.4"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* Cặp công việc */}
      <g className="ill-case">
        <path
          d="M113 94v-10a7 7 0 0 1 7-7h20a7 7 0 0 1 7 7v10"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <rect x="84" y="92" width="92" height="66" rx="11" fill="#ffffff" />
        <rect x="84" y="118" width="92" height="6" fill="#cfe7e1" />
        <rect x="121" y="112" width="18" height="18" rx="5" fill="#ffd166" />
      </g>

      {/* Kính lúp */}
      <g className="ill-glass">
        <circle
          cx="188"
          cy="80"
          r="20"
          fill="rgba(255,255,255,0.22)"
          stroke="#ffd166"
          strokeWidth="6"
        />
        <line
          x1="202"
          y1="95"
          x2="216"
          y2="110"
          stroke="#ffd166"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M178 77a11 11 0 0 1 8-8"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.8"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Ngôi sao lấp lánh */}
      <g transform="translate(58 44)">
        <path
          className="ill-spark ill-spark-1"
          d="M0 -8L2.4 -2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4 -2.4Z"
          fill="#ffd166"
        />
      </g>
      <g transform="translate(206 150) scale(0.9)">
        <path
          className="ill-spark ill-spark-2"
          d="M0 -8L2.4 -2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4 -2.4Z"
          fill="#ffffff"
        />
      </g>
      <g transform="translate(44 160) scale(0.75)">
        <path
          className="ill-spark ill-spark-3"
          d="M0 -8L2.4 -2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4 -2.4Z"
          fill="#ffffff"
        />
      </g>
      <g transform="translate(150 34) scale(0.8)">
        <path
          className="ill-spark ill-spark-4"
          d="M0 -8L2.4 -2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4 -2.4Z"
          fill="#ffd166"
        />
      </g>
      <circle className="ill-spark ill-spark-2" cx="214" cy="52" r="4" fill="#ffffff" />
      <circle className="ill-spark ill-spark-3" cx="70" cy="192" r="3" fill="#ffffff" />
    </svg>
  );
}

function AuthLayout() {
  const { pathname } = useLocation();

  // /register -> form bên phải, còn lại (/login) -> form bên trái
  const mode = pathname.startsWith("/register") ? "register" : "login";
  const isRegister = mode === "register";

  return (
    <main className="auth-layout">
      <div className={`auth-shell auth-shell--${mode}`}>
        {/* Vùng nhập liệu: nội dung trang Login hoặc Register */}
        <div className="auth-form-area" key={mode}>
          <Outlet />
        </div>

        {/* Tấm phủ trượt qua lại, che nửa còn lại */}
        <aside className="auth-overlay">
          <div className="auth-overlay-inner">
            <AuthIllustration />

            <div className="auth-overlay-text" key={mode}>
              <h2>{isRegister ? "Chào mừng trở lại!" : "Bạn mới ở đây?"}</h2>
              <p>
                {isRegister
                  ? "Đăng nhập để tiếp tục hành trình tìm kiếm công việc của bạn."
                  : "Tạo tài khoản để khám phá hàng loạt cơ hội việc làm phù hợp với bạn."}
              </p>
            </div>

            {/* Công tắc chuyển đăng nhập / đăng ký */}
            <nav
              className={`auth-switch auth-switch--${mode}`}
              aria-label="Chuyển giữa đăng nhập và đăng ký"
            >
              <Link
                to="/login"
                aria-current={isRegister ? undefined : "page"}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                aria-current={isRegister ? "page" : undefined}
              >
                Đăng ký
              </Link>
            </nav>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default AuthLayout;