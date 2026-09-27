#!/bin/bash
# Screenshot every screen settled (?screen=) and assemble 4 contact sheets.
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
S=(welcome:{} welcome:{\"slide\":1} welcome:{\"slide\":2} signup:{} login:{} forgot:{} goals:{} permissions:{} today:{} habits:{} habit:{\"id\":\"meditate\"} addHabit:{} steps:{} water:{} insights:{} awards:{} profile:{} editProfile:{} settings:{} notifSettings:{} appearance:{} premium:{} inbox:{})
rm -rf shots; mkdir -p shots
n=0; for e in "${S[@]}"; do n=$((n+1)); name=${e%%:*}; p=${e#*:}; enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$p"); printf -v f "%02d-%s" $n $name
  echo "<body style=margin:0><iframe src=\"index.html?screen=$name&p=$enc$DARK\" style=\"width:390px;height:844px;border:0\"></iframe></body>" > dist/h-$f.html
  "$CH" --headless=new --hide-scrollbars --window-size=500,844 --virtual-time-budget=4000 --screenshot=shots/$f.png "http://localhost:8771/h-$f.html" >/dev/null 2>&1 &
  if (( n % 6 == 0 )); then wait; fi; done; wait
cp shots/*.png dist/
files=($(ls shots | sort)); for k in 0 6 12 18; do imgs=""; for f in "${files[@]:$k:6}"; do imgs+="<div style='width:390px;height:844px;overflow:hidden;border-radius:28px'><img src='$f' style='display:block'></div>"; done
  echo "<body style='margin:0;padding:10px;background:#222;display:flex;gap:10px'>$imgs</body>" > dist/sheet-$k.html
  "$CH" --headless=new --hide-scrollbars --window-size=2420,864 --virtual-time-budget=3000 --screenshot=shots/sheet-$k.png "http://localhost:8771/sheet-$k.html" >/dev/null 2>&1; done
ls shots | wc -l
