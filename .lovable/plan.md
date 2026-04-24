

# Auditoría forense + Bloque #1: Bandeja de Chat con Handoff Humano

## Matriz de hallazgos prioritarios

| # | Módulo | Estado | Acción | Justificación |
|---|--------|--------|--------|---------------|
| 1 | **Caso maestro** (`service_cases` + 7 tabs) | ✅ Implementado completo | **Mantener** | Cubre datos fallecido, estados 4 áreas, checklist, docs, historial, cotización, pagos |
| 2 | **Lead → Cotización → Caso** | ✅ Trigger `auto_create_service_case` + `lead_id` FK + sync pipeline | **Mantener** | Flujo end-to-end ya operativo |
| 3 | **Estados comercial/operativo/documental/financiero** | ✅ 4 columnas + `case_status_log` + trigger | **Mantener** | Bitácora automática funcional |
| 4 | **Expediente documental** (`case_documents` + bucket `payment-proofs`) | ✅ CRUD + RLS | **Complementar leve** | Falta bucket dedicado `case-documents` (usa `payment-proofs` reciclado) |
| 5 | **Checklist operativo** (`case_milestones`) | ✅ Implementado | **Mantener** | |
| 6 | **Pagos / cuotas / cobranza** (`payment_transactions` + `recalc_case_payments`) | ✅ Implementado con auto-recálculo | **Mantener** | |
| 7 | **Timeline + auditoría** (`audit_logs`, `case_status_log`, `lead_activities`, `agenda_event_history`) | ✅ 4 fuentes | **Refactorizar visual** (consolidar lectura en `CaseHistoryTab`) |
| 8 | **Dashboard 360** | ✅ 674 líneas con KPIs | **Mantener** |
| 9 | **Chat tipo WhatsApp + handoff humano** | ❌ **Solo bot público sin persistencia ni bandeja** | **IMPLEMENTAR (crítico)** | Único módulo faltante |

**Decisión**: ejecutar solo el **Bloque #9 (Chat con handoff)** ahora. Resto queda en cola de refinamiento (#7 luego, #4 al final).

---

## Bloque ejecutado ahora: Chat conversacional con bandeja interna estilo WhatsApp Web

### Punto de restauración
Se reutilizará el botón Revertir de Lovable sobre este mensaje. Toda la lógica nueva queda aislada en archivos nuevos; cero modificación destructiva sobre componentes existentes (excepto un import en `AdminLayout`).

### Arquitectura (reutiliza infraestructura existente)

```text
┌─ Visitante público ─┐
│ ChatboxFunerario ───┼─► chat-funerario (bot existente, se mantiene)
└──────────┬──────────┘
           │ Si pide "hablar con asesor" o usuario registra contacto
           ▼
┌─────────────────────────────────────────────────────────┐
│  NUEVO: chat_conversations + chat_messages              │
│  - vincula a contact_leads / service_cases existentes   │
│  - assigned_to (ejecutivo) + status (bot/humano)        │
│  - prioridad + SLA hereda de lead.urgency               │
└──────────┬──────────────────────────────────────────────┘
           │ Realtime (postgres_changes) → bandeja admin
           ▼
┌─ /admin/chat (NUEVO) ───────────────────────────────────┐
│ Lista conversaciones | Hilo de mensajes | Panel lead   │
│ + Notas internas + Tomar/Asignar + Vincular a Caso     │
└─────────────────────────────────────────────────────────┘
```

### Cambios de base de datos (1 migración nueva)

**Tablas nuevas:**
- `chat_conversations`: `id`, `lead_id` (FK lógica a `contact_leads`), `service_case_id` (FK lógica a `service_cases`), `visitor_name`, `visitor_phone`, `visitor_email`, `channel` (web/whatsapp_export), `status` (`bot` | `pendiente_humano` | `humano_activo` | `cerrado`), `priority` (`baja|normal|alta|urgente`), `assigned_to` (uuid), `last_message_at`, `unread_admin`, `unread_visitor`, `sla_due_at`, `metadata jsonb`, timestamps.
- `chat_messages`: `id`, `conversation_id`, `sender_type` (`visitor|bot|admin|system`), `sender_user_id`, `content`, `is_internal_note` (bool — visible solo a admin), `attachment_url`, `voice_url` (futuro), `read_by_admin_at`, `created_at`.

