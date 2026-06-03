// Тестовые помощники. Node не имеет localStorage — подменяем минимальной
// Map-реализацией, чтобы store.js работал в чистом процессе без браузера.

// Ставит глобальный localStorage поверх Map. seed — начальное содержимое
// (объект ключ→строка). Возвращает саму Map, чтобы тест мог заглянуть внутрь.
export const installLocalStorage = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
  };
  return m;
};
