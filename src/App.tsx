import { Navigate, Route, Routes } from "react-router";
import AppWrapper from "./pages/AppWrapper";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import { useEffect, useState } from "react";
import GmailClone from "./pages/GmailClone";
import Profiles from "./pages/Profiles";
import Support from "./pages/Support";
import { Toaster } from "react-hot-toast"; // ✅ import du toaster

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <div>
      <Routes>
        <Route path="/" element={<AppWrapper />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route
          path="/"
          element={user ? <GmailClone user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/support" element={<Support onBack={() => {}} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* ✅ Toaster global */}
      <Toaster
        toastOptions={{
          duration: 3000,
          style: {
            background: "#333",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "0.9rem",
          },
        }}
      />
    </div>
  );
}
