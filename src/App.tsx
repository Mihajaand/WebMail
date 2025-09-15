import { Route, Routes } from "react-router";
import AppWrapper from "./pages/AppWrapper";

export default function App() {
  

  return (
   <div>
    <Routes>         
       <Route path="/" element={<AppWrapper />} />

    </Routes>
   </div>
  );
}
