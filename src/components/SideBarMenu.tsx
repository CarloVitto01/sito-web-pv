import SideBarMenuElement from "./SideBarMenuElement";
import classes from "./SideBarMenu.module.css";
import Freccetta_Nera from "../assets/Freccetta_Nera.png";
import {NavLink} from 'react-router-dom'

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
          <NavLink to="/" onClick={props.closeMenu}>
            <img src={Freccetta_Nera} alt="" className={classes.frecciaNera} />
            <span className="fontScritteTitoliMenu">HomePage</span>
          </NavLink>
        </li>

        <SideBarMenuElement
          title="Grafica"
          elements={[
            "Crea il tuo logo",
            "Biglietti da visita",
            "La tua locandina",
          ]}
          closeMenu={props.closeMenu}
        />
        <SideBarMenuElement
          title="Stampa"
          elements={[
            "Stampa il tuo documento",
            "Stampa le tue foto",
            "Stampa i tuoi biglietti da visita",
          ]}
          closeMenu={props.closeMenu}
        />
        <SideBarMenuElement
          title="Foto"
          elements={["Fototessere", "Foto ricordo"]}
          closeMenu={props.closeMenu}
        />
        <SideBarMenuElement
          title="Video"
          elements={["Realizza il tuo video"]}
          closeMenu={props.closeMenu}
        />
      </ul>
    </div>
  );
};

export default SideBarMenu;
