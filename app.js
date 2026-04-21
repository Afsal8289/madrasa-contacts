import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { initializeFirestore, persistentLocalCache, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC0ShWac2iBgbPswit4YAm2z4XvJrRd0bY",
    authDomain: "madrasa-contacts.firebaseapp.com",
    projectId: "madrasa-contacts",
    storageBucket: "madrasa-contacts.firebasestorage.app",
    messagingSenderId: "69984825841",
    appId: "1:69984825841:web:23dfec09e4a16bd6af5450"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

const isLoginPage = document.getElementById('loginForm') !== null;
const madrasaId = localStorage.getItem("loggedInMadrasa");

if (isLoginPage) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('madrasaId').value;
        const pass = document.getElementById('password').value;
        const errorMsg = document.getElementById('loginError');

        try {
            const docSnap = await getDoc(doc(db, "madrasas", id));
            if (docSnap.exists() && docSnap.data().password === pass) {
                localStorage.setItem("loggedInMadrasa", id);
                window.location.href = "dashboard.html";
            } else {
                errorMsg.style.display = "block";
            }
        } catch (error) { alert("Database Error!"); }
    });
} else {
    if (!madrasaId) window.location.href = "index.html";
    document.getElementById('displayMadrasaId').innerText = madrasaId;

    async function loadMadrasaDetails() {
        const docSnap = await getDoc(doc(db, "madrasas", madrasaId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('displayMadrasaName').innerText = data.name || "My Madrasa";
            
            let classes = data.classes || [];
            classes.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
            
            const selectors = ['studentClass', 'filterClass', 'ustadClass'];
            selectors.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML = id === 'filterClass' ? '<option value="all">All Classes</option>' : '<option value="" disabled selected>Select Class</option>';
                    classes.forEach(cls => {
                        el.innerHTML += `<option value="${cls}">${cls}</option>`;
                    });
                }
            });
        }
    }
    loadMadrasaDetails();

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem("loggedInMadrasa");
        window.location.href = "index.html";
    });

    document.getElementById('updateNameBtn').addEventListener('click', async () => {
        const newName = document.getElementById('newMadrasaName').value;
        if(newName) {
            await updateDoc(doc(db, "madrasas", madrasaId), { name: newName });
            document.getElementById('displayMadrasaName').innerText = newName;
            document.getElementById('newMadrasaName').value = '';
            alert("Name updated!");
        }
    });

    document.getElementById('addClassBtn').addEventListener('click', async () => {
        const newClass = document.getElementById('newClassName').value;
        if(newClass) {
            const docRef = doc(db, "madrasas", madrasaId);
            const docSnap = await getDoc(docRef);
            let classes = docSnap.data().classes || [];
            if(!classes.includes(newClass)) {
                classes.push(newClass);
                await updateDoc(docRef, { classes: classes });
                document.getElementById('newClassName').value = '';
                alert("Class Added!");
                loadMadrasaDetails(); 
            } else { alert("Class already exists!"); }
        }
    });

    // View Students
    document.getElementById('loadStudentsBtn').addEventListener('click', async () => {
        const selectedClass = document.getElementById('filterClass').value;
        const recordsDiv = document.getElementById('recordsTable');
        recordsDiv.innerHTML = 'Loading Students...';

        let q = query(collection(db, "students"), where("madrasaId", "==", madrasaId));
        if (selectedClass !== "all") {
            q = query(collection(db, "students"), where("madrasaId", "==", madrasaId), where("class", "==", selectedClass));
        }

        const querySnapshot = await getDocs(q);
        let html = `<table><tr><th>S.No</th><th>Name</th><th>Contact Number</th><th>WhatsApp Number</th><th class="no-print">Actions</th></tr>`;
        
        let serialNo = 1;
        querySnapshot.forEach((doc) => {
            let s = doc.data();
            html += `<tr>
                    <td>${serialNo++}</td>
                    <td>${s.name}</td>
                    <td>${s.contact}</td>
                    <td>${s.whatsapp}</td>
                    <td class="no-print">
                        <button onclick="editRecord('${doc.id}', '${s.name}', '${s.contact}', 'students')" class="btn-secondary" style="padding:2px 5px;">Edit</button>
                        <button onclick="deleteRecord('${doc.id}', 'students')" class="btn-danger" style="padding:2px 5px;">Del</button>
                    </td>
                </tr>`;
        });
        recordsDiv.innerHTML = (serialNo > 1) ? html + `</table>` : '<p>No students found.</p>';
    });

    // View Ustads
    document.getElementById('loadUstadsBtn').addEventListener('click', async () => {
        const recordsDiv = document.getElementById('recordsTable');
        recordsDiv.innerHTML = 'Loading Ustads...';
        
        const q = query(collection(db, "ustads"), where("madrasaId", "==", madrasaId));
        const querySnapshot = await getDocs(q);
        
        let html = `<table><tr><th>Class</th><th>Ustad Name</th><th>Contact Number</th><th>WhatsApp Number</th><th class="no-print">Actions</th></tr>`;
        let count = 0;
        querySnapshot.forEach((doc) => {
            let u = doc.data();
            let classNum = u.class ? u.class : "-"; 
            
            html += `<tr>
                <td>${classNum}</td>
                <td>${u.name}</td>
                <td>${u.contact}</td>
                <td>${u.whatsapp}</td>
                <td class="no-print">
                    <button onclick="editRecord('${doc.id}', '${u.name}', '${u.contact}', 'ustads')" class="btn-secondary" style="padding:2px 5px;">Edit</button>
                    <button onclick="deleteRecord('${doc.id}', 'ustads')" class="btn-danger" style="padding:2px 5px;">Del</button>
                </td>
            </tr>`;
            count++;
        });
        recordsDiv.innerHTML = (count > 0) ? html + `</table>` : '<p>No Ustads found.</p>';
    });

    // ==========================================
    // പുതിയതായി ചേർത്ത Bulk Delete ഫംഗ്ഷനുകൾ
    // ==========================================

    // കുട്ടികളെ ഒന്നിച്ച് ഡിലീറ്റ് ചെയ്യാൻ
    document.getElementById('deleteAllStudentsBtn').addEventListener('click', async () => {
        const selectedClass = document.getElementById('filterClass').value;
        const msg = selectedClass === "all" ? 
            "WARNING: Are you sure you want to delete ALL STUDENTS in this Madrasa? This cannot be undone!" : 
            `Are you sure you want to delete ALL STUDENTS in ${selectedClass}? This cannot be undone!`;

        if(confirm(msg)) {
            // കൂടുതൽ സുരക്ഷയ്ക്ക് വേണ്ടി DELETE എന്ന് ടൈപ്പ് ചെയ്യാൻ പറയുന്നു
            const verify = prompt('Please type "DELETE" (in capital letters) to confirm:');
            if(verify === "DELETE") {
                document.getElementById('recordsTable').innerHTML = 'Deleting please wait...';
                
                let q = query(collection(db, "students"), where("madrasaId", "==", madrasaId));
                if (selectedClass !== "all") {
                    q = query(collection(db, "students"), where("madrasaId", "==", madrasaId), where("class", "==", selectedClass));
                }
                
                const querySnapshot = await getDocs(q);
                let count = 0;
                const deletePromises = [];
                
                querySnapshot.forEach((d) => {
                    deletePromises.push(deleteDoc(doc(db, "students", d.id)));
                    count++;
                });

                if(count === 0) {
                    alert("No students found to delete!");
                    document.getElementById('recordsTable').innerHTML = '<p>No records found.</p>';
                    return;
                }

                await Promise.all(deletePromises);
                alert(`Successfully deleted ${count} students!`);
                document.getElementById('loadStudentsBtn').click(); // ടേബിൾ റീഫ്രഷ് ചെയ്യുന്നു
            } else {
                alert("Incorrect word typed. Deletion cancelled.");
            }
        }
    });

    // ഉസ്താദുമാരെ ഒന്നിച്ച് ഡിലീറ്റ് ചെയ്യാൻ
    document.getElementById('deleteAllUstadsBtn').addEventListener('click', async () => {
        if(confirm("WARNING: Are you sure you want to delete ALL USTADS? This cannot be undone!")) {
            const verify = prompt('Please type "DELETE" (in capital letters) to confirm:');
            if(verify === "DELETE") {
                document.getElementById('recordsTable').innerHTML = 'Deleting please wait...';
                
                const q = query(collection(db, "ustads"), where("madrasaId", "==", madrasaId));
                const querySnapshot = await getDocs(q);
                let count = 0;
                const deletePromises = [];
                
                querySnapshot.forEach((d) => {
                    deletePromises.push(deleteDoc(doc(db, "ustads", d.id)));
                    count++;
                });

                if(count === 0) {
                    alert("No Ustads found to delete!");
                    document.getElementById('recordsTable').innerHTML = '<p>No records found.</p>';
                    return;
                }

                await Promise.all(deletePromises);
                alert(`Successfully deleted ${count} Ustads!`);
                document.getElementById('loadUstadsBtn').click(); // ടേബിൾ റീഫ്രഷ് ചെയ്യുന്നു
            } else {
                alert("Incorrect word typed. Deletion cancelled.");
            }
        }
    });

    // ==========================================

    function generatePDF(filename, subHeader) {
        const recordsDiv = document.getElementById('recordsTable');
        if(recordsDiv.innerText.includes("Loading") || recordsDiv.innerText.includes("Click") || recordsDiv.innerText.includes("No ")) {
            alert("Please load the data first by clicking 'View' button.");
            return;
        }

        const madrasaName = document.getElementById('displayMadrasaName').innerText;
        document.getElementById('pdfMadrasaName').innerText = madrasaName;
        document.getElementById('pdfClassName').innerText = subHeader;
        
        const element = document.getElementById('printArea');
        const header = document.getElementById('pdfHeader');
        
        header.style.display = 'block'; 
        const noPrintElements = element.querySelectorAll('.no-print');
        noPrintElements.forEach(el => el.style.display = 'none');
        
        window.scrollTo(0,0); 

        const opt = {
            margin: 0.5,
            filename: filename,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        setTimeout(() => {
            html2pdf().set(opt).from(element).save().then(() => {
                header.style.display = 'none';
                noPrintElements.forEach(el => el.style.display = '');
            });
        }, 300);
    }

    document.getElementById('pdfStudentsBtn').addEventListener('click', () => {
        const selectedClass = document.getElementById('filterClass').value;
        const subTitle = selectedClass === "all" ? "Students List (All Classes)" : "Class: " + selectedClass;
        generatePDF(`${selectedClass}_Students.pdf`, subTitle);
    });

    document.getElementById('pdfUstadsBtn').addEventListener('click', () => {
        generatePDF(`Ustads_List.pdf`, "Ustads List");
    });

    document.getElementById('studentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "students"), {
            madrasaId: madrasaId,
            name: document.getElementById('studentName').value,
            class: document.getElementById('studentClass').value,
            contact: document.getElementById('studentContact').value,
            whatsapp: document.getElementById('studentWhatsapp').value,
            timestamp: new Date()
        });
        document.getElementById('studentForm').reset();
        alert("Student added!");
    });

    document.getElementById('ustadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "ustads"), {
            madrasaId: madrasaId,
            name: document.getElementById('ustadName').value,
            class: document.getElementById('ustadClass').value, 
            contact: document.getElementById('ustadContact').value,
            whatsapp: document.getElementById('ustadWhatsapp').value,
            timestamp: new Date()
        });
        document.getElementById('ustadForm').reset();
        alert("Ustad added!");
    });
}

window.deleteRecord = async (id, type) => {
    if(confirm("Are you sure?")) {
        await deleteDoc(doc(db, type, id));
        type === 'students' ? document.getElementById('loadStudentsBtn').click() : document.getElementById('loadUstadsBtn').click();
    }
};

window.editRecord = async (id, currentName, currentContact, type) => {
    const newName = prompt("Edit Name:", currentName);
    const newContact = prompt("Edit Contact:", currentContact);
    if(newName && newContact) {
        await updateDoc(doc(db, type, id), { name: newName, contact: newContact });
        type === 'students' ? document.getElementById('loadStudentsBtn').click() : document.getElementById('loadUstadsBtn').click();
    }
};