import '@testing-library/jest-dom'

// vitest + jsdom 環境下 localStorage 可能不可用，確保有 mock
if (typeof window !== 'undefined' && !window.localStorage) {
    const store = {}
    Object.defineProperty(window, 'localStorage', {
        value: {
            getItem: (key) => store[key] ?? null,
            setItem: (key, val) => { store[key] = String(val) },
            removeItem: (key) => { delete store[key] },
            clear: () => { Object.keys(store).forEach(k => delete store[k]) },
        },
        writable: true,
    })
}
