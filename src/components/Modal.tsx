import classes from "./Modal.module.css"

const Modal = () => {

    return (
        <div className={classes["modal"]}>
            <div className={classes["container"]}>
                <header></header>
                <div className={classes["order-container"]}>
                    <p className={classes["text"]}>Totale ordine:</p>
                    <p className={classes["total-order"]}>€ 000.00</p>
                </div>
                <div className={classes["button-container"]}>
                    <button>CONFERMA</button>
                </div>
            </div>
        </div>

    );
}

export default Modal;