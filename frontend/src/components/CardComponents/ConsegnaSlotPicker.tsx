import React, { useEffect, useId, useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconSchool,
} from "@tabler/icons-react";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DeliverySlot = {
  id: string;
  weekday: Weekday;
  dateISO: string;
  dayLabel: string;
  timeRange: string;
};

type Props = {
  slots: DeliverySlot[];
  selectedId: string | null;
  onChange: (slotId: string | null) => void;
  disabled?: boolean;
  onStudentChange: (isStudent: boolean | null) => void;
  hint?: string;
  noDeliveryText?: string;
};

const DELIVERY_STYLES = `
.pv-delivery {
  --delivery-gold: #a37c32;
  --delivery-ink: #182331;
  --delivery-muted: #657180;
  min-width: 0;
  padding: 15px;
  border: 1px solid #e2e5e9;
  border-radius: 14px;
  background: #fafbfc;
  color: var(--delivery-ink);
  font-family: Inter, system-ui, sans-serif;
}

.pv-delivery,
.pv-delivery * {
  box-sizing: border-box;
}

.pv-delivery fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.pv-delivery legend {
  width: 100%;
  padding: 0;
  margin-bottom: 13px;
}

.pv-delivery-question {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.5;
}

.pv-delivery-question svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--delivery-gold);
}

.pv-delivery-answer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.pv-delivery-answer {
  position: relative;
  min-width: 0;
  cursor: pointer;
}

.pv-delivery-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.pv-delivery-answer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 10px;
  border: 1px solid #dfe3e8;
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  transition: border-color .18s ease, background .18s ease;
}

.pv-delivery-radio:checked + .pv-delivery-answer-content {
  border-color: #b89650;
  background: linear-gradient(135deg, #fffdf8, #f5ecd8);
  color: #76571f;
}

.pv-delivery-radio:focus-visible + .pv-delivery-answer-content {
  outline: 3px solid #b8965066;
  outline-offset: 3px;
}

.pv-delivery-radio:disabled + .pv-delivery-answer-content {
  opacity: .55;
  cursor: not-allowed;
}

.pv-delivery-dot {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border: 1px solid #c6cdd5;
  border-radius: 50%;
  background: #fff;
}

.pv-delivery-radio:checked
  + .pv-delivery-answer-content .pv-delivery-dot {
  border-color: #a37c32;
}

.pv-delivery-radio:checked
  + .pv-delivery-answer-content .pv-delivery-dot::after {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #a37c32;
}

.pv-delivery-note {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 9px;
  background: #f4eddf;
  color: #806127;
  font-size: 11px;
  line-height: 1.6;
}

.pv-delivery-note--neutral {
  background: #eef1f4;
  color: var(--delivery-muted);
}

.pv-delivery-slots {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #e3e7ec;
}

.pv-delivery-slot-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--delivery-ink);
  font-size: 12px;
  font-weight: 650;
}

.pv-delivery-slot-heading svg {
  flex-shrink: 0;
  color: var(--delivery-gold);
}

.pv-delivery-slot-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, 155px), 1fr)
  );
  gap: 10px;
}

.pv-delivery-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 9px;
  width: 100%;
  min-width: 0;
  min-height: 88px;
  padding: 15px 32px 15px 13px;
  border: 1px solid #dfe3e8;
  border-radius: 12px;
  background: #fff;
  color: var(--delivery-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform .18s ease,
    border-color .18s ease,
    background .18s ease,
    box-shadow .18s ease;
}

.pv-delivery-slot[aria-pressed="true"] {
  border-color: #b89650;
  background: linear-gradient(135deg, #fffdf8, #f5ecd8);
  box-shadow: 0 3px 10px #a37c3210;
}

.pv-delivery-slot-day {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.pv-delivery-slot-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--delivery-muted);
  font-size: 11px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.pv-delivery-slot-time svg {
  flex-shrink: 0;
}

.pv-delivery-slot-check {
  position: absolute;
  top: 11px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #a37c32;
  color: #fff;
}

.pv-delivery-slot:focus-visible {
  outline: 3px solid #b8965066;
  outline-offset: 3px;
}

.pv-delivery-slot:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.pv-delivery-confirmation {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 11px;
  border: 1px solid #d6e5dc;
  border-radius: 10px;
  background: #f0f7f2;
  color: #326448;
  font-size: 11px;
  line-height: 1.6;
}

.pv-delivery-confirmation > svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.pv-delivery-confirmation strong {
  display: block;
  font-weight: 650;
}

@media (hover: hover) {
  .pv-delivery-slot:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: #b89650;
    box-shadow: 0 4px 12px #1823310a;
  }

  .pv-delivery-answer:hover
    .pv-delivery-radio:not(:disabled)
    + .pv-delivery-answer-content {
    border-color: #b89650;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pv-delivery-slot,
  .pv-delivery-answer-content {
    transition: none;
  }
}
`;

