chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'GENERATE_EMBEDDING') {
    chrome.runtime.sendMessage({
      type: 'CLIP_RESULT',
      error: 'Handled by web app API'
    })
  }
})
