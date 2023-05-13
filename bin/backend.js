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
import { async } from "@firebase/util";
let TCref = collection(db, "Teacher - Course Relationship");
let SCref = collection(db, "Student - CourseRelationship");
let Cref = collection(db, "Course");
let CQSref = collection(db, "QS - Course Relationship");
let QSref = collection(db, "QuestionSet");
let QSQref = collection(db, "Question - QSRelationship");
let Qref = collection(db, "Question");

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

async function getQSNames(QS_relationship_dict) {
  let Qs_relation_array = []
  QS_relationship_dict.forEach((table_value) => {
    Qs_relation_array.push(table_value.QSID);
  });
  let qs_names = []
  Qs_relation_array.forEach(async (qs_id) => {
    const docRef = doc(db, "QuestionSet", qs_id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      qs_names.push(docSnap.data().Name);
    } else {
      // docSnap.data() will be undefined in this case
      //console.log("No such document!");
      //do nothing? I think we want to do nothing
    }
  });
  await wrap();
  return qs_names;
}

async function getQuestionList(question_dict) {
  let QsQ_relation_array = []
  question_dict.forEach((table_value) => {
    QsQ_relation_array.push(table_value.QuestionID);
  });
  let question_list = []
  QsQ_relation_array.forEach(async (question_id) => {
    const docRef = doc(db, "Question", question_id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      question_list.push(docSnap.data());
    } else {
      // docSnap.data() will be undefined in this case
      //console.log("No such document!");
      //do nothing? I think we want to do nothing
    }
  });
  await wrap();
  return question_list;
}



const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  }
});

let user_classes = null;

