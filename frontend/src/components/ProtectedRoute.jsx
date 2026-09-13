import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Só deixa passar quem está autenticado.
// Primeiro acesso (sem senha-mestra) vai para a configuração inicial.
function ProtectedRoute() {
  const { carregando, autenticado, precisaSetup } = useAuth();

  if (carregando) {
    return <p className="carregando">Carregando…</p>;
  }

  if (precisaSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
