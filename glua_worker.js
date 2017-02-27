/* globals gluaLintString, gluaPrettyPrintString */

self.importScripts("bower_components/glualint-lib/compiled.js")

let waitForFunction = function(funcName) {
  return new Promise((resolve, reject) => {
    if (typeof self[funcName] !== "undefined") {
      resolve()
    } else {
      let interval = setInterval(() => {
        if (typeof self[funcName] !== "undefined") {
          clearInterval(interval)

          resolve()
        }
      })
    }
  })
}

self.onmessage = (e) => {
  if (e.data.action === "lint") {
    waitForFunction("gluaLintString")
    .then(() => {
      postMessage({
        id: e.data.id,
        result: gluaLintString(e.data.code)
      })
    })
  } else if (e.data.action === "prettyPrint") {
    waitForFunction("gluaPrettyPrintString")
    .then(() => {
      postMessage({
        id: e.data.id,
        result: gluaPrettyPrintString(e.data.code)
      })
    })
  }
}
