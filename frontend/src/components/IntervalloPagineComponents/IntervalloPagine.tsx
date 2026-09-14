import React from "react";
import type { RangePagesData } from "../../types/RangePagesData";
import { ControlFrame } from "../CardComponents/PrintControls";

type Props = {
  onSendData: (value: RangePagesData) => void;
  maxValue: number;
  disable: boolean;
  errorMessage: string;
  hideTitle?: boolean;
  bare?: boolean;
};

type Mode = "ALL" | "CUSTOM";

function clamp(value: number, max: number): number {
  return Math.max(
    1,
    Math.min(
      max,
      Number.isFinite(value) ? Math.floor(value) : 1
    )
  );
}

const IntervalloPagine: React.FC<Props> = ({
  onSendData,
  maxValue,
  disable,
  errorMessage,
  hideTitle = false,
  bare = false,
}) => {
  const max = Math.max(1, Math.floor(maxValue || 1));

  const [mode, setMode] = React.useState<Mode>("ALL");
  const [range, setRange] = React.useState({
    from: 1,
    to: max,
  });

  const inputId = React.useId();

  const from = clamp(range.from, max);
  const to = Math.max(from, clamp(range.to, max));

  // Mantiene aggiornata la callback senza reinviare i dati
  // soltanto perché il genitore crea una nuova funzione.
  const callback = React.useRef(onSendData);

  React.useEffect(() => {
    callback.current = onSendData;
  }, [onSendData]);

  React.useEffect(() => {
    callback.current({
      from: mode === "ALL" ? 1 : from,
      to: mode === "ALL" ? max : to,
      all: mode === "ALL",
      isValid: true,
    });
  }, [mode, from, to, max]);

  const selectCustom = () => {
    if (mode === "ALL") {
      setRange({ from: 1, to: max });
    }

    setMode("CUSTOM");
  };

  const helperText = disable
    ? errorMessage
    : maxValue < 1
      ? "Carica un PDF per rilevare le pagine."
      : mode === "ALL"
        ? `Tutte le ${max} pagine del PDF`
        : `${to - from + 1} pagine selezionate su ${max}`;

  return (
    <ControlFrame
      title="Intervallo pagine"
      hideTitle={hideTitle}
      bare={bare}
    >
      <fieldset
        className="pc-fieldset"
        disabled={disable}
      >
        <legend className="pc-sr-only">
          Pagine da stampare
        </legend>

        <div
          className="pc-segment"
          role="group"
          aria-label="Intervallo pagine"
        >
          <button
            type="button"
            aria-pressed={mode === "ALL"}
            onClick={() => setMode("ALL")}
          >
            Tutte le pagine
          </button>

          <button
            type="button"
            aria-pressed={mode === "CUSTOM"}
            onClick={selectCustom}
          >
            Scegli intervallo
          </button>
        </div>

        {mode === "CUSTOM" && (
          <div className="pc-range">
            <label htmlFor={`${inputId}-from`}>
              Da pagina

              <input
                id={`${inputId}-from`}
                type="number"
                min={1}
                max={max}
                step={1}
                value={from}
                onChange={(event) => {
                  const next = clamp(
                    Number(event.target.value),
                    max
                  );

                  setRange({
                    from: next,
                    to: Math.max(next, to),
                  });
                }}
              />
            </label>

            <span aria-hidden="true">→</span>

            <label htmlFor={`${inputId}-to`}>
              A pagina

              <input
                id={`${inputId}-to`}
                type="number"
                min={1}
                max={max}
                step={1}
                value={to}
                onChange={(event) => {
                  const next = clamp(
                    Number(event.target.value),
                    max
                  );

                  setRange({
                    from: Math.min(next, from),
                    to: next,
                  });
                }}
              />
            </label>
          </div>
        )}
      </fieldset>

      <p className="pc-helper">{helperText}</p>
    </ControlFrame>
  );
};

export default React.memo(IntervalloPagine);