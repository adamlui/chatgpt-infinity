window.toggles = {

    dependencies: {
        import(dependencies) { // { app, env, notify, syncConfigToUI }
            for (const name in dependencies) this[name] = dependencies[name] }
    },

    getMsg(key) {
        return typeof GM_info != 'undefined' ? this.dependencies.app.msgs[key] : chrome.i18n.getMessage(key) },

    sidebar: {
        ids: {
            get navicon() { return `${toggles.dependencies.app.cssPrefix}-toggle-navicon` },
            get knobSpan() { return `${toggles.dependencies.app.cssPrefix}-toggle-knob-span` }
        },

        create() {
            this.div = document.createElement('div')

            // Create/ID/size/position navicon
            const navicon = document.createElement('img') ; navicon.id = this.ids.navicon
            navicon.style.cssText = 'width: 1.25rem ; height: 1.25rem ; margin-left: 2px ; margin-right: 4px'

            // Create/disable/hide checkbox
            const toggleInput = document.createElement('input')
            Object.assign(toggleInput, { type: 'checkbox', disabled: true })
            toggleInput.style.display = 'none'

            // Create/stylize switch
            const switchSpan = document.createElement('span')
            Object.assign(switchSpan.style, {
                position: 'relative',
                left: `${ toggles.dependencies.env.browser.isMobile ? 169
                           : !toggles.dependencies.env.ui.firstLink ? 160 : 154 }px`,
                bottom: `${ !toggles.dependencies.env.ui.firstLink ? -0.15 : 0 }em`,
                backgroundColor: '#AD68FF', // init opposite  final color
                width: '30px', height: '15px', '-webkit-transition': '.4s', transition: '0.4s',  borderRadius: '28px'
            })

            // Create/stylize knob, append to switch
            const knobSpan = document.createElement('span') ; knobSpan.id = this.ids.knobSpan
            Object.assign(knobSpan.style, {
                position: 'absolute', left: '3px', bottom: '1.25px',
                width: '12px', height: '12px', content: '""', borderRadius: '28px',
                transform: 'translateX(13px) translateY(0)', // init opposite final pos
                backgroundColor: 'white',  '-webkit-transition': '0.4s', transition: '0.4s'
            }) ; switchSpan.append(knobSpan)

            // Create/stylize/fill label
            const toggleLabel = document.createElement('label')
            if (!toggles.dependencies.env.ui.firstLink) // add font size/weight since no ui.firstLink to borrow from
                toggleLabel.style.cssText = 'font-size: 0.875rem, font-weight: 600'
            Object.assign(toggleLabel.style, {
                marginLeft: `-${ !toggles.dependencies.env.ui.firstLink ? 23 : 41 }px`, // left-shift to navicon
                cursor: 'pointer', // add finger cursor on hover
                width: `${ toggles.dependencies.env.browser.isMobile ? 201 : 148 }px`, // to truncate overflown text
                overflow: 'hidden', textOverflow: 'ellipsis' // to truncate overflown text
            })

            // Append elements
            this.div.append(navicon, toggleInput, switchSpan, toggleLabel)

            // Stylize/classify
            this.div.style.cssText += 'height: 37px ; margin: 2px 0 ; user-select: none ; cursor: pointer'
            if (toggles.dependencies.env.ui.firstLink) { // borrow/assign classes from sidebar elems
                const firstIcon = toggles.dependencies.env.ui.firstLink.querySelector('div:first-child'),
                      firstLabel = toggles.dependencies.env.ui.firstLink.querySelector('div:nth-child(2)')
                this.div.classList.add(
                    ...toggles.dependencies.env.ui.firstLink.classList, ...(firstLabel?.classList || []))
                this.div.querySelector('img')?.classList.add(...(firstIcon?.classList || []))
            }

            this.updateState() // to opposite init state for animation on 1st load

            // Add listeners
            this.div.onmouseover = () =>
                this.div.style.setProperty('--item-background-color', 'var(--sidebar-surface-secondary)')
            this.div.onmouseout = () =>
                this.div.style.setProperty('--item-background-color', 'var(--sidebar-surface-primary)')
            this.div.onclick = () => {
                settings.save('infinityMode', !toggleInput.checked)
                toggles.dependencies.syncConfigToUI({ updatedKey: 'infinityMode' })
                toggles.dependencies.notify(`${toggles.getMsg('menuLabel_infinityMode')}: ${
                    toggles.getMsg(`state_${ config.infinityMode ? 'on' : 'off' }`).toUpperCase()}`)
            }
        },

        insert() {
            if (this.status?.startsWith('insert') || document.getElementById(this.ids.navicon)) return
            this.status = 'inserting' ; if (!this.div) this.create()

            // Insert toggle
            const sidebar = document.querySelectorAll('nav')[toggles.dependencies.env.browser.isMobile ? 1 : 0]
            if (!sidebar) return
            sidebar.insertBefore(this.div, sidebar.children[1])

            // Tweak styles
            const knobSpan = document.getElementById(this.ids.knobSpan),
                  navicon = document.getElementById(this.ids.navicon)
            this.div.style.flexGrow = 'unset' // overcome OpenAI .grow
            this.div.style.paddingLeft = '8px'
            if (knobSpan) knobSpan.style.boxShadow = (
                'rgba(0, 0, 0, .3) 0 1px 2px 0' + ( chatgpt.isDarkMode() ? ', rgba(0, 0, 0, .15) 0 3px 6px 2px' : '' ))
            if (navicon) navicon.src = `${ // update navicon color in case scheme changed
                toggles.dependencies.app.urls.mediaHost}/images/icons/infinity-symbol/`
              + `${ chatgpt.isDarkMode() ? 'white' : 'black' }/icon32.png?${
                    toggles.dependencies.app.latestAssetCommitHash}`

            this.status = 'inserted'
        },

        updateState() {
            if (!this.div) return // since toggle never created = sidebar missing
            const toggleLabel = this.div.querySelector('label'),
                  toggleInput = this.div.querySelector('input'),
                  switchSpan = this.div.querySelector('span'),
                  knobSpan = switchSpan.firstChild
            this.div.style.display = config.toggleHidden || config.extensionDisabled ? 'none' : 'flex'
            toggleInput.checked = config.infinityMode
            toggleLabel.innerText = `${toggles.getMsg('menuLabel_infinityMode')} ${
                toggles.getMsg('state_' + ( toggleInput.checked ? 'enabled' : 'disabled' ))}`
            setTimeout(() => {
                switchSpan.style.backgroundColor = toggleInput.checked ? '#ad68ff' : '#ccc'
                switchSpan.style.boxShadow = toggleInput.checked ? '2px 1px 9px #d8a9ff' : 'none'
                knobSpan.style.transform = toggleInput.checked ? 'translateX(13px) translateY(0)' : 'translateX(0)'
            }, 1) // min delay to trigger transition fx
        }
    }
};
