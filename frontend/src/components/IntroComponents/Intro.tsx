import React from "react";
import { Container, Title, Text } from "@mantine/core";
import { motion } from "framer-motion";

interface IntroProps {
  title: string;
  subtitle?: string;
}

const Intro: React.FC<IntroProps> = ({ title, subtitle }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      viewport={{ once: true }}
      style={{ padding: "56px 0" }}

    >
      <Container size="md" style={{ textAlign: "center" }}>
        <Title
          order={1}
          tt="uppercase"
          fw={900}
          style={{
            color: "white",
            letterSpacing: "0.04em",
            textShadow: "0 0 10px rgb(238, 198, 18)",
            marginBottom: 12,
          }}
        >
          {title}
        </Title>

        {subtitle && (
          <Text
            c="dimmed"
            size="lg"
            style={{
              maxWidth: 720,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </Text>
        )}
      </Container>
    </motion.section>
  );
};

export default React.memo(Intro);
