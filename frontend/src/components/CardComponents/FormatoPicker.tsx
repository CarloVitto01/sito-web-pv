import React from "react";
import { CheckMark, ControlFrame } from "./PrintControls";

type Props = {
  value: "A4" | "A3";
  onChange: (value: "A4" | "A3") => void;
  hint?: string;
  hideTitle?: boolean;
  bare?: boolean;
};

export default function FormatoPicker({
  value,
  onChange,
  hint = "Il formato si applica all’intero ordine.",
  hideTitle = false,
  bare = false,
}: Props) {
  return (
    <ControlFrame
      title="Formato"
      hint={hint}
      hideTitle={hideTitle}
      bare={bare}
    >
      <div
        className="pc-format-grid"
        role="group"
        aria-label="Formato carta"
      >
        {(["A4", "A3"] as const).map((format) => (
          <button
            key={format}
            type="button"
            className="pc-format"
            aria-pressed={value === format}
            onClick={() => onChange(format)}
          >
            {value === format && <CheckMark />}

            <span
              className={`pc-sheet pc-sheet--${format.toLowerCase()}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>

            <span className="pc-format-copy">
              <strong>{format}</strong>

              <small>
                {format === "A4"
                  ? "210 × 297 mm"
                  : "297 × 420 mm"}
              </small>
            </span>
          </button>
        ))}
      </div>
    </ControlFrame>
  );
}