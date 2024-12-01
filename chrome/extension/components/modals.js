// Requires lib/dom.js

window.modals = {

    setup(modal) {
        modal.classList.add('chatgpt-infinity-modal')
        modal.onmousedown = modals.dragHandlers.mousedown
        dom.fillStarryBG(modal) // add stars
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
    }
};
