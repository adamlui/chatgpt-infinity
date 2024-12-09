#!/bin/bash

# Bumps extension manifests + git commit/push
# NOTE: Pass --chrome or --chromium to only affect Chromium manifest
# NOTE: Pass --firefox or --ff to only affect Firefox manifest

# Init UI COLORS
NC="\033[0m"    # no color
BR="\033[1;91m" # bright red
BY="\033[1;33m" # bright yellow
BG="\033[1;92m" # bright green
BW="\033[1;97m" # bright white

# Parse ARGS
if [[ "$1" == *chrom* ]] ; then chromium_only=true
elif [[ "$1" == *f*f* ]] ; then ff_only=true
elif [[ -n "$1" ]] ; then
    echo -e "${BR}Invalid argument. Use '--chrome', '--chromium', '--firefox', '--ff', or omit arg.${NC}" ; exit 1 ; fi

# Init manifest PATHS
chromium_manifest="chrome/extension/manifest.json"
ff_manifest="firefox/extension/manifest.json"
if [ "$chromium_only" = true ] ; then MANIFEST_PATHS=$(echo "$chromium_manifest" | grep -i 'chrom')
elif [ "$ff_only" = true ] ; then MANIFEST_PATHS=$(echo "$ff_manifest" | grep -i 'firefox')
else MANIFEST_PATHS=("$chromium_manifest" "$ff_manifest") ; fi
for manifest_path in $MANIFEST_PATHS ; do echo "$manifest_path" ; done

# BUMP versions
if [[ ${#MANIFEST_PATHS[@]} -gt 1 ]] ; then manifest_label="manifests"
else manifest_label="${MANIFEST_PATHS[0]}" ; fi
echo -e "${BY}\nBumping version in ${manifest_label}...${NC}\n"
bumped_cnt=0
TODAY=$(date +'%Y.%-m.%-d') # YYYY.M.D format
new_versions=() # for dynamic commit msg
for manifest in "${MANIFEST_PATHS[@]}" ; do

    # Determine old/new versions
    old_ver=$(sed -n 's/.*"version": *"\([0-9.]*\)".*/\1/p' "$manifest_path")
    if [[ $old_ver == "$TODAY" ]] ; then
         new_ver="$TODAY.1"
    elif [[ $old_ver == "$TODAY."* ]] ; then
         LAST_NUMBER=$(echo "$old_ver" | awk -F '.' '{print $NF}')
         new_ver="$TODAY.$((LAST_NUMBER + 1))"
    else new_ver="$TODAY" ; fi
    new_versions+=("$new_ver")

    # Bump old version
    sed -i "s/\"version\": \"$old_ver\"/\"version\": \"$new_ver\"/" "$manifest"
    ver_change_msg="${BW}v${old_ver}${NC} → ${BG}v${new_ver}${NC}"
    if [[ ${#MANIFEST_PATHS[@]} -gt 1 ]] ; then bumped_msg="${manifest}: ${ver_change_msg}"
    else bumped_msg="Updated: ${ver_change_msg}" ; fi
    echo -e "$bumped_msg" ; ((bumped_cnt++))
done

# Define COMMIT MSG
COMMIT_MSG="Bumped \`version\`"
unique_versions=($(printf "%s\n" "${new_versions[@]}" | sort -u))
if [[ ${#unique_versions[@]} -eq 1 ]] ; then
    COMMIT_MSG+=" to \`${unique_versions[0]}\`" ; fi

# COMMIT/PUSH bump(s)
echo -e "${BY}\nCommitting $((( $bumped_cnt > 1 )) && echo bumps || echo bump) to Git...\n${NC}"
git add ./**/manifest.json && git commit -n -m "$COMMIT_MSG"
git push

# Print FINAL summary
manifest_label=$((( $bumped_cnt > 1 )) && echo "${bumped_cnt} manifests" || echo "${MANIFEST_PATHS[0]}")
echo -e "\n${BG}Success! ${manifest_label} updated/committed/pushed to GitHub${NC}"
