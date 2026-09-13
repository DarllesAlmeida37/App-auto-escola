import { createContext, useContext, useEffect, useState } from "react";

const TemaContext = createContext(null);

const CHAVE_TEMA = "autoescola:tema";

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => {
    const salvo = localStorage.getItem(CHAVE_TEMA);

    return salvo === "noite" ? "noite" : "dia";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-tema", tema);
    localStorage.setItem(CHAVE_TEMA, tema);
  }, [tema]);

  function alternarTema(novoTema) {
    setTema(novoTema);
  }

  return (
    <TemaContext.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

// Hooks de contexto no mesmo arquivo do provider é o padrão do React;
// desativado apenas o aviso de fast refresh (não afeta o build).
// eslint-disable-next-line react-refresh/only-export-components
export function useTema() {
  return useContext(TemaContext);
}
