import { Link } from "react-router-dom";
import styles from "./style.module.css";

function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <h2>SERVIÇOS</h2>

      <nav>
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>

          <li>
            <Link to="/alunos">Alunos</Link>
          </li>

          <li>
            <Link to="/instrutores">Instrutores</Link>
          </li>

          <li>
            <Link to="/agendamentos">Agendamentos</Link>
          </li>
          <li>
            <Link to="/configuracoes">Configurações</Link>
          </li>
          <li>Veículos</li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
