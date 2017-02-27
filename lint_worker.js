importScripts("bower_components/glualint-lib/compiled.js")

onmessage = (e) => {
  setTimeout(() => {
    postMessage({
      id: e.data.id,
      result: gluaLintString(e.data.code)
    })
  }, 0)
}
