import SideBarMenuElement from "./SideBarMenuElement";
import classes from "./SideBarMenu.module.css";
import Freccetta_Nera from "../assets/Freccetta_Nera.png";

const SideBarMenu: React.FC<{ closeMenu: () => void }> = (props) => {
  return (
    <div className={classes["sidebar-menu"]}>
      <button
        className={classes["close-menu-button"]}
        onClick={props.closeMenu}
      >
        ✕
      </button>
      <ul className={classes["menu-list"]}>
        <li className={classes['item']}>
          <a href="#">
            <img src={Freccetta_Nera} alt="" className={classes.frecciaNera} />
            <span className="fontScritteTitoliMenu">HomePage</span>
          </a>
        </li>

        <SideBarMenuElement
          title="Grafiche"
          elements={[
            "Crea il tuo logo",
            "Biglietti da visita",
            "La tua locandina",
          ]}
        />
        <SideBarMenuElement
          title="Stampe"
          elements={[
            "Stampa il tuo documento",
            "Stampa le tue foto",
            "Stampa i tuoi biglietti da visita",
          ]}
        />
        <SideBarMenuElement
          title="Foto"
          elements={["Fototessere", "Foto ricordo"]}
        />
        <SideBarMenuElement
          title="Video"
          elements={["Realizza il tuo video"]}
        />
      </ul>
    </div>
  );
};

export default SideBarMenu;
