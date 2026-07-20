import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  listenToAllUserProfiles,
  updateUserProfile,
  deleteUserProfile,
} from "../firebase/db";

const ROLE_LABEL = {
  admin: "관리자",
  student: "학생",
};

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value.toDate === "function" ? value.toDate() : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function UserList() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all | admin | student
  const [editing, setEditing] = useState(null); // 편집 중인 유저

  useEffect(() => {
    const unsubscribe = listenToAllUserProfiles((items) => {
      setUsers(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      disabled: users.filter((u) => u.disabled).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) => {
        if (!keyword) return true;
        return [u.name, u.studentId, u.email]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(keyword));
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
  }, [users, search, roleFilter]);

  const handleToggleRole = async (target) => {
    if (target.uid === currentUser?.uid) {
      alert("본인의 역할은 이 화면에서 변경할 수 없습니다.");
      return;
    }
    const nextRole = target.role === "admin" ? "student" : "admin";
    const confirmMsg =
      nextRole === "admin"
        ? `${target.name || target.uid} 님을 관리자로 지정할까요?`
        : `${target.name || target.uid} 님의 관리자 권한을 해제할까요?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await updateUserProfile(target.uid, { role: nextRole });
    } catch (error) {
      console.error("역할 변경 오류:", error);
      alert("역할 변경 중 오류가 발생했습니다.");
    }
  };

  const handleToggleDisabled = async (target) => {
    if (target.uid === currentUser?.uid) {
      alert("본인 계정은 정지할 수 없습니다.");
      return;
    }
    const nextDisabled = !target.disabled;
    const confirmMsg = nextDisabled
      ? `${target.name || target.uid} 님의 계정을 정지할까요? 정지된 계정은 로그인할 수 없습니다.`
      : `${target.name || target.uid} 님의 계정 정지를 해제할까요?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await updateUserProfile(target.uid, { disabled: nextDisabled });
    } catch (error) {
      console.error("계정 상태 변경 오류:", error);
      alert("계정 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (target) => {
    if (target.uid === currentUser?.uid) {
      alert("본인 프로필은 삭제할 수 없습니다.");
      return;
    }
    if (
      !window.confirm(
        `${target.name || target.uid} 님의 프로필을 삭제할까요?\n` +
          "Google 계정 자체는 삭제되지 않으며, 다음 로그인 시 정보 입력 화면부터 다시 진행됩니다."
      )
    )
      return;
    try {
      await deleteUserProfile(target.uid);
    } catch (error) {
      console.error("프로필 삭제 오류:", error);
      alert("프로필 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSaveEdit = async (form) => {
    if (!editing) return;
    if (!form.name.trim() || !form.studentId.trim()) {
      alert("이름과 학번을 모두 입력해주세요.");
      return;
    }
    try {
      await updateUserProfile(editing.uid, {
        name: form.name.trim(),
        studentId: form.studentId.trim(),
      });
      setEditing(null);
    } catch (error) {
      console.error("프로필 수정 오류:", error);
      alert("프로필 수정 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>유저 관리</h2>

      {/* 통계 */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="전체 인원" value={stats.total} />
        <StatCard label="관리자" value={stats.admins} />
        <StatCard label="정지된 계정" value={stats.disabled} />
      </div>

      {/* 검색 & 필터 */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 학번, 이메일로 검색"
          style={{
            flex: "1 1 240px",
            padding: "0.6rem 0.8rem",
            borderRadius: 6,
            border: "1px solid var(--border-color)",
          }}
        />
        {[
          { key: "all", label: "전체" },
          { key: "admin", label: "관리자" },
          { key: "student", label: "학생" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRoleFilter(opt.key)}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background:
                roleFilter === opt.key ? "var(--primary-color)" : "#fff",
              color: roleFilter === opt.key ? "#fff" : "var(--text-color)",
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 유저 목록 */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <Th>이름</Th>
                <Th>학번</Th>
                <Th>이메일</Th>
                <Th>역할</Th>
                <Th>상태</Th>
                <Th>가입일</Th>
                <Th>관리</Th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: "2rem", textAlign: "center", color: "#666" }}
                  >
                    조건에 맞는 유저가 없습니다.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => (
                <tr
                  key={u.uid}
                  style={{
                    borderTop: "1px solid var(--border-color)",
                    opacity: u.disabled ? 0.6 : 1,
                  }}
                >
                  <Td>{u.name || "(미입력)"}</Td>
                  <Td>{u.studentId || "-"}</Td>
                  <Td>{u.email || "-"}</Td>
                  <Td>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "0.2rem 0.5rem",
                        borderRadius: 4,
                        background: u.role === "admin" ? "#fff3bf" : "#e7f5ff",
                        color: u.role === "admin" ? "#ae8c00" : "#1971c2",
                      }}
                    >
                      {ROLE_LABEL[u.role] || u.role || "-"}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "0.2rem 0.5rem",
                        borderRadius: 4,
                        background: u.disabled ? "#ffe3e3" : "#e6fcf5",
                        color: u.disabled ? "#c92a2a" : "#0ca678",
                      }}
                    >
                      {u.disabled ? "정지됨" : "정상"}
                    </span>
                  </Td>
                  <Td>{formatDate(u.createdAt)}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <ActionButton onClick={() => setEditing(u)}>수정</ActionButton>
                      <ActionButton onClick={() => handleToggleRole(u)}>
                        {u.role === "admin" ? "관리자 해제" : "관리자 지정"}
                      </ActionButton>
                      <ActionButton onClick={() => handleToggleDisabled(u)}>
                        {u.disabled ? "정지 해제" : "정지"}
                      </ActionButton>
                      <ActionButton danger onClick={() => handleDelete(u)}>
                        삭제
                      </ActionButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 모달 */}
      {editing && (
        <UserEditModal
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        padding: "1rem",
        borderRadius: 8,
        background: "white",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ fontSize: 13, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{ padding: "0.8rem 1rem", fontSize: 13, color: "#495057" }}>
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td style={{ padding: "0.8rem 1rem", fontSize: 14, verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

function ActionButton({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.4rem 0.7rem",
        borderRadius: 6,
        border: "1px solid " + (danger ? "#ef4444" : "var(--border-color)"),
        background: danger ? "#ef4444" : "#fff",
        color: danger ? "#fff" : "var(--text-color)",
        cursor: "pointer",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function UserEditModal({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    studentId: initial.studentId || "",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 8,
          minWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>유저 정보 수정</h3>

        <label style={{ fontSize: 13 }}>이메일</label>
        <input
          type="text"
          value={initial.email || "-"}
          disabled
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "#f1f3f5",
            color: "#666",
          }}
        />

        <label style={{ fontSize: 13 }}>이름</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />

        <label style={{ fontSize: 13 }}>학번</label>
        <input
          type="text"
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "#fff",
              color: "#000",
            }}
          >
            취소
          </button>
          <button
            onClick={() => onSave(form)}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "none",
              background: "var(--primary-color)",
              color: "#fff",
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserList;
