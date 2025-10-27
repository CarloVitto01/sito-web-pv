import React from 'react';
import Header from '../HeaderComponents/Header';
import Footer from '../FooterComponents/Footer';
import DescriptionSection from './DescriptionSection';
import CardsSection from './CardsSection';
import AlternatingContentSection from './AlternatingContentSection';
import './Home.module.css';
import Banner from '../Banner/Banner';

// ⬇️ nuovo import
import PwaInstallButton from '../PwaInstallButton';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Header />
      <Banner />
      <DescriptionSection />

      <div style={{ padding: '0 16px', marginTop: '16px' }}>
  <div className="pv-install-surface">
    <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontWeight: 700 }}>Installa l’app Photo & Vision</div>
        <div style={{ opacity: .85, fontSize: 14 }}>Apertura a schermo intero e icona in Home.</div>
      </div>
      <PwaInstallButton label="Installa adesso" />
    </div>
  </div>
</div>

      <CardsSection />
      <AlternatingContentSection />
      <Footer />
    </div>
  );
};

export default Home;
