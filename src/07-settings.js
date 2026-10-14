function TFRRegisterToolbarButton() {
  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user?.isGM) return;

    const tool = {
      name: "the-first-relics-dashboard",
      title: "The First Relics",
      icon: "fas fa-gem",
      button: true,
      visible: true,
      onChange: () => TFROpenDashboard()
    };

    // Foundry v13 object style.
    if (!Array.isArray(controls)) {
      const tokenControl = controls.tokens || controls.token || Object.values(controls)[0];
      if (!tokenControl) return;

      tokenControl.tools = tokenControl.tools || {};
      if (Array.isArray(tokenControl.tools)) {
        if (!tokenControl.tools.some(t => t.name === tool.name)) tokenControl.tools.push(tool);
      } else {
        tokenControl.tools[tool.name] = tool;
      }
      return;
    }

    // Alternate array style.
    const tokenControl = controls.find(c => c.name === "tokens" || c.name === "token") || controls[0];
    if (!tokenControl) return;

    tokenControl.tools = tokenControl.tools || [];
    if (Array.isArray(tokenControl.tools)) {
      if (!tokenControl.tools.some(t => t.name === tool.name)) tokenControl.tools.push(tool);
    } else {
      tokenControl.tools[tool.name] = tool;
    }
  });
}

function TFRRegisterSettings() {
  game.settings.register(TFR_MODULE_ID, "contentLanguage", {
    name: TFRT("Relic content language"),
    hint: TFRT("Language of relic items, descriptions and the lore journal in this world, whichever GM writes them. The interface follows each user's own language. After changing it, run Rebuild Existing Relics in the GM Control Panel."),
    scope: "world",
    // Only shown when more than one content language ships.
    config: Object.keys(TFR_CONTENT_LANGUAGES).length > 1,
    type: String,
    choices: { ...TFR_CONTENT_LANGUAGES },
    default: "en",
    requiresReload: true
  });
  game.settings.registerMenu("the-first-relics", "dashboard", {
    name: "Open GM Dashboard",
    label: "Open Dashboard",
    hint: "Open The First Relics GM-only Affinity Dashboard.",
    icon: "fas fa-gem",
    // The settings menu only opens the dashboard; it has no window of its own.
    type: class TFRDashboardSettingsShim extends foundry.applications.api.ApplicationV2 {
      async render() {
        TFROpenDashboard();
        return this;
      }
    },
    restricted: true
  });
}

/**
 * Stores the content language the first time a GM loads the world with this setting.
 * Existing relic items decide it (worlds built before v1.3.0 have English items);
 * a world without relic items starts in the GM's interface language.
 */
async function TFRInitContentLanguage() {
  if (!game.user?.isGM) return;
  const key = `${TFR_MODULE_ID}.contentLanguage`;
  if (game.settings.storage.get("world")?.getSetting?.(key)) return;

  const itemNames = new Set(TFRAllWorldAndActorItems()
    .filter(item => item.getFlag?.(TFR_MODULE_ID, "relicId"))
    .map(item => item.name));
  let lang = null;
  if (itemNames.size) {
    lang = "en";
    for (const candidate of Object.keys(TFR_CONTENT_LANGUAGES).filter(code => code !== "en")) {
      const overlay = await fetch(`modules/${TFR_MODULE_ID}/data/i18n/${candidate}.json`)
        .then(response => (response.ok ? response.json() : null))
        .catch(() => null);
      if (Object.values(overlay || {}).some(relic => itemNames.has(relic?.name))) {
        lang = candidate;
        break;
      }
    }
  } else {
    lang = game.i18n.lang in TFR_CONTENT_LANGUAGES ? game.i18n.lang : "en";
  }
  await game.settings.set(TFR_MODULE_ID, "contentLanguage", lang);
  console.log(`The First Relics | Relic content language set to ${lang}.`);
}

// Register toolbar hook early. Waiting until ready may be too late.
TFRRegisterToolbarButton();



