import { useState } from 'react';
import styles from './NewsCarousel.module.css';

const news = [
  "In arrivo il nuovo catalogo 2025!",
  "Vincitori del premio Visual Art 2024",
  "Nuovo servizio: stampa su grande formato",
];

const NewsCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);
  const nextNews = () => setIndex((prev) => (prev + 1) % news.length);

  return (
    <section className={styles.container} onClick={nextNews}>
      <p className={styles.text}>{news[index]}</p>
    </section>
  );
};

export default NewsCarousel;
