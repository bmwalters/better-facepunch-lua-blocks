let replacePreWithCodeMirror = function(pre) {
  let container = document.createElement("div")
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

  let luaMirror = CodeMirror(container.querySelector(".fpcm-code-box[data-box-id='lua']"), {
    value: pre.innerText
  })

  // lint the view after we register the lint function
  setTimeout(() => {
    luaMirror.performLint()
  }, 0)

  container.querySelector(".fpcm-prettify-button").addEventListener("click", (e) => {
    luaMirror.setValue(gluaPrettyPrintString(luaMirror.getValue()))
  })

  CodeMirror(container.querySelector(".fpcm-code-box[data-box-id='repl']"), {
    value: "-- TODO"
  })
}

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
    CodeMirror.registerHelper("lint", "lua", (code, options, editor) => {
      let result = gluaLintString(code)

      if (result == "good") {
        return []
      } else {
        return result.map((o) => {
          return {
            message: o.msg,
            severity: o.type,
            from: CodeMirror.Pos(o.startLine, o.startPos),
            to: CodeMirror.Pos(o.endLine, o.endPos)
          }
        })
      }
    })
  }, 0)

  for (let pre of document.querySelectorAll("pre.bbcode_code")) {
    replacePreWithCodeMirror(pre)
  }
}
