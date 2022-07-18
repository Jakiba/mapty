'use strict';

///////////////////////////////////////////////////
//// WORKOUT ARCHITECTURE

/**
 * Parent Workout Class, which contains the main methods/properties of the Cycling and Running Child Classes.
 */
class Workout {
  date = new Date();

  // id for identifiying right objects in array (see _moveToPopup())
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coordinates, distance, duration) {
    this.coordinates = coordinates; // [lat,lng]
    this.distance = distance; //in km
    this.duration = duration; // in min
  }

  /**
   * Responsible for popup message, with type of workout, month,...
   * @this {object} Workout Class (constructor)
   * @returns {undefined}
   */
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

/**
 * Child Class of Workout.
 */
class Running extends Workout {
  type = 'running';

  constructor(coordinates, distance, duration, cadence) {
    super(coordinates, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  /**
   * Responsible for calculating your running pace.
   * @returns {number} returns your running pace.
   * @this {object} points to running Class (constructor)
   */
  calcPace() {
    this.pace = this.duration / this.distance; //min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coordinates, distance, duration, elevationGain) {
    super(coordinates, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  /**
   * Responsible for calculating your cycling pace.
   * @returns {number} returns your cycling speed.
   * @this {object} points to Cycling Class (constructor)
   */
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE!!!!
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const modal = document.querySelector('.modal__invalidInputs');
const closeModal = document.querySelector('.modal__close');

/**
 * App Class, in which all application features are defined and where the cycling/running objects are created.
 */
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //get user position with method from below.
    this._getPosition();

    //get data from local storage and render workouts.
    this._getLocalStorage();

    //create new workout on 'submit'
    form.addEventListener('submit', this._newWorkout.bind(this));

    // "change"-event for when we select new workout type.
    inputType.addEventListener('change', this._toggleElevationField);

    //to move to associated marker on 'click'.
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  /**
   * Responsible for getting coordinates of the user (if possible) and then loading the map based on position.
   * @returns {undefined}
   * @this {object} points to App Class.
   */
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position...');
        }
      );
    }
  }

  /**
   * Responsible for loading the map based on coords (lat,lng), setting zoom level, style of map-tiles and rendering workout marker (all with leaflet library) saved in local storage.
   * @param {Array} position
   * @returns {undefined}
   * @this {object} points to App Class.
   */
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    console.log(
      `https://www.google.com/maps/@${latitude},${longitude},7z?hl=de`
    );

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  /**
   * Responsible for showing the form element and generating 'focus' effect on input 'distance', when clicking on the map to add new workout.
   * @param {Event} mapE so that we can save the mapEvent as a global variable in the class.
   * @returns {undefined}
   * @this {object} points to App Class.
   */
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  /**
   * Responsible for clearing all input fields and hiding the form.
   * @returns {undefined}
   */
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  /**
   * Responsible for toggling the new input field  on 'change' event for cycling/running.
   * @returns {undefined}
   */
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  /**
   * Responsible for checking if input data from user is ok and then based on inputs generating new workouts (running/cycling).
   * Pushes new Workouts into '#workouts', generates marker for generated workout, clears + hides form and then saves workout in local storage.
   * @param {Event} e to prevent default reload behaviour of 'submit' event.
   * @returns {undefined | Function} undefined if everything ok, alert message if inputs wrong.
   * @this {object} points to App Class.
   */
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositive = (...inputs) => inputs.every(input => input > 0);
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(cadence, distance, duration) ||
        !allPositive(cadence, distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (
        !validInputs(elevationGain, distance, duration) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    this.#workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  /**
   * Responsible for rendering the workout marker after user submits form + setting style and content of marker.
   * @param {object} workout to get coords from workout-object.
   * @returns {undefined}
   * @this {object} points to App Class.
   */
  _renderWorkoutMarker(workout) {
    L.marker(workout.coordinates)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  /**
   * Responsible for rendering workout overlay (depending on type of workout) after submitting form.
   * @param {object} workout workout object (running/cycling).
   * @returns {undefined}
   */
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
              </div>
            </li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
              </div>
            </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  /**
   * Responsible for moving map to associated marker, if user clicks on one of his marker.
   * @param {Event} e event-delegation. 'click' event.
   * @returns {undefined}
   * @this {object} points to App Class.
   */
  _moveToPopup(e) {
    const workoutElement = e.target.closest('.workout');
    if (!workoutElement) return;

    const workout = this.#workouts.find(
      workout => workout.id === workoutElement.dataset.id
    );

    this.#map.setView(workout.coordinates, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  /**
   * Responsible for saving workouts in local storage.
   */
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  /**
   * Responsible for getting workouts out of local storage and rendering them.
   */
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  /**
   * Responsible for clearing workouts in local storage.
   */
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
