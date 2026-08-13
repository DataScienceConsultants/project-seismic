const rangeNames = {
  30: "30 days",
  365: "1 year",
  1825: "5 years",
  3650: "10 years",
  9125: "25 years",
  18250: "50 years",
  all: "full cohort"
};
const DAY_MS = 24 * 60 * 60 * 1000;

export function createTimeline({ start, end }, onChange) {
  const scrubber = document.querySelector("#timelineScrubber");
  const date = document.querySelector("#timelineDate");
  const label = document.querySelector("#rangeLabel");
  const cohortStart = Date.parse(start);
  const cohortEnd = Date.parse(end);
  if (!Number.isFinite(cohortStart) || !Number.isFinite(cohortEnd) || cohortStart >= cohortEnd) {
    throw new Error("Athena Research cohort dates are invalid");
  }

  let range = "30";

  function stateFromControls() {
    const fraction = Number(scrubber.value) / 100;
    const selectedEndMs = Math.max(
      cohortStart + 1,
      Math.min(cohortEnd, cohortStart + (cohortEnd - cohortStart) * fraction)
    );
    const rangeDays = range === "all" ? Infinity : Number(range);
    const selectedStartMs = range === "all"
      ? cohortStart
      : Math.max(cohortStart, selectedEndMs - rangeDays * DAY_MS);
    const displayDate = new Date(Math.max(cohortStart, selectedEndMs - 1)).toISOString().slice(0, 10);

    date.textContent = displayDate;
    label.textContent = `${rangeNames[range]} ending ${displayDate}`;

    return {
      range,
      start: new Date(selectedStartMs).toISOString(),
      end: new Date(selectedEndMs).toISOString()
    };
  }

  function emit() {
    onChange(stateFromControls());
  }

  document.querySelectorAll("[data-range]").forEach(button => {
    button.addEventListener("click", () => {
      range = button.dataset.range;
      document.querySelectorAll("[data-range]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      emit();
    });
  });

  scrubber.addEventListener("input", stateFromControls);
  scrubber.addEventListener("change", emit);
  emit();
}
