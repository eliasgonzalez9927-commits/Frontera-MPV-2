# FRONTERA — Documento Madre del Proyecto

Última actualización: 11 de agosto de 2026
Founder: Elías (Mendoza, Argentina — 26 años, cofundador de Pinta MKT)
Propósito de este doc: contexto base para Claude Code. Todo lo que se sabe del proyecto, su historia, mercado y decisiones abiertas.

## 1. Qué es Frontera

Frontera nació en 2021/2022 como "la primera obra social online de Argentina". El documento original (armado por Elías a los ~21 años, antes de que existiera ChatGPT o Claude) incluía:

* Problema, solución y arquetipos de usuario
* Análisis FODA
* Definición de MVP
* Proyección financiera a 5 años y modelo de monetización
* 3.000 encuestas realizadas como validación
* Mercado identificado: ~28 millones de personas con cobertura médica en Argentina
* Inversión estimada en su momento: USD 11.000 (app nativa, devs, UX/UI)

El proyecto quedó archivado 4 años. En junio de 2026 Elías lo retomó, lo mostró a gente del ecosistema y decidió construirlo en paralelo a Pinta. En agosto de 2026 se retoma en serio, con avances técnicos ya hechos en Codex.

## 2. El problema (sigue vigente)

La experiencia del usuario con obras sociales en Argentina es pésima:

* Nadie responde
* Todo es papel
* La gestión de turnos es un desastre
* Recetas, autorizaciones y consultas administrativas son burocracia pura

Esta validación de 2022 sigue siendo cierta en 2026 y es la base del proyecto.

## 3. Las dos visiones (decisión estratégica ABIERTA)

**Visión A — Obra social 100% digital (la original, "lo mío")**: Ser la obra social. Máximo upside, máxima diferenciación. La burocracia y las habilitaciones médicas que asustaban en 2022 son también el moat: lo que hace difícil que otros entren. Elías expresó preferencia por esta visión ("iría por lo mío"), aunque quedó en evaluar.

**Visión B — Capa tecnológica sobre obras sociales existentes**: No ser la obra social, sino la infraestructura digital que se monta arriba de las existentes: bot/plataforma que gestiona turnos, recetas, consultas y trámites para cualquier obra social o prepaga. No requiere habilitaciones médicas ni inversión pesada. Ejecutable hoy con el stack que Elías ya domina.

Canales: la intención declarada es tener ambos canales, con instinto de que B2C tracciona y vende más (y da tracción visible para inversores), evaluando B2B (venderle la tecnología a obras sociales y clínicas) en paralelo.

⚠️ **Claude Code: antes de tomar decisiones de arquitectura que casen el producto con una visión, confirmar con Elías cuál está construyendo.** El MVP puede diseñarse para que la Visión B sea el camino de entrada hacia la Visión A.

## 4. Mercado y competencia (datos actualizados a junio 2026)

* Mercado de salud digital en LatAm: USD 5.755 millones en 2024, proyectado a USD 13.025 millones para 2034. Argentina es el segundo mercado de la región después de Brasil.
* Competidor directo principal: Cormos (fusión de DrApp + iTurnos + Docturno). Levantó USD 10 millones, procesa 18 millones de turnos al año con 14.000 médicos activos. En 2022 no existía.
* Viento regulatorio a favor: Argentina avanza hacia digitalización del 100% para 2026, con receta electrónica e historia clínica digital integrándose a plataformas estatales.
* El TAM base sigue siendo los ~28M de personas con cobertura, pero el framing debe actualizarse según la visión elegida (A o B) y el canal (B2C vs B2B).

Pendiente: rehacer TAM/SAM/SOM formal (el original fue marcado como desactualizado). Análisis competitivo profundo de Cormos y otros players post-2022.

## 5. Validación y red de contactos

* Eros — amigo de Elías, trabaja en una startup de salud en Buenos Aires. Vio el proyecto completo en junio 2026: le gustó, confirmó que el pitch estaba bien armado, y señaló que el TAM/SAM/SOM y el análisis estaban desactualizados. Es el sparring de confianza del proyecto.
* Contactos identificados en evento de founders/inversores en Buenos Aires (junio 2026) como targets estratégicos:
  * Marcel Araujo Rocha — EnLite Health Solutions (salud + tech)
  * Claudio Fatone — Medifé Empresas (prepaga; conocimiento del sistema desde adentro)
  * Constanza Segamarchi — Merck (farmacéutica; relevante si hay e-commerce farmacéutico en la visión)
  * Mauro Cerrillo — Urólogo, Mendoza

