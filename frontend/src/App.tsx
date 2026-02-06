import Handlelog from './log/Handlelog'
import Handleregister from './log/Handleregister'
import { BrowserRouter, Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Handlelog />} />
        <Route path="/register" element={<Handleregister />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
