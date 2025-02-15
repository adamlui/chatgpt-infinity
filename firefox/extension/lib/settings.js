// Requires app (Greasemonkey only)

window.config = {}
window.settings = {
    import(deps) { Object.assign(this.imports = this.imports || {}, deps) },

    controls: { // displays top-to-bottom in toolbar menu
        get infinityMode() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_infinityMode')
        }},
        get autoStart() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_autoStart'),
            helptip: settings.getMsg('helptip_autoStart')
        }},
        get toggleHidden() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_toggleVis'),
            helptip: settings.getMsg('helptip_toggleVis')
        }},
        get autoScrollDisabled() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_autoScroll'),
            helptip: settings.getMsg('helptip_autoScroll')
        }},
        get replyLanguage() { return { type: 'prompt', symbol: '🌐',
            label: settings.getMsg('menuLabel_replyLang'),
            helptip: settings.getMsg('prompt_updateReplyLang'),
            status: window.config.replyLanguage
        }},
        get replyTopic() { return { type: 'prompt', symbol: '🧠',
            label: settings.getMsg('menuLabel_replyTopic'),
            helptip: settings.getMsg('prompt_updateReplyTopic'),
            status: window.config.replyTopic
        }},
        get replyInterval() { return { type: 'prompt', symbol: '⌚',
            label: settings.getMsg('menuLabel_replyInt'),
            helptip: settings.getMsg('prompt_updateReplyInt'),
            status: `${window.config.replyInterval}s`
        }}
    },

    getMsg(key) {
        return typeof GM_info != 'undefined' ? this.imports.app.msgs[key] : chrome.i18n.getMessage(key) },

    load(...keys) {
        keys = keys.flat() // flatten array args nested by spread operator
        if (typeof GM_info != 'undefined') // synchronously load from userscript manager storage
            keys.forEach(key => config[key] = GM_getValue(
                `${this.imports.app.configKeyPrefix}_${key}`,
                this.controls[key]?.defaultVal ?? this.controls[key]?.type == 'toggle')
            )
        else // asynchronously load from browser extension storage
            return Promise.all(keys.map(async key => // resolve promise when all keys load
                window.config[key] = (await chrome.storage.local.get(key))[key]
                    ?? this.controls[key]?.defaultVal ?? this.controls[key]?.type == 'toggle'
            ))
    },

    save(key, val) {
        if (typeof GM_info != 'undefined') // save to userscript manager storage
            GM_setValue(`${this.imports.app.configKeyPrefix}_${key}`, val)
        else // save to browser extension storage
            chrome.storage.local.set({ [key]: val })
        window.config[key] = val // save to memory
    }
};
