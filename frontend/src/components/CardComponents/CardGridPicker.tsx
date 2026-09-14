import React from "react";
import { CheckMark, ControlFrame } from "./PrintControls";

export type GridOption = {
  title: string;
  icon: React.ReactNode;
  disabled?: boolean;
  errorMessage?: string;
};

type Props = {
  title: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: GridOption[];

  // Compatibilità con le chiamate esistenti.
  // La griglia si adatta automaticamente allo spazio disponibile.
  cols?: {
    base: number;
    md?: number;
    xl?: number;
  };

  hideTitle?: boolean;
  bare?: boolean;
};

const captions: Record<string, string> = {
  "Bianco e nero": "Essenziale e nitido",
  Colore: "Tutti i tuoi colori",
  "Fronte-retro": "Entrambi i lati",
  Fronte: "Un solo lato",
  "Verticale (A4)": "Una pagina per foglio",
  "Orizzontale (A4)": "Una pagina per foglio",
  "2 in 1 orizzontale": "Due pagine affiancate",
  "2 in 1 verticale": "Due pagine sovrapposte",
};

function displayLabel(value: string): string {
  if (value === "Colore") return "A colori";
  if (value === "Fronte") return "Solo fronte";
  return value;
}

export default function CardGridPicker({
  title,
  hint,
  value,
  onChange,
  options,
  hideTitle = false,
  bare = false,
}: Props) {
  const helperId = React.useId();

  const isBinding = /^(?:tipo di\s+)?rilegatura\s*:?$/i.test(
    title.trim()
  );

  const selectedOption = options.find(
    (option) => option.title === value
  );

  return (
    <ControlFrame
      title={title.replace(/:\s*$/, "")}
      hint={hint}
      bare={bare}
      hideTitle={hideTitle}
    >
      <div
        className={
          isBinding
            ? "pc-choice-grid pc-choice-grid--binding"
            : "pc-choice-grid"
        }
        role="group"
        aria-label={title}
        aria-describedby={isBinding ? helperId : undefined}
      >
        {options.map((option) => {
          const selected = value === option.title;
          const disabled = Boolean(option.disabled);

          return (
            <button
              key={option.title}
              type="button"
              className="pc-choice"
              aria-pressed={selected}
              disabled={disabled}
              title={
                disabled
                  ? option.errorMessage || "Opzione non disponibile"
                  : undefined
              }
              onClick={() => onChange(option.title)}
            >
              {selected && <CheckMark />}

              <span className="pc-choice-icon" aria-hidden="true">
                {option.icon}
              </span>

              <span className="pc-choice-title">
                {displayLabel(option.title)}
              </span>

              {captions[option.title] && (
                <span className="pc-choice-caption">
                  {captions[option.title]}
                </span>
              )}

              {disabled && (
                <span className="pc-unavailable">
                  {option.errorMessage || "Non disponibile"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isBinding && (
        <p id={helperId} className="pc-helper">
          {selectedOption?.disabled
            ? selectedOption.errorMessage || "Opzione non disponibile."
            : "Le finiture disponibili dipendono dal numero di pagine."}
        </p>
      )}
    </ControlFrame>
  );
}