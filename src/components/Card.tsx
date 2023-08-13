import classes from './Card.module.css';
const parse = require('html-react-parser');

const Card: React.FC<{title: string, subtitle: string, img: string, text: string}> = (props) => {
  return (
    <div className={classes["rectangle"]}>
      {/*GRAFICA*/}
      <div>
        <p className={classes["titoloRiquadri"]}>{props.title}</p>
      </div>
      <div className={classes["immagineRiquadri"]}>
        <img src={props.img} alt="logo_grafica" className={classes["logoRiquadri"]} />
      </div>
      <div className={classes["sottoTitoloRiquadro"]}>
        <p className={classes["sottoTitolo"]}>{props.subtitle}</p>
      </div>
      <div className={classes["testoRiquadri"]}>
        <p className={classes["testo"]}>
            {parse(props.text)}
        </p>
      </div>
    </div>
  );
};

export default Card;
