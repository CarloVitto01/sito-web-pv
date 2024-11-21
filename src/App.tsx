import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import A4PagePrint from "./components/A4PagePrint";
import Home from "../src/components/Home";
import A3PagePrint from "./components/A3PagePrint";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/printA4" element={<A4PagePrint />} />
        <Route path="/printA3" element={<A3PagePrint />} />
      </Routes>
    </Router>
  );
};

export default App;