// This library is a condensed version of chatgpt.js v2.9.3
// © 2023–2024 KudoAI & contributors under the MIT license.
// Source: https://github.com/KudoAI/chatgpt.js
// User guide: https://chatgptjs.org/userguide
// Latest minified release: https://cdn.jsdelivr.net/npm/@kudoai/chatgpt.js/chatgpt.min.js

// Init feedback properties
localStorage.alertQueue = JSON.stringify([]);
localStorage.notifyProps = JSON.stringify({ queue: { topRight: [], bottomRight: [], bottomLeft: [], topLeft: [] }});

const chatgpt = {

    alert: function(title, msg, btns, checkbox, width) {
    // [ title/msg = strings, btns = [named functions], checkbox = named function, width (px) = int ] = optional
    // * Spaces are inserted into button labels by parsing function names in camel/kebab/snake case

        const scheme = chatgpt.isDarkMode() ? 'dark' : 'light',
              isMobile = chatgpt.browser.isMobile();

        // Create modal parent/children elements
        const modalContainer = document.createElement('div');
        modalContainer.id = Math.floor(chatgpt.randomFloat() * 1000000) + Date.now();
        modalContainer.classList.add('chatgpt-modal'); // add class to main div
        const modal = document.createElement('div'),
              modalTitle = document.createElement('h2'),
              modalMessage = document.createElement('p');

        // Create/append/update modal style (if missing or outdated)
        const thisUpdated = 20231203; // datestamp of last edit for this file's `modalStyle` 
        let modalStyle = document.querySelector('#chatgpt-modal-style'); // try to select existing style
        if (!modalStyle || parseInt(modalStyle.getAttribute('last-updated'), 10) < thisUpdated) { // if missing or outdated
            if (!modalStyle) { // outright missing, create/id/attr/append it first
                modalStyle = document.createElement('style'); modalStyle.id = 'chatgpt-modal-style';
                modalStyle.setAttribute('last-updated', thisUpdated.toString());
                document.head.append(modalStyle);
            }
            modalStyle.innerText = ( // update prev/new style contents

                // Background styles
                '.chatgpt-modal {' 
                    + 'position: fixed ; top: 0 ; left: 0 ; width: 100% ; height: 100% ;' // expand to full view-port
                    + 'background-color: rgba(67, 70, 72, 0) ;' // init dim bg but no opacity
                    + 'transition: background-color 0.05s ease ;' // speed to transition in show alert routine
                    + 'display: flex ; justify-content: center ; align-items: center ; z-index: 9999 }' // align

                // Alert styles
                + '.chatgpt-modal > div {'
                    + 'opacity: 0 ; transform: translateX(-2px) translateY(5px) ; max-width: 75vw ; word-wrap: break-word ;'
                    + 'transition: opacity 0.1s cubic-bezier(.165,.84,.44,1), transform 0.2s cubic-bezier(.165,.84,.44,1) ;'
                    + `background-color: ${ scheme == 'dark' ? 'black' : 'white' } ;`
                    + ( scheme != 'dark' ? 'border: 1px solid rgba(0, 0, 0, 0.3) ;' : '' )
                    + 'padding: 20px ; margin: 12px 23px ; border-radius: 15px ; box-shadow: 0 30px 60px rgba(0, 0, 0, .12) ;'
                    + ' -webkit-user-select: none ; -moz-user-select: none ; -ms-user-select: none ; user-select: none ; }'
                + '.chatgpt-modal h2 { margin-bottom: 9px }'
                + `.chatgpt-modal a { color: ${ scheme == 'dark' ? '#00cfff' : '#1e9ebb' }}`
                + '.chatgpt-modal.animated > div { opacity: 1 ; transform: translateX(0) translateY(0) }'
                + '@keyframes alert-zoom-fade-out { 0% { opacity: 1 ; transform: scale(1) }'
                    + '50% { opacity: 0.25 ; transform: scale(1.05) }'
                    + '100% { opacity: 0 ; transform: scale(1.35) }}'

                // Button styles
                + '.modal-buttons { display: flex ; justify-content: flex-end ; margin: 20px -5px -3px 0 ;'
                    + ( isMobile ? 'flex-direction: column-reverse' : '' ) + '}'
                + '.chatgpt-modal button {'
                    + `margin-left: ${ isMobile ? 0 : 10}px ; padding: ${ isMobile ? 15 : 4}px 18px ; border-radius: 15px ;`
                    + ( isMobile ? 'margin-top: 5px ; margin-bottom: 3px ;' : '')
                    + `border: 1px solid ${ scheme == 'dark' ? 'white' : 'black' }}`
                + '.primary-modal-btn {'
                    + `border: 1px solid ${ scheme == 'dark' ? 'white' : 'black' } ;`
                    + `background: ${ scheme == 'dark' ? 'white' : 'black' } ;`
                    + `color: ${ scheme == 'dark' ? 'black' : 'white' }}`
                + '.chatgpt-modal button:hover { color: #3d5d71 ; border-color: #6d9cb9 ;'
                    + 'background-color: ' + ( scheme == 'dark' ? '#00cfff' : '#9cdaff' ) + ';'
                    + 'box-shadow: 2px 1px ' + ( scheme == 'dark' ? '54px #00cfff' : '30px #9cdaff' ) + '}'
                + '.modal-close-btn {'
                    + 'cursor: pointer ; width: 20px ; height: 20px ; float: right ; position: relative ; right: -2px }'
                + '.modal-close-btn svg { margin: 5px 5px }' // center SVG for hover overlay
                + `.modal-close-btn:hover { background-color: #f2f2f2${ scheme == 'dark' ? '00' : '' }}`

                // Checkbox styles
                + '.chatgpt-modal .checkbox-group { display: flex ; margin-top: -18px }'
                + '.chatgpt-modal .checkbox-group label {'
                    + 'font-size: .7rem ; margin: -.04rem 0 0px .3rem ;'
                    + `color: ${ scheme == 'dark' ? '#e1e1e1' : '#1e1e1e' }}`
                + '.chatgpt-modal input[type="checkbox"] { transform: scale(0.7) ;'
                    + `border: 1px solid ${ scheme == 'dark' ? 'white' : 'black' }}`
                + '.chatgpt-modal input[type="checkbox"]:checked {'
                    + `border: 1px solid ${ scheme == 'dark' ? 'white' : 'black' } ;`
                    + 'background-color: black ; position: inherit }'
                + '.chatgpt-modal input[type="checkbox"]:focus { outline: none ; box-shadow: none }'
            );            
        }

        // Insert text into elements
        modalTitle.innerText = title || '';
        modalMessage.innerText = msg || ''; chatgpt.renderHTML(modalMessage);

        // Create/append buttons (if provided) to buttons div
        const modalButtons = document.createElement('div');
        modalButtons.classList.add('modal-buttons');
        if (btns) { // are supplied
            if (!Array.isArray(btns)) btns = [btns]; // convert single button to array if necessary
            btns.forEach((buttonFn) => { // create title-cased labels + attach listeners
                const button = document.createElement('button');
                button.textContent = buttonFn.name
                    .replace(/[_-]\w/g, match => match.slice(1).toUpperCase()) // convert snake/kebab to camel case
                    .replace(/([A-Z])/g, ' $1') // insert spaces
                    .replace(/^\w/, firstChar => firstChar.toUpperCase()); // capitalize first letter
                button.addEventListener('click', () => { dismissAlert(); buttonFn(); });
                modalButtons.insertBefore(button, modalButtons.firstChild); // insert button to left
            });
        }

        // Create/append OK/dismiss button to buttons div
        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = btns ? 'Dismiss' : 'OK';
        modalButtons.insertBefore(dismissBtn, modalButtons.firstChild);

        // Highlight primary button
        modalButtons.lastChild.classList.add('primary-modal-btn');

        // Create/append checkbox (if provided) to checkbox group div
        const checkboxDiv = document.createElement('div');
        if (checkbox) { // is supplied
            checkboxDiv.classList.add('checkbox-group');
            const checkboxFn = checkbox, // assign the named function to checkboxFn
                  checkboxInput = document.createElement('input');
            checkboxInput.type = 'checkbox';
            checkboxInput.addEventListener('change', checkboxFn);

            // Create/show label
            const checkboxLabel = document.createElement('label');
            checkboxLabel.addEventListener('click', () => {
                checkboxInput.checked = !checkboxInput.checked; checkboxFn(); });
            checkboxLabel.textContent = checkboxFn.name.charAt(0).toUpperCase() // capitalize first char
                + checkboxFn.name.slice(1) // format remaining chars
                    .replace(/([A-Z])/g, (match, letter) => ' ' + letter.toLowerCase()) // insert spaces, convert to lowercase
                    .replace(/\b(\w+)nt\b/gi, '$1n\'t') // insert apostrophe in 'nt' suffixes
                    .trim(); // trim leading/trailing spaces

            checkboxDiv.append(checkboxInput); checkboxDiv.append(checkboxLabel);
        }

        // Create close button
        const closeBtn = document.createElement('div');
        closeBtn.title = 'Close'; closeBtn.classList.add('modal-close-btn');
        const closeSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        closeSVG.setAttribute('height', '10px');
        closeSVG.setAttribute('viewBox', '0 0 14 14');
        closeSVG.setAttribute('fill', 'none');
        const closeSVGpath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        closeSVGpath.setAttribute('fill-rule', 'evenodd');
        closeSVGpath.setAttribute('clip-rule', 'evenodd');
        closeSVGpath.setAttribute('fill', chatgpt.isDarkMode() ? 'white' : 'black');
        closeSVGpath.setAttribute('d', 'M13.7071 1.70711C14.0976 1.31658 14.0976 0.683417 13.7071 0.292893C13.3166 -0.0976312 12.6834 -0.0976312 12.2929 0.292893L7 5.58579L1.70711 0.292893C1.31658 -0.0976312 0.683417 -0.0976312 0.292893 0.292893C-0.0976312 0.683417 -0.0976312 1.31658 0.292893 1.70711L5.58579 7L0.292893 12.2929C-0.0976312 12.6834 -0.0976312 13.3166 0.292893 13.7071C0.683417 14.0976 1.31658 14.0976 1.70711 13.7071L7 8.41421L12.2929 13.7071C12.6834 14.0976 13.3166 14.0976 13.7071 13.7071C14.0976 13.3166 14.0976 12.6834 13.7071 12.2929L8.41421 7L13.7071 1.70711Z');
        closeSVG.append(closeSVGpath); closeBtn.append(closeSVG);

        // Assemble/append div
        const modalElems = [closeBtn, modalTitle, modalMessage, modalButtons, checkboxDiv];
        modalElems.forEach((elem) => { modal.append(elem); });
        modal.style.width = `${ width || 458 }px`;
        modalContainer.append(modal); document.body.append(modalContainer); 

        // Enqueue alert
        let alertQueue = JSON.parse(localStorage.alertQueue);
        alertQueue.push(modalContainer.id);
        localStorage.alertQueue = JSON.stringify(alertQueue);

        // Show alert if none active
        modalContainer.style.display = 'none';
        if (alertQueue.length === 1) {
            modalContainer.style.display = '';
            setTimeout(() => { // delay non-0 opacity's for transition fx
                modalContainer.style.backgroundColor = ( 
                    `rgba(67, 70, 72, ${ scheme === 'dark' ? 0.62 : 0 })`);
                modalContainer.classList.add('animated'); }, 100);
        }

        // Define click/key handlers
        const clickHandler = event => { // explicitly defined to support removal post-dismissal
            if (event.target == event.currentTarget || event.target instanceof SVGPathElement) dismissAlert(); };
        const keyHandler = event => { // to dismiss active alert
            const dismissKeys = [13, 27]; // enter/esc
            if (dismissKeys.includes(event.keyCode)) {
                for (const alertId of alertQueue) { // look to handle only if triggering alert is active
                    const alert = document.getElementById(alertId);
                    if (alert && alert.style.display !== 'none') { // active alert found
                        if (event.keyCode === 27) dismissAlert(); // if esc pressed, dismiss alert & do nothing
                        else if (event.keyCode === 13) { // else if enter pressed
                            const mainButton = alert.querySelector('.modal-buttons').lastChild; // look for main button
                            if (mainButton) { mainButton.click(); event.preventDefault(); } // click if found
                        } return;
        }}}};

        // Add listeners to dismiss alert
        const dismissElems = [modalContainer, closeBtn, closeSVG, dismissBtn];
        dismissElems.forEach(elem => {
            elem.addEventListener('click', clickHandler); });
        document.addEventListener('keydown', keyHandler);

        // Define alert dismisser
        const dismissAlert = () => {
            modalContainer.style.backgroundColor = 'transparent';
            modal.style.animation = 'alert-zoom-fade-out 0.075s ease-out';
            setTimeout(() => { // delay removal for fade-out

                // Remove alert
                modalContainer.remove(); // ...from DOM
                alertQueue = JSON.parse(localStorage.alertQueue);
                alertQueue.shift(); // + memory
                localStorage.alertQueue = JSON.stringify(alertQueue); // + storage

                // Remove all listeners to prevent memory leaks
                dismissElems.forEach(elem => { elem.removeEventListener('click', clickHandler); });
                document.removeEventListener('keydown', keyHandler);

                // Check for pending alerts in queue
                if (alertQueue.length > 0) {
                    const nextAlert = document.getElementById(alertQueue[0]);
                    setTimeout(() => {
                        nextAlert.style.display = '';
                        setTimeout(() => { nextAlert.classList.add('animated'); }, 100);
                    }, 500);
                }

            }, 50);
        };

        return modalContainer.id; // if assignment used
    },

    browser: {
        isMobile: function() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }
    },

    getNewChatButton: function() {
        for (const navBtnSVG of document.querySelectorAll('nav button svg'))
            if (navBtnSVG.querySelector('path[d*="M15.673 3.913a3.121"], ' // pencil-on-pad icon
                                      + 'path[d*="M3.07 10.876C3.623"]'))  // refresh icon if temp chat
                return navBtnSVG.parentNode;
    },

    getNewChatLink: function() { return document.querySelector('nav a[href="/"]'); },

    getRegenerateButton: function() {   
        for (const mainSVG of document.querySelectorAll('main svg')) {
            if (mainSVG.querySelector('path[d*="M3.07 10.876C3.623"]')) // regen icon found
                return mainSVG.parentNode;
    }},

    getScrollToBottomButton: function() { return document.querySelector('button[class*="cursor"][class*="bottom"]'); },

    getSendButton: function() {
        return document.querySelector('[data-testid="send-button"]') // pre-GPT-4o
            || document.querySelector('path[d*="M15.192 8.906a1.143"]')?.parentNode.parentNode; // post-GPT-4o
    },

    getStopGeneratingButton: function() {
        for (const svg of document.querySelectorAll('form button svg')) {
            if (svg.querySelector('path[d*="2 0 0 1 2"], rect'))
                return svg.parentNode;
    }},

    isDarkMode: function() { return document.documentElement.classList.toString().includes('dark'); },

    isIdle: function() {
        return new Promise(resolve => {
            (function checkIsIdle() {
                if (chatgpt.getRegenerateButton()) resolve(true);
                else setTimeout(checkIsIdle, 200);
            })();
    });},

    isLoaded: function() {
        return new Promise(resolve => {
            (function checkIsLoaded() {
                if (chatgpt.getNewChatButton()) resolve(true);
                else setTimeout(checkIsLoaded, 200);
            })();
    });},

    notify: async function(msg, position, notifDuration, shadow) {
        notifDuration = notifDuration ? +notifDuration : 1.75; // sec duration to maintain notification visibility
        const fadeDuration = 0.3, // sec duration of fade-out
              vpYoffset = 23, vpXoffset = 27; // px offset from viewport border

        // Create/append notification div
        const notificationDiv = document.createElement('div'); // make div
        notificationDiv.id = Math.floor(chatgpt.randomFloat() * 1000000) + Date.now();
        notificationDiv.classList.add('chatgpt-notif');
        notificationDiv.innerText = msg; // insert msg
        document.body.append(notificationDiv); // insert into DOM

        // Create/append close button
        const closeBtn = document.createElement('div');
        closeBtn.title = 'Dismiss'; closeBtn.classList.add('notif-close-btn');
        const closeSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        closeSVG.setAttribute('height', '8px');
        closeSVG.setAttribute('viewBox', '0 0 14 14');
        closeSVG.setAttribute('fill', 'none');
        closeSVG.style.height = closeSVG.style.width = '8px'; // override SVG styles on non-OpenAI sites
        const closeSVGpath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        closeSVGpath.setAttribute('fill-rule', 'evenodd');
        closeSVGpath.setAttribute('clip-rule', 'evenodd');
        closeSVGpath.setAttribute('fill', 'white');
        closeSVGpath.setAttribute('d', 'M13.7071 1.70711C14.0976 1.31658 14.0976 0.683417 13.7071 0.292893C13.3166 -0.0976312 12.6834 -0.0976312 12.2929 0.292893L7 5.58579L1.70711 0.292893C1.31658 -0.0976312 0.683417 -0.0976312 0.292893 0.292893C-0.0976312 0.683417 -0.0976312 1.31658 0.292893 1.70711L5.58579 7L0.292893 12.2929C-0.0976312 12.6834 -0.0976312 13.3166 0.292893 13.7071C0.683417 14.0976 1.31658 14.0976 1.70711 13.7071L7 8.41421L12.2929 13.7071C12.6834 14.0976 13.3166 14.0976 13.7071 13.7071C14.0976 13.3166 14.0976 12.6834 13.7071 12.2929L8.41421 7L13.7071 1.70711Z');
        closeSVG.append(closeSVGpath); closeBtn.append(closeSVG); notificationDiv.append(closeBtn);

        // Determine div position/quadrant
        notificationDiv.isTop = !position || !/low|bottom/i.test(position);
        notificationDiv.isRight = !position || !/left/i.test(position);
        notificationDiv.quadrant = (notificationDiv.isTop ? 'top' : 'bottom')
                                 + (notificationDiv.isRight ? 'Right' : 'Left');

        // Create/append/update notification style (if missing or outdated)
        const thisUpdated = 20231110; // datestamp of last edit for this file's `notifStyle` 
        let notifStyle = document.querySelector('#chatgpt-notif-style'); // try to select existing style
        if (!notifStyle || parseInt(notifStyle.getAttribute('last-updated'), 10) < thisUpdated) { // if missing or outdated
            if (!notifStyle) { // outright missing, create/id/attr/append it first
                notifStyle = document.createElement('style'); notifStyle.id = 'chatgpt-notif-style';
                notifStyle.setAttribute('last-updated', thisUpdated.toString());
                document.head.append(notifStyle);
            }
            notifStyle.innerText = ( // update prev/new style contents
                '.chatgpt-notif {'
                    + 'background-color: black ; padding: 10px 13px 10px 18px ; border-radius: 11px ; border: 1px solid #f5f5f7 ;' // bubble style
                    + 'opacity: 0 ; position: fixed ; z-index: 9999 ; font-size: 1.8rem ; color: white ;' // visibility
                    + '-webkit-user-select: none ; -moz-user-select: none ; -ms-user-select: none ; user-select: none ;'
                    + `transform: translateX(${ !notificationDiv.isRight ? '-' : '' }35px) ;` // init off-screen for transition fx
                    + ( shadow ? ( 'box-shadow: -8px 13px 25px 0 ' + ( /\b(shadow|on)\b/gi.test(shadow) ? 'gray' : shadow )) : '' ) + '}'
                + '.notif-close-btn { cursor: pointer ; float: right ; position: relative ; right: -4px ; margin-left: -3px ;'
                    + 'display: grid }' // top-align for non-OpenAI sites
                + '@keyframes notif-zoom-fade-out { 0% { opacity: 1 ; transform: scale(1) }' // transition out keyframes
                    + '15% { opacity: 0.35 ; transform: rotateX(-27deg) scale(1.05) }'
                    + '45% { opacity: 0.05 ; transform: rotateX(-81deg) }'
                    + '100% { opacity: 0 ; transform: rotateX(-180deg) scale(1.15) }}'
            );
        } 

        // Enqueue notification
        let notifyProps = JSON.parse(localStorage.notifyProps);
        notifyProps.queue[notificationDiv.quadrant].push(notificationDiv.id);
        localStorage.notifyProps = JSON.stringify(notifyProps);

        // Position notification (defaults to top-right)
        notificationDiv.style.top = notificationDiv.isTop ? vpYoffset.toString() + 'px' : '';
        notificationDiv.style.bottom = !notificationDiv.isTop ? vpYoffset.toString() + 'px' : '';
        notificationDiv.style.right = notificationDiv.isRight ? vpXoffset.toString() + 'px' : '';
        notificationDiv.style.left = !notificationDiv.isRight ? vpXoffset.toString() + 'px' : '';

        // Reposition old notifications
        const thisQuadrantQueue = notifyProps.queue[notificationDiv.quadrant];
        if (thisQuadrantQueue.length > 1) {
            try { // to move old notifications
                for (const divId of thisQuadrantQueue.slice(0, -1)) { // exclude new div
                    const oldDiv = document.getElementById(divId),
                          offsetProp = oldDiv.style.top ? 'top' : 'bottom', // pick property to change
                          vOffset = +/\d+/.exec(oldDiv.style[offsetProp])[0] + 5 + oldDiv.getBoundingClientRect().height;
                    oldDiv.style[offsetProp] = `${ vOffset }px`; // change prop
                }
            } catch (err) {}
        }

        // Show notification
        setTimeout(() => {
            notificationDiv.style.opacity = chatgpt.isDarkMode() ? 0.8 : 0.67; // show msg
            notificationDiv.style.transform = 'translateX(0)'; // bring from off-screen
            notificationDiv.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
        }, 10);

        // Init delay before hiding        
        const hideDelay = fadeDuration > notifDuration ? 0 // don't delay if fade exceeds notification duration
                        : notifDuration - fadeDuration; // otherwise delay for difference

        // Add notification dismissal to timeout schedule + button clicks
        const dismissNotif = () => {
            notificationDiv.style.animation = `notif-zoom-fade-out ${ fadeDuration }s ease-out`;
            clearTimeout(dismissFuncTID);
        };
        const dismissFuncTID = setTimeout(dismissNotif, hideDelay * 1000); // maintain visibility for `hideDelay` secs, then dismiss     
        closeSVG.addEventListener('click', dismissNotif, { once: true }); // add to close button clicks

        // Destroy notification
        notificationDiv.addEventListener('animationend', () => {
            notificationDiv.remove(); // remove from DOM
            notifyProps = JSON.parse(localStorage.notifyProps);
            notifyProps.queue[notificationDiv.quadrant].shift(); // + memory
            localStorage.notifyProps = JSON.stringify(notifyProps); // + storage
        }, { once: true });
    },

    randomFloat: function() {
    // * Generates a random, cryptographically secure value between 0 (inclusive) & 1 (exclusive)
        const crypto = window.crypto || window.msCrypto;
        return crypto?.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF || Math.random();
    },

    renderHTML: function(node) {
        const reTags = /<([a-z\d]+)\b([^>]*)>([\s\S]*?)<\/\1>/g,
              reAttributes = /(\S+)=['"]?((?:.(?!['"]?\s+\S+=|[>']))+.)['"]?/g,
              nodeContent = node.childNodes;

        // Preserve consecutive spaces + line breaks
        if (!chatgpt.renderHTML.preWrapSet) {
            node.style.whiteSpace = 'pre-wrap'; chatgpt.renderHTML.preWrapSet = true;
            setTimeout(() => { chatgpt.renderHTML.preWrapSet = false; }, 100);
        }

        // Process child nodes
        for (const childNode of nodeContent) {

            // Process text node
            if (childNode.nodeType == Node.TEXT_NODE) {
                const text = childNode.nodeValue,
                      elems = Array.from(text.matchAll(reTags));

                // Process 1st element to render
                if (elems.length > 0) {
                    const elem = elems[0],
                          [tagContent, tagName, tagAttributes, tagText] = elem.slice(0, 4),
                          tagNode = document.createElement(tagName); tagNode.textContent = tagText;

                    // Extract/set attributes
                    const attributes = Array.from(tagAttributes.matchAll(reAttributes));
                    attributes.forEach(attribute => {
                        const name = attribute[1], value = attribute[2].replace(/['"]/g, '');
                        tagNode.setAttribute(name, value);
                    });

                    const renderedNode = chatgpt.renderHTML(tagNode); // render child elements of newly created node

                    // Insert newly rendered node
                    const beforeTextNode = document.createTextNode(text.substring(0, elem.index)),
                          afterTextNode = document.createTextNode(text.substring(elem.index + tagContent.length));

                    // Replace text node with processed nodes
                    node.replaceChild(beforeTextNode, childNode);
                    node.insertBefore(renderedNode, beforeTextNode.nextSibling);
                    node.insertBefore(afterTextNode, renderedNode.nextSibling);
                }

            // Process element nodes recursively
            } else if (childNode.nodeType == Node.ELEMENT_NODE) chatgpt.renderHTML(childNode);
        }

        return node; // if assignment used
    },

    response: { stopGenerating: function() { try { chatgpt.getStopBtn().click(); } catch (err) { console.error(err.message); }}},
    scrollToBottom: function() { try { chatgpt.getScrollBtn().click(); } catch (err) { console.error(err.message); }},

    send: function(msg, method='') {
        for (let i = 0; i < arguments.length; i++) if (typeof arguments[i] !== 'string')
            return console.error(`Argument ${ i + 1 } must be a string!`);
        const textArea = document.querySelector('form textarea'),
              sendBtn = chatgpt.getSendButton();
        textArea.value = msg;
        textArea.dispatchEvent(new Event('input', { bubbles: true })); // enable send button

        setTimeout(function delaySend() {
            if (!sendBtn?.hasAttribute('disabled')) { // send msg
                method.toLowerCase() == 'click' || chatgpt.browser.isMobile() ? sendBtn.click()
                    : textArea.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, bubbles: true }));
            } else setTimeout(delaySend, 25);
        }, 25);
    },

    sidebar: {
        hide: function() { this.isOn() ? this.toggle() : console.info('Sidebar already hidden!'); },
        show: function() { this.isOff() ? this.toggle() : console.info('Sidebar already shown!'); },
        isOff: function() { return !this.isOn(); },
        isOn: function() {
            const sidebar = document.querySelector('#__next > div > div');
            return chatgpt.browser.isMobile() ?
                document.documentElement.style.overflow == 'hidden'
              : sidebar.style.visibility != 'hidden' && sidebar.style.width != '0px';
        },

        toggle: function() {
            const isMobileDevice = chatgpt.browser.isMobile(),
                  isGPT4oUI = !!document.documentElement.className.includes(' '),
                  navBtnSelector = isMobileDevice ? '#__next button' : isGPT4oUI ? 'nav button' : 'main button',
                  isToggleBtn = isMobileDevice ? () => true // since 1st one is toggle
                              : isGPT4oUI ? btn => btn.querySelectorAll('svg path[d*="M8.857 3h6.286c1.084"]').length > 0
                              : /* post-GPT-4o desktop */ btn => [...btn.querySelectorAll('*')]
                                    .some(child => child.style.transform.includes('translateY'));
            for (const btn of document.querySelectorAll(navBtnSelector))
                if (isToggleBtn(btn)) { btn.click(); return; }
        },

        isLoaded: async function() {
            await chatgpt.isLoaded();
            return Promise.race([
                new Promise(resolve => {
                    (function checkNewChatLink() {
                        if (chatgpt.getNewChatLink()) resolve(true);
                        else setTimeout(checkNewChatLink, 200);
                    })();
                }),
                new Promise(resolve => setTimeout(resolve, 5000)) // since New Chat link not always present
            ]);
        }
    },

    startNewChat: function() { try { chatgpt.getNewChatBtn().click(); } catch (err) { console.error(err.message); }},
    stop: function() { chatgpt.response.stopGenerating(); }

};

