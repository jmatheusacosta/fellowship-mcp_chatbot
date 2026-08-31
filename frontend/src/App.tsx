import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/chat" element={
        <div className="card">
          <h1>Chat em breve</h1>
          <p>Login bem-sucedido! Aguardando Passo 4...</p>
        </div>
      } />
    </Routes>
  );
}

export default App;
