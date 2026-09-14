import React from "react";
import { CheckMark, ControlFrame } from "./PrintControls";

export type PlasticaColor = {
  id: string;
  name: string;
  hex: string;
  description?: string;
  disabled?: boolean;
};

type Props = {
  label?: string;
  colors: PlasticaColor[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (color: PlasticaColor | null) => void;

  // Conservato per compatibilità.
  // I nuovi campioni colore usano una disposizione flessibile.
  columns?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };

  withPreviewCard?: boolean;
  resetLabel?: string;
  emptyHint?: string;
  disabled?: boolean;
  disabledHint?: string;
  bare?: boolean;
};

export default function PlasticaColorePicker({
  label = "Colore copertina",
  colors,
  value,
  defaultValue = null,
  onChange,
  withPreviewCard = true,
  resetLabel = "Rimuovi selezione",
  emptyHint = "Verrà applicata la plastica trasparente.",
  disabled = false,
  disabledHint = "Opzione non disponibile con la rilegatura selezionata.",
  bare = false,
}: Props) {
  const [internal, setInternal] = React.useState<string | null>(
    defaultValue
  );

  const selectedId = value === undefined ? internal : value;

  const selected =
    colors.find((color) => color.id === selectedId) ?? null;

  const callback = React.useRef(onChange);

  React.useEffect(() => {
    callback.current = onChange;
  }, [onChange]);

  const invalidSelection =
    !!selectedId &&
    (disabled ||
      !colors.some((color) => color.id === selectedId));

  React.useEffect(() => {
    if (!invalidSelection) return;

    if (value === undefined) {
      setInternal(null);
    }

    callback.current?.(null);
  }, [invalidSelection, selectedId, value]);

  const choose = (color: PlasticaColor | null) => {
    if (disabled || color?.disabled) return;

    if (value === undefined) {
      setInternal(color?.id ?? null);
    }

    onChange?.(color);
  };

  return (
    <ControlFrame title={label} bare={bare}>
      {bare && (
        <div className="pc-heading pc-heading--inline">
          <h3>{label}</h3>
          <span>{selected?.name ?? "Trasparente"}</span>
        </div>
      )}

      <div
        className="pc-swatches"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          className="pc-swatch-option"
          aria-pressed={!selectedId}
          disabled={disabled}
          onClick={() => choose(null)}
        >
          <span className="pc-swatch pc-swatch--clear">
            {!selectedId && <CheckMark />}
          </span>

          <strong>Trasparente</strong>
        </button>

        {colors.map((color) => (
          <button
            key={color.id}
            type="button"
            className="pc-swatch-option"
            aria-pressed={selectedId === color.id}
            disabled={disabled || color.disabled}
            onClick={() => choose(color)}
            title={
              color.disabled
                ? "Non disponibile"
                : color.description
            }
          >
            <span
              className="pc-swatch"
              style={{ background: color.hex }}
            >
              {selectedId === color.id && <CheckMark />}
            </span>

            <strong>{color.name}</strong>

            {color.description && (
              <small>{color.description}</small>
            )}
          </button>
        ))}
      </div>

      {disabled && (
        <p className="pc-helper">{disabledHint}</p>
      )}

      {withPreviewCard && !disabled && (
        <div className="pc-cover-note">
          <span>
            {selected
              ? selected.description || selected.name
              : emptyHint}
          </span>

          {selectedId && (
            <button
              type="button"
              onClick={() => choose(null)}
            >
              {resetLabel}
            </button>
          )}
        </div>
      )}
    </ControlFrame>
  );
}