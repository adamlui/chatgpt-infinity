const config = {}
const settings = {

    controls: { // displays top-to-bottom in toolbar menu
        get infinityMode() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_infinityMode') }},
        get autoStart() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_autoStart'),
            helptip: settings.getMsg('helptip_autoStart') }},
        get toggleHidden() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_toggleVis'),
            helptip: settings.getMsg('helptip_toggleVis') }},
        get autoScrollDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_autoScroll'),
            helptip: settings.getMsg('helptip_autoScroll') }},
        get replyLanguage() { return { type: 'prompt', symbol: '🌐',
            label: settings.getMsg('menuLabel_replyLang'),
            helptip: settings.getMsg('prompt_updateReplyLang') }},
        get replyTopic() { return { type: 'prompt', symbol: '🧠',
            label: settings.getMsg('menuLabel_replyTopic'),
            helptip: settings.getMsg('prompt_updateReplyTopic') }},
        get replyInterval() { return { type: 'prompt', symbol: '⌚',
            label: settings.getMsg('menuLabel_replyInt'),
            helptip: settings.getMsg('prompt_updateReplyInt') }}
    },

    getMsg(key) {
        return typeof chrome != 'undefined' && chrome.runtime ? chrome.i18n.getMessage(key)
            : settings.appProps.msgs[key] // assigned from app.msgs in userscript
    },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        if (typeof chrome != 'undefined' && chrome.runtime) // asynchronously load from Chrome storage
            return Promise.all(keys.map(key => // resolve promise when all keys load
                new Promise(resolve => // resolve promise when single key value loads
                    chrome.storage.sync.get(key, result => {
                        config[key] = result[key] || false ; resolve()
        })))) ; else // synchronously load from userscript manager storage
            keys.forEach(key => config[key] = GM_getValue(settings.appProps.configKeyPrefix + '_' + key, false))
    },

    save(key, val) {
        if (typeof chrome != 'undefined' && chrome.runtime) // save to Chrome storage
            chrome.storage.sync.set({ [key]: val })
        else // save to userscript manager storage
            GM_setValue(settings.appProps.configKeyPrefix + '_' + key, val)
        config[key] = val // save to memory
    }
}

window.config = config ; window.settings = settings;
