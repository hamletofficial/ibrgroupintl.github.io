import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  multiFactor,
  TotpMultiFactorGenerator,
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
      const app = initializeApp(window.firebaseConfig, 'ibr-totp-modular');
      const auth = getAuth(app);
      resolve({
        app, auth, multiFactor, TotpMultiFactorGenerator,
        GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider,
        OAuthProvider, reauthenticateWithPopup
      });
    } catch (error) {
      reject(error);
    }
  }
  if (window.firebaseConfig) init();
  else window.addEventListener('load', init, { once: true });
});
