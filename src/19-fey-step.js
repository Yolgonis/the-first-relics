import "./18-automation-engine.js"; // keeps the original load order
import {
  TFRLoadRelics,
  TFRT,
  TFR_CLOAK_DISPLAY_NAME,
  TFR_CLOAK_ITEM_NAMES,
  TFR_CLOAK_LEGACY_NAMES,
  TFR_FEY_STEP_DEBOUNCE_MS,
  TFR_FEY_STEP_IN_FLIGHT,
  TFR_FEY_STEP_RECENT
} from "./00-core.js";
import { TFRBlockRelicFeatureUse } from "./02-attunement.js";
import { TFRGetAbilityDefinition } from "./03-activities.js";
import { TFRAutomation } from "./18-automation-engine.js";
import {
  TFRMoveTokenAsTeleport,
  TFRPickCanvasPointWithRange,
  TFRPlaySimpleTeleportAnimation
} from "./23-teleport.js";

export function TFRSelectedToken() {
  return (canvas?.tokens?.controlled || [])[0] || null;
}

export function TFRTokenCenter(token) {
  const doc = token.document || token;
  const gridSize = canvas?.grid?.size || 100;
  const width = (doc.width || 1) * gridSize;
  const height = (doc.height || 1) * gridSize;
  return {
    x: (doc.x ?? token.x ?? 0) + width / 2,
    y: (doc.y ?? token.y ?? 0) + height / 2
  };
}

export function TFRDistanceFeet(a, b) {
  const gridSize = canvas?.grid?.size || 100;
  const gridDistance = canvas?.scene?.grid?.distance || 5;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.sqrt(dx * dx + dy * dy) / gridSize) * gridDistance;
}

export function TFRDestinationTopLeftForToken(token, center) {
  const doc = token.document || token;
  const gridSize = canvas?.grid?.size || 100;
  return {
    x: Math.round(center.x - ((doc.width || 1) * gridSize) / 2),
    y: Math.round(center.y - ((doc.height || 1) * gridSize) / 2)
  };
}

export function TFRFindActorRelicItem(actor, relicId) {
  return actor?.items?.find(i => i.getFlag("the-first-relics", "relicId") === relicId);
}

export function TFRIsCloakItem(item) {
  if (!item) return false;
  return item.getFlag("the-first-relics", "relicId") === "cloak_feywilds"
    || TFR_CLOAK_ITEM_NAMES.has(item.name);
}

export async function TFRMigrateCloakDisplayName() {
  if (!game.user?.isGM) return { renamed: 0 };

  const targets = [...game.items.filter(item => TFR_CLOAK_LEGACY_NAMES.has(item.name))];
  for (const actor of game.actors) {
    targets.push(...actor.items.filter(item => TFR_CLOAK_LEGACY_NAMES.has(item.name)));
  }
  let renamed = 0;
  for (const item of targets) {
    if (!TFRIsCloakItem(item)) continue;
    await item.update({ name: TFR_CLOAK_DISPLAY_NAME });
    renamed += 1;
  }
  if (renamed) console.log(`The First Relics | Renamed ${renamed} existing item(s) to ${TFR_CLOAK_DISPLAY_NAME}.`);
  return { renamed };
}

function TFRGetItemCharges(item) {
  const uses = item?.system?.uses || {};
  if (Number.isFinite(Number(uses.value))) return Number(uses.value);
  if (Number.isFinite(Number(uses.max)) && Number.isFinite(Number(uses.spent))) return Number(uses.max) - Number(uses.spent);
  return null;
}

async function TFRConsumeItemCharges(item, amount = 1) {
  const uses = item?.system?.uses || {};
  const value = Number(uses.value);
  const spent = Number(uses.spent);
  const max = Number(uses.max);

  if (Number.isFinite(value)) {
    if (value < amount) return false;
    await item.update({ "system.uses.value": Math.max(0, value - amount) });
    return true;
  }

  if (Number.isFinite(spent) && Number.isFinite(max)) {
    if ((max - spent) < amount) return false;
    await item.update({ "system.uses.spent": spent + amount });
    return true;
  }

  console.warn("The First Relics: item uses model not found; charge consumption skipped.", item);
  return true;
}


async function TFRPickCanvasPoint({ message = TFRT("Click a destination on the canvas.") } = {}) {
  ui.notifications.info(message);

  return new Promise((resolve, reject) => {
    const stage = canvas?.stage;
    const appStage = canvas?.app?.stage;

    if (!stage || !appStage) {
      reject(new Error("Canvas stage is not available."));
      return;
    }

    const oldCursor = stage.cursor;
    stage.cursor = "crosshair";

    const cleanup = () => {
      try { stage.off("mousedown", onClick); } catch (err) {}
      window.removeEventListener("keydown", onKey);
      stage.cursor = oldCursor;
    };

    const onKey = event => {
      if (event.key === "Escape") {
        cleanup();
        resolve(null);
      }
    };

    const onClick = event => {
      const pos = event.data.getLocalPosition(appStage);
      cleanup();
      resolve({ x: pos.x, y: pos.y });
    };

    window.addEventListener("keydown", onKey);
    stage.once("mousedown", onClick);
  });
}



export function TFRFeyStepTokenKey(token, actor = null) {
  const doc = token?.document || token;
  const sceneId = canvas?.scene?.id || doc?.parent?.id || "scene";
  const tokenId = doc?.id || token?.id || token?.name || "token";
  const actorId = actor?.id || token?.actor?.id || doc?.actorId || "actor";
  return `${sceneId}:${tokenId}:${actorId}`;
}

