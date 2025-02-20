const chatgptURL = 'https://chatgpt.com'

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
        if (activeTab != chatgptTab) new Promise(resolve => // after ChatGPT loads
            chrome.tabs.onUpdated.addListener(async function loadedListener(tabId, changeInfo) {
                if (tabId == chatgptTab.id && changeInfo.status == 'complete') {
                    chrome.tabs.onUpdated.removeListener(loadedListener) ; setTimeout(resolve, 500)
        }})).then(() => chrome.tabs.sendMessage(chatgptTab.id, { action: 'showAbout' }))
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
