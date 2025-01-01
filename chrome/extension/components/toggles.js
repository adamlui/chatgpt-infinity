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

            // Assemble elems into parent div
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

            // Update aesthetic/state
            this.updateAesthetic() ; this.updateState() // to opposite init state for animation on 1st load

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
                  + '--switch-enabled-box-shadow: 2px 1px 9px #d8a9ff ;'
                  + '--switch-enabled-hover-box-shadow: 0 1px 10px #9b5ad1 ;'
                  + '--knob-box-shadow: rgba(0,0,0,0.3) 0 1px 2px 0 ;'
                  + '--knob-box-shadow-dark: rgba(0,0,0,0.3) 0 1px 2px 0, rgba(0,0,0,0.15) 0 3px 6px 2px }'

                // Element styles
              + `.${this.class} {` // parent div
                  + 'max-height: 37px ; margin: 2px 0 ; user-select: none ; cursor: pointer ;'
                  + 'flex-grow: unset }' // overcome OpenAI .grow
              + `.${this.class} > img {` // navicon
                  + 'width: 1.25rem ; height: 1.25rem ; margin-left: 2px ; margin-right: 4px }'
              + `.${this.class} > input { display: none }` // hide checkbox
              + `.${this.class} > span {` // switch span
                  + 'position: relative ; width: 30px ; height: 15px ; border-radius: 28px ;'
                  + 'background-color: var(--switch-enabled-bg-color) ;' // init opposite  final color
                  + `bottom: ${ toggles.imports.env.ui.firstLink ? 0 : -0.15 }em ;`
                  + `left: ${ toggles.imports.env.browser.isMobile ? 169
                            : toggles.imports.env.ui.firstLink ? 154 : 160 }px ;`
                  + 'transition: 0.4s ; -webkit-transition: 0.4s ; -moz-transition: 0.4s ;'
                      + '-o-transition: 0.4s ; -ms-transition: 0.4s }'
              + `.${this.class} > span.enabled {` // switch on
                  + 'background-color: var(--switch-enabled-bg-color) ; box-shadow: var(--switch-enabled-box-shadow) }'
              + `.${this.class}:hover > span.enabled {` // switch on when hover on parent div
                  + 'box-shadow: var(--switch-enabled-hover-box-shadow) ;'
                  + 'transition: none ; -webkit-transition: none ; -moz-transition: none ;'
                      + '-o-transition: none ; -ms-transition: none }'
              + `.${this.class} > span.disabled {` // switch off
                  + 'background-color: var(--switch-disabled-bg-color) ; box-shadow: none }'
              + `.${this.class} > span > span {` // knob span
                  + 'position: absolute ; width: 12px ; height: 12px ; content: "" ; border-radius: 28px ;'
                  + 'background-color: white ; left: 3px ; bottom: 1.25px ;'
                  + 'box-shadow: var(--knob-box-shadow) ;' // make 3D
                  + 'transform: translateX(13px) ;' // init opposite final pos
                  + 'transition: 0.4s ; -webkit-transition: 0.4s ; -moz-transition: 0.4s ;'
                      + '-o-transition: 0.4s ; -ms-transition: 0.4s }'
              + `.${this.class} > label {` // toggle label
                  + 'cursor: pointer ; overflow: hidden ; text-overflow: ellipsis ;'
                  + `width: ${ toggles.imports.env.browser.isMobile ? 201 : 148 }px ;`
                  + `margin-left: -${ toggles.imports.env.ui.firstLink ? 41 : 23 }px ;` // left-shift to navicon
                  + `${ toggles.imports.env.ui.firstLink ? '' : 'font-size: 0.875rem ; font-weight: 600' }}`

                // Dark scheme mods
              + `.${this.class}.dark > span.enabled {` // switch on
                  + 'background-color: var(--switch-enabled-bg-color) ;'
                  + 'box-shadow: var(--switch-enabled-hover-box-shadow) }' // use hover style instead
              + `.${this.class}.dark:hover > span.enabled {` // switch on when hover on parent div
                  + 'box-shadow: var(--switch-enabled-box-shadow) }' // use regular style instead
              + `.${this.class}.dark > span > span {` // knob span
                  + 'box-shadow: var(--knob-box-shadow-dark) }' // make 3D-er
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

        updateAesthetic() { // to match UI scheme
            const isDarkScheme = toggles.imports.env.ui.scheme == 'dark'
            this.div.classList.add(isDarkScheme ? 'dark' : 'light')
            this.div.classList.remove(isDarkScheme ? 'light' : 'dark')
            this.navicon.src = `${
                toggles.imports.app.urls.mediaHost}/images/icons/infinity-symbol/${
                    toggles.imports.env.ui.scheme == 'dark' ? 'white' : 'black' }/icon32.png?${
                    toggles.imports.app.latestAssetCommitHash}`
        },

        updateState() {
            if (!this.div) return // since toggle never created = sidebar missing
            this.div.style.display = config.toggleHidden || config.extensionDisabled ? 'none' : 'flex'
            this.toggleInput.checked = config.infinityMode
            this.toggleLabel.innerText = `${toggles.getMsg('menuLabel_infinityMode')} `
                + toggles.getMsg(`state_${ this.toggleInput.checked ? 'enabled' : 'disabled' }`)
            setTimeout(() => {
                this.switchSpan.className = this.toggleInput.checked ? 'enabled' : 'disabled'
                this.knobSpan.style.transform = `translateX(${ this.toggleInput.checked ? 13 : 0 }px)`
            }, 1) // min delay to trigger 1st transition fx
        }
    }
};
