import Slider from 'react-slick';
import classes from './Home.module.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Header from './Header';
import Footer from './Footer';

const Home = () => {

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
  };

  return (
    <div className="container">
      

      <Header />

      <div className={classes["home-container"]}>
        <header className={classes["home-header"]}>
          <h1>Benvenuto su Photo&Vision</h1>
          <p>Scopri stampe di alta qualità per ogni occasione</p>
        </header>

        <div className={classes["slider-container"]}>
          <Slider {...sliderSettings}>
            <div className={classes["slide"]}>
              <img src="https://miro.medium.com/v2/resize:fit:1400/1*PdH-uHQPhQo7Eqfu8qXgtQ.png" alt="Service 1" />
            </div>
            <div className={classes["slide"]}>
              <img src="https://t3.ftcdn.net/jpg/04/73/02/64/360_F_473026422_k3XjtqTh0Br3Iw8IfhlB9c72n9dqi9n5.jpg" alt="Service 2" />
            </div>
            <div className={classes["slide"]}>
              <img src="https://s1-ecp.printplace.com/77/Custom%20Printing%20pdp%20image.jpg" alt="Service 3" />
            </div>
          </Slider>
        </div>

        <div className={classes["cta-section"]}>
          <p>Per maggiori informazioni:</p>
          <div className={classes["cta-buttons"]}>
            <a href="mailto:pv.photoandvision@gmail.com" className={classes["cta-button"]}>Email</a>
            <a href="tel:+393791780539" className={classes["cta-button"]}>Chiama Ora</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Home;