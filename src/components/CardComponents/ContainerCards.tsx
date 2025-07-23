import React, { useState } from "react";
import Card from "./Card";
import classes from "./ContainerCards.module.css";
import { Card as CardType } from "../../types/Card"; // Adjust the import path as necessary

interface propsContainer {
  title: string;
  components: CardType[];
  defaultValue: string;
  onSendData: (value: string) => void;
}

const ContainerCards: React.FC<propsContainer> = ({
  title,
  components,
  defaultValue,
  onSendData,
}) => {
  const [selectedCard, setSelectedCard] = useState<string>(defaultValue);

  const handleCardClick = (title: string) => {
    setSelectedCard(title);
    onSendData(title);
  };

  return (
    <div className={classes["container-cards"]}>
      <div className={classes["container"]}>
        <div className={classes["subContainer"]}>
          <h2 className={classes.title}>{title}</h2>
        </div>
        <div className={classes["subContainer"]}>
          {components.map((component) => (
            <Card
              key={component.title}
              title={component.title}
              imageSrc={component.imageSrc}
              isSelected={selectedCard === component.title}
              onClick={handleCardClick.bind(null, component.title)}
              disabled={component.disabled} // Passa la proprietà disabled
              errorMessage={component.errorMessage}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default React.memo(ContainerCards);