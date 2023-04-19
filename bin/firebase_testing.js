import firebase from "firebase/compat/app";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
//import { getAuth } from "firebase/auth";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://support.google.com/firebase/answer/7015592
const firebaseConfig = {
    apiKey: "AIzaSyDwIMuoA52lc04e5-nLWgflKw2nwO1pe3E",
    authDomain: "athena-e6a1b.firebaseapp.com",
    databaseURL: "https://athena-e6a1b-default-rtdb.firebaseio.com",
    projectId: "athena-e6a1b",
    storageBucket: "athena-e6a1b.appspot.com",
    messagingSenderId: "393710869045",
    appId: "1:393710869045:web:8efe705365a228d92faf7c",
    measurementId: "G-427F8MHZPF"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const auth = getAuth(app)
//console.log(auth)

const db = getFirestore(app);


import { collection , getDocs } from "firebase/firestore";

let firebase_data = null;


// const docRef = doc(db, "Questions", "RUWn9A6We8LG27N34yo7");
// const docSnap = await getDoc(docRef);

// if (docSnap.exists()) {
//   console.log("Document data:", docSnap.data());
// } else {
//   // docSnap.data() will be undefined in this case
//   console.log("No such document!");
// }

import { createServer } from "http";
import { Server } from "socket.io";
import { query, where } from "firebase/firestore";
import { doc, getDoc, addDoc } from "firebase/firestore";
const TCref = collection(db, "Teacher - Course Relationship");
const SCref = collection(db, "Student - CourseRelationship");
const Cref = collection(db, "Course");

// turns course list into a readable dictionary
// cannot be unit tested, as it connects to Firebase
async function readable_table(table_query) {
  let snapshot = await getDocs(table_query);
  let snapshot_map = new Map()
  snapshot.forEach((doc) => {
    snapshot_map.set(doc.id, doc.data());
    
  });
  return snapshot_map;
}

// returns list of all the course codes
// used to make sure unique codes are being generated
async function getCourseSessionIDs(code_query) {
  let snapshot = await getDocs(code_query);
  let snapshot_list = [];
  snapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
    snapshot_list.push(doc.Code);
  });
  await wrap();
  return snapshot_list;
}

// because javascript is asynchronus, this function prevents skipping over things that need to happen in order
function wrap() {
  return new Promise((resolve => setTimeout(resolve, 500)));
}

// returns a list of all of the names of the courses a user is in
async function getCourseNames(course_relationship_dict) {
  let course_relation_array = []
  course_relationship_dict.forEach((table_value) => {
    course_relation_array.push(table_value.CourseID);
  });
  let teacher_courses_names = []
  course_relation_array.forEach(async (course_id) => {
    const docRef = doc(db, "Course", course_id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      teacher_courses_names.push(docSnap.data().Name);
    } else {
      // docSnap.data() will be undefined in this case
      //console.log("No such document!");
      //do nothing? I think we want to do nothing
    }
  });
  await wrap();
  return teacher_courses_names;
}


const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  }
});

let signed_in_user_id = null;
let user_classes = null;

// contains all the functionality to communicate with front end
io.on("connection", (socket) => {
  console.log("connected to 80");

  // join class
  socket.on("join", () => {
      console.log("received from front end");
      socket.emit("back_end_join", firebase_data);
  });

  // sign in
  // may not need this later?
  socket.on("user signed in", async (authorized_user) => {
    console.log(authorized_user);
    signed_in_user_id = authorized_user;

  });

  // send user their lists of classes
  socket.on("get_class_list", async (user_id) => {
    const TClist = query(TCref, where("TeacherID", "==", user_id));
    const SClist = query(SCref, where("StudentID", "==", user_id));
    let TCdict = await readable_table(TClist);
    let teacher_courses_names = await getCourseNames(TCdict);
    console.log("printing TC");
    console.log(teacher_courses_names);
    let SCdict = await readable_table(SClist);
    let student_courses_names = await getCourseNames(SCdict);
    console.log("printing SC");
    console.log(student_courses_names);
    socket.emit("all_user_classes", teacher_courses_names, student_courses_names);
  })

  // create a new class
  socket.on("add class", async (class_name) => {
    const class_code = await randomClassCode();
    await wrap();
    let doc_to_view = await addDoc(collection(db, "Course"), {
      Name: class_name, Code: class_code
    });
    doc_to_view = await addDoc(collection(db, "Teacher - Course Relationship"), {
      TeacherID: signed_in_user_id, CourseID: doc_to_view.id
    });
    
  });
});

// generate a new unique class code
async function randomClassCode() {
  const code_query = query(collection(db, "Course"), where("Code", "==", true));
  const all_class_codes = await getCourseSessionIDs(code_query);
  let new_code = generateCode();
  while(all_class_codes.includes(new_code)) {
    new_code = generateCode();
  }
  return new_code;
}

// generate a six-digit code
function generateCode() {
  let num1 = Math.floor(Math.random() * 10);
  let num2 = Math.floor(Math.random() * 10);
  let num3 = Math.floor(Math.random() * 10);
  let num4 = Math.floor(Math.random() * 10);
  let num5 = Math.floor(Math.random() * 10);
  let num6 = Math.floor(Math.random() * 10);
  return String(num1) + String(num2) + String(num3) + String(num4) + String(num5) + String(num6);
}

httpServer.listen(80);



console.log("bottom of file");


