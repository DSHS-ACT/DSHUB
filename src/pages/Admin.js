import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import NoticeList from "../components/NoticeList";
import InquiryList from "../components/InquiryList";
import ReservationList from "../components/ReservationList";
import PlaceList from "../components/PlaceList";
import UserList from "../components/UserList";

function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("notices");

  if (!user || !user.isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem", textAlign: "center" }}>
        관리자 페이지
      </h1>

      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={() => setActiveTab("notices")}
            style={{
              padding: "0.8rem 1.5rem",
              border: "none",
              backgroundColor: "transparent",
              color:
                activeTab === "notices"
                  ? "var(--primary-color)"
                  : "var(--text-color)",
              borderBottom:
                activeTab === "notices"
                  ? "2px solid var(--primary-color)"
                  : "none",
              cursor: "pointer",
              fontWeight: activeTab === "notices" ? "600" : "400",
            }}
          >
            공지사항 관리
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            style={{
              padding: "0.8rem 1.5rem",
              border: "none",
              backgroundColor: "transparent",
              color:
                activeTab === "inquiries"
                  ? "var(--primary-color)"
                  : "var(--text-color)",
              borderBottom:
                activeTab === "inquiries"
                  ? "2px solid var(--primary-color)"
                  : "none",
              cursor: "pointer",
              fontWeight: activeTab === "inquiries" ? "600" : "400",
            }}
          >
            문의 관리
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            style={{
              padding: "0.8rem 1.5rem",
              border: "none",
              backgroundColor: "transparent",
              color:
                activeTab === "reservations"
                  ? "var(--primary-color)"
                  : "var(--text-color)",
              borderBottom:
                activeTab === "reservations"
                  ? "2px solid var(--primary-color)"
                  : "none",
              cursor: "pointer",
              fontWeight: activeTab === "reservations" ? "600" : "400",
            }}
          >
            예약 관리
          </button>
          <button
            onClick={() => setActiveTab("places")}
            style={{
              padding: "0.8rem 1.5rem",
              border: "none",
              backgroundColor: "transparent",
              color:
                activeTab === "places"
                  ? "var(--primary-color)"
                  : "var(--text-color)",
              borderBottom:
                activeTab === "places"
                  ? "2px solid var(--primary-color)"
                  : "none",
              cursor: "pointer",
              fontWeight: activeTab === "places" ? "600" : "400",
            }}
          >
            장소 관리
          </button>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "0.8rem 1.5rem",
              border: "none",
              backgroundColor: "transparent",
              color:
                activeTab === "users"
                  ? "var(--primary-color)"
                  : "var(--text-color)",
              borderBottom:
                activeTab === "users"
                  ? "2px solid var(--primary-color)"
                  : "none",
              cursor: "pointer",
              fontWeight: activeTab === "users" ? "600" : "400",
            }}
          >
            유저 관리
          </button>
          {/* <button
            onClick={() => setActiveTab("init_places")}
            style={{
              padding: "0.8rem 1.5rem",
              border: "none",
              backgroundColor: "transparent",
              color:
                activeTab === "init_places"
                  ? "var(--primary-color)"
                  : "var(--text-color)",
              borderBottom:
                activeTab === "init_places"
                  ? "2px solid var(--primary-color)"
                  : "none",
              cursor: "pointer",
              fontWeight: activeTab === "init_places" ? "600" : "400",
            }}
          >
            초기 장소 데이터 업로드
          </button> */}
        </div>

        {activeTab === "notices" && <NoticeList />}
        {activeTab === "inquiries" && <InquiryList />}
        {activeTab === "reservations" && <ReservationList />}
        {activeTab === "places" && <PlaceList />}
        {activeTab === "users" && <UserList />}
        {/* {activeTab === "init_places" && <OneTimePlacesSeeder />} */}
      </div>
    </div>
  );
}

export default Admin;
