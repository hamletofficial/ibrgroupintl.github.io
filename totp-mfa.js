import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';
import {
  getAuth,
  multiFactor,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  reauthenticateWithPopup
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

window.ibrTotp = window.ibrTotp || {};

window.ibrTotp.ready = new Promise((resolve, reject) => {
  function init() {
    try {
      if (!window.firebaseConfig) throw new Error('Firebase configuration is unavailable.');
      // Use the default app name so this modular Auth instance shares the
      // existing persisted Firebase Auth session used by the compat code.
      const app = window.firebase && window.firebase.apps && window.firebase.apps.length
        ? getAuth().app
        : initializeApp(window.firebaseConfig);
      const auth = getAuth(app);
      const api = {
        app, auth, multiFactor, TotpMultiFactorGenerator, getMultiFactorResolver, QRCode,
        GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider,
        OAuthProvider, reauthenticateWithPopup
      };
      window.ibrTotp.api = api;
      resolve(api);
    } catch (error) {
      reject(error);
    }
  }
  if (window.firebaseConfig) init();
  else window.addEventListener('load', init, { once: true });
});
