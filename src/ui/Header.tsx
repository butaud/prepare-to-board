import { useAccount, useIsAuthenticated } from "jazz-react";
import "./Header.css";
import { NavLink } from "react-router-dom";

export const Header = () => {
  const { me, logOut } = useAccount();

  const isAdmin = me?.profile?.name.includes("foo");
  const isOfficer = me?.profile?.name.includes("bar");

  const isAuthenticated = useIsAuthenticated();

  const onLogOut = () => {
    logOut();
  };

  return (
    <header>
      <div className="start">
        <div className="brand">
          <img src="/logo.png" alt="Logo" />
          <h3>Prepare To Board</h3>
        </div>
        <nav>
          <ul>
            <li>
              <NavLink to="/">{isAuthenticated ? "Home" : "Welcome"}</NavLink>
            </li>
            {isAuthenticated && (
              <>
                <li>
                  <NavLink to="/action-items">Action Items</NavLink>
                </li>
                <li>
                  <NavLink to="/calendar">Annual Calendar</NavLink>
                </li>
              </>
            )}
            {(isAdmin || isOfficer) && (
              <li>
                <NavLink to="/settings">Settings</NavLink>
              </li>
            )}
            <li>
              <NavLink to="/about">About</NavLink>
            </li>
          </ul>
        </nav>
      </div>
      <div className="end">
        {isAuthenticated && (
          <>
            <h3>Hello, {me?.profile?.formalName}</h3>
            <OrganizationSelector />
            <button onClick={onLogOut}>Log out</button>
          </>
        )}
      </div>
    </header>
  );
};

const OrganizationSelector = () => {
  const { me } = useAccount();
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
        id="organization-select"
        value={selectedOrganization?.id || ""}
        onChange={handleOrganizationChange}
      >
        {organizations.map((org) => (
          <option key={org?.id} value={org?.id}>
            {org?.name}
          </option>
        ))}
      </select>
    </div>
  );
};
