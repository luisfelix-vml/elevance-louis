import { fetchMockSuggestionData, fetchMockSearchData } from '../../scripts/lookup-service/lookup-service.js';

// blocks/provider-lookup/provider-lookup.js
export default async function decorate(block) {
  // block is the div EDS already built from your authored table —
  // each authored row is a child div, each cell a nested div
  const rows = [...block.children];
  const [marketRow, lobRow, nameRow, searchRow] = rows;

  const cellText = (row, index) => row?.children[index]?.querySelector('p')?.textContent?.trim() || '';

  const marketText = cellText(marketRow, 0);
  const marketValueText = cellText(marketRow, 1);
  const lobText = cellText(lobRow, 0);
  const lobListItems = [...lobRow?.children[1]?.querySelectorAll('li') ?? []].map((li) => li.textContent?.trim() || '');
  const nameText = cellText(nameRow, 0);
  const instructionsText = cellText(nameRow, 1);
  const searchText = cellText(searchRow, 0);

  block.innerHTML = '';
  const formWrapper = document.createElement('div');
  formWrapper.className = 'provider-lookup-wrapper';
  // Build form with 2 dropdowns for market and lob, a typeahead input for the
  // procedure/drug lookup, and a submit button
  formWrapper.innerHTML = `
        <form class="provider-lookup-form">
            <div class="form-row">
                <label for="market">${marketText}</label>
                <div class="select-wrap">
                    <select name="market" id="market">
                        ${marketValueText ? `<option value="${marketValueText}">${marketValueText}</option>` : ''}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <label for="lob">${lobText}</label>
                <div class="select-wrap">
                    <select name="lob" id="lob">
                        ${lobListItems.map((item) => `<option value="${item}">${item}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <label for="npi">${nameText}</label>
                <input type="text" name="npi" id="npi" placeholder="${instructionsText}" autocomplete="off" required>
                <div class="lookup-panel" hidden>
                    <input type="text" class="lookup-panel-echo" tabindex="-1" readonly>
                    <p class="lookup-hint">Please enter 3 or more characters.</p>
                    <div class="lookup-results"></div>
                </div>
            </div>
            <button type="submit" class="search-button" disabled>${searchText || 'Search'}</button>
        </form>
        <div class="search-results"></div>
    `;
  block.append(formWrapper);

  // add event listener to form for api call to input text field and display
  // result in a div below the form for each character typed in the input field
  const npiInput = formWrapper.querySelector('#npi');
  const lookupPanel = formWrapper.querySelector('.lookup-panel');
  const lookupEcho = formWrapper.querySelector('.lookup-panel-echo');
  const lookupHint = formWrapper.querySelector('.lookup-hint');
  const resultEl = formWrapper.querySelector('.lookup-results');
  const searchButton = formWrapper.querySelector('.search-button');
  const resultSection = block.querySelector('.search-results');

  npiInput.addEventListener('input', async (e) => {
    const npi = e.target.value;
    lookupEcho.value = npi;
    searchButton.disabled = npi.trim().length < 3;
    resultSection.innerHTML = '';

    if (!npi) {
      lookupPanel.hidden = true;
      resultEl.innerHTML = '';
      return;
    }

    lookupPanel.hidden = false;

    if (npi.length < 3) {
      lookupHint.hidden = false;
      resultEl.innerHTML = '';
      return;
    }

    lookupHint.hidden = true;
    resultSection.innerHTML = '';
    resultEl.textContent = 'Loading…';

    try {
      const data = await fetchMockSuggestionData();

      if (Array.isArray(data) && data.length > 0) {
        const results = data.map((item) => {
          const procedureCode = item?.procedureCode ?? 'Not found';
          const description = item?.description ?? 'No description';
          return `${procedureCode}: ${description}`;
        });

        resultEl.innerHTML = results.map((result) => `<div class="result-row">${result}</div>`).join('');
        const resultRows = resultEl.querySelectorAll('.result-row');
        resultRows.forEach((row) => {
          row.addEventListener('click', () => {
            const [code, ...rest] = row.textContent.split(':');
            npiInput.value = `${code.trim()} ${rest.join(':').trim()}`;
            lookupEcho.value = npiInput.value;
            lookupPanel.hidden = true;
            resultEl.innerHTML = '';
            resultSection.innerHTML = '';
          });
        });
      } else {
        resultSection.innerHTML = '';
        resultEl.textContent = 'No results found.';
      }
    } catch (err) {
      console.error('Provider lookup failed:', err);
      resultSection.innerHTML = '';
      resultEl.textContent = 'Something went wrong. Please try again.';
    }
  });

  searchButton.addEventListener('click', async (e) => {
    e.preventDefault();
    lookupPanel.hidden = false;
    lookupHint.hidden = true;
    resultSection.innerHTML = '';
    resultEl.textContent = 'Loading…';

    try {
      const data = await fetchMockSearchData();

      if (Array.isArray(data) && data.length > 0) {
        resultEl.innerHTML = '';

        resultSection.innerHTML = data.map((item) => {
          const procedureCode = item?.procedureCode ?? 'Not found';
          const description = item?.procedureCodeDescription ?? 'None';
          const policy = item?.precertCodeGuideList?.[0]?.policy ?? 'None';
          const cmsGuideLine = item?.cmsGuideLine ?? 'None';
          const stateGuideLine = item?.stateGuideLine ?? 'None';
          const thirdPartyGuideLine = item?.precertCodeGuideList?.[0]?.interQualSubset ?? 'None';
          const lobSelect = formWrapper.querySelector('#lob');
          const selectedLobText = lobSelect.options[lobSelect.selectedIndex].text;

          return `
                            <article class="result-card">
                                <h3>NO - Precertification is not required</h3>
                                    <div class="row">
                                        <div>
                                            <label aria-label="line of business">
                                                Line of Business:
                                            </label>
                                        </div>
                                        <div>
                                            ${selectedLobText}
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div>
                                            <label aria-label="procedure code">
                                                CPT/HCPCS Code:
                                            </label>
                                        </div>
                                        <div>
                                            ${procedureCode}
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div>
                                            <label aria-label="Procedure Code description">
                                                Description:
                                            </label>
                                        </div>
                                        <div>
                                            ${description}
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div>
                                            <label aria-label="policy guideline">
                                                Policy/Clinical Guideline:
                                            </label>
                                        </div>
                                        <div>
                                            ${policy}
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div>
                                            <label aria-label="cms GuideLine">
                                                CMS Guideline:
                                            </label>
                                        </div>
                                        <div>
                                            ${cmsGuideLine}
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div>
                                            <label aria-label="state GuideLine">
                                                State Guideline:
                                            </label>
                                        </div>
                                        <div>
                                            ${stateGuideLine}
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div>
                                            <label aria-label="inter Qual GuideLine">
                                                Third Party Guidelines:
                                            </label>
                                        </div>
                                        <div>
                                            ${thirdPartyGuideLine}
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div>
                                            <label aria-label="carelon rx clinical criteria">
                                                Carelon RX Criteria:
                                            </label>
                                        </div>
                                        <div>
                                            <p class="carelonrx">
                                                <a aria-label="carelon rx clinical criteria" class="external_link" tabindex="0" target="_blank" href="https://www.anthem.com/ms/pharmacyinformation/clinicalcriteria.html">
                                                    Clinical Criteria (anthem.com)
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            `;
        }).join('');
      } else {
        resultSection.innerHTML = '';
        resultEl.textContent = 'No results found.';
      }
    } catch (err) {
      console.error('Provider lookup failed:', err);
      resultSection.innerHTML = '';
      resultEl.textContent = 'Something went wrong. Please try again.';
    }
  });
}
