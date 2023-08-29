
import classes from "./Card.module.css";

const Card = ({imageSrc, title}: any) => {
  return (
    <div className={classes["rectangle"]}>
      <div className={classes["box-img"]}>
          <img src={imageSrc} alt={title} className={classes["img"]}/>
      </div>
      <div className={classes["box-title"]}>
        <p className={classes["title"]}>{title}</p>
      </div>
    </div>
  );
}

export default Card;
