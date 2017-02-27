importScripts("bower_components/glualint-lib/compiled.js")

onmessage = (e) => {
  if (typeof gluaLintString !== "undefined") {
    postMessage({
      id: e.data.id,
      result: gluaLintString(e.data.code)
    })
  } else {
    let interval = setInterval(() => {
      if (typeof gluaLintString !== "undefined") {
        clearInterval(interval)

        postMessage({
          id: e.data.id,
          result: gluaLintString(e.data.code)
        })
      }
    }, 0)
  }
}
