// ------------------- ADMIN CREDENTIALS -------------------
const adminCredentials = { username: "admin", password: "Admin@123" };

// ------------------- DATA -------------------
let modules = JSON.parse(localStorage.getItem("modules")) || [
  { name: "Math 101", code: "MTH101", description: "Basic Math" },
  { name: "ICT Fundamentals", code: "ICT101", description: "Intro to ICT" }
];

// ------------------- STUDENTS -------------------
function getStudents() {
  try {
    return JSON.parse(localStorage.getItem("students")) || [];
  } catch (e) {
    console.error("Error loading students:", e);
    return [];
  }
}

function saveStudents(students) {
  try {
    localStorage.setItem("students", JSON.stringify(students));
    console.log("Students saved successfully:", students);
  } catch (e) {
    console.error("Error saving students:", e);
  }
}

// ------------------- LECTURERS -------------------
function getLecturers() {
  try {
    const lecturers = JSON.parse(localStorage.getItem("lecturers")) || [];
    console.log("Lecturers loaded:", lecturers);
    return lecturers;
  } catch (e) {
    console.error("Error loading lecturers:", e);
    return [];
  }
}

function saveLecturers(lecturers) {
  try {
    localStorage.setItem("lecturers", JSON.stringify(lecturers));
    console.log("Lecturers saved successfully:", lecturers);
  } catch (e) {
    console.error("Error saving lecturers:", e);
  }
}

// ------------------- SAVE MODULES -------------------
function saveModules() {
  try {
    localStorage.setItem("modules", JSON.stringify(modules));
    console.log("Modules saved successfully:", modules);
  } catch (e) {
    console.error("Error saving modules:", e);
  }
}

// ------------------- STUDENT MODULE SELECT -------------------
document.addEventListener("DOMContentLoaded", function() {
  const moduleSelect = document.getElementById("studentModule");
  if (moduleSelect) {
    moduleSelect.innerHTML = '<option value="">Select Module</option>';
    modules.forEach(mod => {
      const option = document.createElement("option");
      option.value = mod.name;
      option.textContent = mod.name;
      moduleSelect.appendChild(option);
    });
  }
});

// ------------------- STUDENT REGISTRATION -------------------
function registerFace() {
  const name = document.getElementById('studentName').value.trim();
  const studentNo = document.getElementById('studentNo').value.trim();
  const email = document.getElementById('studentEmail').value.trim();
  const module = document.getElementById('studentModule').value;

  if (!name || !studentNo || !email || !module) {
    alert("Please fill in all fields!");
    return;
  }

  localStorage.setItem('currentStudent', JSON.stringify({ name, studentNo, email, module }));
  window.location.href = 'register.html';
}

// ------------------- LECTURER REGISTRATION -------------------
document.addEventListener("DOMContentLoaded", function() {
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", function(e) {
      e.preventDefault();

      const fullName = document.getElementById("fullname").value.trim();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const confirmPassword = document.getElementById("confirmPassword").value.trim();

      if (!fullName || !username || !password || !confirmPassword) {
        alert("⚠️ Please fill in all fields!");
        return;
      }
      
      if (password !== confirmPassword) {
        alert("⚠️ Passwords do not match!");
        return;
      }

      const lecturers = getLecturers();
      
      // Check if lecturer already exists
      if (lecturers.some(l => l.username === username)) {
        alert("⚠️ A lecturer with this username already exists!");
        return;
      }

      // Create new lecturer object
      const newLecturer = {
        fullName: fullName,
        username: username,
        password: password,
        modulesAssigned: []
      };

      // Add to lecturers array
      lecturers.push(newLecturer);
      
      // Save to localStorage
      saveLecturers(lecturers);

      alert("✅ Lecturer registered successfully!");
      
      // Clear form
      registerForm.reset();
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    });
  }
});

// ------------------- LOGIN -------------------
document.addEventListener("DOMContentLoaded", function() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function(e) {
      e.preventDefault();
      
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const role = document.getElementById("role").value;

      if (!role) {
        alert("Please select a role!");
        return;
      }

      if (role === "admin") {
        if (username === adminCredentials.username && password === adminCredentials.password) {
          sessionStorage.setItem("userRole", "admin");
          window.location.href = "admin.html";
        } else {
          alert("Invalid admin credentials!");
        }
      } else if (role === "lecturer") {
        const lecturers = getLecturers();
        const user = lecturers.find(l => l.username === username && l.password === password);
        if (user) {
          sessionStorage.setItem("lecturerName", user.fullName);
          sessionStorage.setItem("userRole", "lecturer");
          window.location.href = "lecturer.html";
        } else {
          alert("Invalid lecturer credentials!");
        }
      }
    });
  }
});

