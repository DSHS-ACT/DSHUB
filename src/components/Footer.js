import React from "react";
import "../styles/common.css";

function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "white",
        padding: "2rem",
        marginTop: "auto",
        boxShadow: "0 -2px 4px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ marginBottom: "0.5rem", color: "var(--primary-color)" }}>
            DSHUB
          </h3>
          <p style={{ color: "var(--text-color-light)", fontSize: "0.9rem" }}>
            대전대신고등학교 공간 예약 시스템
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "var(--text-color-light)", fontSize: "0.9rem" }}>
            © 2026 A.C.T.(KE). All rights reserved.
          </p>
          <p style={{ color: "var(--text-color-light)", fontSize: "0.8rem" }}>
            Developed by{" "}
            <a
              href="https://github.com/Popoisthebest"
              target="_blank"
              rel="noopener noreferrer"
            >
              Popoisthebest
            </a>
            ,{" "}
            <a
              href="https://github.com/UntameDuck"
              target="_blank"
              rel="noopener noreferrer"
            >
              UntameDuck
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
