const key = "athena-research-watchlist-v1";
const defaults = ["Puerto Rico", "Northern Andes", "Cascadia", "Japan Trench"];
export function createWatchlist() {
  const list = document.querySelector("#watchlist"); let items;
  try { items = JSON.parse(localStorage.getItem(key)) || defaults; } catch { items = defaults; }
  function save(){ localStorage.setItem(key,JSON.stringify(items)); render(); }
  function render(){ list.innerHTML=items.map((item,index)=>`<li><span>${item}</span><button data-remove="${index}" aria-label="Remove ${item}">×</button></li>`).join(""); list.querySelectorAll("[data-remove]").forEach(button=>button.addEventListener("click",()=>{items.splice(Number(button.dataset.remove),1);save()})); }
  function add(name){if(name && !items.includes(name)){items.push(name);save()}}
  render(); return { add };
}
