// Functie om rooster op te halen met behulp van fetch
async function fetchSchedule(
  authorizationCode,
  userType,
  year,
  week,
  schoolName
) {
  try {
    const url = `https://${schoolName}.zportal.nl/api/v3/liveschedule?access_token=${authorizationCode}&${userType}=~me&week=${year}${week}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const scheduleData = await response.json();
    displaySchedule(scheduleData);
  } catch (error) {
    console.error("Error fetching schedule:", error.message);
    displayError("Error fetching schedule. Please try again.");
  }
}

// Functie om rooster weer te geven
function displaySchedule(scheduleData) {
  const scheduleElement = document.getElementById("schedule");
  if (
    scheduleData &&
    scheduleData.response &&
    scheduleData.response.data
  ) {
    const appointments = scheduleData.response.data[0].appointments;

    let previousDate = null; // Variable to store the previous date

    const daysOfWeek = [
      "Zondag:",
      "Maandag:",
      "Dinsdag:",
      "Woensdag:",
      "Donderdag:",
      "Vrijdag:",
      "Zaterdag:",
    ];

    // Group appointments by day
    const appointmentsByDay = appointments.reduce((acc, appointment) => {
      const currentDay = new Date(appointment.start * 1000).getDay();
      const currentDayName = daysOfWeek[currentDay];

      if (!acc[currentDayName]) {
        acc[currentDayName] = [];
      }
      acc[currentDayName].push(appointment);
      return acc;
    }, {});

    // Generate HTML for each day
    const scheduleHTML = Object.entries(appointmentsByDay)
      .map(([dayName, appointments]) => {
        const appointmentsHTML = appointments
          .map((appointment, idx, arr) => {
            const uur = appointment.startTimeSlotName;
            const voriguur = idx > 0 ? arr[idx - 1].startTimeSlotName : 0;
            const leftMarg = 130 * (uur - voriguur - 1); // 130 px per lesuur.

            // Format start and end time
            const startTime = new Date(
              appointment.start * 1000
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const endTime = new Date(
              appointment.end * 1000
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Map subject abbreviations to full names
            const subjects = appointment.subjects.map(
              (subject) => subject.toUpperCase()
            );
            const warning = appointment.changeDescription;
            const warningsymbol = warning
              ? '<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align: sub;"><path d="M10.909 2.782a2.25 2.25 0 0 1 2.975.74l.083.138 7.759 14.009a2.25 2.25 0 0 1-1.814 3.334l-.154.006H4.242A2.25 2.25 0 0 1 2.2 17.812l.072-.143L10.03 3.66a2.25 2.25 0 0 1 .879-.878ZM12 16.002a.999.999 0 1 0 0 1.997.999.999 0 0 0 0-1.997Zm-.002-8.004a1 1 0 0 0-.993.884L11 8.998 11 14l.007.117a1 1 0 0 0 1.987 0l.006-.117L13 8.998l-.007-.117a1 1 0 0 0-.994-.883Z" fill="yellow"></path></svg>'
              : "";

            // Generate HTML for each appointment
            return `<div style="margin-left:${leftMarg}px;"
                      class="les${appointment.cancelled ? " cancelled" : ""}"
                      id="${appointment.subjects.join(", ") ? "" : "error"}${subjects.join(", ")}"
            >
              <p>
                <strong>${subjects.join(", ")}</strong>
                <strong class="lesuur">${appointment.startTimeSlotName}</strong>
              </p>
              <p class="lestijden">${startTime} - ${endTime}</p>
              <span>
                ${appointment.locations.join(", ")} (${appointment.teachers.join(", ")})
                <div class="warning">
                  ${warningsymbol}
                  <span class="warningMessage">${warning}</span>
                </div>
              </span>
              <p class="className">
                ${appointment.groups.join(", ")}
              </p>
            </div>`;
          })
          .join("");

        // Generate HTML for the day with its appointments
        return `<span><h3>${dayName}</h3>${appointmentsHTML}</span>`;
      })
      .join("");

    scheduleElement.innerHTML = scheduleHTML;
  } else {
    scheduleElement.innerHTML = "<p>Geen roostergegevens gevonden.</p>";
  }
}

// Functie om foutmelding weer te geven
function displayError(message) {
  const scheduleElement = document.getElementById("schedule");
  scheduleElement.innerHTML = `<p>${message}</p>`;
}

// Functie om de access token te verkrijgen door middel van de koppelcode.
async function fetchToken(authorizationCode, schoolName) {
  try {
    const url = `https://${schoolName}.zportal.nl/api/v3/oauth/token?grant_type=authorization_code&code=${authorizationCode}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log(response);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const parsedresp = await response.json();
    console.log(parsedresp);
    const accessToken = parsedresp["access_token"];
    console.log(accessToken);
    return accessToken;

  } catch (error) {
    console.error("Error fetching acces token:", error.message);
    displayError("Error fetching acces token. Please try again.");
  }
}

// Functie om formulierinzending te verwerken
async function handleFormSubmit(event) {
  event.preventDefault(); // Voorkom formulierinzending
  const schoolName = document.getElementById("schoolName").value;
  const authorizationCode =
    document.getElementById("authorizationCode").value;
  const userType = document.getElementById("userType").value;
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  let week = Math.floor((currentDate - new Date(year, 0, 1)) / 604800000) + 1; // Bereken weeknummer
  if (week < 10) week = `0${week}`; // Voeg een voorloopnul toe aan enkelcijferige weken

  // Wissel de koppelcode in voor de access token (maar alleen als die nog niet in local storage staat)
  let accessToken = localStorage.getItem("access_token");
  if (accessToken == null || accessToken == "undefined") {
    accessToken = await fetchToken(authorizationCode, schoolName);
    localStorage.setItem("access_token", accessToken);
  }

  // Haal het rooster op
  fetchSchedule(accessToken, userType, year, week, schoolName);
}

// Voeg een gebeurtenisluisteraar toe voor de formulierinzending
document
  .getElementById("inputForm")
  .addEventListener("submit", handleFormSubmit);
// Sla schoolnaam en token op
schoolName.value = localStorage.getItem("schoolName");
schoolName.oninput = () => {
  localStorage.setItem("schoolName", schoolName.value);
};

authorizationCode.value = localStorage.getItem("authorizationCode");
authorizationCode.oninput = () => {
  localStorage.setItem("authorizationCode", authorizationCode.value);
  localStorage.setItem("access_token", "undefined");
};

userType.value = localStorage.getItem("userType");
userType.oninput = () => {
  localStorage.setItem("userType", userType.value);
};

// Functie om dialoogvenster te tonen
function showDialog() {
  const dialog = document.getElementById("dialog");
  dialog.showModal();
}

// Functie om dialoogvenster te verbergen
function hideDialog() {
  const dialog = document.getElementById("dialog");
  dialog.close();
  document.getElementById("css").click();
}
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("save").click(), 0;
  const schoolName = localStorage.getItem("schoolName") || "";
  const authorizationCode = localStorage.getItem("authorizationCode") || "";
  const userType = localStorage.getItem("userType") || "";
  if (
    schoolName.trim() === "" ||
    authorizationCode.trim() === "" ||
    userType.trim() === ""
  ) {
    // Als een van de opgeslagen waarden leeg is, toon dialoogvenster
    showDialog();
  }
});

css.value = localStorage.getItem("css");
css.oninput = () => {
  localStorage.setItem("css", css.value);
};

function update_section(with_what, what) {
  document.getElementById(what + "goeshere").innerHTML = with_what;
}