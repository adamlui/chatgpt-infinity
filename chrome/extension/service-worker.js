(async () => {

    // Init APP data
    const app = { latestAssetCommitHash: '108447b', urls: {} }
    app.urls.assetHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-infinity@${app.latestAssetCommitHash}`
    const appData = await (await fetch(`${app.urls.assetHost}/app.json`)).json()
    Object.assign(app, { ...appData, urls: { ...app.urls, ...appData.urls }})
    
    // Init SETTINGS data
    Object.assign(app, { settings: {
        autoStart: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_autoStart') },
        toggleHidden: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_toggleVis') },
        autoScrollDisabled: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_autoScroll') },
        replyLanguage: { type: 'prompt', symbol: '🌐',
            label: chrome.i18n.getMessage('menuLabel_replyLang') },
        replyTopic: { type: 'prompt', symbol: '🧠',
            label: chrome.i18n.getMessage('menuLabel_replyTopic') },
        replyInterval: { type: 'prompt', symbol: '⌚',
            label: chrome.i18n.getMessage('menuLabel_replyInt') }
    }})

    chrome.storage.sync.set({ app }) // save to browser storage

    // Launch ChatGPT on install
    chrome.runtime.onInstalled.addListener(details => {
        if (details.reason == 'install')
            chrome.tabs.create({ url: 'https://chatgpt.com/' })
    })

    // Sync settings to activated tabs
    chrome.tabs.onActivated.addListener(activeInfo =>
        chrome.tabs.sendMessage(activeInfo.tabId, {
            action: 'syncStorageToUI',
            sender: 'background.js' // for content.js to reset config.infinityMode
    }))

})()
