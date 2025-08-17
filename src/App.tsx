import { Navigate, Route, Routes } from "react-router";
import "./App.css";
import { ASSETS, PERFORMANCE } from "@/routes/routes.ts";
import { Performance } from "@/routes/performance/Performance.tsx";
import { SidebarMenuWrapper } from "./components/SidebarMenuWrapper.tsx";
import { Assets } from "./routes/assets/Assets.tsx";

function App() {
  return (
    <Routes>
      <Route path="*" element={<SidebarMenuWrapper />}>
        <Route index element={<Navigate to={PERFORMANCE} />} />
        <Route path={PERFORMANCE} element={<Performance />} />
        <Route path={ASSETS} element={<Assets />} />
      </Route>
    </Routes>
  );
}

export default App;