## 6. El founder y su contexto

* Elías, 26 años. Cofundador y 50% de Pinta (NEKTAR CON PINTA MKT S.A.S.), agencia de marketing digital en Godoy Cruz, Mendoza, ~12 personas. Socia: Emilia.
* Pinta es la fuente de oxígeno financiero. Estrategia definida: Pinta en orden + Frontera en paralelo, cada uno en su carril. Frontera como proyecto propio a partir de la segunda mitad de 2026.
* Stack y experiencia que trae al proyecto: bots de WhatsApp (Meta native + ManyChat), automatizaciones con N8N, WhatsApp Business API (Twilio/360dialog), integración con Claude API, Google Sheets/Excel como backend liviano, pauta Meta, embudos de conversión. Nivel técnico: configura APIs y automatizaciones; construye con IA (Claude Code, Codex).
* Patrón conocido a cuidar: arrancar cosas nuevas antes de que maduren las anteriores. Frontera se retoma con esa consciencia — consistencia sobre velocidad.

## 7. Estado técnico actual

Relevado directamente del repo `frontera-mvp` el 11 de agosto de 2026 por Claude Code.

* **Repo / historial**: 8 commits desde el scaffold de `create-next-app` (2 de julio de 2026): MVP de triaje con Supabase → robustez del flujo de casos → ingreso multi-clínica vía QR → wizard conversacional de pre-triaje → modo de orientación general → gestión de clínicas + tokens hasheados → acceso admin con usuario/contraseña.
* **Stack**: Next.js 16.2.10 (App Router) + React 19 + TypeScript + Tailwind v4. Backend: Supabase (Postgres) vía `@supabase/supabase-js`. No hay integración de WhatsApp en el código todavía, pese a que el copy de la landing la menciona ("Online por web/WhatsApp") — hoy la interacción es 100% web.
* **¿Qué se construyó?** Un flujo de **pre-triaje digital para guardias/urgencias**:
  * *Paciente* (`/pretriaje`): wizard conversacional con 3 modos de entrada (`clinic_qr`, `onsite_unknown`, `needs_orientation`), preguntas con "banderas rojas", clasificación de prioridad (ROJO/NARANJA/AMARILLO/VERDE), genera un caso con código → resultado en `/pretriaje/resultado/[caseCode]`.
  * *Clínica* (`/clinica/qr`, `/clinica/dashboard`, `/clinica/casos/[caseCode]`): ingreso de pacientes vía QR de guardia, panel de casos, auth propia (`lib/clinicAuth.ts`, tokens hasheados en Supabase).
  * *Admin* (`/admin/clinicas`): alta/gestión de clínicas, login usuario/contraseña (`lib/adminAuth.ts`).
  * API routes espejando cada flujo bajo `/api/*`.
* **Estructura**: `app/` (rutas), `lib/` (auth admin/clínica, lógica de triage y casos — `lib/triage.ts` y `lib/adminAuth.ts` son los módulos más grandes, ~150-200 líneas c/u), `supabase/` (3 migraciones SQL: `triage_cases`, `clinic_token_hashes`, `multiclinic_qr`). Sin capa de testing ni CI visibles.
* **¿Qué visión implementa?** Ninguna de las dos tal cual están descritas en la Sección 3. Lo construido es más angosto: pre-triaje de urgencias para clínicas (B2B con clínicas), sin conceptos de afiliados, cobertura, planes ni facturación — así que no asume ser la obra social (Visión A). Tampoco es exactamente la Visión B tal como está descrita (turnos + recetas + trámites para una obra social existente). Podría leerse como un primer caso de uso concreto dentro de la Visión B, o como un producto propio (software de triage para clínicas) que todavía no se decidió si es el ala B2C o el ala B2B del proyecto.
* **Qué funciona**: el flujo end-to-end paciente → caso → clínica parece armado completo (wizard, persistencia en Supabase, dashboard, auth de clínica y de admin).
* **Qué está a medias / deuda**: el canal WhatsApp (mencionado en el copy, no implementado). Y, más de fondo, el propio riesgo que señala la Sección 3: se siguió construyendo sin cerrar la decisión de visión A/B, así que el producto avanza sin ese contrato firmado.

