import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const setAdminClaim = onCall<{ uid: string; admin: boolean }>(async (request) => {
    const caller = request.auth;
    if (!caller) throw new HttpsError("unauthenticated", "You must be signed in.");
    if (caller.token?.admin !== true) throw new HttpsError("permission-denied", "Admins only.");

    const { uid, admin: makeAdmin } = request.data || {};
    if (!uid || typeof makeAdmin !== "boolean") {
        throw new HttpsError("invalid-argument", "Expected { uid, admin }.");
    }

    const user = await admin.auth().getUser(uid);
    const existing = user.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existing, admin: makeAdmin });

    await admin.firestore().doc(`users/${uid}`).set({ isAdmin: makeAdmin }, { merge: true });

    return { ok: true, uid, admin: makeAdmin };
});
