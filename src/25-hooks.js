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
  TFR_STARTUP_SYNC = (async () => {
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
  })();
  await TFR_STARTUP_SYNC;
  console.log(`The First Relics Framework v${TFR_VERSION} loaded.`);
});
