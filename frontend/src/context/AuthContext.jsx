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

        // Aba fechada e reaberta: cookie restaurado, mas sem marcador
        // de aba viva e com a sessão marcada como "fechando" →
        // encerra a sessão de vez e volta para o login.
        if (dados.autenticado && !abaViva && dados.fechando) {
          apiAuth.logout().finally(() =>
            setEstado({
              carregando: false,
              autenticado: false,
              precisaSetup: dados.precisaSetup,
            }),
          );

          return;
        }

        // Registra esta aba como viva (sobrevive ao F5)
        if (dados.autenticado) {
          sessionStorage.setItem(CHAVE_SESSAO_ABA, "1");
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

  // Ao fechar a aba, marca a sessão como "fechando" no servidor
  // (sendBeacon sobrevive ao fechamento). Se o F5 recarregar a página,
  // a própria aba viva restaura a sessão nas próximas chamadas.
  useEffect(() => {
    function aoFecharPagina() {
      navigator.sendBeacon("/api/auth/fechar");
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
