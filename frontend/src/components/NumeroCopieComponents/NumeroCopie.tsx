import React from "react";
import { ControlFrame } from "../CardComponents/PrintControls";

type Props = {
  onSendData: (value: number) => void;
  hideTitle?: boolean;
  bare?: boolean;
  value?: number;
};

function normalize(value: number): number {
  return Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : 1;
}

const NumeroCopie: React.FC<Props> = ({
  onSendData,
  hideTitle = false,
  bare = false,
  value,
}) => {
  const [internal, setInternal] = React.useState(1);
  const copies = normalize(value ?? internal);
  const inputId = React.useId();

  const change = (next: number) => {
    const result = normalize(next);

    if (value === undefined) {
      setInternal(result);
    }

    onSendData(result);
  };

  return (
    <ControlFrame
      title="Numero copie"
      hideTitle={hideTitle}
      bare={bare}
    >
      <div className="pc-copies">
        <button
          type="button"
          aria-label="Diminuisci copie"
          disabled={copies <= 1}
          onClick={() => change(copies - 1)}
        >
          −
        </button>

        <label htmlFor={inputId} className="pc-sr-only">
          Numero copie
        </label>

        <input
          id={inputId}
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={copies}
          onChange={(event) =>
            change(Number(event.target.value))
          }
        />

        <button
          type="button"
          aria-label="Aumenta copie"
          onClick={() => change(copies + 1)}
        >
          +
        </button>
      </div>

      <p className="pc-helper">
        {copies === 1
          ? "Una copia del documento"
          : `${copies} copie del documento`}
      </p>
    </ControlFrame>
  );
};

export default React.memo(NumeroCopie);