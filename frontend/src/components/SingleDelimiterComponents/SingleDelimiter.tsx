import classes from "./SingleDelimiter.module.css";
import React from "react";
const SingleDelimiter = () => {
  return (
    <div className={classes["container-line"]}>
      <div className={classes["line-delimiter"]}></div>
    </div>
  );
};

export default React.memo(SingleDelimiter);
