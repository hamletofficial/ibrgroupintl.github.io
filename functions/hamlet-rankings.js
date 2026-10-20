const admin = require("firebase-admin");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");

// Recompute from source records on each write, so retries do not double-count.
const updateBrokerRankingAggregates = onDocumentWritten({
  document: "hamletDeals/{dealId}",
  region: "us-central1",
  timeoutSeconds: 120,
  memory: "256MiB",
}, async (event) => {
  if (!admin.apps.length) admin.initializeApp();
  const db = getFirestore(admin.app());
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  const uids = [...new Set([before?.uid, after?.uid].filter(
    (uid) => typeof uid === "string" && uid.length > 0 && uid.length <= 128
  ))];

  for (const uid of uids) {
    const profileRef = db.collection("publicProfiles").doc(uid);
    const [profileSnap, dealsSnap] = await Promise.all([
      profileRef.get(),
      db.collection("hamletDeals").where("uid", "==", uid).get(),
    ]);
    if (!profileSnap.exists) continue;
    const profile = profileSnap.data() || {};
    const closed = dealsSnap.docs.filter((doc) => {
      const d = doc.data() || {};
      return d.uid === uid && d.stage === "Closed" && d.demo !== true &&
        typeof d.value === "number" && Number.isFinite(d.value) &&
        d.value > 0 && d.value <= 1e12;
    });

    if (profile.isPublic !== true) {
      await profileRef.set({
        closedDealCount: FieldValue.delete(),
        closedDealValueTotal: FieldValue.delete(),
        averageClosedDealValue: FieldValue.delete(),
        rankingsUpdatedAt: FieldValue.delete(),
      }, {merge: true});
      continue;
    }

    const closedDealCount = closed.length;
    const closedDealValueTotal = closed.reduce((sum, doc) => sum + doc.data().value, 0);
    await profileRef.set({
      closedDealCount,
      closedDealValueTotal,
      averageClosedDealValue: closedDealCount ? closedDealValueTotal / closedDealCount : 0,
      rankingsUpdatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  }
  console.log("Broker ranking aggregates recalculated for accounts:", uids.length);
});

module.exports = {updateBrokerRankingAggregates};
