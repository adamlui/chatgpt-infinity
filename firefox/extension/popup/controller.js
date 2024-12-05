(async () => {

    // Import JS resources
    for (const resource of ['components/icons.js', 'lib/dom.js', 'lib/settings.js'])
        await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = { site: /([^.]+)\.[^.]+$/.exec(new URL((await chrome.tabs.query(
        { active: true, currentWindow: true }))[0].url).hostname)?.[1] }

    // Import APP data
    const { app } = await chrome.storage.sync.get('app')
    icons.dependencies.import({ app }) // for src's using app.urls.mediaHost

    // Define FUNCTIONS

    async function sendMsgToActiveTab(action, options) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return await chrome.tabs.sendMessage(activeTab.id, { action: action, options: { ...options }})
    }

    function notify(msg, pos = 'bottom-right') { sendMsgToActiveTab('notify', { msg, pos }) }
    function siteAlert(title, msg) { sendMsgToActiveTab('alert', { title, msg }) }
    async function sitePrompt(msg, defaultVal) { return await sendMsgToActiveTab('prompt', { msg, defaultVal }) }

    const sync = {
        fade() {

            // Update toolbar icon
            const iconDimensions = [16, 32, 48, 64, 128], iconPaths = {}
            iconDimensions.forEach(dimension => iconPaths[dimension] = `../icons/${
                config.extensionDisabled ? 'faded/' : '' }icon${dimension}.png` )
            chrome.action.setIcon({ path: iconPaths })

            // Update menu contents
            document.querySelectorAll('div.logo, div.menu-title, div.menu')
                .forEach(elem => {
                    elem.classList.remove(masterToggle.checked ? 'disabled' : 'enabled')
                    elem.classList.add(masterToggle.checked ? 'enabled' : 'disabled')
                })
        },

        configToUI(options) { return sendMsgToActiveTab('syncConfigToUI', options) }
    }

    function toTitleCase(str) {
        if (!str) return ''
        const words = str.toLowerCase().split(' ')
        for (let i = 0 ; i < words.length ; i++)
            words[i] = words[i][0].toUpperCase() + words[i].slice(1)
        return words.join(' ')
    }

    // Run MAIN routine

    // Init MASTER TOGGLE
    const masterToggle = document.querySelector('input')
    await settings.load('extensionDisabled')
    masterToggle.checked = !config.extensionDisabled ; sync.fade()
    masterToggle.onchange = () => {
        settings.save('extensionDisabled', !config.extensionDisabled)
        if (config.infinityMode) // always disable Infinity Mode on master toggle
            document.querySelector('.menu-area > .toggle-switch > input')?.click()
        Object.keys(sync).forEach(key => sync[key]({ updatedKey: 'extensionDisabled' })) // sync fade + storage to UI
        if (!config.notifDisabled)
            notify(`${chrome.i18n.getMessage('appName')} 🧩 ${chrome.i18n.getMessage(`state_${
                config.extensionDisabled ? 'off' : 'on' }`).toUpperCase()}`)
    }

    // Create CHILD menu entries on chatgpt.com
    if (env.site == 'chatgpt') {
        await settings.load(Object.keys(settings.controls))
        const re_all = new RegExp(`^(${chrome.i18n.getMessage('menuLabel_all')}|all|any|every)$`, 'i')

        // Create/insert child section
        const togglesDiv = dom.create.elem('div', { class: 'menu' })
        document.querySelector('.menu-header').insertAdjacentElement('afterend', togglesDiv)

        // Create/insert child entries
        Object.keys(settings.controls).forEach(key => {

            // Init elems
            const menuItemDiv = dom.create.elem('div', {
                class: 'menu-item menu-area', title: settings.controls[key].helptip || '' })
            const menuLabel = dom.create.elem('label', { class: 'menu-icon' })
            const menuLabelSpan = dom.create.elem('span')
            let menuInput, menuSlider
            menuLabelSpan.textContent = settings.controls[key].label
            if (settings.controls[key].type == 'toggle') {
                menuInput = dom.create.elem('input', { type: 'checkbox' })
                menuInput.checked = /disabled|hidden/i.test(key) ^ config[key]
                menuSlider = dom.create.elem('span', { class: 'slider' })
                menuLabel.append(menuInput, menuSlider)
                menuLabel.classList.add('toggle-switch')
            } else { // prompt settings
                menuLabel.innerText = settings.controls[key].symbol
                menuLabel.classList.add('menu-prompt')
                menuLabelSpan.innerText +=  `— ${settings.controls[key].status}`
            }

            // Assemble/append elems
            menuItemDiv.append(menuLabel, menuLabelSpan)
            togglesDiv.append(menuItemDiv)

            // Add listeners
            if (settings.controls[key].type == 'toggle') {
                menuItemDiv.onclick = () => menuInput.click()
                menuInput.onclick = menuSlider.onclick = event => // prevent double toggle
                    event.stopImmediatePropagation()
                menuInput.onchange = () => {
                    settings.save(key, !config[key]) ; sync.configToUI({ updatedKey: key })
                    notify(`${settings.controls[key].label} ${chrome.i18n.getMessage(`state_${
                        /disabled|hidden/i.test(key) != config[key] ? 'on' : 'off'}`).toUpperCase()}`)
                }
            } else menuItemDiv.onclick = async () => {
                if (key == 'replyLanguage') {
                    while (true) {
                        let replyLang = await (await sitePrompt(
                            `${chrome.i18n.getMessage('prompt_updateReplyLang')}:`, config.replyLanguage)).input
                        if (replyLang == null) break // user cancelled so do nothing
                        else if (!/\d/.test(replyLang)) { // valid reply language set
                            replyLang = ( // auto-case for menu/alert aesthetics
                                replyLang.length < 4 || replyLang.includes('-') ? replyLang.toUpperCase()
                                    : replyLang.charAt(0).toUpperCase() + replyLang.slice(1).toLowerCase() )
                            settings.save('replyLanguage', replyLang || (await chrome.i18n.getAcceptLanguages())[0])
                            siteAlert(chrome.i18n.getMessage('alert_replyLangUpdated') + '!',
                                `${chrome.i18n.getMessage('appName')} ${chrome.i18n.getMessage('alert_willReplyIn')} `
                                  + `${ replyLang || chrome.i18n.getMessage('alert_yourSysLang') }.`
                            )
                            break
                        }
                    }
                } else if (key == 'replyTopic') {
                    let replyTopic = await (await sitePrompt(chrome.i18n.getMessage('prompt_updateReplyTopic')
                        + ' (' + chrome.i18n.getMessage('prompt_orEnter') + ' \'ALL\'):', config.replyTopic)).input
                    if (replyTopic != null) { // user didn't cancel
                        replyTopic = toTitleCase(replyTopic.toString()) // for menu/alert aesthetics
                        settings.save('replyTopic',
                            !replyTopic || re_all.test(replyTopic) ? chrome.i18n.getMessage('menuLabel_all')
                                                                   : replyTopic)
                        siteAlert(`${chrome.i18n.getMessage('alert_replyTopicUpdated')}!`,
                            `${chrome.i18n.getMessage('appName')} ${chrome.i18n.getMessage('alert_willAnswer')} `
                                + ( !replyTopic || re_all.test(replyTopic) ?
                                         chrome.i18n.getMessage('alert_onAllTopics')
                                    : `${chrome.i18n.getMessage('alert_onTopicOf')} ${replyTopic}`
                                ) + '!'
                        )
                    }
                } else if (key == 'replyInterval') {
                    while (true) {
                        const replyInterval = await (await sitePrompt(
                            `${chrome.i18n.getMessage('prompt_updateReplyInt')}:`, config.replyInterval)).input
                        if (replyInterval == null) break // user cancelled so do nothing
                        else if (!isNaN(parseInt(replyInterval, 10)) && parseInt(replyInterval, 10) > 4) {
                            settings.save('replyInterval', parseInt(replyInterval, 10))
                            siteAlert(chrome.i18n.getMessage('alert_replyIntUpdated') + '!',
                                chrome.i18n.getMessage('appName') + ' ' + chrome.i18n.getMessage('alert_willReplyEvery')
                                + ' ' + replyInterval + ' ' + chrome.i18n.getMessage('unit_seconds') + '.')
                            break
                        }
                    }
                }
                sync.configToUI({ updatedKey: key }) ; close() // popup
            }
        })

        sync.fade() // in case master toggle off
    }

    // LOCALIZE labels
    let translationOccurred = false
    document.querySelectorAll('[data-locale]').forEach(elem => {
        const localeKeys = elem.dataset.locale.split(' '),
              translatedText = localeKeys.map(key => chrome.i18n.getMessage(key)).join(' ')
        if (translatedText != elem.innerText) {
            elem.innerText = translatedText ; translationOccurred = true
    }})
    if (translationOccurred) // update <html lang> attr
        document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0]

    // Create/append FOOTER container
    const footer = dom.create.elem('footer')
    document.body.append(footer)

    // Create/append CHATGPT.JS footer logo
    const cjsDiv = dom.create.elem('div', { class: 'chatgpt-js' })
    const cjsLogo = dom.create.elem('img', {
        title: `${chrome.i18n.getMessage('about_poweredBy')} chatgpt.js`,
        src: `${app.urls.cjsMediaHost}/images/badges/powered-by-chatgpt.js-faded.png` })
    cjsLogo.onmouseover = cjsLogo.onmouseout = event => cjsLogo.src = `${
        app.urls.cjsMediaHost}/images/badges/powered-by-chatgpt.js${ event.type == 'mouseover' ? '' : '-faded' }.png`
    cjsLogo.onclick = () => chrome.tabs.create({ url: app.urls.chatgptJS })
    cjsDiv.append(cjsLogo) ; footer.append(cjsDiv)

    // Create/append ABOUT footer button
    const aboutSpan = dom.create.elem('span', {
        title: `${chrome.i18n.getMessage('menuLabel_about')} ${chrome.i18n.getMessage('appName')}`,
        class: 'menu-icon menu-area', style: 'right:30px ; padding-top: 2px' })
    const aboutIcon = icons.create({ name: 'questionMark', width: 15, height: 13, style: 'margin-bottom: 0.04rem' })
    aboutSpan.onclick = () => { chrome.runtime.sendMessage({ action: 'showAbout' }) ; close() }
    aboutSpan.append(aboutIcon) ; footer.append(aboutSpan)

    // Create/append RELATED EXTENSIONS footer button
    const moreExtensionsSpan = dom.create.elem('span', {
        title:  chrome.i18n.getMessage('btnLabel_moreAIextensions'),
        class: 'menu-icon menu-area', style: 'right:2px ; padding-top: 2px' })
    const moreExtensionsIcon = icons.create({ name: 'plus', size: 16 })
    moreExtensionsSpan.onclick = () => { chrome.tabs.create({ url: app.urls.relatedExtensions }) ; close() }
    moreExtensionsSpan.append(moreExtensionsIcon) ; footer.append(moreExtensionsSpan)

    // Hide loading spinner
    document.querySelectorAll('[class^="loading"]').forEach(elem => elem.style.display = 'none')

})()
