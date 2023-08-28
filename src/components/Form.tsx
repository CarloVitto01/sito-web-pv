import classes from "./Form.module.css";

const Form = () => {
    return (
        <div className={classes["form"]}>
            <div className={classes["container-form"]}>
                <div className={classes["credentials"]}>
                    <div className={classes["credential"]}>
                    <label htmlFor="nome" className={classes["voice"]}>Nome:</label>
                    <input type="text" id="nome" name="nome" className={classes["voice-input"]} />
                    </div>
                    <div className={classes["credential"]}>
                    <label htmlFor="email" className={classes["voice"]}>Email:</label>
                    <input type="text" id="email" name="email" className={classes["voice-input"]} />
                    </div>
                </div>
                <div className={classes["credentials"]}>
                    <div className={classes["credential"]}>
                    <label htmlFor="cognome" className={classes["voice"]}>Cognome:</label>
                    <input type="text" id="cognome" name="cognome" className={classes["voice-input"]} />
                    </div>
                    <div className={classes["credential"]}>
                    <label htmlFor="cellulare" className={classes["voice"]}>Cellulare:</label>
                    <input type="text" id="cellulare" name="cellulare" className={classes["voice-input"]} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Form;
