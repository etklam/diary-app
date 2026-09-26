export async function deletePlanAndDraft(
  deleteRemote: () => Promise<unknown>,
  removeDraft: () => Promise<void>,
): Promise<{ deleted: true; draftCleared: boolean }> {
  await deleteRemote();
  try { await removeDraft(); return { deleted: true, draftCleared: true }; }
  catch { return { deleted: true, draftCleared: false }; }
}
