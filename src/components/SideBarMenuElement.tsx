import Freccetta_Nera from "../assets/Freccetta_Nera.png";
import { useState } from "react";
import SubMenuElement from "./SubMenuElement";
import classes from './SideBarMenuElement.module.css'

const SideBarMenuElement: React.FC<{elements: string[], title: string}> = (props) => {

  const [activeSubMenu, setActiveSubMenu] = useState<boolean>(false);
  
  const toggleSubMenu = () => {
    setActiveSubMenu(!activeSubMenu);
  };

  return (
    <li className={classes['item']}>
      <a href="#" onClick={() => toggleSubMenu()}>
        <img
          src={Freccetta_Nera}
          alt=""
          className={`${classes.frecciaNeraRotante} ${activeSubMenu ? classes.rotated : ""}`}
        />
        <span className="fontScritteTitoliMenu">{props.title}</span>
      </a>
      {activeSubMenu && (
        <ul className={classes["sub-menu-list"]}>
          {props.elements.map((textElement) => <SubMenuElement text={textElement}/>)}
        </ul>
      )}
    </li>
  );
};

export default SideBarMenuElement;
