import { Link } from 'react-router-dom';
import styles from './CardsSection.module.css';

const CardsSection: React.FC = () => (
  <section className={styles.container}>
    <div className={styles.grid}>
      <Link to="/printA4" className={styles.card}>A4</Link>
      <Link to="/printA3" className={styles.card}>A3</Link>
      <Link to="/3d" className={styles.card}>3D</Link>
      <Link to="/richiesta-sito-web" className={styles.card}>Richiesta Sito Web</Link>
      <Link to="/contatti-servizi-foto-video" className={styles.card}>Contatti Servizi Foto/Video</Link>
       <Link to="/qrgen" className={styles.card}>Genera il tuo QR</Link>
      <Link to="/comingSoon" className={styles.card}>Coming Soon...</Link>
    </div>
  </section>
);

export default CardsSection;
