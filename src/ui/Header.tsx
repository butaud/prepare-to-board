import { useIsAuthenticated } from "jazz-tools/react";
import { NavLink } from "react-router-dom";
import { CgFileDocument } from "react-icons/cg";
import { LuCalendarDays, LuListChecks, LuSettings2 } from "react-icons/lu";
import { LiaUsersCogSolid, LiaUsersSolid } from "react-icons/lia";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Settings } from "../views/Settings";
import {
  LoadedAccountContext,
  useLoadAccount,
  useLoadedAccount,
} from "../hooks/Account";

export const Header = () => {
  const { me } = useLoadAccount();

  const isAuthenticated = useIsAuthenticated() && !!me;

  if (me === undefined) {
    return <p>Loading...</p>;
  }

  const isAdmin =
    isAuthenticated &&
    me.root.selectedOrganization &&
    me.canAdmin(me.root.selectedOrganization);

  return (
    <header>
      <nav>
        <ul>
          <li>
            <NavLink to="/">
              <img src={import.meta.env.BASE_URL + "logo.png"} alt="Logo" />
            </NavLink>
          </li>
          <li>
            <h3>
              <NavLink to="/">Prepare To Board</NavLink>
            </h3>
          </li>
          {isAuthenticated && (
            <>
              <li>
                <NavLink to="/meetings">
                  <CgFileDocument />
                  <span>Meetings</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/action-items">
                  <LuListChecks />
                  <span>Action Items</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/calendar">
                  <LuCalendarDays />
                  <span>Calendar</span>
                </NavLink>
              </li>
              <li>
                {isAdmin ? (
                  <NavLink to="/manage">
                    <LiaUsersCogSolid />
                    <span>Manage</span>
                  </NavLink>
                ) : (
                  <NavLink to="/members">
                    <LiaUsersSolid />
                    <span>Members</span>
                  </NavLink>
                )}
              </li>
            </>
          )}
        </ul>
        <ul>
          {isAuthenticated ? (
            <LoadedAccountContext.Provider value={me}>
              <li>
                <OrganizationSelector />
              </li>
              <li>
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
              </li>
            </LoadedAccountContext.Provider>
          ) : (
            <li>
              <SignInButton />
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

const OrganizationSelector = () => {
  const me = useLoadedAccount();
  const organizations = me.root.organizations;
  const selectedOrganization = me.root.selectedOrganization;

  if (organizations.length === 0) {
    return null;
  }

  const handleOrganizationChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    void (async () => {
      const selectedId = event.target.value;
      const selectedOrg = await organizations
        .find((org) => org?.id === selectedId)
        ?.ensureLoaded({
          resolve: {
            meetings: { $each: true },
          },
        });
      if (selectedOrg) {
        me.root.selectedOrganization = selectedOrg;
      }
    })();
  };

  return (
    <select
      aria-label="Organization"
      id="organization-select"
      value={selectedOrganization?.id || ""}
      onChange={handleOrganizationChange}
    >
      {organizations.map((org) => (
        <option key={org?.id ?? "<empty>"} value={org?.id}>
          {org?.name}
        </option>
      ))}
    </select>
  );
};