// ------------------- MODULE CREATION -------------------
document.addEventListener("DOMContentLoaded", function() {
  const createModuleForm = document.getElementById("createModuleForm");
  const modulesTable = document.getElementById("modulesTable")?.querySelector("tbody");

  function renderModules() {
    if (!modulesTable) return;
    modulesTable.innerHTML = "";
    modules.forEach(mod => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${mod.name}</td><td>${mod.code || "-"}</td><td>${mod.description || "-"}</td>`;
      modulesTable.appendChild(row);
    });
  }

  // Initial render
  renderModules();

  if (createModuleForm) {
    createModuleForm.addEventListener("submit", function(e) {
      e.preventDefault();
      
      const moduleName = document.getElementById("moduleName").value.trim();
      const moduleCode = document.getElementById("moduleCode").value.trim();
      const description = document.getElementById("description").value.trim();

      if (!moduleName) {
        alert("Module name is required!");
        return;
      }

      modules.push({ name: moduleName, code: moduleCode, description });
      saveModules();
      renderModules();
      createModuleForm.reset();
      alert("Module created successfully!");
    });
  }
});

// ------------------- MANAGE USERS -------------------
document.addEventListener("DOMContentLoaded", function() {
  const studentsTableBody = document.querySelector("#studentsTable tbody");
  const lecturersTableBody = document.querySelector("#lecturersTable tbody");

  function getLecturerForModule(moduleName) {
    const lecturers = getLecturers();
    const lecturer = lecturers.find(l => l.modulesAssigned?.includes(moduleName));
    return lecturer ? lecturer.fullName : "Unassigned";
  }

  function renderStudents() {
    if (!studentsTableBody) return;
    
    const students = getStudents();
    studentsTableBody.innerHTML = "";
    
    if (students.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="6" style="text-align: center; color: #666;">No students registered</td>';
      studentsTableBody.appendChild(tr);
      return;
    }
    
    students.forEach((s, index) => {
      const lecturerNames = Array.isArray(s.modules) ? 
        s.modules.map(m => getLecturerForModule(m)).join(", ") : 
        "No modules";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td>${s.studentNo}</td>
        <td>${s.email}</td>
        <td>${Array.isArray(s.modules) ? s.modules.join(", ") : "No modules"}</td>
        <td>${lecturerNames}</td>
        <td>
          <button onclick="deleteStudent(${index})" class="btn delete-btn">Delete</button>
        </td>`;
      studentsTableBody.appendChild(tr);
    });
  }

  function renderLecturers() {
    if (!lecturersTableBody) return;
    
    const lecturers = getLecturers();
    console.log("Rendering lecturers:", lecturers); // Debug log
    
    lecturersTableBody.innerHTML = "";
    
    if (lecturers.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="3" style="text-align: center; color: #666;">No lecturers registered</td>';
      lecturersTableBody.appendChild(tr);
      return;
    }
    
    lecturers.forEach((l, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.fullName}</td>
        <td>${Array.isArray(l.modulesAssigned) && l.modulesAssigned.length > 0 ? l.modulesAssigned.join(", ") : "None"}</td>
        <td>
          <button onclick="openAssignModules(${index})" class="btn">Assign Modules</button>
          <button onclick="deleteLecturer(${index})" class="btn delete-btn">Delete</button>
        </td>`;
      lecturersTableBody.appendChild(tr);
    });
  }

  // Make functions globally available
  window.deleteStudent = function(index) {
    const students = getStudents();
    if (confirm("Are you sure you want to delete this student?")) {
      students.splice(index, 1);
      saveStudents(students);
      renderStudents();
    }
  };

  window.deleteLecturer = function(index) {
    const lecturers = getLecturers();
    if (confirm("Are you sure you want to delete this lecturer?")) {
      lecturers.splice(index, 1);
      saveLecturers(lecturers);
      renderLecturers();
    }
  };

  window.openAssignModules = function(index) {
    const modal = document.getElementById("assignModal");
    const checkboxContainer = document.getElementById("moduleCheckboxes");
    const saveBtn = document.getElementById("confirmAssign");

    if (!modal || !checkboxContainer || !saveBtn) return;

    const lecturers = getLecturers();
    const lecturer = lecturers[index];

    checkboxContainer.innerHTML = "";
    modules.forEach(mod => {
      const isChecked = Array.isArray(lecturer.modulesAssigned) && lecturer.modulesAssigned.includes(mod.name);
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" value="${mod.name}" ${isChecked ? "checked" : ""}> ${mod.name}`;
      checkboxContainer.appendChild(label);
    });

    saveBtn.onclick = function() {
      const selected = Array.from(checkboxContainer.querySelectorAll("input:checked")).map(el => el.value);
      lecturer.modulesAssigned = selected;
      lecturers[index] = lecturer;
      saveLecturers(lecturers);
      modal.style.display = "none";
      renderLecturers();
      renderStudents();
      alert("Modules assigned successfully!");
    };

    modal.style.display = "block";
  };

  // Close modal handlers
  const cancelBtn = document.getElementById("cancelAssign");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function() {
      const modal = document.getElementById("assignModal");
      if (modal) modal.style.display = "none";
    });
  }

  // Close modal when clicking outside
  window.addEventListener("click", function(event) {
    const modal = document.getElementById("assignModal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Initial render
  renderStudents();
  renderLecturers();
});

// ------------------- START SESSION -------------------
document.addEventListener("DOMContentLoaded", function() {
  const startSessionForm = document.getElementById("startSessionForm");
  const moduleSelectElement = document.getElementById("moduleSelect");

  if (moduleSelectElement) {
    const lecturerName = sessionStorage.getItem("lecturerName");
    const lecturers = getLecturers();
    const lecturer = lecturers.find(l => l.fullName === lecturerName);

    moduleSelectElement.innerHTML = '<option value="">Select Module</option>';
    if (lecturer && Array.isArray(lecturer.modulesAssigned)) {
      lecturer.modulesAssigned.forEach(mod => {
        const option = document.createElement("option");
        option.value = mod;
        option.textContent = mod;
        moduleSelectElement.appendChild(option);
      });
    }
  }

  if (startSessionForm) {
    startSessionForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const selectedModule = moduleSelectElement.value;
      if (!selectedModule) {
        alert("Please select a module to start the session.");
        return;
      }
      sessionStorage.setItem("currentModule", selectedModule);
      window.location.href = "face_recognition.html";
    });
  }
});