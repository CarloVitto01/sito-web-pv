import React from 'react';
import styles from './AlternatingContentSection.module.css';
import stampante from '../../assets/images/stampante.png';
import grafica from '../../assets/images/grafica.png';
import fotografia from '../../assets/images/fotografia.png';

const rows = [
  {
    image: fotografia,
    text: "Soluzioni fotografiche su misura, pensate per rendere speciali i tuoi momenti e valorizzare ogni dettaglio.",
  },
  {
    image: grafica,
    text: "Design grafico professionale: moderno, elegante e studiato per catturare l’attenzione al primo sguardo.",
  },
  {
    image: stampante,
    text: "Stampa di alta qualità in formati A4 e A3, per risultati nitidi, professionali e sempre all’altezza delle aspettative.",
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
