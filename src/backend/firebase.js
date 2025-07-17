import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import {getFirestore} from "firebase/firestore"
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAMf8Nyt7TVkrsDfjRpTjAhHCRhh0sPiyk",
  authDomain: "pv-backend-ca646.firebaseapp.com",
  projectId: "pv-backend-ca646",
  storageBucket: "pv-backend-ca646.appspot.com",
  messagingSenderId: "428045740192",
  appId: "1:428045740192:web:fd320a4f3e7d48ed8681c5",
  measurementId: "G-16KCCLD8PV",
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);