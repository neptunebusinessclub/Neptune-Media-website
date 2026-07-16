#!/usr/bin/env bash
set -euo pipefail

PUBLIC_URL="${PUBLIC_URL:-https://neptune-media-webtv.neptunebusinessclub.workers.dev}"
R2_BUCKET="${R2_BUCKET:-neptune-media-assets}"
MANIFEST_URL="$PUBLIC_URL/media/manifests/launch-v1.json"
WORK=/tmp/neptune-launch-media
mkdir -p "$WORK"

for attempt in $(seq 1 60); do
  if curl --fail --silent "$PUBLIC_URL/api/auth/setup-status" >/dev/null; then break; fi
  if [ "$attempt" = 60 ]; then echo 'La nouvelle version du Worker ne répond pas.' >&2; exit 1; fi
  sleep 10
done

if ! curl --fail --silent --head "$MANIFEST_URL" >/dev/null; then
  python -m pip install --quiet gdown
  if ! command -v ffmpeg >/dev/null; then sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg; fi

  gdown --id 1mRY6iPBovv-Newy5sEujFJskl44SWb60 -O "$WORK/jeu-connexio.mp4"
  gdown --id 1JY5HcW0jARCSeT7mMn6yK7M-hb3ugQGU -O "$WORK/hors-norme.mp4"
  test -s "$WORK/jeu-connexio.mp4"
  test -s "$WORK/hors-norme.mp4"

  DURATION_CONNEXIO=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$WORK/jeu-connexio.mp4" | awk '{printf "%d",$1+0.5}')
  DURATION_HORS_NORME=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$WORK/hors-norme.mp4" | awk '{printf "%d",$1+0.5}')
  ffmpeg -y -ss 25 -i "$WORK/jeu-connexio.mp4" -frames:v 1 -vf 'scale=1280:-2' "$WORK/jeu-connexio.webp" >/dev/null 2>&1
  ffmpeg -y -ss 25 -i "$WORK/hors-norme.mp4" -frames:v 1 -vf 'scale=1280:-2' "$WORK/hors-norme.webp" >/dev/null 2>&1

  npx wrangler r2 object put "$R2_BUCKET/emissions/jeu-connexio.mp4" --file="$WORK/jeu-connexio.mp4" --remote --content-type=video/mp4
  npx wrangler r2 object put "$R2_BUCKET/emissions/hors-norme.mp4" --file="$WORK/hors-norme.mp4" --remote --content-type=video/mp4
  npx wrangler r2 object put "$R2_BUCKET/posters/jeu-connexio.webp" --file="$WORK/jeu-connexio.webp" --remote --content-type=image/webp
  npx wrangler r2 object put "$R2_BUCKET/posters/hors-norme.webp" --file="$WORK/hors-norme.webp" --remote --content-type=image/webp

  jq -n --argjson dc "$DURATION_CONNEXIO" --argjson dh "$DURATION_HORS_NORME" '{
    version:"neptune-launch-emissions-v1",
    programs:[
      {id:"jeu-connexio",name:"Jeu Connexio",slug:"jeu-connexio",description:"Des entrepreneurs se découvrent autrement grâce au jeu, aux connexions et aux échanges spontanés.",coverUrl:"/media/posters/jeu-connexio.webp",displayOrder:5},
      {id:"hors-norme",name:"Hors Norme",slug:"hors-norme",description:"Les ruptures, les déclics et les histoires humaines derrière les entreprises.",coverUrl:"/media/posters/hors-norme.webp",displayOrder:10}
    ],
    episodes:[
      {id:"jeu-connexio-emission-01",programId:"jeu-connexio",title:"Jeu Connexio — Neptune Business",slug:"jeu-connexio-neptune-business",description:"La première émission complète du Jeu Connexio : des échanges spontanés, des connexions et une autre manière de découvrir les entrepreneurs.",videoUrl:"/media/emissions/jeu-connexio.mp4",posterUrl:"/media/posters/jeu-connexio.webp",durationSeconds:$dc,displayOrder:1,metadata:{fullEpisode:true,live:true,seoTitle:"Jeu Connexio — Émission complète Neptune Business",metaDescription:"Regardez la première émission complète du Jeu Connexio produite par Neptune Business & Média.",tags:["entrepreneuriat","connexion","jeu","business"]}},
      {id:"hors-norme-emission-01",programId:"hors-norme",title:"Hors Norme — Neptune Business",slug:"hors-norme-neptune-business",description:"Une émission complète qui révèle l’histoire, la tension humaine et les convictions derrière une trajectoire entrepreneuriale.",videoUrl:"/media/emissions/hors-norme.mp4",posterUrl:"/media/posters/hors-norme.webp",durationSeconds:$dh,displayOrder:2,metadata:{fullEpisode:true,live:true,seoTitle:"Hors Norme — Émission complète Neptune Business",metaDescription:"Regardez la première émission complète Hors Norme produite par Neptune Business & Média.",tags:["entrepreneuriat","histoire","dirigeant","interview"]}}
    ]
  }' > "$WORK/launch-v1.json"

  npx wrangler r2 object put "$R2_BUCKET/manifests/launch-v1.json" --file="$WORK/launch-v1.json" --remote --content-type=application/json
fi

for attempt in $(seq 1 12); do
  if curl --fail --silent "$MANIFEST_URL" -o "$WORK/launch-v1.json"; then break; fi
  sleep 10
done
test -s "$WORK/launch-v1.json"

curl --fail --silent --show-error -X POST "$PUBLIC_URL/api/internal/media-import" \
  -H 'Content-Type: application/json' \
  -H "X-Neptune-Import-Secret: $BOOTSTRAP_TOKEN" \
  --data-binary @"$WORK/launch-v1.json" > "$WORK/import-result.json"
grep -q '"ok":true' "$WORK/import-result.json"
curl --fail --silent --head "$PUBLIC_URL/media/emissions/jeu-connexio.mp4" | grep -qi 'content-type: video/mp4'
curl --fail --silent --head "$PUBLIC_URL/media/emissions/hors-norme.mp4" | grep -qi 'content-type: video/mp4'
curl --fail --silent "$PUBLIC_URL/api/public/catalog" | grep -q 'jeu-connexio-emission-01'
curl --fail --silent "$PUBLIC_URL/api/public/catalog" | grep -q 'hors-norme-emission-01'
echo 'Les deux émissions complètes sont en ligne et inscrites dans le Studio.'
