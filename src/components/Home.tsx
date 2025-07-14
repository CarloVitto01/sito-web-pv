import React from 'react';
import Header from './Header';
import Footer from './Footer';
import DescriptionSection from './HomeComponents/DescriptionSection';
import CardsSection from './HomeComponents/CardsSection';
import NewsCarousel from './HomeComponents/NewsCarousel';
import AlternatingContentSection from './HomeComponents/AlternatingContentSection';
import './Home.module.css';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Header />
      <DescriptionSection />
      <CardsSection />
      <NewsCarousel />
      <AlternatingContentSection />
      <Footer />
    </div>
  );
};

export default Home;
