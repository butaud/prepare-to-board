import { BrowserRouter, Routes, Route } from "react-router-dom";
import { About } from "./views/About";
import { Home } from "./views/Home";
import { useIsAuthenticated } from "jazz-react";
import { Welcome } from "./views/Welcome";
import { Layout } from "./views/Layout";

function App() {
  const isAuthenticated = useIsAuthenticated();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {isAuthenticated && <Route index element={<Home />} />}
          {!isAuthenticated && <Route index element={<Welcome />} />}
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
