import { Link } from 'react-router-dom';
import styles from './CardsSection.module.css';

const CardsSection: React.FC = () => (
  <section className={styles.container}>
    <div className={styles.grid}>
      <Link to="/printA4" className={styles.card}>A4</Link>
      <Link to="/printA3" className={styles.card}>A3</Link>
      <Link to="/3d" className={styles.card}>3D</Link>
      <Link to="/pdfPrint" className={styles.card}>PDF</Link>
    </div>
  </section>
);

export default CardsSection;
