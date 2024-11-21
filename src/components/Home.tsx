import React from 'react';
import classes from './Home.module.css';

const Home = () => {
  return (
    <div className={classes["home-container"]}>
      <header className={classes["header"]}>
        <h1>Welcome to Photo & Vision</h1>
        <p>Your one-stop solution for high-quality document printing.</p>
      </header>
      <section className={classes["description"]}>
        <h2>Our Services</h2>
        <p>
          We offer a variety of printing options to meet your needs. Whether you need black and white or color prints, we ensure top-notch quality using 80 gsm A4 paper.
        </p>
        <p>
          Customize your print order easily using our online tool. Simply upload your PDF, choose your preferences, and place your order.
        </p>
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
      <section className={classes["cta"]}>
        <h2>Ready to Print?</h2>
        <p>Click the button below to proceed to the printing page and start your order.</p>
        <a href="/printA4">
          <button className={classes["start-button"]}>Go to PrintA4</button>
        </a>
        <a href="/printA3">
          <button className={classes["start-button"]}>Go to PrintA3</button>
        </a>
      </section>
    </div>
  );
};

export default Home;
