import "./07-settings.js"; // keeps the original load order
import { TFRT } from "./00-core.js";
import { TFRGetRelicById, TFRGetRelicState, TFRSetRelicState } from "./06-relic-state.js";

export function TFREventOptions(relic) {
  const events = relic.affinityEvents || [];
  return events.map(e => {
    const sign = e.delta >= 0 ? "+" : "";
    return `<option value="${e.id}">${sign}${e.delta} — [${e.category}] ${e.label}</option>`;
  }).join("");
}

export function TFRGetAffinityEvent(relic, eventId) {
  return (relic.affinityEvents || []).find(e => e.id === eventId);
}


export function TFREscapeHtml(value) {
  const text = String(value ?? "");
  if (globalThis.foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(text);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function TFRTimelineReason(type, label, note = "") {
  return `[${type}] ${label}${note ? ` — ${note}` : ""}`;
}

export async function TFRAddTimeline(relicId, type, label, note = "") {
  const data = await TFRGetRelicState(relicId);
  data.timeline = data.timeline || [];
  data.timeline.push({
    time: Date.now(),
    value: data.value || 0,
    type,
    reason: TFRTimelineReason(type, label, note)
  });
  await TFRSetRelicState(relicId, data);
  return data;
}

export async function TFRSetRequirement(relicId, requirementId, completed = true, note = "") {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(TFRT("Relic not found: {relicId}", { relicId: relicId }));
  const req = (relic.hiddenRequirements || []).find(r => r.id === requirementId);
  if (!req) return ui.notifications.warn(TFRT("Requirement not found: {requirementId}", { requirementId: requirementId }));

  const data = await TFRGetRelicState(relicId);
  data.requirements = data.requirements || {};
  data.requirements[requirementId] = !!completed;
  await TFRSetRelicState(relicId, data);
  await TFRAddTimeline(relicId, completed ? "Requirement Completed" : "Requirement Cleared", req.label, note);

  ui.notifications.info(completed
    ? TFRT("{relicName}: {reqLabel} completed.", { relicName: relic.name, reqLabel: req.label })
    : TFRT("{relicName}: {reqLabel} cleared.", { relicName: relic.name, reqLabel: req.label }));
  return data;
}

export async function TFRUnlockMemory(relicId, memoryId, note = "") {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(TFRT("Relic not found: {relicId}", { relicId: relicId }));
  const memory = (relic.memories || []).find(m => m.id === memoryId);
  if (!memory) return ui.notifications.warn(TFRT("Memory not found: {memoryId}", { memoryId: memoryId }));

  const data = await TFRGetRelicState(relicId);
  data.memoriesUnlocked = data.memoriesUnlocked || {};
  data.memoriesUnlocked[memoryId] = true;
  await TFRSetRelicState(relicId, data);
  await TFRAddTimeline(relicId, "Memory Unlocked", memory.title, note);

  ChatMessage.create({
    content: `<div class="first-relics-note"><h2>${TFRT("Memory Unlocked")}</h2><h3>${TFREscapeHtml(relic.name)}</h3><p><strong>${TFREscapeHtml(memory.title)}</strong></p><p>${TFREscapeHtml(memory.text || "")}</p></div>`
  });

  return data;
}

export async function TFRSendDream(relicId, dreamId, whisperToActorName = "") {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(TFRT("Relic not found: {relicId}", { relicId: relicId }));
  const dream = (relic.dreams || []).find(d => d.id === dreamId);
  if (!dream) return ui.notifications.warn(TFRT("Dream not found: {dreamId}", { dreamId: dreamId }));

  const data = await TFRGetRelicState(relicId);
  data.dreamsSent = data.dreamsSent || {};
  data.dreamsSent[dreamId] = Date.now();
  await TFRSetRelicState(relicId, data);
  await TFRAddTimeline(relicId, "Dream Sent", dream.title);

  const content = `<div class="first-relics-note"><h1>${TFREscapeHtml(dream.title)}</h1><h2>${TFREscapeHtml(relic.name)}</h2><p>${TFREscapeHtml(dream.text || "")}</p></div>`;

  const actor = whisperToActorName ? game.actors.getName(whisperToActorName) : null;
  const user = actor ? game.users.find(u => u.character?.id === actor.id) : null;

  ChatMessage.create({
    content,
    whisper: user ? [user.id] : undefined
  });

  return data;
}

