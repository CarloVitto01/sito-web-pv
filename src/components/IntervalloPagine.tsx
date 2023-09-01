import React, { useState, useEffect } from "react";
import classes from "./IntervalloPagine.module.css";

interface propsContainer {
  onSendData: (value: any) => void;
}
const IntervalloPagine: React.FC<propsContainer> = ({ onSendData }) => {
  const [sceltaIntervallo, setSceltaIntervallo] = useState("option1");
  const [numeriDa, setNumeriDa] = useState<number>(1);
  const [numeriA, setNumeriA] = useState<number>(1);
  const [rangePages, setRangePages] = useState<any>({
    from: 1,
    to: 1,
    all: true,
  });

  useEffect(() => {
    onSendData(rangePages);
  }, [rangePages, onSendData]);

  useEffect(()=>{
    if(sceltaIntervallo === "option1"){
      setRangePages((prevState: any) => ({
        ...prevState,
        all: true,
      }));
    }
    else{
      setRangePages((prevState: any) => ({
        ...prevState,
        all: false,
      }));
    }
  },[setRangePages,sceltaIntervallo])


  const handleSceltaIntervalloChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSceltaIntervallo(event.target.value);
  };

  const handleNumeriDaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNumeriDa = parseInt(event.target.value);
    setNumeriDa((prevNumeriDa) => {
      if (newNumeriDa > numeriA) {
        setNumeriA(newNumeriDa);
        setRangePages((prevState: any) => ({
          ...prevState,
          from: newNumeriDa,
          to: newNumeriDa,
          all: false,
        }));
      }
      return newNumeriDa;
    });
    setRangePages((prevState: any) => ({
      ...prevState,
      from: newNumeriDa,
      all: false,
    }));
  };

  const handleNumeriAChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNumeriA = parseInt(event.target.value);
    setNumeriA((prevNumeriA) => {
      if (newNumeriA < numeriDa) {
        setNumeriDa(newNumeriA);
        setRangePages((prevState: any) => ({
          ...prevState,
          from: newNumeriA,
          to: newNumeriA,
          all: false,
        }));
      }
      return newNumeriA;
    });
    setRangePages((prevState: any) => ({
      ...prevState,
      to: newNumeriA,
      all: false,
    }));
  };

  return (
    <div className={classes["page-range"]}>
      <p className={classes["title"]}>Intervallo pagine:</p>
      <div>
        <div className={classes["options"]}>
          <input
            type="radio"
            value="option1"
            id="option1SIntervallo"
            checked={sceltaIntervallo === "option1"}
            onChange={handleSceltaIntervalloChange}
          />
          <label htmlFor="option1SIntervallo">
            <div className={classes["container-text"]}>
              <span className={classes["pallino"]}></span>
              <p className={classes["text"]}>Tutte</p>
            </div>
          </label>
        </div>
        <div className={classes["options"]}>
          <input
            type="radio"
            value="option2"
            id="option2SIntervallo"
            checked={sceltaIntervallo === "option2"}
            onChange={handleSceltaIntervalloChange}
          />
          <label htmlFor="option2SIntervallo">
            <div className={classes["container-text"]}>
              <span className={classes["pallino"]}></span>
              <p className={classes["text"]}>Personalizzato</p>
            </div>
          </label>
        </div>
        {sceltaIntervallo === "option2" && (
          <div>
            <div className={classes["inputRowDivS"]}>
              <p className={classes["text-page"]}>Da:</p>
              <input
                type="number"
                id="numeriDa"
                name="numeriDa"
                inputMode="numeric"
                value={numeriDa}
                min={1}
                onChange={handleNumeriDaChange}
                className={classes["number"]}
              />
            </div>
            <div className={classes["inputRowDivS"]}>
              <p className={classes["text-page"]}>A:</p>
              <input
                type="number"
                id="numeriA"
                inputMode="numeric"
                value={numeriA}
                min={1}
                onChange={handleNumeriAChange}
                className={classes["number"]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntervalloPagine;
