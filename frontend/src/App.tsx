
import "./App.css";

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
};

const jobs: Job[] = [
  {
    id: 1,
    title: "Backend Developer Intern",
    company: "Tech Solutions",
    location: "TP. Hồ Chí Minh",
    salary: "3–5 triệu",
    type: "Thực tập",
  },
  {
    id: 2,
    title: "Frontend Developer",
    company: "Digital Future",
    location: "Hà Nội",
    salary: "12–18 triệu",
    type: "Toàn thời gian",
  },
  {
    id: 3,
    title: "Python Developer",
    company: "Innovate Labs",
    location: "Remote",
    salary: "15–25 triệu",
    type: "Từ xa",
  },
];

function App() {
  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="/">
          <span className="brand-icon">H</span>
          HR Recruitment
        </a>

        <nav className="nav-links">
          <a href="#jobs">Tìm việc</a>
          <a href="#about">Về chúng tôi</a>
        </nav>

        <div className="nav-actions">
          <button className="btn btn-outline">Đăng nhập</button>
          <button className="btn btn-primary">Đăng ký</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <span className="eyebrow">NỀN TẢNG TUYỂN DỤNG THÔNG MINH</span>

          <h1>
            Tìm công việc phù hợp
            <br />
            <span>Phát triển tương lai</span>
          </h1>

          <p className="hero-description">
            Khám phá cơ hội nghề nghiệp và kết nối với những nhà tuyển dụng
            phù hợp với kỹ năng của bạn.
          </p>

          <form
            className="search-bar"
            onSubmit={(event) => {
              event.preventDefault();
              document
                .getElementById("jobs")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <label className="search-input">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Tên công việc, kỹ năng..."
                aria-label="Tên công việc hoặc kỹ năng"
              />
            </label>

            <button className="btn btn-primary search-button" type="submit">
              Tìm việc
            </button>
          </form>

          <p className="search-hint">
            Gợi ý: Python, Backend, Frontend, Intern
          </p>
        </section>

        <section className="stats" id="about">
          <div>
            <strong>120+</strong>
            <span>Việc làm mẫu</span>
          </div>
          <div>
            <strong>35+</strong>
            <span>Doanh nghiệp mẫu</span>
          </div>
          <div>
            <strong>AI</strong>
            <span>Hỗ trợ phân tích CV</span>
          </div>
        </section>

        <section className="jobs-section" id="jobs">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CƠ HỘI NGHỀ NGHIỆP</span>
              <h2>Việc làm nổi bật</h2>
              <p>Khám phá một số vị trí đang được giới thiệu.</p>
            </div>

            <a href="#jobs" className="view-all">
              Xem tất cả →
            </a>
          </div>

          <div className="job-list">
            {jobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="company-logo">
                  {job.company.charAt(0)}
                </div>

                <div className="job-info">
                  <span className="job-type">{job.type}</span>
                  <h3>{job.title}</h3>
                  <p className="company-name">{job.company}</p>

                  <div className="job-meta">
                    <span>📍 {job.location}</span>
                    <span>💰 {job.salary}</span>
                  </div>
                </div>

                <button
                  className="btn btn-outline job-button"
                  onClick={() =>
                    alert(`Bạn đã chọn xem vị trí: ${job.title}`)
                  }
                >
                  Xem chi tiết
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>HR Recruitment</span>
        <span>Đồ án HTTT_08 · Website quản lý tuyển dụng nhân sự</span>
      </footer>
    </div>
  );
}

export default App;
