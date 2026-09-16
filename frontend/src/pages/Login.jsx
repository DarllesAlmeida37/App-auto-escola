import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { login, carregando, autenticado, precisaSetup } = useAuth();
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!carregando && autenticado) {
    return <Navigate to="/" replace />;
  }

  if (!carregando && precisaSetup) {
    return <Navigate to="/setup" replace />;
  }

  async function handleSubmit(evento) {
    evento.preventDefault();

    if (senha === "") {
      setMensagem("Informe a senha.");
      return;
    }

    setEnviando(true);

    try {
      await login(senha);
    } catch (erro) {
      setMensagem(erro.message);
      setSenha("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-pagina">
      <form className="login-cartao" onSubmit={handleSubmit}>
        <img className="login-logo" src="/logo.png" alt="Logo Auto Escola" />

        <h2>Sistema de Agendamento</h2>

        <label className="campo">
          <span>Login</span>
          <input type="text" value="Admin" readOnly />
        </label>

        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            autoFocus
          />
        </label>

        <button
          className="botao botao-primario"
          type="submit"
          disabled={enviando}
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>

        {mensagem && <p className="mensagem erro">{mensagem}</p>}
      </form>
    </div>
  );
}

export default Login;
