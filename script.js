var amount = document.getElementById('currentPrice');
var liveContainer = document.getElementById('liveContainer');
var secondsEle = document.getElementById('seconds');
var decTimeBtn = document.getElementById('decTimeBtn');
var incTimeBtn = document.getElementById('incTimeBtn');
var startButton = document.getElementById('start');
var recordTable = document.getElementById('recordTable');
// flag to prevent HTTPRequest if previous request is not complete
var getPriceInProgress = false;
// stores the previous rate, to check how the price has progressed
var previousRate = 0;
// is true when price goes up else false
var priceUp = true;
// stores all theInterval instances
var timers = [];
// stores all the prices encountered
var TrackedPrices = [];

// clears all the timers
function clearTimers() {
  // clear all timers in the array
  for (var i = 0; i < timers.length; i++) {
    clearTimeout(timers[i]);
  }
}

function repaintBackground() {
  if (priceUp) {
    liveContainer.style.backgroundColor = '#007e11';
    document.body.style.backgroundColor = '#007e11';
  } else {
    liveContainer.style.backgroundColor = '#ff3b3b';
    document.body.style.backgroundColor = '#ff3b3b';
  }
}

function setNewPriceUI(success, usd) {
  amount.innerHTML = usd;
  var currentRate = parseFloat(usd.replace(/,/g, ''));
  if (currentRate > previousRate && !priceUp) {
    priceUp = true;
    repaintBackground()
  } else if (currentRate < previousRate && priceUp) {
    priceUp = false;
    repaintBackground();
  }
  previousRate = currentRate;
}


// set the current rate of BITCOIN
function getCurrentPrice(callback, date) {
  if (!(getPriceInProgress)) {
    getPriceInProgress = true;
    var XHR = new XMLHttpRequest();
    XHR.onreadystatechange = function () {
      if (XHR.readyState === 4 && XHR.status === 200) {
        var res = JSON.parse(XHR.responseText);
        callback(true, res.bpi.USD.rate, date);
      } else if (XHR.readyState === 4 && XHR.status != 200) {
        callback(false, "0,000.0000", date);
      }
      getPriceInProgress = false;
    }
    XHR.open('GET', 'https://api.coindesk.com/v1/bpi/currentprice.json');
    XHR.send()
  }
}

// increments/decrements the time in UI
function incdecTime(time) {
  let newTime = parseInt(secondsEle.innerHTML) + time;
  if (newTime > 0) secondsEle.innerHTML = newTime;
}

function holdTimer(btn, time, start, speedup) {
  var t;
  var originalTimer = start;
  var repeat = function () {
    incdecTime(time);
    t = setTimeout(repeat, start);
    if (start > 50)
      start = start / speedup;
  }

  // on mouse hold, start increment/decrement
  btn.onmousedown = function () {
    start = originalTimer;
    repeat();
  }

  // on mouse leave, stop the timer i.e prevent increment/decrement
  btn.onmouseup = function () {
    clearTimeout(t);
  }
  btn.addEventListener("mouseleave", function () {
    clearTimeout(t);
  });
};

// switches to timer UI
function toggleTimerUI() {
  // change border color to transparent
  document.getElementById('liveContainerContent').classList.toggle("liveContainerContentTimerView");
  document.getElementById('liveContainerContent').classList.toggle("noMargin");
  liveContainer.classList.toggle("liveContainerTimerView");
  // hide the config buttons
  document.getElementById("config").classList.toggle("configHidden")
  // remove margins from hearders
  document.querySelector(".liveContainerContent h2").classList.toggle('noMargin');
  document.querySelector(".liveContainerContent h1").classList.toggle('noMargin');
  document.getElementById("config").classList.toggle("displayNone");
  document.getElementById("recordCanvas").classList.toggle("displayNone");
  // reset the STOP button UI
  document.getElementById("stopBtn").classList.remove("disabledBtn");
  document.getElementById("stopBtn").innerHTML = "STOP"
  // reset the stored bitcoin prices
  TrackedPrices.splice(0, TrackedPrices.length);
  // reset the table
  recordTable.innerHTML = "";
}

// adds the new prices to the table
function appendToTable(success, price, difference, date) {
  var dt = new Date(date);
  var newEle = "";
  if (difference > 0) {
    newEle += "<tr class='green'>";
  } else if (difference < 0) {
    newEle += "<tr class='red'>";
  } else {
    newEle += "<tr>";
  }

  newEle += "<td>" + dt.toLocaleString() + "</td><td>$ " + price + "</td><td>";
  if (difference > 0) newEle += "+";
  newEle += difference + "</td></tr>"
  recordTable.innerHTML = recordTable.innerHTML + (newEle);
}

// to round float nums
function round(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

// stops the timer
function stopTimer() {
  clearTimers();
  // change STOP button UI
  document.getElementById("stopBtn").classList.add("disabledBtn");
  document.getElementById("stopBtn").innerHTML = "STOPPED"
}

// stores the new prices and displays in UI
function addToTracker(success, usd, date) {
  // add price to the table
  if (success) {
    amount.innerHTML = usd;
    var currentRate = parseFloat(usd.replace(/,/g, ''));
    if (currentRate > previousRate && !priceUp) {
      priceUp = true;
      repaintBackground()
    } else if (currentRate < previousRate && priceUp) {
      priceUp = false;
      repaintBackground();
    }
    appendToTable(true, usd, round(currentRate - previousRate, 4), date);
    TrackedPrices.push({
      "time": date,
      "price": currentRate,
    })
    previousRate = currentRate;
  }
}


// starts the timer
function startTimer() {
  // change UI to timer UI
  toggleTimerUI();

  // stop the default timer
  clearTimers();

  // set up new timer with the time set at config
  timers.push(setInterval(function () {
    getCurrentPrice(addToTracker, Date.now());
  }, parseInt(secondsEle.innerHTML) * 1000));
  getCurrentPrice(addToTracker, Date.now());
}

// gets prices for the h1
function resetTimer() {
  timers.push(setInterval(function () {
    getCurrentPrice(setNewPriceUI);
  }, 5000));
  getCurrentPrice(setNewPriceUI);
  // toggle timer UI to default
  toggleTimerUI();
}

// downloads the JSON file
function downloadJSON() {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(TrackedPrices)));
  element.setAttribute('download', "bitcoin_tracker.json");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

window.onload = function () {

  // to speed up the timer upon holding the button
  holdTimer(decTimeBtn, -1, 1000, 2);
  holdTimer(incTimeBtn, 1, 1000, 2);

  // on click on start button event
  start.addEventListener("click", startTimer);

  // get prices initially
  timers.push(setInterval(function () {
    getCurrentPrice(setNewPriceUI);
  }, 5000));
  getCurrentPrice(setNewPriceUI);
}