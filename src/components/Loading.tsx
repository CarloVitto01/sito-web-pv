import React from "react";
import classes from "./Loading.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const Loading = () => {
  return (
    <div className={classes["container"]}>
      <FontAwesomeIcon icon={faSpinner} className={classes["spinner"]} />
    </div>
  );
};

export default Loading;
