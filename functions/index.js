const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

// Firebase 콘솔 또는 CLI로 설정하는 비밀 관리자 초대 코드
// $ firebase functions:secrets:set ADMIN_SETUP_CODE
const ADMIN_SETUP_CODE = defineSecret("ADMIN_SETUP_CODE");

const ALLOWED_EMAIL_DOMAIN = "@dshs.kr";
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15분

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest();
}

// 길이 정보가 새어나가지 않도록 항상 동일 길이(해시)로 비교
function safeCodeEquals(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

/**
 * 로그인 + @dshs.kr 계정 + 서버에만 저장된 비밀 코드가 일치할 때만
 * 호출한 본인 계정을 관리자로 승격시키는 콜러블 함수.
 * 클라이언트에서 Firestore role 필드를 직접 쓰지 못하도록
 * firebase.rules에서 막아두었기 때문에, 관리자 승격은 반드시 이 경로를 거쳐야 함.
 */
exports.claimAdmin = onCall(
  { secrets: [ADMIN_SETUP_CODE], region: "us-central1" },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const email = auth.token.email || "";
    if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      throw new HttpsError("permission-denied", "허용되지 않은 계정입니다.");
    }

    const expected = ADMIN_SETUP_CODE.value();
    if (!expected) {
      throw new HttpsError(
        "failed-precondition",
        "관리자 초대 코드가 설정되어 있지 않습니다. 관리자에게 문의하세요."
      );
    }

    const submittedCode =
      typeof data?.code === "string" ? data.code.trim() : "";
    if (!submittedCode) {
      throw new HttpsError("invalid-argument", "코드를 입력해주세요.");
    }

    const uid = auth.uid;
    const attemptsRef = admin
      .firestore()
      .collection("_adminSetupAttempts")
      .doc(uid);

    const isMatch = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(attemptsRef);
      const now = Date.now();
      const state = snap.exists ? snap.data() : null;

      const withinWindow =
        state && now - state.firstAttemptAt.toMillis() < ATTEMPT_WINDOW_MS;
      const count = withinWindow ? state.count : 0;

      if (count >= MAX_ATTEMPTS) {
        throw new HttpsError(
          "resource-exhausted",
          "시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."
        );
      }

      const matched = safeCodeEquals(submittedCode, expected);

      if (matched) {
        tx.delete(attemptsRef);
      } else {
        tx.set(attemptsRef, {
          count: count + 1,
          firstAttemptAt: withinWindow
            ? state.firstAttemptAt
            : admin.firestore.Timestamp.now(),
          lastAttemptAt: admin.firestore.Timestamp.now(),
        });
      }

      return matched;
    });

    if (!isMatch) {
      throw new HttpsError("permission-denied", "코드가 올바르지 않습니다.");
    }

    await admin
      .firestore()
      .collection("userProfiles")
      .doc(uid)
      .set(
        {
          role: "admin",
          disabled: false,
          email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return { ok: true };
  }
);
