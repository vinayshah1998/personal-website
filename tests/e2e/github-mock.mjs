// A stand-in for GitHub's public contribution calendar, shaped like github.com/users/<user>/contributions: a <td> per
// day with its date and level, and a <tool-tip> per day with its count. The last 365 days through today (UTC).
const DAY = 86_400_000;

/** The mock's days, oldest first: weekdays busier than weekends, and every eleventh day off. */
export function contributionDays(now = Date.now()) {
  const today = Math.floor(now / DAY);
  const out = [];
  for (let d = today - 365; d <= today; d++) {
    const dow = (d + 3) % 7;
    const count = d % 11 === 0 ? 0 : dow < 5 ? 1 + (d % 9) : d % 3;
    out.push({ date: new Date(d * DAY).toISOString().slice(0, 10), count, level: count === 0 ? 0 : Math.min(4, Math.ceil(count / 2.5)) });
  }
  return out;
}

export function calendarHtml(days = contributionDays()) {
  const cells = days.map(
    (d, i) => `<td tabindex="0" data-ix="${i}" style="width: 10px" data-date="${d.date}" id="contribution-day-component-${i % 7}-${Math.floor(i / 7)}" data-level="${d.level}" role="gridcell" class="ContributionCalendar-day"></td>`,
  );
  const tips = days.map(
    (d, i) =>
      `<tool-tip id="tooltip-${i}" for="contribution-day-component-${i % 7}-${Math.floor(i / 7)}" popover="manual" class="sr-only position-absolute">${d.count ? `${d.count.toLocaleString('en-US')} contribution${d.count === 1 ? '' : 's'}` : 'No contributions'} on some day.</tool-tip>`,
  );
  return `<div><table><tbody><tr>${cells.join('')}</tr></tbody></table>${tips.join('')}</div>`;
}
