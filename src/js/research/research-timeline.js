const rangeNames = { 30:"30 days", 365:"1 year", 1825:"5 years", 3650:"10 years", 9125:"25 years", 18250:"50 years", all:"1976 to present" };
export function createTimeline(onChange) {
  const scrubber = document.querySelector("#timelineScrubber"), date = document.querySelector("#timelineDate"), label = document.querySelector("#rangeLabel");
  let range = "30";
  function emit() {
    const start = new Date("1976-01-01T00:00:00Z"), end = new Date(), selected = new Date(start.getTime() + (end - start) * (Number(scrubber.value) / 100));
    date.textContent = Number(scrubber.value) === 100 ? "PRESENT" : selected.toISOString().slice(0,10);
    label.textContent = `${rangeNames[range]} ending ${date.textContent.toLowerCase()}`;
    onChange({ range, end: selected.toISOString() });
  }
  document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => { range = button.dataset.range; document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("active", item === button)); emit(); }));
  scrubber.addEventListener("input", emit); emit();
}
