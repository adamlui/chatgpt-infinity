// Requires lib/chatgpt.js + lib/dom.js

window.modals = {
    stack: [], // of types of undismissed modals

    import(dependencies) { // { app, siteAlert, updateCheck }
        Object.entries(dependencies).forEach(([name, dependency]) => this[name] = dependency) },

    env: {
        get runtime() {
            if (typeof chrome != 'undefined' && chrome.runtime) {
                if (typeof browser != 'undefined') return 'Firefox add-on'
                else return `Chromium ${ navigator.userAgent.includes('Edg') ? 'Edge add-on' : 'extension' }`
            } else if (typeof GM_info != 'undefined')
                 return 'Greasemonkey userscript'
            else return 'Unknown'
        }
    },

    getMsg(key) {
        return /Chromium|Firefox/.test(this.env.runtime) ? chrome.i18n.getMessage(key)
             : this.app.msgs[key] // assigned from this.import({ app }) in userscript
    },

    open(modalType) {
        this.stack.unshift(modalType) // add to stack
        const modal = this[modalType]() // show modal
        modal.classList.add('chatgpt-infinity-modal')
        modal.onmousedown = this.dragHandlers.mousedown
        dom.fillStarryBG(modal) // fill BG w/ rising stars
        this.observeRemoval(modal, modalType) // to maintain stack for proper nav
    },

    observeRemoval(modal, modalType) { // to maintain stack for proper nav
        const modalBG = modal.parentNode
        new MutationObserver(([mutation], obs) => {
            mutation.removedNodes.forEach(removedNode => { if (removedNode == modalBG) {
                if (this.stack[0] == modalType) { // new modal not launched, implement nav back logic
                    this.stack.shift() // remove this modal type from stack
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

    dragHandlers: {
        mousedown(event) { // find modal, attach listeners, init XY offsets
            if (event.button != 0) return // prevent non-left-click drag
            if (getComputedStyle(event.target).cursor == 'pointer') return // prevent drag on interactive elems
            modals.dragHandlers.draggableElem = event.currentTarget
            modals.dragHandlers.draggableElem.style.cursor = 'grabbing'
            event.preventDefault(); // prevent sub-elems like icons being draggable
            ['mousemove', 'mouseup'].forEach(event => document.addEventListener(event, modals.dragHandlers[event]))
            const draggableElemRect = modals.dragHandlers.draggableElem.getBoundingClientRect()
            modals.dragHandlers.offsetX = event.clientX - draggableElemRect.left +21
            modals.dragHandlers.offsetY = event.clientY - draggableElemRect.top +12
        },

        mousemove(event) { // drag modal
            if (modals.dragHandlers.draggableElem) {
                const newX = event.clientX - modals.dragHandlers.offsetX,
                      newY = event.clientY - modals.dragHandlers.offsetY
                Object.assign(modals.dragHandlers.draggableElem.style, { left: `${newX}px`, top: `${newY}px` })
            }
        },

        mouseup() { // remove listeners, reset modals.dragHandlers.draggableElem
            modals.dragHandlers.draggableElem.style.cursor = 'inherit';
            ['mousemove', 'mouseup'].forEach(event =>
                document.removeEventListener(event, modals.dragHandlers[event]))
            modals.dragHandlers.draggableElem = null
        }
    },

    about() {

        // Init styles
        const headingStyle = 'font-size: 1.15rem',
              pStyle = 'position: relative ; left: 3px',
              pBrStyle = 'position: relative ; left: 4px ',
              aStyle = 'color: ' + ( chatgpt.isDarkMode() ? '#c67afb' : '#8325c4' ) // purple

        // Init buttons
        const modalBtns = [
            function getSupport(){},
            function rateUs() { modals.open('feedback') },
            function moreAIextensions(){}
        ]
        if (this.env.runtime.includes('Greasemonkey')) modalBtns.unshift(
            function checkForUpdates(){})

        // Show modal
        const aboutModal = this.siteAlert(
            `${this.app.symbol} ${this.getMsg('appName')}`, // title
            `<span style="${headingStyle}"><b>🏷️ <i>${this.getMsg('about_version')}</i></b>: </span>`
                + `<span style="${pStyle}">${this.app.version}</span>\n`
            + `<span style="${headingStyle}"><b>⚡ <i>${this.getMsg('about_poweredBy')}</i></b>: </span>`
                + `<span style="${pStyle}">`
                    + `<a style="${aStyle}" href="${this.app.urls.chatgptJS}" target="_blank" rel="noopener">`
                        + `chatgpt.js</a> v${this.app.chatgptJSver}</span>\n`
            + `<span style="${headingStyle}"><b>📜 <i>${this.getMsg('about_sourceCode')}</i></b>:</span>\n`
                + `<span style="${pBrStyle}"><a href="${this.app.urls.gitHub}" target="_blank" rel="nopener">`
                    + this.app.urls.gitHub + '</a></span>',
            modalBtns, '',
            /Chromium|Firefox/.test(this.env.runtime) ? 451 : 546 // set width
        )

        // Format text
        aboutModal.querySelector('h2').style.cssText = 'text-align: center ; font-size: 37px ; padding: 9px'
        aboutModal.querySelector('p').style.cssText = 'text-align: center'

        // Hack buttons
        aboutModal.querySelector('.modal-buttons').style.justifyContent = 'center'
        aboutModal.querySelectorAll('button').forEach(btn => {
            btn.style.cssText = 'cursor: pointer !important ;'
                + `height: ${ this.env.runtime.includes('Greasemonkey') ? 50 : 43 }px`

            // Replace link buttons w/ clones that don't dismissAlert()
            if (/support|extensions/i.test(btn.textContent)) {
                const btnClone = btn.cloneNode(true)
                btn.parentNode.replaceChild(btnClone, btn) ; btn = btnClone
                btn.onclick = () => this.safeWinOpen(this.app.urls[
                    btn.textContent.includes(this.getMsg('btnLabel_getSupport')) ? 'support' : 'relatedExtensions' ])
            }

            // Prepend emoji + localize labels
            if (/updates/i.test(btn.textContent))
                btn.textContent = `🚀 ${this.getMsg('btnLabel_updateCheck')}`
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

    donate() {

        // Show modal
        const donateModal = this.siteAlert(
            `💖 ${this.getMsg('alert_showYourSupport')}`, // title
                `<p>${this.getMsg('appName')} ${this.getMsg('alert_isOSS')}.</p>`
              + `<p>${this.getMsg('alert_despiteAffliction')} `
                  + '<a target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/Long_COVID">'
                      + `${this.getMsg('alert_longCOVID')}</a> `
                  + `${this.getMsg('alert_since2020')}, ${this.getMsg('alert_byDonatingResults')}.</p>`
              + `<p>${this.getMsg('alert_yourContrib')}, <b>${this.getMsg('alert_noMatterSize')}</b>, `
                  + `${this.getMsg('alert_directlySupports')}.</p>`
              + `<p>${this.getMsg('alert_tyForSupport')}!</p>`
              + '<img src="https://cdn.jsdelivr.net/gh/adamlui/adamlui/images/siggie/'
                  + `${ chatgpt.isDarkMode() ? 'white' : 'black' }.png" `
                  + 'style="height: 54px ; margin: 5px 0 -2px 5px"></img>'
              + `<p>—<b><a target="_blank" rel="noopener" href="${this.app.author.url}">`
                  + `${this.getMsg('appAuthor')}</a></b>, ${this.getMsg('alert_author')}</p>`,
            [ // buttons
                function paypal(){},
                function githubSponsors(){},
                function cashApp(){},
                function rateUs() { modals.open('feedback') }
            ], '', 478 // set width
        )

        // Format text
        donateModal.querySelectorAll('p').forEach(p => // v-pad text, shrink line height
            p.style.cssText = 'padding: 8px 0 ; line-height: 20px')

        // Hack buttons
        const btns = donateModal.querySelectorAll('button')
        btns.forEach((btn, idx) => {

            // Replace link buttons w/ clones that don't dismissAlert()
            if (!/dismiss|rate/i.test(btn.textContent)) {
                const btnClone = btn.cloneNode(true)
                btn.parentNode.replaceChild(btnClone, btn) ; btn = btnClone
                btn.onclick = () => this.safeWinOpen(this.app.urls.donate[
                    btn.textContent == 'Cash App' ? 'cashApp'
                  : btn.textContent == 'GitHub' ? 'gitHub'
                  : 'payPal'
                ])
            }

            // Format buttons
            if (idx == 0) btn.style.display = 'none' // hide Dismiss button
            else {
                btn.style.cssText = 'padding: 8px 6px !important ; margin-top: -14px ;'
                                  + ' width: 107px ; line-height: 14px'
                if (idx == btns.length -1) // de-emphasize right-most button
                    btn.classList.remove('primary-modal-btn')
                else if (/rate/i.test(btn.textContent)) // localize 'Rate Us' label
                    btn.textContent = this.getMsg('btnLabel_rateUs')
            }
        })

        return donateModal
    },

    feedback() {

        // Init buttons
        const modalBtns = [ function productHunt(){}, function alternativeto(){} ]
        modalBtns.unshift(this.env.runtime.includes('Firefox') ? function firefoxAddons(){}
                        : this.env.runtime.includes('Edge') ? function edgeAddons(){}
                        : this.env.runtime.includes('Chromium') ? function chromeWebStore(){}
                        : function greasyFork(){} )
        // Show modal
        const feedbackModal = this.siteAlert(`${this.getMsg('alert_choosePlatform')}:`, '', modalBtns)

        // Hack buttons
        feedbackModal.querySelectorAll('button').forEach((btn, idx) => {
            if (idx == 0) btn.style.display = 'none' // hide Dismiss button

            // Replace buttons w/ clones that don't dismissAlert()
            const btnClone = btn.cloneNode(true)
            btn.parentNode.replaceChild(btnClone, btn) ; btn = btnClone
            btn.onclick = () => this.safeWinOpen(this.app.urls.review[
                btn.textContent == 'Alternativeto' ? 'alternativeTo'
              : btn.textContent == 'Chrome Web Store' ? 'chromeWebStore'
              : btn.textContent == 'Edge Addons' ? 'edgeAddons'
              : btn.textContent == 'Firefox Addons' ? 'firefoxAddons'
              : btn.textContent == 'Greasy Fork' ? 'greasyFork'
              : 'productHunt'
            ])
        })

        return feedbackModal
    },

    safeWinOpen(url) { open(url, '_blank', 'noopener') } // to prevent backdoor vulnerabilities
};
