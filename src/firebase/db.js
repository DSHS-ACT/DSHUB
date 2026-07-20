import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

// (신규) 예약자 + 동행자를 서브컬렉션으로 저장
// 경로: reservations/{reservationId}/members
export const saveReservationMembers = async (
  reservationId,
  owner, // { studentId, name }
  participants = [] // [{ studentId, name }, ...]
) => {
  if (!reservationId) throw new Error("reservationId가 없습니다.");

  const batch = writeBatch(db);
  const membersCol = collection(db, "reservations", reservationId, "members");

  const all = [
    { ...(owner || {}), role: "owner" },
    ...participants.map((p) => ({ ...p, role: "member" })),
  ];

  all.forEach((p) => {
    const mref = doc(membersCol); // 랜덤 문서 ID
    batch.set(mref, {
      studentId: (p.studentId || "").trim(),
      name: (p.name || "").trim(),
      role: p.role, // 'owner' | 'member'
      reservationId,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
};

// 예약 생성
export const createReservation = async (reservationData) => {
  try {
    const docRef = await addDoc(collection(db, "reservations"), {
      ...reservationData,
      createdAt: new Date(),
      status: "active", // active, cancelled
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// 예약 수정
export const updateReservation = async (reservationId, updateData) => {
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    await updateDoc(reservationRef, updateData);
  } catch (error) {
    throw error;
  }
};

// 예약 삭제
export const deleteReservation = async (reservationId) => {
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    await deleteDoc(reservationRef);
  } catch (error) {
    throw error;
  }
};

// 모든 예약 조회 (지정된 주 또는 현재 주의 모든 예약) - 스냅샷 리스너
export const listenToAllReservations = (
  callback,
  startOfWeekStr,
  endOfWeekStr
) => {
  let q = query(
    collection(db, "reservations"),
    where("date", ">=", startOfWeekStr),
    where("date", "<=", endOfWeekStr),
    orderBy("date", "asc"), // 날짜 기준 오름차순 정렬
    orderBy("time", "asc") // 시간 기준 오름차순 정렬
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const reservationsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(reservationsData);
    },
    (error) => {
      console.error("Error listening to all reservations:", error);
      // 에러 처리 로직 추가 가능
    }
  );

  return unsubscribe;
};

// 특정 사용자 예약 조회 - 스냅샷 리스너
export const listenToUserReservations = (callback, userId) => {
  const q = query(
    collection(db, "reservations"),
    where("studentId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const reservationsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(reservationsData);
    },
    (error) => {
      console.error("Error listening to user reservations:", error);
    }
  );

  return unsubscribe;
};

// 특정 날짜, 방, 시간의 예약 조회 (실시간 리스너는 아님, 일회성 조회)
export const getReservationsByDate = async (
  date,
  roomName = null,
  timeId = null
) => {
  try {
    let q = query(
      collection(db, "reservations"),
      where("date", "==", date),
      orderBy("time", "asc")
    );

    if (roomName) {
      q = query(q, where("room", "==", roomName));
    }
    if (timeId) {
      q = query(q, where("time", "==", timeId));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

// 특정 예약 상세 조회
export const getReservation = async (reservationId) => {
  try {
    const docRef = doc(db, "reservations", reservationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

// 모든 예약 데이터 가져오기
export const getAllReservations = async (startDate, endDate) => {
  try {
    const reservationsRef = collection(db, "reservations");
    const q = query(
      reservationsRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting all reservations:", error);
    throw error;
  }
};

// 특정 사용자의 예약 데이터 가져오기
export const getUserReservations = async (studentId) => {
  try {
    const reservationsRef = collection(db, "reservations");
    const q = query(
      reservationsRef,
      where("studentId", "==", studentId),
      where("status", "==", "active")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting user reservations:", error);
    throw error;
  }
};

// 특정 날짜, roomId, time의 예약 조회 (roomId 기준)
export const getReservationsByDateV2 = async (
  date,
  roomId = null,
  timeId = null
) => {
  try {
    let q = query(
      collection(db, "reservations"),
      where("date", "==", date),
      orderBy("time", "asc")
    );

    if (roomId) {
      q = query(q, where("roomId", "==", roomId));
    }
    if (timeId) {
      q = query(q, where("time", "==", timeId));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

// 공지사항 생성
export const createNotice = async (noticeData) => {
  try {
    const docRef = await addDoc(collection(db, "notices"), {
      ...noticeData,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// 공지사항 삭제
export const deleteNotice = async (noticeId) => {
  try {
    const noticeRef = doc(db, "notices", noticeId);
    await deleteDoc(noticeRef);
  } catch (error) {
    throw error;
  }
};

// 모든 공지사항 조회
export const getAllNotices = async () => {
  try {
    const noticesRef = collection(db, "notices");
    const q = query(noticesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting all notices:", error);
    throw error;
  }
};

// 공지사항 수정
export const updateNotice = async (noticeId, updateData) => {
  try {
    const noticeRef = doc(db, "notices", noticeId);
    await updateDoc(noticeRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("공지사항 수정 오류:", error);
    return false;
  }
};

// 사용자 프로필 생성 또는 업데이트 (role 포함)
export const createUserProfile = async (
  uid,
  { studentId, name, role, email }
) => {
  try {
    await setDoc(
      doc(db, "userProfiles", uid),
      {
        studentId: studentId ?? null,
        name: name ?? null,
        role: role ?? "student", // 역할 저장 (기본: student)
        ...(email ? { email } : {}),
        createdAt: new Date(),
      },
      { merge: true } // 기존 문서가 있으면 병합
    );
  } catch (error) {
    throw error;
  }
};

// 사용자 프로필 조회
export const getUserProfile = async (uid) => {
  try {
    const docRef = doc(db, "userProfiles", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null; // 프로필이 없는 경우
    }
  } catch (error) {
    throw error;
  }
};

// 모든 사용자 프로필을 실시간으로 구독 (관리자용 유저 관리)
export const listenToAllUserProfiles = (callback) => {
  const q = collection(db, "userProfiles");
  return onSnapshot(
    q,
    (querySnapshot) => {
      const items = querySnapshot.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      }));
      callback(items);
    },
    (error) => {
      console.error("Error listening to user profiles:", error);
    }
  );
};

// 사용자 프로필 수정 (이름/학번/역할/정지 여부 등)
export const updateUserProfile = async (uid, patch) => {
  if (!uid) throw new Error("uid는 필수입니다.");
  try {
    await updateDoc(doc(db, "userProfiles", uid), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// 사용자 프로필 삭제
// 주의: Firestore의 프로필 문서만 삭제되며, Firebase Auth 계정 자체는 삭제되지 않습니다.
// (Auth 계정 삭제는 Admin SDK/Cloud Functions에서만 가능) 삭제 후 재로그인 시 정보 입력 화면으로 이동합니다.
export const deleteUserProfile = async (uid) => {
  if (!uid) throw new Error("uid는 필수입니다.");
  try {
    await deleteDoc(doc(db, "userProfiles", uid));
  } catch (error) {
    throw error;
  }
};

// 문의 추가
export const addInquiry = async (inquiryData) => {
  try {
    const inquiryRef = collection(db, "inquiries");
    await addDoc(inquiryRef, {
      ...inquiryData,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("문의 추가 오류:", error);
    throw error;
  }
};

// 문의 목록 조회
export const getInquiries = async (studentId) => {
  try {
    const inquiriesRef = collection(db, "inquiries");
    const q = query(
      inquiriesRef,
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("문의 목록 조회 오류:", error);
    throw error;
  }
};

// 모든 장소 데이터를 실시간으로 구독
export const listenToPlaces = (callback) => {
  const q = query(
    collection(db, "places"),
    orderBy("wing"),
    orderBy("floor"),
    orderBy("order"), // 정렬 기준(옵션)
    orderBy("name") // 동일 order에서 안정정렬
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
};

// 모든 장소 데이터를 1회성으로 조회 (실시간과 동일 기준으로 정렬)
export const getPlaces = async () => {
  const q = query(
    collection(db, "places"),
    orderBy("wing"),
    orderBy("floor"),
    orderBy("order"),
    orderBy("name")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// 장소 생성 또는 업데이트(merge)
// - id 누락 방지
// - 업데이트 타임스탬프 기록
export const upsertPlace = async (place) => {
  if (!place?.id) throw new Error("place.id는 필수입니다.");
  await setDoc(
    doc(db, "places", place.id),
    {
      ...place,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// 특정 장소의 일부 필드만 업데이트
// - 업데이트 타임스탬프 기록
export const updatePlace = async (id, patch) => {
  if (!id) throw new Error("id는 필수입니다.");
  await updateDoc(doc(db, "places", id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

// place 문서 삭제
export const deletePlace = async (id) => {
  if (!id) throw new Error("id는 필수입니다.");
  await deleteDoc(doc(db, "places", id));
};
