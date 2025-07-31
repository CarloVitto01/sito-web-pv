import React from 'react';
import styles from './ComingSoon.module.css';
import { useNavigate } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      {/* Logo mobile al centro sopra il titolo */}
      <div className={styles.mobileLogoTop}>
        <img src="/logo_b.png" alt="Logo sopra il titolo" />
      </div>

      {/* Logo laterale sinistro (solo desktop) */}
      <div className={styles.sideLogoLeft}>
        <img src="/logo_b.png" alt="Logo lato sinistro" />
      </div>

      <div className={styles.content}>
        <h1>Coming Soon</h1>
        <p>Stiamo lavorando duramente per portarvi qualcosa di straordinario.</p>
        <button
          type="button"
          className={styles.button}
          onClick={() => navigate('/')}
        >
          HOME
        </button>

        {/* Logo sotto il bottone solo mobile */}
        <div className={styles.mobileLogoBottom}>
          <img src="/logo_b.png" alt="Logo sotto il bottone" />
        </div>
      </div>

      {/* Logo laterale destro (solo desktop) */}
      <div className={styles.sideLogoRight}>
        <img src="/logo_b.png" alt="Logo lato destro" />
      </div>
    </div>
  );
};

export default ComingSoon;
