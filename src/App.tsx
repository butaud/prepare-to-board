import { Routes, Route } from "react-router-dom";
import { Home } from "./views/Home";
import { useIsAuthenticated } from "jazz-tools/react";
import { Welcome } from "./views/Welcome";
import { Layout } from "./views/Layout";
import { ActionItems } from "./views/ActionItems";
import { Calendar } from "./views/Calendar";
import { MeetingView } from "./views/meeting/MeetingView";
import { MeetingPresent } from "./views/meeting/MeetingPresent";
import { MeetingShared } from "./views/meeting/MeetingShared";
import { Manage } from "./views/Manage";
import { Invite } from "./views/Invite";
import { MeetingList } from "./views/meeting/MeetingList";
import { AuthenticatedShared } from "./views/AuthenticatedShared";
import { useLoadAccount } from "./hooks/Account";
import { MeetingMinutes } from "./views/meeting/MeetingMinutes";

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { me } = useLoadAccount();

  const isAdmin =
    isAuthenticated &&
    me?.root?.selectedOrganization &&
    me.canAdmin(me.root.selectedOrganization);
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {!isAuthenticated && <Route index element={<Welcome />} />}
        {isAuthenticated && (
          <Route element={<AuthenticatedShared />}>
            <Route index element={<Home />} />
            <Route path="meetings" element={<MeetingList />} />
            <Route path="action-items" element={<ActionItems />} />
            <Route path="calendar" element={<Calendar />} />
            {isAdmin && <Route path="manage" element={<Manage />} />}
            <Route path="members" element={<Manage />} />
            <Route path="meetings/:meetingId" element={<MeetingShared />}>
              <Route index element={<MeetingView />} />
              <Route path="present" element={<MeetingPresent />} />
              <Route path="minutes" element={<MeetingMinutes />} />
            </Route>
          </Route>
        )}
        <Route path="invite" element={<Invite />} />
      </Route>
    </Routes>
  );
}

export default App;
