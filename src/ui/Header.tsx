import { useAccount, useIsAuthenticated } from "jazz-tools/react";
import "./Header.css";
import { NavLink } from "react-router-dom";
import { CgFileDocument } from "react-icons/cg";
import { LuCalendarDays, LuListChecks, LuSettings2 } from "react-icons/lu";
import { LiaUsersCogSolid, LiaUsersSolid } from "react-icons/lia";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Settings } from "../views/Settings";
import { Schema } from "../schema";

export const Header = () => {
  const { me } = useAccount(Schema.UserAccount, {
    resolve: {
      root: {
        selectedOrganization: true,
      },
    },
  });

  const isAuthenticated = useIsAuthenticated();

  const isAdmin =
    isAuthenticated &&
    me?.root?.selectedOrganization &&
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
        {isAuthenticated ? (
          <>
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
          </>
        ) : (
          <SignInButton />
        )}
      </div>
    </header>
  );
};

const OrganizationSelector = () => {
  const { me } = useAccount(Schema.UserAccount);
  const organizations = me?.root?.organizations;
  const selectedOrganization = me?.root?.selectedOrganization;

  if (!me?.root || !organizations || organizations.length === 0) {
    return null;
  }

  const handleOrganizationChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (!me.root) {
      return;
    }

    const selectedId = event.target.value;
    const selectedOrg = organizations.find((org) => org?.id === selectedId);
    if (selectedOrg) {
      me.root.selectedOrganization = selectedOrg;
    }
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
          <option key={org?.id ?? "<empty>"} value={org?.id}>
            {org?.name}
          </option>
        ))}
      </select>
    </div>
  );
};
