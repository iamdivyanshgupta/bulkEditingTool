import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Upload from "./pages/Upload";
import Edit from "./pages/Edit";
import Export from "./pages/Export";

function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: "flex", gap: "1rem", padding: "1rem" }}>
        <Link to="/upload">Upload</Link>
        <Link to="/edit">Edit</Link>
        <Link to="/export">Export</Link>
      </nav>

      <Routes>
        <Route path="/upload" element={<Upload />} />
        <Route path="/edit" element={<Edit />} />
        <Route path="/export" element={<Export />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
