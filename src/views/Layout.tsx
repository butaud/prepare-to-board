import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../ui/Header";

export const Layout = () => {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<p>Loading...</p>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
};
