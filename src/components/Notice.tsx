import classes from './Notice.module.css';
import { IoIosWarning } from "react-icons/io";


const Notice =  () => {
  return (
    <div className={classes["notice"]} role="alert" aria-live="assertive">
      <div className={classes["notice__icon"]} aria-hidden="true">
        <IoIosWarning />
      </div>
      <div className={classes["notice__message"]}>
      Informiamo gli utenti che il servizio di consegna delle stampe sarà sospeso da lunedì 23 dicembre 2024 a martedì 7 gennaio 2025.
      </div>
      <div className={classes["notice__icon"]} aria-hidden="true">
        <IoIosWarning />
      </div>
    </div>
  );
};


export default Notice;