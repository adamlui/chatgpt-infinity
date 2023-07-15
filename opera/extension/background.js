// Add install/update actions
chrome.runtime.onInstalled.addListener((details) => {
    chrome.storage.local.set({ 'chatgptInfinity_extensionDisabled': false }) // auto-enable
    if (details.reason == 'install') chrome.tabs.create({ url: 'https://chat.openai.com/' }) // open ChatGPT
})

// Sync extension state/settings when ChatGPT tab active
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (/^https:\/\/chat\.openai\.com/.test(tab.url)) {
            chrome.tabs.sendMessage(tab.id, { action: 'syncExtension' })
}})})
