export const introKey = 'diary.beta.intro.v1';
export const workflow = [
  '用 Quick Diary 記下交易想法；草稿先加密保存在這台裝置。',
  '透過 Timeline、搜尋或 Calendar 找回日誌。',
  '從日誌開啟 Review，填寫結果與反思，再明確按下完成或更新。',
  '「草稿已存於裝置」不代表伺服器已儲存。結果未確認時，請保留草稿並使用唯讀查詢或聯絡支援，不要重複提交。',
];
export function createIntroduction(storage: { get(): Promise<string | null>; set(value: string): Promise<void> }) {
  let visible = false;
  const listeners = new Set<() => void>();
  const emit = (value: boolean) => { visible = value; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => visible,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async start() { try { emit(await storage.get() !== 'seen'); } catch { emit(true); } },
    async dismiss() { emit(false); try { await storage.set('seen'); } catch { /* A failed preference write only shows the introduction again next launch. */ } },
    show: () => emit(true),
  };
}
