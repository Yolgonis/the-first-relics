// Text these builders write into world documents (relic items, activities, effects, the lore
// journal) uses the world's relic content language, not the language of whichever GM triggers
// the write. Without this, a GM with an English interface would rewrite Turkish items in
// English on load. Each builder is synchronous, so the scope cannot leak into other code.
TFRBuildItem = TFRContentScoped(TFRBuildItem);
TFRBuildItemEffects = TFRContentScoped(TFRBuildItemEffects);
TFRBuildDescription = TFRContentScoped(TFRBuildDescription);
TFRBuildActivities = TFRContentScoped(TFRBuildActivities);
TFRBuildNativeActivityEffects = TFRContentScoped(TFRBuildNativeActivityEffects);
TFRCloneRelicItemDataForStage = TFRContentScoped(TFRCloneRelicItemDataForStage);
TFRSealTrueNameText = TFRContentScoped(TFRSealTrueNameText);
TFRBuildJournalOverview = TFRContentScoped(TFRBuildJournalOverview);
TFRBuildRelicJournalContent = TFRContentScoped(TFRBuildRelicJournalContent);
