#!/bin/bash

# Bumps extension manifests + git commit/push
# NOTE: Pass --chrome or --chromium to only affect Chromium manifest
# NOTE: Pass --firefox or --ff to only affect Firefox manifest

# Normalize args
arg=${1#-} ; arg=${arg#-} # strip leading dash(es)

# Init UI colors
NC="\033[0m"    # no color
BR="\033[1;91m" # bright red
BY="\033[1;33m" # bright yellow
BG="\033[1;92m" # bright green
BW="\033[1;97m" # bright white

# Init manifest paths
chrome_manifest="chrome/extension/manifest.json"
ff_manifest="firefox/extension/manifest.json"

# Determine manifests to edit
case "$arg" in
    chrome|chromium) MANIFESTS_TO_EDIT=("$chrome_manifest") ;;
    firefox|ff) MANIFESTS_TO_EDIT=("$ff_manifest") ;;
    "") MANIFESTS_TO_EDIT=("$chrome_manifest" "$ff_manifest") ;;
    *) echo -e "${BR}Invalid argument. Use 'chrome', 'chromium', 'firefox', 'ff', or leave empty.${NC}" ; exit 1 ;;
esac
multi_bump=$( # flag for echos/git commit msg
    [[ ${#MANIFESTS_TO_EDIT[@]} -gt 1 ]] && echo true || echo false)

# Bump versions
if $multi_bump
    then version_label="versions in manifests"
    else version_label="version in ${MANIFESTS_TO_EDIT[0]}"
fi
echo -e "${BY}\nBumping ${version_label}...${NC}\n"
bumped_cnt=0
TODAY=$(date +'%Y.%-m.%-d') # YYYY.M.D format
new_versions=() # for dynamic commit msg
for manifest in "${MANIFESTS_TO_EDIT[@]}" ; do

    # Determine old/new versions
    old_ver=$(sed -n 's/.*"version": *"\([0-9.]*\)".*/\1/p' "$manifest")
    if [[ $old_ver == "$TODAY" ]]  # exact match for $TODAY
        then # bump to $TODAY.1
            new_ver="$TODAY.1"
    elif [[ $old_ver == "$TODAY."* ]] # partial match for $TODAY
        then # bump to $TODAY.n+1
            LAST_NUMBER=$(echo "$old_ver" | awk -F '.' '{print $NF}')
            new_ver="$TODAY.$((LAST_NUMBER + 1))"
    else # no match for $TODAY
        # bump to $TODAY
            new_ver="$TODAY"
    fi
    new_versions+=("$new_ver")

    # Bump old version
    sed -i "s/\"version\": \"$old_ver\"/\"version\": \"$new_ver\"/" "$manifest"
    if [[ ${#MANIFESTS_TO_EDIT[@]} -gt 1 ]]; then
        echo -e "${manifest}: ${BW}v${old_ver}${NC} → ${BG}v${new_ver}${NC}"
    else
        echo -e "${BW}v${old_ver}${NC} → ${BG}v${new_ver}${NC}"
    fi
    ((bumped_cnt++))
done

# Define commit msg
COMMIT_MSG="Bumped \`version\`"
unique_versions=($(printf "%s\n" "${new_versions[@]}" | sort -u))
if [[ ${#unique_versions[@]} -eq 1 ]] ; then
    COMMIT_MSG+=" to \`${unique_versions[0]}\`" ; fi

# Commit/push bump(s)
echo -e "${BY}\nCommitting $((( $bumped_cnt > 1 )) && echo bumps || echo bump) to Git...\n${NC}"
git add ./**/manifest.json && git commit -n -m "$COMMIT_MSG"
git push

# Print final summary
manifest_label=$((( $bumped_cnt > 1 )) && echo "${bumped_cnt} manifests" || echo "${MANIFESTS_TO_EDIT[0]}")
echo -e "\n${BG}Success! ${manifest_label} updated/committed/pushed to GitHub${NC}"
