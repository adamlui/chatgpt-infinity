// Requires app (Greasemonkey only)

window.config = {}
window.settings = {

    categories: {
        get replySettings() { return {
            symbol: '💬',
            color: '856cb7', // purple
            label: `${settings.getMsg(`menuLabel_reply`)} ${settings.getMsg(`menuLabel_settings`)}`,
            helptip: `${settings.getMsg('helptip_adjustSettingsRelatedTo')} ${
                        settings.getMsg('menuLabel_reply').toLowerCase()}`
        }},
        get notifSettings() { return {
            symbol: '📣',
            color: '16e4f7', // teal
            label: `${settings.getMsg(`menuLabel_notif`)} ${settings.getMsg(`menuLabel_settings`)}`,
            helptip: `${settings.getMsg('helptip_adjustSettingsRelatedTo')} ${
                        settings.getMsg('menuLabel_modeNotifs').toLowerCase()}`
        }}
    },

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
        get replyLanguage() { return { type: 'prompt', symbol: '🌐', category: 'replySettings',
            label: settings.getMsg('menuLabel_replyLang'),
            helptip: settings.getMsg('prompt_updateReplyLang'),
            status: config.replyLanguage
        }},
        get replyTopic() { return { type: 'prompt', symbol: '🧠', category: 'replySettings',
            label: settings.getMsg('menuLabel_replyTopic'),
            helptip: settings.getMsg('prompt_updateReplyTopic'),
            status: config.replyTopic
        }},
        get replyInterval() { return { type: 'prompt', symbol: '⌚', category: 'replySettings',
            label: settings.getMsg('menuLabel_replyInt'),
            helptip: settings.getMsg('prompt_updateReplyInt'),
            status: `${config.replyInterval}s`
        }},
        get notifBottom() { return {
            type: 'toggle', defaultVal: false, category: 'notifSettings',
            label: `${settings.getMsg('menuLabel_anchor')} ${settings.getMsg('menuLabel_notifs')}`,
            helptip: settings.getMsg('helptip_notifBottom')
        }},
        get toastMode() { return {
            type: 'toggle', defaultVal: false, category: 'notifSettings',
            label: settings.getMsg('mode_toast'),
            helptip: settings.getMsg('helptip_toastMode')
        }}
    },

    getMsg(key) {
        this.msgKeys ??= new Map() // to cache keys for this.isEnabled() inversion logic
        const msg = typeof GM_info != 'undefined' ? app.msgs[key] : chrome.i18n.getMessage(key)
        this.msgKeys.set(msg, key)
        return msg
    },

    typeIsEnabled(key) { // for menu labels + notifs to return ON/OFF for type w/o suffix
        const reInvertFlags = /disabled|hidden/i
        return reInvertFlags.test(key) // flag in control key name
            && !reInvertFlags.test(this.msgKeys.get(this.controls[key]?.label) || '') // but not in label msg key name
                ? !config[key] : config[key] // so invert since flag reps opposite type state, else don't
    },

    load(...keys) {
        keys = keys.flat() // flatten array args nested by spread operator
        if (typeof GM_info != 'undefined') // synchronously load from userscript manager storage
            keys.forEach(key => config[key] = GM_getValue(
                `${app.configKeyPrefix}_${key}`,
                this.controls[key]?.defaultVal ?? this.controls[key]?.type == 'toggle')
            )
        else // asynchronously load from browser extension storage
            return Promise.all(keys.map(async key => // resolve promise when all keys load
                config[key] = (await chrome.storage.local.get(key))[key]
                    ?? this.controls[key]?.defaultVal ?? this.controls[key]?.type == 'toggle'
            ))
    },

    save(key, val) {
        if (typeof GM_info != 'undefined') // save to userscript manager storage
            GM_setValue(`${app.configKeyPrefix}_${key}`, val)
        else // save to browser extension storage
            chrome.storage.local.set({ [key]: val })
        config[key] = val // save to memory
    }
};
