import { loadResearchCatalog } from "./research-data.js";
import { createResearchMap } from "./research-map.js";
import { createPanel } from "./research-panel.js";
import { createTimeline } from "./research-timeline.js";
import { createResearchChart } from "./research-charts.js";
import { createWatchlist } from "./research-watchlist.js";

async function start() {
  const catalog = await loadResearchCatalog();
  const panel = createPanel(catalog.meta), { map, layers } = createResearchMap(panel.select), watchlist = createWatchlist(), drawChart = createResearchChart();
  layers.render(catalog);
  document.querySelectorAll("[data-layer]").forEach(input=>input.addEventListener("change",()=>layers.toggle(input.dataset.layer,input.checked)));
  document.querySelectorAll("[data-magnitude]").forEach(button=>button.addEventListener("click",async()=>{document.querySelectorAll("[data-magnitude]").forEach(item=>item.classList.toggle("active",item===button));layers.render(await loadResearchCatalog({minimumMagnitude:Number(button.dataset.magnitude)}));}));
  createTimeline(state=>{drawChart(state.range);document.dispatchEvent(new CustomEvent("athena:timechange",{detail:state}));});
  const connections=document.querySelector("#connectionsToggle"); connections.addEventListener("click",()=>{const enabled=connections.getAttribute("aria-pressed")!=="true";connections.setAttribute("aria-pressed",String(enabled));layers.connections(enabled,catalog);layers.toggle("connections",enabled)});
  const togglePanel=visible=>{document.querySelector("#researchPanel").classList.toggle("collapsed",!visible);document.querySelector("#panelToggle").setAttribute("aria-expanded",String(visible));};
  document.querySelector("#panelToggle").addEventListener("click",event=>togglePanel(event.currentTarget.getAttribute("aria-expanded")!=="true")); document.querySelector("#panelClose").addEventListener("click",()=>togglePanel(false));
  document.querySelector("#pinSelection").addEventListener("click",()=>{const selected=panel.getSelected();watchlist.add(selected.data.region||selected.data.fault_name||selected.data.name)});
  document.querySelector("#researchSearch").addEventListener("input",event=>{const query=event.target.value.trim().toLowerCase();if(query.length<3)return;const earthquake=catalog.earthquakes.find(item=>item.region.toLowerCase().includes(query));const fault=catalog.faults.find(item=>item.properties.fault_name.toLowerCase().includes(query));if(earthquake){panel.select("earthquake",earthquake);map.setView([earthquake.coordinates[1],earthquake.coordinates[0]],5)}else if(fault)panel.select("fault",fault.properties)});
  window.addEventListener("resize",()=>map.invalidateSize());
}
start().catch(error=>{console.error("Athena Research failed to initialize",error);document.querySelector("#mapStatus").textContent="Interface unavailable";});
