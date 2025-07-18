import React, { useState, useEffect } from "react";
import classes from "./Form.module.css";
import { FormData } from "../types/FormData";
import { motion } from "framer-motion";

const containsOnlyLetters = (value: string) => /^[a-zA-Z\s]+$/.test(value);
const validateEmail = (email: string) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email);
const containsOnlyNumbers = (number: string) => /^[0-9\s]+$/.test(number);

interface propsContainer {
  onSendData: (value: FormData) => void;
  defaultValues?: FormData;
}

const Form: React.FC<propsContainer> = ({ onSendData, defaultValues }) => {
  const [enteredName, setEnteredName] = useState<string>("");
  const [nameIsValid, setNameIsValid] = useState<boolean>();
  const [enteredSurname, setEnteredSurname] = useState<string>("");
  const [surnameIsValid, setSurnameIsValid] = useState<boolean>();
  const [enteredEmail, setEnteredEmail] = useState<string>("");
  const [emailIsValid, setEmailIsValid] = useState<boolean>();
  const [enteredTelephoneNumber, setEnteredTelephoneNumber] = useState<string>("");
  const [telephoneNumberIsValid, setTelephoneNumberIsValid] = useState<boolean>();
  const [enteredCorsoLaurea, setEnteredCorsoLaurea] = useState<string>("");
  const [enteredAnnoAccademico, setEnteredAnnoAccademico] = useState<string>("");

  const [data, setData] = useState<FormData>({
    name: "",
    surname: "",
    email: "",
    telephoneNumber: "",
    corsoLaurea: "",
    annoAccademico: ""
  });

  useEffect(() => {
    if (defaultValues) {
      setEnteredName(defaultValues.name || "");
      setEnteredSurname(defaultValues.surname || "");
      setEnteredEmail(defaultValues.email || "");
      setEnteredTelephoneNumber(defaultValues.telephoneNumber || "");
      setEnteredCorsoLaurea(defaultValues.corsoLaurea || "");
      setEnteredAnnoAccademico(defaultValues.annoAccademico || "");
    }
  }, [defaultValues]);

  useEffect(() => {
    if (enteredName) validateNameHandler(enteredName);
  }, [enteredName]);

  useEffect(() => {
    if (enteredSurname) validateSurnameHandler(enteredSurname);
  }, [enteredSurname]);

  useEffect(() => {
    if (enteredEmail) validateEmailHandler(enteredEmail);
  }, [enteredEmail]);

  useEffect(() => {
    if (enteredTelephoneNumber) validateTelephoneNumber(enteredTelephoneNumber);
  }, [enteredTelephoneNumber]);

  useEffect(() => {
    setData({
      name: enteredName,
      surname: enteredSurname,
      email: enteredEmail,
      telephoneNumber: enteredTelephoneNumber,
      corsoLaurea: enteredCorsoLaurea,
      annoAccademico: enteredAnnoAccademico
    });
  }, [enteredName, enteredSurname, enteredEmail, enteredTelephoneNumber, enteredCorsoLaurea, enteredAnnoAccademico]);

  useEffect(() => {
    onSendData({
      ...data,
      isValid: nameIsValid && surnameIsValid && emailIsValid && telephoneNumberIsValid,
    });
  }, [data, onSendData, nameIsValid, surnameIsValid, emailIsValid, telephoneNumberIsValid]);

  const nameChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => setEnteredName(e.target.value);
  const surnameChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => setEnteredSurname(e.target.value);
  const emailChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => setEnteredEmail(e.target.value);
  const telephoneNumberChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => setEnteredTelephoneNumber(e.target.value);
  const corsoLaureaChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => setEnteredCorsoLaurea(e.target.value);
  const annoAccademicoChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => setEnteredAnnoAccademico(e.target.value);

  const validateNameHandler = (name: string) => setNameIsValid(name.trim().length > 0 && containsOnlyLetters(name.trim()));
  const validateSurnameHandler = (surname: string) => setSurnameIsValid(surname.trim().length > 0 && containsOnlyLetters(surname.trim()));
  const validateEmailHandler = (email: string) => setEmailIsValid(validateEmail(email));
  const validateTelephoneNumber = (number: string) => {
    const sanitized = number.replace(/\s+/g, '');
    setTelephoneNumberIsValid(sanitized.length === 10 && containsOnlyNumbers(sanitized));
  };

  return (
    <motion.form
      className={classes.form}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className={classes["container-form"]}>
        <div className={classes.credentials}>
          <div className={`${classes.credential} ${nameIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="name" className={classes.voice}>Nome:</label>
            <input type="text" id="name" value={enteredName} onChange={nameChangeHandler} onBlur={() => validateNameHandler(enteredName)} />
          </div>
          <div className={`${classes.credential} ${surnameIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="surname" className={classes.voice}>Cognome:</label>
            <input type="text" id="surname" value={enteredSurname} onChange={surnameChangeHandler} onBlur={() => validateSurnameHandler(enteredSurname)} />
          </div>
          <div className={`${classes.credential} ${emailIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="email" className={classes.voice}>Email:</label>
            <input type="text" id="email" value={enteredEmail} onChange={emailChangeHandler} onBlur={() => validateEmailHandler(enteredEmail)} />
          </div>
          <div className={`${classes.credential} ${telephoneNumberIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="telephoneNumber" className={classes.voice}>Telefono:</label>
            <input type="text" id="telephoneNumber" value={enteredTelephoneNumber} onChange={telephoneNumberChangeHandler} onBlur={() => validateTelephoneNumber(enteredTelephoneNumber)} />
          </div>
          <div className={classes.credential}>
            <label htmlFor="corsoLaurea" className={classes.voice}>Corso (opzionale):</label>
            <input type="text" id="corsoLaurea" value={enteredCorsoLaurea} onChange={corsoLaureaChangeHandler} />
          </div>
          <div className={classes.credential}>
            <label htmlFor="annoAccademico" className={classes.voice}>Anno (opzionale):</label>
            <input type="text" id="annoAccademico" value={enteredAnnoAccademico} onChange={annoAccademicoChangeHandler} />
          </div>
        </div>
      </div>
    </motion.form>
  );
};

export default React.memo(Form);
