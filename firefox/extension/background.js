// Launch CHATGPT on install
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') // to exclude updates
        chrome.tabs.create({ url: 'https://chatgpt.com/' })
})

// Sync SETTINGS to activated tabs
chrome.tabs.onActivated.addListener(activeInfo =>
    chrome.tabs.sendMessage(activeInfo.tabId, {
        action: 'syncStorageToUI',
        sender: 'background.js' // for content.js to reset config.infinityMode
}));

// Init APP data
(async () => {
    const app = { latestAssetCommitHash: '108447b', urls: {} }
    app.urls.assetHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-infinity@${app.latestAssetCommitHash}`
    const appData = await (await fetch(`${app.urls.assetHost}/app.json`)).json()
    Object.assign(app, { ...appData, urls: { ...app.urls, ...appData.urls }})
    chrome.storage.sync.set({ app }) // save to browser storage
})()
