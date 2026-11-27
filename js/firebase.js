import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

if (Object.values(firebaseConfig).some(v => String(v).startsWith("REEMPLAZAR"))) {
  console.warn("Configura js/firebase-config.js con los datos de tu proyecto Firebase.");
}
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
