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

// Register toolbar hook early. Waiting until ready may be too late.
TFRRegisterToolbarButton();



