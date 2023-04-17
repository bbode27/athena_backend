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

const querySnapshot = await getDocs(collection(db, "Teacher - Course Relationship"));
console.log("Got snapshot")
querySnapshot.forEach((doc) => {
  console.log(`${doc.id} => ${doc.data().TeacherID}`);
  firebase_data = doc.id;
});

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
import { doc, getDoc } from "firebase/firestore";
const TCref = collection(db, "Teacher - Course Relationship");
const SCref = collection(db, "Student - CourseRelationship");
const Cref = collection(db, "Course");


async function readable_table(table_query) {
  let snapshot = await getDocs(table_query);
  let snapshot_map = new Map()
  snapshot.forEach((doc) => {
    snapshot_map.set(doc.id, doc.data());
    
  });
  return snapshot_map;
}

function wrap() {
  return new Promise((resolve => setTimeout(resolve, 500)));
}


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
      console.log("No such document!");
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

io.on("connection", (socket) => {
  console.log("connected to 80");
  socket.on("join", () => {
      console.log("received from front end");
      socket.emit("back_end_join", firebase_data);
  });

  socket.on("user signed in", async (authorized_user) => {
    console.log(authorized_user);
    signed_in_user_id = authorized_user;
    const TClist = query(TCref, where("TeacherID", "==", signed_in_user_id));
    const SClist = query(SCref, where("StudentID", "==", signed_in_user_id));
    let TCdict = await readable_table(TClist);
    let teacher_courses_names = await getCourseNames(TCdict);
    console.log("printing TC");
    console.log(teacher_courses_names);
    let SCdict = await readable_table(SClist);
    let student_courses_names = await getCourseNames(SCdict);
    console.log("printing SC");
    console.log(student_courses_names);

    socket.emit("all_user_classes", teacher_courses_names, student_courses_names);
  });
});

httpServer.listen(80);



console.log("bottom of file");


