import React, { useState } from "react";
import Card from "./Card";
import classes from "./ContainerCards.module.css";

interface propsContainer {
  title: string;
  components: any[];
  defaultValue: string;
}

const ContainerCards: React.FC<propsContainer> = ({ title, components, defaultValue }) => {
  const [selectedCard, setSelectedCard] = useState<string>(defaultValue);

  const handleCardClick = (title: string) => {
    setSelectedCard(title);
  };

  return (
    <div className={classes["container-cards"]}>
      <h1 className={classes["title"]}>{title}</h1>
      <div className={classes["container"]}>
        {components.map((component) => (
          <Card
            key={Math.round(Math.random() * 1000)}
            title={component.title}
            imageSrc={component.imageSrc}
            isSelected={selectedCard === component.title}
            onClick={() => handleCardClick(component.title)}
          />
        ))}
      </div>
    </div>
  );
};

export default ContainerCards;
