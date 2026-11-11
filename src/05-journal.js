import "./04-items.js"; // keeps the original load order
import {
  TFRContentScoped,
  TFRInContentLanguage,
  TFRKnownRelicNames,
  TFRLoadRelics,
  TFRT,
  TFR_MODULE_ID,
  TFR_STAGES
} from "./00-core.js";
import { TFRGetStageData, TFRStageTitle } from "./01-stages-and-text.js";
import { TFRCreateRelics } from "./04-items.js";

async function TFRCreateJournalLegacy() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  if (game.journal.getName("The First Relics - Lore")) return;
  const relics = await TFRLoadRelics();
  const list = relics.map(r => `<li><strong>${r.name}</strong> — ${r.class}, ${r.virtue}</li>`).join("");
  await JournalEntry.create({
    name: "The First Relics - Lore",
    pages: [{
      name: "The First Relics",
      type: "text",
      text: {
        format: 1,
        content: `
          <h1>${TFRT("The First Relics")}</h1>
          <p>${TFRT("Relics are living wills from the First Age. They choose their bearers and awaken through virtue, not ownership.")}</p>
          <h2>${TFRT("Known Relics")}</h2>
          <ul>${list}</ul>
          <blockquote><p><strong>${TFRT("A Relic never belongs to its bearer. The bearer belongs to the Relic.")}</strong></p></blockquote>
        `
      }
    }]
  });
}

function TFRJournalPageData(name, content, sort = 0, relicId = "overview") {
  return {
    name,
    type: "text",
    sort,
    text: {
      format: 1,
      content
    },
    flags: {
      [TFR_MODULE_ID]: {
        generatedLorePage: true,
        lorePageId: relicId
      }
    }
  };
}

function TFRBuildJournalOverview(relics) {
  const list = relics.map(r => `<li><strong>${r.name}</strong> - ${r.class}, ${r.virtue}</li>`).join("");
  return `
    <h1>The First Relics</h1>
    <p>${TFRT("Relics are living wills from the First Age. They choose their bearers and awaken through virtue, not ownership.")}</p>
    <p>${TFRT("A relic may refuse attunement when a bearer's choices violate its nature. Final Form is therefore never guaranteed: it is the culmination of 1000 Affinity and a bond the relic still willingly accepts.")}</p>
    <h2>${TFRT("Relic Progression")}</h2>
    <ul>
      <li>${TFRT("<strong>Dormant.</strong> +1 Universal Relic Bonus and 3 charges.")}</li>
      <li>${TFRT("<strong>Awakened.</strong> +2 Universal Relic Bonus and 6 charges.")}</li>
      <li>${TFRT("<strong>Exalted.</strong> +3 Universal Relic Bonus and 10 charges from 750–999 Affinity.")}</li>
      <li>${TFRT("<strong>Final Form.</strong> +5 Universal Relic Bonus and 15 charges at 1000 Affinity; the true name and Signature Ability are revealed.")}</li>
    </ul>
    <h2>${TFRT("Known Relics")}</h2>
    <ul>${list}</ul>
    <blockquote><p><strong>${TFRT("A Relic never belongs to its bearer. The bearer belongs to the Relic.")}</strong></p></blockquote>
  `;
}

function TFRBuildRelicJournalContent(relic) {
  const finalFormData = TFRGetStageData(relic, "exalted", true);
  const stageRows = [...TFR_STAGES.map(stage => {
    const data = TFRGetStageData(relic, stage);
    return `<li><strong>${data.title || TFRStageTitle(stage)}.</strong> ${TFRT("Bonus +{bonus}, {charges} charges.", { bonus: data.bonus, charges: data.charges })}</li>`;
  }), `<li><strong>${finalFormData.title}.</strong> ${TFRT("Bonus +{bonus}, {charges} charges at 1000 Affinity.", { bonus: finalFormData.bonus, charges: finalFormData.charges })}</li>`].join("");
  const moodRows = (Array.isArray(relic.moodMap) ? relic.moodMap : [])
    .map(entry => `<li><strong>${entry.min}-${entry.max} ${entry.mood}.</strong> ${entry.description}</li>`)
    .join("");
  const passives = (relic.features?.passives || []).map(p => `<li>${p}</li>`).join("");
  const actives = (relic.features?.actives || []).map(a => `<li>${a}</li>`).join("");
  const personality = relic.personality || {};
  const lore = relic.lore || {};
  const loreRows = [
    lore.knownRumor ? `<p><strong>${TFRT("Known Rumor:")}</strong> ${lore.knownRumor}</p>` : "",
    lore.origin ? `<p><strong>${TFRT("Origin:")}</strong> ${lore.origin}</p>` : "",
    lore.hiddenSorrow ? `<p><strong>${TFRT("Hidden Sorrow:")}</strong> ${lore.hiddenSorrow}</p>` : ""
  ].filter(Boolean).join("");
  const appearanceRows = [
    lore.appearanceDormant ? `<li><strong>${TFRT("Dormant")}.</strong> ${lore.appearanceDormant}</li>` : "",
    lore.appearanceAwakened ? `<li><strong>${TFRT("Awakened")}.</strong> ${lore.appearanceAwakened}</li>` : "",
    lore.appearanceExalted ? `<li><strong>${TFRT("Exalted")}.</strong> ${lore.appearanceExalted}</li>` : "",
    lore.appearanceSignature ? `<li><strong>${TFRT("Final Form")}.</strong> ${lore.appearanceSignature}</li>` : ""
  ].filter(Boolean).join("");

  return `
    <h1>${relic.name}</h1>
    <p><strong>${TFRT("Class:")}</strong> ${relic.class}</p>
    <p><strong>${TFRT("Virtue:")}</strong> ${relic.virtue}</p>
    <p><strong>${TFRT("Theme:")}</strong> ${relic.theme}</p>
    ${relic.trueName?.full ? `<p><strong>${TFRT("True Name:")}</strong> ${relic.trueName.full}</p>` : ""}

    <h2>${TFRT("Stage Summary")}</h2>
    <ul>${stageRows}</ul>

    ${loreRows ? `<h2>${TFRT("Relic Lore")}</h2>${loreRows}` : ""}
    ${appearanceRows ? `<h2>${TFRT("Manifestations")}</h2><ul>${appearanceRows}</ul>` : ""}

    <h2>${TFRT("GM Notes")}</h2>
    ${personality.temperament?.length ? `<p><strong>${TFRT("Temperament:")}</strong> ${personality.temperament.join(", ")}</p>` : ""}
    ${personality.corePhrase ? `<p><strong>${TFRT("Core Phrase:")}</strong> <em>${personality.corePhrase}</em></p>` : ""}
    ${personality.roleplayGuidance ? `<p><strong>${TFRT("Roleplay Guidance:")}</strong> ${personality.roleplayGuidance}</p>` : ""}
    ${personality.likes?.length ? `<p><strong>${TFRT("Likes:")}</strong> ${personality.likes.join(", ")}</p>` : ""}
    ${personality.dislikes?.length ? `<p><strong>${TFRT("Dislikes:")}</strong> ${personality.dislikes.join(", ")}</p>` : ""}

    <h2>${TFRT("Full Affinity Mood Map")}</h2>
    <ul>${moodRows}</ul>

    <h2>${TFRT("Passive Features")}</h2>
    <ul>${passives}</ul>

    <h2>${TFRT("Active Features")}</h2>
    <ul>${actives}</ul>

    ${relic.features?.avatar ? `<h2>${TFRT("Avatar Form")}</h2><p>${relic.features.avatar}</p>` : ""}
    ${relic.features?.signature ? `<h2>${TFRT("Signature Ability")}</h2><p>${relic.features.signature}</p>` : ""}
  `;
}

