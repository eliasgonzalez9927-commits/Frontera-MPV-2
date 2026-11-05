"use client";

import { Mail, MapPin } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { contrastRatio } from "@/lib/v2/design/contrast";
import { f2Colors, f2ProvisionalMuted, type F2ColorToken } from "@/lib/v2/design/tokens";
import { stages } from "@/lib/v2/stages";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ChoiceCard } from "../ui/ChoiceCard";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DigitalPass } from "../ui/DigitalPass";
import { HelpSheet } from "../ui/HelpSheet";
import { Logo } from "../ui/Logo";
import { Notice } from "../ui/Notice";
import { DateField } from "../ui/DateField";
import { ScaleInput } from "../ui/ScaleInput";
import { SelectField } from "../ui/SelectField";
import { EmptyState, ErrorScreen, LoadingState } from "../ui/StatusScreen";
import { StageProgress } from "../ui/StageProgress";
import { TextArea, TextField } from "../ui/TextField";

const viewports = [320, 375, 390, 430, 1024] as const;

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-f2-border py-10">
      <h2 id={id} className="f2-title">
        {title}
      </h2>
      {note && <p className="f2-body mt-1 max-w-[62ch] text-f2-muted">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-f2-border bg-f2-surface p-5">
      <p className="f2-label mb-4 text-f2-muted">{label}</p>
      {children}
    </div>
  );
}

const colorNotes: Partial<Record<F2ColorToken, string>> = {
  muted: "Reemplaza al gris provisional #667976",
  control: "Borde de controles (≥ 3:1)",
};

const contrastPairs: Array<[string, string, string]> = [
  ["Texto principal sobre fondo", f2Colors.ink, f2Colors.bg],
  ["Texto secundario sobre fondo", f2Colors.muted, f2Colors.bg],
  ["Texto secundario sobre superficie", f2Colors.muted, f2Colors.surface],
  ["Marca sobre superficie", f2Colors.brand, f2Colors.surface],
  ["Blanco sobre marca (botón)", f2Colors.surface, f2Colors.brand],
  ["Error sobre superficie", f2Colors.danger, f2Colors.surface],
];

