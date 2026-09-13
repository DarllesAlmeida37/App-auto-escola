import { NavLink } from "react-router-dom";
import styles from "./style.module.css";

function Sidebar() {
  function classeLink({ isActive }) {
    return isActive ? `${styles.link} ${styles.ativo}` : styles.link;
  }

  return (
    <aside className={styles.sidebar}>
      <h2>SERVIÇOS</h2>

      <nav>
        <ul>
          <li>
            <NavLink to="/" end className={classeLink}>
              Início
            </NavLink>
          </li>

          <li>
            <NavLink to="/alunos" className={classeLink}>
              Alunos
            </NavLink>
          </li>

          <li>
            <NavLink to="/instrutores" className={classeLink}>
              Instrutores
            </NavLink>
          </li>

          <li>
            <NavLink to="/agendamentos" className={classeLink}>
              Agendamentos
            </NavLink>
          </li>

          <li>
            <NavLink to="/configuracoes" className={classeLink}>
              Configurações
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
