function TFRRequirementProgress(relic, data) {
  const reqs = relic.hiddenRequirements || [];
  const done = reqs.filter(r => data.requirements?.[r.id]).length;
  return { done, total: reqs.length, complete: reqs.length > 0 && done === reqs.length };
}

function TFRRenderDashboardSummary(relic, data) {
  const stage = data.stage || TFRStageFromAffinity(data.value || 0);
  const displayStage = TFRDisplayStage(stage, data.signatureUnlocked);
  const mood = data.mood || TFRMoodFromAffinity(data.value || 0);
  const signature = data.signatureUnlocked ? TFRT("Unlocked") : TFRT("Sealed");

  return `
    <div class="tfr-summary-grid">
      <div class="tfr-summary-card"><span>${TFRT("Affinity")}</span><strong>${data.value || 0}/1000</strong></div>
      <div class="tfr-summary-card"><span>${TFRT("Stage")}</span><strong>${TFREscapeHtml(TFRStageLabel(displayStage))}</strong></div>
      <div class="tfr-summary-card"><span>${TFRT("Mood")}</span><strong>${TFREscapeHtml(TFRMoodLabel(mood))}</strong></div>
      <div class="tfr-summary-card"><span>${TFRT("Signature")}</span><strong>${TFREscapeHtml(signature)}</strong></div>
    </div>
  `;
}

function TFRRenderDashboardAttunementConsent(data) {
  const refusing = !!data.refusesAttunement;
  return `
    <section class="tfr-attunement-control${refusing ? " is-refusing" : ""}">
      <label class="tfr-attunement-toggle">
        <input type="checkbox" name="refusesAttunement" ${refusing ? "checked" : ""}>
        <span>
          <strong>${TFRT("Relic Refuses Attunement")}</strong>
          <small>${TFRT("While enabled, no bearer can attune or use this relic, and its passive bonuses are suppressed. Press Save to apply.")}</small>
        </span>
      </label>
      <i class="fa-solid fa-brain" aria-hidden="true"></i>
    </section>
  `;
}


function TFRRenderRequirements(relic, data) {
  const reqs = relic.hiddenRequirements || [];
  if (!reqs.length) return "";
  return `
    <h3>${TFRT("Hidden Requirements")}</h3>
    <ul class="tfr-hidden-reqs">
      ${reqs.map(req => {
        const checked = data.requirements?.[req.id] ? "checked" : "";
        return `<li><label><input type="checkbox" name="req-${TFREscapeHtml(req.id)}" data-req-id="${TFREscapeHtml(req.id)}" ${checked}> ${TFREscapeHtml(req.label)}</label></li>`;
      }).join("")}
    </ul>
  `;
}

function TFRRenderDreams(relic, data) {
  const dreams = relic.dreams || [];
  if (!dreams.length) return "";
  return `
    <h3>${TFRT("Dreams")}</h3>
    <ul class="tfr-dreams">
      ${dreams.map(d => {
        const sent = data.dreamsSent?.[d.id];
        const sentText = sent ? ` <em>${TFRT("sent {date}", { date: new Date(sent).toLocaleDateString() })}</em>` : "";
        return `<li><strong>${TFREscapeHtml(d.title)}</strong> — ${TFREscapeHtml(TFRStageLabel(d.stage))}, ${TFRT("{value}+ affinity", { value: d.affinityMin })}${sentText}<br><button type="button" data-dream-id="${TFREscapeHtml(d.id)}">${TFRT("Send Dream")}</button></li>`;
      }).join("")}
    </ul>
  `;
}

function TFRRenderMemories(relic, data) {
  const memories = relic.memories || [];
  if (!memories.length) return "";
  return `
    <h3>${TFRT("Memories")}</h3>
    <ul class="tfr-memories">
      ${memories.map(m => {
        const unlocked = !!data.memoriesUnlocked?.[m.id];
        return `<li><strong>${unlocked ? "◆" : "◇"} ${TFREscapeHtml(m.title)}</strong>${unlocked ? `<br>${TFREscapeHtml(m.text || "")}` : ""}<br><button type="button" data-memory-id="${TFREscapeHtml(m.id)}">${unlocked ? TFRT("Show Again") : TFRT("Unlock Memory")}</button></li>`;
      }).join("")}
    </ul>
  `;
}



