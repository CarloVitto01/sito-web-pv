import React from 'react';
import styles from './AlternatingContentSection.module.css';

const rows = [
  {
    image: "https://www.fotoregali.com/img/static-images/compress/CON-TASCHE-20092022_15333.jpg",
    text: "Soluzioni fotografiche personalizzate per ogni occasione.",
  },
  {
    image: "https://stampadalweb.com/app/uploads/sites/2/2024/07/Creare-Locandine-Stampa-Dal-Web-02-1080x675.webp",
    text: "Design grafico moderno, elegante e d'impatto.",
  },
  {
    image: "https://cdn.repro-online.de/media/cms/DIN-A3-Druck/HP_A3Prints_250x200px_CMYK_90Proz.png",
    text: "Servizi Stampa A4 A3 3D.",
  },
];

const AlternatingContentSection: React.FC = () => (
  <section className={styles.container}>
    {rows.map((row, i) => (
      <div
        key={i}
        className={`${styles.row} ${i % 2 === 0 ? '' : styles.reverse}`}
      >
        <img src={row.image} alt="Section visual" className={styles.image} />
        <p className={styles.text}>{row.text}</p>
      </div>
    ))}
  </section>
);

export default AlternatingContentSection;
