function TFRControlPanelHtml() {
  return TFRControlPanelHtmlV2();
}

function TFRControlButton(action, icon, label, detail = "") {
  return `
    <button type="button" class="tfr-control-button" data-tfr-action="${TFREscapeHtml(action)}" aria-label="${TFREscapeHtml(label)}">
      <i class="${TFREscapeHtml(icon)}" inert></i>
      <span>
        <strong>${TFREscapeHtml(label)}</strong>
        ${detail ? `<small>${TFREscapeHtml(detail)}</small>` : ""}
      </span>
    </button>
  `;
}

function TFRControlPanelResultSummary(result, fallbackLabel = "Action") {
  const summary = result?.summary || {};
  const rows = Array.isArray(result) ? result : (result?.rows || result?.checks || result?.testLabRows || []);
  const issueCount = Number(summary.issues ?? summary.failures ?? result?.issues?.length ?? rows.filter?.(row => row?.ok === false || row?.issue || row?.issues)?.length ?? 0);
  const status = String(summary.status || (result?.ok === false ? "NEEDS ATTENTION" : issueCount ? "NEEDS ATTENTION" : "READY")).trim();
  const tone = /NEEDS ATTENTION|WARNING|MISSING|FAILED/i.test(status) || issueCount > 0 || result?.ok === false
    ? "warn"
    : /READY|STABLE|PASSED|COMPLETE|DONE/i.test(status)
      ? "ready"
      : "neutral";
  const facts = [];
  if (summary.version !== undefined) facts.push(TFRT("Version: {value}", { value: summary.version }));
  if (summary.relics !== undefined) facts.push(TFRT("Relics: {value}", { value: summary.relics }));
  if (summary.activities !== undefined) facts.push(TFRT("Activities: {value}", { value: summary.activities }));
  if (summary.checks !== undefined) facts.push(TFRT("Checks: {value}", { value: summary.checks }));
  if (summary.cleaned !== undefined) facts.push(TFRT("Cleaned: {value}", { value: summary.cleaned }));
  if (summary.native !== undefined) facts.push(TFRT("Native: {value}", { value: summary.native }));
  if (summary.module !== undefined) facts.push(TFRT("Module: {value}", { value: summary.module }));
  if (summary.manualReminder !== undefined) facts.push(TFRT("Manual reminders: {value}", { value: summary.manualReminder }));
  facts.push(TFRT("Issues: {value}", { value: issueCount }));
  return {
    label: fallbackLabel,
    status,
    tone,
    issueCount,
    facts
  };
}

/** Display label for an audit status; the English status itself stays the machine-readable value. */
function TFRStatusLabel(status) {
  const labels = {
    "READY": TFRT("READY"),
    "READY FOR PLAYTEST": TFRT("READY FOR PLAYTEST"),
    "RELEASE READY": TFRT("RELEASE READY"),
    "NEEDS ATTENTION": TFRT("NEEDS ATTENTION"),
    "PASSED": TFRT("PASSED"),
    "COMPLETE": TFRT("COMPLETE"),
    "DONE": TFRT("DONE")
  };
  return labels[String(status || "").toUpperCase()] ?? status;
}

function TFRControlPanelResultHtml(result, fallbackLabel = "Action") {
  const data = TFRControlPanelResultSummary(result, fallbackLabel);
  return `
    <strong>${TFREscapeHtml(TFRStatusLabel(data.status))}</strong>
    <span>${TFREscapeHtml(data.facts.join(" | "))}</span>
  `;
}

