import React, { useState, useEffect } from "react";
import classes from "./IntervalloPagine.module.css";

interface propsContainer {
  onSendData: (value: any) => void;
  maxValue: number;
}
const IntervalloPagine: React.FC<propsContainer> = ({
  onSendData,
  maxValue,
}) => {
  const [option, setOption] = useState("option1");
  const [from, setFrom] = useState<number>(1);
  const [to, setTo] = useState<number>(1);
  const [rangePages, setRangePages] = useState<any>({
    from: 1,
    to: 1,
    all: true,
    isValid: true,
  });
  const [fromIsValid, setFromIsValid] = useState<boolean>(true);
  const [toIsValid, setToIsValid] = useState<boolean>(true);

  useEffect(() => {
    const validateValueHandler = (value: number) => {
      if (maxValue >= 1) {
        return value > 0 && value <= maxValue;
      }
      if (maxValue === 0) {
        return value === 1;
      }
      return true;
    };
    setFromIsValid(validateValueHandler(from));
    setToIsValid(validateValueHandler(to));
  }, [from, to, maxValue]);

  useEffect(() => {
    onSendData({ ...rangePages, isValid: fromIsValid && toIsValid });
  }, [rangePages, onSendData, fromIsValid, toIsValid]);

  useEffect(() => {
    if (option === "option1") {
      setRangePages((prevState: any) => ({
        ...prevState,
        all: true,
      }));
    } else {
      setRangePages((prevState: any) => ({
        ...prevState,
        all: false,
      }));
    }
  }, [setRangePages, option]);

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOption(event.target.value);
  };

  const handleFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = parseInt(event.target.value);
    setFrom((prevFrom) => {
      if (newFrom > to) {
        setTo(newFrom);
        setRangePages((prevState: any) => ({
          ...prevState,
          from: newFrom,
          to: newFrom,
          all: false,
        }));
      }
      return newFrom;
    });
    setRangePages((prevState: any) => ({
      ...prevState,
      from: newFrom,
      all: false,
    }));
  };

  const handleToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = parseInt(event.target.value);
    setTo((prevTo) => {
      if (newTo < from) {
        setFrom(newTo);
        setRangePages((prevState: any) => ({
          ...prevState,
          from: newTo,
          to: newTo,
          all: false,
        }));
      }
      return newTo;
    });
    setRangePages((prevState: any) => ({
      ...prevState,
      to: newTo,
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
            id="option1"
            checked={option === "option1"}
            onChange={handleOptionChange}
          />
          <label htmlFor="option1">
            <div className={classes["container-text"]}>
              <span className={classes["checkmark"]}></span>
              <p className={classes["text"]}>Tutte</p>
            </div>
          </label>
        </div>
        <div className={classes["options"]}>
          <input
            type="radio"
            value="option2"
            id="option2"
            checked={option === "option2"}
            onChange={handleOptionChange}
          />
          <label htmlFor="option2">
            <div className={classes["container-text"]}>
              <span className={classes["checkmark"]}></span>
              <p className={classes["text"]}>Personalizzato</p>
            </div>
          </label>
        </div>
        {option === "option2" && (
          <div>
            <div
              className={`${classes["inputRowDivS"]} ${
                fromIsValid === false ? classes.invalid : ""
              }`}
            >
              <p className={classes["text-page"]}>Da:</p>
              <input
                type="number"
                id="from"
                name="from"
                inputMode="numeric"
                value={from}
                min={1}
                max={maxValue}
                onChange={handleFromChange}
                className={classes["number"]}
              />
              <div>
                {!fromIsValid && (
                  <p style={{ color: "red", whiteSpace: "nowrap" }}>
                    Valore non valido!
                  </p>
                )}
              </div>
            </div>
            <div
              className={`${classes["inputRowDivS"]} ${
                toIsValid === false ? classes.invalid : ""
              }`}
            >
              <p className={classes["text-page"]}>A:</p>
              <input
                type="number"
                id="to"
                inputMode="numeric"
                value={to}
                min={1}
                max={maxValue}
                onChange={handleToChange}
                className={classes["number"]}
              />
              {!toIsValid && (
                <p style={{ color: "red", whiteSpace: "nowrap" }}>
                  Valore non valido!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntervalloPagine;
