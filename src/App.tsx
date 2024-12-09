
import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  NavigationType,
  Location,
  useNavigationType,
  useLocation,
} from 'react-router-dom';
import A4PagePrint from './components/A4PagePrint';
import Home from '../src/components/Home';
import A3PagePrint from './components/A3PagePrint';

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop /> {/* Add the ScrollToTop component */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/printA4" element={<A4PagePrint />} />
        <Route path="/printA3" element={<A3PagePrint />} />
      </Routes>
    </Router>
  );
};

const ScrollToTop: React.FC = () => {
  const navigationType: NavigationType = useNavigationType();
  const location: Location = useLocation();

  useEffect(() => {
    if (navigationType === 'POP') {
      window.scrollTo(0, 0);
    }
  }, [navigationType, location]);

  return null;
};

export default App;