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
            <h3>Hello, {me?.profile?.name}</h3>
            <button onClick={onLogOut}>Log out</button>
          </>
        )}
      </div>
    </header>
  );
};
