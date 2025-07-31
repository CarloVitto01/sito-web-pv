import React from "react";
import classes from "./Intro.module.css";
import { motion } from "framer-motion";

interface IntroProps {
  title: string;
  text: string;
}

const Intro: React.FC<IntroProps> = ({ title, text }) => {
  return (
    <motion.section
      className={classes["container"]}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <h1 className={classes["title"]}>{title}</h1>
      <p className={classes["text"]}>{text}</p>
    </motion.section>
  );
};

export default React.memo(Intro);