import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCKD6UBWzH528W97-t-muiGE3sDfeAI28k",
    authDomain: "urbaneigh-fashions.firebaseapp.com",
    projectId: "urbaneigh-fashions",
    storageBucket: "urbaneigh-fashions.firebasestorage.app",
    messagingSenderId: "266934703979",
    appId: "1:266934703979:web:d5238764da8f1efc6b5e2e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
