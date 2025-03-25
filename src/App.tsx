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

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { me } = useAccount();

  const isAdmin = me?.profile?.name.includes("foo");
  const isOfficer = me?.profile?.name.includes("bar");

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
              {(isOfficer || isAdmin) && (
                <Route path="settings" element={<Settings />} />
              )}
              <Route path="meeting/:meetingId" element={<Meeting />}>
                <Route index element={<MeetingView />} />
                <Route path="present" element={<MeetingPresent />} />
                <Route path="record" element={<MeetingRecord />} />
              </Route>
            </>
          )}
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
