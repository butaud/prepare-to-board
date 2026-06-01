import "./Header.css";
import { NavLink } from "react-router-dom";
import { CgFileDocument } from "react-icons/cg";
import { LuCalendarDays, LuListChecks, LuSettings2 } from "react-icons/lu";
import { LiaUsersCogSolid, LiaUsersSolid } from "react-icons/lia";
import { MdOutlineScience } from "react-icons/md";
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { useConvexAuth, useMutation } from "convex/react";
import { Settings } from "../views/Settings";
import {
  LoadedAccountContext,
  useLoadAccount,
  useLoadedAccount,
} from "../hooks/Account";
import { UserAccount } from "../schema";
import { api } from "../convexClient";

const DevCreateMeetingButton = ({ me }: { me: UserAccount }) => {
  const createRandomMeeting = useMutation(api.app.createRandomMeeting);
  if (!import.meta.env.DEV) return null;
  const organizationId = me.root.selectedOrganization?.id;
  if (!organizationId) return null;
  return (
    <button
      className="dev-create-meeting"
      title="[DEV] Create random meeting"
      onClick={() => void createRandomMeeting({ organizationId })}
    >
      <MdOutlineScience />
    </button>
  );
};

export const Header = () => {
  const { me } = useLoadAccount();
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();

  const isAuthenticated = convexAuthenticated && !!me;

  if (!clerkLoaded || (isSignedIn && me === undefined)) {
    return <p>Loading...</p>;
  }

  const isAdmin =
    isAuthenticated &&
    me.root.selectedOrganization &&
    me.canAdmin(me.root.selectedOrganization);

  return (
    <header>
      <div className="start">
        <div className="brand">
          <NavLink to="/">
            <img src={import.meta.env.BASE_URL + "logo.png"} alt="Logo" />
          </NavLink>
          <h3>
            <NavLink to="/">Prepare To Board</NavLink>
          </h3>
        </div>
      </div>
      <nav>
        {isAuthenticated && (
          <>
            <NavLink to="/meetings">
              <CgFileDocument />
              <span className="name">Meetings</span>
            </NavLink>
            <NavLink to="/action-items">
              <LuListChecks />
              <span className="name">Action Items</span>
            </NavLink>
            <NavLink to="/calendar">
              <LuCalendarDays />
              <span className="name">Calendar</span>
            </NavLink>
            {isAdmin ? (
              <NavLink to="/manage">
                <LiaUsersCogSolid />
                <span className="name">Manage</span>
              </NavLink>
            ) : (
              <NavLink to="/members">
                <LiaUsersSolid />
                <span className="name">Members</span>
              </NavLink>
            )}
          </>
        )}
      </nav>
      <div className="end">
        {isAuthenticated && me.root.selectedOrganization && (
          <DevCreateMeetingButton me={me} />
        )}
        {isAuthenticated ? (
          <LoadedAccountContext.Provider value={me}>
            <OrganizationSelector />
            <UserButton>
              <UserButton.UserProfilePage
                label="App Settings"
                labelIcon={<LuSettings2 />}
                url="/settings"
              >
                <Settings />
              </UserButton.UserProfilePage>
              <UserButton.UserProfilePage label="account" />
              <UserButton.UserProfilePage label="security" />
            </UserButton>
          </LoadedAccountContext.Provider>
        ) : (
          <SignInButton />
        )}
      </div>
    </header>
  );
};

const OrganizationSelector = () => {
  const me = useLoadedAccount();
  const selectOrganization = useMutation(api.app.selectOrganization);
  const organizations = me.root.organizations;
  const selectedOrganization = me.root.selectedOrganization;

  if (organizations.length === 0) {
    return null;
  }

  const handleOrganizationChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    void selectOrganization({ organizationId: event.target.value });
  };

  return (
    <div className="organization-selector">
      <select
        aria-label="Organization"
        id="organization-select"
        value={selectedOrganization?.id || ""}
        onChange={handleOrganizationChange}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
};
