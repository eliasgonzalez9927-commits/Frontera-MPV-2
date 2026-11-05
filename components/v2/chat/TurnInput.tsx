"use client";

import { Check, FlaskConical } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { demoComplaints } from "@/lib/v2/fixtures/demoComplaints";
import { contextLabels, relationshipLabels } from "@/lib/v2/flow/labels";
import type { DemoScenarioId, FlowState, PatientContext, Relationship } from "@/lib/v2/flow/state";
import type { ChatTurn } from "@/lib/v2/chat/turns";
import { toggleMultiple } from "@/lib/v2/questionnaires/selection";
import type { AnswerValue, Question } from "@/lib/v2/questionnaires/types";
import { questionnaireForState } from "@/lib/v2/questionnaires";
import { validateAnswer } from "@/lib/v2/questionnaires/validation";
import { COMPLAINT_MAX_LENGTH, validateComplaint } from "@/lib/v2/validation/complaint";
import {
  CONTACT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  documentTypeLabels,
  validateBirthDate,
  validateContact,
  validateDocument,
  validateName,
  type DocumentType,
} from "@/lib/v2/validation/identification";
import { cn } from "@/lib/v2/utils/cn";
import { Button } from "../ui/Button";
import { ChoiceCard } from "../ui/ChoiceCard";
import { DateField } from "../ui/DateField";
import { FieldError } from "../ui/FieldError";
import { ScaleInput } from "../ui/ScaleInput";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";

/** Lo que una respuesta le pide al estado. La pantalla del chat decide cómo aplicarlo. */
export type Commit =
  | { kind: "context"; value: PatientContext }
  | { kind: "relationship"; value: Relationship }
  | { kind: "ack" }
  | { kind: "complaint"; text: string }
  | { kind: "demoComplaint"; scenario: DemoScenarioId; text: string }
  | { kind: "question"; stepId: string; value: AnswerValue | null }
  | { kind: "id_name"; firstName: string; lastName: string }
  | { kind: "id_document"; documentType: DocumentType; documentNumber: string }
  | { kind: "id_birth"; day: string; month: string; year: string }
  | { kind: "id_contact"; contact: string }
  | { kind: "demoIdentity" };

type TurnInputProps = {
  turn: ChatTurn;
  state: FlowState;
  now: Date;
  /** id del globo de Frontera que formula esta pregunta (nombre accesible del grupo). */
  labelledBy: string;
  onCommit: (commit: Commit) => void;
  onOpenPrivacy: () => void;
};

// ——— Piezas comunes ———

