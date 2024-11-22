import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import classes from './Home.module.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { FiMenu } from "react-icons/fi";
import Header from './Header';
import Footer from './Footer';

const Home = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true, // Abilitato lo scorrimento automatico
    autoplaySpeed: 4000, // Tempo tra gli scorrimenti
  };

  return (
    <div className="container">
      <div style={{ margin: "20px", backgroundColor: "none" }}>
        <Link to="/">
          <button className={classes["menu-button-home"]}>
            <FiMenu onClick={toggleMenu} />
          </button>
          {/* Side Menu */}
          {isMenuOpen && (
            <nav className={classes["side-menu"]}>
              <button className={classes["close-button"]} onClick={toggleMenu}>✖</button>
              <ul>
                <Link to="/printA4" className={classes['link-menu']}><li>Print A4</li></Link>
                <Link to="/printA3" className={classes['link-menu']}><li>Print A3</li></Link>
                <Link to="/services" className={classes['link-menu']}><li>Services</li></Link>
                <Link to="/contact" className={classes['link-menu']}><li>Contact Us</li></Link>
              </ul>
            </nav>
          )}
        </Link>
      </div>
      <Header />
      <div className={classes["home-container"]}>
        <div className={classes["description-home"]}>
          <section className={classes["how-to"]}>
            <h2>How It Works</h2>
            <ol>
              <li>Fill in your personal details.</li>
              <li>Upload your PDF document.</li>
              <li>Select your color and layout preferences.</li>
              <li>Confirm your order and proceed to payment.</li>
            </ol>
          </section><section className={classes["how-to"]}>
            <h2>How It Works</h2>
            <ol>
              <li>Fill in your personal details.</li>
              <li>Upload your PDF document.</li>
              <li>Select your color and layout preferences.</li>
              <li>Confirm your order and proceed to payment.</li>
            </ol>
          </section>
        </div>

        <div className={classes["slide-carosell"]}>
          <Slider {...sliderSettings}>
            <div className={classes["slide"]}>
              <img src="https://miro.medium.com/v2/resize:fit:1400/1*PdH-uHQPhQo7Eqfu8qXgtQ.png" alt="Service 1" />
              <h3>High-Quality Prints</h3>
            </div>
            <div className={classes["slide"]}>
              <img src="https://t3.ftcdn.net/jpg/04/73/02/64/360_F_473026422_k3XjtqTh0Br3Iw8IfhlB9c72n9dqi9n5.jpg" alt="Service 2" />
              <h3>Fast Delivery</h3>
            </div>
            <div className={classes["slide"]}>
              <img src="https://s1-ecp.printplace.com/77/Custom%20Printing%20pdp%20image.jpg" alt="Service 3" />
              <h3>Custom Options</h3>
            </div>
          </Slider>
        </div>
        
        <section className={classes["description"]}>
          <h2>Our Services</h2>
          <p>We offer a variety of printing options to meet your needs.</p>
        </section>

        <section className={classes["how-to"]}>
          <h2>How It Works</h2>
          <ol>
            <li>Fill in your personal details.</li>
            <li>Upload your PDF document.</li>
            <li>Select your color and layout preferences.</li>
            <li>Confirm your order and proceed to payment.</li>
          </ol>
        </section>
        <section className={classes["how-to"]}>
          <h2>How It Works</h2>
          <ol>
            <li>Fill in your personal details.</li>
            <li>Upload your PDF document.</li>
            <li>Select your color and layout preferences.</li>
            <li>Confirm your order and proceed to payment.</li>
          </ol>
        </section>

      </div>
      <Footer />
    </div>
  );
};

export default Home;