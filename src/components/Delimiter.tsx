import classes from "./Delimiter.module.css";

const Delimiter = ({ children }: any) => {
  return (
    <div className={classes["container-line"]}>
      <div className={classes["line-delimiter"]}>{children}</div>
    </div>
  );
};

export default Delimiter;
