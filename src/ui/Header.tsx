import { PasskeyAuthBasicUI, useAccount, useIsAuthenticated } from "jazz-react";
import "./Header.css";

export const Header = () => {
  const { me, logOut } = useAccount();

  const isAuthenticated = useIsAuthenticated();

  const onLogOut = () => {
    logOut();
  };

  if (isAuthenticated) {
    return (
      <header>
        <h1>Hello, {me?.profile?.name}</h1>
        <button onClick={onLogOut}>Log out</button>
      </header>
    );
  }
  return (
    <header>
      <h1>You're not logged in</h1>
      <PasskeyAuthBasicUI appName="Prepare to Board" />
    </header>
  );
};
