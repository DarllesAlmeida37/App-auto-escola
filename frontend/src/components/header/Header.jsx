import styles from "./styles.module.css";

function Header() {
  return (
    <header className={styles.header}>
      <img
        className={styles.image}
        src="../src/assets/logo.jpeg"
        alt="Logo Auto Escola"
      />
      <h3>SISTEMA DE AGENDAMENTO</h3>
    </header>
  );
}

export default Header;
