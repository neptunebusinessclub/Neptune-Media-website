#!/usr/bin/env bash
set -euo pipefail

PUBLIC_URL="${PUBLIC_URL:-https://neptune-media-webtv.neptunebusinessclub.workers.dev}"
R2_BUCKET="${R2_BUCKET:-neptune-media-assets}"
MANIFEST_URL="$PUBLIC_URL/media/manifests/launch-v1.json"
WORK=/tmp/neptune-launch-media
PART_SIZE=45M
mkdir -p "$WORK"

for attempt in $(seq 1 90); do
  if curl --fail --silent -H "X-Neptune-Import-Secret: $BOOTSTRAP_TOKEN" "$PUBLIC_URL/api/internal/multipart/status" | grep -q '"ready":true'; then break; fi
  if [ "$attempt" = 90 ]; then echo 'La passerelle multipart R2 ne répond pas.' >&2; exit 1; fi
  sleep 10
done

upload_large_video() {
  local file="$1"
  local key="$2"
  local start_payload start_result upload_id part_dir parts_json part_number part result etag complete_payload
  start_payload=$(jq -n --arg key "$key" '{key:$key,contentType:"video/mp4"}')
  start_result=$(curl --fail --silent --show-error --retry 5 --retry-all-errors -X POST "$PUBLIC_URL/api/internal/multipart/start" \
    -H 'Content-Type: application/json' \
    -H "X-Neptune-Import-Secret: $BOOTSTRAP_TOKEN" \
    --data "$start_payload")
  upload_id=$(jq -r '.uploadId // empty' <<<"$start_result")
  test -n "$upload_id"

  part_dir="$WORK/parts-$(basename "$file" .mp4)"
  rm -rf "$part_dir"
  mkdir -p "$part_dir"
  split -b "$PART_SIZE" -d -a 4 "$file" "$part_dir/part-"
  parts_json='[]'
  part_number=1

  for part in "$part_dir"/part-*; do
    echo "Envoi de $key — partie $part_number"
    if ! result=$(curl --fail --silent --show-error --retry 5 --retry-all-errors -X POST "$PUBLIC_URL/api/internal/multipart/part" \
      -H 'Content-Type: application/octet-stream' \
      -H "X-Neptune-Import-Secret: $BOOTSTRAP_TOKEN" \
      -H "X-Neptune-Key: $key" \
      -H "X-Neptune-Upload-Id: $upload_id" \
      -H "X-Neptune-Part-Number: $part_number" \
      --data-binary @"$part"); then
      curl --silent -X POST "$PUBLIC_URL/api/internal/multipart/abort" \
        -H 'Content-Type: application/json' \
        -H "X-Neptune-Import-Secret: $BOOTSTRAP_TOKEN" \
        --data "$(jq -n --arg key "$key" --arg uploadId "$upload_id" '{key:$key,uploadId:$uploadId}')" >/dev/null || true
      return 1
    fi
    etag=$(jq -r '.etag // empty' <<<"$result")
    test -n "$etag"
    parts_json=$(jq --argjson number "$part_number" --arg etag "$etag" '. + [{partNumber:$number,etag:$etag}]' <<<"$parts_json")
    rm -f "$part"
    part_number=$((part_number + 1))
  done

  complete_payload=$(jq -n --arg key "$key" --arg uploadId "$upload_id" --argjson parts "$parts_json" '{key:$key,uploadId:$uploadId,parts:$parts}')
  curl --fail --silent --show-error --retry 5 --retry-all-errors -X POST "$PUBLIC_URL/api/internal/multipart/complete" \
    -H 'Content-Type: application/json' \
    -H "X-Neptune-Import-Secret: $BOOTSTRAP_TOKEN" \
    --data "$complete_payload" | grep -q '"ok":true'
  rm -rf "$part_dir"
}

if ! curl --fail --silent --head "$MANIFEST_URL" >/dev/null; then
  python -m pip install --quiet gdown
  if ! command -v ffmpeg >/dev/null; then sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg; fi

  gdown "1mRY6iPBovv-Newy5sEujFJskl44SWb60" -O "$WORK/jeu-connexio.mp4"
  gdown "1JY5HcW0jARCSeT7mMn6yK7M-hb3ugQGU" -O "$WORK/hors-norme.mp4"
  test -s "$WORK/jeu-connexio.mp4"
  test -s "$WORK/hors-norme.mp4"

  DURATION_CONNEXIO=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$WORK/jeu-connexio.mp4" | awk '{printf "%d",$1+0.5}')
  DURATION_HORS_NORME=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$WORK/hors-norme.mp4" | awk '{printf "%d",$1+0.5}')
  ffmpeg -y -ss 25 -i "$WORK/jeu-connexio.mp4" -frames:v 1 -vf 'scale=1280:-2' "$WORK/jeu-connexio.webp" >/dev/null 2>&1
  ffmpeg -y -ss 25 -i "$WORK/hors-norme.mp4" -frames:v 1 -vf 'scale=1280:-2' "$WORK/hors-norme.webp" >/dev/null 2>&1

  upload_large_video "$WORK/jeu-connexio.mp4" "emissions/jeu-connexio.mp4"
  upload_large_video "$WORK/hors-norme.mp4" "emissions/hors-norme.mp4"
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
