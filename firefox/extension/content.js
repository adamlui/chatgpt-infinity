// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
//  © 2023–2024 KudoAI & contributors under the MIT license

(async () => {

    document.documentElement.setAttribute('chatgpt-infinity-extension-installed', true) // for userscript auto-disable

    // Import JS resources
    for (const resource of
        ['components/modals.js', 'components/toggles.js', 'lib/chatgpt.js', 'lib/dom.js', 'lib/settings.js'])
            await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = { browser: { isMobile: chatgpt.browser.isMobile() }, ui: { scheme: getScheme() }}
    env.browser.isPortrait = env.browser.isMobile && (window.innerWidth < window.innerHeight)

    // Import APP data
    const { app } = await chrome.storage.sync.get('app')

    // Export DEPENDENCIES to imported resources
    dom.imports.import({ env }) // for env.ui.scheme
    modals.imports.import({ app, env }) // for app data + env.ui.scheme

    // Add CHROME MSG listener
    chrome.runtime.onMessage.addListener((req, _, sendResp) => {
        if (req.action == 'notify')
            notify(...['msg', 'pos', 'notifDuration', 'shadow'].map(arg => req.options[arg]))
        else if (req.action == 'alert')
            modals.alert(...['title', 'msg', 'btns', 'checkbox', 'width'].map(arg => req.options[arg]))
        else if (req.action == 'showAbout') chatgpt.isLoaded().then(() => { modals.open('about') })
        else if (req.action == 'prompt') {
            const userInput = window.prompt(req.options.msg || 'Please enter your input:', req.options.defaultVal || '')
            sendResp({ input: userInput })
        } else if (req.action == 'syncConfigToUI') {
            if (req.sender == 'background.js') // disable Infinity mode 1st to not transfer between tabs
                settings.save('infinityMode', false)
            syncConfigToUI(req.options)
        }
    })

    // Init SETTINGS
    await settings.load('extensionDisabled', ...Object.keys(settings.controls)
        .filter(key => key != 'infinityMode')) // exclude infinityMode...
    settings.save('infinityMode', false) // ...to always init as false
    if (!config.replyLanguage) // init reply language if unset
        settings.save('replyLanguage', (await chrome.i18n.getAcceptLanguages())[0])
    if (!config.replyTopic) // init reply topic if unset
        settings.save('replyTopic', chrome.i18n.getMessage('menuLabel_all'))
    if (!config.replyInterval) settings.save('replyInterval', 7) // init refresh interval to 7 secs if unset

    // Define FUNCTIONS

    function notify(msg, pos = '', notifDuration = '', shadow = '') {

        // Strip state word to append colored one later
        const foundState = [ chrome.i18n.getMessage('state_on').toUpperCase(),
                             chrome.i18n.getMessage('state_off').toUpperCase()
              ].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, pos, notifDuration, shadow || env.ui.scheme == 'dark' ? '' : 'shadow')
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

    async function syncConfigToUI(options) { // on toolbar popup toggles + ChatGPT tab activations
        await settings.load('extensionDisabled', ...Object.keys(settings.controls))
        if (options?.updatedKey == 'infinityMode') infinity[config.infinityMode ? 'activate' : 'deactivate']()
        else if (settings.controls[options?.updatedKey]?.type == 'prompt' && config.infinityMode)
            infinity.restart({ target: options?.updatedKey == 'replyInterval' ? 'self' : 'new' })
        if (/extensionDisabled|infinityMode|toggleHidden/.test(options?.updatedKey)) toggles.sidebar.updateState()
    }

    function getScheme() {
        return document.documentElement.className
            || (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light')
    }

    chatgpt.isIdle = function() { // replace waiting for chat to start in case of interrupts
        return new Promise(resolve => { // when stop btn missing
            new MutationObserver((_, obs) => {
                if (!chatgpt.getStopBtn()) { obs.disconnect(); resolve() }
            }).observe(document.body, { childList: true, subtree: true })
        })
    }

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
    env.ui.firstLink = chatgpt.getNewChatLink()

    // Add LISTENER to auto-disable Infinity Mode
    document.onvisibilitychange = () => {
        if (config.infinityMode) {
            settings.save('infinityMode', false) ; syncConfigToUI({ updatedKey: 'infinityMode' }) }
    }

    // Add STARS styles
    ['black', 'white'].forEach(color => document.head.append(
        dom.create.elem('link', { rel: 'stylesheet',
            href: `https://assets.aiwebextensions.com/styles/rising-stars/dist/${
                color}.min.css?v=0cde30f9ae3ce99ae998141f6e7a36de9b0cc2e7`
    })))

    toggles.imports.import({ app, env, notify, syncConfigToUI })
    toggles.sidebar.insert()

    // Auto-start if enabled
    if (config.autoStart) {
        settings.save('infinityMode', true) ; syncConfigToUI({ updatedKey: 'infinityMode' })
        notify(`${chrome.i18n.getMessage('menuLabel_autoStart')}: ${chrome.i18n.getMessage('state_on').toUpperCase()}`)
    }

    // Monitor NODE CHANGES to maintain sidebar toggle visibility
    new MutationObserver(() => {
        if (!config.toggleHidden && !document.querySelector(`.${toggles.sidebar.class}`)
            && toggles.sidebar.status != 'inserting') {
                toggles.sidebar.status = 'missing' ; toggles.sidebar.insert() }
    }).observe(document.body, { attributes: true, subtree: true })

    // Monitor SCHEME PREF changes to update sidebar toggle + modal colors
    new MutationObserver(handleSchemePrefChange).observe( // for site scheme pref changes
        document.documentElement, { attributes: true, attributeFilter: ['class'] })
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener( // for browser/system scheme pref changes
        'change', () => requestAnimationFrame(handleSchemePrefChange))
    function handleSchemePrefChange() {
        const displayedScheme = getScheme()
        if (env.ui.scheme != displayedScheme) {
            env.ui.scheme = displayedScheme ; toggles.sidebar.updateColor() ; modals.stylize() }
    }

    // Disable distracting SIDEBAR CLICK-ZOOM effect
    if (!document.documentElement.hasAttribute('sidebar-click-zoom-observed')) {
        new MutationObserver(mutations => mutations.forEach(({ target }) => {
            if (target.closest('[class*=sidebar]') // include sidebar elems
                && !target.closest('[class*=sidebar-toggle]') // exclude our toggles.sidebar's elems
                && target.style.transform != 'none' // click-zoom occurred
            ) target.style.transform = 'none'
        })).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] })
        document.documentElement.setAttribute('sidebar-click-zoom-observed', true)
    }

})()
