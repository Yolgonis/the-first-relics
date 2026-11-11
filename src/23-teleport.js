import "./22-feature-items.js"; // keeps the original load order
import { TFRT } from "./00-core.js";

function TFRDrawRangeCircle(origin, rangeFeet) {
  const layer = canvas?.controls || canvas?.stage;
  if (!layer || !window.PIXI) return null;

  const gridSize = canvas?.grid?.size || 100;
  const gridDistance = canvas?.scene?.grid?.distance || 5;
  const radiusPx = (rangeFeet / gridDistance) * gridSize;

  const g = new PIXI.Graphics();

  // Foundry v13 may run newer PIXI APIs while older worlds/modules still expose legacy methods.
  // Support both so the range ring does not become the reason Fey Step fails.
  if (typeof g.circle === "function" && typeof g.fill === "function" && typeof g.stroke === "function") {
    g.circle(origin.x, origin.y, radiusPx).fill({ color: 0x7ee8ff, alpha: 0.08 });
    g.circle(origin.x, origin.y, radiusPx).stroke({ width: 3, color: 0x7ee8ff, alpha: 0.95 });
    g.circle(origin.x, origin.y, radiusPx + 3).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
  } else {
    g.lineStyle(3, 0x7ee8ff, 0.95);
    g.beginFill(0x7ee8ff, 0.08);
    g.drawCircle(origin.x, origin.y, radiusPx);
    g.endFill();

    g.lineStyle(1, 0xffffff, 0.35);
    g.drawCircle(origin.x, origin.y, radiusPx + 3);
  }

  layer.addChild(g);
  return g;
}

export async function TFRPickCanvasPointWithRange({ origin, rangeFeet = 60, message = TFRT("Click a destination.") } = {}) {
  ui.notifications.info(message);

  const ring = TFRDrawRangeCircle(origin, rangeFeet);

  return new Promise((resolve, reject) => {
    const stage = canvas?.stage;
    const appStage = canvas?.app?.stage;

    if (!stage || !appStage) {
      try { ring?.destroy?.(); } catch (err) {}
      reject(new Error("Canvas stage is not available."));
      return;
    }

    const oldCursor = stage.cursor;
    stage.cursor = "crosshair";

    const cleanup = () => {
      try { stage.off("mousedown", onClick); } catch (err) {}
      window.removeEventListener("keydown", onKey);
      stage.cursor = oldCursor;
      try { ring?.destroy?.(); } catch (err) {}
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

export async function TFRMoveTokenAsTeleport(token, topLeft) {
  const doc = token?.document || token;
  const obj = token?.object || doc?.object || token;

  if (!doc?.update) throw new Error("Fey Step: token document update is not available.");

  try {
    if (obj) {
      obj.alpha = 0;
      if (typeof obj.visible === "boolean") obj.visible = false;
    }
  } catch (err) {}

  const updateOptions = {
    animate: false,
    noAnimation: true,
    animation: { duration: 0 }
  };

  try {
    await doc.update(topLeft, updateOptions);
  } catch (err) {
    console.warn("The First Relics: zero-animation token update failed; retrying normal document update.", err);
    await doc.update(topLeft);
  }

  const finalObj = doc?.object || token?.object || obj;
  try {
    if (finalObj?.position?.set) finalObj.position.set(topLeft.x, topLeft.y);
    else if (finalObj) {
      finalObj.x = topLeft.x;
      finalObj.y = topLeft.y;
    }
    finalObj?.refresh?.();
  } catch (err) {}

  try {
    canvas?.perception?.update?.({ refreshLighting: true, refreshVision: true }, true);
  } catch (err) {}
}

export async function TFRPlaySimpleTeleportAnimation(token, destination) {
  const doc = token?.document || token;
  const obj = token?.object || doc?.object || token;
  if (!obj) return;

  const originalAlpha = obj.alpha ?? 1;
  const originalVisible = typeof obj.visible === "boolean" ? obj.visible : true;

  try {
    if (typeof obj.visible === "boolean") obj.visible = true;
    for (const a of [0.8, 0.55, 0.3, 0.1, 0]) {
      obj.alpha = a;
      await new Promise(r => setTimeout(r, 25));
    }
    obj.alpha = 0;
    if (typeof obj.visible === "boolean") obj.visible = false;
  } catch (err) {}

  return async () => {
    const finalObj = doc?.object || token?.object || obj;
    try {
      if (typeof finalObj.visible === "boolean") finalObj.visible = true;
      finalObj.alpha = 0;
      await new Promise(r => setTimeout(r, 35));
      for (const a of [0.15, 0.35, 0.6, 0.85, originalAlpha]) {
        finalObj.alpha = a;
        await new Promise(r => setTimeout(r, 25));
      }
      finalObj.alpha = originalAlpha;
      if (typeof finalObj.visible === "boolean") finalObj.visible = originalVisible;
    } catch (err) {
      try {
        finalObj.alpha = originalAlpha;
        if (typeof finalObj.visible === "boolean") finalObj.visible = originalVisible;
      } catch (e) {}
    }
  };
}

