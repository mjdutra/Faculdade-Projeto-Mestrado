import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/firebase/AuthContext";

createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <App />
    </AuthProvider>
);