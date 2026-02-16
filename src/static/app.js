document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const authDropdown = document.getElementById("auth-dropdown");
  const authStatus = document.getElementById("auth-status");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");

  let teacherToken = localStorage.getItem("teacherToken") || "";
  let teacherUsername = "";

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(teacherToken);

    authStatus.textContent = isLoggedIn
      ? `Teacher: ${teacherUsername}`
      : "Student mode";
    loginBtn.classList.toggle("hidden", isLoggedIn);
    logoutBtn.classList.toggle("hidden", !isLoggedIn);

    signupForm.querySelector("button[type='submit']").disabled = !isLoggedIn;
  }

  async function validateExistingSession() {
    if (!teacherToken) {
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch("/auth/session", {
        headers: {
          "X-Teacher-Token": teacherToken,
        },
      });
      const result = await response.json();

      if (result.authenticated) {
        teacherUsername = result.username;
      } else {
        teacherToken = "";
        teacherUsername = "";
        localStorage.removeItem("teacherToken");
      }
    } catch (error) {
      teacherToken = "";
      teacherUsername = "";
      localStorage.removeItem("teacherToken");
    }

    updateAuthUI();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      const isTeacherLoggedIn = Boolean(teacherToken);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      isTeacherLoggedIn
                        ? `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                        : `<li><span class="participant-email">${email}</span></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!teacherToken) {
      showMessage("Only logged-in teachers can unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Teacher-Token": teacherToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacherToken) {
      showMessage("Only logged-in teachers can register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Teacher-Token": teacherToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuBtn.addEventListener("click", () => {
    authDropdown.classList.toggle("hidden");
  });

  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    authDropdown.classList.add("hidden");
  });

  cancelLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        teacherToken = result.token;
        teacherUsername = result.username;
        localStorage.setItem("teacherToken", teacherToken);
        updateAuthUI();
        fetchActivities();
        loginModal.classList.add("hidden");
        loginForm.reset();
        showMessage("Logged in as teacher.", "success");
      } else {
        showMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "X-Teacher-Token": teacherToken,
        },
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    teacherToken = "";
    teacherUsername = "";
    localStorage.removeItem("teacherToken");
    updateAuthUI();
    fetchActivities();
    showMessage("Logged out.", "info");
    authDropdown.classList.add("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".auth-menu")) {
      authDropdown.classList.add("hidden");
    }
  });

  // Initialize app
  validateExistingSession().then(fetchActivities);
});
