import classes from "./Card.module.css";
import { Link } from "react-router-dom";
const parse = require("html-react-parser");

const Card: React.FC<{
  title: string;
  subtitle: string;
  img: string;
  text: string;
}> = (props) => {
  return (
    <div className={classes["rectangle"]}>
      <Link to={props.title.toLowerCase() } className={classes['noUnderline']}>
        {/*GRAFICA*/}
        <div>
          <p className={classes["titoloRiquadri"]}>{props.title}</p>
        </div>
        <div className={classes["immagineRiquadri"]}>
          <img
            src={props.img}
            alt="logo_grafica"
            className={classes["logoRiquadri"]}
          />
        </div>
        <div className={classes["sottoTitoloRiquadro"]}>
          <p className={classes["sottoTitolo"]}>{props.subtitle}</p>
        </div>
        <div className={classes["testoRiquadri"]}>
          <p className={classes["testo"]}>{parse(props.text)}</p>
        </div>
      </Link>
    </div>
  );
};

export default Card;
