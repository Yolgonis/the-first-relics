import "./24-chat-and-gates.js"; // keeps the original load order
import {
  TFRLoadRelics,
  TFRSetStartupSync,
  TFR_CLOAK_DISPLAY_NAME,
  TFR_STARTUP_SYNC,
  TFR_VERSION
} from "./00-core.js";
import {
  TFRApplyRelicSheetVisibility,
  TFRNormalizeRefusingRelicItems,
  TFRRegisterAttunementRefusal,
  TFRSetAttunementRefusal,
  TFRSetRelicAttunementRefusal
} from "./02-attunement.js";
import { TFRAuditActivityTemplates } from "./03-activities.js";
import {
  TFRClearLockedActivities,
  TFRCreateRelics,
  TFRDowngradeItem,
  TFRRefreshActorAndItemSheets,
  TFRSyncAllPassiveEffects,
  TFRUpdateRelicItem,
  TFRUpgradeItem
} from "./04-items.js";
import { TFRCreateAll, TFRCreateJournal, TFRSyncExistingLoreJournal } from "./05-journal.js";
import {
  TFRAdjustAffinity,
  TFRAdjustRelicAffinity,
  TFRAuditFinalFormBonuses,
  TFRAuditProgressiveAppearanceUnlocks,
  TFRAuditTrueNameSealing,
  TFRDeleteAll,
  TFRGetRelicState,
  TFRInitActorRelicData,
  TFRMigrateLegacyRelicIds,
  TFRRegisterWorldState,
  TFRSetAffinity,
  TFRSetRelicAffinity,
  TFRSyncFinalFormItems,
  TFRSyncProgressiveAppearanceDescriptions,
  TFRSyncSealedTrueNameDescriptions,
  TFRSyncStageFromAffinity
} from "./06-relic-state.js";
import { TFRInitContentLanguage, TFRRegisterSettings } from "./07-settings.js";
import { TFRAddTimeline, TFRSendDream, TFRSetRequirement, TFRUnlockMemory } from "./08-affinity-events.js";
import { TFRApplyAffinityEvent, TFROpenDashboard } from "./09-dashboard.js";
import { TFRAuditActivities, TFRAuditMidiEffects, TFRAuditRelics } from "./10-basic-audits.js";
import { TFRApplyRestrainedCondition, TFRRegisterTimedEffectExpiry } from "./12-conditions.js";
import {
  TFRAuditSaveAwarePending,
  TFRRegisterSaveAwareAutomation,
  TFRRegisterSaveAwareChatButtons,
  TFRResolveSaveAwareManual
} from "./13-save-resolver.js";
import {
  TFRApplyVerdantSnare,
  TFRUseRelicAbility,
  TFRUseSelectedRelicAbility
} from "./14-ability-runtime.js";
import {
  TFRAuditAbilityDesign,
  TFRAuditAllRelicEffectAutomation,
  TFRAuditCloakAutomation,
  TFRAuditInventorySync,
  TFRAuditNative,
  TFRAuditProgression,
  TFRAuditStageSyncSafety,
  TFRAuditTargeting,
  TFRSyncAllInventoryStages,
  TFRUseCloakAbility
} from "./15-automation-audits.js";
import {
  TFRActivityCount,
  TFRAuditRelicCleanup,
  TFRAuditRelicQAMatrix,
  TFRAuditTestLab,
  TFRCreateTestLab,
  TFRDeleteTestLab,
  TFRRunDiagnostics,
  TFRRunPlaytestHealthCheck,
  TFRRunReleaseCandidateCheck
} from "./16-test-lab.js";
import {
  TFRAuditActivitiesDetailed,
  TFRAuditRuntimeCoverage,
  TFRCreatePlaytestLabSafe,
  TFRDestroyTestLabSafe,
  TFRInspectRelicActivities,
  TFRResetTestLabSafe,
  TFRRestoreAfterTestLabSafe
} from "./17-coverage-audits.js";
import {
  TFRAuditAutomationEngine,
  TFRAuditSprint1,
  TFRAutomation,
  TFRTestAutomationEngine
} from "./18-automation-engine.js";
import { TFRExecuteFeyStep, TFRMigrateCloakDisplayName } from "./19-fey-step.js";
import { TFROpenControlPanel } from "./20-control-panel.js";
import { TFRApplySystemTemplates, TFRAuditSystemTemplates } from "./21-system-templates.js";
import {
  TFRAuditFeatureItems,
  TFRAuditGeneratedFeatureItems,
  TFRAuditResolvedTemplateItems,
  TFRAuditSpellbookFeatures,
  TFRCreateFeatureItems,
  TFRCreateResolvedTemplateItems,
  TFRCreateSpellbookFeatures,
  TFRDeleteFeatureItems,
  TFRResolveTemplate
} from "./22-feature-items.js";
import { TFRRegisterFeyStepChatAutomation, TFRRegisterRelicActivityGateHooks } from "./24-chat-and-gates.js";
import { TFRPassiveStatus, TFRRegisterPassiveTriggers } from "./27-passive-triggers.js";

