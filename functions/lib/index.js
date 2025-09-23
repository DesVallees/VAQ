"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAdminClaim = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
exports.setAdminClaim = (0, https_1.onCall)(async (request) => {
    var _a;
    const caller = request.auth;
    if (!caller)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    if (((_a = caller.token) === null || _a === void 0 ? void 0 : _a.admin) !== true)
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    const { uid, admin: makeAdmin } = request.data || {};
    if (!uid || typeof makeAdmin !== "boolean") {
        throw new https_1.HttpsError("invalid-argument", "Expected { uid, admin }.");
    }
    const user = await admin.auth().getUser(uid);
    const existing = user.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, Object.assign(Object.assign({}, existing), { admin: makeAdmin }));
    await admin.firestore().doc(`users/${uid}`).set({ isAdmin: makeAdmin }, { merge: true });
    return { ok: true, uid, admin: makeAdmin };
});
//# sourceMappingURL=index.js.map