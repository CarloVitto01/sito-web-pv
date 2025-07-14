import React from 'react';
import styles from './ComingSoon.module.css';
import { useNavigate } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.sideLogo}>
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
      </div>

      <div className={styles.sideLogo}>
        <img src="/logo_b.png" alt="Logo lato destro" />
      </div>
    </div>
  );
};

export default ComingSoon;
