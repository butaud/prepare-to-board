import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Home } from "./views/Home";
import { useConvexAuth } from "convex/react";
import { Welcome } from "./views/Welcome";
import { Layout } from "./views/Layout";
import { ActionItems } from "./views/ActionItems";
import { Invite } from "./views/Invite";
import { MeetingList } from "./views/meeting/MeetingList";
import { AuthenticatedShared } from "./views/AuthenticatedShared";
import { useEnsureCurrentUser, useLoadAccount } from "./hooks/Account";

// The larger pages are split out of the main bundle so the first screen has
// less JavaScript to download and parse. Their downloads are started right
// away (not when first visited), so opening a meeting link doesn't wait on
// an extra round trip after sign-in.
const loadMeetingPages = import("./views/meeting/pages");
const loadManage = import("./views/Manage");
const loadAnnualCycle = import("./views/AnnualCycle");
const MeetingShared = lazy(() => loadMeetingPages.then((m) => ({ default: m.MeetingShared })));
const MeetingView = lazy(() => loadMeetingPages.then((m) => ({ default: m.MeetingView })));
const MeetingPresent = lazy(() => loadMeetingPages.then((m) => ({ default: m.MeetingPresent })));
const MeetingMinutes = lazy(() => loadMeetingPages.then((m) => ({ default: m.MeetingMinutes })));
const Manage = lazy(() => loadManage.then((m) => ({ default: m.Manage })));
const AnnualCycle = lazy(() => loadAnnualCycle.then((m) => ({ default: m.AnnualCycle })));

function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { me } = useLoadAccount();
  useEnsureCurrentUser();

  const isAdmin =
    isAuthenticated &&
    me?.root?.selectedOrganization &&
    me.canAdmin(me.root.selectedOrganization);
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Until Clerk and Convex know whether you're signed in, show a
            neutral loading state rather than the signed-out Welcome page. */}
        {isLoading && (
          <>
            <Route index element={<p>Loading...</p>} />
            <Route path="*" element={<p>Loading...</p>} />
          </>
        )}
        {!isLoading && !isAuthenticated && <Route index element={<Welcome />} />}
        {!isLoading && isAuthenticated && (
          <Route element={<AuthenticatedShared />}>
            <Route index element={<Home />} />
            <Route path="meetings" element={<MeetingList />} />
            <Route path="action-items" element={<ActionItems />} />
            <Route path="annual-cycle" element={<AnnualCycle />} />
            {isAdmin && <Route path="manage" element={<Manage />} />}
            <Route path="members" element={<Manage />} />
            <Route path="meetings/:meetingId" element={<MeetingShared />}>
              <Route index element={<MeetingView />} />
              <Route path="present" element={<MeetingPresent />} />
              <Route path="minutes" element={<MeetingMinutes />} />
              <Route path="minutes/edit" element={<MeetingMinutes />} />
              <Route path="edit" element={<MeetingView />} />
            </Route>
          </Route>
        )}
        <Route path="invite" element={<Invite />} />
      </Route>
    </Routes>
  );
}

export default App;
