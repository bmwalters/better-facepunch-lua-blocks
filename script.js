let gluaWorker = (function() {
  let resolvers = []

  let worker = new Worker(chrome.runtime.getURL("glua_worker.js"))

  worker.onmessage = function(e) {
    if (resolvers[e.data.id]) {
      resolvers[e.data.id](e.data.result)
      delete resolvers[e.data.id]
    }
  }

  worker.lintString = function(code) {
    return new Promise((resolve, reject) => {
      resolvers.push(resolve)
      worker.postMessage({
        id: resolvers.length - 1,
        action: "lint",
        code: code
      })
    })
  }

  worker.prettyPrintString = function(code) {
    return new Promise((resolve, reject) => {
      resolvers.push(resolve)
      worker.postMessage({
        id: resolvers.length - 1,
        action: "prettyPrint",
        code: code
      })
    })
  }

  return worker
}())

let replacePreWithCodeMirror = function(pre) {
  let container = document.createElement("div")
  container.classList.add("fpcm-container")
  container.innerHTML = `
    <div class="fpcm-nav">
      <a data-link-id="lua" href="javascript:;" class="fpcm-nav-link active">Lua</a>
      <a data-link-id="repl" href="javascript:;" class="fpcm-nav-link">Run</a>
      <a href="javascript:;" class="fpcm-prettify-button fpcm-nav-right">Pretty Print</a>
    </div>
    <div class="fpcm-output">
      <div data-box-id="lua" class="fpcm-code-box active"></div>
      <div data-box-id="repl" class="fpcm-code-box"></div>
    </div>
    <div class="fpcm-resize-grabber">⋯</div>
  `

  let activeLink = container.querySelector(".fpcm-nav-link.active")
  let activeCodeBox = container.querySelector(".fpcm-code-box.active")

  let navLinkClicked = function(e) {
    if (activeLink) {
      activeLink.classList.remove("active")
    }

    e.target.classList.add("active")

    activeLink = e.target

    let codeBox = container.querySelector(`[data-box-id=${activeLink.dataset.linkId}]`)

    if (activeCodeBox) {
      activeCodeBox.classList.remove("active")
    }

    if (codeBox) {
      codeBox.classList.add("active")

      let codeMirror = codeBox.querySelector(".CodeMirror")
      if (codeMirror && codeMirror.CodeMirror) {
        codeMirror.CodeMirror.refresh()
      }
    }

    activeCodeBox = codeBox
  }

  for (let navLink of container.querySelectorAll(".fpcm-nav-link")) {
    navLink.addEventListener("click", navLinkClicked)
  }

  pre.parentElement.replaceChild(container, pre)

  let luaBox = container.querySelector(".fpcm-code-box[data-box-id='lua']")

  let luaMirror = CodeMirror(luaBox, {
    value: pre.innerText
  })

  // lint the view after we register the lint function
  setTimeout(() => {
    luaMirror.performLint()
  }, 0)

  container.querySelector(".fpcm-prettify-button").addEventListener("click", (e) => {
    gluaWorker.prettyPrintString(luaMirror.getValue())
    .then((prettyPrinted) => {
      luaMirror.setValue(prettyPrinted)
    })
  })

  let grabber = container.querySelector(".fpcm-resize-grabber")

  let isPointerDown = false

  grabber.addEventListener("mousedown", (mouseDownEvent) => {
    if (isPointerDown) { return }

    let initialOutputHeight

    let outputContainer = container.querySelector(".fpcm-output")

    isPointerDown = true

    let isDragging = false

    mouseDownEvent.preventDefault()

    let mouseMoveHandler = (e) => {
      let movedY = e.pageY - mouseDownEvent.pageY

      if (!isDragging && (Math.abs(movedY) > 3)) {
        isDragging = true
        initialOutputHeight = outputContainer.offsetHeight
      }

      if (isDragging) {
        e.preventDefault()
        outputContainer.style.height = `${initialOutputHeight + movedY}px`
      }
    }

    let mouseUpHandler = () => {
      isPointerDown = false
      isDragging = false

      window.removeEventListener("mousemove", mouseMoveHandler)
      window.removeEventListener("mouseup", mouseUpHandler)

      luaMirror.refresh()
    }

    window.addEventListener("mousemove", mouseMoveHandler)
    window.addEventListener("mouseup", mouseUpHandler)
  })

  CodeMirror(container.querySelector(".fpcm-code-box[data-box-id='repl']"), {
    value: "-- TODO"
  })
}

let lintFunc = (code, callback, options, editor) => {
  gluaWorker.lintString(code)
  .then((result) => {
    if (result == "good") {
      return callback([])
    } else {
      return callback(result.map((o) => {
        return {
          message: o.msg,
          severity: o.type,
          from: CodeMirror.Pos(o.startLine, o.startPos),
          to: CodeMirror.Pos(o.endLine, o.endPos)
        }
      }))
    }
  })
}

lintFunc.async = true

let currentForumSection = document.querySelectorAll(".navbit")[1].innerText

if (currentForumSection === "> Garry's Mod") {
  console.log("[FPCM] loaded")

  CodeMirror.defaults.mode = "lua"
  CodeMirror.defaults.lint = true
  CodeMirror.defaults.lineNumbers = true
  CodeMirror.defaults.theme = "monokai"
  CodeMirror.defaults.gutters = ["CodeMirror-lint-markers"]

  // gluaLintString is not registered for a frame
  setTimeout(() => {
    CodeMirror.registerHelper("lint", "lua", lintFunc)
  }, 0)

  for (let pre of document.querySelectorAll("pre.bbcode_code")) {
    replacePreWithCodeMirror(pre)
  }
}
