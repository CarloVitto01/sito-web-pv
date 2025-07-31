import React from 'react';
import styles from './AlternatingContentSection.module.css';
import stampante from '../../assets/images/stampante.png';
import grafica from '../../assets/images/grafica.png';
import fotografia from '../../assets/images/fotografia.png';

const rows = [
  {
    image: fotografia,
    text: "Catturiamo attimi che diventano ricordi. Scatti pensati per fermare emozioni, raccontare storie e dare valore ai tuoi momenti più importanti, con uno stile che rispecchia le tue necessità.",

  },
  {
    image: grafica,
    text: "Progettiamo concept visivi studiati per dare forza alla tua comunicazione. Un design pulito, essenziale e su misura che rende riconoscibile il tuo brand su qualsiasi supporto, digitale o cartaceo.",
  },
  {
    image: stampante,
    text: "Diamo forma alle tue idee attraverso soluzioni di stampa curate nei minimi dettagli. Materiali selezionati, finiture eleganti e un approccio su misura per trasformare ogni progetto in un prodotto che trasmetta stile e personalità.",
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