export default function ConsegnaSlotPicker({
  slots,
  selectedId,
  onChange,
  disabled = false,
  onStudentChange,
  hint = "Seleziona uno slot di consegna per continuare.",
  noDeliveryText = "Nessuna consegna prevista: puoi procedere al pagamento.",
}: Props) {
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const id = useId();

  const selectedSlot =
    slots.find((slot) => slot.id === selectedId) ?? null;

  useEffect(() => {
    onStudentChange(isStudent);
  }, [isStudent, onStudentChange]);

  // Elimina lo slot quando si sceglie No o non è più disponibile.
  useEffect(() => {
    if (
      selectedId !== null &&
      (isStudent === false || !slots.some((slot) => slot.id === selectedId))
    ) {
      onChange(null);
    }
  }, [isStudent, selectedId, slots, onChange]);

  return (
    <div className="pv-delivery">
      <style>{DELIVERY_STYLES}</style>

      <fieldset
        disabled={disabled}
        aria-describedby={isStudent === null ? `${id}-required` : undefined}
      >
        <legend>
          <span className="pv-delivery-question">
            <IconSchool size={20} aria-hidden="true" />
            <span>Sei uno studente universitario di Lecce?</span>
          </span>
        </legend>

        <div className="pv-delivery-answer-grid">
          <label className="pv-delivery-answer">
            <input
              className="pv-delivery-radio"
              type="radio"
              name={`${id}-student`}
              value="yes"
              checked={isStudent === true}
              onChange={() => setIsStudent(true)}
              required
            />

            <span className="pv-delivery-answer-content">
              <span className="pv-delivery-dot" aria-hidden="true" />
              Sì
            </span>
          </label>

          <label className="pv-delivery-answer">
            <input
              className="pv-delivery-radio"
              type="radio"
              name={`${id}-student`}
              value="no"
              checked={isStudent === false}
              onChange={() => setIsStudent(false)}
              required
            />

            <span className="pv-delivery-answer-content">
              <span className="pv-delivery-dot" aria-hidden="true" />
              No
            </span>
          </label>
        </div>
      </fieldset>

      {isStudent === null && (
        <p id={`${id}-required`} className="pv-delivery-note">
          Seleziona “Sì” oppure “No” per continuare.
        </p>
      )}

      {isStudent === true && (
        <div className="pv-delivery-slots">
          <fieldset
            disabled={disabled}
            aria-describedby={!selectedSlot ? `${id}-slot-hint` : undefined}
          >
            <legend>
              <span className="pv-delivery-slot-heading">
                <IconCalendar size={17} aria-hidden="true" />
                Scegli giorno e orario
              </span>
            </legend>

            {slots.length > 0 ? (
              <div className="pv-delivery-slot-grid">
                {slots.map((slot) => {
                  const selected = slot.id === selectedId;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className="pv-delivery-slot"
                      aria-pressed={selected}
                      onClick={() => onChange(slot.id)}
                    >
                      {selected && (
                        <span
                          className="pv-delivery-slot-check"
                          aria-hidden="true"
                        >
                          <IconCheck size={12} />
                        </span>
                      )}

                      <span className="pv-delivery-slot-day">
                        {slot.dayLabel}
                      </span>

                      <span className="pv-delivery-slot-time">
                        <IconClock size={14} aria-hidden="true" />
                        {slot.timeRange}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p
                id={`${id}-slot-hint`}
                className="pv-delivery-note pv-delivery-note--neutral"
              >
                Nessuno slot disponibile al momento.
              </p>
            )}
          </fieldset>

          {slots.length > 0 && !selectedSlot && (
            <p id={`${id}-slot-hint`} className="pv-delivery-note">
              {hint}
            </p>
          )}

          {selectedSlot && (
            <div className="pv-delivery-confirmation" role="status">
              <IconCheck size={17} aria-hidden="true" />

              <div>
                <strong>Consegna selezionata</strong>
                {selectedSlot.dayLabel} · {selectedSlot.timeRange}
              </div>
            </div>
          )}
        </div>
      )}

      {isStudent === false && (
        <p
          className="pv-delivery-note pv-delivery-note--neutral"
          role="status"
        >
          {noDeliveryText}
        </p>
      )}
    </div>
  );
}