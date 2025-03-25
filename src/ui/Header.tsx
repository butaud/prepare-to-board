import { PasskeyAuthBasicUI, useAccount, useIsAuthenticated } from "jazz-react";
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
      <h3>Prepare To Board</h3>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </nav>
      <div>
        {isAuthenticated ? (
          <>
            <h1>Hello, {me?.profile?.name}</h1>
            <button onClick={onLogOut}>Log out</button>
          </>
        ) : (
          <PasskeyAuthBasicUI appName="Prepare to Board" />
        )}
      </div>
    </header>
  );
};