function TFRControlPanelHtmlV2() {
  return `
    <div class="the-first-relics-control-panel tfr-control-panel-v2">
      <div class="tfr-control-status" data-tfr-control-status>${TFRT("Ready.")}</div>
      <div class="tfr-control-result tfr-control-result-neutral" data-tfr-control-result>
        <strong>${TFRT("No QA run yet.")}</strong>
        <span>${TFRT("Run Playtest Health Check for a dashboard readiness summary.")}</span>
      </div>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>${TFRT("World Setup")}</h2>
          <p>${TFRT("Create, rebuild, and verify relic item copies.")}</p>
        </div>
        <div class="tfr-control-grid">
          ${TFRControlButton("createAll", "fa-solid fa-plus", TFRT("Create Missing World Items"), TFRT("Adds relic world items and journal if missing."))}
          ${TFRControlButton("syncAllInventoryStages", "fa-solid fa-arrows-rotate", TFRT("Rebuild Existing Relics"), TFRT("Refreshes actor/world item copies for the current module version."))}
          ${TFRControlButton("auditInventorySync", "fa-solid fa-list-check", TFRT("Audit Inventory Sync"), TFRT("Reports actor/world relic stage mismatches."))}
          ${TFRControlButton("auditStageSyncSafety", "fa-solid fa-shield-halved", TFRT("Audit Stage Rebuild Safety"), TFRT("Checks item copies before stage rebuild work."))}
        </div>
      </section>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>${TFRT("Test Lab")}</h2>
          <p>${TFRT("Build or clean temporary playtest actors.")}</p>
        </div>
        <div class="tfr-control-grid">
          ${TFRControlButton("createPlaytestLab", "fa-solid fa-flask", TFRT("Create Playtest Lab"), TFRT("Builds exalted test actors at 1000 affinity."))}
          ${TFRControlButton("resetTestLab", "fa-solid fa-rotate-left", TFRT("Reset Test Lab"), TFRT("Returns lab relics to dormant / 0 affinity."))}
          ${TFRControlButton("restoreAfterTestLab", "fa-solid fa-broom", TFRT("Clean Test Lab"), TFRT("Removes lab actors and restores the exact pre-lab world state."))}
          ${TFRControlButton("auditTestLab", "fa-solid fa-magnifying-glass", TFRT("Audit Test Lab"), TFRT("Reports current test lab actors and relic items."))}
        </div>
      </section>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>${TFRT("Audits")}</h2>
          <p>${TFRT("Console reports for generated relic data.")}</p>
        </div>
        <div class="tfr-control-grid">
          ${TFRControlButton("runDiagnostics", "fa-solid fa-stethoscope", TFRT("Run Diagnostics"), TFRT("General module health report."))}
          ${TFRControlButton("runPlaytestHealthCheck", "fa-solid fa-heart-pulse", TFRT("Playtest Health Check"), TFRT("Runs diagnostics, QA matrix, runtime coverage, and test lab audits."))}
          ${TFRControlButton("runReleaseCheck", "fa-solid fa-award", TFRT("Release Check"), TFRT("Verifies playtest health, manifest, docs, and public API readiness."))}
          ${TFRControlButton("auditRelicQAMatrix", "fa-solid fa-clipboard-check", TFRT("12 Relic QA Matrix"), TFRT("Build-level coverage report for every relic power."))}
          ${TFRControlButton("auditFinalFormBonuses", "fa-solid fa-gem", TFRT("Final Form +5 / 15 Audit"), TFRT("Verifies that +5 and 15 charges unlock only at 1000 Affinity for all twelve relics."))}
          ${TFRControlButton("auditProgressiveAppearances", "fa-solid fa-eye", TFRT("Progressive Player Lore Audit"), TFRT("Verifies that each manifestation appears only at its proper Affinity stage and GM lore stays hidden."))}
          ${TFRControlButton("auditRuntimeCoverage", "fa-solid fa-code-compare", TFRT("Runtime Coverage Audit"), TFRT("Compares definitions, generated activities, and helper specs."))}
          ${TFRControlButton("auditRelicCleanup", "fa-solid fa-scroll", TFRT("Relic Cleanup Audit"), TFRT("Checks relic text for placeholders, short forms, and missing lore guidance."))}
          ${TFRControlButton("auditNative", "fa-solid fa-layer-group", TFRT("Native Activity Audit"), TFRT("Checks native dnd5e activity data and effect references."))}
          ${TFRControlButton("auditActivitiesDetailed", "fa-solid fa-table-list", TFRT("Detailed Activity Audit"), TFRT("Lists generated activity type, target, range, save, damage, and healing."))}
          ${TFRControlButton("auditAllRelicEffects", "fa-solid fa-bolt", TFRT("Effect Automation Audit"), TFRT("Lists helper effects, save conditions, cleanup, and teleport coverage."))}
        </div>
      </section>

      <section class="tfr-control-section">
        <div class="tfr-control-section-header">
          <h2>${TFRT("Selected Relic")}</h2>
          <p>${TFRT("Select a bearer token, then run the dashboard relic's powers.")}</p>
        </div>
        <div class="tfr-control-grid tfr-control-grid-compact">
          ${TFRControlButton("selectedRelicAbility:active1", "fa-solid fa-1", TFRT("Use Active 1"), TFRT("Runs the selected relic's first dormant power."))}
          ${TFRControlButton("selectedRelicAbility:active2", "fa-solid fa-2", TFRT("Use Active 2"), TFRT("Runs the selected relic's second dormant power."))}
          ${TFRControlButton("selectedRelicAbility:active3", "fa-solid fa-3", TFRT("Use Active 3"), TFRT("Runs the selected relic's first awakened power."))}
          ${TFRControlButton("selectedRelicAbility:active4", "fa-solid fa-4", TFRT("Use Active 4"), TFRT("Runs the selected relic's second awakened power."))}
          ${TFRControlButton("selectedRelicAbility:avatar", "fa-solid fa-person-rays", TFRT("Use Avatar"), TFRT("Runs the selected relic's avatar power."))}
          ${TFRControlButton("selectedRelicAbility:signature", "fa-solid fa-crown", TFRT("Use Signature"), TFRT("Runs the selected relic's signature power."))}
        </div>
      </section>
    </div>
  `;
}