function TFRActivateDashboardTab(html, tab = "overview") {
  const root = TFRSheetHtmlElement(html);
  if (!root) return;
  const safeTab = tab || "overview";
  root.querySelectorAll(".tfr-tab-button").forEach(b => b.classList.toggle("active", b.dataset.tab === safeTab));
  root.querySelectorAll(".tfr-tab-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === safeTab));
  if (!root.querySelector(`.tfr-tab-panel[data-panel="${safeTab}"]`)) {
    root.querySelector('.tfr-tab-button[data-tab="overview"]')?.classList.add("active");
    root.querySelector('.tfr-tab-panel[data-panel="overview"]')?.classList.add("active");
    TFR_DASHBOARD_LAST_TAB = "overview";
  }
}

function TFRSafeCssToken(value, fallback = "overview") {
  const text = String(value || fallback);
  return /^[a-zA-Z0-9_-]+$/.test(text) ? text : fallback;
}

// Save/Sync pencereyi kapatmaz: pencere aynı yerde yenilenmiş verilerle yeniden açılır.
async function TFRRefreshDashboard(app, relicId) {
  const { left, top, width, height } = app.position;
  await TFROpenDashboard(relicId, { position: { left, top, width, height } });
  await app.close();
}

async function TFROpenDashboard(relicId = null, { position = null } = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn(TFRT("The First Relics: only the GM can open the Affinity Dashboard."));
    return;
  }

  const relics = await TFRLoadRelics();
  const relic = relics.find(r => r.id === relicId) || relics[0];

  if (!relic) {
    ui.notifications.warn(TFRT("The First Relics: no relic found for the dashboard."));
    return;
  }

  const data = await TFRGetRelicState(relic.id);
  data.mood = data.mood || TFRMoodFromAffinity(data.value);
  data.stage = data.stage || TFRStageFromAffinity(data.value);
  await TFRSetRelicState(relic.id, data);

  const relicOptions = relics.map(r => `<option value="${r.id}" ${r.id === relic.id ? "selected" : ""}>${r.name}</option>`).join("");

  const timeline = (data.timeline || []).slice(-10).reverse().map(t => {
    const date = t.time ? new Date(t.time).toLocaleString() : "";
    return `<li><strong>${date}</strong> — ${t.reason || TFRT("No note")} <em>(${t.value})</em></li>`;
  }).join("");

  const content = `
  <div class="tfr-dashboard tfr-dashboard-resizable tfr-dashboard-tabs" data-active-tab="${TFRSafeCssToken(TFR_DASHBOARD_LAST_TAB)}">
    <div class="form-group tfr-relic-picker">
      <label>${TFRT("Relic")}</label>
      <select name="relic">${relicOptions}</select>
    </div>

    <h2>${relic.name}</h2>
    ${TFRRenderDashboardSummary(relic, data)}

    <nav class="tfr-tabs-nav">
      <button type="button" class="tfr-tab-button active" data-tab="overview">${TFRT("Overview")}</button>
      <button type="button" class="tfr-tab-button" data-tab="affinity">${TFRT("Affinity")}</button>
      <button type="button" class="tfr-tab-button" data-tab="control">${TFRT("Control Panel")}</button>
      <button type="button" class="tfr-tab-button" data-tab="debug">${TFRT("Debug")}</button>
    </nav>

    <section class="tfr-tab-panel active" data-panel="overview">
      <p><strong>${TFRT("Unique Relic:")}</strong> ${TFRT("This relic exists only once in the world.")}</p>
      <p><strong>${TFRT("Virtue:")}</strong> ${relic.virtue}</p>
      <p><strong>${TFRT("Theme:")}</strong> ${relic.theme || ""}</p>
      <p><strong>${TFRT("Affinity Rule:")}</strong> ${TFRT("This relic gains or loses affinity through its own virtue-specific events.")}</p>
      ${TFRRenderDashboardAttunementConsent(data)}
      ${relic.trueName ? `<p><strong>${TFRT("True Name:")}</strong> ${data.signatureUnlocked ? relic.trueName.full : "???"}</p>` : ""}

      ${relic.personality ? `
        <div class="tfr-personality-box">
          <p><strong>${TFRT("Personality:")}</strong> ${relic.personality.temperament.join(", ")}</p>
          <p><strong>${TFRT("Likes:")}</strong> ${relic.personality.likes.join(", ")}</p>
          <p><strong>${TFRT("Dislikes:")}</strong> ${relic.personality.dislikes.join(", ")}</p>
          <p><em>${relic.personality.corePhrase}</em></p>
        </div>
      ` : ""}

      ${relic.automationStatus ? `
        <div class="tfr-automation-box">
          <p><strong>${TFRT("Automation:")}</strong> ${TFRT("Passives {passives}, Actives {actives}, Avatar {avatar}, Signature {signature}", relic.automationStatus)}</p>
          <ul>${(relic.automationStatus.notes || []).map(n => `<li>${n}</li>`).join("")}</ul>
        </div>
      ` : ""}
    </section>

    <section class="tfr-tab-panel" data-panel="affinity">
      <div class="tfr-affinity-box">
        <label>${TFRT("Affinity")}</label>
        <input type="number" name="affinity" min="0" max="1000" value="${data.value || 0}">
        <div class="tfr-affinity-bar">
          <div class="tfr-affinity-fill" style="width:${Math.clamp(data.value || 0, 0, 1000) / 10}%"></div>
        </div>
        <p><strong>${TFRT("Mood:")}</strong> ${TFRMoodLabel(data.mood || TFRMoodFromAffinity(data.value))}</p>
        <p><strong>${TFRT("Suggested Stage:")}</strong> ${TFRStageLabel(TFRDisplayStage(TFRStageFromAffinity(data.value), TFRSignatureUnlockedFromAffinity(data.value)))}</p>
        <p><strong>${TFRT("Current Recorded Stage:")}</strong> ${TFRStageLabel(TFRDisplayStage(data.stage || "dormant", data.signatureUnlocked))}</p>
        <p><strong>${TFRT("Signature:")}</strong> ${data.signatureUnlocked ? TFRT("Unlocked") : TFRT("Sealed")}</p>
      </div>

      <div class="tfr-delta-row">
        <button type="button" data-delta="-50">-50</button>
        <button type="button" data-delta="-25">-25</button>
        <button type="button" data-delta="-10">-10</button>
        <button type="button" data-delta="10">+10</button>
        <button type="button" data-delta="25">+25</button>
        <button type="button" data-delta="50">+50</button>
      </div>

      <div class="form-group">
        <label>${TFRT("Relic-Specific Affinity Event")}</label>
        <select name="affinityEvent">
          <option value="">${TFRT("Manual / No preset event")}</option>
          ${TFREventOptions(relic)}
        </select>
      </div>

      <div class="form-group">
        <label>${TFRT("Timeline Note")}</label>
        <textarea name="note" placeholder="${TFRT("Example: Protected the sacred grove, freed prisoners, solved prophecy...")}"></textarea>
      </div>
    </section>

    <section class="tfr-tab-panel" data-panel="control">
      ${TFRControlPanelHtmlV2()}
    </section>

    <section class="tfr-tab-panel" data-panel="debug">
      <h3>${TFRT("Debug / Maintenance")}</h3>
      <p>${TFRT("Save also syncs the relic item stage.")}</p>
      <p>${TFRT("Console helpers:")}</p>
      <pre>await FirstRelics.auditInventorySync()
await FirstRelics.syncAllInventoryStages()</pre>
    </section>
  </div>
  `;

  const field = (root, name) => root.querySelector(`[name='${name}']`);

  const dialog = new foundry.applications.api.DialogV2({
    classes: ["tfr-dialog"],
    window: { title: TFRT("The First Relics — GM Affinity Dashboard"), resizable: true },
    position: { width: 760, height: 720, ...(position ?? {}) },
    form: { closeOnSubmit: false },
    content,
    buttons: [
      {
        action: "save",
        label: TFRT("Save"),
        default: true,
        callback: async (event, button, app) => {
          const root = app.element;
          const selectedRelic = field(root, "relic")?.value;
          const selectedRelicData = await TFRGetRelicById(selectedRelic);
          const selectedEventId = field(root, "affinityEvent")?.value;
          const selectedEvent = selectedEventId ? TFRGetAffinityEvent(selectedRelicData, selectedEventId) : null;
          const currentValue = Number(field(root, "affinity")?.value || 0);
          const noteText = field(root, "note")?.value;
          const refusesAttunement = !!field(root, "refusesAttunement")?.checked;

          await TFRSetRelicAttunementRefusal(selectedRelic, refusesAttunement);

          const beforeSaveState = await TFRGetRelicState(selectedRelic);
          beforeSaveState.requirements = beforeSaveState.requirements || {};
          for (const req of (selectedRelicData.hiddenRequirements || [])) {
            const input = root.querySelector(`[data-req-id="${req.id}"]`);
            if (input) beforeSaveState.requirements[req.id] = !!input.checked;
          }
          await TFRSetRelicState(selectedRelic, beforeSaveState);

          if (selectedEvent) {
            const newValue = Math.clamp(currentValue + Number(selectedEvent.delta || 0), 0, 1000);
            const sign = selectedEvent.delta >= 0 ? "+": "";
            const reason = noteText || `${sign}${selectedEvent.delta} [${selectedEvent.category}] ${selectedEvent.label}`;
            await TFRSetRelicAffinity(selectedRelic, newValue, reason);
          } else {
            const note = noteText || "Manual dashboard edit";
            await TFRSetRelicAffinity(selectedRelic, currentValue, note);
          }
          await TFRRefreshDashboard(app, selectedRelic);
        }
      },
      { action: "close", label: TFRT("Close"), callback: (event, button, app) => app.close() }
    ]
  });

  await dialog.render({ force: true });
  const root = dialog.element;

  field(root, "relic")?.addEventListener("change", ev => {
    const { left, top, width, height } = dialog.position;
    dialog.close();
    TFROpenDashboard(ev.currentTarget.value, { position: { left, top, width, height } });
  });

  root.querySelectorAll(".tfr-tab-button").forEach(button => button.addEventListener("click", ev => {
    const tab = ev.currentTarget.dataset.tab || "overview";
    TFR_DASHBOARD_LAST_TAB = tab;
    TFRActivateDashboardTab(root, tab);
  }));

  field(root, "refusesAttunement")?.addEventListener("change", ev => {
    ev.currentTarget.closest(".tfr-attunement-control")?.classList.toggle("is-refusing", !!ev.currentTarget.checked);
  });

  TFRActivateDashboardTab(root, TFR_DASHBOARD_LAST_TAB);
  root.querySelector('.tfr-tab-panel[data-panel="control"] > p:first-child')?.remove();
  TFRWireControlPanel(root);

  root.querySelectorAll("[data-delta]").forEach(button => button.addEventListener("click", ev => {
    const input = field(root, "affinity");
    if (!input) return;
    const current = Number(input.value || 0);
    const delta = Number(ev.currentTarget.dataset.delta || 0);
    input.value = Math.clamp(current + delta, 0, 1000);
    const fill = root.querySelector(".tfr-affinity-fill");
    if (fill) fill.style.width = `${Number(input.value) / 10}%`;
  }));
}


async function TFRApplyAffinityEvent(relicId, eventId, extraNote = "") {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const relic = await TFRGetRelicById(relicId);
  if (!relic) return ui.notifications.warn(TFRT("The First Relics: Relic not found: {relicId}", { relicId: relicId }));
  const event = TFRGetAffinityEvent(relic, eventId);
  if (!event) return ui.notifications.warn(TFRT("The First Relics: Event not found: {eventId}", { eventId: eventId }));
  const state = await TFRGetRelicState(relicId);
  const newValue = Math.clamp((Number(state.value) || 0) + Number(event.delta || 0), 0, 1000);
  const sign = event.delta >= 0 ? "+" : "";
  const reason = extraNote || `${sign}${event.delta} [${event.category}] ${event.label}`;
  return TFRSetRelicAffinity(relicId, newValue, reason);
}


