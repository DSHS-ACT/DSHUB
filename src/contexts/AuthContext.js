import React, { createContext, useState, useContext, useEffect } from "react";
import { auth } from "../firebase/config";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { createUserProfile, getUserProfile } from "../firebase/db";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setUser(null);
          localStorage.removeItem("user");
          return;
        }

        // 도메인 체크
        if (!(firebaseUser.email && firebaseUser.email.endsWith("@dshs.kr"))) {
          await signOut(auth);
          setUser(null);
          localStorage.removeItem("user");
          alert("@dshs.kr 도메인 계정만 로그인할 수 있습니다.");
          return;
        }

        // 1) Firestore 프로필 먼저 조회 (role 포함)
        const userProfile = await getUserProfile(firebaseUser.uid); // { studentId, name, role, ... } 예상

        // 1-1) 관리자가 계정을 정지시킨 경우 로그인 차단
        if (userProfile?.disabled) {
          await signOut(auth);
          setUser(null);
          localStorage.removeItem("user");
          alert("관리자에 의해 정지된 계정입니다. 문의를 통해 확인해주세요.");
          return;
        }

        // 2) 역할 결정: 프로필.role > 이메일 기반 추론
        const derivedFromEmail =
          firebaseUser.email === "admin@dshs.kr" ? "admin" : "student";
        const role = userProfile?.role ?? derivedFromEmail;
        const isAdmin = role === "admin";

        // 3) 앱 상태 구성
        const appUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role,
          isAdmin,
          studentId: userProfile?.studentId ?? null,
          name: userProfile?.name ?? (isAdmin ? "관리자" : null),
          profileComplete: !!(userProfile?.studentId && userProfile?.name),
        };

        setUser(appUser);
        localStorage.setItem("user", JSON.stringify(appUser));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const googleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged에서 user 세팅 처리
    } catch (error) {
      console.error("Google 로그인 오류:", error);
      let errorMessage = error.message;
      if (error.code === "auth/popup-blocked") {
        errorMessage =
          "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "로그인 팝업이 닫혔습니다.";
      }
      alert(errorMessage);
      setUser(null);
      localStorage.removeItem("user");
      setLoading(false);
    }
  };

  const completeUserProfile = async (studentId, name, overrideRole) => {
    setLoading(true);
    try {
      if (!user || !user.uid) {
        throw new Error("사용자 정보가 없습니다.");
      }

      // 저장할 role 결정: 전달값 > 현재 user.role > 기본 student
      const roleToSave = overrideRole ?? user.role ?? "student";

      // 역할 포함 저장
      await createUserProfile(user.uid, {
        studentId,
        name,
        role: roleToSave,
        email: user.email,
      });

      // 최신 프로필 재조회 (role 포함)
      const updated = await getUserProfile(user.uid);

      const nextRole = updated?.role ?? roleToSave;
      const updatedUser = {
        ...user,
        studentId: updated?.studentId ?? null,
        name: updated?.name ?? null,
        role: nextRole,
        isAdmin: nextRole === "admin",
        profileComplete: !!(updated?.studentId && updated?.name),
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("프로필 저장 오류:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem("user");
  };

  const value = {
    user,
    googleLogin,
    logout,
    loading,
    completeUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
