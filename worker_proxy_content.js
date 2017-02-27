// https://github.com/Rob--W/chrome-api/tree/master/worker_proxy

(function() {
  "use strict"

  let MSG_GET_TOKEN = "worker_proxy wants to get communication token"

  let proxyFrame
  let proxyFrameMessageQueue = []
  let proxyFrameReady = false

  /**
   * Post a message to the worker proxy frame.
   *
   * @param {object} message  Message to post.
   * @param {array|undefined} transferables List of transferable objects.
   * @return {undefined}
   */
  function postMessageToWorkerProxy(message, transferables) {
    proxyFrameMessageQueue.push([message, transferables])

    let loadFrameAndFlush

    let flushMessages = function(token) {
      let contentWindow = proxyFrame.contentWindow

      if (!contentWindow) {
        // This should NEVER happen. When it happens, try to recover by
        // creating the frame again, so that new Workers can be created.
        console.warn("WARNING: The worker proxy frame was removed " +
               "all previous workers have been terminated. ")
        loadFrameAndFlush()
        return
      }

      while (proxyFrameMessageQueue.length) {
        // data = [message, transferables]
        let data = proxyFrameMessageQueue.shift()
        data[0].channel_token = token
        // todo: strict origin
        contentWindow.postMessage(data[0], "*", data[1])
      }
    }

    loadFrameAndFlush = function() {
      proxyFrameReady = false

      proxyFrame = document.createElement("iframe")

      proxyFrame.src = chrome.runtime.getURL("worker_proxy.html")

      proxyFrame.style.cssText = `
        position: fixed !important;
        top: -99px !important;
        left: -99px !important;
        width: 2px !important;
        height: 2px !important:
        border: 0 !important;
      `

      proxyFrame.addEventListener("load", () => {
        chrome.runtime.sendMessage(MSG_GET_TOKEN, function(token) {
          if (typeof token != "string") {
            console.warn(
              "Refused to initialize Web Worker because a " +
              "session token could not be negotiated. Make sure " +
              "that worker_proxy.js is loaded first in the " +
              "background or event page.")
            return
          }

          proxyFrameReady = true

          flushMessages(token)
        })
      });

      (document.body || document.documentElement).appendChild(proxyFrame)
    }

    if (!proxyFrame) {
      loadFrameAndFlush()
    } else if (proxyFrameReady) {
      chrome.runtime.sendMessage(MSG_GET_TOKEN, function(token) {
        if (typeof token != "string") {
          // This message is different from the message below, because
          // failure to get a message for the first time is probably
          // caused by a developer error. If the first load succeeded
          // and the later token requests fail again, then either of
          // the following happened:
          // 1. The extension runtime was reloaded (e.g. by an update,
          //    or by pressing Ctrl + R at chrome://extensions, or
          //    by calling chrome.runtime.reload()) (most likely).
          // 2. The extension developer messed with the message
          //    handling and the first message only succeeded by
          //    coincidence.
          // 3. A bug in Chrome was introduced (least likely).
          console.warn("Failed to initialize Worker because of a " +
              "missing session token. Is the extension runtime " +
              "still valid?")
          return
        }
        flushMessages(token)
      })
    } // else wait until proxyFrame.onload fires.
  }

  function ContentScriptWorker(url) {
    if (!url) { throw new TypeError("Not enough arguments") }

    let messageChannel = new MessageChannel()
    let metadataChannel = new MessageChannel()

    // MessagePort implements EventTarget, onmessage and postMessage, these
    // events will be received by the other end and passed to the Worker.
    let fakeWorker = messageChannel.port1
    fakeWorker.terminate = function() {
      metadataChannel.port1.postMessage({
        type: "terminate"
      })
    }

    metadataChannel.port1.onmessage = function(event) {
      if (event.data.type == "error") {
        let error = new ErrorEvent("error", event.data.errorDetails)
        fakeWorker.dispatchEvent(error)
        if (typeof fakeWorker.onerror == "function") {
          fakeWorker.onerror(error)
        }
      }
    }

    messageChannel.port1.start()
    metadataChannel.port1.start()

    postMessageToWorkerProxy({
      worker_url: url
    }, [
      messageChannel.port2,
      metadataChannel.port2
    ])

    // Hide the MessagePort methods from the exposed API.
    fakeWorker.close = null
    fakeWorker.start = null

    return fakeWorker
  }

  window.Worker = ContentScriptWorker
}())
