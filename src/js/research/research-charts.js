export function createResearchChart() {
  const canvas = document.querySelector("#researchChart"), context = canvas.getContext("2d"), metric = document.querySelector("#chartMetric"), note = document.querySelector("#chartNote");
  function draw(range = "30") {
    const longRange = range === "all" || Number(range) > 365;
    const ratio = devicePixelRatio || 1, width = canvas.clientWidth, height = canvas.clientHeight;
    canvas.width = width * ratio; canvas.height = height * ratio; context.scale(ratio, ratio); context.clearRect(0,0,width,height);
    context.strokeStyle="#20343a"; context.lineWidth=1; for(let y=15;y<height;y+=25){context.beginPath();context.moveTo(0,y);context.lineTo(width,y);context.stroke()}
    const points = Array.from({length:longRange?50:30},(_,i)=>({x:i/(longRange?49:29)*width,y:height*.75-(Math.sin(i*.7)+Math.cos(i*.23)+2)*height*.15}));
    context.strokeStyle="#55d6c8";context.fillStyle="#55d6c8";
    if(longRange) points.forEach((point,i)=>{context.globalAlpha=.35+(i%5)/10;context.beginPath();context.arc(point.x,point.y,2+(i%4===0?1:0),0,Math.PI*2);context.fill()});
    else {context.globalAlpha=.85;context.beginPath();points.forEach((point,i)=>i?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));context.stroke()}
    context.globalAlpha=1; note.textContent = `${longRange?"Long-window scientific scatter":"Short-window line"} view · ${metric.options[metric.selectedIndex].text} · illustrative fixture series`;
  }
  metric.addEventListener("change",()=>draw(canvas.dataset.range || "30"));
  return range => { canvas.dataset.range=range; draw(range); };
}
