import styles from './DescriptionSection.module.css';

const DescriptionSection: React.FC = () => (
  <section className={styles.container}>
    <h1 className={styles.title}>
      Trasformiamo Idee in Immagini, Visioni in Realtà
    </h1>
    <p className={styles.text}>
      In Photo & Vision uniamo tecnica, passione e creatività per trasformare ogni progetto in un’esperienza visiva unica. 
      Che si tratti di uno scatto fotografico, di una stampa su misura o di una campagna digitale, curiamo ogni dettaglio 
      con precisione artigianale e visione artistica. Il nostro obiettivo è raccontare storie, emozionare, imprimere nella 
      memoria ciò che conta davvero. Dal concetto alla realizzazione, affianchiamo clienti e aziende dando forma concreta 
      alle loro idee. Perché ogni visione merita di essere vista.
    </p>
  </section>
);
export default DescriptionSection;
