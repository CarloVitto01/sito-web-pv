import React from "react";
import classes from "./Card.module.css";

interface CardProps {
  title: string;
  imageSrc: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean; // Aggiungi la proprietà disabled
  errorMessage?: string; // Aggiungi la proprietà errorMessage
}

const Card: React.FC<CardProps> = ({
  imageSrc,
  title,
  isSelected,
  onClick,
  disabled = false, // Imposta il valore predefinito a false
  errorMessage, // Aggiungi la proprietà errorMessage
}) => {
  const handleClick = (event: React.MouseEvent) => {
    if (disabled) {
      event.stopPropagation(); // Impedisci l'evento di propagarsi se disabilitato
    } else {
      onClick(); // Esegui onClick solo se non è disabilitato
    }
  };

  return (
    <div className={classes["rectangle"]} tabIndex={1}>
      <div
        className={`${classes["box-img"]} ${
          isSelected ? classes["selected"] : ""
        } ${disabled ? classes["disabled"] : ""}`} // Aggiungi classe per disabilitato
        onClick={handleClick}
      >
        <img src={imageSrc} alt={title} className={classes["img"]} />
      </div>
      <div className={classes["box-title"]}>
        <p
          className={`${classes["title"]} ${
            isSelected ? classes["selected"] : ""
          } ${disabled ? classes["disabled"] : ""}`} // Aggiungi classe per disabilitato
        >
          {title}
        </p>
      </div>
      {disabled && (
        <div className={classes["disabled-message"]}>
          {errorMessage} {/* Visualizza il messaggio di errore specifico */}
        </div>
      )}
    </div>
  );
};

export default Card;