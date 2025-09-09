// frontend/app.js - FIXED VERSION

const API_BASE = "http://localhost:3000/api";
const adminCredentials = { username: "admin", password: "Admin@123" };

// Face-api models loaded flag
let modelsLoaded = false;

/* ------------------- GENERIC API CALL ------------------- */
async function makeAPIRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", "Accept": "application/json", ...options.headers },
      ...options
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    alert(error.message.includes("fetch") ? "⚠️ Cannot connect to backend." : error.message);
    throw error;
  }
}

/* ------------------- FACE-API INITIALIZATION ------------------- */
async function loadFaceApiModels() {
  try {
    console.log("Loading face-api models...");
    const statusElement = document.getElementById("status");
    if (statusElement) statusElement.textContent = "Loading face recognition models...";
    
    // Load models from CDN
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights');
    await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights');
    await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights');
    
    modelsLoaded = true;
    console.log("Face-api models loaded successfully");
    if (statusElement) statusElement.textContent = "Models loaded! Starting camera...";
    return true;
  } catch (error) {
    console.error("Error loading face-api models:", error);
    const statusElement = document.getElementById("status");
    if (statusElement) statusElement.textContent = "Error loading models. Please refresh the page.";
    return false;
  }
}

/* ------------------- CAMERA INITIALIZATION ------------------- */
async function initializeCamera() {
  try {
    const video = document.getElementById("videoElement") || document.getElementById("video");
    if (!video) {
      console.error("Video element not found");
      return false;
    }

    console.log("Requesting camera access...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: 640, 
        height: 480,
        facingMode: 'user'
      }
    });
    
    video.srcObject = stream;
    video.play();
    
    console.log("Camera initialized successfully");
    const statusElement = document.getElementById("status");
    if (statusElement) statusElement.textContent = "Camera ready! Position your face in the frame.";
    
    return true;
  } catch (error) {
    console.error("Error accessing camera:", error);
    const statusElement = document.getElementById("status");
    if (statusElement) {
      if (error.name === 'NotAllowedError') {
        statusElement.textContent = "Camera access denied. Please allow camera access and refresh.";
      } else if (error.name === 'NotFoundError') {
        statusElement.textContent = "No camera found. Please connect a camera and refresh.";
      } else {
        statusElement.textContent = "Error accessing camera. Please check your camera settings.";
      }
    }
    return false;
  }
}

/* ------------------- STUDENT REGISTRATION ------------------- */
async function registerStudent(e) {
  if (e) e.preventDefault();
  const name = document.getElementById("studentName").value.trim();
  const studentNo = document.getElementById("studentNo").value.trim();
  const email = document.getElementById("studentEmail").value.trim();
  const module = document.getElementById("studentModule").value;

  if (!name || !studentNo || !email || !module) return alert("Please fill in all fields!");

  try {
    const student = await makeAPIRequest(`${API_BASE}/students`, {
      method: "POST",
      body: JSON.stringify({ name, studentNo, email, modules: [module], face: null })
    });
    sessionStorage.setItem("currentStudentId", student.id);
    alert("✅ Student registered! Proceed to capture face.");
    window.location.href = "register.html"; // page where face capture happens
  } catch (error) {
    console.error("Student registration error:", error);
  }
}

