
const adminCredentials = { username: "admin", password: "Admin@123" };


let modules = JSON.parse(localStorage.getItem("modules")) || [
  { name: "Math 101", code: "MTH101", description: "Basic Math" },
  { name: "ICT Fundamentals", code: "ICT101", description: "Intro to ICT" }
];
let lecturers = JSON.parse(localStorage.getItem("lecturers")) || [];
let students = JSON.parse(localStorage.getItem("students")) || [];

function saveData() {
  localStorage.setItem("modules", JSON.stringify(modules));
  localStorage.setItem("lecturers", JSON.stringify(lecturers));
  localStorage.setItem("students", JSON.stringify(students));
}


const moduleSelect = document.getElementById("studentModule");
if (moduleSelect) {
  moduleSelect.innerHTML = '<option value="">Select Module</option>';
  modules.forEach((mod) => {
    const option = document.createElement("option");
    option.value = mod.name;
    option.textContent = mod.name;
    moduleSelect.appendChild(option);
  });
}


const studentForm = document.getElementById("studentForm");
const successPopup = document.getElementById("successPopup");
const closePopupBtn = document.getElementById("closePopup");
const registerFaceBtn = document.getElementById("registerFaceBtn");

if (studentForm) {
  studentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("studentName").value.trim();
    const studentNo = document.getElementById("studentNo").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const module = document.getElementById("studentModule").value;

    if (!name || !studentNo || !email || !module) {
      alert("Please fill in all fields!");
      return;
    }

    if (students.some((s) => s.studentNo === studentNo)) {
      alert("Student with this number already exists!");
      return;
    }

    students.push({ name, studentNo, email, modules: [module] });
    saveData();

    if (successPopup) successPopup.style.display = "flex";
  });
}

if (closePopupBtn) {
  closePopupBtn.addEventListener("click", () => {
    if (successPopup) successPopup.style.display = "none";
    if (studentForm) studentForm.reset();
  });
}

if (registerFaceBtn) {
  registerFaceBtn.addEventListener("click", () => {
    const name = document.getElementById("studentName").value.trim();
    const studentNo = document.getElementById("studentNo").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const module = document.getElementById("studentModule").value;

    if (!name || !studentNo || !email || !module) {
      alert("Please fill in all fields before registering face!");
      return;
    }

    if (!students.some((s) => s.studentNo === studentNo)) {
      students.push({ name, studentNo, email, modules: [module] });
      saveData();
    }

    window.location.href = "face_recognition.html";
  });
}


const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fullNameInput = document.getElementById("fullname"); // matches HTML ID
    const fullName = fullNameInput ? fullNameInput.value.trim() : "";
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!fullName || !username || !password || !confirmPassword) {
      alert("Please fill in all fields!");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (lecturers.some((l) => l.username === username)) {
      alert("Lecturer with this username already exists!");
      return;
    }
    
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
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
    if (lecturers.some((l) => l.username === username)) {
      alert("⚠️ A lecturer with this username already exists!");
      return;
    }

  
    lecturers.push({ fullName, username, password, modulesAssigned: [] });
    saveData();

  
    const popup = document.createElement("div");
    popup.classList.add("popup");
    popup.innerHTML = `
      <div class="popup-content">
        <h3>✅ Lecturer registered successfully!</h3>
        <p>Redirecting to login...</p>
      </div>
    `;
    document.body.appendChild(popup);
    popup.style.display = "flex";

    
    setTimeout(() => {
      window.location.href = "index.html"; 
    }, 2000);
  });
}


    lecturers.push({ fullName, username, password, modulesAssigned: [] }); 
    saveData();
    alert("Lecturer registered successfully!");
    registerForm.reset();
    window.location.href = "index.html";
  });
}


const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
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
        window.location.href = "admin.html";
      } else {
        alert("Invalid admin credentials!");
      }
    } else if (role === "lecturer") {
      const user = lecturers.find((l) => l.username === username && l.password === password);
      if (user) {
        sessionStorage.setItem("lecturerName", user.fullName); // Save for greeting
        window.location.href = "lecturer.html";
      } else {
        alert("Invalid lecturer credentials!");
      }
    }
  });
}


