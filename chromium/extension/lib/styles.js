// Requires lib/dom.js + <app|env|config>

window.styles = {
    update(styleType, { autoAppend = true } = {}) {
        const style = this[styleType] ; style.node ||= dom.create.style()
        if (autoAppend && !style.node?.isConnected) document.head.append(style.node)
        style.node.textContent = style.styles
    },

    toast: {
        get styles() {
            return !config.toastMode ? '' : // flatten notifs into toast alerts
                `div.${app.slug}.chatgpt-notif {
                    position: absolute ; left: 50% ; right: 21% !important ; text-align: center ;
                    ${ env.ui.scheme == 'dark' ? 'border: 2px solid white ;' : '' }
                    margin-${ config.notifBottom ? 'bottom: 105px' : 'top: 42px' };
                    transform: translate(-50%, -50%) scale(0.6) !important }
                div.${app.slug}.chatgpt-notif > div.notif-close-btn {
                    top: 18px ; right: 7px ; transform: scale(2) }`
        }
    }
};
