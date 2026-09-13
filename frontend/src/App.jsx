import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/header/Header.jsx";
import Sidebar from "./components/sidebar/Sidebar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Setup from "./pages/Setup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Alunos from "./pages/Alunos.jsx";
import Instrutores from "./pages/Instrutores.jsx";
import Agendamentos from "./pages/Agendamentos.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";
import "./App.css";

// Layout das páginas internas (sidebar + header + conteúdo)
function PaginaLayout({ children }) {
  return (
    <div className="app">
      <Sidebar />

      <div className="content">
        <Header />

        <main>{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Setup />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <PaginaLayout>
              <Dashboard />
            </PaginaLayout>
          }
        />
        <Route
          path="/alunos"
          element={
            <PaginaLayout>
              <Alunos />
            </PaginaLayout>
          }
        />
        <Route
          path="/instrutores"
          element={
            <PaginaLayout>
              <Instrutores />
            </PaginaLayout>
          }
        />
        <Route
          path="/agendamentos"
          element={
            <PaginaLayout>
              <Agendamentos />
            </PaginaLayout>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <PaginaLayout>
              <Configuracoes />
            </PaginaLayout>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
