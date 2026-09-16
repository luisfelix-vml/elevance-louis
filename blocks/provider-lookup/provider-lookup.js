// ---- Configuration ---------------------------------------------------------
 
// Real endpoint — replace with the actual proxy/Edge Function URL once known.
const PRIOR_AUTH_API_URL = 'https://provider.healthybluenc.com/api/prior-auth-lookup';
 
// Local mock fixture, shipped alongside the block for dev/preview use.
const MOCK_DATA_URL = '/blocks/prior-auth-lookup/mock-data.json';

/**
 * Decide whether this session should hit the mock fixture instead of the
 * real API. Adjust the hostname patterns once the real preview/prod domains
 * are confirmed. The ?mock=1 / ?mock=0 override is handy for testing either
 * path from any environment (e.g. demoing the empty/error state in prod).
 */
function useMock() {
    const { hostname, search } = window.location;
    const params = new URLSearchParams(search);
    if (params.get('mock') === '1') return true;
    if (params.get('mock') === '0') return false;
    return hostname.endsWith('.hlx.page')
        || hostname.endsWith('.aem.page')
        || hostname === 'localhost';
}


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
    const form = document.createElement('form');
    form.className = 'provider-lookup-form';
    // Build form with 2 dropdowns for market and lob, a typeahead input for the
    // procedure/drug lookup, and a submit button
    form.innerHTML = `
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
    `;
    block.append(form);

    // add event listener to form for api call to input text field and display result in a div below the form for each character typed in the input field
    const npiInput = form.npi;
    const lookupPanel = form.querySelector('.lookup-panel');
    const lookupEcho = form.querySelector('.lookup-panel-echo');
    const lookupHint = form.querySelector('.lookup-hint');
    const resultEl = form.querySelector('.lookup-results');
    const searchButton = form.querySelector('.search-button');

    npiInput.addEventListener('input', async (e) => {
        const npi = e.target.value;
        lookupEcho.value = npi;
        searchButton.disabled = npi.trim().length < 3;

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
        resultEl.textContent = 'Loading…';

        try {
            const res = `[
                {
                    "procedureCode": "0002M",
                    "description": "Liver disease, ten biochemical assays (ALT, A2-macroglobulin, apolipoprotein A-1, total bilirubin, GGT, haptoglobin, AST, glucose, total cholesterol and triglycerides) utilizing serum, prognostic algorithm reported as quantitative scores for fibrosis, steatosis and alcoholic steatohepatitis (ASH)",
                    "category": null,
                    "subcategory": null,
                    "highDollarMe": null
                },
                {
                    "procedureCode": "0003M",
                    "description": "Liver disease, ten biochemical assays (ALT, A2-macroglobulin, apolipoprotein A-1, total bilirubin, GGT, haptoglobin, AST, glucose, total cholesterol and triglycerides) utilizing serum, prognostic algorithm reported as quantitative scores for fibrosis, steatosis and nonalcoholic steatohepatitis (NASH)",
                    "category": null,
                    "subcategory": null,
                    "highDollarMe": null
                },
                {
                    "procedureCode": "00702",
                    "description": "Anesthesia, Proc, Upper Anterior Abdominal Wall; Percutaneous Liver Bx",
                    "category": null,
                    "subcategory": null,
                    "highDollarMe": null
                },
                {
                    "procedureCode": "00792",
                    "description": "Anesthesia, Upper Abd W/Laparoscopy; Partial Hepatectomy/Mgmt Liver Hemorrhage (W/O Liver Bx)",
                    "category": null,
                    "subcategory": null,
                    "highDollarMe": null
                },
                {
                    "procedureCode": "00796",
                    "description": "Anesthesia, Intraperitoneal Proc, Upper Abdomen, W/Laparoscopy; Liver Transplant, Recipient",
                    "category": null,
                    "subcategory": null,
                    "highDollarMe": null
                }
            ]`;
            
            // Convert the string to a JSON object
            const data = JSON.parse(res);

            // Traverse the data object to find the procedureCode
            //const procedureCode = data?.procedureCode ?? 'Not found';
            if (data && data.length > 0) {
                // Extract "procedureCode" and "description" from each item in the data array
                const results = data.map(item => {
                    const procedureCode = item?.procedureCode ?? 'Not found';
                    const description = item?.description ?? 'No description';
                    return `${procedureCode}: ${description}`;
                });
                
                // Build selectable rows for each result, and add a click event listener to each row to re-populate the npi input field with the selected procedureCode
                resultEl.innerHTML = results.map(result => `<div class="result-row">${result}</div>`).join('');
                const resultRows = resultEl.querySelectorAll('.result-row');
                resultRows.forEach(row => {
                    row.addEventListener('click', () => {
                        npiInput.value = row.textContent.split(':')[0].trim() + ' ' + row.textContent.split(':')[1].trim(); // populate npi input field with selected procedureCode
                        lookupEcho.value = npiInput.value;
                        lookupPanel.hidden = true;
                        resultEl.innerHTML = '';
                    });
                });
            } else {
                resultEl.textContent = 'No results found.';
            }

        } catch (err) {
            console.error('Provider lookup failed:', err);
            resultEl.textContent = 'Something went wrong. Please try again.';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const npi = form.npi.value;
        lookupPanel.hidden = false;
        lookupHint.hidden = true;
        resultEl.textContent = 'Loading…';

        try {
        const res = await fetch(`https://provider.healthybluenc.com/sites/Satellite?d=Universal&pagename=gbdPro/PlutoServiceProxy&service=submit&state=NC&lobCode=CFSP&procCode=0002M`);
        if (!res.ok) {
            throw new Error(`Request failed: ${res.status}`);
        }
            const data = await res.json();
            resultEl.textContent = data.providerName ?? 'Not found';
        } catch (err) {
            console.error('Provider lookup failed:', err);
            resultEl.textContent = 'Something went wrong. Please try again.';
        }
    });
}