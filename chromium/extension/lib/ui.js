window.ui = {
    getScheme() {
        return document.documentElement.className
          || ( window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light' )
    }
};
