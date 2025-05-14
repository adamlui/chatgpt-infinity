// Requires lib/dom.js + <app|config|env>

window.styles = {

    update({ key, autoAppend }) { // requires lib/dom.js
        if (!key) return console.error('Option \'key\' required by styles.update()')
        const style = this[key] ; style.node ||= dom.create.style()
        if (( autoAppend || style.autoAppend ) && !style.node.isConnected) document.head.append(style.node)
        style.node.textContent = style.css ; style.node.textContent = style.node.textContent.replace(/\s/g, '')
    },

    toast: {
        autoAppend: true,
        get css() { // requires <app|config|env>
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
