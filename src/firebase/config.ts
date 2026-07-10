import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDPcckqq_YnMhqxTqwuqCkPAJHkkAlowlc",
  authDomain: "magnetstorage-8d096.firebaseapp.com",
  projectId: "magnetstorage-8d096",
  storageBucket: "magnetstorage-8d096.firebasestorage.app",
  messagingSenderId: "230223874458",
  appId: "1:230223874458:web:067041515578448ce05223",
  measurementId: "G-Z815T8SS6L"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);