async function TFRRunControlPanelAction(action, context = {}) {
  try {
    if (action === "createPlaytestLab") {
      if (typeof TFRCreatePlaytestLabSafe === "function") return await TFRCreatePlaytestLabSafe();
      return await TFRCreateTestLab({ stage: "exalted", affinity: 1000 });
    }

    if (action === "createAll") return await TFRCreateAll();
    if (action === "syncAllInventoryStages") return await TFRSyncAllInventoryStages();

    if (action === "resetTestLab") {
      if (typeof TFRResetTestLabSafe === "function") return await TFRResetTestLabSafe();
      return await TFRDeleteTestLab();
    }

    if (action === "deleteFeatureItems") return await TFRDeleteFeatureItems();
    if (action === "auditGeneratedFeatureItems") return await TFRAuditGeneratedFeatureItems();
    if (action === "auditTestLab") return await TFRAuditTestLab();

    if (action === "restoreAfterTestLab") {
      if (typeof TFRRestoreAfterTestLabSafe === "function") return await TFRRestoreAfterTestLabSafe();
      return await TFRDeleteTestLab();
    }

    if (action === "runDiagnostics") return await TFRRunDiagnostics();
    if (action === "runPlaytestHealthCheck") return await TFRRunPlaytestHealthCheck();
    if (action === "runReleaseCheck" || action === "runReleaseCandidateCheck") return await TFRRunReleaseCandidateCheck();
    if (action === "auditRelicQAMatrix") return await TFRAuditRelicQAMatrix();
    if (action === "auditFinalFormBonuses") return await TFRAuditFinalFormBonuses();
    if (action === "auditProgressiveAppearances") return await TFRAuditProgressiveAppearanceUnlocks();
    if (action === "auditRuntimeCoverage") return await TFRAuditRuntimeCoverage();
    if (action === "auditRelicCleanup") return await TFRAuditRelicCleanup();
    if (action === "auditNative") return await TFRAuditNative();
    if (action === "auditActivitiesDetailed") return await TFRAuditActivitiesDetailed();
    if (action === "auditInventorySync") return await TFRAuditInventorySync();
    if (action === "auditStageSyncSafety") return await TFRAuditStageSyncSafety();
    if (action === "auditSprint1") return await TFRAuditSprint1();
    if (action === "auditActivityTemplates") return await TFRAuditActivityTemplates();
    if (action === "auditAutomationEngine") return await TFRAuditAutomationEngine();
    if (action === "applySystemTemplates") return await TFRApplySystemTemplates();
    if (action === "auditSystemTemplates") return await TFRAuditSystemTemplates();
    if (action === "createFeatureItems") return await TFRCreateFeatureItems();
    if (action === "createResolvedTemplateItems") return await TFRCreateResolvedTemplateItems();
    if (action === "createSpellbookFeatures") return await TFRCreateSpellbookFeatures();
    if (action === "auditSpellbookFeatures") return await TFRAuditSpellbookFeatures();
    if (action === "auditResolvedTemplateItems") return await TFRAuditResolvedTemplateItems();
    if (action === "auditFeatureItems") return await TFRAuditFeatureItems();
    if (action === "feyStep") return await TFRExecuteFeyStep();
    if (action === "auditCloakAutomation") return await TFRAuditCloakAutomation();
    if (action === "auditAllRelicEffects") return await TFRAuditAllRelicEffectAutomation();
    if (action?.startsWith?.("cloakAbility:")) {
      const abilityId = action.split(":")[1];
      return await TFRUseCloakAbility(null, abilityId);
    }
    if (action?.startsWith?.("selectedRelicAbility:")) {
      const slot = action.split(":")[1];
      return await TFRUseSelectedRelicAbility(context?.relicId, slot, { spendCharges: true, fromControlPanel: true });
    }

    ui.notifications.warn(TFRT("Unknown The First Relics action: {action}", { action: action }));
  } catch (err) {
    console.error(`The First Relics action failed: ${action}`, err);
    ui.notifications.error(TFRT("The First Relics action failed: {action}. Check console.", { action: action }));
  }
}

