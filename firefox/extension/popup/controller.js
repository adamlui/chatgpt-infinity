(async () => {

    // Import JS resources
    for (const resource of ['components/icons.js', 'lib/dom.js', 'lib/settings.js'])
        await import(chrome.runtime.getURL(resource))

    // Init ENV context
    window.env = {
        site: new URL((await chrome.tabs.query({ active: true, currentWindow: true }))[0].url)
            .hostname.split('.').slice(-2, -1)[0], // extract 2nd-level domain
        browser: { displaysEnglish: chrome.i18n.getUILanguage().startsWith('en') }
    }

    // Import APP data
    ;({ app: window.app } = await chrome.storage.local.get('app'))

    // Define FUNCTIONS

    function createMenuEntry(entryData) {
        const entry = {
            div: dom.create.elem('div', {
                id: entryData.key, class: 'menu-entry highlight-on-hover', title: entryData.helptip || '' }),
            leftElem: dom.create.elem('div', { class: `menu-icon ${ entryData.type || '' }` }),
            label: dom.create.elem('span')
        }
        entry.label.textContent = entryData.label
        entry.div.append(entry.leftElem, entry.label)
        if (entryData.type == 'toggle') { // add track to left, init knob pos
            entry.leftElem.append(dom.create.elem('span', { class: 'track' }))
            entry.leftElem.classList.toggle('on', settings.typeIsEnabled(entryData.key))
        } else { // add symbol to left, append status to right
            entry.leftElem.textContent = entryData.symbol || '⚙️' ; entry.label.style.flexGrow = 1
            if (entryData.status) entry.label.textContent += ` — ${entryData.status}`
            if (entryData.type == 'link') {
                entry.label.after(entry.rightElem = dom.create.elem('div', { class: 'menu-right-elem' }))
                entry.rightElem.append(icons.create('open', { size: 18, fill: 'black' }))
            }
        }
        if (entryData.type == 'category')
            entry.div.append(icons.create('caretDown', { size: 11, class: 'menu-caret menu-right-elem' }))
        entry.div.onclick = async () => {
            if (entryData.type == 'category') toggleCategorySettingsVisiblity(entryData.key)
            else if (entryData.type == 'toggle') {
                entry.leftElem.classList.toggle('on')
                settings.save(entryData.key, !config[entryData.key]) ; sync.configToUI({ updatedKey: entryData.key })
                notify(`${entryData.label} ${chrome.i18n.getMessage(`state_${
                    settings.typeIsEnabled(entryData.key) ? 'on' : 'off' }`).toUpperCase()}`)
            } else if (entryData.type == 'link') { open(entryData.url) ; close() }
            else {
                const re_all = new RegExp(`^(${getMsg('menuLabel_all')}|all|any|every)$`, 'i')
                if (entryData.key == 'replyLanguage') {
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
                } else if (entryData.key == 'replyTopic') {
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
                } else if (entryData.key == 'replyInterval') {
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
                sync.configToUI({ updatedKey: entryData.key }) ; close() // popup
            }
        }
        return entry.div
    }

    function getMsg(key) { return chrome.i18n.getMessage(key) }

    function notify(msg, pos = 'bottom-right') {
        if (config.notifDisabled && !msg.includes(getMsg('menuLabel_modeNotifs'))) return
        sendMsgToActiveTab('notify', { msg, pos })
    }

    async function sendMsgToActiveTab(action, options) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return await chrome.tabs.sendMessage(activeTab.id, { action, options })
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
                if (/about|coffeeLink/.test(elem.id)) return // never disable About/Coffee entries
                elem.style.transition = config.extensionDisabled ? '' : 'opacity 0.15s ease-in'
                setTimeout(() => elem.classList.toggle('disabled', config.extensionDisabled),
                    config.extensionDisabled ? 0 : idx *10) // fade-out abruptly, fade-in staggered
            })
        },

        configToUI(options) { return sendMsgToActiveTab('syncConfigToUI', options) }
    }

    function toggleCategorySettingsVisiblity(category, { transitions = true, action } = {}) {
        const transitionDuration = 350, // ms
              categoryDiv = document.getElementById(category),
              caret = categoryDiv.querySelector('.menu-caret'),
              catChildrenDiv = categoryDiv.nextSibling,
              catChild = catChildrenDiv.querySelectorAll('.menu-entry')
        if (action != 'hide' && dom.get.computedHeight(catChildrenDiv) == 0) { // show category settings
            categoryDiv.classList.toggle('expanded', true)
            Object.assign(catChildrenDiv.style, { height: `${dom.get.computedHeight(catChild)}px`,
                transition: transitions && !env.browser.isFF ? 'height 0.25s' : '' })
            Object.assign(caret.style, { // point it down
                transform: 'rotate(0deg)', transition: transitions ? 'transform 0.15s ease-out' : '' })
            catChild.forEach(row => { // reset styles to support continuous transition on rapid show/hide
                row.style.transition = 'none' ; row.style.opacity = 0 })
            catChildrenDiv.offsetHeight // force reflow to insta-apply reset
            catChild.forEach((row, idx) => { // fade-in staggered
                if (transitions) row.style.transition = `opacity ${ transitionDuration /1000 }s ease-in-out`
                setTimeout(() => row.style.opacity = 1, transitions ? idx * transitionDuration /10 : 0)
            })
            document.querySelectorAll(`.menu-entry:has(.menu-caret):not(#${category})`).forEach(otherCategoryDiv =>
                toggleCategorySettingsVisiblity(otherCategoryDiv.id, { action: 'hide' }))
        } else { // hide category settings
            categoryDiv.classList.toggle('expanded', false)
            Object.assign(catChildrenDiv.style, { height: 0, transition: '' })
            Object.assign(caret.style, { transform: 'rotate(-90deg)', transition: '' }) // point it right
        }
    }

    function toTitleCase(str) {
        if (!str) return ''
        const words = str.toLowerCase().split(' ')
        for (let i = 0 ; i < words.length ; i++) words[i] = words[i][0].toUpperCase() + words[i].slice(1)
        return words.join(' ')
    }

    // Run MAIN routine

    // LOCALIZE text/titles, set document lang
    document.querySelectorAll('[data-locale-text-content], [data-locale-title]').forEach(elemToLocalize =>
        Object.entries(elemToLocalize.dataset).forEach(([dataAttr, dataVal]) => {
            if (!dataAttr.startsWith('locale')) return
            const propToLocalize = dataAttr[6].toLowerCase() + dataAttr.slice(7), // convert to valid DOM prop
                  localizedTxt = dataVal.split(' ').map(key => getMsg(key) || key).join(' ')
            elemToLocalize[propToLocalize] = localizedTxt
        })
    )
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
    const footer = document.querySelector('footer')
    if (env.site == 'chatgpt') {
        await settings.load(Object.keys(settings.controls))
        const menuEntriesDiv = dom.create.elem('div') ; footer.before(menuEntriesDiv)

        // Group controls by category
        const categorizedCtrls = {}
        Object.entries(settings.controls).forEach(([key, ctrl]) =>
            ( categorizedCtrls[ctrl.category || 'general'] ??= {} )[key] = { ...ctrl, key: key })

        // Create/append general controls
        Object.values(categorizedCtrls.general || {}).forEach(ctrl => menuEntriesDiv.append(createMenuEntry(ctrl)))

        // Create/append categorized controls
        Object.entries(categorizedCtrls).forEach(([category, ctrls]) => {
            if (category == 'general') return
            const catData = { ...settings.categories[category], key: category, type: 'category' },
                  catChildrenDiv = dom.create.elem('div', { class: 'categorized-entries' })
            if (catData.color) // color the stripe
                catChildrenDiv.style.borderImage = `linear-gradient(transparent, #${catData.color}) 30 100%`
            menuEntriesDiv.append(createMenuEntry(catData), catChildrenDiv)
            Object.values(ctrls).forEach(ctrl => catChildrenDiv.append(createMenuEntry(ctrl)))
        })
    }

    // Create/append ABOUT entry
    const aboutEntry = {
        div: createMenuEntry({
            key: 'about', symbol: '💡',
            label: `${settings.getMsg('menuLabel_about')}...`,
            helptip: `${settings.getMsg('menuLabel_about')} ${settings.getMsg('appName')}`
        }),
        ticker: {
            textGap: '&emsp;&emsp;&emsp;',
            span: dom.create.elem('span', { class: 'ticker' }), innerDiv: dom.create.elem('div')
        }
    }
    aboutEntry.ticker.content = `${
        settings.getMsg('about_version')}: <span class="ticker-em">v${ app.version + aboutEntry.ticker.textGap }</span>${
        settings.getMsg('about_poweredBy')} <span class="ticker-em">chatgpt.js</span>${aboutEntry.ticker.textGap}`
    for (let i = 0 ; i < 7 ; i++) aboutEntry.ticker.content += aboutEntry.ticker.content // make long af
    aboutEntry.ticker.innerDiv.innerHTML = aboutEntry.ticker.content
    aboutEntry.ticker.span.append(aboutEntry.ticker.innerDiv)
    aboutEntry.div.append(aboutEntry.ticker.span) ; footer.before(aboutEntry.div)
    aboutEntry.div.onclick = () => { chrome.runtime.sendMessage({ action: 'showAbout' }) ; close() }

    // Create/append COFEE entry
    const coffeeEntry = createMenuEntry({
        key: 'coffeeLink', type: 'link', symbol: '☕',
        label: settings.getMsg('menuLabel_buyMeAcoffee'), url: app.urls.donate['ko-fi']
    })
    footer.before(coffeeEntry)

    // Create/append REVIEW entry
    const reviewEntry = createMenuEntry({
        key: 'reviewLink', type: 'link', symbol: '⭐',
        label: settings.getMsg('btnLabel_leaveReview'),
        url: app.urls.review[/edge|firefox/.exec(app.runtime.toLowerCase())?.[0] || 'chrome']
    })
    footer.before(reviewEntry)

    // AUTO-EXPAND categories
    document.querySelectorAll('.menu-entry:has(.menu-caret)').forEach(categoryDiv => {
        if (settings.categories[categoryDiv.id]?.autoExpand)
            toggleCategorySettingsVisiblity(categoryDiv.id, { transitions: false })
    })

    sync.fade() // based on master toggle

    // Init CHATGPT.JS footer tooltip/logo/listener
    const footerElems = { chatgptjs: { logo: footer.querySelector('.cjs-logo') }}
    footerElems.chatgptjs.logo.parentNode.title = env.browser.displaysEnglish ? ''
        : `${getMsg('about_poweredBy')} chatgpt.js` // add localized tooltip to English logo for non-English users
    footerElems.chatgptjs.logo.src = 'https://cdn.jsdelivr.net/gh/KudoAI/chatgpt.js@745f0ca'
                                   + '/assets/images/badges/powered-by-chatgpt.js.png'
    footerElems.chatgptjs.logo.onclick = () => { open(app.urls.chatgptjs) ; close() }

    // Init REVIEW footer icon/listener
    footerElems.review = { span: footer.querySelector('span[data-locale-title="btnLabel_leaveReview"]') }
    footerElems.review.span.append(footerElems.review.icon = icons.create('star', {
        style: 'position: relative ; top: 1px ; width: 13px ; height: 13px' }))
    footerElems.review.span.onclick = () => {
        open(app.urls.review[/edge|firefox/.exec(app.runtime.toLowerCase())?.[0] || 'chrome']) ; close() }

    // Init COFFEE footer icon/listener
    footerElems.coffee = { span: footer.querySelector('span[data-locale-title="menuLabel_buyMeAcoffee"]') }
    footerElems.coffee.span.append(icons.create('coffeeCup', { size: 23 }))
    footerElems.coffee.span.onclick = () => { open(app.urls.donate['ko-fi']) ; close() }

    // Init ABOUT footer icon/listener
    footerElems.about = { span: footer.querySelector('span[data-locale-title="menuLabel_about appName"]') }
    footerElems.about.span.append(icons.create('questionMark', { width: 15, height: 13 }))
    footerElems.about.span.onclick = () => { chrome.runtime.sendMessage({ action: 'showAbout' }) ; close() }

    // Init MORE EXTENSIONS footer icon/listener
    footerElems.moreExt = { span: footer.querySelector('span[data-locale-title=btnLabel_moreAIextensions]') }
    footerElems.moreExt.span.append(icons.create('plus'))
    footerElems.moreExt.span.onclick = () => { open(app.urls.relatedExtensions) ; close() }

    // Remove LOADING SPINNER after imgs load
    Promise.all([...document.querySelectorAll('img')].map(img =>
        img.complete ? Promise.resolve() : new Promise(resolve => img.onload = resolve)
    )).then(() => document.querySelectorAll('[class^=loading]').forEach(elem => elem.remove()))

})()
