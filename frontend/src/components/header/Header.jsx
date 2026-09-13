import styles from "./styles.module.css";
import { useAuth } from "../../context/AuthContext";

function Header() {
  const { logout } = useAuth();

  return (
    <header className={styles.header}>
      <img className={styles.image} src="/logo.jpeg" alt="Logo Auto Escola" />

      <div className={styles.acoes}>
        <span className={styles.usuario}>Admin</span>

        <button className={styles.sair} type="button" onClick={logout}>
          Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