const createModuleForm = document.getElementById("createModuleForm");
const modulesTable = document.getElementById("modulesTable")?.querySelector("tbody");
const popup = document.getElementById("popup");

function renderModules() {
  if (!modulesTable) return;
  modulesTable.innerHTML = "";
  modules.forEach((mod) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${mod.name}</td>
      <td>${mod.code || "-"}</td>
      <td>${mod.description || "-"}</td>
    `;
    modulesTable.appendChild(row);
  });
}
renderModules();

if (createModuleForm) {
  createModuleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const moduleName = document.getElementById("moduleName").value.trim();
    const moduleCode = document.getElementById("moduleCode").value.trim();
    const description = document.getElementById("description").value.trim();
    if (!moduleName) {
      alert("Module name is required!");
      return;
    }

    const newModule = { name: moduleName, code: moduleCode, description };
    modules.push(newModule);
    saveData();
    renderModules();
    createModuleForm.reset();
    if (popup) popup.style.display = "flex";
  });
}

if (document.getElementById("closePopup")) {
  document.getElementById("closePopup").addEventListener("click", () => {
    if (popup) popup.style.display = "none";
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const studentsTableBody = document.querySelector("#studentsTable tbody");
  const lecturersTableBody = document.querySelector("#lecturersTable tbody");

  function getLecturerForModule(moduleName) {
    const lecturer = lecturers.find((lec) => lec.modulesAssigned?.includes(moduleName));
    return lecturer ? lecturer.fullName : "Unassigned"; // show fullName here
  }

  function renderStudents() {
    if (!studentsTableBody) return;
    studentsTableBody.innerHTML = "";
    students.forEach((s, index) => {
      const lecturerNames = s.modules.map((m) => getLecturerForModule(m)).join(", ");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td>${s.studentNo}</td>
        <td>${s.email}</td>
        <td>${s.modules.join(", ")}</td>
        <td>${lecturerNames}</td>
        <td>
          <button onclick="deleteStudent(${index})" class="btn delete-btn">Delete</button>
        </td>
      `;
      studentsTableBody.appendChild(tr);
    });
  }

  function renderLecturers() {
    if (!lecturersTableBody) return;
    lecturersTableBody.innerHTML = "";
    lecturers.forEach((l, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.fullName}</td>
        <td>${l.modulesAssigned?.join(", ") || "None"}</td>
        <td>
          <button onclick="openAssignModules(${index})" class="btn">Assign Modules</button>
          <button onclick="deleteLecturer(${index})" class="btn delete-btn">Delete</button>
        </td>
      `;
      lecturersTableBody.appendChild(tr);
    });
  }

  window.deleteStudent = (index) => {
    if (confirm("Delete this student?")) {
      students.splice(index, 1);
      saveData();
      renderStudents();
    }
  };

  window.deleteLecturer = (index) => {
    if (confirm("Delete this lecturer?")) {
      lecturers.splice(index, 1);
      saveData();
      renderLecturers();
    }
  };

  window.openAssignModules = (index) => {
    const modal = document.getElementById("assignModal");
    const checkboxContainer = document.getElementById("moduleCheckboxes");
    const saveBtn = document.getElementById("confirmAssign");

    checkboxContainer.innerHTML = "";
    modules.forEach((mod) => {
      const isChecked = lecturers[index].modulesAssigned?.includes(mod.name);
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="checkbox" value="${mod.name}" ${isChecked ? "checked" : ""}>
        ${mod.name}
      `;
      checkboxContainer.appendChild(label);
    });

    saveBtn.onclick = () => {
      const selected = Array.from(
        checkboxContainer.querySelectorAll("input:checked")
      ).map((el) => el.value);
      lecturers[index].modulesAssigned = selected;
      saveData();
      modal.style.display = "none";
      renderLecturers();
      renderStudents();
    };

    modal.style.display = "block";
  };

  document.getElementById("cancelAssign")?.addEventListener("click", () => {
    document.getElementById("assignModal").style.display = "none";
  });

  renderStudents();
  renderLecturers();
});
