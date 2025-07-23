import React from 'react';
import Header from '../HeaderComponents/Header';
import Footer from '../FooterComponents/Footer';
import DescriptionSection from './DescriptionSection';
import CardsSection from './CardsSection';
import AlternatingContentSection from './AlternatingContentSection';
import './Home.module.css';

import ImageCarousel from './ImageCarousel';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Header />
      <DescriptionSection />
      <ImageCarousel />
      <CardsSection />
      <AlternatingContentSection />
      <Footer />
    </div>
  );
};

export default Home;
