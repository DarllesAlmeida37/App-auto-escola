import { useState } from "react";
import { useTema } from "../context/TemaContext";
import { useAuth } from "../context/AuthContext";
import { apiAuth, apiConfiguracoes } from "../services/api";
import ConfirmacaoModal from "../components/ConfirmacaoModal";
import { IconeSol, IconeLua, IconeCadeado } from "../components/Icones";

function Configuracoes() {
  const { tema, alternarTema } = useTema();
  const { logout } = useAuth();

  // -------------------------------------------------------------
  // Acesso à área de Segurança (senha de acesso do usuário)
  // -------------------------------------------------------------
  const [segurancaExpandida, setSegurancaExpandida] = useState(false);
  const [segurancaAberta, setSegurancaAberta] = useState(false);
  const [senhaAcesso, setSenhaAcesso] = useState("");
  const [desbloqueando, setDesbloqueando] = useState(false);

  // Cadastro de nova senha
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");

  // Exclusão de senha
  const [senhaExcluir, setSenhaExcluir] = useState("");
  const [senhaAdminExcluir, setSenhaAdminExcluir] = useState("");

  // Mensagens e confirmação
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");
  const [confirmacaoAcao, setConfirmacaoAcao] = useState(null); // "criar" | "excluir" | null
  const [enviando, setEnviando] = useState(false);

  function mostrar(mensagemTexto, tipo = "erro") {
    setMensagem(mensagemTexto);
    setTipoMensagem(tipo);

    setTimeout(() => {
      setMensagem("");
    }, 3000);
  }

  // -------------------------------------------------------------
  // Desbloqueio da área de Segurança
  // -------------------------------------------------------------

  async function handleDesbloquear(evento) {
    evento.preventDefault();

    if (senhaAcesso === "") {
      mostrar("Informe a sua senha de acesso.");
      return;
    }

    setDesbloqueando(true);

    try {
      await apiAuth.verificar(senhaAcesso);

      setSegurancaAberta(true);
      setSenhaAcesso("");
      setMensagem("");
    } catch (erro) {
      mostrar(erro.message);
      setSenhaAcesso("");
    } finally {
      setDesbloqueando(false);
    }
  }

  function fecharSeguranca() {
    setSegurancaAberta(false);
    setSegurancaExpandida(false);
    setMensagem("");
    setNovaSenha("");
    setConfirmacao("");
    setSenhaAdmin("");
    setSenhaExcluir("");
    setSenhaAdminExcluir("");
  }

  // -------------------------------------------------------------
  // Cadastro de nova senha (com confirmação)
  // -------------------------------------------------------------

  function handleCriarSenha(evento) {
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

    setConfirmacaoAcao("criar");
  }

  // -------------------------------------------------------------
  // Exclusão de senha (com confirmação)
  // -------------------------------------------------------------

  function handleExcluirSenha(evento) {
    evento.preventDefault();

    if (senhaExcluir === "") {
      mostrar("Informe a senha que deseja excluir.");
      return;
    }

    if (senhaAdminExcluir === "") {
      mostrar("Informe a senha do Administrador Geral.");
      return;
    }

    setConfirmacaoAcao("excluir");
  }

  async function executarAcao() {
    setEnviando(true);

    try {
      let dados;

      if (confirmacaoAcao === "criar") {
        dados = await apiConfiguracoes.cadastrarSenha({
          novaSenha,
          senhaAdmin,
        });

        setNovaSenha("");
        setConfirmacao("");
        setSenhaAdmin("");
      } else if (confirmacaoAcao === "excluir") {
        dados = await apiConfiguracoes.excluirSenha({
          senhaExcluir,
          senhaAdmin: senhaAdminExcluir,
        });

        setSenhaExcluir("");
        setSenhaAdminExcluir("");
      }

      mostrar(dados.mensagem, "sucesso");
    } catch (erro) {
      mostrar(erro.message);
    } finally {
      setEnviando(false);
      setConfirmacaoAcao(null);
    }
  }

  // -------------------------------------------------------------
  // Renderização da área de Segurança
  // -------------------------------------------------------------

  function renderDesbloqueio() {
    return (
      <div className="conteudo-expansivel">
        <p className="texto-ajuda">
          Esta é uma área protegida. Digite a sua{" "}
          <strong>senha de acesso</strong> para abrir as opções de segurança.
        </p>

        <form onSubmit={handleDesbloquear}>
          <div className="linha-campos">
            <label className="campo campo-seguranca">
              <span>Senha de acesso</span>
              <input
                type="password"
                value={senhaAcesso}
                onChange={(evento) => setSenhaAcesso(evento.target.value)}
              />
            </label>
          </div>

          <button
            className="botao botao-primario"
            type="submit"
            disabled={desbloqueando}
          >
            {desbloqueando ? "Verificando…" : "Acessar"}
          </button>
        </form>

        {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}
      </div>
    );
  }

  function renderAreaSeguranca() {
    return (
      <div className="conteudo-expansivel">
        <p className="texto-ajuda">
          Área de segurança desbloqueada. Aqui você pode{" "}
          <strong>cadastrar</strong> ou <strong>excluir</strong> senhas de
          acesso. As duas ações exigem a senha do{" "}
          <strong>Administrador Geral</strong>.
        </p>

        {/* ---------------- Cadastrar nova senha ---------------- */}

        <h3>Cadastrar nova senha</h3>

        <form onSubmit={handleCriarSenha}>
          <div className="linha-campos">
            <label className="campo campo-seguranca">
              <span>Nova senha</span>
              <input
                type="password"
                value={novaSenha}
                onChange={(evento) => setNovaSenha(evento.target.value)}
              />
            </label>

            <label className="campo campo-seguranca">
              <span>Confirmar nova senha</span>
              <input
                type="password"
                value={confirmacao}
                onChange={(evento) => setConfirmacao(evento.target.value)}
              />
            </label>

            <label className="campo campo-seguranca">
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

        <div className="divisor" />

        {/* ---------------- Excluir senha ---------------- */}

        <h3>Excluir senha</h3>

        <form onSubmit={handleExcluirSenha}>
          <div className="linha-campos">
            <label className="campo campo-seguranca">
              <span>Senha que deseja excluir</span>
              <input
                type="password"
                value={senhaExcluir}
                onChange={(evento) => setSenhaExcluir(evento.target.value)}
              />
            </label>

            <label className="campo campo-seguranca">
              <span>Senha do Administrador Geral</span>
              <input
                type="password"
                value={senhaAdminExcluir}
                onChange={(evento) => setSenhaAdminExcluir(evento.target.value)}
              />
            </label>
          </div>

          <button
            className="botao botao-perigo"
            type="submit"
            disabled={enviando}
          >
            {enviando ? "Excluindo…" : "Excluir senha"}
          </button>
        </form>

        {mensagem && <p className={`mensagem ${tipoMensagem}`}>{mensagem}</p>}

        <div className="divisor" />

        <button className="botao" type="button" onClick={fecharSeguranca}>
          Fechar área de segurança
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Configurações</h2>

      <div className="cartao">
        <h3>Tema</h3>

        <p className="texto-ajuda">
          Escolha a aparência do sistema: claro (Dia) ou escuro (Noite).
        </p>

        <div className="botoes-tema">
          <button
            type="button"
            className={`botao-tema ${tema === "dia" ? "ativo" : ""}`}
            onClick={() => alternarTema("dia")}
          >
            <IconeSol tamanho={17} />
            Dia
          </button>

          <button
            type="button"
            className={`botao-tema ${tema === "noite" ? "ativo" : ""}`}
            onClick={() => alternarTema("noite")}
          >
            <IconeLua tamanho={17} />
            Noite
          </button>
        </div>
      </div>

      <div className="cartao">
        <button
          type="button"
          className="botao-expansivel botao-expansivel-seguranca"
          onClick={() => {
            if (segurancaAberta) {
              fecharSeguranca();
            } else {
              setSegurancaExpandida(!segurancaExpandida);
            }
          }}
        >
          <span className="rotulo-botao">
            <IconeCadeado tamanho={20} />
            Segurança
          </span>
          <span>{segurancaExpandida ? "▲" : "▼"}</span>
        </button>

        {segurancaExpandida && !segurancaAberta && renderDesbloqueio()}

        {segurancaExpandida && segurancaAberta && renderAreaSeguranca()}
      </div>

      <div className="cartao">
        <h3>Sair do sistema</h3>

        <p className="texto-ajuda">
          Encerrar sessão e voltar para a página de login.
        </p>

        <button className="botao botao-perigo" type="button" onClick={logout}>
          Sair
        </button>
      </div>

      <ConfirmacaoModal
        aberto={Boolean(confirmacaoAcao)}
        titulo={
          confirmacaoAcao === "criar" ? "Cadastrar nova senha" : "Excluir senha"
        }
        mensagem={
          confirmacaoAcao === "criar"
            ? "Confirma o cadastro desta nova senha de acesso ao sistema?"
            : "Confirma a exclusão desta senha? Ela deixará de funcionar para fazer login."
        }
        rotuloConfirmar={
          confirmacaoAcao === "criar" ? "Sim, cadastrar" : "Sim, excluir"
        }
        onConfirmar={executarAcao}
        onCancelar={() => setConfirmacaoAcao(null)}
      />
    </div>
  );
}

export default Configuracoes;
