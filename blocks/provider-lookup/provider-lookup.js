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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const npi = form.npi.value;
        const resultEl = form.querySelector('.result');
        resultEl.textContent = 'Loading…';

        try {
        const res = await fetch(`/api/provider-lookup?npi=${encodeURIComponent(npi)}`);
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