import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import "./MainLayout.css";

function MainLayout() {
  return (
    <div className="main-layout">
      <Header />

      <Outlet />

      <Footer />
    </div>
  );
}

export default MainLayout;
