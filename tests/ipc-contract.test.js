const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const principal = fs.readFileSync(path.join(__dirname, "../backend/principal.js"), "utf8");
const pont = fs.readFileSync(path.join(__dirname, "../backend/pont.js"), "utf8");

function extraireCanaux(source, expression) {
    return [...source.matchAll(expression)].map(match => match[1]);
}

test("chaque canal IPC exposé par le pont possède un handler unique et réciproquement", () => {
    const handlers = extraireCanaux(principal, /ipcMain\.handle\(\s*["'`]([^"'`]+)["'`]/g);
    const appels = extraireCanaux(pont, /ipcRenderer\.invoke\(\s*["'`]([^"'`]+)["'`]/g);
    assert.equal(new Set(handlers).size, handlers.length, "Des handlers IPC sont déclarés plusieurs fois.");
    assert.equal(new Set(appels).size, appels.length, "Des canaux IPC sont exposés plusieurs fois.");
    assert.deepEqual([...appels].sort(), [...handlers].sort(), "Le pont Electron et les handlers IPC ne correspondent pas.");
});
