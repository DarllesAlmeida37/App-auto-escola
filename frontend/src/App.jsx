import { Routes, Route } from "react-router-dom";
import Header from "./components/header/Header.jsx";
import Sidebar from "./components/sidebar/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Alunos from "./pages/Alunos.jsx";
import Instrutores from "./pages/Instrutores.jsx";
import Agendamentos from "./pages/Agendamentos.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Sidebar />

      <div className="content">
        <Header />

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/instrutores" element={<Instrutores />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
