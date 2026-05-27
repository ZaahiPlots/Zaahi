#!/bin/bash
# Process batch GLBs through pipeline_force_zup. Sequential per Blender memory limits.
# Args: batch number (1, 2, 3)
set -e
BATCH=${1:-1}
PFZ=/home/zaahi/zaahi/docs/research/3d-buildings-pilot/meshy-test/pipeline_force_zup.py

declare -A BLDGS

if [ "$BATCH" = "1" ]; then
  # name|H|W|D|ratio  (ratio low for huge raw files)
  BLDGS[princess-tower]="414 50 50 0.025"
  BLDGS[23-marina]="393 60 50 0.018"
  BLDGS[elite-residence]="381 50 50 0.010"
  BLDGS[ciel-tower]="377 50 45 0.20"
elif [ "$BATCH" = "2" ]; then
  BLDGS[almas-tower]="360 50 50 0.05"
  BLDGS[gevora-hotel]="356 35 30 0.05"
  BLDGS[jw-marriott-marquis]="355 60 50 0.05"
  BLDGS[emirates-tower-1]="355 45 45 0.05"
  BLDGS[emirates-tower-2]="309 40 40 0.05"
elif [ "$BATCH" = "3" ]; then
  BLDGS[index-tower]="328 50 30 0.05"
  BLDGS[cayan-tower]="306 40 40 0.05"
  BLDGS[damac-heights]="335 50 50 0.035"
  BLDGS[the-torch]="352 40 40 0.05"
  BLDGS[ocean-heights]="310 40 40 0.05"
fi

for slug in "${!BLDGS[@]}"; do
  args="${BLDGS[$slug]}"
  echo "=== $slug ==="
  blender --background --python $PFZ -- $slug $args 2>&1 | grep -E "EXPORTED|final|faces" | tail -5
  # rename to public path
  SRC=/home/zaahi/zaahi/public/glb/buildings/$slug.glb
  if [ -f "$SRC" ]; then
    SIZE=$(stat -c%s $SRC)
    echo "  $slug ✓ $SIZE bytes"
  else
    echo "  $slug ✗ NOT EXPORTED"
  fi
done
echo "BATCH $BATCH DONE"