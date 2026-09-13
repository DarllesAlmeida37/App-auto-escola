import { useState } from "react";
import { useTema } from "../context/TemaContext";
import { useAuth } from "../context/AuthContext";
import { apiConfiguracoes } from "../services/api";

function Configuracoes() {
  const { tema, alternarTema } = useTema();
  const { logout } = useAuth();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");
  const [enviando, setEnviando] = useState(false);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);
  }

  async function handleCadastrarSenha(evento) {
    evento.preventDefault();

    if (novaSenha.length < 6) {
      mostrar("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmacao) {
      mostrar("As senhas não coincidem.");
      return;
    }

    if (senhaAdmin === "") {
      mostrar("Informe a senha do Administrador Geral.");
      return;
    }

    setEnviando(true);

    try {
      const dados = await apiConfiguracoes.cadastrarSenha({
        novaSenha,
        senhaAdmin,
      });

      mostrar(dados.mensagem, "sucesso");

      setNovaSenha("");
      setConfirmacao("");
      setSenhaAdmin("");
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h2>Configurações</h2>

      <div className="cartao">
        <h3>Tema</h3>

        <p className="texto-ajuda">
          Escolha a aparência do sistema: claro (Dia) ou escuro (Noite).
        </p>

        <div className="acoes-pagina">
          <button
            type="button"
            className={`botao ${tema === "dia" ? "botao-ativo" : ""}`}
            onClick={() => alternarTema("dia")}
          >
            ☀️ Dia
          </button>

          <button
            type="button"
            className={`botao ${tema === "noite" ? "botao-ativo" : ""}`}
            onClick={() => alternarTema("noite")}
          >
            🌙 Noite
          </button>
        </div>
      </div>

      <div className="cartao">
        <h3>Segurança</h3>

        <p className="texto-ajuda">
          Cadastre uma nova senha de acesso ao sistema. Para isso, é
          obrigatório informar a senha do <strong>Administrador Geral</strong>.
        </p>

        <form onSubmit={handleCadastrarSenha}>
          <div className="linha-campos">
            <label className="campo">
              <span>Nova senha</span>
              <input
                type="password"
                value={novaSenha}
                onChange={(evento) => setNovaSenha(evento.target.value)}
              />
            </label>

            <label className="campo">
              <span>Confirmar nova senha</span>
              <input
                type="password"
                value={confirmacao}
                onChange={(evento) => setConfirmacao(evento.target.value)}
              />
            </label>

            <label className="campo">
              <span>Senha do Administrador Geral</span>
              <input
                type="password"
                value={senhaAdmin}
                onChange={(evento) => setSenhaAdmin(evento.target.value)}
              />
            </label>
          </div>

          <button
            className="botao botao-primario"
            type="submit"
            disabled={enviando}
          >
            {enviando ? "Cadastrando…" : "Cadastrar senha"}
          </button>
        </form>

        {mensagem && (
          <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>
        )}
      </div>

      <div className="cartao">
        <h3>Sair do sistema</h3>

        <p className="texto-ajuda">
          Encerra a sessão atual e volta para a página de login.
        </p>

        <button className="botao botao-perigo" type="button" onClick={logout}>
          Sair
        </button>
      </div>
    </div>
  );
}

export default Configuracoes;
