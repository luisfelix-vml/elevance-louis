// blocks/provider-lookup/provider-lookup.js
export default async function decorate(block) {
  // block is the div EDS already built from your authored table —
  // each authored row is a child div, each cell a nested div
    const rows = [...block.children];
    const marketRow = rows[0];
    const lobRow = rows[1];
    const nameRow = rows[2];
    const searchRow = rows[3];

    if (marketRow) {
        //get first child of marketRow
        const marketTitle = marketRow.firstElementChild;
        // get p element and take its text content 
        const marketText = marketTitle.querySelector('p')?.textContent?.trim() || '';
        console.log('marketText:', marketText);

        // get second child of marketRow 
        const marketValue = marketRow.children[1];
        // get p element and take its text content 
        const marketValueText = marketValue.querySelector('p')?.textContent?.trim() || '';
        console.log('marketValueText:', marketValueText);
    }

    if (lobRow) {
        const lobTitle = lobRow.firstElementChild;
        const lobText = lobTitle.querySelector('p')?.textContent?.trim() || '';
        console.log('lobText:', lobText);

        const lobList= lobRow.children[1];
        const lobListItems = [...lobList.querySelectorAll('li')].map(li => li.textContent?.trim() || '');
        console.log('lobListItems:', lobListItems);
    }

    if (nameRow) {
        const nameTitle = nameRow.firstElementChild;
        const nameText = nameTitle.querySelector('p')?.textContent?.trim() || '';
        console.log('nameText:', nameText);

        const instructionsRow = nameRow.children[1];
        const instructionsText = instructionsRow.querySelector('p')?.textContent?.trim() || '';
        console.log('instructionsText:', instructionsText);
    }

    if (searchRow) {
        const searchTitle = searchRow.firstElementChild;
        const searchText = searchTitle.querySelector('p')?.textContent?.trim() || '';
        console.log('searchText:', searchText);
    }



//   const inputLabel = rows[0]?.textContent?.trim() || 'Enter NPI';

//   block.innerHTML = '';
//   const form = document.createElement('form');
//   form.innerHTML = `
//     <label>${inputLabel}</label>
//     <input type="text" name="npi" required />
//     <button type="submit">Look up</button>
//     <div class="result"></div>
//   `;
//   block.append(form);

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const npi = form.npi.value;
//     const resultEl = form.querySelector('.result');
//     resultEl.textContent = 'Loading…';

//     try {
//       const res = await fetch(`/api/provider-lookup?npi=${encodeURIComponent(npi)}`);
//       if (!res.ok) throw new Error(`Request failed: ${res.status}`);
//       const data = await res.json();
//       resultEl.textContent = data.providerName ?? 'Not found';
//     } catch (err) {
//       resultEl.textContent = 'Something went wrong. Please try again.';
//     }
//  });
}