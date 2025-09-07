#!/usr/bin/env node

// Bumps extension manifests if changes detected + git commit/push
// NOTE: Pass --chrom<e|ium> to forcibly bump Chromium manifest only
// NOTE: Pass --<ff|firefox> to forcibly bump Firefox manifest only
// NOTE: Pass --no-<commit|push> to skip git commit/push

(async () => {

    // Import LIBS
    const fs = require('fs'),
          path = require('path'),
          { execSync } = require('child_process')

    // Init CACHE vars
    const cache = { paths: { root: '.cache/' }}
    cache.paths.bumpUtils = path.join(__dirname, `${cache.paths.root}bump-utils.min.mjs`)

    // Import BUMP UTILS
    fs.mkdirSync(path.dirname(cache.paths.bumpUtils), { recursive: true })
    fs.writeFileSync(cache.paths.bumpUtils, (await (await fetch(
        'https://cdn.jsdelivr.net/gh/adamlui/ai-web-extensions@latest/utils/bump/bump-utils.min.mjs')).text()
    ).replace(/^\/\*\*[\s\S]*?\*\/\s*/, '')) // strip JSD header minification comment
    const bump = await import(`file://${cache.paths.bumpUtils}`) ; fs.unlinkSync(cache.paths.bumpUtils)

    // Parse ARGS
    const args = process.argv.slice(2),
          chromiumOnly = args.some(arg => /chrom/i.test(arg)),
          ffOnly = args.some(arg => /f{2}/i.test(arg)),
          noCommit = args.includes('--no-commit'),
          noPush = args.includes('--no-push')

    // Init manifest PATHS
    const chromiumManifestPath = 'chromium/extension/manifest.json',
          ffManifestPath = 'firefox/extension/manifest.json'
    const manifestPaths = chromiumOnly ? [chromiumManifestPath].filter(p => /chrom/i.test(p))
                        : ffOnly ? [ffManifestPath].filter(p => /firefox/i.test(p))
                        : [chromiumManifestPath, ffManifestPath]
    // BUMP versions
    const bumpedManifests = {}
    for (const manifestPath of manifestPaths) {

        // Check latest commit for extension changes if forcible platform flag not set
        const platformManifestPath = path.dirname(manifestPath)
        if (!chromiumOnly && !ffOnly) {
            console.log(`Checking last commit details for ${platformManifestPath}...`)
            try {
                const latestCommitMsg = execSync(
                    `git log -1 --format=%s -- "${platformManifestPath}"`, { encoding: 'utf8' }).trim()
                bump.log.hash(`${latestCommitMsg}\n`)
                if (/bump.*(?:ersion|manifest)/i.test(latestCommitMsg)) {
                    console.log('No changes found. Skipping...\n') ; continue }
            } catch (err) { bump.log.error('Error checking git history\n') }
        }

        console.log(`Bumping version in ${chromiumOnly ? 'Chromium' : ffOnly ? 'Firefox' : ''} manifest...`)
        const { oldVer, newVer } = bump.bumpDateVer(manifestPath)
        bumpedManifests[`${platformManifestPath}/manifest.json`] = `${oldVer};${newVer}`
    }

    // LOG manifests bumped
    const pluralSuffix = Object.keys(bumpedManifests).length > 1 ? 's' : ''
    if (Object.keys(bumpedManifests).length == 0) {
           bump.log.info('Completed. No manifests bumped.') ; process.exit(0)
    } else bump.log.success(`${Object.keys(bumpedManifests).length} manifest${pluralSuffix} bumped!`)


    // ADD/COMMIT/PUSH bump(s)
    if (!noCommit) {
        bump.log.working(`\nCommitting bump${pluralSuffix} to Git...\n`)

        // Init commit msg
        let commitMsg = 'Bumped `version`' ; const uniqueVers = {}
        Object.values(bumpedManifests).forEach(vers => {
            const newVer = vers.split(';')[1] ; uniqueVers[newVer] = true })
        if (Object.keys(uniqueVers).length == 1)
            commitMsg += ` to \`${Object.keys(uniqueVers)[0]}\``

        // git add/commit/push
        try {
            execSync('git add ./**/manifest.json')
            execSync(`git commit -n -m "${commitMsg}"`)
            if (!noPush) {
                bump.log.working('\nPulling latest changes from remote to sync local repository...\n')
                execSync('git pull')
                bump.log.working('\nPushing bump${pluralSuffix} to Git...\n')
                execSync('git push')
            }
            const gitAction = `updated${ !noCommit ? '/committed' : '' }${ !noPush ? '/pushed' : '' }`
            bump.log.success(
                `Success! ${Object.keys(bumpedManifests).length} manifest${pluralSuffix} ${gitAction} to GitHub`)
        } catch (err) { bump.log.error('Git operation failed: ' + err.message) }
    }


    // Final SUMMARY log
    console.log() // line break
    Object.entries(bumpedManifests).forEach(([manifest, versions]) => {
        const [oldVer, newVer] = versions.split(';')
        console.log(`  ± ${manifest} ${
            bump.colors.bw}v${oldVer}${bump.colors.nc} → ${bump.colors.bg}v${newVer}${bump.colors.nc}`)
    })

})()