## 8. Estado y prueba WhatsApp/OpenClaw (11 de agosto de 2026)

Documento de estado compartido con el equipo.

**Estado actual funcionando**:

* Web pública: https://frontera-mpv-2.vercel.app/
* Pre-triaje general: https://frontera-mpv-2.vercel.app/pretriaje
* Pre-triaje WhatsApp: https://frontera-mpv-2.vercel.app/pretriaje?source=whatsapp
* Admin de clínicas: https://frontera-mpv-2.vercel.app/admin/clinicas
* Dashboard clínico por clínica: `/clinica/dashboard?clinic=slug`
* QR institucional por clínica: `/clinica/qr?clinic=slug`

**Flujos funcionando**:

1. Paciente entra desde web, QR o WhatsApp.
2. Completa pre-triaje conversacional.
3. El sistema detecta señales rojas.
4. Clasifica prioridad.
5. Crea caso real en Supabase.
6. Muestra resultado al paciente.
7. El equipo clínico ve el caso en dashboard.
8. El equipo puede abrir detalle y cambiar estado: `waiting → in_review → attended`.

**Admin de clínicas**: permite crear una clínica de prueba sin tocar Supabase manualmente. Desde `/admin/clinicas` se puede crear clínica ingresando solo el nombre, generar slug automáticamente, generar token de acceso, ver/copiar QR, ver/copiar dashboard, copiar kit completo, activar/desactivar clínica, regenerar token.

Acceso temporal de demo:

* Usuario: `admin`
* Contraseña: `frontera-demo-2026`

⚠️ Esta contraseña es temporal, quedó documentada en texto plano acá por decisión explícita del equipo — **rotar después de la demo** (ver punto 9 de próximos pasos).

**WhatsApp / OpenClaw**: se conectó OpenClaw con WhatsApp. Número conectado: `+5492617261009`.

Estado probado: OpenClaw instalado, gateway corriendo, WhatsApp vinculado, canal `frontera` conectado, mensaje real enviado y recibido correctamente.

Mensaje probado: *"Hola, soy Frontera. Para iniciar el pre-triaje entrá acá: https://frontera-mpv-2.vercel.app/pretriaje?source=whatsapp"* — destino de prueba `+5492613335734` — resultado: recibido correctamente.

Comandos usados:

```
openclaw channels add --channel whatsapp --account frontera
openclaw channels login --channel whatsapp --account frontera
openclaw config set gateway.mode local
openclaw config set gateway.auth.mode none
openclaw gateway run
```

Para enviar mensaje:

```
openclaw message send --channel whatsapp --account frontera --target +549XXXXXXXXXX --message "Hola, soy Frontera. Para iniciar el pre-triaje entrá acá: https://frontera-mpv-2.vercel.app/pretriaje?source=whatsapp"
```

**Alcance actual de WhatsApp**: por ahora funciona como canal de entrada liviano — envía link al pre-triaje, identifica origen como `source=whatsapp`, el caso se guarda en Supabase, el dashboard puede ver que viene desde WhatsApp.

Todavía no hay: bot conversacional completo por WhatsApp, IA, geolocalización, recomendación de clínicas cercanas, ambulancias, WhatsApp Business API oficial.

**Seguridad**:

* Supabase usa service role solo desde backend; no se exponen keys en frontend.
* Las clínicas usan tokens hasheados; el token de clínica se muestra una sola vez al crear/regenerar.
* Admin tiene usuario/contraseña temporal (ver arriba, rotar post-demo).
* OpenClaw está corriendo local para demo.

**Nota sobre visión (ver Sección 3)**: este piloto conecta WhatsApp como canal de entrada liviano (solo envía el link de pre-triaje) — es infraestructura que sirve tanto a la Visión B (bot que gestiona trámites sobre obras sociales existentes) como a un canal B2C independiente del pre-triaje de guardia. Todavía no resuelve la decisión de visión, pero es el tipo de pieza reutilizable en cualquiera de los dos caminos.

## 9. Agente conversacional de triage por WhatsApp (11 de agosto de 2026)

Se recuperó el estilo de triage conversacional de la versión Lovable (`frontera-ai-triage.lovable.app` — chat libre, preguntas de seguimiento dinámicas, clasificación MTS, resumen estructurado) y se lo llevó al canal WhatsApp real usando el agente de OpenClaw ya conectado.

