import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function Home() {
  return <div style={{padding:'2rem', fontFamily:'sans-serif'}}>
    <h1>PFE Assistant ENSEM</h1>
    <p>Site en cours de deploiement...</p>
  </div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
