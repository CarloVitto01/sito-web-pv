import { Box, UnstyledButton, Text } from "@mantine/core";
import classes from "./Card.module.css";

interface ImageButtonProps {
  title: string;
  imageSrc: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  errorMessage?: string;
}

const Card: React.FC<ImageButtonProps> = ({
  title,
  imageSrc,
  isSelected,
  onClick,
  disabled = false,
  errorMessage,
}) => {
  return (
    <Box className={classes.root}>
      <UnstyledButton
        className={[
          classes.button,
          isSelected ? classes.selected : "",
          disabled ? classes.disabled : "",
        ].join(" ")}
        onClick={!disabled ? onClick : undefined}
        disabled={disabled}
        aria-pressed={isSelected}
      >
        <div className={classes.media}>
          <img src={imageSrc} alt={title} className={classes.image} />
        </div>

        <Text className={classes.label} lineClamp={1}>
          {title}
        </Text>
      </UnstyledButton>

      {disabled && errorMessage && (
        <Box className={classes.helper} role="note">
          {errorMessage}
        </Box>
      )}
    </Box>
  );
};

export default Card;
