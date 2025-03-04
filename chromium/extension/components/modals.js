// Requires lib/chatgpt.js + lib/dom.js + app + env + updateCheck (Greasemonkey only)

window.modals = {
    import(deps) { Object.assign(this.imports = this.imports || {}, deps) },

    stack: [], // of types of undismissed modals
    get class() { return `${this.imports.app.slug}-modal` },

    get runtime() {
        if (typeof GM_info != 'undefined') return 'Greasemonkey userscript'
        else if (typeof chrome != 'undefined' && chrome.runtime) {
            if (typeof browser != 'undefined') return 'Firefox add-on'
            else return `Chromium ${ navigator.userAgent.includes('Edg') ? 'Edge add-on' : 'extension' }`
        } else return 'Unknown'
    },

    about() {

        // Init buttons
        const modalBtns = [
            function getSupport(){},
            function rateUs() { modals.open('feedback') },
            function moreAIextensions(){}
        ]
        if (this.runtime.includes('Greasemonkey')) // add Check for Updates
            modalBtns.unshift(function checkForUpdates(){ modals.imports.updateCheck() })

        // Show modal
        const labelStyles = 'text-transform: uppercase ; font-size: 17px ; font-weight: bold ;'
                          + `color: ${ this.imports.env.ui.scheme == 'dark' ? 'white' : '#494141' }`
        const aboutModal = modals.alert(
            `${this.imports.app.symbol} ${this.getMsg('appName')}`, // title
            `<span style="${labelStyles}">🧠 ${this.getMsg('about_author')}:</span> `
                + `<a href="${this.imports.app.author.url}">${this.getMsg('appAuthor')}</a> ${this.getMsg('about_and')}`
                    + ` <a href="${this.imports.app.urls.contributors}">${this.getMsg('about_contributors')}</a>\n`
            + `<span style="${labelStyles}">🏷️ ${this.getMsg('about_version')}:</span> `
                + `<span class="about-em">${this.imports.app.version}</span>\n`
            + `<span style="${labelStyles}">📜 ${this.getMsg('about_openSourceCode')}:</span> `
                + `<a href="${this.imports.app.urls.gitHub}" target="_blank" rel="nopener">`
                    + this.imports.app.urls.gitHub + '</a>\n'
            + `<span style="${labelStyles}">⚡ ${this.getMsg('about_poweredBy')}:</span> `
                + `<a href="${this.imports.app.urls.chatgptJS}" target="_blank" rel="noopener">chatgpt.js</a>`
                    + ` v${this.imports.app.chatgptJSver}`,
            modalBtns, '', 686
        )

        // Format text
        aboutModal.querySelector('h2').style.cssText = (
            'text-align: center ; font-size: 51px ; line-height: 46px ; padding: 15px 0' )
        aboutModal.querySelector('p').style.cssText = (
            'text-align: center ; overflow-wrap: anywhere ;'
          + `margin: ${ this.imports.env.browser.isPortrait ? '6px 0 -16px' : '3px 0 29px' }` )

        // Hack buttons
        aboutModal.querySelector('.modal-buttons').style.justifyContent = 'center'
        aboutModal.querySelectorAll('button').forEach(btn => {
            btn.style.cssText = 'min-width: 136px ; text-align: center ;'
                + `height: ${ this.runtime.includes('Greasemonkey') ? 58 : 55 }px`

            // Replace link buttons w/ clones that don't dismiss modal
            if (/support|extensions/i.test(btn.textContent)) {
                btn.replaceWith(btn = btn.cloneNode(true))
                btn.onclick = () => this.safeWinOpen(this.imports.app.urls[
                    btn.textContent.includes(this.getMsg('btnLabel_getSupport')) ? 'support' : 'relatedExtensions' ])
            }

            // Prepend emoji + localize labels
            if (/updates/i.test(btn.textContent))
                btn.textContent = `🚀 ${this.getMsg('btnLabel_checkForUpdates')}`
            else if (/support/i.test(btn.textContent))
                btn.textContent = `🧠 ${this.getMsg('btnLabel_getSupport')}`
            else if (/rate/i.test(btn.textContent))
                btn.textContent = `⭐ ${this.getMsg('btnLabel_rateUs')}`
            else if (/extensions/i.test(btn.textContent))
                btn.textContent = `🤖 ${this.getMsg('btnLabel_moreAIextensions')}`

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

    donate() {

        // Show modal
        const donateModal = modals.alert(
            `💖 ${this.getMsg('alert_showYourSupport')}`, // title
                `<p>${this.getMsg('appName')} ${this.getMsg('alert_isOSS')}.</p>` // msg
                + `<p>${this.getMsg('alert_despiteAffliction')} `
                    + '<a target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/Long_COVID">'
                        + `${this.getMsg('alert_longCOVID')}</a> `
                    + `${this.getMsg('alert_since2020')}, ${this.getMsg('alert_byDonatingResults')}.</p>`
                + `<p>${this.getMsg('alert_yourContrib')}, <b>${this.getMsg('alert_noMatterSize')}</b>, `
                    + `${this.getMsg('alert_directlySupports')}.</p>`
                + `<p>${this.getMsg('alert_tyForSupport')}!</p>`
                + '<img src="https://cdn.jsdelivr.net/gh/adamlui/adamlui/images/siggie/'
                    + `${ this.imports.env.ui.scheme == 'dark' ? 'white' : 'black' }.png" `
                    + 'style="height: 54px ; margin: 5px 0 -2px 5px"></img>'
                + `<p>—<b><a target="_blank" rel="noopener" href="${this.imports.app.author.url}">`
                    + `${this.getMsg('appAuthor')}</a></b>, ${this.getMsg('about_author').toLowerCase()}</p>`,
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
                btn.onclick = () => this.safeWinOpen(this.imports.app.urls.donate[
                    btn.textContent == 'Cash App' ? 'cashApp'
                  : btn.textContent == 'Github Sponsors' ? 'gitHub' : 'payPal'
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
        if (!this.runtime.includes('Greasemonkey')) modalBtns.unshift(
            this.runtime.includes('Firefox') ? function firefoxAddons(){}
          : this.runtime.includes('Edge') ? function edgeAddons(){}
          : function chromeWebStore(){}
        )

        // Show modal
        const feedbackModal = modals.alert(`${this.getMsg('alert_choosePlatform')}:`, '', modalBtns)

        // Hack buttons
        feedbackModal.querySelectorAll('button').forEach((btn, idx) => {
            if (idx == 0) btn.style.display = 'none' // hide Dismiss button

            // Replace buttons w/ clones that don't dismiss modal
            btn.replaceWith(btn = btn.cloneNode(true))
            btn.onclick = () => this.safeWinOpen(this.imports.app.urls.review[
                btn.textContent == 'Alternativeto' ? 'alternativeTo'
              : btn.textContent == 'Chrome Web Store' ? 'chromeWebStore'
              : btn.textContent == 'Edge Addons' ? 'edgeAddons'
              : btn.textContent == 'Firefox Addons' ? 'firefoxAddons'
              : 'productHunt'
            ])
        })

        return feedbackModal
    },

    getMsg(key) {
        return /Chromium|Firefox/.test(this.runtime) ?
            chrome.i18n.getMessage(key) // from ./_locales/*/messages.json
                : this.imports.app.msgs[key] // from modals.import({ app }) in userscript
    },

    init(modal) {
        if (!this.styles) this.stylize() // to init/append stylesheet
        modal.classList.add('no-user-select', this.class) ; modal.parentNode.classList.add(`${this.class}-bg`)
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

    stylize() {
        if (!this.styles) {
            this.styles = dom.create.style(null, { id: `${this.class}-styles` })
            document.head.append(this.styles)
        }
        this.styles.innerText = (
            `.no-user-select {
                user-select: none ; -webkit-user-select: none ; -moz-user-select: none ; -ms-user-select: none }`
          + `.${this.class} {` // modals
              + 'font-family: -apple-system, system-ui, BlinkMacSystemFont, Segoe UI, Roboto,'
                  + 'Oxygen-Sans, Ubuntu, Cantarell, Helvetica Neue, sans-serif ;'
              + 'padding: 20px 25px 24px 25px !important ; font-size: 20px ;'
              + `color: ${ this.imports.env.ui.scheme == 'dark' ? 'white' : 'black' } !important ;`
              + `background-image: linear-gradient(180deg, ${
                     this.imports.env.ui.scheme == 'dark' ? '#99a8a6 -200px, black 200px'
                                                               : '#b6ebff -296px, white 171px' }) }`
          + `.${this.class} [class*=modal-close-btn] {`
              + 'position: absolute !important ; float: right ; top: 14px !important ; right: 16px !important ;'
              + 'cursor: pointer ; width: 33px ; height: 33px ; border-radius: 20px }'
          + `.${this.class} [class*=modal-close-btn] svg { height: 10px }`
          + `.${this.class} [class*=modal-close-btn] path {`
              + `${ this.imports.env.ui.scheme == 'dark' ? 'stroke: white ; fill: white'
                                                              : 'stroke: #9f9f9f ; fill: #9f9f9f' }}`
          + ( this.imports.env.ui.scheme == 'dark' ?  // invert dark mode hover paths
                `.${this.class} [class*=modal-close-btn]:hover path { stroke: black ; fill: black }` : '' )
          + `.${this.class} [class*=modal-close-btn]:hover { background-color: #f2f2f2 }` // hover underlay
          + `.${this.class} [class*=modal-close-btn] svg { margin: 11.5px }` // center SVG for hover underlay
          + `.${this.class} a {`
              + `color: #${ this.imports.env.ui.scheme == 'dark' ? '00cfff' : '1e9ebb' } !important }`
          + `.${this.class} h2 { font-weight: bold }`
          + `.${this.class} button {`
              + '--btn-transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out ;'
              + 'font-size: 14px ; text-transform: uppercase ;' // shrink/uppercase labels
              + 'border-radius: 0 !important ;' // square borders
              + 'transition: var(--btn-transition) ;' // smoothen hover fx
                  + '-webkit-transition: var(--btn-transition) ; -moz-transition: var(--btn-transition) ;'
                  + '-o-transition: var(--btn-transition) ; -ms-transition: var(--btn-transition) ;'
              + 'cursor: pointer !important ;' // add finger cursor
              + `border: 1px solid ${ this.imports.env.ui.scheme == 'dark' ? 'white' : 'black' } !important ;`
              + 'padding: 8px !important ; min-width: 102px }' // resize
          + `.${this.class} button:hover {` // add zoom, re-scheme
              + 'transform: scale(1.055) ; color: black !important ;'
              + `background-color: #${ this.imports.env.ui.scheme == 'dark' ? '00cfff' : '9cdaff' } !important }`
          + ( !this.imports.env.browser.isMobile ?
                `.${this.class} .modal-buttons { margin-left: -13px !important }` : '' )
          + `.about-em { color: ${ this.imports.env.ui.scheme == 'dark' ? 'white' : 'green' } !important }`
        )
    },

    update: {
        width: 377,

        available() {

            // Show modal
            const updateAvailModal = modals.alert(`🚀 ${modals.getMsg('alert_updateAvail')}!`, // title
                `${modals.getMsg('alert_newerVer')} ${modals.getMsg('appName')} ` // msg
                    + `(v${modals.imports.app.latestVer}) ${modals.getMsg('alert_isAvail')}!  `
                    + '<a target="_blank" rel="noopener" style="font-size: 0.7rem" href="'
                        + `${modals.imports.app.urls.gitHub}/commits/main/greasemonkey/${
                             modals.imports.app.slug}.user.js`
                    + `">${modals.getMsg('link_viewChanges')}</a>`,
                function update() { // button
                    modals.safeWinOpen(`${modals.imports.app.urls.update}?t=${Date.now()}`)
                }, '', modals.update.width
            )

            // Localize button labels if needed
            if (!modals.imports.env.browser.language.startsWith('en')) {
                const updateBtns = updateAvailModal.querySelectorAll('button')
                updateBtns[1].textContent = modals.getMsg('btnLabel_update')
                updateBtns[0].textContent = modals.getMsg('btnLabel_dismiss')
            }

            return updateAvailModal
        },

        unavailable() {
            return modals.alert(`${modals.getMsg('alert_upToDate')}!`, // title
                `${modals.getMsg('appName')} (v${modals.imports.app.version}) ${ // msg
                    modals.getMsg('alert_isUpToDate')}!`,
                '', '', modals.update.width
            )
        }
    }
};
