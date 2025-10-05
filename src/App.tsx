import { Navigate, Route, Routes } from "react-router";
import AppWrapper from "./pages/AppWrapper";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import { useEffect, useState } from "react";
import GmailClone from "./pages/GmailClone";
import Profiles from "./pages/Profiles";

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
      </Routes>
    </div>
  );
}
