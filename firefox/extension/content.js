// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
//  © 2023–2024 KudoAI & contributors under the MIT license

(async () => {

    document.documentElement.setAttribute('chatgpt-infinity-extension-installed', true) // for userscript auto-disable

    // Import LIBS
    await import(chrome.runtime.getURL('lib/chatgpt.js'))
    await import(chrome.runtime.getURL('lib/dom.js'))
    await import(chrome.runtime.getURL('lib/settings.js'))

    // Import COMPONENTS
    const { modals } = await import(chrome.runtime.getURL('components/modals.mjs'))
    await import(chrome.runtime.getURL('components/sidebarToggle.js'))

    // Import APP data
    const { app } = await chrome.storage.sync.get('app')

    // Add CHROME MSG listener
    chrome.runtime.onMessage.addListener((req, _, sendResp) => {
        if (req.action == 'notify')
            notify(...['msg', 'pos', 'notifDuration', 'shadow'].map(arg => req.options[arg]))
        else if (req.action == 'alert')
            siteAlert(...['title', 'msg', 'btns', 'checkbox', 'width'].map(arg => req.options[arg]))
        else if (req.action == 'prompt') {
            const userInput = window.prompt(req.options.msg || 'Please enter your input:', req.options.defaultVal || '')
            sendResp({ input: userInput })
        } else if (req.action == 'syncConfigToUI') {
            if (req.sender == 'background.js') // disable Infinity mode 1st to not transfer between tabs
                settings.save('infinityMode', false)
            syncConfigToUI(req.options)
        }
    })

    // Init ENV context
    const env = { browser: { isMobile: chatgpt.browser.isMobile() }}

    // Init SETTINGS
    await settings.load('extensionDisabled', ...Object.keys(settings.controls)
        .filter(key => key != 'infinityMode')) // exclude infinityMode...
    settings.save('infinityMode', false) // ...to always init as false
    if (!config.replyLanguage) // init reply language if unset
        settings.save('replyLanguage', (await chrome.i18n.getAcceptLanguages())[0])
    if (!config.replyTopic) // init reply topic if unset
        settings.save('replyTopic', chrome.i18n.getMessage('menuLabel_all'))
    if (!config.replyInterval) settings.save('replyInterval', 7) // init refresh interval to 7 secs if unset

    // Define FEEDBACK functions

    function notify(msg, pos = '', notifDuration = '', shadow = '') {

        // Strip state word to append colored one later
        const foundState = [ chrome.i18n.getMessage('state_on').toUpperCase(),
                             chrome.i18n.getMessage('state_off').toUpperCase()
              ].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, pos, notifDuration, shadow || chatgpt.isDarkMode() ? '' : 'shadow')
        const notif = document.querySelector('.chatgpt-notif:last-child')

        // Append styled state word
        if (foundState) {
            const styledStateSpan = dom.create.elem('span')
            styledStateSpan.style.cssText = `color: ${
                foundState == 'OFF' ? '#ef4848 ; text-shadow: rgba(255, 169, 225, 0.44) 2px 1px 5px'
                                    : '#5cef48 ; text-shadow: rgba(255, 250, 169, 0.38) 2px 1px 5px' }`
            styledStateSpan.append(foundState) ; notif.append(styledStateSpan)
        }
    }

    function siteAlert(title = '', msg = '', btns = '', checkbox = '', width = '') {
        const alertID = chatgpt.alert(title, msg, btns, checkbox, width ),
              alert = document.getElementById(alertID).firstChild
        modals.setup(alert) // add class + starry BG + drag handlers
        return alert
    }

    // Define UI functions

    async function syncConfigToUI(options) { // on toolbar popup toggles + ChatGPT tab activations
        await settings.load('extensionDisabled', ...Object.keys(settings.controls))
        if (options?.updatedKey == 'infinityMode') infinity[config.infinityMode ? 'activate' : 'deactivate']()
        else if (settings.controls[options?.updatedKey]?.type == 'prompt' && config.infinityMode)
            infinity.restart({ target: options?.updatedKey == 'replyInterval' ? 'self' : 'new' })
        if (/extensionDisabled|infinityMode|toggleHidden/.test(options?.updatedKey)) sidebarToggle.update()
    }

    chatgpt.isIdle = function() { // replace waiting for chat to start in case of interrupts
        return new Promise(resolve => { // when stop btn missing
            new MutationObserver((_, obs) => {
                if (!chatgpt.getStopBtn()) { obs.disconnect(); resolve() }
            }).observe(document.body, { childList: true, subtree: true })
        })
    }

    // Define INFINITY MODE functions

    const infinity = {

        async activate() {
            const activatePrompt = 'Generate a single random question'
                + ( config.replyLanguage ? ( ' in ' + config.replyLanguage ) : '' )
                + ( ' on ' + ( config.replyTopic == 'ALL' ? 'ALL topics' : 'the topic of ' + config.replyTopic ))
                + ' then answer it. Don\'t type anything else.'
            if (env.browser.isMobile && chatgpt.sidebar.isOn()) chatgpt.sidebar.hide()
            if (!new URL(location).pathname.startsWith('/g/')) // not on GPT page
                try { chatgpt.startNewChat() } catch (err) { return } // start new chat
            await new Promise(resolve => setTimeout(resolve, 500)) // sleep 500ms
            chatgpt.send(activatePrompt)
            await new Promise(resolve => setTimeout(resolve, 3000)) // sleep 3s
            if (!document.querySelector('[data-message-author-role]') // new chat reset due to OpenAI bug
                && config.infinityMode) // ...and toggle still active
                    chatgpt.send(activatePrompt) // ...so prompt again
            await chatgpt.isIdle()
            if (config.infinityMode && !infinity.isActive) // double-check in case de-activated before scheduled
                infinity.isActive = setTimeout(infinity.continue, parseInt(config.replyInterval, 10) * 1000)
        },

        async continue() {
            if (!config.autoScrollDisabled) try { chatgpt.scrollToBottom() } catch(err) {}
            chatgpt.send('Do it again.')
            await chatgpt.isIdle() // before starting delay till next iteration
            if (infinity.isActive) // replace timer
                infinity.isActive = setTimeout(infinity.continue, parseInt(config.replyInterval, 10) * 1000)
        },

        deactivate() {
            if (chatgpt.getStopBtn()) chatgpt.stop()
            clearTimeout(infinity.isActive) ; infinity.isActive = null
        },

        async restart(options = { target: 'new' }) {
            if (options.target == 'new') {
                infinity.deactivate() ; setTimeout(() => infinity.activate(), 750)
            } else {
                clearTimeout(infinity.isActive) ; infinity.isActive = null ; await chatgpt.isIdle()
                if (config.infinityMode && !infinity.isActive) { // double-check in case de-activated before scheduled
                    await settings.load('replyInterval')
                    infinity.isActive = setTimeout(infinity.continue, parseInt(config.replyInterval, 10) * 1000)
                }
            }
        }
    }

    // Run MAIN routine

    // Init BROWSER/UI props
    await Promise.race([chatgpt.isLoaded(), new Promise(resolve => setTimeout(resolve, 5000))]) // initial UI loaded
    await chatgpt.sidebar.isLoaded()
    env.ui = { firstLink: chatgpt.getNewChatLink() }

    // Add LISTENER to auto-disable Infinity Mode
    if (document.hidden != undefined) // ...if Page Visibility API supported
        document.onvisibilitychange = () => { if (config.infinityMode) infinity.deactivate() }

    // Add/update TWEAKS style
    const tweaksStyleUpdated = 1732600036095  // timestamp of last edit for this file's tweaksStyle
    let tweaksStyle = document.getElementById('tweaks-style') // try to select existing style
    if (!tweaksStyle || parseInt(tweaksStyle.getAttribute('last-updated')) < tweaksStyleUpdated) {
        if (!tweaksStyle) { // outright missing, create/id/attr/append it first
            tweaksStyle = dom.create.elem('style',
                { id: 'tweaks-style', 'last-updated': tweaksStyleUpdated.toString() })
            document.head.append(tweaksStyle)
        }
        tweaksStyle.innerText = (
            '[class$="-modal"] { z-index: 13456 ; position: absolute }' // to be click-draggable
          + ( chatgpt.isDarkMode() ? '.chatgpt-modal > div { border: 1px solid white }' : '' )
          + '.chatgpt-modal button {'
              + 'font-size: 0.77rem ; text-transform: uppercase ;' // shrink/uppercase labels
              + 'border-radius: 0 !important ;' // square borders
              + 'transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out ;' // smoothen hover fx
              + 'cursor: pointer !important ;' // add finger cursor
              + 'padding: 5px !important ; min-width: 102px }' // resize
          + '.chatgpt-modal button:hover {' // add zoom, re-scheme
              + 'transform: scale(1.055) ; color: black !important ;'
              + `background-color: #${ chatgpt.isDarkMode() ? '00cfff' : '9cdaff' } !important }`
          + '* { scrollbar-width: thin }' // make FF scrollbar skinny to not crop toggle
        )
    }; // eslint-disable-line

    // Add STARS styles
    ['black', 'white'].forEach(color => document.head.append(
        dom.create.elem('link', { rel: 'stylesheet',
            href: `https://assets.aiwebextensions.com/styles/css/${color}-rising-stars.min.css?v=50f457d`
    })))

    sidebarToggle.import({ app, env, notify, syncConfigToUI })
    sidebarToggle.insert()

    // Auto-start if enabled
    if (config.autoStart) {
        settings.save('infinityMode', true) ; syncConfigToUI({ updatedKey: 'infinityMode' })
        notify(`${chrome.i18n.getMessage('menuLabel_autoStart')}: ${chrome.i18n.getMessage('state_on').toUpperCase()}`)
    }

    // Monitor NODE CHANGES to maintain sidebar toggle visibility
    new MutationObserver(() => {
        if (!config.toggleHidden && !document.getElementById('infinity-toggle-navicon')
            && sidebarToggle.status != 'inserting') {
                sidebarToggle.status = 'missing' ; sidebarToggle.insert() }
    }).observe(document.body, { attributes: true, subtree: true })

    // Disable distracting SIDEBAR CLICK-ZOOM effect
    if (!document.documentElement.hasAttribute('sidebar-click-zoom-observed')) {
        new MutationObserver(mutations => mutations.forEach(({ target }) => {
            if (target.closest('[class*="sidebar"]') // include sidebar divs
                && !target.id.endsWith('-knob-span') // exclude our sidebarToggle
                && target.style.transform != 'none' // click-zoom occurred
            ) target.style.transform = 'none'
        })).observe(document.body, { attributes: true, subtree: true, attributeFilter: [ 'style' ]})
        document.documentElement.setAttribute('sidebar-click-zoom-observed', true)
    }

})()
