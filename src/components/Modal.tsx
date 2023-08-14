import classes from "./Modal.module.css";
import { useState } from "react";

const Modal = () => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const closeHandler = () => {
    setIsVisible(false);
  };

  const content = (
    <div className={`${isVisible ? classes['riquadroStudenteVisible'] : classes['riquadroStudenteNonVisible']}`}>
      <div className={classes.riquadroInternoStudente}>
        <span className={classes.closeButton} onClick={closeHandler}>
          x
        </span>
        <p className={classes.textStudente}>
          Se sei uno studente universitario hai il 10% di sconto!
        </p>
      </div>
    </div>

  );

  return <>{isVisible && content}</>;
};

export default Modal;