export async function TFRCreateJournal(options = {}) {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const notify = options.notify !== false;
  const relics = await TFRLoadRelics();
  const pages = [
    TFRJournalPageData(TFRInContentLanguage(() => TFRT("The First Relics")), TFRBuildJournalOverview(relics), 0, "overview"),
    ...relics.map((relic, index) => TFRJournalPageData(relic.name, TFRBuildRelicJournalContent(relic), (index + 1) * 1000, relic.id))
  ];
  let journal = game.journal.getName("The First Relics - Lore");

  if (!journal) {
    journal = await JournalEntry.create({
      name: "The First Relics - Lore",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      pages
    });
    if (notify) ui.notifications.info(TFRT("The First Relics: Lore journal created."));
    return journal;
  }

  await journal.update({ ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE } });

  // Generated pages are matched by relic id, or by any generated name in any content language
  // for pages written before v1.3.0, so changing the content language renames pages instead of
  // adding a second set. Extra generated copies of the same page are removed.
  const knownNames = await TFRKnownRelicNames();
  const overviewNames = new Set(["The First Relics", pages[0].name]);
  const pageIdOf = page => {
    const flags = page.flags?.[TFR_MODULE_ID] || {};
    if (flags.lorePageId) return flags.lorePageId;
    if (!flags.generatedLorePage) return null;
    if (overviewNames.has(page.name)) return "overview";
    for (const [relicId, names] of knownNames) if (names.has(page.name)) return relicId;
    return null;
  };
  const created = [];
  const duplicates = [];
  for (const pageData of pages) {
    const pageId = pageData.flags[TFR_MODULE_ID].lorePageId;
    const matches = journal.pages.contents
      .filter(page => pageIdOf(page) === pageId)
      .sort((a, b) => (a.name === pageData.name ? -1 : 0) - (b.name === pageData.name ? -1 : 0));
    const [existing, ...extra] = matches;
    duplicates.push(...extra.map(page => page.id));
    if (existing) await existing.update({
      name: pageData.name,
      text: pageData.text,
      sort: pageData.sort,
      flags: pageData.flags
    });
    else created.push(pageData);
  }
  if (duplicates.length) await journal.deleteEmbeddedDocuments("JournalEntryPage", duplicates, { render: false });
  if (created.length) await journal.createEmbeddedDocuments("JournalEntryPage", created, { render: false });
  if (notify) ui.notifications.info(TFRT("The First Relics: Lore journal updated."));
  return journal;
}

export async function TFRSyncExistingLoreJournal() {
  if (!game.user?.isGM || !game.journal?.getName?.("The First Relics - Lore")) return null;
  return TFRCreateJournal({ notify: false });
}

export async function TFRCreateAll() {
  if (!game.user.isGM) return ui.notifications.warn(TFRT("The First Relics: GM only."));
  const createdRelics = await TFRCreateRelics();
  const createdJournal = await TFRCreateJournal();
  return { createdRelics, createdJournal };
}

// Text these builders write into world documents uses the world's relic content language, not
// the language of whichever GM triggers the write (see TFRContentScoped in 00-core.js).
TFRBuildJournalOverview = TFRContentScoped(TFRBuildJournalOverview);
TFRBuildRelicJournalContent = TFRContentScoped(TFRBuildRelicJournalContent);
