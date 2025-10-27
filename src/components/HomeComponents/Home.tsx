import React from 'react';
import Header from '../HeaderComponents/Header';
import Footer from '../FooterComponents/Footer';
import DescriptionSection from './DescriptionSection';
import CardsSection from './CardsSection';
import AlternatingContentSection from './AlternatingContentSection';
import './Home.module.css';
import Banner from '../Banner/Banner';
import PwaInstallGuide from '../PwaInstallGuide';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Header />
      <Banner />
      <DescriptionSection />

      {/* Guida install app */}
      <div style={{ padding: '0 16px', marginTop: '16px' }}>
        <PwaInstallGuide />
      </div>

      <CardsSection />
      <AlternatingContentSection />
      <Footer />
    </div>
  );
};

export default Home;
