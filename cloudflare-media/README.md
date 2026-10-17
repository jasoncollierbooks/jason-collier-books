# Moving the site's audio and video to Cloudflare R2

GitHub Pages is meant for sites under 1 GB and won't take single files over 100 MB.
This folder copies the site's long audio and video (243 files, about 1.11 GB) into a
free Cloudflare R2 bucket named `collier-media`, served at
`https://media.collierentertainment.com/<same path as in this repo>`.

This folder isn't linked from any page, so it doesn't change the website.

## Files
- `move-list.tsv`: every file that moves (size in bytes, then the path)
- `upload-to-r2.sh`: one command that signs in, creates the bucket, uploads, and sets CORS. Safe to run again.
- `cors.json`: lets collierentertainment.com, www, and localhost read the files
- `.uploaded`: written on your Mac to record finished uploads (not committed)

## Steps (Mac Terminal)
```
cd ~/collier-site/jason-collier-books
git pull
bash cloudflare-media/upload-to-r2.sh
```
Then connect the domain: dash.cloudflare.com > R2 Object Storage > collier-media >
Settings > Custom Domains > Add > `media.collierentertainment.com` > Continue > Connect Domain.
(Or, if you have the zone ID from the collierentertainment.com Overview page:
`ZONE_ID=xxxx bash cloudflare-media/upload-to-r2.sh`. It skips finished uploads and only adds the domain.)

## What stays on GitHub
The small game sound packs stay in the repo, so the games keep working on their own and offline:
`old-man-game/assets/voice/`, `book-worlds/audio/`, `assets/audio/`. Together they're about 34 MB.

## Not moved because nothing uses them (to delete later)
- `assets/rusty-stack-episodes/episode01.mp4`, `episode02.mp4` (27.6 MB)
- `app/media/jang-tom-pine-knot.mp3` (3.1 MB)
- `audio/commercials/ads_audio_sample.mp3` (1.4 MB)
