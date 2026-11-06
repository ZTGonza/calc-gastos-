/** Utilidades compartidas por las pruebas; simula localStorage en Node.js. */
export function installLocalStorageMock() {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
    },
    confirm: () => true,
  };
  return values;
}