// Create alias functions
const funcAliases = [
    ['actAs', 'actas', 'act', 'become', 'persona', 'premadePrompt', 'preMadePrompt', 'prePrompt', 'preprompt', 'roleplay', 'rolePlay', 'rp'],
    ['activateAutoRefresh', 'activateAutoRefresher', 'activateRefresher', 'activateSessionRefresher',
        'autoRefresh', 'autoRefresher', 'autoRefreshSession', 'refresher', 'sessionRefresher'],
    ['continue', 'continueChat', 'continueGenerating', 'continueResponse'],
    ['deactivateAutoRefresh', 'deactivateAutoRefresher', 'deactivateRefresher', 'deactivateSessionRefresher'],
    ['detectLanguage', 'getLanguage'],
    ['executeCode', 'codeExecute'],
    ['exportChat', 'chatExport', 'export'],
    ['getFooterDiv', 'getFooter'],
    ['getHeaderDiv', 'getHeader'],
    ['getLastPrompt', 'getLastQuery', 'getMyLastMsg', 'getMyLastQuery'],
    ['getContinueGeneratingButton', 'getContinueButton'],
    ['getScrollToBottomButton', 'getScrollButton'],
    ['getStopGeneratingButton', 'getStopButton'],
    ['getTextarea', 'getTextArea', 'getChatbox', 'getChatBox'],
    ['isFullScreen', 'isFullscreen', 'isfullscreen'],
    ['isLoaded', 'isloaded'],
    ['logOut', 'logout', 'logOff', 'logoff', 'signOut', 'signout', 'signOff', 'signoff'],
    ['minify', 'codeMinify', 'minifyCode'],
    ['new', 'newChat', 'startNewChat'],
    ['obfuscate', 'codeObfuscate', 'obfuscateCode'],
    ['printAllFunctions', 'showAllFunctions'],
    ['refactor', 'codeRefactor', 'refactorCode'],
    ['refreshReply', 'regenerate', 'regenerateReply'],
    ['refreshSession', 'sessionRefresh'],
    ['renderHTML', 'renderHtml', 'renderLinks', 'renderTags'],
    ['reviewCode', 'codeReview'],
    ['send', 'sendChat', 'sendMsg'],
    ['sendInNewChat', 'sendNewChat'],
    ['sentiment', 'analyzeSentiment', 'sentimentAnalysis'],
    ['startNewChat', 'new', 'newChat'],
    ['stop', 'stopChat', 'stopGenerating', 'stopResponse'],
    ['suggest', 'suggestion', 'recommend'],
    ['toggleAutoRefresh', 'toggleAutoRefresher', 'toggleRefresher', 'toggleSessionRefresher'],
    ['toggleScheme', 'toggleMode'],
    ['translate', 'translation', 'translator'],
    ['unminify', 'unminifyCode', 'codeUnminify'],
    ['writeCode', 'codeWrite']
];
const synonyms = [
    ['account', 'acct'],
    ['activate', 'turnOn'],
    ['analyze', 'check', 'evaluate', 'review'],
    ['ask', 'send', 'submit'],
    ['button', 'btn'],
    ['continue', 'resume'],
    ['chats', 'history'],
    ['chat', 'conversation', 'convo'],
    ['clear', 'delete', 'remove'],
    ['data', 'details'],
    ['deactivate', 'deActivate', 'turnOff'],
    ['execute', 'interpret', 'interpreter', 'run'],
    ['generating', 'generation'],
    ['minify', 'uglify'],
    ['refactor', 'rewrite'],
    ['regenerate', 'regen'],
    ['render', 'parse'],
    ['reply', 'response'],
    ['sentiment', 'attitude', 'emotion', 'feeling', 'opinion', 'perception'],
    ['speak', 'say', 'speech', 'talk', 'tts'],
    ['summarize', 'tldr'],
    ['unminify', 'beautify', 'prettify', 'prettyPrint']
];
const camelCaser = (words) => {
    return words.map((word, index) => index === 0 || word == 's' ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(''); };
for (const prop in chatgpt) {

    // Create new function for each alias
    for (const subAliases of funcAliases) {
        if (subAliases.includes(prop)) {
            if (subAliases.some(element => element.includes('.'))) {
                const nestedFunction = subAliases.find(element => element.includes('.')).split('.')[1];
                for (const nestAlias of subAliases) {
                    if (/^(\w+)/.exec(nestAlias)[1] !== prop) { // don't alias og function
                        chatgpt[nestAlias] = chatgpt[prop][nestedFunction]; // make new function, reference og one
            }}} else { // alias direct functions
                for (const dirAlias of subAliases) {
                    if (dirAlias !== prop) { // don't alias og function
                        chatgpt[dirAlias] = chatgpt[prop]; // make new function, reference og one
            }}}
    }}

    do { // create new function per synonym per word per function
        var newFunctionsCreated = false;
        for (const funcName in chatgpt) {
            if (typeof chatgpt[funcName] == 'function') {
                const funcWords = funcName.split(/(?=[A-Zs])/); // split function name into constituent words
                for (const funcWord of funcWords) {
                    const synonymValues = [].concat(...synonyms // flatten into single array w/ word's synonyms
                        .filter(arr => arr.includes(funcWord.toLowerCase())) // filter in relevant synonym sub-arrays
                        .map(arr => arr.filter(synonym => synonym !== funcWord.toLowerCase()))); // filter out matching word
                    for (const synonym of synonymValues) { // create function per synonym
                        const newFuncName = camelCaser(funcWords.map(word => (word == funcWord ? synonym : word)));
                        if (!chatgpt[newFuncName]) { // don't alias existing functions
                            chatgpt[newFuncName] = chatgpt[funcName]; // make new function, reference og one
                            newFunctionsCreated = true;
    }}}}}} while (newFunctionsCreated); // loop over new functions to encompass all variations
}

// Prefix console logs w/ '🤖 chatgpt.js >> '
const consolePrefix = '🤖 chatgpt.js >> ', ogError = console.error, ogInfo = console.info;
console.error = (...args) => {
    if (!args[0].startsWith(consolePrefix)) ogError(consolePrefix + args[0], ...args.slice(1)); 
    else ogError(...args);
};
console.info = (msg) => {
    if (!msg.startsWith(consolePrefix)) ogInfo(consolePrefix + msg);
    else ogInfo(msg);
};

export { chatgpt }
