import React, { useState } from "react";
import classes from "./IntervalloPagine.module.css";

const IntervalloPagine = () => {
    const [sceltaIntervallo, setSceltaIntervallo] = useState("opzione1");
    const [numeriDa, setNumeriDa] = useState("");
    const [numeriA, setNumeriA] = useState("");

    const handleSceltaIntervalloChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setSceltaIntervallo(event.target.value);
    };

    const handleNumeriDaChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setNumeriDa(event.target.value);
    };

    const handleNumeriAChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setNumeriA(event.target.value);
    };

    return (
        <div className={classes["page-range"]}>
            <p className={classes["title"]}>Intervallo pagine:</p>
            <div>
                <div className={classes["options"]}>
                    <input
                        type="radio"
                        value="opzione1"
                        id="opzione1SIntervallo"
                        checked={sceltaIntervallo === "opzione1"}
                        onChange={handleSceltaIntervalloChange}
                    />
                    <label htmlFor="opzione1SIntervallo">
                        <div className={classes["container-text"]}>
                            <span className={classes["pallino"]}></span>
                            <p className={classes["text"]}>Tutte</p>
                        </div>

                    </label>
                </div>
                <div className={classes["options"]}>
                    <input
                        type="radio"
                        value="opzione2"
                        id="opzione2SIntervallo"
                        checked={sceltaIntervallo === "opzione2"}
                        onChange={handleSceltaIntervalloChange}
                    />
                    <label htmlFor="opzione2SIntervallo">
                        <div className={classes["container-text"]}>
                            <span className={classes["pallino"]}></span>
                            <p className={classes["text"]}>Personalizzato</p>
                        </div>

                    </label>
                </div>
                {sceltaIntervallo === "opzione2" && (
                    <div>
                        <div className={classes["inputRowDivS"]}>
                            <p className={classes["text-page"]}>Da:</p>
                            <input
                                type="number"
                                id="numeriDa"
                                name="numeriDa"
                                inputMode="numeric"
                                value={numeriDa}
                                onChange={handleNumeriDaChange}
                            />
                        </div>
                        <div className={classes["inputRowDivS"]}>
                            <p className={classes["text-page"]}>A:</p>
                            <input
                                type="number"
                                id="numeriA"
                                inputMode="numeric"
                                value={numeriA}
                                onChange={handleNumeriAChange}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntervalloPagine;
