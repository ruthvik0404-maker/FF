import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";

const firebaseConfig = window.firebaseConfig;

if (firebaseConfig) {
    const app = initializeApp(firebaseConfig);

    if (typeof window !== "undefined") {
        getAnalytics(app);
    }

    window.freelanceFlowFirebase = app;
}
