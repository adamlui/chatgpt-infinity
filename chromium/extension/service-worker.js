// Launch CHATGPT on install
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') // to exclude updates
        chrome.tabs.create({ url: 'https://chatgpt.com/' })
})

// Sync SETTINGS to activated tabs
chrome.tabs.onActivated.addListener(activeInfo =>
    chrome.tabs.sendMessage(activeInfo.tabId, {
        action: 'syncConfigToUI',
        sender: 'service-worker.js' // for content.js to reset config.infinityMode
}))

// Show ABOUT modal on ChatGPT when toolbar button clicked
chrome.runtime.onMessage.addListener(async req => {
    if (req.action == 'showAbout') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const chatgptTab = new URL(activeTab.url).hostname == 'chatgpt.com' ? activeTab
            : await chrome.tabs.create({ url: 'https://chatgpt.com/' })
        if (activeTab != chatgptTab) await new Promise(resolve => // after new tab loads
            chrome.tabs.onUpdated.addListener(async function statusListener(tabId, info) {
                if (tabId == chatgptTab.id && info.status == 'complete') {
                    chrome.tabs.onUpdated.removeListener(statusListener)
                    setTimeout(resolve, 2500)
        }}))
        chrome.tabs.sendMessage(chatgptTab.id, { action: 'showAbout' })
    }
});

// Init APP data
(async () => {
    const app = {
        version: chrome.runtime.getManifest().version,
        latestResourceCommitHash: '42e5099', // for cached app.json...
            // ... + navicon in toggles.sidebar.insert() + icons.questionMark.src
        urls: {},
        chatgptJSver: /v(\d+\.\d+\.\d+)/.exec(await (await fetch(chrome.runtime.getURL('lib/chatgpt.js'))).text())[1]
    }
    app.urls.resourceHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-infinity@${app.latestResourceCommitHash}`
    const remoteAppData = await (await fetch(`${app.urls.resourceHost}/assets/data/app.json`)).json()
    Object.assign(app, { ...remoteAppData, urls: { ...app.urls, ...remoteAppData.urls }})
    chrome.storage.local.set({ app }) // save to browser storage
})()
