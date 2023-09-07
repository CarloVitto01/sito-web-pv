import classes from "./Modal.module.css";
import Sticky from "./Sticky";
import { useState } from "react";

interface propsContainer {
  totalOrder: string;
  onSubmit: (event: any) => void;
  disabled: boolean;
}
const Modal: React.FC<propsContainer> = ({
  totalOrder,
  onSubmit,
  disabled,
}) => {
  const [isShowing, setIsShowing] = useState<boolean>(false);

  const showHandler = () => {
    setIsShowing(!isShowing);
  };
  return (
    <Sticky
      position="bottom"
      stuckClasses={classes["stuck"]}
      unstuckClasses={classes["unstuck"]}
    >
      <div className={classes["container"]}>
        <header>
          <img
            src={require("../assets/Info.jpg")}
            alt="Info"
            className="info"
            onClick={showHandler}
          />
        </header>
        <div className={classes["inner-container"]}>
          <div className={classes["order-container"]}>
            <p className={classes["text"]}>Totale ordine:</p>
            <p className={classes["total-order"]}>€ {totalOrder}</p>
          </div>
          <div className={classes["button-container"]}>
            <button onClick={onSubmit} disabled={disabled}>
              CONFERMA
            </button>
          </div>
        </div>
        <div className={classes["text-container"]}>
          {isShowing && (
            <p>
              Clicca su conferma per accettare il tuo ordine. Verrai contattato
              da un nostro operatore il prima possibile per stabilire le opzioni
              di pagamento.
            </p>
          )}
        </div>
      </div>
    </Sticky>
  );
};

export default Modal;
