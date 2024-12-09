import classes from "./Form.module.css";
import React, { useState, useEffect } from "react";
import { FormData } from "../types/FormData";

const containsOnlyLetters = (value: string) => {
  var regex = /^[a-zA-Z\s]+$/; // Permette anche gli spazi
  return regex.test(value);
};

const validateEmail = (email: string) => {
  var regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return regex.test(email);
};

const containsOnlyNumbers = (number: string) => {
  var regex = /^[0-9\s]+$/; // Permette anche gli spazi
  return regex.test(number);
};

interface propsContainer {
  onSendData: (value: FormData) => void;
}

const Form: React.FC<propsContainer> = ({ onSendData }) => {
  const [enteredName, setEnteredName] = useState<string>("");
  const [nameIsValid, setNameIsValid] = useState<boolean>();
  const [enteredSurname, setEnteredSurname] = useState<string>("");
  const [surnameIsValid, setSurnameIsValid] = useState<boolean>();
  const [enteredEmail, setEnteredEmail] = useState<string>("");
  const [emailIsValid, setEmailIsValid] = useState<boolean>();
  const [enteredTelephoneNumber, setEnteredTelephoneNumber] =
    useState<string>("");
  const [telephoneNumberIsValid, setTelephoneNumberIsValid] =
    useState<boolean>();
  const [enteredCorsoLaurea, setEnteredCorsoLaurea] = useState<string>("");
  const [corsoLaureaIsValid, setCorsoLaureaIsValid] = useState<boolean>();
  const [enteredAnnoAccademico, setEnteredAnnoAccademico] = useState<string>("");
  const [annoAccademicoIsValid, setAnnoAccademicoIsValid] = useState<boolean>();
  const [data, setData] = useState<FormData>({
    name: "",
    surname: "",
    email: "",
    telephoneNumber: "",
    corsoLaurea: "",
    annoAccademico: ""
  });

  //Live validation

  useEffect(() => {
    if (enteredName) {
      validateNameHandler(enteredName);
    }
  }, [enteredName]);

  useEffect(() => {
    if (enteredSurname) {
      validateSurnameHandler(enteredSurname);
    }
  }, [enteredSurname]);

  useEffect(() => {
    if (enteredEmail) {
      validateEmailHandler(enteredEmail);
    }
  }, [enteredEmail]);

  useEffect(() => {
    if (enteredTelephoneNumber) {
      validateTelephoneNumber(enteredTelephoneNumber);
    }
  }, [enteredTelephoneNumber]);

  useEffect(() => {
    if (enteredCorsoLaurea) {
      validateCorsoLaureaHandler(enteredCorsoLaurea);
    }
  }, [enteredCorsoLaurea]);

  useEffect(() => {
    if (enteredAnnoAccademico) {
      validateAnnoAccademicoNumber(enteredAnnoAccademico);
    }
  }, [enteredAnnoAccademico]);

  //Set Data

  useEffect(() => {
    setData({
      name: enteredName,
      surname: enteredSurname,
      email: enteredEmail,
      telephoneNumber: enteredTelephoneNumber,
      corsoLaurea: enteredCorsoLaurea,
      annoAccademico: enteredAnnoAccademico
    });
  }, [
    enteredName,
    enteredSurname,
    enteredEmail,
    enteredTelephoneNumber,
    enteredCorsoLaurea,
    enteredAnnoAccademico,
    setData,
  ]);

  //Send Data

  useEffect(() => {
    onSendData({
      ...data,
      isValid:
        nameIsValid && surnameIsValid && emailIsValid && telephoneNumberIsValid && corsoLaureaIsValid && annoAccademicoIsValid,
    });
  }, [
    data,
    onSendData,
    nameIsValid,
    surnameIsValid,
    emailIsValid,
    telephoneNumberIsValid,
    corsoLaureaIsValid,
    annoAccademicoIsValid
  ]);

  //Change values handler

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredName(event.target.value);
  };

  const surnameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredSurname(event.target.value);
  };

  const emailChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredEmail(event.target.value);
  };

  const telephoneNumberChangeHandler = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEnteredTelephoneNumber(event.target.value);
  };

  const corsoLaureaChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredCorsoLaurea(event.target.value);
  };
  
  const annoAccademicoChangeHandler = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEnteredAnnoAccademico(event.target.value);
  };

  //Validate values handler

  const validateNameHandler = (name: string) => {
    setNameIsValid(name.trim().length > 0 && containsOnlyLetters(name.trim()));
  };

  const validateSurnameHandler = (surname: string) => {
    setSurnameIsValid(
      surname.trim().length > 0 && containsOnlyLetters(surname.trim())
    );
  };

  const validateEmailHandler = (email: string) => {
    setEmailIsValid(validateEmail(email));
  };

  const validateTelephoneNumber = (telephoneNumber: string) => {
    const sanitizedNumber = telephoneNumber.replace(/\s+/g, ''); // Rimuovi gli spazi per la validazione
    setTelephoneNumberIsValid(
      sanitizedNumber.length === 10 &&
      containsOnlyNumbers(sanitizedNumber)
    );
  };

  const validateCorsoLaureaHandler = (corsoLaurea: string) => {
    setCorsoLaureaIsValid(corsoLaurea.trim().length > 0 && containsOnlyLetters(corsoLaurea.trim()));
  };

  const validateAnnoAccademicoNumber = (annoAccademicoNumber: string) => {
    setAnnoAccademicoIsValid(
      annoAccademicoNumber.trim().length === 4 &&
      containsOnlyNumbers(annoAccademicoNumber)
    );
  };

  return (
    <form className={classes["form"]}>
      <div className={classes["container-form"]}>
        <div className={classes["credentials"]}>
          <div className={`${classes["credential"]} ${nameIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="name" className={classes["voice"]}>
              Nome:
            </label>
            <div style={{ flexDirection: "column" }}>
              <input
                type="text"
                id="name"
                name="name"
                value={enteredName}
                onChange={nameChangeHandler}
                onBlur={validateNameHandler.bind(null, enteredName)}
              />
              {nameIsValid === false && (
                <p style={{ color: "red", margin: 0 }}>Il nome inserito non è valido!</p>
              )}
            </div>
          </div>
          <div className={`${classes["credential"]} ${surnameIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="surname" className={classes["voice"]}>
              Cognome:
            </label>
            <div style={{ flexDirection: "column" }}>
              <input
                type="text"
                id="surname"
                name="surname"
                value={enteredSurname}
                onChange={surnameChangeHandler}
                onBlur={validateSurnameHandler.bind(null, enteredSurname)}
              />
              {surnameIsValid === false && (
                <p style={{ color: "red", margin: 0 }}>
                  Il cognome inserito non è valido!
                </p>
              )}
            </div>
          </div>
        </div>
        <div className={classes["credentials"]}>
          <div className={`${classes["credential"]} ${emailIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="email" className={classes["voice"]}>
              Email:
            </label>
            <div style={{ flexDirection: "column" }}>
              <input
                type="text"
                id="email"
                name="email"
                value={enteredEmail}
                onChange={emailChangeHandler}
                onBlur={validateEmailHandler.bind(null, enteredEmail)}
              />
              {emailIsValid === false && (
                <p style={{ color: "red", margin: 0 }}>L'email inserita non è valida!</p>
              )}
            </div>
          </div>
          <div className={`${classes["credential"]} ${telephoneNumberIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="telephoneNumber" className={classes["voice"]}>
              Telefono:
            </label>
            <div style={{ flexDirection: "column" }}>
              <input
                type="text"
                id="telephoneNumber"
                name="telephoneNumber"
                value={enteredTelephoneNumber}
                onChange={telephoneNumberChangeHandler}
                onBlur={validateTelephoneNumber.bind(
                  null,
                  enteredTelephoneNumber
                )}
              />
              {telephoneNumberIsValid === false && (
                <p style={{ color: "red", margin: 0 }}>Il numero inserito non è valido!</p>
              )}
            </div>
          </div>
        </div>
        <div className={classes["credentials"]}>
          <div className={`${classes["credential"]} ${corsoLaureaIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="corsoLaurea" className={classes["voice"]}>
              Corso:
            </label>
            <div style={{ flexDirection: "column" }}>
              <input
                type="text"
                id="corsoLaurea"
                name="corsoLaurea"
                value={enteredCorsoLaurea}
                onChange={corsoLaureaChangeHandler}
                onBlur={validateCorsoLaureaHandler.bind(null, enteredCorsoLaurea)}
              />
              {corsoLaureaIsValid === false && (
                <p style={{ color: "red", margin: 0 }}>Il corso di Laurea inserito non è valido!</p>
              )}
            </div>
          </div>
          <div className={`${classes["credential"]} ${telephoneNumberIsValid === false ? classes.invalid : ""}`}>
            <label htmlFor="annoAccademico" className={classes["voice"]}>
              Anno:
            </label>
            <div style={{ flexDirection: "column" }}>
              <input
                type="text"
                id="annoAccademico"
                name="annoAccademico"
                value={enteredAnnoAccademico}
                onChange={annoAccademicoChangeHandler}
                onBlur={validateAnnoAccademicoNumber.bind(
                  null,
                  enteredAnnoAccademico
                )}
              />
              {annoAccademicoIsValid === false && (
                <p style={{ color: "red", margin: 0 }}>L'anno accademico inserito non è valido!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default React.memo(Form);
