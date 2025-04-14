import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./views/Home";
import { useAccount, useIsAuthenticated } from "jazz-react";
import { Welcome } from "./views/Welcome";
import { Layout } from "./views/Layout";
import { Settings } from "./views/Settings";
import { ActionItems } from "./views/ActionItems";
import { Calendar } from "./views/Calendar";
import { MeetingView } from "./views/meeting/MeetingView";
import { MeetingPresent } from "./views/meeting/MeetingPresent";
import { MeetingRecord } from "./views/meeting/MeetingRecord";
import { MeetingShared } from "./views/meeting/MeetingShared";
import { Manage } from "./views/Manage";
import { Invite } from "./views/Invite";
import { MeetingList } from "./views/meeting/MeetingList";

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { me } = useAccount({
    resolve: {
      root: {
        selectedOrganization: true,
      },
    },
  });

  const isAdmin =
    isAuthenticated &&
    me?.root?.selectedOrganization &&
    me.canAdmin(me.root.selectedOrganization);
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          {!isAuthenticated && <Route index element={<Welcome />} />}
          {isAuthenticated && (
            <>
              <Route index element={<Home />} />
              <Route path="meetings" element={<MeetingList />} />
              <Route path="action-items" element={<ActionItems />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="settings" element={<Settings />} />
              {isAdmin && <Route path="manage" element={<Manage />} />}
              <Route path="members" element={<Manage />} />
              <Route path="meetings/:meetingId" element={<MeetingShared />}>
                <Route index element={<MeetingView />} />
                <Route path="present" element={<MeetingPresent />} />
                <Route path="record" element={<MeetingRecord />} />
              </Route>
            </>
          )}
          <Route path="invite" element={<Invite />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
