import React, { useState } from 'react';
import classes from './Home.module.css';
import Header from './Header';
import Footer from './Footer';
import { motion } from 'framer-motion';
import { FaCamera, FaPenNib, FaCode } from 'react-icons/fa';

const Home: React.FC = () => {
  return (
    <div className={classes["page-container"]}>
      <Header />

      <motion.section
        className={classes["hero"]}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>DIAMO FORMA AI TUOI CONTENUTI</h1>
        <p>In stampa, in pixel, in emozione.</p>
        <a href="#servizi" className={classes["cta-button"]}>SCOPRI DI PIÙ</a>
      </motion.section>

      <motion.section
        id="servizi"
        className={classes["services"]}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2>Cosa Facciamo</h2>
        <div className={classes["service-grid"]}>
          <div>
            <FaCamera size={40} color="#DEB500" />
            <h3>Fotografia e Stampa</h3>
          </div>
          <div>
            <FaPenNib size={40} color="#DEB500" />
            <h3>Design Grafico</h3>
          </div>
          <div>
            <FaCode size={40} color="#DEB500" />
            <h3>Servizi Digitali</h3>
          </div>
        </div>
      </motion.section>

      <motion.section
        className={classes["projects"]}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2>I Nostri Progetti</h2>
        <div className={classes["project-grid"]}>
          <div>
            <img src="https://miro.medium.com/v2/resize:fit:1400/1*PdH-uHQPhQo7Eqfu8qXgtQ.png" alt="Stampa Creativa" />
            <p>Stampa Creativa</p>
          </div>
          <div>
            <img src="https://t3.ftcdn.net/jpg/04/73/02/64/360_F_473026422_k3XjtqTh0Br3Iw8IfhlB9c72n9dqi9n5.jpg" alt="Visual Design" />
            <p>Visual Design</p>
          </div>
          <div>
            <img src="https://s1-ecp.printplace.com/77/Custom%20Printing%20pdp%20image.jpg" alt="Esperienze Digitali" />
            <p>Esperienze Digitali</p>
          </div>
        </div>
      </motion.section>

      <motion.section
        className={classes["why-us"]}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2>Perché Noi</h2>
        <p><strong>Soluzioni su misura</strong>, tecnologia avanzata e una passione per l’eccellenza. <strong>Scopri</strong> cosa ci rende unici.</p>
      </motion.section>

      <Footer />
    </div>
  );
};

export default Home;
