import React from 'react';
import Header from '../HeaderComponents/Header';
import Footer from '../FooterComponents/Footer';
import DescriptionSection from './DescriptionSection';
import CardsSection from './CardsSection';
import AlternatingContentSection from './AlternatingContentSection';
import './Home.module.css';
import Banner from '../Banner/Banner';

// ⬇️ nuovo import
import PwaInstallBanner from '../PwaInstallBanner';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Header />
      <Banner />
      <DescriptionSection />

      {/* Banner sempre visibile sotto la descrizione */}
      <div style={{ padding: '0 16px', marginTop: '16px' }}>
        <PwaInstallBanner />
        {/* Oppure sticky in basso:
        <PwaInstallBanner sticky />
        */}
      </div>

      <CardsSection />
      <AlternatingContentSection />
      <Footer />
    </div>
  );
};

export default Home;
