import firebase from "firebase/compat/app";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
const auth = getAuth(app)
//console.log(auth)

const db = getFirestore(app);


import { collection , getDocs } from "firebase/firestore";

let firebase_data = null;

const querySnapshot = await getDocs(collection(db, "Question"));
console.log("Got snapshot")
querySnapshot.forEach((doc) => {
  console.log(`${doc.id} => ${doc.data().QuestionText}`);
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

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  }
});

io.on("connection", (socket) => {
  console.log("connected to 80");
  socket.on("join", () => {
      console.log("received from front end");
      socket.emit("back_end_join", firebase_data);
  });
});

httpServer.listen(80);



console.log("bottom of file");