function ChoiceButtons({
  labelledBy,
  options,
  value,
  onPick,
}: {
  labelledBy: string;
  options: Array<{ id: string; label: string; description?: string }>;
  value?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-col gap-3">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(option.id)}
            className={cn(
              "f2-option f2-focus flex min-h-[52px] w-full items-start justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
              selected ? "border-f2-brand bg-f2-brand-soft" : "border-f2-control bg-f2-surface hover:bg-f2-brand-soft"
            )}
          >
            <span className="min-w-0">
              <span className="block break-words">{option.label}</span>
              {option.description && (
                <span className="f2-support mt-0.5 block font-normal text-f2-muted">{option.description}</span>
              )}
            </span>
            {selected && <Check className="mt-0.5 size-5 shrink-0 text-f2-brand" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

function ChatTextArea({
  labelledBy,
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  errorId,
  className,
}: {
  labelledBy: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string | null;
  errorId: string;
  className?: string;
}) {
  return (
    <div>
      <textarea
        aria-labelledby={labelledBy}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "f2-option f2-focus w-full resize-y rounded-xl border-2 bg-f2-surface px-4 py-3 text-f2-ink placeholder:text-f2-muted/80",
          error ? "border-f2-danger" : "border-f2-control",
          className
        )}
      />
      {maxLength && (
        <p className="f2-support mt-1 text-right text-f2-muted" aria-live="off">
          {value.length} / {maxLength}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function DemoBox({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed border-f2-warn-border bg-f2-warn-soft/50 p-3">
      <p className="f2-label flex items-center gap-2 text-f2-warn">
        <FlaskConical className="size-4" aria-hidden="true" />
        {title}
      </p>
      <p className="f2-support mt-1 text-f2-muted">{hint}</p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

// ——— Una entrada por tipo de pregunta ———

function QuestionInput({
  question,
  state,
  labelledBy,
  onCommit,
}: {
  question: Question;
  state: FlowState;
  labelledBy: string;
  onCommit: (commit: Commit) => void;
}) {
  const stored = state.answers[question.id];
  const [draft, setDraft] = useState<AnswerValue | undefined>(stored);
  const [showError, setShowError] = useState(false);
  const error = showError ? validateAnswer(question, draft) : null;
  const errorId = `${question.id}-chat-error`;

  const commit = (value: AnswerValue | null) => onCommit({ kind: "question", stepId: question.id, value });

  function submit() {
    if (validateAnswer(question, draft) !== null) {
      setShowError(true);
      return;
    }
    commit(draft === undefined || (typeof draft === "string" && draft.trim() === "") ? null : draft);
  }

  switch (question.type) {
    case "single":
      return (
        <ChoiceButtons
          labelledBy={labelledBy}
          options={question.options}
          value={typeof stored === "string" ? stored : undefined}
          onPick={(id) => commit(id)}
        />
      );

    case "confirm":
      return (
        <ChoiceButtons
          labelledBy={labelledBy}
          options={[{ id: "confirm", label: question.confirmLabel }]}
          value={stored === true ? "confirm" : undefined}
          onPick={() => commit(true)}
        />
      );

    case "info":
      return <Button onClick={() => commit(null)}>Entendido</Button>;

    case "multiple": {
      const selected = Array.isArray(draft) ? draft : [];
      return (
        <div>
          <fieldset aria-labelledby={labelledBy} className="min-w-0 border-0 p-0">
            <div className="flex flex-col gap-3">
              {question.options.map((option) => (
                <ChoiceCard
                  key={option.id}
                  type="checkbox"
                  name={question.id}
                  value={option.id}
                  label={option.label}
                  description={option.description}
                  checked={selected.includes(option.id)}
                  invalid={Boolean(error)}
                  onChange={(checked) => {
                    const next = toggleMultiple(question, selected, option.id, checked);
                    setDraft(next.length > 0 ? next : undefined);
                  }}
                />
              ))}
            </div>
          </fieldset>
          {error && <FieldError id={errorId}>{error}</FieldError>}
          <div className="mt-4">
            <Button variant={selected.length === 0 && !question.required ? "secondary" : "primary"} onClick={submit}>
              {selected.length === 0 && !question.required ? "Omitir" : "Listo"}
            </Button>
          </div>
        </div>
      );
    }

    case "scale":
      return (
        <div>
          <fieldset aria-labelledby={labelledBy} className="min-w-0 border-0 p-0">
            <ScaleInput
              name={question.id}
              min={question.min}
              max={question.max}
              value={typeof draft === "number" ? draft : null}
              onChange={(value) => setDraft(value ?? undefined)}
              minLabel={question.minLabel}
              maxLabel={question.maxLabel}
              invalid={Boolean(error)}
            />
          </fieldset>
          {error && <FieldError id={errorId}>{error}</FieldError>}
          <div className="mt-4">
            <Button variant={draft === undefined && !question.required ? "secondary" : "primary"} onClick={submit}>
              {draft === undefined && !question.required ? "Omitir" : "Listo"}
            </Button>
          </div>
        </div>
      );

    case "text": {
      const text = typeof draft === "string" ? draft : "";
      return (
        <div>
          <ChatTextArea
            labelledBy={labelledBy}
            value={text}
            onChange={(value) => setDraft(value === "" ? undefined : value)}
            placeholder={question.placeholder}
            maxLength={question.validation?.maxLength}
            error={error}
            errorId={errorId}
            className="min-h-28"
          />
          <div className="mt-3">
            <Button variant={text.trim() === "" && !question.required ? "secondary" : "primary"} onClick={submit}>
              {text.trim() === "" && !question.required ? "Omitir" : "Enviar"}
            </Button>
          </div>
        </div>
      );
    }
  }
}

// ——— Entrada del turno activo (o del que se está corrigiendo) ———

export function TurnInput({ turn, state, now, labelledBy, onCommit, onOpenPrivacy }: TurnInputProps) {
  switch (turn.kind) {
    case "context":
      return (
        <ChoiceButtons
          labelledBy={labelledBy}
          options={[
            { id: "self", label: contextLabels.self },
            { id: "other", label: contextLabels.other, description: "Un menor a cargo, un adulto acompañado u otra persona." },
          ]}
          value={state.patientContext ?? undefined}
          onPick={(id) => onCommit({ kind: "context", value: id as PatientContext })}
        />
      );

    case "relationship":
      return (
        <ChoiceButtons
          labelledBy={labelledBy}
          options={[
            { id: "minor", label: relationshipLabels.minor, description: "Una persona menor de edad de la que estás a cargo." },
            { id: "accompanied_adult", label: relationshipLabels.accompanied_adult, description: "Una persona adulta que responde con tu ayuda." },
            { id: "cannot_respond", label: relationshipLabels.cannot_respond, description: "Por ejemplo, porque no puede comunicarse en este momento." },
          ]}
          value={state.relationship ?? undefined}
          onPick={(id) => onCommit({ kind: "relationship", value: id as Relationship })}
        />
      );

    case "ack":
      return (
        <div className="flex flex-col gap-2">
          <Button onClick={() => onCommit({ kind: "ack" })}>Entendido, sigamos</Button>
          <Button variant="ghost" onClick={onOpenPrivacy}>
            Cómo se usa tu información
          </Button>
        </div>
      );

    case "complaint":
      return <ComplaintInput state={state} labelledBy={labelledBy} onCommit={onCommit} />;

    case "question": {
      const question = questionnaireForState(state).steps[turn.stepId ?? ""];
      if (!question) return null;
      // `key` reinicia el borrador al pasar a otra pregunta.
      return <QuestionInput key={question.id} question={question} state={state} labelledBy={labelledBy} onCommit={onCommit} />;
    }

    case "id_name":
      return <NameInput state={state} onCommit={onCommit} />;
    case "id_document":
      return <DocumentInput state={state} onCommit={onCommit} />;
    case "id_birth":
      return <BirthInput state={state} now={now} onCommit={onCommit} />;
    case "id_contact":
      return <ContactInput state={state} onCommit={onCommit} />;
  }
}

function ComplaintInput({
  state,
  labelledBy,
  onCommit,
}: {
  state: FlowState;
  labelledBy: string;
  onCommit: (commit: Commit) => void;
}) {
  const [text, setText] = useState(state.complaint);
  const [showError, setShowError] = useState(false);
  const error = showError ? validateComplaint(text) : null;

  function submit() {
    if (validateComplaint(text) !== null) {
      setShowError(true);
      return;
    }
    onCommit({ kind: "complaint", text });
  }

  return (
    <div>
      <ChatTextArea
        labelledBy={labelledBy}
        value={text}
        onChange={setText}
        placeholder="Ej.: Me duele la panza desde anoche y no puedo comer."
        maxLength={COMPLAINT_MAX_LENGTH}
        error={error}
        errorId="complaint-chat-error"
        className="min-h-32"
      />
      <div className="mt-3">
        <Button onClick={submit}>Enviar</Button>
      </div>

      <DemoBox title="Solo demostración · ejemplos" hint="Textos ficticios para probar. No uses datos reales.">
        {demoComplaints.map((demo) => (
          <Button
            key={demo.id}
            variant="secondary"
            onClick={() => onCommit({ kind: "demoComplaint", scenario: demo.id, text: demo.text })}
          >
            {demo.label}
          </Button>
        ))}
      </DemoBox>
    </div>
  );
}

function NameInput({ state, onCommit }: { state: FlowState; onCommit: (commit: Commit) => void }) {
  const [first, setFirst] = useState(state.identification.firstName);
  const [last, setLast] = useState(state.identification.lastName);
  const [submitted, setSubmitted] = useState(false);
  const firstError = validateName(first, "nombre");
  const lastError = validateName(last, "apellido");

  function submit() {
    if (firstError || lastError) {
      setSubmitted(true);
      return;
    }
    onCommit({ kind: "id_name", firstName: first.trim(), lastName: last.trim() });
  }

  return (
    <div>
      <div className="space-y-4">
        <TextField
          label="Nombre"
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH}
          value={first}
          error={submitted ? (firstError ?? undefined) : undefined}
          onChange={(event) => setFirst(event.target.value)}
        />
        <TextField
          label="Apellido"
          hint="Si tenés un solo nombre y no tenés apellido, repetí el nombre."
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH}
          value={last}
          error={submitted ? (lastError ?? undefined) : undefined}
          onChange={(event) => setLast(event.target.value)}
        />
      </div>
      <div className="mt-4">
        <Button onClick={submit}>Enviar</Button>
      </div>

      <DemoBox title="Solo demostración · datos de ejemplo" hint="Completa todos los datos con valores ficticios.">
        <Button variant="secondary" onClick={() => onCommit({ kind: "demoIdentity" })}>
          Completar con datos de ejemplo
        </Button>
      </DemoBox>
    </div>
  );
}

const documentOptions = (Object.keys(documentTypeLabels) as DocumentType[]).map((value) => ({
  value,
  label: documentTypeLabels[value],
}));

function DocumentInput({ state, onCommit }: { state: FlowState; onCommit: (commit: Commit) => void }) {
  const [type, setType] = useState<DocumentType | "">(state.identification.documentType);
  const [number, setNumber] = useState(state.identification.documentNumber);
  const [submitted, setSubmitted] = useState(false);
  const error = validateDocument(type, type === "none" ? "" : number);
  const hasNumber = type !== "" && type !== "none";

  function submit() {
    if (error || type === "") {
      setSubmitted(true);
      return;
    }
    onCommit({ kind: "id_document", documentType: type, documentNumber: type === "none" ? "" : number });
  }

  return (
    <div>
      <div className="space-y-4">
        <SelectField
          label="Tipo de documento"
          placeholder="Elegí una opción"
          options={documentOptions}
          value={type}
          error={submitted && type === "" ? (error ?? undefined) : undefined}
          onChange={(event) => setType(event.target.value as DocumentType | "")}
        />
        {hasNumber && (
          <TextField
            label="Número de documento"
            autoComplete="off"
            inputMode={type === "dni" ? "numeric" : "text"}
            value={number}
            error={submitted ? (error ?? undefined) : undefined}
            onChange={(event) => setNumber(event.target.value)}
          />
        )}
      </div>
      <div className="mt-4">
        <Button onClick={submit}>Enviar</Button>
      </div>
    </div>
  );
}

function BirthInput({ state, now, onCommit }: { state: FlowState; now: Date; onCommit: (commit: Commit) => void }) {
  const [day, setDay] = useState(state.identification.birthDay);
  const [month, setMonth] = useState(state.identification.birthMonth);
  const [year, setYear] = useState(state.identification.birthYear);
  const [submitted, setSubmitted] = useState(false);
  const error = validateBirthDate(day, month, year, now);

  function submit() {
    if (error) {
      setSubmitted(true);
      return;
    }
    onCommit({ kind: "id_birth", day, month, year });
  }

  return (
    <div>
      <DateField
        legend="Fecha de nacimiento"
        hint="Día, mes y año. Por ejemplo: 15 / 06 / 1990."
        day={day}
        month={month}
        year={year}
        error={submitted ? (error ?? undefined) : undefined}
        onChange={(part, value) => (part === "day" ? setDay(value) : part === "month" ? setMonth(value) : setYear(value))}
      />
      <div className="mt-4">
        <Button onClick={submit}>Enviar</Button>
      </div>
    </div>
  );
}

function ContactInput({ state, onCommit }: { state: FlowState; onCommit: (commit: Commit) => void }) {
  const [contact, setContact] = useState(state.identification.contact);
  const [submitted, setSubmitted] = useState(false);
  const error = validateContact(contact);
  const empty = contact.trim() === "";

  function submit() {
    if (error) {
      setSubmitted(true);
      return;
    }
    onCommit({ kind: "id_contact", contact: contact.trim() });
  }

  return (
    <div>
      <TextField
        label="Email o teléfono"
        optional
        autoComplete="off"
        maxLength={CONTACT_MAX_LENGTH}
        value={contact}
        error={submitted ? (error ?? undefined) : undefined}
        onChange={(event) => setContact(event.target.value)}
      />
      <div className="mt-4">
        <Button variant={empty ? "secondary" : "primary"} onClick={submit}>
          {empty ? "Prefiero no dejar contacto" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
