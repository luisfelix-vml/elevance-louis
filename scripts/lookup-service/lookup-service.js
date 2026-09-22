/*
 * lookup-service — shared mock-data fetch helpers for the provider-lookup
 * and forms-accordion blocks. Both blocks fetch/parse a local JSON fixture
 * the same way (fetch → check res.ok → parse JSON → throw on failure); this
 * centralizes that logic plus the fixtures themselves so the two blocks stay
 * in sync instead of duplicating fetch/error-handling code.
 */

const MOCK_SUGGESTION_DATA_URL = '/scripts/lookup-service/mock-suggestion-data.json';
const MOCK_SEARCH_DATA_URL = '/scripts/lookup-service/mock-search-data.json';
const MOCK_FORMS_DATA_URL = '/scripts/lookup-service/mock-forms-response.json';

async function fetchMockJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mock fixture failed to load: ${res.status}`);
  return res.json();
}

// provider-lookup: typeahead suggestions for the procedure/drug input
export function fetchMockSuggestionData() {
  return fetchMockJson(MOCK_SUGGESTION_DATA_URL);
}

// provider-lookup: precertification search results
export function fetchMockSearchData() {
  return fetchMockJson(MOCK_SEARCH_DATA_URL);
}

// forms-accordion: GPP forms-library document list
export function fetchMockFormsData() {
  return fetchMockJson(MOCK_FORMS_DATA_URL);
}
