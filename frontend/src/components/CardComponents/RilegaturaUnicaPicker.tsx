import React from "react";
import {
  CheckMark,
  ControlFrame,
  ControlIcon,
} from "./PrintControls";

type Props = {
  value: "SI" | "NO";
  onChange: (value: "SI" | "NO") => void;
  hint?: string;
  disabled?: boolean;
  disabledHint?: string;
  hideTitle?: boolean;
  bare?: boolean;
};

const options = [
  {
    value: "SI",
    title: "Unisci i PDF",
    caption: "Un unico fascicolo",
    icon: "link",
  },
  {
    value: "NO",
    title: "PDF separati",
    caption: "Un fascicolo per file",
    icon: "pages",
  },
] as const;

export default function RilegaturaUnicaPicker({
  value,
  onChange,
  hint,
  disabled = false,
  disabledHint = "Disponibile soltanto per 2 o più PDF",
  hideTitle = false,
  bare = false,
}: Props) {
  return (
    <ControlFrame
      title="Organizza i documenti"
      hint={hint}
      bare={bare}
      hideTitle={hideTitle}
    >
      <div
        className="pc-binding-mode"
        role="group"
        aria-label="Rilegatura unica"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="pc-mode"
            aria-pressed={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {value === option.value && <CheckMark />}

            <ControlIcon kind={option.icon} />

            <strong>{option.title}</strong>
            <small>{option.caption}</small>
          </button>
        ))}
      </div>

      {disabled && (
        <p className="pc-helper">{disabledHint}</p>
      )}
    </ControlFrame>
  );
}