export function DesignSystemGallery() {
  const [single, setSingle] = useState("self");
  const [multi, setMulti] = useState<string[]>(["dolor"]);
  const [scale, setScale] = useState<number | null>(4);
  const [text, setText] = useState("");
  const [docType, setDocType] = useState("");
  const [birth, setBirth] = useState({ day: "", month: "", year: "" });
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [viewport, setViewport] = useState<(typeof viewports)[number]>(390);

  const toggleMulti = (value: string, checked: boolean) =>
    setMulti((current) => (checked ? [...current, value] : current.filter((v) => v !== value)));

  const simulateLoading = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1800);
  };

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-8 md:py-12">
      <Notice variant="alert" title="Solo desarrollo">
        Esta galería no es parte del producto del paciente. Es la referencia del design system de
        Frontera 2.0 (Hito 2).
      </Notice>

      <header className="mt-8">
        <Logo />
        <h1 className="f2-hero mt-6">Design system</h1>
        <p className="f2-body mt-2 max-w-[62ch] text-f2-muted">
          Tokens, tipografía y componentes base del portal del paciente. Usá Tab para ver los
          estados de foco; los botones y opciones tienen áreas táctiles de al menos 48 px.
        </p>
      </header>

      <Section id="color" title="Color" note="Todos los pares de texto pasan WCAG AA (verificado por test). Los valores viven en CSS custom properties --f2-*.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {(Object.entries(f2Colors) as Array<[F2ColorToken, string]>).map(([token, hex]) => (
            <div key={token} className="overflow-hidden rounded-xl border border-f2-border bg-f2-surface">
              <div className="h-14" style={{ backgroundColor: hex }} />
              <div className="p-3">
                <p className="f2-label text-f2-ink">{token}</p>
                <p className="f2-support font-mono text-f2-muted">{hex}</p>
                {colorNotes[token] && <p className="f2-support mt-1 text-f2-muted">{colorNotes[token]}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-f2-border bg-f2-surface">
          <table className="f2-body w-full min-w-[480px] text-left">
            <caption className="sr-only">Contraste de pares de color</caption>
            <thead>
              <tr className="f2-label border-b border-f2-border text-f2-muted">
                <th scope="col" className="p-3">Par</th>
                <th scope="col" className="p-3">Ratio</th>
                <th scope="col" className="p-3">AA</th>
              </tr>
            </thead>
            <tbody>
              {contrastPairs.map(([name, fg, bg]) => {
                const ratio = contrastRatio(fg, bg);
                return (
                  <tr key={name} className="border-b border-f2-border last:border-0">
                    <td className="p-3">{name}</td>
                    <td className="p-3 font-mono">{ratio.toFixed(2)}:1</td>
                    <td className="p-3">{ratio >= 4.5 ? "Cumple" : "No cumple"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="f2-support mt-3 max-w-[62ch] text-f2-muted">
          Decisión documentada: el gris provisional {f2ProvisionalMuted} da{" "}
          {contrastRatio(f2ProvisionalMuted, f2Colors.bg).toFixed(2)}:1 sobre el fondo (no llega a
          4.5:1). Se usa {f2Colors.muted} ({contrastRatio(f2Colors.muted, f2Colors.bg).toFixed(2)}:1).
        </p>
      </Section>

      <Section id="tipografia" title="Tipografía" note="Inter. Ningún texto baja de 14 px; el contenido de lectura parte de 16 px.">
        <div className="space-y-5 rounded-2xl border border-f2-border bg-f2-surface p-5">
          {[
            ["Hero · 32/36 (40/44 desde tablet)", "f2-hero", "Preparemos tu ingreso"],
            ["Título de pantalla · 24/30", "f2-title", "Antes de comenzar"],
            ["Pregunta · 22/28 (26/32 desde tablet)", "f2-question", "¿Qué te está pasando?"],
            ["Subtítulo · 18/26", "f2-subtitle", "Información de privacidad"],
            ["Cuerpo · 16/24", "f2-body", "Contanos con tus palabras, no necesitás términos médicos."],
            ["Texto de apoyo · 15/22", "f2-support", "Podés corregir cualquier respuesta antes de enviar."],
            ["Opción · 17/24", "f2-option", "Para otra persona"],
            ["Botón · 17/24", "f2-button", "Continuar"],
            ["Etiqueta · 14/20", "f2-label", "Nombre y apellido"],
            ["Mensaje de error · 14/20", "f2-error", "Ingresá una fecha válida."],
          ].map(([label, cls, sample]) => (
            <div key={cls}>
              <p className="f2-label text-f2-muted">{label}</p>
              <p className={`${cls} mt-1 text-f2-ink`}>{sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="botones" title="Botones" note="Altura mínima 52 px. Primario, secundario, texto y destructivo; con estados deshabilitado y cargando.">
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="Variantes">
            <div className="flex flex-col gap-3">
              <Button>Comenzar</Button>
              <Button variant="secondary">Volver</Button>
              <Button variant="ghost">Ver información de privacidad</Button>
              <Button variant="danger">Salir y borrar respuestas</Button>
            </div>
          </Specimen>
          <Specimen label="Estados">
            <div className="flex flex-col gap-3">
              <Button disabled>Continuar (deshabilitado)</Button>
              <Button variant="secondary" disabled>
                Volver (deshabilitado)
              </Button>
              <Button loading={loading} onClick={simulateLoading}>
                {loading ? "Enviando…" : "Simular envío"}
              </Button>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section id="opciones" title="Opciones de respuesta" note="Selección única (radio) y múltiple (checkbox). El estado seleccionado usa borde, fondo e indicador con forma — no solo color.">
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="Selección única">
            <ChoiceGroup headingLevel={3} legend="¿Para quién estás haciendo esta consulta?" required>
              <ChoiceCard type="radio" name="g-single" value="self" checked={single === "self"} onChange={() => setSingle("self")} label="Para mí" />
              <ChoiceCard
                type="radio"
                name="g-single"
                value="other"
                checked={single === "other"}
                onChange={() => setSingle("other")}
                label="Para otra persona"
                description="Un menor a cargo, un adulto acompañado u otra persona."
              />
            </ChoiceGroup>
          </Specimen>

          <Specimen label="Selección múltiple">
            <ChoiceGroup headingLevel={3} legend="¿Notás algo más?" description="Podés elegir varias opciones.">
              <ChoiceCard type="checkbox" name="g-multi" value="dolor" checked={multi.includes("dolor")} onChange={(c) => toggleMulti("dolor", c)} label="Dolor" />
              <ChoiceCard type="checkbox" name="g-multi" value="mareo" checked={multi.includes("mareo")} onChange={(c) => toggleMulti("mareo", c)} label="Mareo" />
              <ChoiceCard type="checkbox" name="g-multi" value="ninguno" checked={multi.includes("ninguno")} onChange={(c) => toggleMulti("ninguno", c)} label="Nada de lo anterior" />
            </ChoiceGroup>
          </Specimen>

          <Specimen label="Con error">
            <ChoiceGroup headingLevel={3} legend="Elegí una opción" required error="Elegí una opción para continuar.">
              <ChoiceCard type="radio" name="g-error" value="a" checked={false} onChange={() => {}} label="Opción A" invalid />
              <ChoiceCard type="radio" name="g-error" value="b" checked={false} onChange={() => {}} label="Opción B" invalid />
            </ChoiceGroup>
          </Specimen>

          <Specimen label="Deshabilitada y con ícono">
            <div className="flex flex-col gap-3">
              <ChoiceCard type="radio" name="g-dis" value="a" checked={false} onChange={() => {}} label="No disponible" disabled />
              <ChoiceCard type="radio" name="g-icon" value="b" checked onChange={() => {}} label="Estoy en la institución" icon={<MapPin className="size-5" />} />
            </div>
          </Specimen>
        </div>
      </Section>

      <Section id="campos" title="Campos de texto" note="Etiqueta visible, ayuda y error asociados con aria-describedby. Tamaño de 17 px para evitar zoom automático en iOS.">
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="Texto">
            <div className="space-y-5">
              <TextField label="Nombre" placeholder="Ej.: Ana" autoComplete="off" />
              <TextField label="Contacto" optional hint="Un teléfono o email por si necesitamos avisarte." placeholder="Ej.: nombre@ejemplo.com" type="email" />
              <TextField label="Fecha de nacimiento" defaultValue="31/02/2000" error="Ingresá una fecha válida." />
              <TextField label="Campo deshabilitado" disabled defaultValue="No editable" />
            </div>
          </Specimen>

          <Specimen label="Texto largo y escala">
            <div className="space-y-6">
              <TextArea
                label="¿Qué te está pasando?"
                hint="No necesitás usar términos médicos."
                placeholder="Ej.: Me duele la panza desde anoche y no puedo comer."
                value={text}
                maxLength={500}
                showCount
                onChange={(event) => setText(event.target.value)}
              />
              <div>
                <p className="f2-label mb-2 text-f2-ink" id="scale-label">
                  Intensidad (demostración)
                </p>
                <ScaleInput name="scale" value={scale} onChange={setScale} minLabel="Muy leve" maxLabel="Muy fuerte" />
              </div>
            </div>
          </Specimen>
          <Specimen label="Selector y fecha">
            <div className="space-y-6">
              <SelectField
                label="Tipo de documento"
                hint="Si no tenés DNI, elegí pasaporte u otro documento de tu país."
                placeholder="Elegí una opción"
                options={[
                  { value: "dni", label: "DNI" },
                  { value: "passport", label: "Pasaporte" },
                  { value: "none", label: "No tengo documento a mano" },
                ]}
                value={docType}
                onChange={(event) => setDocType(event.target.value)}
              />
              <DateField
                legend="Fecha de nacimiento"
                hint="Día, mes y año. Por ejemplo: 15 / 06 / 1990."
                day={birth.day}
                month={birth.month}
                year={birth.year}
                onChange={(part, value) => setBirth((current) => ({ ...current, [part]: value }))}
              />
              <DateField
                legend="Con error"
                day="31"
                month="02"
                year="2000"
                error="Esa fecha no existe. Revisá el día y el mes."
                onChange={() => {}}
              />
            </div>
          </Specimen>
        </div>
      </Section>

      <Section id="avisos" title="Avisos" note="Cada variante combina ícono, título y color. Úsalos para información, alertas y confirmaciones.">
        <div className="grid gap-3 md:grid-cols-2">
          <Notice variant="info" title="Información">Frontera no reemplaza una evaluación médica.</Notice>
          <Notice variant="success" title="Listo">Tus respuestas se guardaron en este prototipo.</Notice>
          <Notice variant="alert" title="Atención">Revisá los datos antes de continuar.</Notice>
          <Notice variant="danger" title="Si es una emergencia">Acercate al personal o contactá a emergencias.</Notice>
        </div>
      </Section>

      <Section id="progreso" title="Progreso por etapas" note="Texto + barra segmentada. La etapa actual es más alta y se anuncia como progressbar.">
        <div className="space-y-5 rounded-2xl border border-f2-border bg-f2-surface p-5">
          {stages.map((stage) => (
            <StageProgress key={stage.id} current={stage.id} />
          ))}
        </div>
      </Section>

      <Section id="overlays" title="Diálogos y ayuda" note="Basados en <dialog> nativo: foco atrapado, Escape y retorno de foco. Hoja inferior en móvil.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" fullWidth={false} onClick={() => setConfirmOpen(true)}>
            Abrir confirmación de salida
          </Button>
          <Button variant="secondary" fullWidth={false} onClick={() => setHelpOpen(true)}>
            Abrir ayuda
          </Button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="¿Querés salir?"
          description="Tenés respuestas cargadas. Si salís ahora, se pierden."
          confirmLabel="Salir"
          cancelLabel="Seguir completando"
          destructive
          onConfirm={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
        />
        <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
      </Section>

      <Section id="estados" title="Carga, vacío y error">
        <div className="grid gap-4 md:grid-cols-3">
          <Specimen label="Cargando">
            <LoadingState label="Preparando tu pase…" />
          </Specimen>
          <Specimen label="Estado vacío">
            <EmptyState headingLevel={3} title="Todavía no hay respuestas" description="Cuando respondas las preguntas, vas a verlas acá." />
          </Specimen>
          <Specimen label="Error">
            <ErrorScreen headingLevel={3} title="No pudimos continuar" description="Revisá tu conexión e intentá de nuevo.">
              <Button iconLeft={<Mail className="size-5" />}>Reintentar</Button>
            </ErrorScreen>
          </Specimen>
        </div>
      </Section>

      <Section id="pase" title="Pase digital ilustrativo" note="QR decorativo, marcado como no válido. No contiene información ni representa un turno.">
        <div className="mx-auto max-w-[360px]">
          <DigitalPass institutionName="Hospital Demo Frontera" episodeCode="DEMO-0000-FICT" patientName="Paciente de ejemplo" />
        </div>
      </Section>

      <Section id="responsive" title="Responsive" note="Shell real (encabezado, progreso, contenido y footer de acciones) en 320, 375, 390, 430 px y escritorio.">
        <div role="group" aria-label="Ancho de la vista previa" className="flex flex-wrap gap-2">
          {viewports.map((width) => (
            <button
              key={width}
              type="button"
              aria-pressed={viewport === width}
              onClick={() => setViewport(width)}
              className={`f2-label f2-focus min-h-11 rounded-xl border-2 px-4 ${
                viewport === width
                  ? "border-f2-brand bg-f2-brand text-white"
                  : "border-f2-control bg-f2-surface text-f2-ink hover:bg-f2-brand-soft"
              }`}
            >
              {width === 1024 ? "Escritorio" : `${width} px`}
            </button>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-f2-border bg-f2-border/40 p-4">
          <iframe
            title={`Vista previa a ${viewport} píxeles`}
            src="/v2/demo/preview"
            style={{ width: viewport, height: 720 }}
            className="mx-auto block max-w-none rounded-xl border border-f2-border bg-f2-bg"
          />
        </div>
        <p className="f2-support mt-3 text-f2-muted">
          El footer de acciones queda fijo abajo y respeta el área segura de iOS.
        </p>
      </Section>

      <ActionFooterNote />
    </main>
  );
}

// Muestra el footer en su contexto, sin fijarlo a la galería.
function ActionFooterNote() {
  return (
    <Section id="footer" title="Footer de acciones" note="Acción primaria arriba, secundaria debajo, ambas a ancho completo.">
      <div className="max-w-[560px] overflow-hidden rounded-2xl border border-f2-border">
        <ActionFooter note="Podés volver y corregir antes de enviar.">
          <Button>Continuar</Button>
          <Button variant="secondary">Volver</Button>
        </ActionFooter>
      </div>
    </Section>
  );
}