// contains all the functionality to communicate with front end
io.on("connection", (socket) => {
  console.log("connected to 80");
  let signed_in_user_id = null;
  let teacher_courses_names = null;
  let student_courses_names = null;
  let specific_class = null;
  let specific_QS = null;
  let users_in_room = [];
  let spef_QS_id = null;
  let answer_map = null;

  // join class
  socket.on("join", async (class_code) => {
    Cref = collection(db, "Course");
    let code_query = query(Cref, where("Code", "==", class_code));
    let code_dict = await readable_table(code_query);
    let course_id_list = Array.from(code_dict.keys());
    let course_id = course_id_list[0];
    let new_doc_to_view = await addDoc(collection(db, "Student - CourseRelationship"), {
      StudentID: signed_in_user_id, CourseID: course_id
    });
  });

  // sign in
  // may not need this later?
  socket.on("user signed in", async (authorized_user) => {
    console.log(authorized_user);
    signed_in_user_id = authorized_user;

  });

  // send user their lists of classes
  socket.on("get_class_list", async () => {
    teacher_courses_names = await getTeacherClasses(signed_in_user_id);
    student_courses_names = await getStudentClasses(signed_in_user_id);
    await wrap();
    socket.emit("all_user_classes", teacher_courses_names, student_courses_names);
  });

  // create a new class
  socket.on("add class", async (class_name) => {
    const class_code = await randomClassCode();
    await wrap();
    let doc_to_view = await addDoc(collection(db, "Course"), {
      Name: class_name, Code: class_code
    });
    let new_doc_to_view = await addDoc(collection(db, "Teacher - Course Relationship"), {
      TeacherID: signed_in_user_id, CourseID: doc_to_view.id
    });
  });

  socket.on("clicked on class", async(class_name) => {
    //most likely will rewrite this function? maybe can fix it by just passing code as well
    console.log("clicked on class");
    let all_courses = teacher_courses_names.concat(student_courses_names);
    let role = null;
    Cref = collection(db, "Course");
    const Clist = query(Cref, where("Name", "==", class_name));
    const Cdict = await readable_table(Clist);
    Cdict.forEach((key) => {
      if(all_courses.includes(key.Name)) {
        specific_class = key
        if (teacher_courses_names.includes(class_name)) {
          role = "teacher"
          const class_code = specific_class.Code;
          socket.emit("class and role", role);
        } else if (student_courses_names.includes(class_name)) {
          role = "student"
          const class_code = specific_class.Code;
          socket.emit("class and role", role);
        }
      };
    });
  

  });

  socket.on("need class QS info", async() => {
    Cref = collection(db, "Course");
    const queryClassID = query(Cref, where("Name", "==", specific_class.Name), where("Code", "==", specific_class.Code));
    const spefClassDict = await readable_table(queryClassID);
    const spefClassIDAsSet = spefClassDict.keys();
    const spefClassIdAsList = Array.from(spefClassIDAsSet);
    const spefClassID = spefClassIdAsList[0];
    CQSref = collection(db, "QS - Course Relationship");
    const queryCQSRel = query(CQSref, where("CourseID", "==", spefClassID));
    const CQSReldict = await readable_table(queryCQSRel);
    let qsNames = await getQSNames(CQSReldict);
    qsNames.sort();
    socket.emit("QS info", qsNames, specific_class.Code, specific_class.Name);
  });

  socket.on("need student info", async () => {
    socket.emit("sending for student nav", specific_class.Name, specific_class.Code);
    socket.join("waiting");
    const rooms = io.of("/").adapter.rooms;
    if(rooms.get(specific_class.Code)) {
      socket.leave("waiting");
      socket.join(specific_class.Code);
      socket.emit("student joined room");
      console.log("student joined room emmitted");
      if(!users_in_room.includes(signed_in_user_id)){
        users_in_room.push(signed_in_user_id);
      }
      console.log(users_in_room);
      socket.to(specific_class.Code).emit("students in room list", users_in_room);
    }
  });


  socket.on("add question set", async(qs_name) => {
    Cref = collection(db, "Course");
    const queryClassID = query(Cref, where("Name", "==", specific_class.Name), where("Code", "==", specific_class.Code));
    const spefClassDict = await readable_table(queryClassID);
    const spefClassIDAsSet = spefClassDict.keys();
    const spefClassIdAsList = Array.from(spefClassIDAsSet);
    const spefClassID = spefClassIdAsList[0];
    let doc_to_view = await addDoc(collection(db, "QuestionSet"), {
      Name: qs_name
    });
    let new_doc_to_view = await addDoc(collection(db, "QS - Course Relationship"), {
      CourseID: spefClassID, QSID: doc_to_view.id,
    });
    CQSref = collection(db, "QS - Course Relationship");
    const queryCQSRel = query(CQSref, where("CourseID", "==", spefClassID));
    const CQSReldict = await readable_table(queryCQSRel);
    let qsNames = await getQSNames(CQSReldict);
    console.log(qsNames);
    qsNames.sort();
    socket.emit("QS info", qsNames, specific_class.Code, specific_class.Name);
  });

  socket.on("need all questions in set", async(qs_name) => {
    console.log("pressed view", qs_name);
    QSref = collection(db, "QuestionSet");
    const qs_query = query(QSref, where("Name", "==", qs_name));
    const qs_dict = await readable_table(qs_query);
    const qs_keys = qs_dict.keys();
    const first_key = qs_keys.next().value;
    specific_QS = first_key;
    spef_QS_id = first_key;
    QSQref = collection(db, "Question - QSRelationship");
    const queryQSQrel = query(QSQref, where("QuestionSetID", "==", specific_QS));
    const questions_dict = await readable_table(queryQSQrel);
    Qref = collection(db, "Question");
    let list_of_QIDs = []
    questions_dict.forEach((questionID) => {
      let QID = questionID.QuestionID;
      list_of_QIDs.push(QID);
    });
    await wrap();
    let questions_list = []
    list_of_QIDs.forEach(async (questionID) => {
      const docRef = doc(db, "Question", questionID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        questions_list.push(docSnap.data());
      }
    });
    await wrap();
    specific_QS = questions_list.values();
    await wrap();
    socket.emit("returning question list", Array.from(specific_QS), specific_class.Name);

  });

  socket.on("create question", async (question) => {
    let doc_to_view = null;
    
    if(question.ResponseType === "FR") {
      doc_to_view = await addDoc(collection(db, "Question"), {
        QuestionText: question.QuestionText, CorrectAnswers: question.CorrectAnswers, ResponseType: question.ResponseType,
      });
    } else {
      doc_to_view = await addDoc(collection(db, "Question"), {
        QuestionText: question.QuestionText, CorrectAnswers: question.CorrectAnswers, ResponseType: question.ResponseType, Options: question.Options,
      });
    }
    let new_doc_to_view = await addDoc(collection(db, "Question - QSRelationship"), {
      QuestionID: doc_to_view.id, QuestionSetID: spef_QS_id,
    });
    QSQref = collection(db, "Question - QSRelationship");
    const queryQSQRel = query(QSQref, where("QuestionSetID", "==", spef_QS_id));
    const QSQReldict = await readable_table(queryQSQRel);
    let questionList = await getQuestionList(QSQReldict);
    console.log(questionList);
    socket.emit("returning question list", questionList, specific_class.Name);

  });

  socket.on("starting session", async(qs_name) => {
    console.log("pressed start", qs_name);
    QSref = collection(db, "QuestionSet");
    const qs_query = query(QSref, where("Name", "==", qs_name));
    const qs_dict = await readable_table(qs_query);
    const qs_keys = qs_dict.keys();
    const first_key = qs_keys.next().value;
    specific_QS = first_key
    socket.join(specific_class.Code);
    socket.join("waiting");
    socket.to("waiting").emit("teacher started session", specific_class.Code);
    socket.to(specific_class.Code).emit("teacher started session", specific_class.Code);
    socket.leave("waiting");
    socket.emit("teacher started session");
    console.log("did start session");
    socket.emit("nav to waitroom", specific_class);
    socket.to(specific_class.Code).emit("nav to waitroom", specific_class);
  });



  socket.on("starting questions", async() => {
    socket.to(specific_class.Code).emit("teacher started questions");
    QSQref = collection(db, "Question - QSRelationship");
    const queryQSQrel = query(QSQref, where("QuestionSetID", "==", specific_QS));
    const questions_dict = await readable_table(queryQSQrel);
    Qref = collection(db, "Question");
    let list_of_QIDs = []
    questions_dict.forEach((questionID) => {
      let QID = questionID.QuestionID;
      list_of_QIDs.push(QID);
    });
    await wrap();
    let questions_list = []
    list_of_QIDs.forEach(async (questionID) => {
      const docRef = doc(db, "Question", questionID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        questions_list.push(docSnap.data());
      }
    });
    await wrap();
    specific_QS = questions_list.values();
    await wrap();
    let next_question = specific_QS.next().value;
    console.log(next_question);
    socket.emit("next question", next_question);
    socket.to(specific_class.Code).emit("next question", next_question);
  });

  socket.on("need next question", async() => {
    let next_question = await specific_QS.next();
    await wrap();
    if(next_question.done == false) {
      next_question = next_question.value;
      socket.emit("next question", next_question);
      socket.to(specific_class.Code).emit("next question", next_question);
    } else {
      endSession();
    }

  });

  socket.on("teacher started session", () => {
    socket.join(specific_class.Code);
    if(!users_in_room.includes(signed_in_user_id)){
      users_in_room.push(signed_in_user_id);
    }
    console.log(users_in_room);
    socket.emit("students in room list", users_in_room);
  });

  socket.on("answering question", (answer) => {
    console.log(answer);
    socket.to(specific_class.Code).emit("student answered", signed_in_user_id, answer);
  });

  socket.on("end session", () => {
    endSession();
  })

  socket.on("need to leave room", () => {
    socket.leave(specific_class.Code);
  });

  socket.on("teacher ended session", () => {
    socket.leave(specific_class.Code);
  });

  socket.on("sending question results", (answerMapObj) => {
    answer_map = JSON.parse(JSON.stringify(answerMapObj));
    console.log(answer_map);
  })

  function endSession() {
    console.log("endSession running");
    socket.emit("teacher ended session");
    socket.emit("full answer map", answer_map);
    socket.to(specific_class.Code).emit("teacher ended session");
    socket.leave(specific_class.Code);
  };



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

async function getTeacherClasses(user_id) {
  TCref = collection(db, "Teacher - Course Relationship");
  const TClist = query(TCref, where("TeacherID", "==", user_id),);
  let TCdict = await readable_table(TClist);
  let teacher_courses_names = await getCourseNames(TCdict);
  return teacher_courses_names;
}

async function getStudentClasses(user_id) {
  SCref = collection(db, "Student - CourseRelationship");
  const SClist = query(SCref, where("StudentID", "==", user_id));
  let SCdict = await readable_table(SClist);
  let student_courses_names = await getCourseNames(SCdict);
  return student_courses_names;
}

// generate a six-digit code
// Test this
export function generateCode() {
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


