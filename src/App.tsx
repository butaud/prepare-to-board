import { BrowserRouter, Routes, Route } from "react-router-dom";
import { About } from "./views/About";
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
import { Meeting } from "./views/meeting/Meeting";
import { Manage } from "./views/Manage";
import { Invite } from "./views/Invite";

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { me } = useAccount({
    root: {
      selectedOrganization: {},
    },
  });

  const isAdmin =
    me?.root.selectedOrganization && me.canAdmin(me.root.selectedOrganization);
  const isOfficer =
    me?.root.selectedOrganization && me.canWrite(me.root.selectedOrganization);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {!isAuthenticated && <Route index element={<Welcome />} />}
          {isAuthenticated && (
            <>
              <Route index element={<Home />} />
              <Route path="action-items" element={<ActionItems />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="settings" element={<Settings />} />
              {(isOfficer || isAdmin) && (
                <Route path="manage" element={<Manage />} />
              )}
              <Route path="meeting/:meetingId" element={<Meeting />}>
                <Route index element={<MeetingView />} />
                <Route path="present" element={<MeetingPresent />} />
                <Route path="record" element={<MeetingRecord />} />
              </Route>
            </>
          )}
          <Route path="invite" element={<Invite />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
