
import classes from "./Card.module.css";

interface CardProps {
  title: string;
  imageSrc: string;
  isSelected: boolean;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({imageSrc, title, isSelected, onClick}: any) => {

  return (
    <div className={classes["rectangle"]} tabIndex={1}>
      <div className={`${classes["box-img"]} ${isSelected ? classes["selected"] : ""}`} onClick={onClick}>
          <img src={imageSrc} alt={title} className={classes["img"]}/>
      </div>
      <div className={classes["box-title"]}>
        <p className={`${classes["title"]} ${isSelected ? classes["selected"] : ""}`}>{title}</p>
      </div>
    </div>
  );
}

export default Card;
