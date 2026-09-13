import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Configuração inicial: aparece uma única vez, no primeiro acesso,
// para definir a senha do Administrador Geral.
function Setup() {
  const { setup, carregando, precisaSetup } = useAuth();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const navegar = useNavigate();

  if (!carregando && !precisaSetup && !concluido) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(evento) {
    evento.preventDefault();

    if (senha.length < 6) {
      setMensagem("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      setMensagem("As senhas não coincidem.");
      return;
    }

    setEnviando(true);

    try {
      await setup(senha);
      setConcluido(true);
    } catch (erro) {
      setMensagem(erro.message);
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <div className="login-pagina">
        <div className="login-cartao">
          <h2>Configuração concluída!</h2>

          <p>
            A senha do Administrador Geral foi criada com sucesso. Ela também é
            a sua primeira senha de acesso ao sistema.
          </p>

          <button
            className="botao botao-primario"
            type="button"
            onClick={() => navegar("/login")}
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-pagina">
      <form className="login-cartao" onSubmit={handleSubmit}>
        <img className="login-logo" src="/logo.jpeg" alt="Logo Auto Escola" />

        <h2>Configuração inicial</h2>

        <p className="texto-ajuda">
          Defina a senha do <strong>Administrador Geral</strong>. Ela será
          exigida para cadastrar novas senhas de acesso na área de Segurança.
        </p>

        <label className="campo">
          <span>Senha do Administrador Geral</span>
          <input
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            autoFocus
          />
        </label>

        <label className="campo">
          <span>Confirmar senha</span>
          <input
            type="password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
          />
        </label>

        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Criar senha"}
        </button>

        {mensagem && <p className="mensagem erro">{mensagem}</p>}
      </form>
    </div>
  );
}

export default Setup;
