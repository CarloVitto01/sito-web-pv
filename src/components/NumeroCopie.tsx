import classes from "./NumeroCopie.module.css";

const NumeroCopie = () => {
    return(
        <div className={classes["copy-number"]}>
            <div className={classes["container"]}>
                <p className={classes["title"]}>Numero Copie:</p>
                <input type="number" className={classes["number"]}/>
            </div>
        </div>
    );
};

export default NumeroCopie;