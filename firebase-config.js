// public/firebase-config.js
// replace the placeholders with values from Firebase Console
window.firebaseConfig = {
  apiKey: "AIzaSyChWtcZbStdG0ep7FdL8OG6ESgSXtzDZ1k",
  authDomain: "wale-491805.firebaseapp.com",
  projectId: "wale-491805",
  storageBucket: "wale-491805.firebasestorage.app",
  messagingSenderId: "753131375199",
  appId: "1:753131375199:web:87d3eef7edda42d640a9ea"
  // other fields (messagingSenderId, measurementId) may be added if available
};
// Public LinkedIn app client ID. The client secret stays in LINKEDIN_CLIENT_SECRET.
window.linkedinClientId = "78e83w1spj610a";

// Set this to the public Web Push certificate key from Firebase Console > Project Settings > Cloud Messaging.
// Do not put a service-account credential or private key here.
window.firebaseMessagingVapidKey = window.firebaseMessagingVapidKey || "";
