// blocks/provider-lookup/provider-lookup.js
export default async function decorate(block) {
  // block is the div EDS already built from your authored table —
  // each authored row is a child div, each cell a nested div
    const rows = [...block.children];
    const marketRow = rows[0];
    const lobRow = rows[1];
    const nameRow = rows[2];
    const searchRow = rows[3];

    let marketText = '';
    let marketValueText = '';
    let lobText = '';
    let lobListItems = [];
    let nameText = '';
    let instructionsText = '';
    let searchText = '';   


    if (marketRow) {
        const marketTitle = marketRow.firstElementChild;
        marketText = marketTitle.querySelector('p')?.textContent?.trim() || '';

        const marketValue = marketRow.children[1];
        marketValueText = marketValue.querySelector('p')?.textContent?.trim() || '';
    }

    if (lobRow) {
        const lobTitle = lobRow.firstElementChild;
        lobText = lobTitle.querySelector('p')?.textContent?.trim() || '';
    
        const lobList= lobRow.children[1];
        lobListItems = [...lobList.querySelectorAll('li')].map(li => li.textContent?.trim() || '');
    }

    if (nameRow) {
        const nameTitle = nameRow.firstElementChild;
        nameText = nameTitle.querySelector('p')?.textContent?.trim() || '';

        const instructionsRow = nameRow.children[1];
        instructionsText = instructionsRow.querySelector('p')?.textContent?.trim() || '';
    }

    if (searchRow) {
        const searchTitle = searchRow.firstElementChild;
        searchText = searchTitle.querySelector('p')?.textContent?.trim() || '';
    }


    block.innerHTML = '';
    const form = document.createElement('form');
    // Build for with 2 dropdowns for market and lob, input for npi, and submit button
    form.innerHTML = `
        <label for="market">${marketText}:</label>
        <select name="market" id="market">
            ${marketValueText ? `<option value="${marketValueText}">${marketValueText}</option>` : ''}
        </select>
        <label for="lob">${lobText}:</label>
        <select name="lob" id="lob">
            ${lobListItems.length ? lobListItems.map(item => `<option value="${item}">${item}</option>`).join('') : ''}
        </select>
        <label for="npi">${nameText}:</label>
        <input type="text" name="npi" id="npi" placeholder="${instructionsText}" required>
        <button type="submit">${searchText || 'Search'}</button>
    `;
    block.append(form);

    // add event listener to form for api call to input text field and display result in a div below the form for each character typed in the input field
    const npiInput = form.npi;
    const resultEl = document.createElement('div');
    resultEl.className = 'result';
    form.append(resultEl);

    npiInput.addEventListener('input', async (e) => {
        const npi = e.target.value;
        if (npi.length > 3) {
            resultEl.textContent = '';
            return;
        }
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
                        npiInput.value = row.textContent.split(':')[0].trim();
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
        const resultEl = form.querySelector('.result');
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