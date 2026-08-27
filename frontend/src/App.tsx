import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { WorkspaceProvider } from "@/lib/workspace";
import AppShell from "@/components/AppShell";
import Auth from "@/pages/Auth";
import MyDay from "@/pages/MyDay";
import Knowledge from "@/pages/Knowledge";
import Tasks from "@/pages/Tasks";
import CalendarPage from "@/pages/CalendarPage";
import VoroPage from "@/pages/VoroPage";
import Spaces from "@/pages/Spaces";
import SpaceDetail from "@/pages/SpaceDetail";
import Settings from "@/pages/Settings";
import Inbox from "@/pages/Inbox";

export default function App() {
  return (
    <WorkspaceProvider>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard/my-day" replace />} />
          <Route path="my-day" element={<MyDay />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="voro" element={<VoroPage />} />
          <Route path="spaces" element={<Spaces />} />
          <Route path="spaces/:id" element={<SpaceDetail />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </WorkspaceProvider>
  );
}
