// src/components/SplashScreen.tsx
import React from 'react';
import { motion } from 'framer-motion';
import './SplashScreen.css';

interface SplashScreenProps {
  onEnd: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onEnd }) => {
  return (
    <div className="splash-screen">
      <motion.img
        src="/logosplashscreen.png"
        alt="Logo"
        initial={{ scale: 1, rotate: 0, opacity: 1 }}
        animate={{ scale: 8, rotate: 360, opacity: 0 }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
        onAnimationComplete={onEnd}
        className="splash-logo"
      />
    </div>
  );
};

export default SplashScreen;
