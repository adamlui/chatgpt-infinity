#!/usr/bin/env node

// Bumps @require'd JS in userscript
// NOTE: Doesn't git commit to allow potentially required script editing from breaking changes

(async () => {

    // Import LIBS
    const fs = require('fs'), // to read/write files
          ssri = require('ssri') // to generate SHA-256 hashes

    // Init REPO context
    const repoName = (() => {
        const path = require('path') ; let dir = __dirname
        while (!fs.existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir)
        return path.basename(dir)
    })()
    const userJSfilePath = `./greasemonkey/${repoName}.user.js`

    // Init UI COLORS
    const nc = '\x1b[0m',        // no color
          dg = '\x1b[38;5;243m', // dim gray
          by = '\x1b[1;33m',     // bright yellow
          bg = '\x1b[1;92m',     // bright green
          bw = '\x1b[1;97m'      // bright white

    // Init REGEX
    const rePatterns = {
        resourceName: /[^/]+\/(?:css|dist)?\/?[^/]+\.(?:css|js)(?=[?#]|$)/,
        cssURL: /^\/\/ @resource.+(https:\/\/assets.+\.css.+)$/,
        jsURL: /^\/\/ @require\s+(https:\/\/cdn\.jsdelivr\.net\/gh\/.+)$/,
        commitHash: /(@|\?v=)([^/#]+)/, sriHash: /[^#]+$/
    }

    // Define FUNCTIONS

    const log = {};
    ['info', 'working', 'success'].forEach(lvl => log[lvl] = function(msg) {
        const logColor = lvl == 'info' ? bw : lvl == 'working' ? by : lvl == 'success' ? bg : ''
        console.log(logColor + msg + nc) ; log.endedWithLineBreak = msg.toString().endsWith('\n')
    })

    function fetchData(url) {
        if (typeof fetch == 'undefined') // polyfill for Node.js < v21
            return new Promise((resolve, reject) => {
                try { // to use http or https module
                    const protocol = url.match(/^([^:]+):\/\//)[1]
                    if (!/^https?$/.test(protocol)) reject(new Error('Invalid fetchData() URL.'))
                    require(protocol).get(url, resp => {
                        let rawData = ''
                        resp.on('data', chunk => rawData += chunk)
                        resp.on('end', () => resolve({ json: () => JSON.parse(rawData) }))
                    }).on('error', err => reject(new Error(err.message)))
                } catch (err) { reject(new Error('Environment not supported.'))
            }})
        else // use fetch() from Node.js v21+
            return fetch(url)
    }

    async function getSRIhash(url, algorithm = 'sha256') {
        const sriHash = ssri.fromData(
            Buffer.from(await (await fetchData(url)).arrayBuffer()), { algorithms: [algorithm] }).toString()
        console.log(`${dg + sriHash + nc}\n`)
        return sriHash
    }

    function bumpUserJSver(userJSfilePath) {
        const date = new Date(),
              today = `${date.getFullYear()}.${date.getMonth() +1}.${date.getDate()}`, // YYYY.M.D format
              re_version = /(@version\s+)([\d.]+)/,
              userJScontent = fs.readFileSync(userJSfilePath, 'utf-8'),
              currentVer = userJScontent.match(re_version)[2]
        let newVer
        if (currentVer.startsWith(today)) { // bump sub-ver
            const verParts = currentVer.split('.'),
                  subVer = verParts.length > 3 ? parseInt(verParts[3], 10) +1 : 1
            newVer = `${today}.${subVer}`
        } else // bump to today
            newVer = today
        fs.writeFileSync(userJSfilePath, userJScontent.replace(re_version, `$1${newVer}`), 'utf-8')
        console.log(`Updated: ${bw}v${currentVer}${nc} → ${bg}v${newVer}${nc}`)
    }

    // Run MAIN routine

    // Collect resourcs
    log.working('\nCollecting resources...\n')
    const userJScontent = fs.readFileSync(userJSfilePath, 'utf-8')
    const reResourceURL = new RegExp( // eslint-disable-next-line
        `(?:${rePatterns.cssURL.source})|(?:${rePatterns.jsURL.source})`, 'gm')
    const resourceURLs = [...userJScontent.matchAll(reResourceURL)].map(match => match[1] || match[2])
    log.success(`${resourceURLs.length} potentially bumpable resource(s) found.`)

    // Fetch latest commit hash for adamlui/ai-web-extensions/assets/styles/rising-stars
    const ghEndpoint = 'https://api.github.com/repos/adamlui/ai-web-extensions/commits',
          risingStarsPath = 'assets/styles/rising-stars'
    log.working(`\nFetching latest commit hash for ${risingStarsPath}...\n`)
    const latestCommitHashes = {
        risingStars: (await (await fetch(`${ghEndpoint}?path=${risingStarsPath}`)).json())[0]?.sha }
    console.log(`${dg + latestCommitHashes.risingStars + nc}`)

    log.working('\nProcessing resource(s)...\n')
    let urlsUpdatedCnt = 0

    // Fetch latest commit hash
    if (resourceURLs.some(url => url.includes(repoName))) {
        console.log('Fetching latest commit hash for repo...')
        latestCommitHashes.repoResources = require('child_process').execFileSync(
            'git', ['ls-remote', `https://github.com/adamlui/${repoName}.git`, 'HEAD']).toString().split('\t')[0]
        console.log(`${dg + latestCommitHashes.repoResources + nc}\n`)
    }

    // Process each resource
    for (const resourceURL of resourceURLs) {
        const resourceName = rePatterns.resourceName.exec(resourceURL)?.[0] || 'resource' // dir/filename for logs

        // Compare commit hashes
        const resourceLatestCommitHash = latestCommitHashes[
            resourceURL.includes(repoName) ? 'repoResources' : 'risingStars']
        if (resourceLatestCommitHash.startsWith(
            rePatterns.commitHash.exec(resourceURL)?.[2] || '')) { // commit hash didn't change...
                console.log(`${resourceName} already up-to-date!`) ; log.endedWithLineBreak = false
                continue // ...so skip resource
            }
        let updatedURL = resourceURL.replace(rePatterns.commitHash, `$1${resourceLatestCommitHash}`) // otherwise update commit hash

        // Generate/compare SRI hash
        console.log(`${ !log.endedWithLineBreak ? '\n' : '' }Generating SHA-256 hash for ${resourceName}...`)
        const newSRIhash = await getSRIhash(updatedURL)
        if (rePatterns.sriHash.exec(resourceURL)?.[0] == newSRIhash) { // SRI hash didn't change
            console.log(`${resourceName} already up-to-date!`) ; log.endedWithLineBreak = false
            continue // ...so skip resource
        }
        updatedURL = updatedURL.replace(rePatterns.sriHash, newSRIhash) // otherwise update SRI hash

        // Write updated URL to userscript
        console.log(`Writing updated URL for ${resourceName}...`)
        const userJScontent = fs.readFileSync(userJSfilePath, 'utf-8')
        fs.writeFileSync(userJSfilePath, userJScontent.replace(resourceURL, updatedURL), 'utf-8')
        log.success(`${resourceName} bumped!\n`)
        urlsUpdatedCnt++
    }
    if (urlsUpdatedCnt > 0) {
        console.log(`${ !log.endedWithLineBreak ? '\n' : '' }Bumping userscript version...`)
        bumpUserJSver(userJSfilePath)
    }

    // Log final summary
    log[urlsUpdatedCnt > 0 ? 'success' : 'info'](
        `\n${ urlsUpdatedCnt > 0 ? 'Success! ' : '' }${urlsUpdatedCnt} resource(s) bumped.`)

})()