Hooks.once("ready", async () => {
  Hooks.on("renderItemSheet", TFRApplyRelicSheetVisibility);
  Hooks.on("renderItemSheet5e", TFRApplyRelicSheetVisibility);

  window.FirstRelics = {
    loadRelics: TFRLoadRelics,
    createRelics: TFRCreateRelics,
    createItems: TFRCreateRelics,
    createJournal: TFRCreateJournal,
    createAll: TFRCreateAll,
    updateStage: TFRUpdateRelicItem,
    upgradeItem: TFRUpgradeItem,
    downgradeItem: TFRDowngradeItem,
    initActorRelicData: TFRInitActorRelicData,
    setAffinity: TFRSetAffinity,
    adjustAffinity: TFRAdjustAffinity,
    deleteAll: TFRDeleteAll,
    openDashboard: TFROpenDashboard,
    dashboard: TFROpenDashboard,
    syncStageFromAffinity: TFRSyncStageFromAffinity,
    getRelicState: TFRGetRelicState,
    setRelicAffinity: TFRSetRelicAffinity,
    adjustRelicAffinity: TFRAdjustRelicAffinity,
    applyAffinityEvent: TFRApplyAffinityEvent,
    audit: TFRAuditRelics,
    auditActivities: TFRAuditActivities,
    auditMidiEffects: TFRAuditMidiEffects,
    auditNative: TFRAuditNative,
    auditTargeting: TFRAuditTargeting,
    auditAbilityDesign: TFRAuditAbilityDesign,
    auditInventorySync: TFRAuditInventorySync,
    syncAllInventoryStages: TFRSyncAllInventoryStages,
    auditStageSyncSafety: TFRAuditStageSyncSafety,
    setRequirement: TFRSetRequirement,
    unlockMemory: TFRUnlockMemory,
    sendDream: TFRSendDream,
    addTimeline: TFRAddTimeline,
    auditProgression: TFRAuditProgression,
    createTestLab: TFRCreateTestLab,
    deleteTestLab: TFRDeleteTestLab,
    auditTestLab: TFRAuditTestLab,
    resetTestLab: TFRResetTestLabSafe,
    restoreAfterTestLab: TFRRestoreAfterTestLabSafe,
    destroyTestLab: TFRDestroyTestLabSafe,
    runDiagnostics: TFRRunDiagnostics,
    runPlaytestHealthCheck: TFRRunPlaytestHealthCheck,
    runReleaseCheck: TFRRunReleaseCandidateCheck,
    runReleaseCandidateCheck: TFRRunReleaseCandidateCheck,
    auditRelicQAMatrix: TFRAuditRelicQAMatrix,
    auditFinalFormBonuses: TFRAuditFinalFormBonuses,
    auditProgressiveAppearances: TFRAuditProgressiveAppearanceUnlocks,
    syncExistingLoreJournal: TFRSyncExistingLoreJournal,
    auditRuntimeCoverage: TFRAuditRuntimeCoverage,
    auditRelicCleanup: TFRAuditRelicCleanup,
    activityCount: TFRActivityCount,
    createPlaytestLab: TFRCreatePlaytestLabSafe,
    auditActivitiesDetailed: TFRAuditActivitiesDetailed,
    inspectRelicActivities: TFRInspectRelicActivities,
    auditSprint1: TFRAuditSprint1,
    auditAutomationEngine: TFRAuditAutomationEngine,
    testAutomationEngine: TFRTestAutomationEngine,
    automation: TFRAutomation,
    feyStep: TFRExecuteFeyStep,
    auditActivityTemplates: TFRAuditActivityTemplates,
    openControlPanel: TFROpenControlPanel,
    applySystemTemplates: TFRApplySystemTemplates,
    auditSystemTemplates: TFRAuditSystemTemplates,
    createFeatureItems: TFRCreateFeatureItems,
    auditFeatureItems: TFRAuditFeatureItems,
    resolveTemplate: TFRResolveTemplate,
    createResolvedTemplateItems: TFRCreateResolvedTemplateItems,
    auditResolvedTemplateItems: TFRAuditResolvedTemplateItems,
    createSpellbookFeatures: TFRCreateSpellbookFeatures,
    auditSpellbookFeatures: TFRAuditSpellbookFeatures,
    deleteFeatureItems: TFRDeleteFeatureItems,
    auditGeneratedFeatureItems: TFRAuditGeneratedFeatureItems,
    useCloakAbility: TFRUseCloakAbility,
    useRelicAbility: TFRUseRelicAbility,
    useSelectedRelicAbility: TFRUseSelectedRelicAbility,
    shadowStep: (actorOrId = null, options = {}) => TFRUseRelicAbility(actorOrId, "cloak_shadowfell", "active1", options),
    fadeAway: (actorOrId = null, options = {}) => TFRUseRelicAbility(actorOrId, "cloak_shadowfell", "active2", options),
    auditAllRelicEffects: TFRAuditAllRelicEffectAutomation,
    auditSaveAwarePending: TFRAuditSaveAwarePending,
    resolveSaveAwareManual: TFRResolveSaveAwareManual,
    applyBriarSnare: TFRApplyVerdantSnare,
    applyVerdantSnare: TFRApplyVerdantSnare,
    applyRestrainedCondition: TFRApplyRestrainedCondition,
    refreshActorAndItemSheets: TFRRefreshActorAndItemSheets,
    auditCloakAutomation: TFRAuditCloakAutomation,
    migrateCloakDisplayName: TFRMigrateCloakDisplayName,
    migrateLegacyRelicIds: TFRMigrateLegacyRelicIds,
    syncSealedTrueNameDescriptions: TFRSyncSealedTrueNameDescriptions,
    syncProgressiveAppearanceDescriptions: TFRSyncProgressiveAppearanceDescriptions,
    syncFinalFormItems: TFRSyncFinalFormItems,
    syncPassiveEffects: TFRSyncAllPassiveEffects,
    passiveStatus: TFRPassiveStatus,
    auditTrueNameSealing: TFRAuditTrueNameSealing,
    clearLockedActivities: TFRClearLockedActivities,
    setAttunementRefusal: TFRSetAttunementRefusal,
    setRelicAttunementRefusal: TFRSetRelicAttunementRefusal,
    refuseAttunement: itemOrUuid => TFRSetAttunementRefusal(itemOrUuid, true),
    allowAttunement: itemOrUuid => TFRSetAttunementRefusal(itemOrUuid, false)
  };
  TFRRegisterWorldState();
  TFRRegisterSettings();
  TFRRegisterFeyStepChatAutomation();
  TFRRegisterRelicActivityGateHooks();
  TFRRegisterTimedEffectExpiry();
  TFRRegisterPassiveTriggers();
  TFRRegisterSaveAwareAutomation();
  TFRRegisterSaveAwareChatButtons();
  TFRRegisterAttunementRefusal();
  TFRSetStartupSync((async () => {
    try {
      await TFRMigrateLegacyRelicIds();
    } catch (error) {
      console.error("The First Relics | Could not migrate renamed relic ids.", error);
    }
    try {
      await TFRInitContentLanguage();
    } catch (error) {
      console.error("The First Relics | Could not initialize the relic content language.", error);
    }
    try {
      await TFRNormalizeRefusingRelicItems();
    } catch (error) {
      console.error("The First Relics | Could not normalize refused relic feature suppression.", error);
    }
    try {
      await TFRMigrateCloakDisplayName();
    } catch (error) {
      console.error(`The First Relics | Could not migrate existing items to ${TFR_CLOAK_DISPLAY_NAME}.`, error);
    }
    try {
      await TFRSyncSealedTrueNameDescriptions();
    } catch (error) {
      console.error("The First Relics | Could not repair prematurely revealed true names.", error);
    }
    try {
      await TFRSyncExistingLoreJournal();
    } catch (error) {
      console.error("The First Relics | Could not synchronize the existing lore journal.", error);
    }
    try {
      await TFRSyncFinalFormItems();
    } catch (error) {
      console.error("The First Relics | Could not synchronize 1000-Affinity Final Form bonuses.", error);
    }
    try {
      await TFRSyncAllPassiveEffects();
    } catch (error) {
      console.error("The First Relics | Could not synchronize passive feature effects.", error);
    }
    try {
      await TFRSyncProgressiveAppearanceDescriptions();
    } catch (error) {
      console.error("The First Relics | Could not synchronize progressive player manifestations.", error);
    }
  })());
  await TFR_STARTUP_SYNC;
  console.log(`The First Relics Framework v${TFR_VERSION} loaded.`);
});
