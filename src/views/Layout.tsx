import { Outlet } from "react-router-dom";
import { Header } from "../ui/Header";

export const Layout = () => {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  );
};
