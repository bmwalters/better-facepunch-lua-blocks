// https://github.com/Rob--W/chrome-api/tree/master/worker_proxy

(function() {
  "use strict"
  let MSG_GET_TOKEN = "worker_proxy wants to get communication token"

  let workerProxyToken

  /**
   * Get the session token used to authenticate messages between the
   * content script and worker proxy page. This value will change whenever the
   * background/event page unloads.
   *
   * @returns {string} session token
   */
  function getProxyWorkerChannelToken() {
    if (workerProxyToken) { return workerProxyToken }

    let buffer = new Uint8Array(100)
    crypto.getRandomValues(buffer)

    let randomToken = ""

    for (let i = 0; i < buffer.length; ++i) {
      randomToken += buffer[i].toString(36)
    }

    workerProxyToken = randomToken

    return workerProxyToken
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === MSG_GET_TOKEN) {
      sendResponse(getProxyWorkerChannelToken())
    }
  })
}())
