import { createContext, useContext, useEffect, useState } from "react";
import { apiAuth } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [estado, setEstado] = useState({
    carregando: true,
    autenticado: false,
    precisaSetup: false,
  });

  useEffect(() => {
    apiAuth
      .status()
      .then((dados) =>
        setEstado({
          carregando: false,
          autenticado: dados.autenticado,
          precisaSetup: dados.precisaSetup,
        }),
      )
      .catch(() =>
        setEstado({
          carregando: false,
          autenticado: false,
          precisaSetup: false,
        }),
      );
  }, []);

  async function login(senha) {
    const dados = await apiAuth.login(senha);

    setEstado({
      carregando: false,
      autenticado: true,
      precisaSetup: false,
    });

    return dados;
  }

  async function setup(senha) {
    const dados = await apiAuth.setup(senha);

    return dados;
  }

  async function logout() {
    try {
      await apiAuth.logout();
    } finally {
      setEstado({
        carregando: false,
        autenticado: false,
        precisaSetup: false,
      });
    }
  }

  return (
    <AuthContext.Provider value={{ ...estado, login, setup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hooks de contexto no mesmo arquivo do provider é o padrão do React;
// desativado apenas o aviso de fast refresh (não afeta o build).
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
