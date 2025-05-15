import React from "react";
import classes from "./Card.module.css";

interface ImageButtonProps {
  title: string;
  imageSrc: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  errorMessage?: string;
}

const Card: React.FC<ImageButtonProps> = ({
  title,
  imageSrc,
  isSelected,
  onClick,
  disabled = false,
  errorMessage,
}) => {
  const handleClick = (event: React.MouseEvent) => {
    if (!disabled) onClick();
    event.stopPropagation();
  };

  return (
    <div className={classes.container}>
      <button
        className={`${classes.button} ${isSelected ? classes.selected : ""} ${
          disabled ? classes.disabled : ""
        }`}
        onClick={handleClick}
        disabled={disabled}
      >
        <img src={imageSrc} alt={title} className={classes.image} />
        <span className={classes.label}>{title}</span>
      </button>
      {disabled && errorMessage && (
        <div className={classes.error}>{errorMessage}</div>
      )}
    </div>
  );
};

export default Card;
