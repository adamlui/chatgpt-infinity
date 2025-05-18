// Requires lib<chatgpt|dom>.js + <app|env> + updateCheck() (Greasemonkey only)

window.modals = {

    stack: [], // of types of undismissed modals
    get class() { return `${app.slug}-modal` },

    about() { // requires lib/browser.js + <app|env>
        const { browser: { isPortrait }, ui: { scheme }} = env

        // Init buttons
        const modalBtns = [
            function getSupport(){},
            function rateUs() { modals.open('feedback') },
            function moreAIextensions(){}
        ]
        if (browserAPI.runtime.includes('Greasemonkey')) // add Check for Updates
            modalBtns.unshift(function checkForUpdates(){ updateCheck() })

        // Show modal
        const runtime = /chromium|firefox|greasemonkey/.exec(browserAPI.runtime.toLowerCase())?.[0] || ''
        const labelStyles = 'text-transform: uppercase ; font-size: 17px ; font-weight: bold ;'
                          + `color: ${ scheme == 'dark' ? 'white' : '#494141' }`
        const aboutModal = modals.alert(
            `${app.symbol} ${browserAPI.getMsg('appName')}`, // title
            `<span style="${labelStyles}">🧠 ${browserAPI.getMsg('about_author')}:</span> `
                + `<a href="${app.author.url}">${browserAPI.getMsg('appAuthor')}</a> ${browserAPI.getMsg('about_and')}`
                    + ` <a href="${app.urls.contributors}">${browserAPI.getMsg('about_contributors')}</a>\n`
            + `<span style="${labelStyles}">🏷️ ${browserAPI.getMsg('about_version')}:</span> `
                + `<span class="about-em">${app.version}</span>\n`
            + `<span style="${labelStyles}">📜 ${browserAPI.getMsg('about_openSourceCode')}:</span> `
                + `<a href="${app.urls.github}" target="_blank" rel="nopener">`
                    + app.urls.github + '</a>\n'
            + `<span style="${labelStyles}">🚀 ${browserAPI.getMsg('about_latestChanges')}:</span> `
                + `<a href="${app.urls.github}/commits/main/${runtime}" target="_blank" rel="nopener">`
                    + `${app.urls.github}/commits/main/${runtime}</a>\n`
            + `<span style="${labelStyles}">⚡ ${browserAPI.getMsg('about_poweredBy')}:</span> `
                + `<a href="${app.urls.chatgptjs}" target="_blank" rel="noopener">chatgpt.js</a>`,
            modalBtns, '', 747
        )

        // Format text
        aboutModal.querySelector('h2').style.cssText = (
            'text-align: center ; font-size: 51px ; line-height: 46px ; padding: 15px 0' )
        aboutModal.querySelector('p').style.cssText = `
            text-align: center ; overflow-wrap: anywhere ; margin: ${ isPortrait ? '6px 0 -16px' : '3px 0 29px' }`

        // Hack buttons
        aboutModal.querySelector('.modal-buttons').style.justifyContent = 'center'
        aboutModal.querySelectorAll('button').forEach(btn => {
            btn.style.cssText = 'min-width: 136px ; text-align: center ;'
                + `height: ${ browserAPI.runtime.includes('Greasemonkey') ? 58 : 55 }px`

            // Replace link buttons w/ clones that don't dismiss modal
            if (/support|extensions/i.test(btn.textContent)) {
                btn.replaceWith(btn = btn.cloneNode(true))
                btn.onclick = () => this.safeWinOpen(app.urls[
                    btn.textContent.includes(browserAPI.getMsg('btnLabel_getSupport')) ? 'support' : 'relatedExtensions' ])
            }

            // Prepend emoji + localize labels
            if (/updates/i.test(btn.textContent))
                btn.textContent = `🚀 ${browserAPI.getMsg('btnLabel_checkForUpdates')}`
            else if (/support/i.test(btn.textContent))
                btn.textContent = `🧠 ${browserAPI.getMsg('btnLabel_getSupport')}`
            else if (/rate/i.test(btn.textContent))
                btn.textContent = `⭐ ${browserAPI.getMsg('btnLabel_rateUs')}`
            else if (/extensions/i.test(btn.textContent))
                btn.textContent = `🤖 ${browserAPI.getMsg('btnLabel_moreAIextensions')}`

            // Hide Dismiss button
            else btn.style.display = 'none'
        })

        return aboutModal
    },

    alert(title = '', msg = '', btns = '', checkbox = '', width = '') { // generic one from chatgpt.alert()
        const alertID = chatgpt.alert(title, msg, btns, checkbox, width),
              alert = document.getElementById(alertID).firstChild
        this.init(alert) // add classes + rising particles bg
        return alert
    },

    donate() { // requires lib/browser.js + <app|env>
        const { ui: { scheme }} = env

        // Show modal
        const donateModal = modals.alert(
            `💖 ${browserAPI.getMsg('alert_showYourSupport')}`, // title
                `<p>${browserAPI.getMsg('appName')} ${browserAPI.getMsg('alert_isOSS')}.</p>` // msg
                + `<p>${browserAPI.getMsg('alert_despiteAffliction')} `
                    + '<a target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/Long_COVID">'
                        + `${browserAPI.getMsg('alert_longCOVID')}</a> `
                    + `${browserAPI.getMsg('alert_since2020')}, ${browserAPI.getMsg('alert_byDonatingResults')}.</p>`
                + `<p>${browserAPI.getMsg('alert_yourContrib')}, <b>${browserAPI.getMsg('alert_noMatterSize')}</b>, `
                    + `${browserAPI.getMsg('alert_directlySupports')}.</p>`
                + `<p>${browserAPI.getMsg('alert_tyForSupport')}!</p>`
                + '<img src="https://cdn.jsdelivr.net/gh/adamlui/adamlui/images/siggie/'
                    + `${ scheme == 'dark' ? 'white' : 'black' }.png" `
                    + 'style="height: 54px ; margin: 5px 0 -2px 5px"></img>'
                + `<p>—<b><a target="_blank" rel="noopener" href="${app.author.url}">`
                    + `${browserAPI.getMsg('appAuthor')}</a></b>, ${browserAPI.getMsg('about_author').toLowerCase()}</p>`,
            [ // buttons
                function paypal(){},
                function githubSponsors(){},
                function cashApp(){}
            ], '', 478 // modal width
        )

        // Format text
        donateModal.querySelectorAll('p').forEach(p => // v-pad text, shrink line height
            p.style.cssText = 'padding: 8px 0 ; line-height: 20px')

        // Hack buttons
        const btns = donateModal.querySelectorAll('button')
        btns.forEach((btn, idx) => {

            // Replace link buttons w/ clones that don't dismiss modal
            if (!/dismiss/i.test(btn.textContent)) {
                btn.replaceWith(btn = btn.cloneNode(true))
                btn.onclick = () => this.safeWinOpen(app.urls.donate[
                    btn.textContent == 'Cash App' ? 'cashapp'
                  : btn.textContent == 'Github Sponsors' ? 'github' : 'paypal'
                ])
            }

            // Format buttons
            if (idx == 0) btn.style.display = 'none' // hide Dismiss button
            else {
                btn.style.cssText = 'padding: 8px 6px !important ; margin-top: -14px ;'
                                  + ' width: 107px ; line-height: 14px'
                if (idx == btns.length -1) // de-emphasize right-most button
                    btn.classList.remove('primary-modal-btn')
            }
        })

        return donateModal
    },

    feedback() {

        // Init buttons
        const modalBtns = [ function productHunt(){}, function alternativeto(){} ]
        if (!browserAPI.runtime.includes('Greasemonkey')) modalBtns.unshift(
            browserAPI.runtime.includes('Firefox') ? function firefoxAddons(){}
          : browserAPI.runtime.includes('Edge') ? function edgeAddons(){}
          : function chromeWebStore(){}
        )

        // Show modal
        const feedbackModal = modals.alert(`${browserAPI.getMsg('alert_choosePlatform')}:`, '', modalBtns)

        // Hack buttons
        feedbackModal.querySelectorAll('button').forEach((btn, idx) => {
            if (idx == 0) btn.style.display = 'none' // hide Dismiss button

            // Replace buttons w/ clones that don't dismiss modal
            btn.replaceWith(btn = btn.cloneNode(true))
            btn.onclick = () => this.safeWinOpen(app.urls.review[
                btn.textContent == 'Alternativeto' ? 'alternativeTo'
              : btn.textContent == 'Chrome Web Store' ? 'chrome'
              : btn.textContent == 'Edge Addons' ? 'edge'
              : btn.textContent == 'Firefox Addons' ? 'firefox'
              : 'productHunt'
            ])
        })

        return feedbackModal
    },

    init(modal) { // requires lib/dom.js
        if (!this.styles) this.stylize() // to init/append stylesheet
        modal.classList.add(this.class) ; modal.parentNode.classList.add(`${this.class}-bg`)
        dom.addRisingParticles(modal)
    },

    observeRemoval(modal, modalType, modalSubType) { // to maintain stack for proper nav
        const modalBG = modal.parentNode
        new MutationObserver(([mutation], obs) => {
            mutation.removedNodes.forEach(removedNode => { if (removedNode == modalBG) {
                if (this.stack[0].includes(modalSubType || modalType)) { // new modal not launched so nav back
                    this.stack.shift() // remove this modal type from stack 1st
                    const prevModalType = this.stack[0]
                    if (prevModalType) { // open it
                        this.stack.shift() // remove type from stack since re-added on open
                        this.open(prevModalType)
                    }
                }
                obs.disconnect()
            }})
        }).observe(modalBG.parentNode, { childList: true, subtree: true })
    },

    open(modalType, modalSubType) {
        const modal = modalSubType ? this[modalType][modalSubType]() : this[modalType]() // show modal
        if (!modal) return // since no div returned
        this.stack.unshift(modalSubType ? `${modalType}_${modalSubType}` : modalType) // add to stack
        this.init(modal) // add classes + rising particles bg
        this.observeRemoval(modal, modalType, modalSubType) // to maintain stack for proper nav
    },

    safeWinOpen(url) { open(url, '_blank', 'noopener') }, // to prevent backdoor vulnerabilities

    stylize() { // requires lib/dom.js + env
        const { browser: { isMobile }, ui: { scheme }} = env
        if (!this.styles) document.head.append(this.styles = dom.create.elem('style'))
        this.styles.textContent = (
            `.${this.class} {` // modals
              + 'user-select: none ; -webkit-user-select: none ; -moz-user-select: none ; -ms-user-select: none ;'
              + 'font-family: -apple-system, system-ui, BlinkMacSystemFont, Segoe UI, Roboto,'
                  + 'Oxygen-Sans, Ubuntu, Cantarell, Helvetica Neue, sans-serif ;'
              + 'padding: 20px 25px 24px 25px !important ; font-size: 20px ;'
              + `color: ${ scheme == 'dark' ? 'white' : 'black' } !important ;`
              + `background-image: linear-gradient(180deg, ${
                     scheme == 'dark' ? '#99a8a6 -200px, black 200px' : '#b6ebff -296px, white 171px' }) }`
          + `.${this.class} [class*=modal-close-btn] {`
              + 'position: absolute !important ; float: right ; top: 14px !important ; right: 16px !important ;'
              + 'cursor: pointer ; width: 33px ; height: 33px ; border-radius: 20px }'
          + `.${this.class} [class*=modal-close-btn] svg { height: 10px }`
          + `.${this.class} [class*=modal-close-btn] path {`
              + `${ scheme == 'dark' ? 'stroke: white ; fill: white' : 'stroke: #9f9f9f ; fill: #9f9f9f' }}`
          + ( scheme == 'dark' ?  // invert dark mode hover paths
                `.${this.class} [class*=modal-close-btn]:hover path { stroke: black ; fill: black }` : '' )
          + `.${this.class} [class*=modal-close-btn]:hover { background-color: #f2f2f2 }` // hover underlay
          + `.${this.class} [class*=modal-close-btn] svg { margin: 11.5px }` // center SVG for hover underlay
          + `.${this.class} a { color: #${ scheme == 'dark' ? '00cfff' : '1e9ebb' } !important }`
          + `.${this.class} h2 { font-weight: bold }`
          + `.${this.class} button {`
              + '--btn-transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out ;'
              + 'font-size: 14px ; text-transform: uppercase ;' // shrink/uppercase labels
              + 'border-radius: 0 !important ;' // square borders
              + 'transition: var(--btn-transition) ;' // smoothen hover fx
                  + '-webkit-transition: var(--btn-transition) ; -moz-transition: var(--btn-transition) ;'
                  + '-o-transition: var(--btn-transition) ; -ms-transition: var(--btn-transition) ;'
              + 'cursor: pointer !important ;' // add finger cursor
              + `border: 1px solid ${ scheme == 'dark' ? 'white' : 'black' } !important ;`
              + 'padding: 8px !important ; min-width: 102px }' // resize
          + `.${this.class} button:hover {` // add zoom, re-scheme
              + 'transform: scale(1.055) ; color: black !important ;'
              + `background-color: #${ scheme == 'dark' ? '00cfff' : '9cdaff' } !important }`
          + ( !isMobile ? `.${this.class} .modal-buttons { margin-left: -13px !important }` : '' )
          + `.about-em { color: ${ scheme == 'dark' ? 'white' : 'green' } !important }`
        )
    },

    update: {
        width: 377,

        available() { // requires lib/browser.js + <app|env>

            // Show modal
            const updateAvailModal = modals.alert(`🚀 ${browserAPI.getMsg('alert_updateAvail')}!`, // title
                `${browserAPI.getMsg('alert_newerVer')} ${browserAPI.getMsg('appName')} ` // msg
                    + `(v${app.latestVer}) ${browserAPI.getMsg('alert_isAvail')}!  `
                    + '<a target="_blank" rel="noopener" style="font-size: 0.7rem" href="'
                        + `${app.urls.github}/commits/main/greasemonkey/${app.slug}.user.js`
                    + `">${browserAPI.getMsg('link_viewChanges')}</a>`,
                function update() { // button
                    modals.safeWinOpen(`${app.urls.update.gm}?t=${Date.now()}`)
                }, '', modals.update.width
            )

            // Localize button labels if needed
            if (!env.browser.language.startsWith('en')) {
                const updateBtns = updateAvailModal.querySelectorAll('button')
                updateBtns[1].textContent = browserAPI.getMsg('btnLabel_update')
                updateBtns[0].textContent = browserAPI.getMsg('btnLabel_dismiss')
            }

            return updateAvailModal
        },

        unavailable() { // requires lib/browser.js + app
            return modals.alert(`${browserAPI.getMsg('alert_upToDate')}!`, // title
                `${browserAPI.getMsg('appName')} (v${app.version}) ${ // msg
                    browserAPI.getMsg('alert_isUpToDate')}!`,
                '', '', modals.update.width
            )
        }
    }
};
