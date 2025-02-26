(async () => {

    // Import JS resources
    for (const resource of ['components/icons.js', 'lib/dom.js', 'lib/settings.js'])
        await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = {
        site: /([^.]+)\.[^.]+$/.exec(new URL((await chrome.tabs.query(
            { active: true, currentWindow: true }))[0].url).hostname)?.[1],
        browser: { displaysEnglish: chrome.i18n.getUILanguage().startsWith('en') }
    }

    // Import APP data
    const { app } = await chrome.storage.local.get('app')
    icons.import({ app }) // for src's using app.urls.assetHost

    // Define FUNCTIONS

    function getMsg(key) { return chrome.i18n.getMessage(key) }

    function notify(msg, pos = 'bottom-right') {
        if (config.notifDisabled && !msg.includes(getMsg('menuLabel_modeNotifs'))) return
        sendMsgToActiveTab('notify', { msg, pos })
    }

    async function sendMsgToActiveTab(action, options) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return await chrome.tabs.sendMessage(activeTab.id, { action: action, options: { ...options }})
    }

    function siteAlert(title, msg) { sendMsgToActiveTab('alert', { title, msg }) }
    async function sitePrompt(msg, defaultVal) { return await sendMsgToActiveTab('prompt', { msg, defaultVal }) }

    const sync = {
        fade() {

            // Toolbar icon
            chrome.action.setIcon({ path: Object.fromEntries(
                Object.keys(chrome.runtime.getManifest().icons).map(dimension =>
                    [dimension, `../icons/${ config.extensionDisabled ? 'faded/' : '' }icon${dimension}.png`]
            ))})

            // Menu elems
            document.querySelectorAll('.logo, .menu-title, .menu-entry').forEach((elem, idx) => {
                elem.style.transition = config.extensionDisabled ? '' : 'opacity 0.15s ease-in'
                setTimeout(() => elem.classList.toggle('disabled', config.extensionDisabled),
                    config.extensionDisabled ? 0 : idx *10) // fade-out abruptly, fade-in staggered
            })
        },

        configToUI(options) { return sendMsgToActiveTab('syncConfigToUI', options) }
    }

    function toTitleCase(str) {
        if (!str) return ''
        const words = str.toLowerCase().split(' ')
        for (let i = 0 ; i < words.length ; i++) words[i] = words[i][0].toUpperCase() + words[i].slice(1)
        return words.join(' ')
    }

    // Run MAIN routine

    // LOCALIZE extension title, set document lang
    const menuTitle = document.querySelector('.menu-title')
    menuTitle.innerText = getMsg(menuTitle.dataset.locale)
    document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0]

    // Init MASTER TOGGLE
    const masterToggle = {
        div: document.querySelector('.master-toggle'),
        switch: dom.create.elem('div', { class: 'toggle menu-icon highlight-on-hover' }),
        track: dom.create.elem('span', { class: 'track' })
    }
    masterToggle.div.append(masterToggle.switch) ; masterToggle.switch.append(masterToggle.track)
    await settings.load('extensionDisabled') ; masterToggle.switch.classList.toggle('on', !config.extensionDisabled)
    masterToggle.div.onclick = () => {
        env.extensionWasDisabled = config.extensionDisabled
        masterToggle.switch.classList.toggle('on') ; settings.save('extensionDisabled', !config.extensionDisabled)
        Object.keys(sync).forEach(key => sync[key]()) // sync fade + storage to UI
        notify(`${getMsg('appName')} 🧩 ${getMsg(`state_${ config.extensionDisabled ? 'off' : 'on' }`).toUpperCase()}`)
    }

    // Create CHILD menu entries on chatgpt.com
    if (env.site == 'chatgpt') {
        const childEntriesDiv = dom.create.elem('div') ; document.body.append(childEntriesDiv)
        const re_all = new RegExp(`^(${getMsg('menuLabel_all')}|all|any|every)$`, 'i')
        await settings.load(Object.keys(settings.controls))
        Object.keys(settings.controls).forEach(key => {
            const ctrlType = settings.controls[key].type,
                  ctrlStatus = settings.controls[key].status

            // Init entry's elems
            const entry = {
                div: dom.create.elem('div', {
                    class: 'menu-entry highlight-on-hover', title: settings.controls[key].helptip || '' }),
                leftElem: dom.create.elem('div', { class: `menu-icon ${ ctrlType || '' }` }),
                label: dom.create.elem('span')
            }
            entry.label.textContent = settings.controls[key].label
            entry.div.append(entry.leftElem, entry.label) ; childEntriesDiv.append(entry.div)
            if (ctrlType == 'toggle') { // add track to left, init knob pos
                entry.leftElem.append(dom.create.elem('span', { class: 'track' }))
                entry.leftElem.classList.toggle('on', settings.isEnabled(key))
            } else { // add symbol to left, append status to right
                entry.leftElem.innerText = settings.controls[key].symbol
                entry.label.innerText += ctrlStatus ? `— ${ctrlStatus }` : ''
            }

            entry.div.onclick = async () => {
                if (ctrlType == 'toggle') {
                    entry.leftElem.classList.toggle('on')
                    settings.save(key, !config[key]) ; sync.configToUI({ updatedKey: key })
                    notify(`${settings.controls[key].label} ${chrome.i18n.getMessage(`state_${
                        settings.isEnabled(key) ? 'on' : 'off' }`).toUpperCase()}`)
                } else {
                    if (key == 'replyLanguage') {
                        while (true) {
                            let replyLang = await (await sitePrompt(
                                `${getMsg('prompt_updateReplyLang')}:`, config.replyLanguage)).input
                            if (replyLang == null) break // user cancelled so do nothing
                            else if (!/\d/.test(replyLang)) { // valid reply language set
                                replyLang = ( // auto-case for menu/alert aesthetics
                                    replyLang.length < 4 || replyLang.includes('-') ? replyLang.toUpperCase()
                                        : toTitleCase(replyLang) )
                                settings.save('replyLanguage', replyLang || chrome.i18n.getUILanguage())
                                siteAlert(getMsg('alert_replyLangUpdated') + '!',
                                    `${getMsg('appName')} ${getMsg('alert_willReplyIn')} `
                                    + `${ replyLang || getMsg('alert_yourSysLang') }.`
                                )
                                break
                            }
                        }
                    } else if (key == 'replyTopic') {
                        let replyTopic = await (await sitePrompt(getMsg('prompt_updateReplyTopic')
                            + ' (' + getMsg('prompt_orEnter') + ' \'ALL\'):', config.replyTopic)).input
                        if (replyTopic != null) { // user didn't cancel
                            replyTopic = toTitleCase(replyTopic.toString()) // for menu/alert aesthetics
                            settings.save('replyTopic',
                                !replyTopic || re_all.test(replyTopic) ? getMsg('menuLabel_all')
                                                                    : replyTopic)
                            siteAlert(`${getMsg('alert_replyTopicUpdated')}!`,
                                `${getMsg('appName')} ${getMsg('alert_willAnswer')} `
                                    + ( !replyTopic || re_all.test(replyTopic) ?
                                            getMsg('alert_onAllTopics')
                                        : `${getMsg('alert_onTopicOf')} ${replyTopic}`
                                    ) + '!'
                            )
                        }
                    } else if (key == 'replyInterval') {
                        while (true) {
                            const replyInterval = await (await sitePrompt(
                                `${getMsg('prompt_updateReplyInt')}:`, config.replyInterval)).input
                            if (replyInterval == null) break // user cancelled so do nothing
                            else if (!isNaN(parseInt(replyInterval, 10)) && parseInt(replyInterval, 10) > 4) {
                                settings.save('replyInterval', parseInt(replyInterval, 10))
                                siteAlert(getMsg('alert_replyIntUpdated') + '!',
                                    getMsg('appName') + ' ' + getMsg('alert_willReplyEvery')
                                    + ' ' + replyInterval + ' ' + getMsg('unit_seconds') + '.')
                                break
                            }
                        }
                    }
                    sync.configToUI({ updatedKey: key }) ; close() // popup
                }
            }
        })
    }

    sync.fade() // based on master toggle

    // Create/append FOOTER container
    const footer = dom.create.elem('footer') ; document.body.append(footer)

    // Create/append CHATGPT.JS footer logo
    const cjsSpan = dom.create.elem('span', { class: 'cjs-span',
        title: env.browser.displaysEnglish ? '' : `${getMsg('about_poweredBy')} chatgpt.js` })
    const cjsLogo = dom.create.elem('img', {
        src: `${app.urls.cjsAssetHost}/images/badges/powered-by-chatgpt.js.png?b2a1975` })
    cjsSpan.onclick = () => { open(app.urls.chatgptJS) ; close() }
    cjsSpan.append(cjsLogo) ; footer.append(cjsSpan)

    // Create/append ABOUT footer button
    const aboutSpan = dom.create.elem('span', {
        title: `${getMsg('menuLabel_about')} ${getMsg('appName')}`,
        class: 'menu-icon highlight-on-hover', style: 'right:30px ; padding-top: 2px' })
    const aboutIcon = icons.create('questionMark', { width: 15, height: 13, style: 'margin-bottom: 0.04rem' })
    aboutSpan.onclick = () => { chrome.runtime.sendMessage({ action: 'showAbout' }) ; close() }
    aboutSpan.append(aboutIcon) ; footer.append(aboutSpan)

    // Create/append RELATED EXTENSIONS footer button
    const moreExtensionsSpan = dom.create.elem('span', {
        title:  getMsg('btnLabel_moreAIextensions'),
        class: 'menu-icon highlight-on-hover', style: 'right:2px ; padding-top: 2px' })
    const moreExtensionsIcon = icons.create('plus')
    moreExtensionsSpan.onclick = () => { open(app.urls.relatedExtensions) ; close() }
    moreExtensionsSpan.append(moreExtensionsIcon) ; footer.append(moreExtensionsSpan)

    // Remove LOADING SPINNER after imgs load
    Promise.all([...document.querySelectorAll('img')].map(img =>
        img.complete ? Promise.resolve() : new Promise(resolve => img.onload = resolve)
    )).then(() => document.querySelectorAll('[class^=loading]').forEach(elem => elem.remove()))

})()
