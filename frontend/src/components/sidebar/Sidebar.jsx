import { NavLink } from "react-router-dom";
import styles from "./style.module.css";
import {
  IconeCasa,
  IconeAlunos,
  IconeInstrutor,
  IconeCalendario,
  IconeEngrenagem,
} from "../Icones";

const opcoes = [
  { para: "/", fim: true, rotulo: "Início", icone: <IconeCasa tamanho={14} /> },
  { para: "/alunos", rotulo: "Alunos", icone: <IconeAlunos tamanho={14} /> },
  {
    para: "/instrutores",
    rotulo: "Instrutores",
    icone: <IconeInstrutor tamanho={14} />,
  },
  {
    para: "/agendamentos",
    rotulo: "Agendamentos",
    icone: <IconeCalendario tamanho={14} />,
  },
  {
    para: "/configuracoes",
    rotulo: "Configurações",
    icone: <IconeEngrenagem tamanho={14} />,
  },
];

function Sidebar() {
  function classeLink({ isActive }) {
    return isActive ? `${styles.link} ${styles.ativo}` : styles.link;
  }

  return (
    <aside className={styles.sidebar}>
      <h2>SERVIÇOS</h2>

      <nav>
        <ul>
          {opcoes.map(({ para, fim, rotulo, icone }) => (
            <li key={para}>
              <NavLink to={para} end={fim} className={classeLink}>
                <span className={styles.icone}>{icone}</span>
                <span className={styles.rotulo}>{rotulo}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
