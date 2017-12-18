const API_ROOT = 'https://swapi.co/api';
const REQUIRED_SHIP_IDS = [2, 75, 74, 65, 3, 59, 58, 63, 28, 29, 39, 10];
const SHIP_PROPERTIES_FOR_COMPARISON = [
  'name',
  'model',
  'cost_in_credits',
  'max_atmosphering_speed',
  'cargo_capacity',
  'passengers',
];

let leftDropDown;
let rightDropDown;
let comparisonForm;
let isLoadingComparison;

/**
 * Starship generator function
 */
function* starshipGenerator(id) {
  const url = `${API_ROOT}/starships/${id}/`;
  const stream = yield fetch(url);
  const response = yield stream.json();
  return response;
}

/**
 * Generator function wrapper
 */
function run(genFunc, param) {
  const genObject = genFunc(param);

  function iterate(iteration) {
    if (iteration.done) {
      return Promise.resolve(iteration.value);
    }

    return Promise.resolve(iteration.value)
      .then(x => iterate(genObject.next(x)))
      .catch(e => iterate(genObject.throw(e)));
  }

  try {
    return iterate(genObject.next());
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Convenience function to populate the table with data retrieved from the server
 */
function populateTable(shipInfoPair) {
  SHIP_PROPERTIES_FOR_COMPARISON.forEach((property) => {
    const leftTableCell = document.getElementById(`table-${property}-left`);
    const rightTableCell = document.getElementById(`table-${property}-right`);

    const leftPropertyValue = shipInfoPair[0][property];
    const rightPropertyValue = shipInfoPair[1][property];

    leftTableCell.innerHTML = leftPropertyValue;
    rightTableCell.innerHTML = rightPropertyValue;

    // Don't try to compare property values if they're not numeric
    if (isNaN(leftPropertyValue)) {
      return;
    }

    const valsEqual = leftPropertyValue === rightPropertyValue;
    const leftHasGreaterValue = +leftPropertyValue > +rightPropertyValue;

    const getBackgroundColor = isGreater => (isGreater ? '#FFAAAA' : 'transparent');
    leftTableCell.style.backgroundColor = getBackgroundColor(!valsEqual && leftHasGreaterValue);
    rightTableCell.style.backgroundColor = getBackgroundColor(!valsEqual && !leftHasGreaterValue);
  });
}

/**
 * Function called to compare two selected star ships
 */
function compare() {
  // Don't hit the server too much - wait to complete if still going
  if (isLoadingComparison) {
    return;
  }

  // Used to control the visibility and 'enabledness' of the UI elements
  const controlElements = (isLoading) => {
    const fieldset = document.getElementById('comparison-fieldset');
    const loadingAnimation = document.getElementById('load-animation');
    fieldset.disabled = isLoading;
    loadingAnimation.style.display = isLoading ? 'block' : 'none';
  };

  isLoadingComparison = true;
  controlElements(isLoadingComparison);

  const leftComparisonId = leftDropDown.selectedOptions[0].value;
  const rightComparisonId = rightDropDown.selectedOptions[0].value;

  const leftPromise = run(starshipGenerator, leftComparisonId);
  const rightPromise = run(starshipGenerator, rightComparisonId);
  Promise.all([leftPromise, rightPromise]).then((shipInfoPair) => {
    populateTable(shipInfoPair);
    isLoadingComparison = false;
    controlElements(isLoadingComparison);
  }).catch((err) => {
    alert('There was an issue getting data for the comparison. Please try again later.');
    console.error(err);
    isLoadingComparison = false;
    controlElements(isLoadingComparison);
  });
}

/**
 * Function called by the onchange event listener applied to the dropdowns
 */
function onSelectionChanged() {
  if (leftDropDown.selectedIndex === rightDropDown.selectedIndex) {
    // Can't compare against self - mark as invalid
    rightDropDown.setCustomValidity('This is the same ship as selected on the left');
    return;
  }

  // Reset validation
  rightDropDown.setCustomValidity('');

  compare();
}

/**
 * Function used to get the initial ships and then populate the dropdowns
 */
function getInitialShipsAndPopulateDropdowns() {
  const shipDropdowns = [];
  const promises = [];

  REQUIRED_SHIP_IDS.forEach((id) => {
    promises.push(run(starshipGenerator, id)
      .then((shipInfo) => {
        // As part of the assignment, we need to request the ship info every
        // time; so only cache what we need right now
        const summaryObject = {
          id,
          name: shipInfo.name,
        };
        shipDropdowns.push(summaryObject);
      }));
  });

  Promise.all(promises).then(() => {
    shipDropdowns.sort((first, second) => (first.id < second.id ? -1 : 1));
    console.log(`Loaded ${shipDropdowns.length} craft from server and sorted them by id.`);

    populateDropdown(leftDropDown, shipDropdowns);
    populateDropdown(rightDropDown, shipDropdowns);

    // Make second drop down have a different selected item
    rightDropDown.selectedIndex = 1;

    // Hook up event listeners
    leftDropDown.addEventListener('change', onSelectionChanged);
    rightDropDown.addEventListener('change', onSelectionChanged);

    // Hide loading message and show comparison area
    document.getElementById('initial-load-area').style.display = 'none';
    document.getElementById('comparison-area').style.display = 'block';
  });
}

/**
 * Convenience function to populate the drop down lists
 */
function populateDropdown(dropdownElement, options) {
  options.forEach((shipInfo) => {
    const optionElement = document.createElement('option');
    dropdownElement.appendChild(optionElement);
    optionElement.value = shipInfo.id;
    optionElement.innerHTML = shipInfo.name;
  });
}

/**
 * Function called by the document's onload event listener to set up the page
 */
function setup() {
  // Cache the elements to make it easier to reference them later
  leftDropDown = document.getElementById('left-comparison');
  rightDropDown = document.getElementById('right-comparison');
  comparisonForm = document.getElementById('comparison-form');

  comparisonForm.addEventListener('submit', (evt) => {
    evt.preventDefault();
    compare();
    return false;
  });

  getInitialShipsAndPopulateDropdowns();
}

window.addEventListener('load', setup);
