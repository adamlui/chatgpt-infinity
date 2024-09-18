(async () => {

    const app = await (await fetch(chrome.runtime.getURL('app.json'))).json(),
          allowedHosts = chrome.runtime.getManifest().content_scripts[0].matches
                             .map(url => url.replace(/^https?:\/\/|\/.*$/g, ''))

    // Add install/update actions
    chrome.runtime.onInstalled.addListener(details => {
        chrome.storage.local.set({ [`${app.configKeyPrefix}_extensionDisabled`]: false }) // auto-enable
        if (details.reason == 'install') chrome.tabs.create({ url: 'https://chatgpt.com/' }) // open ChatGPT
    })

    // Sync extension state/settings when ChatGPT tab active
    chrome.tabs.onActivated.addListener(activeInfo => {
        chrome.tabs.get(activeInfo.tabId, tab => {
            if (allowedHosts.includes(new URL(tab.url).hostname)) {
                chrome.tabs.sendMessage(tab.id, { action: 'syncExtension' })
    }})})

})()
