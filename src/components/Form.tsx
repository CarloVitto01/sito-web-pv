import classes from "./Form.module.css";
import React, { useState, useEffect } from "react";
import { FormData } from "../types/FormData";

const containsOnlyLetters = (value: string) => {
  var regex = /^[a-zA-Z]+$/;
  return regex.test(value);
};

const validateEmail = (email: string) => {
  var regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return regex.test(email);
};

const containsOnlyNumbers = (number: string) => {
  var regex = /^[0-9]+$/;
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
  const [data, setData] = useState<FormData>({
    name: "",
    surname: "",
    email: "",
    telephoneNumber: "",
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

  //Set Data

  useEffect(() => {
    setData({
      name: enteredName,
      surname: enteredSurname,
      email: enteredEmail,
      telephoneNumber: enteredTelephoneNumber,
    });
  }, [
    enteredName,
    enteredSurname,
    enteredEmail,
    enteredTelephoneNumber,
    setData,
  ]);

  //Send Data

  useEffect(() => {
    onSendData({
      ...data,
      isValid:
        nameIsValid && surnameIsValid && emailIsValid && telephoneNumberIsValid,
    });
  }, [
    data,
    onSendData,
    nameIsValid,
    surnameIsValid,
    emailIsValid,
    telephoneNumberIsValid,
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
    setTelephoneNumberIsValid(
      telephoneNumber.trim().length === 10 &&
        containsOnlyNumbers(telephoneNumber)
    );
  };

  return (
    <form className={classes["form"]}>
      <div className={classes["container-form"]}>
        <div className={classes["credentials"]}>
          <div
            className={`${classes["credential"]} ${
              nameIsValid === false ? classes.invalid : ""
            }`}
          >
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
                <p style={{ color: "red" }}>Il nome inserito non è valido!</p>
              )}
            </div>
          </div>
          <div
            className={`${classes["credential"]} ${
              surnameIsValid === false ? classes.invalid : ""
            }`}
          >
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
                <p style={{ color: "red" }}>
                  Il cognome inserito non è valido!
                </p>
              )}
            </div>
          </div>
        </div>
        <div className={classes["credentials"]}>
          <div
            className={`${classes["credential"]} ${
              emailIsValid === false ? classes.invalid : ""
            }`}
          >
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
                <p style={{ color: "red" }}>L'email inserita non è valida!</p>
              )}
            </div>
          </div>
          <div
            className={`${classes["credential"]} ${
              telephoneNumberIsValid === false ? classes.invalid : ""
            }`}
          >
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
                <p style={{ color: "red" }}>Il numero inserito non è valido!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default React.memo(Form);
