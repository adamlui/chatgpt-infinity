window.toggles = {

    imports: {
        import(deps) { // { app, env, notify, syncConfigToUI }
            for (const depName in deps) this[depName] = deps[depName] }
    },

    getMsg(key) {
        return typeof GM_info != 'undefined' ? this.imports.app.msgs[key] : chrome.i18n.getMessage(key) },

    sidebar: {
        get class() { return `${toggles.imports.app.cssPrefix}-sidebar-toggle` },

        create() {

            // Init toggle elems
            this.div = document.createElement('div') ; this.div.className = this.class
            this.navicon = document.createElement('img')
            this.toggleLabel = document.createElement('label')
            this.toggleInput = document.createElement('input')
            this.switchSpan = document.createElement('span')
            this.knobSpan = document.createElement('span')

            // Assemble/append elems
            this.switchSpan.append(this.knobSpan)
            this.div.append(this.navicon, this.toggleInput, this.switchSpan, this.toggleLabel)

            // Stylize elems
            this.stylize() // create/append stylesheet
            if (toggles.imports.env.ui.firstLink) { // borrow/assign classes from sidebar elems
                const firstIcon = toggles.imports.env.ui.firstLink.querySelector('div:first-child'),
                      firstLabel = toggles.imports.env.ui.firstLink.querySelector('div:nth-child(2)')
                this.div.classList.add(
                    ...toggles.imports.env.ui.firstLink.classList, ...(firstLabel?.classList || []))
                this.div.querySelector('img')?.classList.add(...(firstIcon?.classList || []))
            }

            // Update color/state
            this.update.color() ; this.update.state() // to opposite init state for animation on 1st load

            // Add hover/click listeners
            this.div.onmouseover = this.div.onmouseout = event => // trigger OpenAI hover overlay
                this.div.style.setProperty('--item-background-color',
                    `var(--sidebar-surface-${event.type == 'mouseover' ? 'secondary' : 'primary'})`)
            this.div.onclick = () => { // toggle Infinity mode
                settings.save('infinityMode', !this.toggleInput.checked)
                toggles.imports.syncConfigToUI({ updatedKey: 'infinityMode' })
                toggles.imports.notify(`${toggles.getMsg('menuLabel_infinityMode')}: ${
                    toggles.getMsg(`state_${ config.infinityMode ? 'on' : 'off' }`).toUpperCase()}`)
            }
        },

        stylize() {
            this.styles = document.createElement('style') ; this.styles.id = `${this.class}-styles`
            this.styles.innerText = (
                ':root {' // vars
                  + '--switch-enabled-bg-color: #ad68ff ; --switch-disabled-bg-color: #ccc ;'
                  + '--switch-enabled-box-shadow: 2px 1px 9px #d8a9ff }'
              + `.${this.class} {` // parent div
                  + 'max-height: 37px ; margin: 2px 0 ; user-select: none ; cursor: pointer ;'
                  + 'flex-grow: unset }' // overcome OpenAI .grow
              + `.${this.class} > img {` // navicon
                  + 'width: 1.25rem ; height: 1.25rem ; margin-left: 2px ; margin-right: 4px }'
              + `.${this.class} > input { display: none }` // hdie checkbox
              + `.${this.class} > span {` // switch span
                  + 'position: relative ; width: 30px ; height: 15px ;'
                  + 'background-color: var(--switch-enabled-bg-color) ;' // init opposite  final color
                  + '-webkit-transition: 0.4s ; transition: 0.4s ; border-radius: 28px ;'
                  + `bottom: ${ toggles.imports.env.ui.firstLink ? 0 : -0.15 }em ;`
                  + `left: ${ toggles.imports.env.browser.isMobile ? 169
                            : toggles.imports.env.ui.firstLink ? 154 : 160 }px }`
              + `.${this.class} > span.enabled {` // switch on
                  + 'background-color: var(--switch-enabled-bg-color) ; box-shadow: var(--switch-enabled-box-shadow) }'
              + `.${this.class} > span.disabled {` // switch off
                  + 'background-color: var(--switch-disabled-bg-color) ; box-shadow: none }'
              + `.${this.class} > span > span {` // knob span
                  + 'position: absolute ; width: 12px ; height: 12px ; content: "" ; border-radius: 28px ;'
                  + 'background-color: white ; -webkit-transition: 0.4s ; transition: 0.4s ; left: 3px ; bottom: 1.25px ;'
                  + 'transform: translateX(13px) }' // init opposite final pos
              + `.${this.class} > label {` // toggle label
                  + 'cursor: pointer ; overflow: hidden ; text-overflow: ellipsis ;'
                  + `width: ${ toggles.imports.env.browser.isMobile ? 201 : 148 }px ;`
                  + `margin-left: -${ toggles.imports.env.ui.firstLink ? 41 : 23 }px ;` // left-shift to navicon
                  + `${ toggles.imports.env.ui.firstLink ? '' : 'font-size: 0.875rem ; font-weight: 600' }}`
            )
            document.head.append(this.styles)
        },

        insert() {
            if (this.status?.startsWith('insert') || document.querySelector(`.${this.class}`)) return
            const sidebar = document.querySelectorAll('nav')[toggles.imports.env.browser.isMobile ? 1 : 0]
            if (!sidebar) return
            this.status = 'inserting' ; if (!this.div) this.create()
            sidebar.insertBefore(this.div, sidebar.children[1]) ; this.status = 'inserted'
        },

        update: {
            color() {
                toggles.sidebar.knobSpan.style.boxShadow = (
                    `rgba(0, 0, 0, .3) 0 1px 2px 0${
                        toggles.imports.env.ui.scheme == 'dark' ? ', rgba(0, 0, 0, .15) 0 3px 6px 2px' : '' }`)
                toggles.sidebar.navicon.src = `${
                    toggles.imports.app.urls.mediaHost}/images/icons/infinity-symbol/${
                        toggles.imports.env.ui.scheme == 'dark' ? 'white' : 'black' }/icon32.png?${
                        toggles.imports.app.latestAssetCommitHash}`
            },

            state() {
                if (!toggles.sidebar.div) return // since toggle never created = sidebar missing
                toggles.sidebar.div.style.display = config.toggleHidden || config.extensionDisabled ? 'none' : 'flex'
                toggles.sidebar.toggleInput.checked = config.infinityMode
                toggles.sidebar.toggleLabel.innerText = `${toggles.getMsg('menuLabel_infinityMode')} `
                    + toggles.getMsg(`state_${ toggles.sidebar.toggleInput.checked ? 'enabled' : 'disabled' }`)
                setTimeout(() => {
                    toggles.sidebar.switchSpan.className = toggles.sidebar.toggleInput.checked ? 'enabled' : 'disabled'
                    toggles.sidebar.knobSpan.style.transform = `translateX(${
                        toggles.sidebar.toggleInput.checked ? 13 : 0 }px)`
                }, 1) // min delay to trigger 1st transition fx
            }
        }
    }
};