/* ------------------- FACE CAPTURE (FIXED) ------------------- */
// Enhanced face capture function with debug info
async function captureFaceWithDebug() {
  const studentId = sessionStorage.getItem("currentStudentId");
  if (!studentId) return alert("No student selected. Please register first.");
  
  if (!modelsLoaded) {
    alert("Face recognition models are still loading. Please wait...");
    return;
  }
  
  const video = document.getElementById("videoElement") || document.getElementById("video");
  if (!video || !video.videoWidth) {
    alert("Camera not ready. Please wait for camera to initialize.");
    return;
  }

  try {
    console.log("=== FACE CAPTURE DEBUG START ===");
    const statusElement = document.getElementById("status");
    if (statusElement) statusElement.textContent = "Detecting face and generating descriptor...";
    
    // Try multiple detection attempts with different parameters
    const detectionAttempts = [
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }),
      new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
    ];
    
    let detection = null;
    let usedOptions = null;
    
    for (let i = 0; i < detectionAttempts.length; i++) {
      console.log(`Attempt ${i + 1} with options:`, detectionAttempts[i]);
      
      detection = await faceapi.detectSingleFace(video, detectionAttempts[i])
        .withFaceLandmarks()
        .withFaceDescriptor();
        
      if (detection) {
        usedOptions = detectionAttempts[i];
        console.log(`Success with attempt ${i + 1}`);
        break;
      }
    }
    
    if (!detection) {
      alert("No face detected with any settings. Please ensure good lighting and face is clearly visible.");
      if (statusElement) statusElement.textContent = "No face detected. Please position your face in the frame.";
      return;
    }

    console.log("Face detection successful:", {
      detectionScore: detection.detection.score,
      boxSize: detection.detection.box,
      landmarkCount: detection.landmarks ? detection.landmarks.positions.length : 0,
      descriptorLength: detection.descriptor ? detection.descriptor.length : 0,
      usedOptions: usedOptions
    });

    // Analyze descriptor quality
    const descriptor = Array.from(detection.descriptor);
    const descriptorStats = {
      length: descriptor.length,
      min: Math.min(...descriptor),
      max: Math.max(...descriptor),
      average: descriptor.reduce((a, b) => a + b, 0) / descriptor.length,
      standardDeviation: Math.sqrt(descriptor.reduce((a, b) => a + (b - (descriptor.reduce((c, d) => c + d, 0) / descriptor.length))**2, 0) / descriptor.length)
    };
    
    console.log("Descriptor statistics:", descriptorStats);
    
    // Check for potential issues
    if (descriptorStats.standardDeviation < 0.1) {
      console.warn("Low descriptor variance - might indicate poor quality detection");
    }
    
    if (detection.detection.score < 0.8) {
      console.warn("Low detection confidence:", detection.detection.score);
    }

    if (statusElement) statusElement.textContent = "Face detected! Capturing image and generating descriptor...";

    // Create canvas for face capture with better quality
    const { x, y, width, height } = detection.detection.box;
    const canvas = document.createElement("canvas");
    const padding = 20; // Add some padding around the face
    canvas.width = width + (padding * 2);
    canvas.height = height + (padding * 2);
    const ctx = canvas.getContext("2d");
    
    // Draw with padding
    ctx.drawImage(video, 
      Math.max(0, x - padding), Math.max(0, y - padding), width + (padding * 2), height + (padding * 2),
      0, 0, canvas.width, canvas.height
    );
    
    const imageData = canvas.toDataURL("image/png", 0.9); // High quality

    // Get existing student data first
    const existingStudent = await makeAPIRequest(`${API_BASE}/students/${studentId}`);
    
    console.log("Saving enhanced face data...");
    
    // Save face data with descriptor and debug info
    const updateData = {
      name: existingStudent.name,
      studentNo: existingStudent.studentNo,
      email: existingStudent.email,
      modules: existingStudent.modules,
      face: imageData,
      descriptor: descriptor,
      // Add debug metadata
      captureMetadata: {
        timestamp: new Date().toISOString(),
        detectionScore: detection.detection.score,
        descriptorStats: descriptorStats,
        captureConditions: {
          lighting: 'unknown', // Could be determined programmatically
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          usedOptions: usedOptions
        }
      }
    };
    
    await makeAPIRequest(`${API_BASE}/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(updateData)
    });
    
    console.log("=== FACE CAPTURE DEBUG END ===");
    console.log("Capture successful with descriptor length:", descriptor.length);
    
    alert("✅ Face captured successfully with debug info!");
    if (statusElement) statusElement.textContent = "Face and descriptor captured successfully!";
    sessionStorage.removeItem("currentStudentId");
    setTimeout(() => {
      window.location.href = "manage_users.html";
    }, 1500);
    
  } catch (error) {
    console.error("=== FACE CAPTURE ERROR ===", error);
    alert("Error capturing face. Check console for details.");
    const statusElement = document.getElementById("status");
    if (statusElement) statusElement.textContent = "Error capturing face. Please try again.";
  }
}

// You can replace the regular captureFace function with this enhanced version
// by changing the function name in your HTML onclick handlers

/* ------------------- LECTURER REGISTRATION ------------------- */
async function registerLecturer(e) {
  e.preventDefault();
  const fullName = document.getElementById("fullname").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (!fullName || !username || !password || !confirmPassword) return alert("Fill all fields!");
  if (password !== confirmPassword) return alert("Passwords do not match!");

  try {
    await makeAPIRequest(`${API_BASE}/lecturers`, {
      method: "POST",
      body: JSON.stringify({ fullName, username, password })
    });
    alert("✅ Lecturer registered successfully!");
    document.getElementById("registerForm").reset();
    setTimeout(() => window.location.href = "index.html", 500);
  } catch (error) {
    console.error("Lecturer registration error:", error);
  }
}

/* ------------------- LOGIN (FIXED) ------------------- */
async function loginUser(e) {
  if (e) e.preventDefault();
  
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  if (!username || !password) {
    alert("Please enter username and password!");
    return;
  }

  if (!role) {
    alert("Please select a role!");
    return;
  }

  try {
    if (role === "admin") {
      if (username === adminCredentials.username && password === adminCredentials.password) {
        sessionStorage.setItem("userRole", "admin");
        sessionStorage.setItem("username", username);
        console.log("Admin login successful");
        window.location.href = "admin.html";
        return;
      } else {
        alert("Invalid admin credentials!");
        return;
      }
    } else if (role === "lecturer") {
      console.log("Attempting lecturer login for:", username);
      
      const lecturer = await makeAPIRequest(`${API_BASE}/lecturers/login`, {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      
      console.log("Lecturer login successful:", lecturer);
      sessionStorage.setItem("lecturerName", lecturer.fullName);
      sessionStorage.setItem("userRole", "lecturer");
      sessionStorage.setItem("username", username);
      window.location.href = "lecturer.html";
      return;
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed: " + error.message);
  }
}

/* ------------------- MODULE MANAGEMENT ------------------- */
async function createModule(e) {
  e.preventDefault();
  const name = document.getElementById("moduleName").value.trim();
  const code = document.getElementById("moduleCode").value.trim();
  const description = document.getElementById("description").value.trim();
  if (!name) return alert("Module name required.");

  try {
    await makeAPIRequest(`${API_BASE}/modules`, {
      method: "POST",
      body: JSON.stringify({ name, code, description })
    });
    alert("✅ Module created successfully!");
    e.target.reset();
    renderModules();
  } catch (error) {
    console.error("Module creation error:", error);
  }
}

async function renderModules() {
  try {
    const modules = await makeAPIRequest(`${API_BASE}/modules`);
    const table = document.querySelector("#modulesTable tbody");
    if (!table) return;
    
    table.innerHTML = "";
    modules.forEach(m => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.name || 'Unnamed Module'}</td>
        <td>${m.code || "-"}</td>
        <td>${m.description || "-"}</td>
      `;
      table.appendChild(tr);
    });

    // Also populate module dropdowns if they exist
    const moduleSelects = document.querySelectorAll('select[id*="module"], select[id*="Module"]');
    moduleSelects.forEach(select => {
      if (select.id === 'studentModule' || select.id === 'moduleSelect') {
        // Clear existing options except the first placeholder
        const firstOption = select.firstElementChild;
        select.innerHTML = '';
        if (firstOption && firstOption.value === '') {
          select.appendChild(firstOption);
        } else {
          const placeholderOption = document.createElement('option');
          placeholderOption.value = '';
          placeholderOption.textContent = 'Select Module';
          select.appendChild(placeholderOption);
        }
        
        // Add module options
        modules.forEach(module => {
          const option = document.createElement('option');
          option.value = module.name;
          option.textContent = `${module.name} ${module.code ? '(' + module.code + ')' : ''}`;
          select.appendChild(option);
        });
      }
    });
  } catch (error) {
    console.error("Error rendering modules:", error);
  }
}

