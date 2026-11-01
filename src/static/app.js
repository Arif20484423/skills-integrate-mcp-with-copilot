document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");
  const authStatus = document.getElementById("auth-status");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const loginOpenButton = document.getElementById("login-open-btn");
  const logoutButton = document.getElementById("logout-btn");
  let isTeacher = false;

  function setAuthState(username) {
    isTeacher = Boolean(username);
    authStatus.textContent = isTeacher
      ? `Teacher: ${username}`
      : "Viewing as a guest";
    signupContainer.classList.toggle("hidden", !isTeacher);
    loginOpenButton.classList.toggle("hidden", isTeacher);
    logoutButton.classList.toggle("hidden", !isTeacher);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("The activity request failed.");
      }
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(activitySelect.options[0]);

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map(
                      (email) => `<li>
                        <span class="participant-email">${escapeHTML(email)}</span>
                        ${
                          isTeacher
                            ? `<button class="delete-btn" data-activity="${escapeHTML(name)}" data-email="${escapeHTML(email)}" aria-label="Remove ${escapeHTML(email)}">Remove</button>`
                            : ""
                        }
                      </li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : "<p><em>No participants yet</em></p>";

        activityCard.innerHTML = `
          <h4>${escapeHTML(name)}</h4>
          <p>${escapeHTML(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHTML(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">${participantsHTML}</div>
        `;
        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      activitiesList.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.currentTarget;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        if (response.status === 401) {
          setAuthState(null);
          fetchActivities();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  loginOpenButton.addEventListener("click", () => {
    loginError.classList.add("hidden");
    loginDialog.showModal();
  });

  document.getElementById("login-cancel-btn").addEventListener("click", () => {
    loginDialog.close();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.classList.add("hidden");
    const formData = new FormData(loginForm);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        loginError.textContent = result.detail || "Unable to log in.";
        loginError.classList.remove("hidden");
        return;
      }
      setAuthState(result.username);
      loginDialog.close();
      loginForm.reset();
      fetchActivities();
    } catch (error) {
      loginError.textContent = "Unable to log in. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("The logout request failed.");
      }
      setAuthState(null);
      fetchActivities();
    } catch (error) {
      showMessage("Failed to log out. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isTeacher) {
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        if (response.status === 401) {
          setAuthState(null);
          fetchActivities();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  setAuthState(null);
  fetchActivities();
  fetch("/auth/me")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to check teacher login.");
      }
      return response.json();
    })
    .then((status) => {
      setAuthState(status.authenticated ? status.username : null);
      if (status.authenticated) {
        fetchActivities();
      }
    })
    .catch((error) => {
      showMessage("Unable to verify teacher login status.", "error");
      console.error("Error checking teacher login:", error);
    });
});
