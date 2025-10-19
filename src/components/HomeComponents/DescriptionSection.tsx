import styles from './DescriptionSection.module.css';

const DescriptionSection: React.FC = () => (
  <section className={styles.container}>
    <h1 className={styles.title}>
      Beyond the <span className={styles.gold}>Photo</span>, into the <span className={styles.gold}>Vision</span>
    </h1>
    <p className={styles.text}>
      Photo and Vision è il sito pensato per semplificarti la vita, offrendo servizi su misura per ogni esigenza visiva e creativa. Specializzato in stampe professionali nei formati A4 e A3, servizi fotografici e video, e molto altro ancora, Photo and Vision si rivolge a studenti, professionisti, aziende e privati che cercano qualità, velocità e comodità.
      Tutto il processo – dalla scelta del formato all’invio dei file, fino alla consegna – è completamente gestibile online, con un’interfaccia semplice e intuitiva.
      E non finisce qui: nuove funzionalità e servizi innovativi sono in arrivo per offrirti un’esperienza sempre più completa e personalizzata.
    </p>
  </section>
);

export default DescriptionSection;