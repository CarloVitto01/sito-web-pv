import styles from './DescriptionSection.module.css';

const DescriptionSection: React.FC = () => (
  <section className={styles.container}>
    <h1 className={styles.title}>Diamo forma ai tuoi contenuti</h1>
    <p className={styles.text}>
      Che sia carta, codice o creatività, rendiamo unici i tuoi progetti.
    </p>
  </section>
);
export default DescriptionSection;