/* ------------------- MANAGE STUDENTS ------------------- */
async function renderStudents() {
  try {
    const students = await makeAPIRequest(`${API_BASE}/students`);
    console.log("Raw students data:", students);
    
    const table = document.querySelector("#studentsTable tbody");
    if (!table) return;
    
    table.innerHTML = "";
    students.forEach(s => {
      console.log("Processing student:", s);
      
      // Fix module display
      let modules = "None";
      if (s.modules) {
        if (Array.isArray(s.modules)) {
          modules = s.modules.length > 0 ? s.modules.join(", ") : "None";
        } else if (typeof s.modules === 'string') {
          modules = s.modules;
        } else if (typeof s.modules === 'object') {
          if (s.modules.name) {
            modules = s.modules.name;
          } else if (Object.keys(s.modules).length > 0) {
            modules = Object.values(s.modules).join(", ");
          } else {
            modules = "Object Error";
          }
        }
      }
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name || 'N/A'}</td>
        <td>${s.studentNo || 'N/A'}</td>
        <td>${s.email || 'N/A'}</td>
        <td>${modules}</td>
        <td>${s.descriptor && s.descriptor.length > 0 ? 'Registered' : 'Not Registered'}</td>
        <td><button onclick="deleteStudent(${s.id})" class="btn delete-btn">Delete</button></td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error("Error rendering students:", error);
  }
}

async function deleteStudent(id) {
  if (!confirm("Delete this student?")) return;
  try {
    await makeAPIRequest(`${API_BASE}/students/${id}`, { method: "DELETE" });
    renderStudents();
  } catch (error) {
    console.error("Error deleting student:", error);
  }
}

/* ------------------- MANAGE LECTURERS ------------------- */
async function renderLecturers() {
  try {
    const lecturers = await makeAPIRequest(`${API_BASE}/lecturers`);
    const table = document.querySelector("#lecturersTable tbody");
    if (!table) return;
    
    table.innerHTML = "";
    lecturers.forEach(l => {
      // Fix module display for lecturers too
      let modules = "None";
      if (l.modules) {
        if (Array.isArray(l.modules)) {
          modules = l.modules.length > 0 ? l.modules.join(", ") : "None";
        } else if (typeof l.modules === 'string') {
          modules = l.modules;
        } else {
          console.log("Lecturer module data type issue:", typeof l.modules, l.modules);
          modules = "Data Error";
        }
      }
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.fullName || 'N/A'}</td>
        <td>${modules}</td>
        <td>
          <button onclick="openAssignModules(${l.id})" class="btn">Assign Modules</button>
          <button onclick="deleteLecturer(${l.id})" class="btn delete-btn">Delete</button>
        </td>
      `;
      table.appendChild(tr);
    });
  } catch (error) {
    console.error("Error rendering lecturers:", error);
  }
}

async function deleteLecturer(id) {
  if (!confirm("Delete this lecturer?")) return;
  try {
    await makeAPIRequest(`${API_BASE}/lecturers/${id}`, { method: "DELETE" });
    renderLecturers();
  } catch (error) {
    console.error("Error deleting lecturer:", error);
  }
}

/* ------------------- ASSIGN MODULES ------------------- */
let selectedLecturerId = null;

async function openAssignModules(lecturerId) {
  selectedLecturerId = lecturerId;

  try {
    console.log("Loading modules and lecturer data for assignment...");
    const [modules, lecturer] = await Promise.all([
      makeAPIRequest(`${API_BASE}/modules`),
      makeAPIRequest(`${API_BASE}/lecturers/${lecturerId}`)
    ]);

    console.log("Modules loaded:", modules);
    console.log("Lecturer loaded:", lecturer);

    const container = document.getElementById("moduleCheckboxes");
    if (!container) {
      alert("Module assignment interface not found.");
      return;
    }
    
    container.innerHTML = "";

    if (!modules || modules.length === 0) {
      container.innerHTML = "<p>No modules available. Please create modules first.</p>";
    } else {
      modules.forEach(m => {
        const label = document.createElement("label");
        label.style.display = "block";
        label.style.marginBottom = "8px";
        label.style.cursor = "pointer";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = m.name;
        checkbox.style.marginRight = "8px";

        // Check if lecturer already has this module assigned
        let lecturerModules = lecturer.modules_assigned || [];
        if (lecturer.modules) {
          if (Array.isArray(lecturer.modules)) {
            lecturerModules = lecturer.modules.map(mod => {
              if (typeof mod === 'object' && mod.name) {
                return mod.name;
              } else if (typeof mod === 'string') {
                return mod;
              }
              return null;
            }).filter(mod => mod !== null);
          } else if (typeof lecturer.modules === 'string') {
            lecturerModules = [lecturer.modules];
          }
        }
        
        if (lecturerModules.includes(m.name)) {
          checkbox.checked = true;
        }

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(`${m.name} ${m.code ? '(' + m.code + ')' : ''}`));
        container.appendChild(label);
      });
    }

    // Show the modal
    const modal = document.getElementById("assignModal");
    if (modal) {
      modal.style.display = "block";
      console.log("Modal opened successfully");
    } else {
      alert("Assignment modal not found in the page.");
    }
    
  } catch (error) {
    console.error("Error opening assign modules:", error);
    alert("Failed to load modules or lecturer data: " + error.message);
  }
}

function closeAssignModal() {
  const modal = document.getElementById("assignModal");
  if (modal) {
    modal.style.display = "none";
  }
  selectedLecturerId = null;
}

async function saveAssignedModules() {
  if (!selectedLecturerId) {
    alert("No lecturer selected.");
    return;
  }
  
  const checkboxes = document.querySelectorAll("#moduleCheckboxes input[type='checkbox']:checked");
  const selectedModules = Array.from(checkboxes).map(cb => cb.value);

  try {
    await makeAPIRequest(`${API_BASE}/lecturers/${selectedLecturerId}`, {
      method: "PUT",
      body: JSON.stringify({ modules: selectedModules })
    });
    alert("✅ Modules assigned successfully!");
    closeAssignModal();
    renderLecturers();
  } catch (error) {
    console.error("Error saving assigned modules:", error);
    alert("Failed to assign modules: " + error.message);
  }
}

/* ------------------- SESSION ------------------- */
function startSession(e) {
  e.preventDefault();
  const module = document.getElementById("moduleSelect").value;
  if (!module) return alert("Select a module.");
  sessionStorage.setItem("currentModule", module);
  window.location.href = "face_recognition.html";
}

/* ------------------- PAGE-SPECIFIC INITIALIZATION ------------------- */
async function initializePage() {
  const currentPage = window.location.pathname.split('/').pop();
  
  console.log("Initializing page:", currentPage);
  
  // Initialize face capture page
  if (currentPage === 'register.html' && document.getElementById("videoElement")) {
    console.log("Initializing face capture page...");
    const success = await loadFaceApiModels();
    if (success) {
      await initializeCamera();
    }
  }
  
  // Load data for relevant pages
  if (document.querySelector("#modulesTable") || document.querySelector('select[id*="module"]')) {
    await renderModules();
  }
  
  if (document.querySelector("#studentsTable")) {
    await renderStudents();
  }
  
  if (document.querySelector("#lecturersTable")) {
    await renderLecturers();
  }
}

/* ------------------- EVENT LISTENERS ------------------- */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM loaded, setting up event listeners...");
  
  // Form event listeners
  const registerForm = document.getElementById("registerForm");
  if (registerForm) registerForm.addEventListener("submit", registerLecturer);
  
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", loginUser);
  
  const createModuleForm = document.getElementById("createModuleForm");
  if (createModuleForm) createModuleForm.addEventListener("submit", createModule);
  
  const studentRegForm = document.getElementById("studentRegForm");
  if (studentRegForm) studentRegForm.addEventListener("submit", registerStudent);
  
  const sessionForm = document.getElementById("sessionForm");
  if (sessionForm) sessionForm.addEventListener("submit", startSession);
  
  // Face capture button
  const captureBtn = document.getElementById("captureBtn");
  if (captureBtn) captureBtn.addEventListener("click", captureFace);
  
  // Modal close handlers
  const closeButtons = document.querySelectorAll('[onclick*="closeAssignModal"]');
  closeButtons.forEach(btn => {
    btn.addEventListener("click", closeAssignModal);
  });
  
  // Window click to close modal
  window.addEventListener("click", function(event) {
    const modal = document.getElementById("assignModal");
    if (event.target === modal) {
      closeAssignModal();
    }
  });
  
  // Initialize page-specific functionality
  await initializePage();
});

// Global functions for HTML onclick handlers
window.deleteStudent = deleteStudent;
window.deleteLecturer = deleteLecturer;
window.openAssignModules = openAssignModules;
window.closeAssignModal = closeAssignModal;
window.saveAssignedModules = saveAssignedModules;
window.captureFace = captureFace;