**RLS:**
- Admin/CEO: full read/write a ambas tablas.
- Visitante (anon): INSERT en `chat_messages` solo donde `conversation_id` exista y `sender_type='visitor'` (validado por edge function vía service role para no exponer la tabla).
- Visitante NO lee directamente — la conversación se entrega vía edge function autenticada por `conversation_token` en `localStorage`.

**Triggers:**
- `chat_message_after_insert`: actualiza `last_message_at`, incrementa `unread_admin/unread_visitor`, dispara `admin_notifications` cuando llega visitor msg en convo asignada o sin asignar.
- `chat_conversation_handoff`: cuando `status` cambia a `pendiente_humano`, fanout notificación urgente a admins disponibles.

**Realtime:** publicar `chat_conversations` y `chat_messages` en `supabase_realtime` (RLS de `realtime.messages` ya está reforzada — heredan controles).

### Edge functions nuevas (2)

1. **`chat-public-send`** (`verify_jwt = false`): valida bot-shield (honeypot/timing/throttle ya existentes), upserta conversación por `conversation_token`, inserta mensaje visitor, decide si seguir bot o marcar `pendiente_humano` (palabras clave: "asesor", "humano", "persona", "urgente" + intent fallecimiento). Si sigue bot, llama internamente al `chat-funerario` existente y persiste respuesta.
2. **`chat-public-poll`** (opcional, fallback si Realtime no disponible): devuelve mensajes nuevos por `conversation_token`.

### Frontend nuevo

**Público** (`src/components/ChatboxFunerario.tsx` — refactor mínimo, no rewrite):
- Cuando usuario escribe libre o pide asesor → en lugar de POST directo a `chat-funerario`, llama a `chat-public-send` que persiste.
- Genera `conversation_token` (uuid) en `localStorage`.
- Suscribe via Realtime al canal `chat-convo-${token}` para recibir respuestas humanas en tiempo real.
- Indicador "🟢 Asesor en línea" cuando `status='humano_activo'`.

**Admin** (rutas + componentes nuevos):
- `/admin/chat` → `AdminChat.tsx` (nueva página).
- Layout 3 columnas (responsive: stack en mobile):
  ```text
  ┌─ Lista convos ─┬─ Hilo mensajes ──────┬─ Panel contexto ─┐
  │ filtros:       │ burbujas WhatsApp     │ lead/caso link    │
  │ - todos        │ input + adjuntar      │ notas internas    │
  │ - sin asignar  │ toggle "nota interna" │ asignar ejecutivo │
  │ - míos         │ botón "Tomar control" │ prioridad + SLA   │
  │ - urgentes     │ → status=humano_activo│ crear caso        │
  └────────────────┴──────────────────────┴───────────────────┘
  ```
- Componentes:
  - `src/components/admin/chat/ConversationList.tsx`
  - `src/components/admin/chat/MessageThread.tsx`
  - `src/components/admin/chat/MessageBubble.tsx`
  - `src/components/admin/chat/ConversationContextPanel.tsx`
  - `src/components/admin/chat/HandoffControls.tsx`
- Sidebar: nuevo item **"Bandeja Chat"** con badge de no leídos. Visible para `admin` y `ceo`.
- Hook `src/hooks/use-chat-realtime.tsx` para subscribe global a `chat_conversations` y disparar sonido + toast en handoff.

### Vinculación CRM (sin duplicar)
- `chat_conversations.lead_id` y `service_case_id` → botones "Crear lead", "Vincular a lead existente", "Crear caso", "Abrir caso" en `ConversationContextPanel`.
- En `LeadDetailSheet` y `CaseDetailSheet`: tab nuevo **"Chat"** que renderiza `MessageThread` filtrado por `lead_id`/`service_case_id`. Cero duplicación de UI.

