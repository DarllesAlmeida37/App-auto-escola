import { createContext, useContext, useEffect, useState } from "react";
import { apiAuth } from "../services/api";

const AuthContext = createContext(null);

// Marcador que existe apenas enquanto a aba está aberta.
// Se o navegador restaurar o cookie sem uma aba viva, o login é encerrado.
const CHAVE_SESSAO_ABA = "autoescola:sessao-aba";

export function AuthProvider({ children }) {
  const [estado, setEstado] = useState({
    carregando: true,
    autenticado: false,
    precisaSetup: false,
  });

  useEffect(() => {
    apiAuth
      .status()
      .then((dados) => {
        const abaViva = sessionStorage.getItem(CHAVE_SESSAO_ABA) === "1";

        // Cookie válido sem aba viva (navegador fechado e reaberto):
        // encerra a sessão e volta para o login.
        if (dados.autenticado && !abaViva) {
          apiAuth.logout().finally(() =>
            setEstado({
              carregando: false,
              autenticado: false,
              precisaSetup: dados.precisaSetup,
            }),
          );

          return;
        }

        setEstado({
          carregando: false,
          autenticado: dados.autenticado,
          precisaSetup: dados.precisaSetup,
        });
      })
      .catch(() =>
        setEstado({
          carregando: false,
          autenticado: false,
          precisaSetup: false,
        }),
      );
  }, []);

  // Fechar a aba/página encerra a sessão no servidor (sendBeacon
  // sobrevive ao fechamento). O F5 (reload) mantém o usuário logado.
  useEffect(() => {
    function aoFecharPagina() {
      const navegacao = performance.getEntriesByType("navigation")[0];

      if (navegacao && navegacao.type === "reload") {
        return;
      }

      navigator.sendBeacon("/api/auth/logout");
    }

    if (estado.autenticado) {
      window.addEventListener("pagehide", aoFecharPagina);
    }

    return () => {
      window.removeEventListener("pagehide", aoFecharPagina);
    };
  }, [estado.autenticado]);

  async function login(senha) {
    const dados = await apiAuth.login(senha);

    sessionStorage.setItem(CHAVE_SESSAO_ABA, "1");

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
      sessionStorage.removeItem(CHAVE_SESSAO_ABA);

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
