import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Reserve from "./pages/Reserve";
import Reservations from "./pages/Reservations";
import MyPage from "./pages/MyPage";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import AdminSetup from "./pages/AdminSetup";
import CompleteProfile from "./pages/CompleteProfile";
import Inquiry from "./pages/Inquiry";
import "./styles/common.css";

// 보호된 라우트 컴포넌트
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>로딩 중...</div>
    );
  }

  // 사용자가 로그인했지만 프로필이 불완전한 경우 프로필 완성 페이지로 리다이렉트
  if (user && !user.profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// 관리자 전용 라우트 컴포넌트
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate("/");
    }
  }, [user, navigate]);

  return user?.isAdmin ? children : null;
};

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    // 관리자일 경우 개발자 도구 제한을 적용하지 않습니다.
    if (user && user.isAdmin) {
      console.log("관리자 계정입니다. 개발자 도구 제한을 적용하지 않습니다.");
      return;
    }

    // 개발자 도구 단축키 차단
    const handleKeyDown = (event) => {
      if (
        event.keyCode === 123 ||
        (event.ctrlKey && event.shiftKey && event.keyCode === 73)
      ) {
        event.preventDefault();
        alert("개발자 도구 사용이 금지되어 있습니다.");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // 개발자 도구 열림 감지
    const devToolsDetector = () => {
      const callback = () => {
        alert("개발자 도구 사용이 금지되어 있습니다.");
      };

      const checkStatus = () => {
        const startTime = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const endTime = performance.now();

        if (endTime - startTime > 100) {
          callback();
        }
      };

      const intervalId = setInterval(checkStatus, 1000);
      return intervalId;
    };

    const interval = devToolsDetector();

    // 클린업 함수: 컴포넌트 언마운트 시 이벤트 리스너 및 인터벌 제거
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <Header />
      <main style={{ flexGrow: 1, padding: "2rem 0" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route
            path="/reserve"
            element={
              <ProtectedRoute>
                <Reserve />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservations"
            element={
              <ProtectedRoute>
                <Reservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="/inquiry" element={<Inquiry />} />
          <Route path="/admin-setup" element={<AdminSetup />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