### Voz y llamada (alcance acotado)
- **Voz**: input audio del navegador (`MediaRecorder`) → upload a bucket `chat-attachments` (nuevo) → `voice_url` en `chat_messages`. Reproductor `<audio>` en burbuja.
- **Llamada**: botón "Llamar" abre `tel:` directo + registra mensaje system "Llamada iniciada por {admin}". Integración Twilio queda fuera de alcance este bloque (requiere conector — se propondría al CEO si lo solicita).

### SLA + prioridad
- `priority` se inicializa heredando de lead vinculado o por keywords detectados.
- `sla_due_at` calculado: urgente=15min, alta=1h, normal=4h, baja=24h.
- Badge rojo parpadeante cuando vencido.
- Cron `check-stale-cases` existente → extender para chequear convos vencidas y reabsignar/escalar.

### Detalles técnicos consolidados

| Aspecto | Decisión |
|---------|----------|
| Persistencia bot-msgs | Sí, todas las respuestas del bot se persisten (auditoría) |
| Token visitante | UUID en `localStorage` clave `fsm_chat_token` |
| Streaming bot | Mantenemos streaming SSE de `chat-funerario` solo para UX inmediata; persistimos al cierre del stream |
| Handoff trigger | Keywords + click explícito "Hablar con persona" + intent=fallecimiento |
| Notificación admin | Reutiliza `admin_notifications` + `useNotificationSound` + `useModuleRealtimeAlerts` |
| Adjuntos | Bucket nuevo `chat-attachments` (privado, signed URLs, max 5MB) |
| Auditoría | Cada handoff/asignación/cierre → `audit_logs` módulo `chat` |
| Mobile | Bandeja stack vertical con tab-switcher (Lista / Hilo / Contexto) |

### Archivos creados/modificados

**Migración nueva**: 1 archivo SQL con tablas, RLS, triggers, realtime publication, bucket.

**Edge functions nuevas**: `chat-public-send/index.ts`, `chat-public-poll/index.ts`.

**Frontend nuevo**:
- `src/pages/admin/AdminChat.tsx`
- `src/components/admin/chat/` (5 componentes listados arriba)
- `src/hooks/use-chat-realtime.tsx`
- `src/lib/chat-token.ts` (gestión token visitante)

**Frontend modificado (mínimo y reversible)**:
- `src/components/ChatboxFunerario.tsx`: agregar persistencia + Realtime subscribe (sin alterar UI)
- `src/components/admin/AdminLayout.tsx`: agregar nav item "Bandeja Chat"
- `src/App.tsx`: agregar ruta `/admin/chat`
- `src/components/admin/cases/CaseDetailSheet.tsx`: agregar tab "Chat"
- `src/components/admin/crm/LeadDetailSheet.tsx`: agregar tab "Chat"

### Impacto
- Cierra la **única brecha crítica** del CRM funerario.
- Cero duplicación: chat queda integrado a leads y casos como una vista más, no como sistema paralelo.
- Bot público sigue funcionando exactamente igual — solo gana persistencia y posibilidad de takeover.
- Habilita SLA real sobre conversaciones (hoy invisible).
- Notificaciones ya funcionan (reutiliza pipeline existente).

### Siguiente paso tras aprobación
1. Crear migración (tablas + RLS + triggers + bucket + realtime).
2. Crear edge function `chat-public-send`.
3. Refactor mínimo de `ChatboxFunerario` para persistir.
4. Construir página `/admin/chat` con 3 columnas + Realtime.
5. Agregar tabs Chat en `LeadDetailSheet` y `CaseDetailSheet`.
6. QA manual: simular convo visitante → ver llegada en bandeja → tomar control → responder → vincular a lead → crear caso.

Tras este bloque, los siguientes en cola serían: refinamiento timeline unificado (#7) y bucket dedicado para documentos de caso (#4).

