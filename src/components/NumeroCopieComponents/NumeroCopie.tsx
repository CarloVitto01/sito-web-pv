import classes from "./NumeroCopie.module.css";
import React, { useState, useEffect } from "react";

interface propsContainer {
  onSendData: (value: number) => void;
}
const NumeroCopie: React.FC<propsContainer> = ({ onSendData }) => {
  const [copies, setCopies] = useState<number>(1);

  useEffect(() => {
    onSendData(copies);
  }, [onSendData, copies]);

  const copiesHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const num = parseInt(value);
    if (!isNaN(num)) {
      setCopies(num);
    } else {
      setCopies(0);
    }
  };

  return (
    <div className={classes["copy-number"]}>
      <div className={classes["container"]}>
        <p className={classes["title"]}>Numero Copie:</p>
        <input
          type="number"
          className={classes["number"]}
          onChange={copiesHandler}
          min={1}
          defaultValue={1}
        />
      </div>
    </div>
  );
};

export default React.memo(NumeroCopie);