function TFRWireControlPanel(html) {
  const root = TFRSheetHtmlElement(html);
  if (!root) return;

  const status = root.querySelector("[data-tfr-control-status]");
  const resultPanel = root.querySelector("[data-tfr-control-result]");
  const buttons = Array.from(root.querySelectorAll("[data-tfr-action]"));
  const setStatus = text => {
    if (status) status.textContent = text;
  };
  const setResult = (result, label) => {
    if (!resultPanel) return;
    const data = TFRControlPanelResultSummary(result, label);
    resultPanel.className = `tfr-control-result tfr-control-result-${data.tone}`;
    resultPanel.innerHTML = TFRControlPanelResultHtml(result, label);
  };

  buttons.forEach(button => {
    button.addEventListener("click", async event => {
      event.preventDefault();
      const action = button.dataset.tfrAction;
      const label = button.querySelector("strong")?.textContent.trim() || button.textContent.trim();
      buttons.forEach(b => b.disabled = true);
      button.classList.add("tfr-action-running");
      setStatus(TFRT("Running: {action}...", { action: label }));
      try {
        const relicInput = root.querySelector("[name='relic']");
        const result = await TFRRunControlPanelAction(action, { relicId: relicInput?.value || null });
        const resultSummary = TFRControlPanelResultSummary(result, label);
        const ok = resultSummary.tone !== "warn";
        setStatus(ok
          ? TFRT("{status}: {action}.", { status: TFRStatusLabel(resultSummary.status), action: label })
          : TFRT("{status}: {count} issue(s). Check console.", { status: TFRStatusLabel(resultSummary.status), count: resultSummary.issueCount }));
        setResult(result, label);
      } finally {
        button.classList.remove("tfr-action-running");
        buttons.forEach(b => b.disabled = false);
      }
    });
  });
}

async function TFROpenControlPanel() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const dialog = new foundry.applications.api.DialogV2({
    classes: ["tfr-dialog"],
    window: { title: TFRT("The First Relics — GM Control Panel"), resizable: true },
    position: { width: 680, height: 720 },
    content: TFRControlPanelHtmlV2(),
    buttons: [{ action: "close", label: TFRT("Close"), default: true }]
  });

  await dialog.render({ force: true });
  TFRWireControlPanel(dialog.element);
  return dialog;
}


