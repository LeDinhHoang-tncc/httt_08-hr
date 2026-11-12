import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";


function Login() {
    const navigate = useNavigate();

    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setError("");

        try {
        setLoading(true);

        const response = await fetch(
            "http://127.0.0.1:8000/api/auth/login",
            {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const message =
            typeof data.detail === "string"
                ? data.detail
                : "Email hoặc mật khẩu không chính xác.";

            throw new Error(message);
        }

        await login(data.access_token);

        navigate("/");
        } catch (err) {
        setError(
            err instanceof Error ? err.message : "Không thể kết nối đến máy chủ."
        );
        } finally {
        setLoading(false);
        }
    };

    return (
        <main className="login-page">
        <Link to="/" className="auth-logo" title="Về trang chủ">
          HR Recruitment
        </Link>

        <h1>Đăng nhập</h1>

        <form onSubmit={handleSubmit}>
            <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />
            </div>

            <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
            />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
        </form>

        <p>
            Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
        </main>
    );
}

export default Login;