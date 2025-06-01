const chatgptURL = 'https://chatgpt.com';

// Init APP data
(async () => {
    const app = {
        version: chrome.runtime.getManifest().version,
        commitHashes: { app: 'a21423b' }, // for cached app.json
        runtime: (() => {
            return typeof chrome != 'undefined' && chrome.runtime ? (
                typeof browser != 'undefined' ? 'Firefox add-on'
                    : `Chromium ${ navigator.userAgent.includes('Edg') ? 'Edge add-on' : 'extension' }`
            ) : 'unknown'
        })()
    }
    app.urls = { resourceHost: `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-infinity@${app.commitHashes.app}` }
    const remoteAppData = await (await fetch(`${app.urls.resourceHost}/assets/data/app.json`)).json()
    Object.assign(app, { ...remoteAppData, urls: { ...app.urls, ...remoteAppData.urls }})
    chrome.storage.local.set({ app }) // save to browser storage
    chrome.runtime.setUninstallURL(app.urls.uninstall)
})()

// Launch CHATGPT on install
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') // to exclude updates
    chrome.tabs.create({ url: chatgptURL })
})

// Sync SETTINGS to activated tabs
chrome.tabs.onActivated.addListener(activeInfo =>
    chrome.tabs.sendMessage(activeInfo.tabId, {
        action: 'syncConfigToUI',
        fromBG: true // for content.js to reset config.infinityMode
}))

// Show ABOUT modal on ChatGPT when toolbar button clicked
chrome.runtime.onMessage.addListener(async req => {
    if (req.action == 'showAbout') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const chatgptTab = new URL(activeTab.url).hostname == 'chatgpt.com' ? activeTab
            : await chrome.tabs.create({ url: chatgptURL })
        if (activeTab != chatgptTab) await new Promise(resolve => // after new tab loads
            chrome.tabs.onUpdated.addListener(function loadedListener(tabId, changeInfo) {
                if (tabId == chatgptTab.id && changeInfo.status == 'complete') {
                    chrome.tabs.onUpdated.removeListener(loadedListener) ; setTimeout(resolve, 500)
        }}))
        chrome.tabs.sendMessage(chatgptTab.id, { action: 'showAbout' })
    }
})
