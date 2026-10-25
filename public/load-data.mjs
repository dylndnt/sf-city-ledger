export async function loadSnapshots(fetcher = fetch) {
  const response = await fetcher('./data/fy2025.json');
  if (!response.ok) throw new Error(`FY2025 HTTP ${response.status}`);
  const data = await response.json();
  let previousData = null;
  try {
    const previousResponse = await fetcher('./data/fy2024.json');
    if (previousResponse.ok) {
      const candidate = await previousResponse.json();
      if (candidate.fiscalYear === '2024' && Array.isArray(candidate.funds)
        && Array.isArray(candidate.spendingDetails)) previousData = candidate;
    }
  } catch {
    // The primary chart remains usable when the optional comparison is unavailable.
  }
  return { data, previousData };
}