function TFRMarkRecentFeyStep(key) {
  if (!key) return;
  const now = Date.now();
  TFR_FEY_STEP_RECENT.set(key, now);
  for (const [k, t] of TFR_FEY_STEP_RECENT.entries()) {
    if (now - t > TFR_FEY_STEP_DEBOUNCE_MS * 4) TFR_FEY_STEP_RECENT.delete(k);
  }
}

export function TFRIsRecentFeyStep(key) {
  if (!key) return false;
  const previous = TFR_FEY_STEP_RECENT.get(key) || 0;
  return Date.now() - previous < TFR_FEY_STEP_DEBOUNCE_MS;
}

export function TFRIsFeyStepInFlight(key) {
  return !!key && TFR_FEY_STEP_IN_FLIGHT.has(key);
}

function TFRSetFeyStepInFlight(key, active) {
  if (!key) return;
  if (active) TFR_FEY_STEP_IN_FLIGHT.add(key);
  else TFR_FEY_STEP_IN_FLIGHT.delete(key);
}

export async function TFRExecuteFeyStep(options = {}) {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: Fey Step automation currently requires GM."));

  const token = options.token || TFRSelectedToken();
  if (!token) {
    ui.notifications.warn(TFRT("Fey Step: select one token first."));
    return { ok: false, issue: "No selected token" };
  }

  const actor = token.actor;
  if (!actor) {
    ui.notifications.warn(TFRT("Fey Step: selected token has no actor."));
    return { ok: false, issue: "Selected token has no actor" };
  }

  const tokenKey = TFRFeyStepTokenKey(token, actor);
  if (TFRIsFeyStepInFlight(tokenKey)) {
    ui.notifications.warn(TFRT("Fey Step: this token already has an active destination picker."));
    return { ok: false, issue: "Fey Step already in progress", actor: actor.name };
  }

  TFRSetFeyStepInFlight(tokenKey, true);

  try {
    const relics = await TFRLoadRelics();
    const relic = relics.find(r => r.id === "cloak_feywilds");
    const item = TFRFindActorRelicItem(actor, "cloak_feywilds");

    if (!item) {
      ui.notifications.warn(TFRT("{actorName} does not have {TFR_CLOAK_DISPLAY_NAME}.", { actorName: actor.name, TFR_CLOAK_DISPLAY_NAME: TFR_CLOAK_DISPLAY_NAME }));
      return { ok: false, issue: `Actor does not have ${TFR_CLOAK_DISPLAY_NAME}`, actor: actor.name };
    }
    if (TFRBlockRelicFeatureUse(item, "Fey Step")) {
      return { ok: false, issue: "Attunement refused", actor: actor.name };
    }

    const def = TFRGetAbilityDefinition(relic, "active1");
    const charges = def?.charges ?? 1;
    const maxRange = def?.range ?? 60;
    const shouldConsumeCharges = options.consumeCharges !== false;
    let spentCharges = 0;

    const from = TFRTokenCenter(token);

    let destination = null;
    if (Number.isFinite(Number(options.x)) && Number.isFinite(Number(options.y))) {
      destination = { x: Number(options.x), y: Number(options.y) };
    } else {
      destination = await TFRPickCanvasPointWithRange({
        origin: from,
        rangeFeet: maxRange,
        message: TFRT("Fey Step: click a destination within {maxRange} ft. Press Esc to cancel.", { maxRange })
      });
    }

    if (!destination) {
      ui.notifications.info(TFRT("Fey Step cancelled."));
      return { ok: false, issue: "Cancelled", actor: actor.name };
    }

    const distance = TFRDistanceFeet(from, destination);

    if (distance > maxRange + 0.001) {
      ui.notifications.warn(TFRT("Fey Step: destination is {distance} ft away, max is {maxRange} ft.", { distance: distance.toFixed(1), maxRange: maxRange }));
      return {
        ok: false,
        issue: "Destination out of range",
        actor: actor.name,
        distance: Number(distance.toFixed(2)),
        maxRange
      };
    }

    if (shouldConsumeCharges) {
      const remaining = TFRGetItemCharges(item);
      if (remaining !== null && remaining < charges) {
        ui.notifications.warn(TFRT("Fey Step: not enough charges. Need {charges}, have {remaining}.", { charges: charges, remaining: remaining }));
        return { ok: false, issue: "Not enough charges", actor: actor.name, remaining, charges };
      }

      const consumed = await TFRConsumeItemCharges(item, charges);
      if (!consumed) {
        ui.notifications.warn(TFRT("Fey Step: charge consumption failed."));
        return { ok: false, issue: "Charge consumption failed", actor: actor.name };
      }
      spentCharges = charges;
    }

    const topLeft = TFRDestinationTopLeftForToken(token, destination);
    const restoreTeleportVisual = await TFRPlaySimpleTeleportAnimation(token, destination);
    await TFRMoveTokenAsTeleport(token, topLeft);
    if (typeof restoreTeleportVisual === "function") await restoreTeleportVisual();

    TFRMarkRecentFeyStep(tokenKey);

    await TFRAutomation.logTimeline("cloak_feywilds", {
      type: "Automation Execute",
      slot: "active1",
      actor: actor.name,
      activity: "Fey Step",
      reason: `${actor.name} used Fey Step (${distance.toFixed(1)} ft).${shouldConsumeCharges ? "" : " Charges were already consumed by dnd5e."}`
    });

    ui.notifications.info(TFRT("{actorName} used Fey Step.", { actorName: actor.name }));
    return {
      ok: true,
      relic: TFR_CLOAK_DISPLAY_NAME,
      activity: "Fey Step",
      actor: actor.name,
      from,
      to: destination,
      distance: Number(distance.toFixed(2)),
      chargesSpent: spentCharges,
      chargeSource: shouldConsumeCharges ? "first-relics" : "dnd5e-card"
    };
  } finally {
    TFRSetFeyStepInFlight(tokenKey, false);
  }
}

