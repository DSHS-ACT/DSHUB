import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";
import "../styles/common.css";

const ERROR_MESSAGES = {
  unauthenticated: "로그인이 필요합니다.",
  "permission-denied": "코드가 올바르지 않거나 허용되지 않은 계정입니다.",
  "resource-exhausted": "시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.",
  "failed-precondition": "서버에 초대 코드가 설정되어 있지 않습니다. 관리자에게 문의하세요.",
  "invalid-argument": "코드를 입력해주세요.",
};

function AdminSetup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "2rem" }}>로딩 중...</div>;
  }

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  if (user.isAdmin) {
    return (
      <div style={{ maxWidth: "400px", margin: "0 auto", padding: "2rem", textAlign: "center" }}>
        <p>이미 관리자 권한을 가지고 있습니다.</p>
        <button
          onClick={() => navigate("/admin")}
          style={{
            marginTop: "1rem",
            padding: "0.8rem 1.5rem",
            backgroundColor: "var(--primary-color)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          관리자 페이지로 이동
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("코드를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const functions = getFunctions(getApp());
      const claimAdmin = httpsCallable(functions, "claimAdmin");
      await claimAdmin({ code: code.trim() });

      setSuccess(true);
      // Firestore의 role 변경 사항을 AuthContext가 다시 읽도록 새로고침
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1200);
    } catch (err) {
      console.error("관리자 승격 오류:", err);
      // Firebase Functions 콜러블 에러의 code는 "functions/permission-denied" 형태로 옴
      const code = (err.code || "").replace(/^functions\//, "");
      setError(ERROR_MESSAGES[code] || "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h2>관리자 등록</h2>
        <p>관리자에게 전달받은 초대 코드를 입력해주세요.</p>
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
        }}
      >
        {error && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#fee",
              color: "#c00",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "4px",
            }}
          >
            관리자로 등록되었습니다. 이동 중...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="admin-setup-code"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
            >
              초대 코드
            </label>
            <input
              id="admin-setup-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              style={{
                width: "100%",
                padding: "0.8rem",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
              }}
              required
              disabled={submitting || success}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || success}
            style={{
              width: "100%",
              padding: "1rem",
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: submitting || success ? "not-allowed" : "pointer",
              opacity: submitting || success ? 0.7 : 1,
            }}
          >
            {submitting ? "확인 중..." : "관리자로 등록"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminSetup;