**Arquitectura**: se creó un agente aislado de OpenClaw llamado `triage` (identidad "🩺 Frontera"), separado del agente `main` genérico, con su propio workspace en `~/.openclaw/workspace-triage`:

* `SOUL.md` — protocolo de triage: una pregunta a la vez, detección de señales rojas con escalamiento inmediato a ROJO, clasificación MTS (🔴🟠🟡🟢), estilo WhatsApp (sin headers, bold/CAPS), disclaimer obligatorio, y una regla de privacidad explícita (cada sesión de WhatsApp es un paciente distinto y anónimo — sin memoria cruzada entre conversaciones).
* `TOOLS.md` — contrato exacto del endpoint `POST /api/triage-cases`: el agente conversa y extrae datos (motivo, evolución, síntomas, señales rojas detectadas), pero **la clasificación de prioridad la sigue calculando el servidor** (`lib/triage.ts`), no el LLM — evita duplicar lógica clínica en dos lugares.
* Bindeado a `whatsapp:frontera` (`openclaw agents bind --agent triage --bind whatsapp:frontera`) — todo mensaje entrante al +5492617261009 lo maneja este agente.

**Bug encontrado y corregido en el camino**: `app/api/triage-cases/route.ts` ignoraba el `source` recibido (`"web" | "qr" | "whatsapp"`) salvo que el caso estuviera atado a una clínica (`clinic_slug`) — cualquier caso de WhatsApp sin clínica asociada quedaba mal etiquetado como `"web"`. Se corrigió (`const source = submittedSource;`), commiteado en `b1d308f`.

**Probado**: turno de agente simulado end-to-end (`openclaw agent --agent triage --message ...`, sin `--deliver`) — el agente hizo la pregunta de seguimiento correcta, clasificó AMARILLO, llamó al endpoint real y generó el caso `FR-2CA0FAEC781741D9`, verificado en Supabase vía API. **Todavía no probado con un mensaje real entrante por WhatsApp** (el primer intento del equipo falló porque no había ninguna auth de modelo configurada en OpenClaw — se resolvió con `openclaw models auth login --provider openai`). Bloqueante conocido: mientras el fix del bug de `source` no esté deployado (pendiente de `git push`), los casos reales por WhatsApp van a seguir etiquetándose como "web" en producción.

**Próximo paso obligado**: mandar un mensaje real al +5492617261009 y confirmar que (a) el bot responde solo, sin intervención, y (b) el caso aparece en `/admin/clinicas` / dashboard con `source: whatsapp` una vez deployado el fix.

## 10. Próximos pasos sugeridos

1. Documentar el avance de Codex en la sección 7 (o generar un CLAUDE.md del repo con ese contexto). ✅ hecho arriba a partir de lo relevado en el repo — falta que Elías confirme/corrija con lo que sabe de Codex que no esté en el código actual.
2. Definir la visión del MVP (A, B o B-como-puente-hacia-A) antes de seguir construyendo features.
3. Rehacer TAM/SAM/SOM con datos 2026 y la visión elegida.
4. Análisis competitivo de Cormos — qué hacen bien, qué dejan descubierto, dónde entra Frontera.
5. Definir el primer caso de uso B2C concreto (ej.: turnos + recetas por WhatsApp para afiliados de una obra social específica) y validarlo con Eros y los contactos de salud.
6. Mantener el ritmo en paralelo a Pinta: sesiones consistentes, sin sprint suicida.
7. Prueba completa con clínica: crear clínica de prueba en `/admin/clinicas` → copiar kit completo → mostrar/escanear QR → completar pre-triaje → ver caso en dashboard clínico → probar entrada WhatsApp con link.
8. Rotar la contraseña admin temporal (`frontera-demo-2026`) después de la demo.
9. Pushear el fix de `source` (commit `b1d308f`) y confirmar deploy en Vercel.
10. Mandar un mensaje real al +5492617261009 para probar el agente `triage` en producción (ver Sección 9) y confirmar que el caso queda con `source: whatsapp`.

Este documento consolida todo el historial de Frontera en conversaciones con Claude (junio 2026 en adelante) más el contexto del proyecto original de 2021/2022. Actualizarlo a medida que el proyecto avance — es la fuente de verdad.
