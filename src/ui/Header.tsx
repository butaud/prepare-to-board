import { useAccount, useIsAuthenticated } from "jazz-react";
import "./Header.css";
import { Link } from "react-router-dom";

export const Header = () => {
  const { me, logOut } = useAccount();

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
              <Link to="/">{isAuthenticated ? "Home" : "Welcome"}</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
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
