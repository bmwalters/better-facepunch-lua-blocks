// https://github.com/Rob--W/chrome-api/tree/master/worker_proxy

(function() {
  let MSG_GET_TOKEN = "worker_proxy wants to get communication token"

  /**
   * Spawn a worker.
   *
   * @param {MessagePort} messagePort  Messages received on this port will be
   *                                   sent to the Worker and vice versa.
   * @param {MessagePort} metadataPort  Port used for sending internal data
   *                                    such as error events.
   * @param {string} url  URL of Web worker (relative to the location of
   *                      the HTML file that embeds this script).
   *
   * @return {undefined}
   */
  function createWorker(messagePort, metadataPort, url) {
    let worker = new Worker(url)

    worker.onmessage = function(event) {
      messagePort.postMessage(event.data)
    }

    worker.onerror = function(event) {
      metadataPort.postMessage({
        type: "error",
        errorDetails: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      })
    }

    metadataPort.onmessage = function(event) {
      if (event.data.type == "terminate") {
        worker.terminate()
        messagePort.close()
        metadataPort.close()
      }
    }

    messagePort.onmessage = function(event) {
      worker.postMessage(event.data)
    }

    metadataPort.start()
    messagePort.start()
  }

  function extensionProxyMessageHandler(event) {
    if (!event.data || !event.data.channel_token) {
      return
    }

    chrome.runtime.sendMessage(MSG_GET_TOKEN, function(token) {
      if (!token || event.data.channel_token !== token) {
        console.error("Auth failed, refused to create Worker channel.")
        return
      }

      createWorker(event.ports[0], event.ports[1], event.data.worker_url)
    })
  }

  window.addEventListener("message", extensionProxyMessageHandler)
}())
