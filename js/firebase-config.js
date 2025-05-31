// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyB27qpKx8uKwqBJbBMMvxYfaY43WxOhmBk",
  authDomain: "sapos-league.firebaseapp.com",
  projectId: "sapos-league",
  storageBucket: "sapos-league.appspot.com",
  messagingSenderId: "409318703000",
  appId: "1:409318703000:web:b220af01b78490773cb5ed"
};

export const app = initializeApp(firebaseConfig);
